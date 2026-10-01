import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPayments, PaymentError } from '../server/payments.mjs';

const root=fileURLToPath(new URL('../dist',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.md':'text/plain; charset=utf-8'};
async function body(req){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>65536)throw new PaymentError('Solicitud demasiado grande.',413);chunks.push(chunk);}
  return Buffer.concat(chunks);
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
export function createServer(env=process.env,paymentOptions){
  const payments=createPayments(env,paymentOptions),attempts=new Map();
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname.startsWith('/api/')){
        if(req.method==='GET'&&pathname==='/api/config'){payments.initializeOwner(req,res);return json(res,200,{paymentMode:payments.mode,stripeTestMode:payments.mode==='stripe'&&!payments.live});}
        if(req.method==='POST'&&pathname==='/api/checkout-sessions'){
          const ip=req.socket.remoteAddress,now=Date.now(),current=attempts.get(ip);
          if(!current||now-current.start>60000){if(attempts.size>1000)attempts.clear();attempts.set(ip,{start:now,count:1});}
          else if(++current.count>15)throw new PaymentError('Espera un minuto antes de reintentar.',429);
          if(!(req.headers['content-type']||'').startsWith('application/json'))throw new PaymentError('Envía una solicitud JSON.',415);
          let input;try{input=JSON.parse((await body(req)).toString('utf8'));}catch(error){if(error instanceof PaymentError)throw error;throw new PaymentError('El JSON no es válido.');}
          return json(res,200,await payments.checkout(req,res,input));
        }
        if(req.method==='GET'&&/^\/api\/orders\/[^/]+$/.test(pathname))return json(res,200,await payments.getOrder(req,res,pathname.split('/').at(-1)));
        if(req.method==='POST'&&pathname==='/api/stripe/webhook')return json(res,200,await payments.webhook(await body(req),req.headers['stripe-signature']));
        return json(res,404,{error:'Ruta no encontrada.'});
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
      const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
      if(!file.startsWith(root+path.sep))throw new PaymentError('Ruta no permitida.',403);
      if(!(await stat(file)).isFile())throw new PaymentError('Archivo no encontrado.',404);
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
      res.end(req.method==='HEAD'?undefined:await readFile(file));
    }catch(error){json(res,error instanceof PaymentError?error.status:error.code==='ENOENT'?404:500,{error:error instanceof PaymentError?error.message:error.code==='ENOENT'?'Archivo no encontrado.':'No se pudo completar la solicitud. Reintenta más tarde.'});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
  createServer().listen(port,host,()=>console.log('Quiskett: http://'+host+':'+port+'/'));
}
