import { countries, availableMeals, createPlan as createBasePlan, validateConfig } from './menus.js';
import { foodData } from './nutrition-data.js';

export { countries };
export const goals = { gain:'Ganar músculo', cut:'Definir', maintain:'Mantener' };
export const gymMealLabels = { breakfast:'Desayuno', lunch:'Comida', snack:'Merienda', dinner:'Cena' };
const foodById = Object.fromEntries(foodData.map(food => [food.fdcId, food]));
const normalize = text => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
const definition = (id, group, state, proxy = false) => ({ id, group, state, proxy });

export function identifyIngredient(name) {
  const n = normalize(name);
  if (/aceite|mantequilla/.test(n)) return definition(171413,'Aceites y despensa','para cocinar', !/oliva/.test(n));
  if (/\bpollo\b/.test(n)) return definition(171477,'Proteínas y lácteos','cocido, sin piel');
  if (/\b(?:carne|res)\b/.test(n)) return definition(168649,'Proteínas y lácteos','cocida, corte magro');
  if (/atun/.test(n)) return definition(173709,'Proteínas y lácteos','escurrido');
  if (/pescado|merluza/.test(n)) return definition(175177,'Proteínas y lácteos','cocido; equivalencia de pescado blanco',true);
  if (/tofu/.test(n)) return definition(172475,'Proteínas y lácteos','antes de cocinar');
  if (/huevo/.test(n)) return definition(171287,'Proteínas y lácteos','sin cáscara, antes de cocinar');
  if (/yogur/.test(n)) return definition(170894,'Proteínas y lácteos','natural, sin grasa, alto en proteína',true);
  if (/queso/.test(n)) return definition(172223,'Proteínas y lácteos','fresco',!/fresco/.test(n));
  if (/leche/.test(n)) return definition(170872,'Proteínas y lácteos','leche al 1 % de grasa',!/leche$/.test(n));
  if (/porotos verdes|judias verdes|arvejas|chicharos/.test(n)) return definition(169967,'Frutas y verduras','cocido; equivalencia vegetal',true);
  if (/garbanz/.test(n)) return definition(173757,'Legumbres','cocidos');
  if (/lentej/.test(n)) return definition(172421,'Legumbres','cocidas');
  if (/frij|habich|poroto|caraota|guand|gandul|haba|alubia/.test(n)) return definition(173735,'Legumbres','cocidas; equivalencia de frijol',!/negro/.test(n));
  if (/casabe/.test(n)) return definition(2709566,'Cereales y tubérculos','listo para comer; equivalencia de casabe',true);
  if (/almidon|mandioca/.test(n)) return definition(169717,'Cereales y tubérculos','en seco; equivalencia de almidón',true);
  if (/arepa|harina de maiz/.test(n)) return definition(169750,'Cereales y tubérculos','harina en seco; añade agua a la masa',true);
  if (/tortilla de trigo/.test(n)) return definition(167535,'Cereales y tubérculos','lista para cocinar');
  if (/tortilla de maiz/.test(n)) return definition(175036,'Cereales y tubérculos','lista para cocinar');
  if (/pan/.test(n)) return definition(172688,'Cereales y tubérculos','listo para comer; pan integral',!/integral/.test(n));
  if (/avena/.test(n)) return definition(173904,'Cereales y tubérculos','en seco');
  if (/arroz/.test(n)) return definition(168878,'Cereales y tubérculos','cocido');
  if (/quinua|quinoa/.test(n)) return definition(168917,'Cereales y tubérculos','cocida');
  if (/mote|maiz blanco/.test(n)) return definition(169701,'Cereales y tubérculos','cocido y escurrido; equivalencia de mote',true);
  if (/maiz|choclo/.test(n)) return definition(169999,'Cereales y tubérculos','cocido');
  if (/\bpapa\b|patata/.test(n)) return definition(170440,'Cereales y tubérculos','cocida');
  if (/yuca/.test(n)) return definition(169985,'Cereales y tubérculos','pelada, antes de cocinar');
  if (/name/.test(n)) return definition(170072,'Cereales y tubérculos','cocido');
  if (/batata/.test(n)) return definition(168483,'Cereales y tubérculos','al horno');
  if (/platano verde/.test(n)) return definition(168216,'Cereales y tubérculos','cocido, sin piel');
  if (/platano maduro/.test(n)) return definition(169131,'Cereales y tubérculos','al horno, sin piel');
  if (/platano|banana/.test(n)) return definition(173944,'Frutas y verduras','sin piel');
  if (/aguacate|palta/.test(n)) return definition(171705,'Frutas y verduras','sin piel ni hueso');
  if (/lechosa|papaya/.test(n)) return definition(169926,'Frutas y verduras','sin piel ni semillas');
  if (/guayaba/.test(n)) return definition(173044,'Frutas y verduras','parte comestible');
  if (/naranja/.test(n)) return definition(169097,'Frutas y verduras','sin piel');
  if (/manzana/.test(n)) return definition(171688,'Frutas y verduras','sin corazón');
  if (/cacahu|pepitoria/.test(n)) return definition(173806,'Aceites y despensa','semillas tostadas',!/cacahu/.test(n));
  if (/ajonjoli|sesamo/.test(n)) return definition(170150,'Aceites y despensa','semillas');
  if (/zapallo|auyama|calabaza/.test(n)) return definition(168449,'Frutas y verduras','cocida');
  if (/cebolla/.test(n)) return definition(170000,'Frutas y verduras','antes de cocinar');
  if (/zanahoria/.test(n)) return definition(170394,'Frutas y verduras','cocida');
  if (/espinaca/.test(n)) return definition(168463,'Frutas y verduras','cocida');
  if (/pimiento|chile dulce/.test(n)) return definition(170108,'Frutas y verduras','antes de cocinar');
  if (/calabacin/.test(n)) return definition(169292,'Frutas y verduras','cocido');
  if (/ajo|cilantro|culantro|albahaca|canela|achiote|chile|chipotle|pimenton|guascas|limon|vinagre/.test(n)) return definition(170457,'Aceites y despensa','condimento; equivalencia aproximada',true);
  return definition(170457,'Frutas y verduras','parte comestible; equivalencia vegetal',!/tomate/.test(n));
}

