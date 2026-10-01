import {validateCatalog,quoteStore,commonComparison,isCurrent,money,quantityText,quoteText,purchaseDefaults} from './prices.js';
const $=id=>document.getElementById(id);
const el=(tag,className,text)=>{const n=document.createElement(tag);n.className=className;if(text!==undefined)n.textContent=text;return n;};
const date=value=>new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(value));
const badges={dia:'D',caprabo:'C',mercadona:'M',consum:'Co',carrefour:'Ca'};
function saveText(text,name){
  const url=URL.createObjectURL(new Blob(['\ufeff',text],{type:'text/plain;charset=utf-8'})),a=el('a','');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function createPricingUI({getItems,getOwned,onMessage}){
  const s={catalog:null,loading:false,started:false,selected:'caprabo',options:{...purchaseDefaults},quote:null,error:null,currentKeys:''};
  const opts=()=>({...s.options,allowProteinAlternative:$('prices-protein-alternative').checked,excluded:$('prices-only-missing').checked?getOwned():new Set()});
  async function load(){
    if(s.loading)return;s.started=true;s.loading=true;s.error=null;render();
    try{
      const response=await fetch(new URL('./catalog/prices.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('No se pudo consultar el catálogo.');
      s.catalog=validateCatalog(await response.json());
    }catch{s.error='No hemos podido cargar el catálogo. Tu lista de ingredientes sigue disponible.';}
    finally{s.loading=false;render();}
  }
  function render(){
    if(!s.started){void load();return;}
    $('prices-message').hidden=!!s.catalog&&!s.loading;
    $('prices-message').textContent=s.error||'Cargando precios…';
    $('prices-retry').hidden=!s.error;$('prices-retry').disabled=s.loading;
    $('price-details').hidden=!s.catalog;$('store-cards').hidden=!s.catalog;
    if(!s.catalog)return;
    const catalog=s.catalog,items=getItems(),options=opts(),now=Date.now();
    s.currentKeys=catalog.products.filter(p=>isCurrent(p,now)).map(p=>p.storeId+':'+p.id).join('|');
    if(!catalog.stores.some(t=>t.id===s.selected))s.selected=catalog.stores[0]?.id;
    const quotes=catalog.stores.map(store=>({store,quote:quoteStore(items,catalog,store.id,{...options,now})}));
    $('prices-updated').textContent='Catálogo: '+date(catalog.generatedAt);
    $('store-cards').replaceChildren(...quotes.map(({store,quote})=>{
      const fresh=catalog.products.filter(p=>p.storeId===store.id&&isCurrent(p,now)).length,button=el('button','store-card');
      button.type='button';button.dataset.store=store.id;button.setAttribute('aria-pressed',String(s.selected===store.id));
      const top=el('span','store-card-top');top.append(el('span','store-monogram store-'+store.id,badges[store.id]),el('b','',store.name));
      const status=store.mode==='disabled'?'Pendiente de conexión':fresh===0?'Sin precios vigentes':store.status!=='ok'?'Actualización pendiente':'Precios consultados';
      button.append(top,el('span','store-status'+(store.status==='ok'&&fresh?' available':''),status),
        el('strong','store-cost',quote.subtotalCents===null?'—':money(quote.subtotalCents)),
        el('small','',quote.covered+' / '+quote.totalItems+' ingredientes · parcial'));
      if(quote.complete)button.lastChild.textContent=quote.covered+' / '+quote.totalItems+' ingredientes · completo';
      if(quote.totalItems===0)button.lastChild.textContent='Despensa lista';
      button.addEventListener('click',()=>{s.selected=store.id;render();$('store-cards').querySelector('[data-store="'+store.id+'"]').focus();});
      return button;
    }));
    const chosen=quotes.find(q=>q.store.id===s.selected);if(!chosen)return;
    const {store,quote}=chosen;s.quote=quote;
    $('basket-store').textContent=store.name+' · '+(quote.complete?'PRESUPUESTO COMPLETO':'PRESUPUESTO PARCIAL');
    $('basket-total').textContent=quote.subtotalCents===null?'Sin importe': '≈ '+money(quote.subtotalCents);
    $('basket-coverage').textContent=quote.totalItems===0?'Ya tienes todos los ingredientes de la lista.':quote.covered+' de '+quote.totalItems+' ingredientes con precio';
    $('basket-used').textContent=quote.usedCents===null?'Abre la tienda para consultar productos.':'Parte del contenido que usarías: ≈ '+money(quote.usedCents)+'. El resto queda en tu despensa.';
    $('basket-pending').textContent=quote.totalItems===0?'Desmarca un ingrediente si todavía te falta.':quote.missing.length?quote.missing.length+' pendientes de valorar. El importe mostrado no cubre toda la compra.':'Todos los ingredientes pendientes están incluidos. Confirma el importe en la tienda.';
    $('download-budget').disabled=!quote.lines.length;
    const comparison=commonComparison(items,catalog,quotes.filter(q=>q.quote.covered>0).map(q=>q.store.id),{...options,now});
    $('common-prices').hidden=comparison.keys.length===0;
    $('common-prices').replaceChildren();
    if(comparison.keys.length){
      $('common-prices').append(el('b','','Comparamos lo mismo: '+comparison.keys.length+' ingredientes'));
      const amounts=el('span','');comparison.quotes.forEach(q=>{const name=catalog.stores.find(t=>t.id===q.storeId).name;amounts.append(el('span',q.storeId===comparison.winner?'common-best':'',name+' '+money(q.subtotalCents)));});$('common-prices').append(amounts,el('small','','Mismos ingredientes, envases diferentes. No compara el coste total ni la cobertura de tu domicilio.'));
    }
    const productRows=quote.lines.map(line=>{
      const card=el('article','priced-product'),heading=el('div','priced-product-heading'),titles=el('div','');
      titles.append(el('h3','',line.items.map(i=>i.name).join(' + ')),el('p','product-name',line.parts.map(p=>p.product.name).join(' + ')));
      heading.append(titles,el('strong','',money(line.subtotalCents)));
      const strip=el('div','product-quantities');
      for(const [label,value] of [['Necesitas ≈',quantityText(line.required,line.unit)],['Compras ≈',line.parts.map(p=>p.packs+' × '+quantityText(p.product.pack.quantity,line.unit)).join(' + ')],['Te queda ≈',quantityText(Math.max(0,line.purchased-line.required),line.unit)]]){
        const block=el('span','');block.append(el('small','',label),el('b','',value));strip.append(block);
      }
      const sources=line.parts.map((part,index)=>{const source=el('div','product-source'),link=el('a','',line.parts.length>1?'Ver formato '+(index+1)+' ↗':'Ver producto ↗');link.href=part.product.url;link.target='_blank';link.rel='noopener noreferrer';
      const perUnit=part.product.pack.unit==='unit'?money(Math.round(part.product.priceCents/part.product.pack.quantity))+'/ud.':money(part.product.unitPriceCents)+'/'+(line.unit==='g'?'kg':'l');
      source.append(el('span','',money(part.product.priceCents)+' / '+(part.product.pack.kind==='minimum'?'compra mínima':part.product.pack.kind==='approximate'?'envase aprox.':'envase')+' · '+perUnit),link);return source;});
      const explanation=el('details','product-conversion');explanation.append(el('summary','','Cómo calculamos esta cantidad'),...line.notes.map(n=>el('p','',n)));
      explanation.append(el('p','','Precio observado el '+line.parts.map(p=>date(p.product.observedAt)).join(' / ')+'. Zona sin confirmar. No aplicamos promociones condicionadas.'));
      card.append(heading,strip,...sources,explanation);return card;
    });
    if(!productRows.length)productRows.push(el('p','price-empty',quote.totalItems===0?'Tu despensa ya está lista.':'Todavía no tenemos productos con precio vigente para estos ingredientes en '+store.name+'.'));
    $('priced-products').replaceChildren(...productRows);
    $('unpriced-details').hidden=quote.missing.length===0;
    $('unpriced-summary').textContent=quote.missing.length+' ingredientes pendientes de valorar';
    $('unpriced-list').replaceChildren(...quote.missing.map(m=>{const li=el('li','');li.append(el('b','',m.item.name),el('span','',quantityText(m.item.grams,'g')+' de receta · '+m.reason));return li;}));
  }
  $('prices-retry').addEventListener('click',load);
  $('prices-only-missing').addEventListener('change',render);
  $('prices-protein-alternative').addEventListener('change',render);
  $('apply-yields').addEventListener('click',()=>{
    const rice=$('rice-yield'),chicken=$('chicken-yield');
    $('yield-error').hidden=true;
    if(!rice.checkValidity()||!chicken.checkValidity()||!rice.value||!chicken.value){$('yield-error').textContent='Arroz: entre 2 y 4. Pollo: entre 0,5 y 1.';$('yield-error').hidden=false;return;}
    s.options.riceYield=Number(rice.value);s.options.chickenYield=Number(chicken.value);render();onMessage('Cantidades de compra actualizadas.');
  });
  $('download-budget').addEventListener('click',()=>{
    render();if(!s.quote?.lines.length){onMessage('Ya no hay precios vigentes para descargar.');return;}const store=s.catalog.stores.find(t=>t.id===s.selected);saveText(quoteText(s.quote,store.name),'quiskett-presupuesto-'+store.id+'.txt');onMessage('Presupuesto preparado para descargar.');
  });
  // Los datos caducan aunque se deje la pestaña abierta.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&s.started)render();});
  setInterval(()=>{if(s.catalog&&!document.hidden&&!$('view-compra').hidden){const key=s.catalog.products.filter(p=>isCurrent(p)).map(p=>p.storeId+':'+p.id).join('|');if(key!==s.currentKeys)render();}},60000);
  return {render};
}
