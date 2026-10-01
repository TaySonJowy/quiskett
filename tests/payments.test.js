import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID,createHmac } from 'node:crypto';
import { createPayments,OrderStore,verifySignature,verifyPaidSession,validateCheckout } from '../server/payments.mjs';
import { createServer } from '../scripts/serve.mjs';
import { createGymPlan,planSelections,swapMeal,scaleMeal } from '../dist/gym.js';
const config={country:'pr',style:'vegetarian',days:3,goal:'maintain',training:3,portion:'standard',weight:null,adult:true};
function input(){const plan=createGymPlan(config,3);swapMeal(plan,0,'lunch');plan.days[1].meals.dinner=scaleMeal(plan.days[1].meals.dinner,.25);return {config,seed:3,selections:planSelections(plan),requestId:randomUUID()};}
const owner='a'.repeat(64);
const req={headers:{origin:'http://127.0.0.1:4173',cookie:'quiskett-owner='+owner}};
const res={setHeader(){}};
const env={PAYMENTS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_fake_for_unit_test',STRIPE_WEBHOOK_SECRET:'whsec_unit_test',PUBLIC_ORIGIN:'http://127.0.0.1:4173'};

test('Firma: solo acepta cuerpo intacto, secreto correcto y timestamp reciente',()=>{
  const raw=Buffer.from('{"id":"evt_test"}'),now=1700000000;
  const signature=createHmac('sha256','whsec_unit_test').update(now+'.').update(raw).digest('hex');
  const header='t='+now+',v1='+signature;
  assert.equal(verifySignature(raw,header,'whsec_unit_test',now),true);
  assert.equal(verifySignature(Buffer.from('{}'),header,'whsec_unit_test',now),false);
  assert.equal(verifySignature(raw,header,'wrong',now),false);
  assert.equal(verifySignature(raw,header,'whsec_unit_test',now+301),false);
});

test('Checkout rechaza importe/client metadata/peso y la demo nunca llama Stripe',async()=>{
  const valid=input();
  assert.throws(()=>validateCheckout({...valid,amount:1}));
  assert.throws(()=>validateCheckout({...valid,config:{...config,weight:75}}));
  assert.throws(()=>validateCheckout({...valid,seed:-1}));
  const demo=createPayments({}, {fetchFn:()=>{throw new Error('Debe permanecer offline');}});
  assert.equal(demo.mode,'demo');
  await assert.rejects(demo.checkout(req,res,valid),error=>error.status===503);
  assert.throws(()=>createPayments({...env,PUBLIC_ORIGIN:'https://example.com/path'}));
});

test('Un pedido duradero conserva los cambios, reutiliza checkout y solo entrega un pago verificado',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'quiskett-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const file=path.join(dir,'orders.json'),store=new OrderStore(file);
  let createCount=0,session;
  const fetchFn=async(url,options)=>{
    if(options.method==='POST'){
      createCount++;const form=options.body,orderId=form.get('client_reference_id');
      assert.equal(form.get('line_items[0][price_data][unit_amount]'),'50');
      assert.equal(form.get('line_items[0][price_data][currency]'),'eur');
      assert.deepEqual([...form.keys()].filter(k=>k.startsWith('metadata')),['metadata[order_id]']);
      session={id:'cs_test_sample',url:'https://checkout.stripe.com/c/pay/test',expires_at:Math.floor(Date.now()/1000)+1800,mode:'payment',status:'open',payment_status:'unpaid',amount_total:50,currency:'eur',livemode:false,client_reference_id:orderId,metadata:{order_id:orderId},line_items:{has_more:false,data:[{quantity:1,amount_total:50,currency:'eur',price:{unit_amount:50,currency:'eur',product:'prod_quiskett'}}]}};
    }
    return {ok:true,json:async()=>structuredClone(session)};
  };
  const payments=createPayments(env,{fetchFn,store}),data=input();
  const [first,repeat]=await Promise.all([payments.checkout(req,res,data),payments.checkout(req,res,data)]);
  assert.deepEqual(repeat,first);assert.equal(createCount,1);
  const restarted=createPayments(env,{fetchFn,store:new OrderStore(file)});
  assert.deepEqual(await restarted.checkout(req,res,data),first);assert.equal(createCount,1);
  await assert.rejects(payments.checkout({headers:{...req.headers,origin:'https://attacker.example'}},res,data),e=>e.status===403);
  await assert.rejects(payments.getOrder({headers:{cookie:'quiskett-owner='+'b'.repeat(64)}},res,first.orderId),e=>e.status===404);
  const pending=await payments.getOrder(req,res,first.orderId);
  assert.equal(pending.status,'pending');assert.equal(pending.plan,undefined);
  assert.deepEqual(planSelections(pending.preview),data.selections);
  session.payment_status='paid';session.status='complete';session.amount_total=49;
  const freshPayments=createPayments(env,{fetchFn,store});
  await assert.rejects(freshPayments.getOrder(req,res,first.orderId),e=>e.status===409);
  session.amount_total=50;
  const ready=await freshPayments.getOrder(req,res,first.orderId);
  assert.equal(ready.status,'ready');assert.deepEqual(planSelections(ready.plan),data.selections);
  const order=await store.transaction(orders=>structuredClone(orders[0]));
  assert.equal(verifyPaidSession(session,order,false),true);
  for(const bad of [{...session,livemode:true},{...session,client_reference_id:'wrong'},{...session,currency:'usd'},{...session,line_items:{...session.line_items,data:[{...session.line_items.data[0],quantity:2}]}},{...session,line_items:{...session.line_items,data:[{...session.line_items.data[0],price:{unit_amount:50,currency:'eur',product:'prod_other'}}]}}])assert.equal(verifyPaidSession(bad,order,false),false);
  const raw=Buffer.from(JSON.stringify({type:'checkout.session.completed',livemode:false,data:{object:session}})),now=Math.floor(Date.now()/1000);
  const signature='t='+now+',v1='+createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(now+'.').update(raw).digest('hex');
  assert.deepEqual(await payments.webhook(raw,signature),{received:true});
  assert.deepEqual(await payments.webhook(raw,signature),{received:true});
  assert.equal(createCount,1);
  await assert.rejects(payments.webhook(raw,'invalid'),e=>e.status===400);
});

test('Servidor demo: API honesta, estáticos y protección de archivos privados',async t=>{
  const server=createServer({});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port;
  const mode=await fetch(url+'/api/config');
  assert.deepEqual(await mode.json(),{paymentMode:'demo',stripeTestMode:false});
  const html=await fetch(url+'/');assert.equal(html.status,200);assert.match(await html.text(),/Quiskett/);
  assert.equal((await fetch(url+'/server/payments.mjs')).status,404);
  assert.equal((await fetch(url+'/.env')).status,404);
  const checkout=await fetch(url+'/api/checkout-sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input())});
  assert.equal(checkout.status,503);
});