export function validateGymConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Completa tus preferencias.');
  const allowed = ['country','style','days','goal','training','portion','weight','adult'];
  if (Object.keys(input).some(k=>!allowed.includes(k))) throw new Error('Hay una opción desconocida.');
  const base = validateConfig({country:input.country,style:input.style,days:input.days});
  if (!Object.hasOwn(goals,input.goal)) throw new Error('Elige tu objetivo.');
  if (!Number.isInteger(input.training) || input.training<1 || input.training>6) throw new Error('Elige entre 1 y 6 días de entrenamiento.');
  if (!['auto','small','standard','large'].includes(input.portion)) throw new Error('Elige un tamaño de porciones.');
  if (input.adult !== true) throw new Error('Este creador de planes está destinado a mayores de 18 años.');
  const weight = input.weight ?? null;
  if (weight !== null && (!Number.isFinite(weight) || weight<45 || weight>160)) throw new Error('Introduce un peso entre 45 y 160 kg, o deja el campo vacío.');
  return {...base,goal:input.goal,training:input.training,portion:input.portion,weight,adult:true};
}

export function portionFactor(config) {
  if (config.portion !== 'auto') return {small:.8,standard:1,large:1.2}[config.portion];
  return {cut:.8,maintain:1,gain:1.2}[config.goal];
}

export function ingredientTotals(items) {
  const totals = {kcal:0,protein:0,carbs:0,fat:0};
  for (const item of items) {
    const food = foodById[item.foodId];
    if (!food || !Number.isFinite(item.grams) || item.grams<=0) throw new Error('No se pudo estimar un ingrediente.');
    const fraction = item.grams/100;
    totals.kcal += food.kcal*fraction;
    totals.protein += food.proteinG*fraction;
    totals.carbs += food.carbsG*fraction;
    totals.fat += food.fatG*fraction;
  }
  return totals;
}

