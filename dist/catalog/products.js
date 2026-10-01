export const stores = [
  {id:'dia',name:'DIA',url:'https://www.dia.es',host:'www.dia.es',mode:'html',detail:'Fichas públicas, sin código postal confirmado.'},
  {id:'caprabo',name:'Caprabo',url:'https://www.capraboacasa.com',host:'www.capraboacasa.com',mode:'html',detail:'Fichas públicas; tienda observada 8284, ubicación sin confirmar.'},
  {id:'mercadona',name:'Mercadona',url:'https://tienda.mercadona.es',host:'tienda.mercadona.es',mode:'disabled',detail:'Pendiente de una fuente autorizada. La página pública no expone precios y robots.txt restringe /api.'},
  {id:'consum',name:'Consum',url:'https://tienda.consum.es',host:'tienda.consum.es',mode:'disabled',detail:'Sin actualización automática. Acceso por navegador rechazado; la ficha HTML no ofrece un precio extraíble.'},
  {id:'carrefour',name:'Carrefour',url:'https://www.carrefour.es',host:'www.carrefour.es',mode:'disabled',detail:'Acceso público devolvió HTTP 403. Pendiente de una fuente autorizada.'}
];
// Lista editorial de productos concretos. No búsquedas masivas ni APIs privadas.
const dia = (id,key,path,title) => ({storeId:'dia',id,key,url:'https://www.dia.es/'+path+'/p/'+id,title});
const cap = (id,key,slug,title) => ({storeId:'caprabo',id,key,url:'https://www.capraboacasa.com/es/productdetail/'+id+'-'+slug+'/',title});
export const products = [
  dia('21415','rice','arroz-pastas-y-legumbres/arroz','arroz'),
  dia('105429','oats','galletas-cereales-y-mermeladas/cereales-integrales-y-muesli','avena'),
  dia('261354','chicken','carnes/pollo','pollo'),
  dia('112529','oliveOil','aceites-salsas-y-especias/aceites','aceite de oliva virgen extra'),
  dia('77561','chickpeaDry','arroz-pastas-y-legumbres/garbanzos-y-alubias','garbanzos'),
  cap('19230572','chicken','pechugas-enteras-pollo-formato-ahorro-xxl-eroski-bandeja-aprox-950-g','pechugas'),
  cap('19230580','chicken','pechuga-de-pollo-fileteada-extrafina-eroski-bandeja-aprox-450-g','pechuga'),
  cap('10914109','oats','copos-de-avena-d-radisson-bolsa-500-g','avena'),
  cap('9160615','rice','arroz-basmati-eroski-paquete-1-kg','arroz basmati'),
  cap('14382832','banana','banana-al-peso-compra-minima-1-kg','banana'),
  cap('23842743','apple','manzana-golden-al-peso-compra-minima-1-kg','manzana'),
  cap('18374611','avocado','aguacate-maduro-al-peso-compra-minima-500-g','aguacate'),
  cap('23760622','orange','naranja-eroski-malla-3-kg','naranja'),
  cap('11653490','potato','patata-patnatur-bolsa-3-kg','patata'),
  cap('1934785','onion','cebolla-blanca-buti-eroski-malla-1-kg','cebolla blanca'),
  cap('9195637','broccoli','brocoli-pieza-500-g','brocoli'),
  cap('26794008','pepper','pimiento-lamuyo-rojo-al-peso-compra-minima-500-g','pimiento'),
  cap('26201855','garlic','ajo-malla-250-g','ajo'),
  cap('62216','tomato','tomate-en-rama-al-peso-compra-minima-600-g','tomate'),
  cap('179481','sweetPotato','boniato-al-peso-compra-minima-1-kg','boniato'),
  cap('4501508','carrot','zanahoria-eroski-bolsa-1-kg','zanahoria'),
  cap('19548627','eggs','huevo-fresco-m-suelo-cataluna-eroski-carton-1-docena','huevo fresco m'),
  cap('371658','oliveOil','aceite-de-oliva-virgen-extra-eroski-botella-1-litro','aceite de oliva virgen extra'),
  cap('25946740','chickpeaDry','garbanzo-extra-eroski-paquete-500-g','garbanzo'),
  cap('25948381','lentilDry','lenteja-pardina-eroski-paquete-1-kg','lenteja'),
  cap('25946732','whiteBeanDry','alubia-blanca-larga-eroski-paquete-500-g','alubia blanca'),
  cap('22316962','proteinDairy','natural-yopro-pack-2x160-g','natural yopro')
];

const normalized=s=>String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim();
export function expectedUnit(key){return key==='eggs'?'unit':key==='oliveOil'?'ml':'g';}
export function expectedProduct(entry,name,pack){
  const n=normalized(name);
  if(!n.includes(normalized(entry.title))||pack.unit!==expectedUnit(entry.key))return false;
  if(entry.key==='chicken'&&/muslo|con hueso|con piel|empanad|marinad|nugget|croquet|rellen/.test(n))return false;
  if(['rice','oats','chickpeaDry','lentilDry','whiteBeanDry'].includes(entry.key)&&/cocid|conserva|tarro|bote|preparad|con salsa/.test(n))return false;
  if(entry.key==='proteinDairy'&&/fresa|vainilla|cacao|stracciatella|chocolate|azucarado/.test(n))return false;
  return true;
}
