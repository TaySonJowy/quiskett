import test from 'node:test';
import assert from 'node:assert/strict';
import { countries, mealLabels, createPlan, planText, availableMeals } from '../dist/menus.js';

test('Todos los países generan la duración elegida con tres comidas completas', () => {
  for (const country of Object.keys(countries)) {
    for (const style of ['all', 'vegetarian']) {
      for (const days of [3, 7]) {
        const plan = createPlan({ country, style, days });
        assert.equal(plan.days.length, days);
        for (const [i, day] of plan.days.entries()) {
          assert.deepEqual(Object.keys(day.meals), Object.keys(mealLabels));
          for (const [type, item] of Object.entries(day.meals)) {
            assert.ok(item.title && item.ingredients.length >= 3 && item.preparation);
            if (i) assert.notEqual(item.title, plan.days[i - 1].meals[type].title);
          }
        }
      }
    }
  }
});

test('La selección vegetariana excluye carne, pescado y caldos cárnicos en los ingredientes', () => {
  for (const country of Object.keys(countries)) {
    const plan = createPlan({ country, style: 'vegetarian', days: 7 });
    for (const day of plan.days) for (const item of Object.values(day.meals)) {
      assert.equal(item.vegetarian, true);
      assert.doesNotMatch(item.ingredients.join(' '), /\b(?:pollo|pescado|merluza|atún|carne|cerdo|jamón|manteca|caldo de pollo)\b/i);
    }
    for (const type of Object.keys(mealLabels)) assert.ok(availableMeals(country, 'vegetarian', type).length >= 3);
  }
});

test('Las combinaciones y la descarga reflejan la selección del usuario', () => {
  const config = { country: 'mx', style: 'vegetarian', days: 3 };
  const plan = createPlan(config, 1);
  assert.notDeepEqual(plan.days, createPlan(config, 2).days);
  const text = planText(plan);
  assert.match(text, /México/);
  assert.match(text, /3 días · Vegetariana/);
  assert.equal((text.match(/DÍA \d/g) || []).length, 3);
  assert.equal((text.match(/Preparación:/g) || []).length, 9);
  assert.ok(text.includes(plan.days[0].meals.lunch.title));
});

test('Entradas inválidas no generan un plan', () => {
  const config = { country: 'do', style: 'all', days: 7 };
  for (const invalid of [null, [], { ...config, country: 'constructor' }, { ...config, country: 'xx' }, { ...config, days: 0 }, { ...config, days: '7' }, { ...config, style: 'vegan' }, { ...config, unknown: true }]) assert.throws(() => createPlan(invalid));
  assert.throws(() => createPlan(config, -1));
});