function quantifiedRecipe(recipe,type,config) {
  const identified = recipe.ingredients.map(original=>{
    const name=/crema/i.test(original)?'Yogur griego natural (en lugar de crema)':/mantequilla/i.test(original)?'Aceite de oliva (en lugar de mantequilla)':/leche o/i.test(original)?'Leche al 1 % de grasa':/^arepa/i.test(original)?'Harina de maíz (para preparar la arepa)':original;
    return {name,...identifyIngredient(name)};
  });
  const starches = identified.filter(i=>i.group==='Cereales y tubérculos').length || 1;
  const vegetables = identified.filter(i=>i.group==='Frutas y verduras' && ![171705,173944,169926,173044,169097,171688].includes(i.id)).length || 1;
  const hasMeat = identified.some(i=>[171477,168649,175177,173709,172475].includes(i.id));
  const factor = portionFactor(config);
  const portions = identified.map(item=>{
    let grams = 0;
    if (item.group==='Cereales y tubérculos') {
      const dry = [173904,169750,169717,2709566,172688].includes(item.id);
      grams = (dry ? (type==='snack'?35:type==='breakfast'?65:75) : (type==='breakfast'?180:240))/starches*factor;
      if ([175036,167535].includes(item.id)) grams = 100/starches*factor;
    } else if ([171477,168649,175177,173709,172475].includes(item.id)) grams=130;
    else if ([173424,171287].includes(item.id)) grams=hasMeat?50:100;
    else if (item.id===172223) grams=50;
    else if (item.id===170872) grams=180;
    else if (item.id===170894) grams=200;
    else if (item.group==='Legumbres') grams=hasMeat?110:200;
    else if (item.id===171705) grams=60;
    else if ([173944,169926,173044,169097,171688].includes(item.id)) grams=150;
    else if (item.id===171413) grams=7*factor;
    else if ([173806,170150].includes(item.id)) grams=20;
    else if (item.group==='Aceites y despensa') grams=/ajo/i.test(item.name)?3:5;
    else grams=Math.max(30,210/vegetables);
    grams=Math.max(1,Math.round(grams));
    return {name:item.name,foodId:item.id,group:item.group,state:item.state,proxy:item.proxy,grams};
  });
  const before = ingredientTotals(portions);
  let extra = '';
  if (type!=='snack' && before.protein < 25) {
    const yogurt = portions.find(i=>i.foodId===170894);
    const sideGrams = Math.min(200,Math.max(yogurt?10:100,Math.ceil((25-before.protein)/.1019/10)*10));
    if (yogurt) yogurt.grams += sideGrams;
    else portions.push({name:'Yogur griego natural (acompañamiento)',foodId:170894,group:'Proteínas y lácteos',state:'natural, sin grasa',proxy:false,grams:sideGrams});
    extra = ' Sirve el yogur como acompañamiento separado.';
  }
  let preparation=recipe.preparation.replace(/crema/gi,'yogur natural').replace(/mantequilla/gi,'aceite de oliva');
  if(recipe.ingredients.some(name=>/^arepa/i.test(name)))preparation='Mezcla la harina de maíz con agua, forma la arepa y cocínala completamente en una sartén antiadherente. '+preparation.replace(/calienta la arepa/gi,'Sirve la arepa cocinada');
  return {title:recipe.title,vegetarian:recipe.vegetarian,preparation:preparation+extra,ingredients:portions,nutrition:ingredientTotals(portions),scale:1};
}

const snacks = [
  {title:'Yogur con banana y avena',ingredients:['Yogur natural alto en proteína','Banana','Avena'],vegetarian:true,preparation:'Mezcla el yogur con la banana y la avena hidratada.'},
  {title:'Yogur con manzana y cacahuete',ingredients:['Yogur natural alto en proteína','Manzana','Cacahuete'],vegetarian:true,preparation:'Sirve el yogur con manzana troceada y cacahuetes tostados.'},
  {title:'Yogur con lechosa y avena',ingredients:['Yogur natural alto en proteína','Lechosa','Avena'],vegetarian:true,preparation:'Mezcla yogur, lechosa en dados y avena hidratada.'},
];

export function createGymPlan(input,seed=0) {
  const config = validateGymConfig(input);
  const base = createBasePlan({country:config.country,style:config.style,days:config.days},seed);
  const trainingDays = new Set(Array.from({length:config.training},(_,i)=>Math.floor(i*7/config.training)));
  const days = base.days.map((day,index)=>({day:day.day,training:trainingDays.has(index%7),meals:{
    breakfast:quantifiedRecipe(day.meals.breakfast,'breakfast',config),
    lunch:quantifiedRecipe(day.meals.lunch,'lunch',config),
    snack:quantifiedRecipe(snacks[(index+seed)%snacks.length],'snack',config),
    dinner:quantifiedRecipe(day.meals.dinner,'dinner',config),
  }}));
  return {config:{...config,weight:null},countryName:base.countryName,goal:goals[config.goal],days,seed,version:2};
}

export function dayTotals(day) {
  return Object.values(day.meals).reduce((total,meal)=>{
    for(const key of Object.keys(total)) total[key] += meal.nutrition[key];
    return total;
  },{kcal:0,protein:0,carbs:0,fat:0});
}

export function scaleMeal(meal,delta) {
  const nextScale = Math.round((meal.scale+delta)*100)/100;
  if (nextScale<.75 || nextScale>1.5) return meal;
  const baseIngredients=meal.baseIngredients||meal.ingredients;
  const next = {...meal,baseIngredients,scale:nextScale,ingredients:baseIngredients.map(i=>({...i,grams:Math.max(1,Math.round(i.grams*nextScale))}))};
  next.nutrition=ingredientTotals(next.ingredients);
  return next;
}

