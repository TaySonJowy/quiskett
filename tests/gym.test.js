import test from 'node:test';
import assert from 'node:assert/strict';
import { countries,createGymPlan,dayTotals,ingredientTotals,scaleMeal,swapMeal,shoppingList,gymPlanText,planSelections,applyPlanSelections,identifyIngredient } from '../dist/gym.js';
const config={country:'do',style:'all',days:7,goal:'gain',training:4,portion:'auto',weight:null,adult:true};

test('21 países: objetivos, duraciones y opciones vegetarianas generan cuatro comidas cuantificadas',()=>{
  assert.equal(Object.keys(countries).length,21);
  for(const country of Object.keys(countries))for(const goal of ['gain','cut','maintain'])for(const style of ['all','vegetarian'])for(const days of [3,7]){
    const plan=createGymPlan({...config,country,goal,style,days},2);
    assert.equal(plan.days.length,days);
    for(const day of plan.days){
      assert.deepEqual(Object.keys(day.meals),['breakfast','lunch','snack','dinner']);
      for(const meal of Object.values(day.meals)){
        assert.ok(meal.title&&meal.preparation&&meal.ingredients.length>=3);
        assert.deepEqual(meal.nutrition,ingredientTotals(meal.ingredients));
        for(const value of Object.values(meal.nutrition))assert.ok(Number.isFinite(value)&&value>0);
        for(const item of meal.ingredients)assert.ok(item.grams>0&&item.state&&item.foodId);
        if(style==='vegetarian'){
          assert.equal(meal.vegetarian,true);
          assert.doesNotMatch(meal.ingredients.map(i=>i.name).join(' '),/\b(pollo|res|carne|atún|pescado|merluza|cerdo|jamón)\b/i);
        }
      }
      assert.equal(dayTotals(day).kcal,Object.values(day.meals).reduce((sum,m)=>sum+m.nutrition.kcal,0));
    }
    if(days===7)assert.equal(plan.days.filter(d=>d.training).length,config.training);
  }
});

test('Los cambios se conservan exactamente al reconstruir el pedido y al descargar',()=>{
  const plan=createGymPlan(config,1),before=shoppingList(plan);
  swapMeal(plan,0,'lunch');
  plan.days[0].meals.breakfast=scaleMeal(plan.days[0].meals.breakfast,.25);
  const restored=applyPlanSelections(config,plan.seed,planSelections(plan));
  assert.deepEqual(restored.days,plan.days);
  assert.notDeepEqual(shoppingList(plan),before);
  const text=gymPlanText(restored,false);
  assert.match(text,/PLAN DE PRUEBA/);
  assert.ok(text.includes(plan.days[0].meals.lunch.title));
  assert.equal((text.match(/Preparación:/g)||[]).length,28);
  const allGrams=plan.days.flatMap(d=>Object.values(d.meals).flatMap(m=>m.ingredients)).reduce((sum,i)=>sum+i.grams,0);
  assert.equal(shoppingList(plan).reduce((sum,i)=>sum+i.grams,0),allGrams);
});

test('Escalar y deshacer no acumula redondeos, y los nutrientes siguen las cantidades',()=>{
  const meal=createGymPlan(config).days[0].meals.snack;
  const up=scaleMeal(meal,.25),back=scaleMeal(up,-.25);
  assert.deepEqual(back.ingredients,meal.ingredients);
  assert.deepEqual(up.nutrition,ingredientTotals(up.ingredients));
  assert.equal(scaleMeal(scaleMeal(meal,-.25),-.25).scale,.75);
  assert.equal(scaleMeal(scaleMeal(meal,.5),.25).scale,1.5);
  assert.equal(identifyIngredient('Papaya').id,169926);
  assert.equal(identifyIngredient('Papa').id,170440);
  assert.equal(identifyIngredient('Queso fresco').id,172223);
  assert.notEqual(identifyIngredient('Repollo').id,171477);
  assert.equal(meal.ingredients.find(i=>i.foodId===173904).grams,42);
});

test('Validación: no admite menores, preferencias inventadas ni platos ajenos al catálogo',()=>{
  for(const invalid of [{...config,adult:false},{...config,goal:'constructor'},{...config,training:0},{...config,training:7},{...config,weight:20},{...config,portion:'extra'},{...config,unknown:true}])assert.throws(()=>createGymPlan(invalid));
  const plan=createGymPlan({...config,weight:75});
  assert.equal(plan.config.weight,null);
  const selections=planSelections(plan);
  selections[0].lunch.title='Plato inventado';
  assert.throws(()=>applyPlanSelections(config,0,selections));
  const valid=planSelections(plan);valid[0].snack.scale=20;
  assert.throws(()=>applyPlanSelections(config,0,valid));
});
