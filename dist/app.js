import {countries,goals,gymMealLabels,validateGymConfig,createGymPlan,dayTotals,portionFactor,scaleMeal,swapMeal,shoppingList,gymPlanText,planSelections,applyPlanSelections} from './gym.js';
import {createPricingUI} from './price-ui.js';
const $ = selector => document.querySelector(selector);
const icons = {
sliders:'<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
bag:'<path d="M6 7h12l2 14H4L6 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2m0 3h.01"/>',
dumbbell:'<path d="m7 7 10 10M3 6l3-3m-2 7 6-6m4 16 6-6m-3 7 4-4M3 3l3 3m12 12 3 3"/>',
flame:'<path d="M12 3c2 5 6 5 6 11a6 6 0 0 1-12 0c0-3 2-6 3-7 0 4 2 3 3-4Z"/><path d="M12 13c2 2 3 3 2 5a2 2 0 0 1-4 0c0-2 2-3 2-5Z"/>',
balance:'<path d="M12 3v18m-6 0h12M4 7h16M6 7l-3 6h6L6 7Zm12 0-3 6h6l-3-6Z"/>',
globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18m-9-9a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z"/>',
refresh:'<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
check:'<path d="m5 12 4 4L19 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',
chevron:'<path d="m9 5 7 7-7 7"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7 0v4m-2-2h4"/>',
download:'<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',
shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>'
};
function icon(name){const span=document.createElement('span');span.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.check)+'</svg>';return span;}
function mountIcons(root=document){root.querySelectorAll('[data-icon]').forEach(node=>node.replaceChildren(...icon(node.dataset.icon).childNodes));}
function el(tag,className,text){const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;}
const state={country:'do',plan:null,day:0,seed:0,confirmed:false,paid:false,completed:new Set(),shopping:new Set(),paymentMode:'loading',orderId:null,requestId:null,poll:0,pendingPayment:false,stripeTestMode:false,checkoutBusy:false};
const pricing=createPricingUI({getItems:()=>state.plan?shoppingList(state.plan):[],getOwned:()=>state.shopping,onMessage:toast});
let toastTimer;
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3000);}
function readConfig(){return {country:state.country,style:$('#style').value,days:Number($('[name="days"]:checked').value),goal:$('[name="goal"]:checked').value,training:Number($('#training-days').value),portion:$('#portion').value,weight:$('#weight').value.trim()===''?null:Number($('#weight').value),adult:$('#adult').checked};}
function previewConfig(){const config=readConfig();return {...config,adult:true,weight:null};}
function setForm(config){state.country=config.country;$('#style').value=config.style;$('[name="days"][value="'+config.days+'"]').checked=true;$('[name="goal"][value="'+config.goal+'"]').checked=true;$('#training-days').value=config.training;$('#portion').value=config.portion;$('#adult').checked=true;updatePreview();}
const fmt=value=>new Intl.NumberFormat('es',{maximumFractionDigits:0}).format(Math.round(value));
function updatePreview(){
const config=previewConfig(),plan=createGymPlan(config,0),nutrition=dayTotals(plan.days[0]),selection=countries[state.country];
$('#selected-code').textContent=selection.code;$('#selected-country').textContent=selection.name;$('#selected-region').textContent=selection.region;
$('#preview-goal').textContent=goals[config.goal];$('#training-output').textContent=config.training+' '+(config.training===1?'día':'días');
$('#portion-label').textContent=portionFactor(config)<1?'Porciones moderadas':portionFactor(config)>1?'Porciones generosas':'Porciones estándar';
$('#preview-kcal').textContent=fmt(nutrition.kcal);$('#preview-protein').textContent=fmt(nutrition.protein)+' g';$('#preview-carbs').textContent=fmt(nutrition.carbs)+' g';$('#preview-fat').textContent=fmt(nutrition.fat)+' g';
const totalEnergy=nutrition.protein*4+nutrition.carbs*4+nutrition.fat*9;
const proteinPercent=nutrition.protein*4/totalEnergy*100,carbEnd=proteinPercent+nutrition.carbs*4/totalEnergy*100;
$('#macro-ring').style.background='conic-gradient(var(--lime) 0 '+proteinPercent+'%,#93bda0 '+proteinPercent+'% '+carbEnd+'%,#e3ce99 '+carbEnd+'% 100%)';
$('#vegetarian-note').hidden=config.style!=='vegetarian';
const weight=Number($('#weight').value);$('#protein-reference').hidden=!$('#weight').value||!Number.isFinite(weight)||weight<45||weight>160;
if(!$('#protein-reference').hidden)$('#protein-reference').textContent='Referencia general para '+weight+' kg: '+fmt(weight*1.6)+' g/día (rango '+fmt(weight*1.4)+'–'+fmt(weight*2)+'). Este menú aporta ≈ '+fmt(nutrition.protein)+' g. No es un requerimiento individual.';
$('#preview-meals').replaceChildren(...Object.entries(plan.days[0].meals).map(([type,meal])=>{const row=el('div','preview-meal');row.append(el('span','',gymMealLabels[type]),el('b','',meal.title),el('small','',fmt(meal.nutrition.protein)+' g prot.'));return row;}));
}
const routeLabels={crear:'Planificador',plan:'Mi plan',compra:'Lista de compra',pago:'Confirmación',listo:'Tu plan está listo',ayuda:'Cómo funciona'};
function navigate(route){if(route==='pago'&&state.paid)route='listo';if(location.hash==='#/'+route)renderRoute();else location.hash='/'+route;}
function renderRoute(){
let route=location.hash.slice(2).split('?')[0]||'crear';if(!Object.hasOwn(routeLabels,route)){route='crear';history.replaceState(null,'','#/crear');}
if((route==='pago'||route==='listo')&&!state.plan){route='crear';history.replaceState(null,'','#/crear');}
if(route==='listo'&&!state.confirmed){route='pago';history.replaceState(null,'','#/pago');}
document.querySelectorAll('.route-view').forEach(view=>view.hidden=view.id!=='view-'+route);
document.querySelectorAll('[data-route]').forEach(link=>{const active=link.dataset.route===route;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
$('#page-label').textContent=routeLabels[route];document.title='Quiskett · '+routeLabels[route];
if(route==='plan')renderPlan();if(route==='compra')renderShopping();if(route==='pago')renderCheckout();if(route==='listo')renderReady();
window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});
}
function createNewPlan(input){
if(state.pendingPayment||state.checkoutBusy)throw new Error('Estamos comprobando tu compra. Espera la verificación o recarga esta página antes de crear otro plan.');
const config=validateGymConfig(input),plan=createGymPlan(config,state.seed++);state.plan=plan;state.day=0;state.confirmed=false;state.paid=false;state.orderId=null;state.requestId=null;state.pendingPayment=false;state.shopping.clear();state.completed.clear();state.poll++;setForm(config);$('#nav-days').textContent=String(plan.days.length);$('#nav-days').hidden=false;$('#form-error').hidden=true;saveSession();navigate('plan');return {status:'created',country:plan.countryName,days:plan.days.length,meals:plan.days.length*4,goal:plan.goal};
}
$('#plan-form').addEventListener('submit',event=>{event.preventDefault();try{createNewPlan(readConfig());}catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;$('#form-error').scrollIntoView({block:'nearest'});}});
$('#plan-form').addEventListener('input',event=>{if(event.target.id==='adult')return;updatePreview();});
$('#plan-form').addEventListener('change',updatePreview);
window.addEventListener('hashchange',renderRoute);
document.querySelectorAll('[data-navigate]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.navigate)));
$('#open-help').addEventListener('click',()=>navigate('ayuda'));
// Search uses names and codes, with accent-insensitive matches.
let region='Todas';
const normalize=text=>text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
function renderCountries(){
const term=normalize($('#country-search').value.trim());let count=0;const nodes=[];
for(const [code,country] of Object.entries(countries).sort((a,b)=>a[1].name.localeCompare(b[1].name,'es'))){
if(region!=='Todas'&&country.region!==region)continue;if(term&&!normalize(country.name+' '+code+' '+country.code).includes(term))continue;
count++;const button=el('button','country-option');button.type='button';button.setAttribute('aria-pressed',String(code===state.country));const label=el('span','',country.name);label.append(el('small','',country.region));button.append(el('span','flag-code',country.code),label);
button.addEventListener('click',()=>{state.country=code;updatePreview();$('#country-dialog').close();toast('Sabores de '+country.name+' seleccionados.');});nodes.push(button);
}
$('#country-list').replaceChildren(...nodes);$('#empty-search').hidden=count>0;
}
const regions=['Todas',...new Set(Object.values(countries).map(c=>c.region))];
$('#region-filters').replaceChildren(...regions.map(name=>{const button=el('button','',name.replace('América del ','').replace('América ','').replace('África Central','África'));button.type='button';button.setAttribute('aria-pressed',String(name===region));button.addEventListener('click',()=>{region=name;$('#region-filters').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderCountries();});return button;}));
$('#open-countries').addEventListener('click',()=>{$('#country-search').value='';renderCountries();$('#country-dialog').showModal();$('#country-search').focus();});
$('#close-countries').addEventListener('click',()=>$('#country-dialog').close());
$('#country-search').addEventListener('input',renderCountries);
$('#country-dialog').addEventListener('click',event=>{if(event.target!==$('#country-dialog'))return;const box=event.target.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.target.close();});
$('#country-count').textContent=Object.keys(countries).length;
$('#all-country-names').textContent=Object.values(countries).map(c=>c.name).sort((a,b)=>a.localeCompare(b,'es')).join(', ')+'. Incluimos 20 estados soberanos y Puerto Rico como territorio; el español también se habla en otros lugares.';
function renderPlan(){
$('#plan-empty').hidden=!!state.plan;$('#plan-content').hidden=!state.plan;if(!state.plan)return;
const plan=state.plan;$('#plan-summary').textContent=plan.countryName+' · '+plan.goal+' · '+plan.days.length+' días · '+(plan.config.style==='vegetarian'?'Vegetariana':'Variada');
$('#day-tabs').replaceChildren(...plan.days.map((day,index)=>{const button=el('button','','Día '+day.day);button.type='button';button.id='day-tab-'+index;button.setAttribute('role','tab');button.setAttribute('aria-controls','plan-meals');button.setAttribute('aria-selected',String(index===state.day));button.tabIndex=index===state.day?0:-1;
button.addEventListener('click',()=>{state.day=index;saveSession();renderPlan();$('#day-tab-'+index).focus();});
button.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%plan.days.length;else if(event.key==='ArrowLeft')next=(index+plan.days.length-1)%plan.days.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=plan.days.length-1;else return;event.preventDefault();state.day=next;renderPlan();$('#day-tab-'+next).focus();});return button;}));
$('#plan-meals').setAttribute('aria-labelledby','day-tab-'+state.day);
const day=plan.days[state.day],n=dayTotals(day);$('#day-title').textContent='Día '+day.day;$('#day-type').textContent=day.training?'Día de entrenamiento':'Día de descanso';
$('#day-totals').replaceChildren(...[['≈ '+fmt(n.kcal),'kcal'],[fmt(n.protein)+' g','proteína'],[fmt(n.carbs)+' g','carbos'],[fmt(n.fat)+' g','grasa']].map(([value,name])=>{const span=el('span','');span.append(el('b','',value),document.createTextNode(' '+name));return span;}));
const confirm=$('#plan-content [data-navigate="pago"]');confirm.textContent=state.paid?'Descargar mi plan':'Confirmar mi plan · 0,50 €';
$('#plan-meals').replaceChildren(...Object.entries(day.meals).map(([type,meal])=>renderMeal(meal,type)));
}
function markPlanChanged(){if(!state.paid){state.confirmed=false;state.orderId=null;}state.requestId=null;state.pendingPayment=false;state.shopping.clear();state.poll++;saveSession();}
function renderMeal(meal,type){
const key=state.day+':'+type,tile=el('article','meal-tile'+(state.completed.has(key)?' completed':''));tile.dataset.meal=type;
const top=el('div','meal-top'),swap=el('button','meal-swap');swap.type='button';swap.disabled=state.pendingPayment||state.checkoutBusy;swap.setAttribute('aria-label','Cambiar '+gymMealLabels[type].toLowerCase());swap.append(icon('refresh'));swap.addEventListener('click',()=>{if(state.pendingPayment||state.checkoutBusy){toast('Espera a que se verifique tu compra.');return;}swapMeal(state.plan,state.day,type);state.completed.delete(key);markPlanChanged();renderPlan();$('#plan-meals [data-meal="'+type+'"] .meal-swap').focus();toast('Plato cambiado. Tu lista de compra se ha actualizado.');});top.append(el('span','meal-label',gymMealLabels[type].toUpperCase()),swap);
tile.append(top,el('h3','',meal.title));
const macros=el('div','meal-macros');[fmt(meal.nutrition.kcal)+' kcal',fmt(meal.nutrition.protein)+' g proteína',fmt(meal.nutrition.carbs)+' g carbos',fmt(meal.nutrition.fat)+' g grasa'].forEach(text=>macros.append(el('span','',text)));tile.append(macros);
const control=el('div','portion-control'),buttons=el('div','quantity-buttons');control.append(el('span','','Tu porción'));for(const [label,delta]of [['−',-.25],['+',.25]]){const button=el('button','',label);button.type='button';button.setAttribute('aria-label',(delta<0?'Reducir':'Aumentar')+' porción de '+meal.title);button.dataset.portion=delta<0?'reduce':'increase';button.disabled=state.pendingPayment||state.checkoutBusy||(delta<0?meal.scale<=.75:meal.scale>=1.5);button.addEventListener('click',()=>{if(state.pendingPayment||state.checkoutBusy)return;state.plan.days[state.day].meals[type]=scaleMeal(meal,delta);markPlanChanged();renderPlan();const controls=$('#plan-meals [data-meal="'+type+'"] .quantity-buttons'),next=controls.querySelector('[data-portion="'+(delta<0?'reduce':'increase')+'"]');(next.disabled?controls.querySelector('button:not(:disabled)'):next)?.focus();});if(delta>0)buttons.append(el('span','',Math.round(meal.scale*100)+' %'));buttons.append(button);}control.append(buttons);tile.append(control);
const details=el('details','meal-details'),summary=el('summary','','Ingredientes y preparación'),list=el('ul','ingredient-list');
meal.ingredients.forEach(item=>{const li=el('li',''),name=el('span','',item.name);name.append(el('small','ingredient-state',item.state+(item.proxy?' · equivalencia aprox.':'')));li.append(name,el('b','',item.grams+' g'));list.append(li);});details.append(summary,list,el('p','recipe-preparation',meal.preparation));tile.append(details);
const complete=el('label','meal-completed'),check=el('input','');check.type='checkbox';check.checked=state.completed.has(key);check.addEventListener('change',()=>{if(check.checked)state.completed.add(key);else state.completed.delete(key);tile.classList.toggle('completed',check.checked);saveSession();});complete.append(check,el('span','','Comida hecha'));tile.append(complete);return tile;
}
$('#regenerate-plan').addEventListener('click',()=>{if(!state.plan)return;if(state.pendingPayment||state.checkoutBusy){toast('Espera a que se verifique tu compra.');return;}const config=state.plan.config;createNewPlan(config);toast('Nueva combinación para tu semana.');});
function renderShopping(){
$('#shopping-empty').hidden=!!state.plan;$('#shopping-content').hidden=!state.plan;$('#download-shopping').disabled=!state.plan;if(!state.plan)return;
const groups=new Map();for(const item of shoppingList(state.plan)){if(!groups.has(item.group))groups.set(item.group,[]);groups.get(item.group).push(item);}
$('#shopping-groups').replaceChildren(...[...groups].map(([name,items])=>{const section=el('section','shopping-group');section.append(el('h2','',name));items.forEach(item=>{const label=el('label','shopping-item'),check=el('input','');check.type='checkbox';check.checked=state.shopping.has(item.key);check.addEventListener('change',()=>{if(check.checked)state.shopping.add(item.key);else state.shopping.delete(item.key);shoppingProgress();saveSession();});const text=el('span','',item.name);text.append(el('small','ingredient-state',item.state));label.append(check,text,el('b','',item.grams>=1000?(item.grams/1000).toLocaleString('es',{maximumFractionDigits:2})+' kg':item.grams+' g'));section.append(label);});return section;}));shoppingProgress();
}
function shoppingProgress(){const items=shoppingList(state.plan),count=items.filter(i=>state.shopping.has(i.key)).length;$('#shopping-counter').textContent=count+' de '+items.length+' ingredientes listos';$('#shopping-progress').max=items.length;$('#shopping-progress').value=count;pricing.render();}
$('#reset-shopping').addEventListener('click',()=>{state.shopping.clear();saveSession();renderShopping();});
function download(text,name){const blob=new Blob(['\ufeff',text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=el('a','');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$('#download-shopping').addEventListener('click',()=>{if(!state.plan)return;const lines=['QUISKETT · LISTA DE COMPRA',state.plan.countryName+' · '+state.plan.days.length+' días','Pesos de receta. Consulta cocido/en seco/antes de cocinar; no son conversiones a compra en seco.','',...shoppingList(state.plan).map(i=>(state.shopping.has(i.key)?'[x] ':'[ ] ')+i.name+': '+i.grams+' g ('+i.state+')')];download(lines.join('\n'),'quiskett-lista-de-compra.txt');toast('Lista preparada para descargar.');});
function renderCheckout(){
$('#checkout-error').hidden=true;$('#checkout-consent').checked=false;$('#checkout-consent').disabled=state.paymentMode==='loading'||state.pendingPayment||state.checkoutBusy;$('#checkout-submit').disabled=true;
$('#checkout-description').textContent=state.plan.countryName+' · '+state.plan.goal+' · '+state.plan.days.length+' días';
const live=state.paymentMode==='stripe';$('#checkout-mode').textContent=live?(state.stripeTestMode?'STRIPE · MODO PRUEBA':'STRIPE CHECKOUT'):'DEMOSTRACIÓN';
$('#payment-heading').textContent=live?'Confirma tu plan.':'Prueba el recorrido completo.';
$('#payment-description').textContent=live?(state.stripeTestMode?'Stripe está en modo de prueba. El importe simulado es 0,50 €; no se cobrará dinero real.':'Pagarás 0,50 € una sola vez en la página segura de Stripe. No solicitamos tu tarjeta aquí.'):'Esta versión no pide tarjeta ni realiza cobros. Podrás confirmar y descargar tu plan de prueba.';
$('#payment-method-note').textContent=live?'Pago seguro en la página de Stripe':'Disponible al conectar la pasarela';
$('#checkout-consent-text').textContent=live?'Acepto pagar 0,50 € por este plan, sin suscripción.':'Entiendo que estoy probando una demostración gratuita.';
$('#checkout-submit').textContent=live?'Pagar 0,50 €':'Confirmar demo gratis';
$('#payment-small').textContent=live?'Los datos de tarjeta se introducen únicamente en Stripe.':'Nunca introduzcas datos de tarjeta en esta demo.';
}
$('#checkout-consent').addEventListener('change',()=>$('#checkout-submit').disabled=state.paymentMode==='loading'||state.pendingPayment||state.checkoutBusy||!$('#checkout-consent').checked);
$('#checkout-submit').addEventListener('click',async()=>{
if(!state.plan||!$('#checkout-consent').checked||state.paymentMode==='loading'||state.pendingPayment||state.checkoutBusy)return;
if(state.paymentMode!=='stripe'){state.confirmed=true;state.paid=false;saveSession();navigate('listo');return;}
state.checkoutBusy=true;const checkoutRun=state.poll,button=$('#checkout-submit');button.disabled=true;button.textContent='Abriendo Stripe…';$('#checkout-error').hidden=true;
try{
const run=state.poll,requestId=state.requestId||(state.requestId=crypto.randomUUID()),config={...state.plan.config,weight:null};saveSession();
const response=await fetch('api/checkout-sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,seed:state.plan.seed,selections:planSelections(state.plan),requestId})}),data=await response.json();
if(run!==state.poll||requestId!==state.requestId)return;
if(!response.ok){if(response.status===410){state.requestId=null;saveSession();}throw new Error(data.error||'No se pudo iniciar el pago.');}
if(data.status==='ready'){state.orderId=data.orderId;saveSession();await recoverOrder(false);return;}
const url=new URL(data.checkoutUrl);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('No recibimos una dirección de pago válida.');
state.orderId=data.orderId;saveSession();location.assign(url.href);
}catch(error){if(checkoutRun!==state.poll)return;$('#checkout-error').textContent=error.message;$('#checkout-error').hidden=false;button.disabled=false;button.textContent='Reintentar pago de 0,50 €';}finally{state.checkoutBusy=false;}
});
function renderReady(){
$('#ready-eyebrow').textContent=state.paid?(state.stripeTestMode?'PAGO DE PRUEBA VERIFICADO':'PAGO VERIFICADO · PLAN LISTO'):'PLAN DE PRUEBA CONFIRMADO';
$('#ready-description').textContent=state.paid?(state.stripeTestMode?'La transacción de prueba se ha verificado. No se ha cobrado dinero real.':'El pago se ha verificado. Tu menú y tu lista de compra están listos.'):'Tu menú y tu lista de compra están listos. No se ha realizado ningún cobro.';
$('#ready-summary').textContent=state.plan.countryName+' · '+state.plan.goal+' · '+state.plan.days.length+' días · '+state.plan.days.length*4+' comidas';
}
$('#download-plan').addEventListener('click',()=>{if(!state.plan||!state.confirmed)return;download(gymPlanText(state.plan,state.paid&&!state.stripeTestMode),'quiskett-gym-'+state.plan.config.country+'-'+state.plan.days.length+'-dias.txt');toast('Tu plan está preparado para descargar.');});
$('#print-plan').addEventListener('click',()=>{
if(!state.plan||!state.confirmed)return;const print=$('#print-document');print.replaceChildren(el('h1','','QUISKETT GYM'),el('p','',state.plan.countryName+' · '+state.plan.goal+' · '+state.plan.days.length+' días · '+(state.paid&&!state.stripeTestMode?'Compra verificada':'Plan de prueba, sin cobro')));
for(const day of state.plan.days){const section=el('section','print-day'),n=dayTotals(day);section.append(el('h2','','Día '+day.day+' · '+(day.training?'Entrenamiento':'Descanso')),el('p','','≈ '+fmt(n.kcal)+' kcal · '+fmt(n.protein)+' g proteína'));for(const [type,meal]of Object.entries(day.meals)){section.append(el('h3','',gymMealLabels[type]+' · '+meal.title));const list=el('ul','');meal.ingredients.forEach(i=>list.append(el('li','',i.name+': '+i.grams+' g ('+i.state+')')));section.append(list,el('p','',meal.preparation));}print.append(section);}
print.append(el('p','','Nutrientes y cantidades estimados. Plan orientativo para adultos sanos. No sustituye una evaluación individual.'));window.print();
});
// Session storage holds the menu only, never weight or card data. Payment status always comes from the server.
function saveSession(){try{if(!state.plan){sessionStorage.removeItem('quiskett-session');return;}sessionStorage.setItem('quiskett-session',JSON.stringify({config:state.plan.config,seed:state.plan.seed,selections:planSelections(state.plan),day:state.day,confirmed:state.confirmed,orderId:state.orderId,requestId:state.requestId,completed:[...state.completed],shopping:[...state.shopping]}));}catch{/* Storage may be unavailable in private sessions. */}}
function restoreSession(){try{const saved=JSON.parse(sessionStorage.getItem('quiskett-session')||'null');if(!saved)return;state.plan=applyPlanSelections(saved.config,saved.seed,saved.selections);state.day=Number.isInteger(saved.day)&&state.plan.days[saved.day]?saved.day:0;state.confirmed=saved.confirmed===true&&!saved.orderId;state.orderId=typeof saved.orderId==='string'?saved.orderId:null;state.requestId=typeof saved.requestId==='string'?saved.requestId:null;state.completed=new Set(Array.isArray(saved.completed)?saved.completed:[]);state.shopping=new Set(Array.isArray(saved.shopping)?saved.shopping:[]);setForm(state.plan.config);$('#nav-days').textContent=String(state.plan.days.length);$('#nav-days').hidden=false;}catch{try{sessionStorage.removeItem('quiskett-session');}catch{}}}
async function paymentConfig(){try{const response=await fetch('api/config',{credentials:'same-origin',signal:AbortSignal.timeout(5000)});if(!response.ok)return;const data=await response.json();if(data.paymentMode==='stripe'){state.paymentMode='stripe';state.stripeTestMode=data.stripeTestMode===true;$('#mode-badge').textContent=state.stripeTestMode?'Stripe · prueba':'Stripe Checkout';$('.version-label').textContent='QUISKETT GYM';$('.help-steps article:last-child p').textContent=state.stripeTestMode?'Confirma una transacción de prueba en Stripe y descarga el plan. No se cobra dinero real.':'Paga 0,50 € una sola vez en Stripe. Cuando se verifique tu compra, descarga el menú y la lista.';$('#plan-form .quiet-note').textContent=state.stripeTestMode?'Pasarela en modo de prueba. No se realiza un cobro real.':'Revisa y ajusta tu plan antes del pago único de 0,50 €.';$('#payment-faq').textContent=state.stripeTestMode?'Stripe está en modo de prueba. No se cobra dinero real.':'El plan cuesta 0,50 € y se paga una sola vez en Stripe. No hay suscripción.';}}catch{/* GitHub Pages mantiene el modo demo. */}finally{if(state.paymentMode==='loading')state.paymentMode='demo';}}
async function recoverOrder(cancelled=false,attempt=0){
if(!state.orderId||state.paymentMode!=='stripe')return;
state.pendingPayment=true;const orderId=state.orderId,run=state.poll;
try{
const response=await fetch('api/orders/'+encodeURIComponent(orderId),{credentials:'same-origin'}),data=await response.json();
if(run!==state.poll||orderId!==state.orderId)return;
if(!response.ok)throw new Error(data.error||'No se pudo verificar la compra.');
if(data.status==='ready'&&data.plan){const sameMenu=state.plan&&state.plan.seed===data.plan.seed&&JSON.stringify(state.plan.config)===JSON.stringify(data.plan.config);if(!sameMenu)state.plan=data.plan;state.paid=true;state.confirmed=true;state.pendingPayment=false;setForm(data.plan.config);saveSession();history.replaceState(null,'',location.pathname+'#/listo');renderRoute();return;}
if(data.preview){state.plan=data.preview;setForm(data.preview.config);}
if(cancelled||data.status==='expired'){state.pendingPayment=false;if(data.status==='expired'){state.requestId=null;state.orderId=null;}saveSession();history.replaceState(null,'',location.pathname+'#/pago');renderRoute();toast(data.status==='expired'?'La sesión ha caducado. Puedes volver a confirmar.':'Has vuelto al plan. No se ha confirmado ningún cobro.');return;}
state.pendingPayment=true;history.replaceState(null,'',location.pathname+'?checkout=success#/pago');renderRoute();$('#checkout-error').textContent='Estamos verificando el pago. No vuelvas a pagar. Si tarda, recarga esta página para comprobarlo.';$('#checkout-error').hidden=false;
if(attempt<5)setTimeout(()=>{if(run===state.poll&&orderId===state.orderId)recoverOrder(false,attempt+1);},4000);
}catch(error){if(run!==state.poll)return;state.pendingPayment=true;if(state.plan){history.replaceState(null,'',location.pathname+'?checkout=success&order='+encodeURIComponent(orderId)+'#/pago');renderRoute();$('#checkout-error').textContent=error.message+' Conserva esta sesión y recarga para verificar; no vuelvas a pagar.';$('#checkout-error').hidden=false;}else{$('#form-error').textContent=error.message;$('#form-error').hidden=false;}}
}
$('.skip-link').addEventListener('click',event=>{event.preventDefault();$('#main').focus();});
mountIcons();restoreSession();updatePreview();renderCountries();renderRoute();
(async()=>{const params=new URLSearchParams(location.search);if(params.get('order'))state.orderId=params.get('order');state.pendingPayment=!!state.orderId;await paymentConfig();if(state.paymentMode==='demo')state.pendingPayment=false;if(location.hash==='#/pago'&&state.plan)renderCheckout();await recoverOrder(params.get('checkout')==='cancelled'||(params.get('checkout')!=='success'&&!state.confirmed));})();
const context=document.modelContext;if(context?.registerTool){const lifecycle=new AbortController();try{
Promise.resolve(context.registerTool({name:'create_quiskett_gym_plan',title:'Crear plan de gimnasio',description:'Crea y muestra un plan orientativo para adultos con país, objetivo y porciones. No confirma pagos ni realiza cobros.',inputSchema:{type:'object',properties:{country:{type:'string',enum:Object.keys(countries)},style:{type:'string',enum:['all','vegetarian']},days:{type:'integer',enum:[3,7]},goal:{type:'string',enum:Object.keys(goals)},training:{type:'integer',minimum:1,maximum:6},portion:{type:'string',enum:['auto','small','standard','large']},adult:{const:true}},required:['country','style','days','goal','training','portion','adult'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>createNewPlan(validateGymConfig(input))},{signal:lifecycle.signal})).catch(()=>{});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}catch{/* La interfaz funciona sin WebMCP. */}}