export function swapMeal(plan,dayIndex,type,offset=1) {
  if (!Number.isInteger(dayIndex) || !plan.days[dayIndex] || !Object.hasOwn(gymMealLabels,type)) throw new Error('No encontramos esa comida.');
  const current = plan.days[dayIndex].meals[type];
  const choices = type==='snack'?snacks:availableMeals(plan.config.country,plan.config.style,type);
  const currentIndex=choices.findIndex(m=>m.title===current.title);
  const choice=choices[(Math.max(0,currentIndex)+offset)%choices.length];
  plan.days[dayIndex].meals[type]=quantifiedRecipe(choice,type,plan.config);
  return plan.days[dayIndex].meals[type];
}

// Checkout sends only whitelisted recipe choices. Nutrients and quantities are rebuilt on the server.
export function planSelections(plan) {
  return plan.days.map(day=>Object.fromEntries(Object.entries(day.meals).map(([type,meal])=>[type,{title:meal.title,scale:meal.scale}])));
}

export function applyPlanSelections(config,seed,selections) {
  const plan=createGymPlan(config,seed);
  if(!Array.isArray(selections)||selections.length!==plan.days.length) throw new Error('El menú no coincide con la duración elegida.');
  for(const [index,day] of selections.entries()) {
    if(!day||typeof day!=='object'||Array.isArray(day)||Object.keys(day).length!==4) throw new Error('El menú debe incluir cuatro comidas al día.');
    for(const type of Object.keys(gymMealLabels)) {
      const selection=day[type];
      if(!selection||typeof selection!=='object'||Array.isArray(selection)||Object.keys(selection).sort().join(',')!=='scale,title'||![.75,1,1.25,1.5].includes(selection.scale)) throw new Error('Hay una porción no válida.');
      const choices=type==='snack'?snacks:availableMeals(plan.config.country,plan.config.style,type);
      const recipe=choices.find(item=>item.title===selection.title);
      if(!recipe) throw new Error('Hay un plato que no corresponde al país o alimentación elegidos.');
      const meal=quantifiedRecipe(recipe,type,plan.config);
      plan.days[index].meals[type]=selection.scale===1?meal:scaleMeal(meal,selection.scale-1);
    }
  }
  return plan;
}

export function shoppingList(plan) {
  const amounts = new Map();
  for(const day of plan.days) for(const meal of Object.values(day.meals)) for(const item of meal.ingredients) {
    const name=item.name.replace(/\s*\(acompañamiento\)/g,'').trim();
    const key=normalize(name)+'|'+item.state;
    const existing=amounts.get(key);
    if(existing) existing.grams += item.grams;
    else amounts.set(key,{...item,name,key});
  }
  return [...amounts.values()].sort((a,b)=>a.group.localeCompare(b.group,'es')||a.name.localeCompare(b.name,'es'));
}

export function gymPlanText(plan,confirmed=false) {
  const lines=['QUISKETT GYM · TU CULTURA TAMBIÉN ENTRENA',confirmed?'PLAN CONFIRMADO':'PLAN DE PRUEBA',`${plan.countryName} · ${plan.goal} · ${plan.days.length} días`,plan.config.style==='vegetarian'?'Vegetariana (incluye huevos y lácteos)':'Alimentación variada',''];
  for(const day of plan.days) {
    const n=dayTotals(day);
    lines.push(`DÍA ${day.day} · ${day.training?'Entrenamiento':'Descanso'} · ≈ ${Math.round(n.kcal)} kcal · ${Math.round(n.protein)} g proteína`,'');
    for(const [type,meal] of Object.entries(day.meals)) {
      lines.push(`${gymMealLabels[type].toUpperCase()} · ${meal.title}`,`≈ ${Math.round(meal.nutrition.kcal)} kcal · ${Math.round(meal.nutrition.protein)} g proteína · ${Math.round(meal.nutrition.carbs)} g carbohidratos · ${Math.round(meal.nutrition.fat)} g grasa`);
      for(const item of meal.ingredients) lines.push(`- ${item.name}: ${item.grams} g (${item.state}${item.proxy?'; equivalencia aproximada':''})`);
      lines.push(`Preparación: ${meal.preparation}`,'');
    }
  }
  lines.push('LISTA DE COMPRA (PESOS DE RECETA, CONSULTA EL ESTADO)');
  shoppingList(plan).forEach(i=>lines.push(`- ${i.name}: ${i.grams} g (${i.state})`));
  lines.push('','Valores estimados de tablas USDA y equivalencias genéricas. Marcas, preparación y porciones varían. Cambiar porciones no garantiza un déficit o superávit. Plan orientativo para adultos sanos; no sustituye un plan nutricional individual.');
  return lines.join('\n');
}
