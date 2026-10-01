import { createHash } from 'node:crypto';
import {expectedProduct} from './manifest.mjs';

export class CatalogError extends Error {
  constructor(message,code='parse'){super(message);this.code=code;}
}
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim();
export function cents(value){
  const text=String(value).trim();
  if(!/^\d{1,5}(?:[.,]\d{1,2})?$/.test(text))throw new CatalogError('Precio ambiguo.');
  const amount=Math.round(Number(text.replace(',','.'))*100);
  if(!Number.isSafeInteger(amount)||amount<=0||amount>100000)throw new CatalogError('Precio fuera de rango.');
  return amount;
}
export function parsePack(name){
  const n=norm(name),count=n.match(/(?<![\d.,])(?:pack\s*)?(\d{1,3})\s*(?:uds?\.?|unidades)\b/)||n.match(/(?<![\d.,])(\d{1,2})\s*docenas?\b/);
  if(count){const quantity=Number(count[1])*(n.includes('docena')?12:1);if(quantity<1||quantity>120)throw new CatalogError('Número de unidades fuera de rango.');return {unit:'unit',quantity,kind:'fixed'};}
  const matches=[...n.matchAll(/(?<![\d.,])(?:(\d{1,2})\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|cl|litros?|l)\b/g)];
  if(matches.length!==1)throw new CatalogError('Formato no único o no declarado.');
  const [,multipack,amount,unit]=matches[0];
  let quantity=Number(amount.replace(',','.'))*(multipack?Number(multipack):1);
  const isVolume=['ml','cl','litro','litros','l'].includes(unit);
  quantity*=unit==='kg'?1000:unit==='cl'?10:['litro','litros','l'].includes(unit)?1000:1;
  if(!Number.isInteger(quantity)||quantity<=0||quantity>10000)throw new CatalogError('Tamaño fuera de rango.');
  return {unit:isVolume?'ml':'g',quantity,kind:/compra minima/.test(n)?'minimum':/aprox/.test(n)?'approximate':'fixed'};
}
function flatten(value){
  if(Array.isArray(value))return value.flatMap(flatten);
  if(!value||typeof value!=='object')return [];
  return [value,...(Array.isArray(value['@graph'])?value['@graph'].flatMap(flatten):[])];
}
function primaryProduct(html,entry){
  const values=[];
  if(entry.storeId==='dia'){
    for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
      try{values.push(...flatten(JSON.parse(m[1])));}catch{}
    }
  }else if(entry.storeId==='caprabo'){
    for(const m of html.matchAll(/"common\/structured_data:init"\s*,\s*("(?:\\.|[^"\\])*")/g)){
      try{values.push(...flatten(JSON.parse(JSON.parse(m[1]))));}catch{}
    }
  }else throw new CatalogError('Proveedor sin extractor autorizado.','disabled');
  const expected=new URL(entry.url);
  const candidates=values.filter(value=>{
    if(![value['@type']].flat().includes('Product'))return false;
    const offers=[value.offers].flat().filter(Boolean);
    if(offers.length!==1)return false;
    try{const url=new URL(offers[0].url||value.url,entry.url);return url.host===expected.host&&url.pathname.replace(/\/$/,'')===expected.pathname.replace(/\/$/,'');}catch{return false;}
  });
  if(candidates.length!==1)throw new CatalogError('Falta una ficha de producto inequívoca.');
  return candidates[0];
}
export function parseProduct(html,entry,{observedAt=new Date().toISOString()}={}){
  const product=primaryProduct(html,entry),offer=[product.offers].flat()[0];
  const name=String(product.description||product.name||'').trim();
  if(!name||name.length>400||!norm(name).includes(norm(entry.title)))throw new CatalogError('El producto ha cambiado de identidad.');
  if(product.identifier&&String(product.identifier)!==entry.id)throw new CatalogError('El identificador no coincide.');
  if(offer.priceCurrency!=='EUR')throw new CatalogError('Moneda distinta de EUR.');
  const priceCents=cents(offer.price),pack=parsePack(name);
  if(!expectedProduct(entry,name,pack))throw new CatalogError('La forma alimentaria no coincide con el catálogo.');
  const availability=String(offer.availability||'');
  if(!/^https?:\/\/schema\.org\/(?:InStock|OutOfStock|Discontinued|PreOrder|LimitedAvailability)$/.test(availability))throw new CatalogError('Disponibilidad sin declarar.');
  // En productos al peso contrastamos el importe mínimo con la referencia €/kg.
  let unitPriceCents=null;
  if(entry.storeId==='caprabo'){
    const match=html.match(/class="quantity-text"[^>]*>\s*1 KILO A\s*([\d.,]+)[\s\u00a0]*€/i);
    if(match){
      unitPriceCents=cents(match[1]);
      if(pack.unit!=='g'||Math.abs(Math.round(unitPriceCents*pack.quantity/1000)-priceCents)>2)throw new CatalogError('Importe y peso no coinciden con €/kg.');
    }
    const shown=[...html.matchAll(/itemprop="price"\s+class="offer-now">\s*([\d.,]+)/g)].map(m=>cents(m[1]));
    if(!shown.length||shown.some(p=>p!==priceCents))throw new CatalogError('El precio visible no coincide con el precio estructurado.');
  }
  if(pack.unit==='g'&&unitPriceCents===null)unitPriceCents=Math.round(priceCents*1000/pack.quantity);
  if(pack.unit==='ml')unitPriceCents=Math.round(priceCents*1000/pack.quantity);
  return {
    storeId:entry.storeId,id:entry.id,key:entry.key,name,url:entry.url,
    priceCents,currency:'EUR',pack,unitPriceCents,
    availability:availability.endsWith('/InStock')?'in_stock':'unavailable',observedAt,
    context:{postalCode:null,storeId:entry.storeId==='caprabo'?html.match(/shopRef\\?"\s*:\s*\\?"(\d+)\\?"/)?.[1]||null:null,scope:'public_unlocalized'},
    source:{method:entry.storeId==='dia'?'html_jsonld':'html_structured_data',sha256:createHash('sha256').update(html).digest('hex')}
  };
}

// robots.txt: grupo más específico, comodines y prioridad de la regla más larga.
export function robotPolicy(text,agent='QuiskettPrices'){
  const groups=[];let group=null,hasRules=false;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.replace(/#.*$/,'').trim(),colon=line.indexOf(':');if(colon<0)continue;
    const key=line.slice(0,colon).toLowerCase().trim(),value=line.slice(colon+1).trim();
    if(key==='user-agent'){
      if(!group||hasRules){group={agents:[],rules:[],delay:0};groups.push(group);hasRules=false;}
      group.agents.push(value.toLowerCase());
    }else if(group&&['allow','disallow','crawl-delay'].includes(key)){
      hasRules=true;
      if(key==='crawl-delay'){if(Number.isFinite(Number(value)))group.delay=Math.max(0,Number(value)*1000);}
      else if(value)group.rules.push({allow:key==='allow',pattern:value});
    }
  }
  const token=agent.toLowerCase(),scores=groups.map(g=>Math.max(-1,...g.agents.map(a=>a==='*'?0:token.includes(a)?a.length:-1))),best=Math.max(-1,...scores);
  const chosen=groups.filter((_,i)=>scores[i]===best&&best>=0),rules=chosen.flatMap(g=>g.rules);
  return {delay:Math.max(0,...chosen.map(g=>g.delay)),allowed(url){
    const u=new URL(url),target=u.pathname+u.search;let winner=null;
    for(const rule of rules){
      const pattern=rule.pattern.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
      if(new RegExp('^'+pattern).test(target)){
        const specificity=rule.pattern.replace(/[*$]/g,'').length;
        if(!winner||specificity>winner.specificity||specificity===winner.specificity&&rule.allow)winner={...rule,specificity};
      }
    }
    return winner?.allow!==false;
  }};
}
