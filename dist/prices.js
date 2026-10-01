// Presupuestos de compra, separados de los nutrientes y del pago del plan.
import {products as editorial,expectedProduct} from './catalog/products.js';
export const purchaseDefaults={riceYield:3,chickenYield:.75,chickpeaYield:2.4,allowProteinAlternative:false};
export const retailerHosts={dia:'www.dia.es',caprabo:'www.capraboacasa.com',mercadona:'tienda.mercadona.es',consum:'tienda.consum.es',carrefour:'www.carrefour.es'};
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').trim();
export const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
export function validateCatalog(catalog){
  if(catalog?.schemaVersion!==1||typeof catalog.generatedAt!=='string'||!Number.isFinite(Date.parse(catalog.generatedAt))||!Array.isArray(catalog.stores)||!Array.isArray(catalog.products)||catalog.products.length>200)throw new Error('El catálogo de precios no es válido.');
  const storeIds=new Set();
  for(const s of catalog.stores){
    if(!retailerHosts[s.id]||storeIds.has(s.id)||typeof s.name!=='string'||typeof s.detail!=='string')throw new Error('Proveedor no válido.');
    const u=new URL(s.url);if(u.protocol!=='https:'||u.hostname!==retailerHosts[s.id]||u.username||u.password||u.port&&u.port!=='443')throw new Error('Enlace no válido.');
    storeIds.add(s.id);
  }
  const ids=new Set();
  for(const p of catalog.products){
    const id=p.storeId+':'+p.id;
    if(!storeIds.has(p.storeId)||!/^\d+$/.test(p.id)||ids.has(id)||typeof p.name!=='string'||p.name.length>400||typeof p.key!=='string'||p.currency!=='EUR'||!Number.isSafeInteger(p.priceCents)||p.priceCents<=0||p.priceCents>100000)throw new Error('Producto no válido.');
    const entry=editorial.find(e=>e.storeId===p.storeId&&e.id===p.id),u=new URL(p.url),rightPath=entry&&u.pathname===new URL(entry.url).pathname&&p.key===entry.key;
    if(u.protocol!=='https:'||u.hostname!==retailerHosts[p.storeId]||u.username||u.password||u.search||u.hash||u.port&&u.port!=='443'||!rightPath)throw new Error('Ficha no válida.');
    if(!p.pack||!['g','ml','unit'].includes(p.pack.unit)||!['fixed','minimum','approximate'].includes(p.pack.kind)||!Number.isInteger(p.pack.quantity)||p.pack.quantity<=0||p.pack.quantity>10000||p.pack.unit!=='unit'&&(!Number.isSafeInteger(p.unitPriceCents)||p.unitPriceCents<=0)||!['in_stock','unavailable'].includes(p.availability)||typeof p.observedAt!=='string'||!Number.isFinite(Date.parse(p.observedAt))||!expectedProduct(entry,p.name,p.pack))throw new Error('Formato no válido.');
    ids.add(id);
  }
  return catalog;
}
export function isCurrent(p,now=Date.now()){
  const age=now-Date.parse(p.observedAt);
  return p.availability==='in_stock'&&Number.isFinite(age)&&age>=-5*60*1000&&age<=48*60*60*1000;
}
function checkedOptions(options){
  const o={...purchaseDefaults,...options};
  if(typeof o.allowProteinAlternative!=='boolean')throw new Error('Alternativa de lácteo no válida.');
  if(!Number.isFinite(o.riceYield)||o.riceYield<2||o.riceYield>4||!Number.isFinite(o.chickenYield)||o.chickenYield<.5||o.chickenYield>1||!Number.isFinite(o.chickpeaYield)||o.chickpeaYield<1.5||o.chickpeaYield>3.5)throw new Error('Rendimiento de cocción no válido.');
  return o;
}
export function purchaseDemand(item,options={}){
  const o=checkedOptions(options),name=norm(item.name),state=norm(item.state),grams=item.grams;
  if(!Number.isFinite(grams)||grams<=0)throw new Error('Cantidad de receta no válida.');
  let key,quantity=grams,unit='g',note='Peso de compra orientativo.';
  if(name==='pollo'&&state.includes('cocid')){key='chicken';quantity=grams/o.chickenYield;note=Math.round(o.chickenYield*100)+' % de rendimiento: '+grams+' g cocinados ≈ '+Math.ceil(quantity)+' g crudos.';}
  else if(name==='arroz'&&state.includes('cocid')){key='rice';quantity=grams/o.riceYield;note=grams+' g cocidos ÷ '+o.riceYield+' ≈ '+Math.ceil(quantity)+' g en seco.';}
  else if(name==='avena'&&state.includes('seco')){key='oats';note='Peso en seco.';}
  else if(name==='huevo'&&state.includes('sin cascara')){key='eggs';quantity=grams/50;unit='unit';note='Aproximación: 50 g comestibles por huevo M. Se redondea a unidades completas.';}
  else if(/^aceite de oliva\b/.test(name)){key='oliveOil';quantity=grams/.91;unit='ml';note='Densidad orientativa: 0,91 g/ml.';}
  else if(name==='garbanzos'&&state.includes('cocid')){key='chickpeaDry';quantity=grams/o.chickpeaYield;note=grams+' g cocidos ÷ '+o.chickpeaYield+' ≈ '+Math.ceil(quantity)+' g secos. Necesitan remojo y cocción.';}
  else if(name==='lentejas'&&state.includes('cocid')){key='lentilDry';quantity=grams/2.5;note=grams+' g cocidas ÷ 2,5 ≈ '+Math.ceil(quantity)+' g en seco. Rendimiento de cocción orientativo.';}
  else if(name==='alubias blancas'&&state.includes('cocid')){key='whiteBeanDry';quantity=grams/2.4;note=grams+' g cocidas ÷ 2,4 ≈ '+Math.ceil(quantity)+' g en seco. Necesitan remojo y cocción.';}
  else if(o.allowProteinAlternative&&/^yogur (?:griego )?natural\b/.test(name)){key='proteinDairy';note='Alternativa elegida para el presupuesto: YoPRO natural en lugar de '+item.name+'. El menú conserva sus estimaciones nutricionales genéricas; revisa la etiqueta del producto.';}
  else if(['banana','platano'].includes(name)&&state.includes('sin piel')){key='banana';quantity=grams/.66;note='Incluye piel: parte comestible estimada 66 %. Banana de postre, no plátano para cocinar.';}
  else if(['aguacate','palta'].includes(name)){key='avocado';quantity=grams/.7;note='Incluye piel y hueso: parte comestible estimada 70 %.';}
  else if(name==='manzana'){key='apple';quantity=grams/.9;note='Incluye el corazón: parte comestible estimada 90 %.';}
  else if(name==='naranja'){key='orange';quantity=grams/.73;note='Incluye piel: parte comestible estimada 73 %.';}
  else if(name==='cebolla'){key='onion';quantity=grams/.9;note='Incluye limpieza y piel: 90 % aprovechable.';}
  else if(name==='tomate'){key='tomato';}
  else if(name==='pimiento'||name==='chile dulce'){key='pepper';quantity=grams/.85;note='Incluye semillas y limpieza: 85 % aprovechable.';}
  else if(name==='ajo'){key='garlic';quantity=grams/.9;note='Incluye piel: 90 % aprovechable.';}
  else if(name==='zanahoria'&&state.includes('cocid')){key='carrot';quantity=grams/.9;note='Rendimiento conjunto de limpieza y cocción estimado 90 %.';}
  else if(name==='patata'){key='potato';quantity=grams/.85;note='Limpieza y cocción: rendimiento conjunto estimado 85 %.';}
  else if(name==='batata'){key='sweetPotato';quantity=grams/.8;note='Batata / boniato: rendimiento conjunto de limpieza y horno estimado 80 %.';}
  // Papa criolla, guandules, yogur común y equivalencias nutricionales no se cambian de alimento.
  if(!key)return null;
  return {key,unit,quantity,note};
}
function quantities(demands){
  return demands.reduce((sum,d)=>sum+d.quantity,0);
}
function quoteFormats(candidates,demands){
  const total=quantities(demands),unit=candidates[0].pack.unit,required=unit==='unit'?Math.ceil(total):total;
  const target=Math.max(1,Math.ceil(required-1e-10)),limit=target+Math.max(...candidates.map(p=>p.pack.quantity))-1;
  if(target>100000)throw new Error('Cantidad de compra fuera de rango.');
  const cost=new Float64Array(limit+1).fill(Infinity),previous=new Int32Array(limit+1).fill(-1);
  cost[0]=0;
  for(let weight=0;weight<=limit;weight++){
    if(!Number.isFinite(cost[weight]))continue;
    for(let i=0;i<candidates.length;i++){
      const product=candidates[i],next=weight+product.pack.quantity;
      if(next<=limit&&cost[weight]+product.priceCents<cost[next]){cost[next]=cost[weight]+product.priceCents;previous[next]=i;}
    }
  }
  let best=target;
  for(let weight=target+1;weight<=limit;weight++)if(cost[weight]<cost[best])best=weight;
  if(!Number.isFinite(cost[best]))throw new Error('No se pudo calcular el formato de compra.');
  const counts=new Map();
  for(let weight=best;weight>0;){const index=previous[weight];counts.set(index,(counts.get(index)||0)+1);weight-=candidates[index].pack.quantity;}
  const parts=[...counts].map(([i,packs])=>({product:candidates[i],packs,purchased:packs*candidates[i].pack.quantity,subtotalCents:packs*candidates[i].priceCents})).sort((a,b)=>a.product.id.localeCompare(b.product.id));
  const notes=[...new Set(demands.map(d=>d.note))];
  if(parts.some(p=>p.product.pack.kind==='minimum'))notes.push('Producto al peso: redondeamos de forma conservadora a múltiplos de la compra mínima. Los incrementos exactos de venta no están verificados.');
  return {product:parts[0].product,parts,required,unit,packs:parts.reduce((n,p)=>n+p.packs,0),purchased:best,
    subtotalCents:cost[best],usedCents:Math.round(cost[best]*required/best),
    approximate:parts.some(p=>p.product.pack.kind!=='fixed')||demands.some(d=>d.note!=='Peso en seco.'&&d.note!=='Peso de compra orientativo.'),notes};
}
export function quoteStore(items,catalog,storeId,{excluded=new Set(),now=Date.now(),...options}={}){
  const eligible=items.filter(i=>!excluded.has(i.key)),groups=new Map(),missing=[];
  for(const item of eligible){
    const demand=purchaseDemand(item,options);
    if(!demand){missing.push({item,reason:'Sin equivalencia de compra comprobada.'});continue;}
    const candidates=catalog.products.filter(p=>p.storeId===storeId&&p.key===demand.key&&p.pack.unit===demand.unit&&isCurrent(p,now));
    if(!candidates.length){missing.push({item,reason:'Sin un precio vigente y disponible para este producto.'});continue;}
    const groupKey=demand.key+':'+demand.unit;
    if(!groups.has(groupKey))groups.set(groupKey,{demands:[],items:[],candidates});
    groups.get(groupKey).demands.push(demand);groups.get(groupKey).items.push(item);
  }
  const lines=[...groups.values()].map(group=>({...quoteFormats(group.candidates,group.demands),items:group.items,alternatives:group.candidates.length}));
  const pricedKeys=lines.flatMap(l=>l.items.map(i=>i.key));
  return {storeId,lines,missing,pricedKeys,covered:pricedKeys.length,totalItems:eligible.length,
    subtotalCents:lines.length?lines.reduce((s,l)=>s+l.subtotalCents,0):null,
    usedCents:lines.length?lines.reduce((s,l)=>s+l.usedCents,0):null,
    complete:eligible.length>0&&missing.length===0,excluded:items.length-eligible.length};
}
// Comparación justa: solo ingredientes con precios en todas las tiendas seleccionadas.
export function commonComparison(items,catalog,storeIds,options={}){
  if(storeIds.length<2)return {keys:[],quotes:[],winner:null};
  const base=storeIds.map(id=>quoteStore(items,catalog,id,options));
  const common=base[0].pricedKeys.filter(k=>base.every(q=>q.pricedKeys.includes(k)));
  if(!common.length)return {keys:[],quotes:[],winner:null};
  const quotes=storeIds.map(id=>quoteStore(items.filter(i=>common.includes(i.key)),catalog,id,options));
  const min=Math.min(...quotes.map(q=>q.subtotalCents)),winners=quotes.filter(q=>q.subtotalCents===min);
  return {keys:common,quotes,winner:winners.length===1?winners[0].storeId:null};
}
export function quantityText(quantity,unit){
  if(unit==='unit')return Math.ceil(quantity)+' ud.';
  if(unit==='ml')return quantity>=1000?(quantity/1000).toLocaleString('es-ES',{maximumFractionDigits:2})+' l':Math.ceil(quantity)+' ml';
  return quantity>=1000?(quantity/1000).toLocaleString('es-ES',{maximumFractionDigits:2})+' kg':Math.ceil(quantity)+' g';
}
export function quoteText(quote,storeName){
  const lines=['QUISKETT · PRESUPUESTO DE COMPRA',storeName+' · referencia Barcelona 08001, zona sin confirmar',
    'Precios públicos observados, máximo 48 h. No incluye envío, tarifas ni descuentos condicionados.',
    'El precio de 0,50 € corresponde al plan; los alimentos se pagan por separado.',
    quote.complete?'Todos los ingredientes pendientes tienen precio.':'PRESUPUESTO PARCIAL · faltan '+quote.missing.length+' ingredientes por valorar.',
    'Compra orientativa: '+(quote.subtotalCents===null?'Sin importe':money(quote.subtotalCents)),''];
  for(const l of quote.lines){lines.push(l.items.map(i=>i.name).join(' + '));
    for(const part of l.parts)lines.push(part.product.name,part.packs+' × '+money(part.product.priceCents)+' = '+money(part.subtotalCents),'Consultado: '+part.product.observedAt,part.product.url);
    lines.push('Necesitas ≈ '+quantityText(l.required,l.unit)+' · Compras '+quantityText(l.purchased,l.unit)+' · Sobra ≈ '+quantityText(l.purchased-l.required,l.unit),...l.notes,'');
  }
  if(quote.missing.length)lines.push('PENDIENTES DE VALORAR',...quote.missing.map(m=>m.item.name+' · '+m.reason));
  return lines.join('\n');
}
