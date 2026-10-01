import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {cents,parsePack,parseProduct,robotPolicy} from '../server/catalog/extract.mjs';
import {refreshCatalog} from '../server/catalog/refresh.mjs';
import {stores,products as manifest} from '../server/catalog/manifest.mjs';
import {validateCatalog,quoteStore,commonComparison,purchaseDemand,isCurrent,quoteText} from '../dist/prices.js';
import {createGymPlan,shoppingList,countries} from '../dist/gym.js';
import {createServer} from '../scripts/serve.mjs';

const now=Date.parse('2026-10-01T09:00:00Z'),at=new Date(now).toISOString();
const entry=manifest.find(p=>p.id==='21415');
function diaHtml(price=1.88,url=entry.url,name='Arroz redondo SOS 1 Kg'){
  return '<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name,offers:{url,price,priceCurrency:'EUR',availability:'https://schema.org/InStock'}})+'</script>';
}
const chicken=manifest.find(p=>p.id==='19230572');
function capHtml(price='5.89',shown='5,89'){
  const object={'@type':'Product',identifier:chicken.id,name:'Pechuga pollo',description:'Pechugas enteras pollo EROSKI, bandeja aprox. 950 g',offers:{url:chicken.url,price,priceCurrency:'EUR',availability:'http://schema.org/InStock'}};
  return '["common/structured_data:init",'+JSON.stringify(JSON.stringify(object))+']<span itemprop="price" class="offer-now"> '+shown+'</span><p class="quantity-text">1 KILO A 6,20 €</p> "shopRef\\":\\"8284\\"';
}
const ingredient=(name,grams,state,key=name)=>({name,grams,state,key});
function product(storeId,id,key,quantity,priceCents,unit='g'){
  return {storeId,id,key,name:key+' '+quantity+unit,url:storeId==='dia'?'https://www.dia.es/a/b/p/'+id:'https://www.capraboacasa.com/es/productdetail/'+id+'-example/',priceCents,currency:'EUR',pack:{quantity,unit,kind:'fixed'},unitPriceCents:Math.round(priceCents*1000/quantity),observedAt:at,availability:'in_stock'};
}
const catalog=(ps)=>({schemaVersion:1,generatedAt:at,stores:stores.map(s=>({...s,status:s.mode==='html'?'ok':'disabled'})),products:ps});

test('Fichas reales: datos estructurados de DIA y precio visible contrastado de Caprabo',()=>{
  const rice=parseProduct(diaHtml(),entry,{observedAt:at});
  assert.equal(rice.priceCents,188);assert.equal(rice.pack.quantity,1000);assert.equal(rice.observedAt,at);assert.equal(rice.context.postalCode,null);
  const c=parseProduct(capHtml(),chicken,{observedAt:at});
  assert.equal(c.priceCents,589);assert.equal(c.pack.quantity,950);assert.equal(c.pack.kind,'approximate');assert.equal(c.context.storeId,'8284');
  assert.throws(()=>parseProduct(capHtml('5.89','6,50'),chicken),/visible/);
  assert.throws(()=>parseProduct(capHtml('1.00','1,00'),chicken),/no coinciden/);
  assert.throws(()=>parseProduct(diaHtml(1.88,'https://evil.example/p/21415'),entry),/inequívoca/);
  assert.throws(()=>parseProduct(diaHtml(1.88,entry.url,'Aceite 1 kg'),entry),/identidad/);
  assert.throws(()=>parseProduct(diaHtml()+diaHtml(),entry),/inequívoca/);
  const chickpea=manifest.find(p=>p.id==='77561');
  assert.throws(()=>parseProduct(diaHtml(1,chickpea.url,'Garbanzos cocidos 400 g'),chickpea),/forma alimentaria/);
});

test('Envases: multipack, litro, docena, compra mínima y cantidades ambiguas',()=>{
  assert.deepEqual(parsePack('Yogur natural, pack 4x125 g'),{unit:'g',quantity:500,kind:'fixed'});
  assert.equal(parsePack('Huevos M, cartón 1 docena').quantity,12);
  assert.equal(parsePack('Aceite de oliva 75 cl').quantity,750);
  assert.equal(parsePack('Aguacate, compra mínima 500 g').kind,'minimum');
  assert.throws(()=>parsePack('Producto 1 kg + regalo 200 g'));
  assert.throws(()=>parsePack('Huevos 0 unidades'));
  assert.throws(()=>parsePack('Huevos 1,5 docenas'));
  assert.throws(()=>cents('1.234,56'));
  assert.throws(()=>cents(-1));
  assert.equal(cents('0,82'),82);
});

