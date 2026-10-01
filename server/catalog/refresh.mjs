import { stores,products } from './manifest.mjs';
import { CatalogError,parseProduct,robotPolicy } from './extract.mjs';

const AGENT='QuiskettPrices/1.0 (public product price pilot)';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function permitted(url,store){
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!==store.host||u.port&&u.port!=='443'||u.username||u.password||u.search||u.hash)throw new CatalogError('URL fuera del catálogo permitido.','url');
  const product=store.id==='caprabo'?/^\/es\/productdetail\/\d+-[a-z0-9-]+\/$/.test(u.pathname):store.id==='dia'?/^\/(?:[a-z0-9-]+\/){2,3}p\/\d+$/.test(u.pathname):false;
  if(u.pathname!=='/robots.txt'&&!product)throw new CatalogError('Ruta fuera de una ficha pública.','url');
  return u;
}
async function document(url,store,fetcher,{policy=null,wait=sleep}={}){
  permitted(url,store);
  let next=url;
  for(let redirects=0;redirects<=3;redirects++){
    if(policy){if(!policy.allowed(next))throw new CatalogError('robots.txt no permite esta ficha.','robots');await wait(Math.max(850,policy.delay));}
    const response=await fetcher(next,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'User-Agent':AGENT,'Accept':'text/html,text/plain;q=0.9'}});
    if([301,302,303,307,308].includes(response.status)){
      const target=new URL(response.headers.get('location'),next);
      permitted(target.href,store);
      // Nunca seguimos una redirección hacia una API, buscador, sesión o login.
      if(target.pathname!=='/robots.txt'&&!(/^\/es\/productdetail\/\d+-[^/]+\/?$/.test(target.pathname)&&store.id==='caprabo'||/^\/[^?#]+\/p\/\d+$/.test(target.pathname)&&store.id==='dia'))throw new CatalogError('Redirección fuera de una ficha pública.','redirect');
      next=target.href;continue;
    }
    if(!response.ok){await response.body?.cancel();throw new CatalogError('HTTP '+response.status,[403,429].includes(response.status)?'blocked':'http');}
    const type=response.headers.get('content-type')||'';
    if(!/text\/(?:html|plain)/.test(type)){await response.body?.cancel();throw new CatalogError('Tipo de documento inesperado.','content');}
    const reader=response.body.getReader(),chunks=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_500_000)throw new CatalogError('Documento demasiado grande.','size');chunks.push(Buffer.from(value));}}
    catch(error){await reader.cancel();throw error;}
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new CatalogError('Demasiadas redirecciones.','redirect');
}
export async function refreshCatalog(previous={products:[]},{fetcher=fetch,now=()=>new Date().toISOString(),wait=sleep,onProgress=()=>{},storeIds=stores.map(s=>s.id)}={}){
  if(!Array.isArray(storeIds)||storeIds.some(id=>!stores.some(s=>s.id===id)))throw new CatalogError('Proveedor no válido.','provider');
  const catalog={schemaVersion:1,generatedAt:now(),referenceArea:{city:'Barcelona',postalCode:'08001',confirmed:false},maxAgeHours:48,stores:[],products:[]};
  for(const store of stores){
    if(!storeIds.includes(store.id)){
      const saved=previous.stores?.find(s=>s.id===store.id);
      catalog.stores.push(saved||{id:store.id,name:store.name,url:store.url,mode:store.mode,status:'pending',detail:store.detail,lastAttemptAt:null,lastSuccessfulAt:null,successful:0,attempted:0,errors:[]});
      catalog.products.push(...(previous.products||[]).filter(p=>p.storeId===store.id));continue;
    }
    const status={id:store.id,name:store.name,url:store.url,mode:store.mode,status:store.mode==='disabled'?'disabled':'ok',detail:store.detail,lastAttemptAt:null,lastSuccessfulAt:null,successful:0,attempted:0,errors:[]};
    if(store.mode==='disabled'){catalog.stores.push(status);continue;}
    status.lastAttemptAt=now();
    const targets=products.filter(p=>p.storeId===store.id);
    const old=new Map((previous.products||[]).filter(p=>p.storeId===store.id).map(p=>[p.id,p]));
    status.lastSuccessfulAt=[...old.values()].map(p=>p.observedAt).sort().at(-1)||null;
    let policy=null,stop=null;
    try{
      const robots=await document('https://'+store.host+'/robots.txt',store,fetcher);
      if(!/user-agent\s*:/i.test(robots))throw new CatalogError('robots.txt no contiene una política reconocible.','robots');
      policy=robotPolicy(robots);
      if(policy.delay>30000)throw new CatalogError('Crawl-delay requiere un conector de ejecución larga.','robots');
    }catch(error){stop=error instanceof CatalogError?error.message:'No se pudo consultar robots.txt.';}
    for(const entry of targets){
      const retained=old.get(entry.id);
      if(stop){if(retained)catalog.products.push(retained);continue;}
      try{
        permitted(entry.url,store);
        if(!policy.allowed(entry.url))throw new CatalogError('robots.txt no permite esta ficha.','robots');
        status.attempted++;
        const html=await document(entry.url,store,fetcher,{policy,wait});
        const product=parseProduct(html,entry,{observedAt:now()});
        catalog.products.push(product);status.successful++;status.lastSuccessfulAt=product.observedAt;
        onProgress({store:store.id,id:entry.id,status:'ok',priceCents:product.priceCents,name:product.name});
      }catch(error){
        const message=error instanceof CatalogError?error.message:'Error de conexión o tiempo de espera.';
        status.errors.push({id:entry.id,message});if(retained)catalog.products.push(retained);
        onProgress({store:store.id,id:entry.id,status:'failed',message});
        if(error.code==='blocked'||error.code==='robots'){stop=message;}
      }
    }
    if(stop){status.status='blocked';status.detail=stop+' Se conserva la fecha original de los datos previos.';}
    else if(status.errors.length)status.status=status.successful?'partial':'failed';
    catalog.stores.push(status);
  }
  catalog.generatedAt=now();return catalog;
}
