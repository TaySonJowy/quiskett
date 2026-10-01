import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {refreshCatalog} from '../server/catalog/refresh.mjs';
import {stores} from '../server/catalog/manifest.mjs';
import {validateCatalog} from '../dist/prices.js';

const target=fileURLToPath(new URL('../dist/catalog/prices.json',import.meta.url));
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--strict'&&!/^--store=(?:all|dia|caprabo)$/.test(arg))||args.filter(arg=>arg.startsWith('--store=')).length>1)throw new Error('Uso: npm run prices:refresh -- [--strict] [--store=all|dia|caprabo]');
const selected=args.find(arg=>arg.startsWith('--store='))?.slice(8)||'all',storeIds=selected==='all'?stores.map(s=>s.id):[selected];
let previous={products:[]};
try{previous=validateCatalog(JSON.parse(await readFile(target,'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
const catalog=await refreshCatalog(previous,{storeIds,onProgress:p=>console.log(p.store+'/'+p.id+': '+(p.status==='ok'?p.priceCents/100+' EUR · '+p.name:p.message))});
validateCatalog(catalog);
await mkdir(path.dirname(target),{recursive:true});
await writeFile(target+'.tmp',JSON.stringify(catalog,null,2)+'\n');
await rename(target+'.tmp',target);
console.log('Catálogo guardado. Barcelona 08001 es una zona de referencia; los precios públicos no confirman cobertura local.');
for(const s of catalog.stores)console.log(s.name+': '+s.successful+' actualizados · '+s.status);
if(args.includes('--strict')&&catalog.stores.some(s=>storeIds.includes(s.id)&&s.mode==='html'&&(s.status!=='ok'||s.successful===0)))process.exitCode=1;
