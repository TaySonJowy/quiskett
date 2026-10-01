import { randomUUID, randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { validateGymConfig, applyPlanSelections } from '../dist/gym.js';

const uuid = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const digest = value => createHash('sha256').update(value).digest('hex');
export class PaymentError extends Error { constructor(message,status=400){super(message);this.status=status;} }

// Atomic writes and a single-process mutex. Use a database before running multiple server instances.
export class OrderStore {
  constructor(file){this.file=file;this.queue=Promise.resolve();this.orders=null;}
  async transaction(work){
    const run=this.queue.then(async()=>{
      if(!this.orders){try{this.orders=JSON.parse(await readFile(this.file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;this.orders=[];}}
      const before=structuredClone(this.orders);
      try{return await work(this.orders,async()=>{
        await mkdir(path.dirname(this.file),{recursive:true});
        await writeFile(this.file+'.tmp',JSON.stringify(this.orders),{mode:0o600});
        await rename(this.file+'.tmp',this.file);
      });}catch(error){this.orders=before;throw error;}
    });
    this.queue=run.catch(()=>{});return run;
  }
}

export function validateCheckout(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='config,requestId,seed,selections')throw new PaymentError('Solicitud de pago no válida.');
  if(!uuid.test(input.requestId)||!Number.isSafeInteger(input.seed)||input.seed<0||input.seed>1000000)throw new PaymentError('Identificador de solicitud no válido.');
  let config,plan;
  try{config=validateGymConfig(input.config);if(config.weight!==null)throw new Error('No envíes el peso al pago.');plan=applyPlanSelections(config,input.seed,input.selections);}catch(error){throw new PaymentError(error.message);}
  return {requestId:input.requestId,config:{...config,weight:null},seed:input.seed,selections:input.selections,plan};
}

export function verifySignature(raw,header,secret,now=Math.floor(Date.now()/1000)){
  if(!header||!secret)return false;
  const parts=header.split(',').map(item=>item.split('='));
  const timestamp=Number(parts.find(([key])=>key==='t')?.[1]);
  if(!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp)>300)return false;
  const expected=createHmac('sha256',secret).update(String(timestamp)+'.').update(raw).digest();
  return parts.some(([key,value])=>key==='v1'&&/^[a-f\d]{64}$/i.test(value||'')&&timingSafeEqual(expected,Buffer.from(value,'hex')));
}

export function verifyPaidSession(session,order,live){
  const lines=session.line_items?.data;
  return session.id===order.sessionId&&session.mode==='payment'&&session.status==='complete'&&session.payment_status==='paid'&&session.currency==='eur'&&session.amount_total===50&&session.livemode===live&&session.client_reference_id===order.id&&session.metadata?.order_id===order.id&&Array.isArray(lines)&&lines.length===1&&!session.line_items.has_more&&lines[0].quantity===1&&lines[0].amount_total===50&&lines[0].currency==='eur'&&lines[0].price?.unit_amount===50&&lines[0].price?.currency==='eur'&&lines[0].price?.product===order.productId;
}

export function createPayments(env=process.env,{fetchFn=fetch,store=new OrderStore(path.resolve(env.DATA_DIR||'data','orders.json'))}={}){
  const enabled=env.PAYMENTS_ENABLED==='true';
  const key=env.STRIPE_SECRET_KEY||'',webhookSecret=env.STRIPE_WEBHOOK_SECRET||'';
  let origin;
  if(enabled){
    if(!/^sk_(test|live)_/.test(key)||!webhookSecret.startsWith('whsec_'))throw new Error('Configura las claves privadas de Stripe para activar pagos.');
    const publicUrl=new URL(env.PUBLIC_ORIGIN||'');
    const localTest=key.startsWith('sk_test_')&&['localhost','127.0.0.1'].includes(publicUrl.hostname)&&publicUrl.protocol==='http:';
    if((publicUrl.protocol!=='https:'&&!localTest)||publicUrl.username||publicUrl.password||publicUrl.pathname!=='/'||publicUrl.search||publicUrl.hash)throw new Error('PUBLIC_ORIGIN debe ser el origen HTTPS del servidor.');
    origin=publicUrl.origin;
  }
  const live=key.startsWith('sk_live_');
  const cookieName=live?'__Host-quiskett-owner':'quiskett-owner';
  const secure=origin?.startsWith('https:');
  const mode=enabled?'stripe':'demo';
  async function stripe(endpoint,body,idempotency){
    let response;
    try{response=await fetchFn('https://api.stripe.com/v1/'+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},...(body?{body}:{}),signal:AbortSignal.timeout(15000)});}catch{throw new PaymentError('Stripe no respondió. Reintenta el mismo pago; no se ha confirmado ningún cobro.',502);}
    const data=await response.json();
    if(!response.ok)throw new PaymentError('No se pudo completar la solicitud de pago con Stripe.',502);
    return data;
  }
  function owner(req,res,create=false){
    const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if(value&&/^[a-f\d]{64}$/.test(value))return digest(value);
    if(!create)throw new PaymentError('Esta compra pertenece a otra sesión o tu sesión ha caducado.',403);
    const token=randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure?'; Secure':''}`);
    return digest(token);
  }
  const verificationTasks=new Map(),checkoutTasks=new Map(),checkedAt=new Map();
  async function verifyOrder(order,force=false){
    if(order.status==='ready'||!order.sessionId)return order;
    if(verificationTasks.has(order.id))return verificationTasks.get(order.id);
    if(!force&&Date.now()-(checkedAt.get(order.id)||0)<3000)return order;
    const task=(async()=>{
      const session=await stripe('checkout/sessions/'+encodeURIComponent(order.sessionId)+'?expand[]=line_items');
      let status=session.status==='expired'?'expired':'pending';
      if(session.payment_status==='paid'){
        if(!verifyPaidSession(session,order,live))throw new PaymentError('El pago no coincide con este pedido. No se ha entregado el plan.',409);
        status='ready';
      }
      const result=await store.transaction(async(orders,save)=>{
        const current=orders.find(item=>item.id===order.id&&item.sessionId===order.sessionId);
        if(!current)throw new PaymentError('Pedido no encontrado.',404);
        if(current.status!=='ready'){current.status=status;if(status==='ready')current.paidAt=new Date().toISOString();await save();}
        return structuredClone(current);
      });
      checkedAt.set(order.id,Date.now());return result;
    })();
    verificationTasks.set(order.id,task);
    try{return await task;}finally{verificationTasks.delete(order.id);}
  }
  async function checkout(req,res,input){
    if(!enabled)throw new PaymentError('Los pagos reales todavía no están activados.',503);
    if(req.headers.origin!==origin)throw new PaymentError('Origen de pago no autorizado.',403);
    const valid=validateCheckout(input),ownerHash=owner(req,res,true);
    const fingerprint=digest(JSON.stringify({config:valid.config,seed:valid.seed,selections:valid.selections}));
    const order=await store.transaction(async(orders,save)=>{
      let current=orders.find(item=>item.owner===ownerHash&&item.requestId===valid.requestId);
      if(current&&current.fingerprint!==fingerprint)throw new PaymentError('La solicitud ya pertenece a otro menú.',409);
      if(!current){current={id:randomUUID(),requestId:valid.requestId,owner:ownerHash,fingerprint,config:valid.config,seed:valid.seed,plan:valid.plan,status:'created',createdAt:new Date().toISOString()};orders.push(current);await save();}
      return structuredClone(current);
    });
    if(order.status==='ready')return {orderId:order.id,status:'ready'};
    if(order.checkoutUrl){
      if(order.expiresAt>Date.now()/1000)return {orderId:order.id,checkoutUrl:order.checkoutUrl};
      const verified=await verifyOrder(order,true);
      if(verified.status==='ready')return {orderId:order.id,status:'ready'};
      throw new PaymentError('La sesión de pago ha caducado. Vuelve a confirmar el plan para iniciar una nueva.',410);
    }
    if(checkoutTasks.has(order.id))return checkoutTasks.get(order.id);
    const task=(async()=>{
      const params=new URLSearchParams({mode:'payment','payment_method_types[0]':'card',client_reference_id:order.id,'metadata[order_id]':order.id,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':'50','line_items[0][price_data][product_data][name]':'Plan Quiskett Gym',success_url:origin+'/?checkout=success&order='+order.id+'#/listo',cancel_url:origin+'/?checkout=cancelled&order='+order.id+'#/pago'});
      const session=await stripe('checkout/sessions',params,'quiskett-'+order.id);
      let url;try{url=new URL(session.url);}catch{throw new PaymentError('Stripe no devolvió una dirección de pago.',502);}
      if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||!session.id)throw new PaymentError('La dirección de Stripe no es válida.',502);
      const detail=await stripe('checkout/sessions/'+encodeURIComponent(session.id)+'?expand[]=line_items');
      const item=detail.line_items?.data?.[0];
      if(detail.amount_total!==50||detail.currency!=='eur'||detail.line_items?.data?.length!==1||item?.quantity!==1||item?.price?.unit_amount!==50||typeof item?.price?.product!=='string')throw new PaymentError('El importe de Stripe no coincide con el pedido.',502);
      await store.transaction(async(orders,save)=>{
        const current=orders.find(item=>item.id===order.id);
        current.sessionId=session.id;current.checkoutUrl=url.href;current.expiresAt=session.expires_at||0;current.status='pending';current.productId=item.price.product;await save();
      });
      return {orderId:order.id,checkoutUrl:url.href};
    })();
    checkoutTasks.set(order.id,task);
    try{return await task;}finally{checkoutTasks.delete(order.id);}
  }
  async function getOrder(req,res,id){
    if(!enabled)throw new PaymentError('Pago no disponible.',503);
    if(!uuid.test(id))throw new PaymentError('Pedido no encontrado.',404);
    const ownerHash=owner(req,res);
    const order=await store.transaction(orders=>{
      const current=orders.find(item=>item.id===id&&item.owner===ownerHash);
      if(!current)throw new PaymentError('Pedido no encontrado en esta sesión.',404);
      return structuredClone(current);
    });
    const result=await verifyOrder(order);
    return {status:result.status,...(result.status==='ready'?{plan:result.plan}:{preview:result.plan})};
  }
  async function webhook(raw,signature){
    if(!enabled||!verifySignature(raw,signature,webhookSecret))throw new PaymentError('Firma del evento no válida.',400);
    let event;try{event=JSON.parse(raw.toString('utf8'));}catch{throw new PaymentError('Evento no válido.',400);}
    if(event.type!=='checkout.session.completed')return {received:true};
    if(event.livemode!==live)throw new PaymentError('El evento pertenece a otro modo de Stripe.',400);
    const session=event.data?.object;
    const order=await store.transaction(orders=>{
      const current=orders.find(item=>item.id===session?.metadata?.order_id&&item.sessionId===session.id);
      if(!current)throw new PaymentError('Pedido no encontrado para este evento.',409);
      return structuredClone(current);
    });
    await verifyOrder(order,true);return {received:true};
  }
  return {mode,live,checkout,getOrder,webhook,initializeOwner:(req,res)=>{if(enabled)owner(req,res,true);}};
}