test('robots: grupo específico, comodines, regla más larga y allow en empate',()=>{
  const policy=robotPolicy('User-agent: *\nDisallow: /api\nDisallow: /*?x=\nDisallow: /private/\nAllow: /private/public$\nCrawl-delay: 2');
  assert.equal(policy.allowed('https://a.test/api/product'),false);
  assert.equal(policy.allowed('https://a.test/private/public'),true);
  assert.equal(policy.allowed('https://a.test/private/public/other'),false);
  assert.equal(policy.allowed('https://a.test/p/3?x=1'),false);
  assert.equal(policy.delay,2000);
  assert.equal(robotPolicy('User-agent: *\nDisallow: /\nUser-agent: QuiskettPrices\nAllow: /product').allowed('https://a.test/product'),true);
  assert.equal(robotPolicy('User-agent: *\nDisallow: /same\nAllow: /same').allowed('https://a.test/same'),true);
});

test('Colector: 403 detiene la cadena, conserva observación original y no llama a fuentes desactivadas',async()=>{
  const old=product('dia','21415','rice',1000,188),calls=[];
  const next=await refreshCatalog(catalog([old]),{now:()=>at,wait:async()=>{},fetcher:async url=>{
    calls.push(url);
    if(new URL(url).pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /',{headers:{'Content-Type':'text/plain'}});
    return new Response('blocked',{status:403,headers:{'Content-Type':'text/html'}});
  }});
  assert.deepEqual(next.products,[old]);
  assert.equal(next.products[0].observedAt,at);
  assert.equal(next.stores.find(s=>s.id==='dia').status,'blocked');
  assert.equal(calls.filter(u=>u.includes('dia.es')&&!u.endsWith('robots.txt')).length,1);
  assert.ok(calls.every(u=>u.includes('www.dia.es')||u.includes('www.capraboacasa.com')));
});

test('Colector: robots se revisa antes de cada salto; no se sigue hacia APIs, sesiones u otro host',async()=>{
  for(const target of ['https://www.dia.es/private/section/p/999','https://evil.example/a/b/p/999','https://www.dia.es/api/product','https://www.dia.es/login']){
    const calls=[];
    await refreshCatalog(catalog([]),{now:()=>at,wait:async()=>{},fetcher:async url=>{
      calls.push(url);
      if(url.endsWith('robots.txt'))return new Response('User-agent: *\nDisallow: /private/\nAllow: /',{headers:{'Content-Type':'text/plain'}});
      if(url===entry.url)return new Response('',{status:302,headers:{Location:target}});
      return new Response('blocked',{status:403,headers:{'Content-Type':'text/html'}});
    }});
    assert.ok(!calls.includes(target),target);
  }
});

test('Caducidad y stock: no hay coste cero para un precio ausente ni ranking de cestas incompletas',()=>{
  const fresh=product('dia','10','rice',1000,188),items=[ingredient('Arroz',300,'cocido'),ingredient('Guandules',110,'cocidas; equivalencia de frijol')];
  for(const changed of [{availability:'unavailable'},{observedAt:new Date(now-49*3600000).toISOString()},{observedAt:new Date(now+3600000).toISOString()}]){
    const p={...fresh,...changed};assert.equal(isCurrent(p,now),false);
    const q=quoteStore(items,catalog([p]),'dia',{now});assert.equal(q.subtotalCents,null);assert.equal(q.missing.length,2);
  }
  const q=quoteStore(items,catalog([fresh]),'dia',{now});
  assert.equal(q.subtotalCents,188);assert.equal(q.complete,false);assert.equal(q.missing.length,1);
  assert.match(quoteText(q,'DIA'),/PRESUPUESTO PARCIAL/);
  assert.equal(commonComparison(items,catalog([fresh]),['dia','caprabo'],{now}).quotes.length,0);
});

test('Cantidades: seco/crudo, litros, unidades enteras y productos culturales sin sustituciones silenciosas',()=>{
  assert.equal(purchaseDemand(ingredient('Arroz',600,'cocido')).quantity,200);
  assert.equal(purchaseDemand(ingredient('Pollo',300,'cocido, sin piel')).quantity,400);
  assert.equal(purchaseDemand(ingredient('Aceite de oliva',91,'para cocinar')).quantity,100);
  for(const name of ['Guandules','Papa criolla','Cebolla larga','Repollo','Plátano verde','Yogur griego natural','Leche'])assert.equal(purchaseDemand(ingredient(name,100,'parte comestible')),null,name);
  const q=quoteStore([ingredient('Huevo',80,'sin cáscara, antes de cocinar')],catalog([product('caprabo','11','eggs',12,285,'unit')]),'caprabo',{now});
  assert.equal(q.lines[0].required,2);assert.equal(q.lines[0].purchased-q.lines[0].required,10);
  assert.throws(()=>purchaseDemand(ingredient('Arroz',300,'cocido'),{riceYield:0}));
});

test('Envases completos agregados: dos ingredientes equivalentes comparten botella y se elige el menor desembolso',()=>{
  const ps=[product('caprabo','11','chicken',950,589),product('caprabo','12','chicken',450,324),product('caprabo','13','oliveOil',1000,445,'ml')];
  const items=[ingredient('Pollo',300,'cocido, sin piel'),ingredient('Aceite de oliva',7,'para cocinar','oil-a'),ingredient('Aceite de oliva (en lugar de mantequilla)',7,'para cocinar','oil-b')];
  const q=quoteStore(items,catalog(ps),'caprabo',{now});
  const meat=q.lines.find(l=>l.product.key==='chicken'),oil=q.lines.find(l=>l.product.key==='oliveOil');
  assert.equal(meat.product.id,'12');assert.equal(meat.packs,1);assert.equal(oil.packs,1);assert.equal(oil.items.length,2);assert.equal(q.subtotalCents,769);
  assert.equal(q.covered,3);assert.equal(q.complete,true);
  const owned=quoteStore(items,catalog(ps),'caprabo',{now,excluded:new Set(['oil-a','oil-b'])});
  assert.equal(owned.subtotalCents,324);assert.equal(owned.totalItems,1);
});

test('Comparación sobre los mismos ingredientes: una cesta con menor cobertura no se presenta como la más barata',()=>{
  const ps=[product('dia','11','rice',1000,188),product('caprabo','12','rice',1000,210),product('caprabo','13','oats',500,300)];
  const items=[ingredient('Arroz',600,'cocido'),ingredient('Avena',40,'en seco')];
  const result=commonComparison(items,catalog(ps),['dia','caprabo'],{now});
  assert.deepEqual(result.keys,['Arroz']);assert.equal(result.winner,'dia');
  assert.deepEqual(result.quotes.map(q=>q.subtotalCents),[188,210]);
});

test('Mezclar formatos de pollo reduce el desembolso y una alternativa de lácteo requiere selección explícita',()=>{
  const ps=[product('caprabo','11','chicken',950,589),product('caprabo','12','chicken',450,324)];
  const q=quoteStore([ingredient('Pollo',1050,'cocido, sin piel')],catalog(ps),'caprabo',{now});
  assert.equal(q.subtotalCents,913);assert.equal(q.lines[0].purchased,1400);assert.equal(q.lines[0].parts.length,2);
  const yogurt=ingredient('Yogur griego natural',200,'natural, sin grasa');
  assert.equal(purchaseDemand(yogurt),null);
  const choice=purchaseDemand(yogurt,{allowProteinAlternative:true});assert.equal(choice.key,'proteinDairy');assert.match(choice.note,/Alternativa elegida/);
  const minimum=product('caprabo','13','banana',1000,155);minimum.pack.kind='minimum';
  const banana=quoteStore([ingredient('Banana',792,'sin piel')],catalog([minimum]),'caprabo',{now});
  assert.equal(banana.lines[0].purchased,2000);assert.ok(banana.lines[0].notes.some(n=>n.includes('conservadora')));
});

test('Catálogo inicial validado: precios, enlaces y todas las dietas mantienen importes parciales coherentes',async()=>{
  const c=validateCatalog(JSON.parse(await readFile(new URL('../dist/catalog/prices.json',import.meta.url),'utf8')));
  assert.equal(c.stores.length,5);assert.ok(c.products.length>=21);
  const snapshotTime=Math.max(...c.products.map(p=>Date.parse(p.observedAt)));
  for(const country of Object.keys(countries))for(const style of ['all','vegetarian']){
    const items=shoppingList(createGymPlan({country,style,days:7,goal:'gain',training:3,portion:'auto',adult:true},0));
    for(const store of c.stores){
      const q=quoteStore(items,c,store.id,{now:snapshotTime});
      assert.equal(q.covered+q.missing.length,q.totalItems);
      assert.equal(q.subtotalCents,q.lines.length?q.lines.reduce((total,l)=>total+l.subtotalCents,0):null);
      for(const l of q.lines)assert.ok(l.purchased+1e-8>=l.required);
      if(store.mode==='disabled')assert.equal(q.subtotalCents,null);
    }
  }
  const bad=structuredClone(c);bad.products[0].url='javascript:alert(1)';assert.throws(()=>validateCatalog(bad));
  const badUnit=structuredClone(c);badUnit.products[0].pack.quantity=0;assert.throws(()=>validateCatalog(badUnit));
  const noDate=structuredClone(c);delete noDate.generatedAt;assert.throws(()=>validateCatalog(noDate));
  const wrongKey=structuredClone(c);wrongKey.products[0].key=wrongKey.products[0].key==='rice'?'chicken':'rice';assert.throws(()=>validateCatalog(wrongKey));
  const subpath=structuredClone(c);subpath.products[0].url+='login';assert.throws(()=>validateCatalog(subpath));
});

test('Servidor estático: catálogo JSON accesible con tipo correcto y fuente pública sin datos de pago',async()=>{
  const server=createServer({PAYMENT_MODE:'demo'});server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/catalog/prices.json');
    assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);
    const c=validateCatalog(await response.json());assert.ok(c.products.length);
    assert.doesNotMatch(JSON.stringify(c),/stripe_secret|checkout_session|client_secret|email|address/i);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
