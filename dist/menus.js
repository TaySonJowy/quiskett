import { additionalCountries, additionalMenus } from './countries-extra.js';
export const countries = {
  do: { name: 'República Dominicana', code: 'RD', adjective: 'dominicano' },
  mx: { name: 'México', code: 'MX', adjective: 'mexicano' },
  co: { name: 'Colombia', code: 'CO', adjective: 'colombiano' },
  es: { name: 'España', code: 'ES', adjective: 'español' },
  ...additionalCountries,
};
Object.assign(countries.do, { region:'Caribe', pantry:['Plátano verde','Habichuelas'] });
Object.assign(countries.mx, { region:'América del Norte', pantry:['Tortilla de maíz','Frijoles'] });
Object.assign(countries.co, { region:'América del Sur', pantry:['Arepa','Fríjoles'] });
Object.assign(countries.es, { region:'Europa', pantry:['Garbanzos','Aceite de oliva'] });
export const mealLabels = { breakfast: 'Desayuno', lunch: 'Comida', dinner: 'Cena' };
const meal = (title, ingredients, vegetarian, preparation) => ({ title, ingredients, vegetarian, preparation });
export const menus = {
  do: {
    breakfast: [
      meal('Mangú con huevo y cebollita', ['Plátano verde', 'Huevo', 'Cebolla roja', 'Aceite de oliva'], true, 'Hierve y maja el plátano. Sirve con huevo y cebolla salteada.'),
      meal('Avena con lechosa', ['Avena', 'Leche o bebida de avena', 'Lechosa', 'Canela'], true, 'Cocina la avena con la leche y la canela. Añade lechosa fresca.'),
      meal('Casabe con aguacate', ['Casabe de yuca', 'Aguacate', 'Tomate', 'Limón'], true, 'Tuesta ligeramente el casabe y acompaña con aguacate, tomate y limón.'),
      meal('Batata con queso fresco', ['Batata', 'Queso fresco', 'Tomate'], true, 'Cocina la batata al horno y acompaña con queso y tomate fresco.'),
    ],
    lunch: [
      meal('La bandera, a tu manera', ['Arroz', 'Habichuelas rojas', 'Pollo', 'Tomate', 'Repollo', 'Ajo', 'Cebolla', 'Aceite de oliva'], false, 'Prepara arroz y habichuelas guisadas. Cocina el pollo a la plancha y sirve con ensalada.'),
      meal('Moro de guandules con aguacate', ['Arroz', 'Guandules', 'Aguacate', 'Pimiento', 'Cebolla', 'Ajo', 'Aceite de oliva'], true, 'Sofríe los vegetales, agrega arroz y guandules cocidos y cocina con agua. Sirve con aguacate.'),
      meal('Locrio de pollo', ['Arroz', 'Pollo', 'Tomate', 'Pimiento', 'Cebolla', 'Ajo', 'Aceite de oliva'], false, 'Dora el pollo con los vegetales. Añade arroz y agua y cocina hasta que esté listo.'),
      meal('Habichuelas con arroz y ensalada', ['Habichuelas rojas', 'Arroz', 'Aguacate', 'Tomate', 'Repollo', 'Cebolla', 'Ajo', 'Aceite de oliva'], true, 'Guisa las habichuelas y sírvelas con arroz, aguacate y ensalada fresca.'),
      meal('Arroz con garbanzos y auyama', ['Arroz', 'Garbanzos', 'Auyama', 'Tomate', 'Cebolla', 'Ajo', 'Aceite de oliva'], true, 'Guisa los garbanzos con auyama y vegetales. Acompaña con arroz.'),
    ],
    dinner: [
      meal('Sancocho casero de pollo', ['Pollo', 'Yuca', 'Plátano verde', 'Auyama', 'Maíz', 'Cebolla', 'Cilantro'], false, 'Cocina el pollo y las viandas en agua con cebolla y cilantro, hasta que todo esté tierno.'),
      meal('Yuca con queso y cebolla', ['Yuca', 'Queso fresco', 'Cebolla roja', 'Aceite de oliva'], true, 'Hierve la yuca y sirve con queso fresco y cebolla salteada.'),
      meal('Tostones con habichuelas', ['Plátano verde', 'Habichuelas rojas', 'Tomate', 'Lechuga', 'Cebolla', 'Aceite de oliva'], true, 'Cocina los tostones en sartén y acompaña con habichuelas guisadas y ensalada.'),
      meal('Caldo de viandas y habichuelas', ['Yuca', 'Auyama', 'Plátano verde', 'Habichuelas rojas', 'Cebolla', 'Cilantro'], true, 'Cuece las viandas con cebolla y cilantro. Añade habichuelas cocidas al final.'),
    ],
  },
  mx: {
    breakfast: [
      meal('Huevos rancheros', ['Huevo', 'Tortilla de maíz', 'Tomate', 'Chile', 'Cebolla', 'Frijoles', 'Aceite de oliva'], true, 'Prepara salsa de tomate y chile. Sirve el huevo sobre una tortilla con frijoles.'),
      meal('Chilaquiles con frijoles', ['Tortilla de maíz', 'Tomate', 'Chile', 'Cebolla', 'Queso fresco', 'Frijoles', 'Aceite de oliva'], true, 'Tuesta las tortillas, mezcla con salsa y acompaña con frijoles y queso.'),
      meal('Avena con plátano y canela', ['Avena', 'Leche o bebida de avena', 'Plátano', 'Canela'], true, 'Cocina la avena con leche y canela y sirve con plátano en rodajas.'),
      meal('Tacos de huevo con nopales', ['Tortilla de maíz', 'Huevo', 'Nopales', 'Tomate', 'Cebolla', 'Aceite de oliva'], true, 'Saltea nopales, tomate y cebolla. Añade el huevo y sirve en tortillas.'),
    ],
    lunch: [
      meal('Enchiladas verdes de pollo', ['Tortilla de maíz', 'Pollo', 'Tomatillo', 'Chile', 'Cebolla', 'Queso fresco'], false, 'Rellena las tortillas con pollo cocido y cubre con salsa verde y queso.'),
      meal('Tacos de pescado con col', ['Tortilla de maíz', 'Pescado', 'Col', 'Limón', 'Tomate', 'Aceite de oliva'], false, 'Cocina el pescado a la plancha y sirve en tortillas con col, tomate y limón.'),
      meal('Enchiladas de frijoles', ['Tortilla de maíz', 'Frijoles', 'Tomatillo', 'Chile', 'Cebolla', 'Queso fresco'], true, 'Rellena tortillas con frijoles cocidos. Cubre con salsa verde y queso.'),
      meal('Tacos de setas y frijoles', ['Tortilla de maíz', 'Setas', 'Frijoles', 'Col', 'Limón', 'Cebolla', 'Aceite de oliva'], true, 'Saltea las setas con cebolla y sirve en tortillas con frijoles y col.'),
      meal('Arroz con garbanzos y verduras', ['Arroz', 'Garbanzos', 'Zanahoria', 'Chícharos', 'Tomate', 'Aceite de oliva'], true, 'Cocina el arroz con las verduras e incorpora garbanzos cocidos.'),
    ],
    dinner: [
      meal('Quesadillas de champiñón', ['Tortilla de maíz', 'Queso', 'Champiñón', 'Cebolla', 'Aceite de oliva'], true, 'Saltea champiñones y cebolla, rellena las tortillas con queso y calienta en el comal.'),
      meal('Sopa de frijol con aguacate', ['Frijoles', 'Tomate', 'Cebolla', 'Ajo', 'Aguacate', 'Aceite de oliva'], true, 'Cocina los frijoles con tomate, ajo y cebolla. Añade aguacate al servir.'),
      meal('Tostadas de tinga de pollo', ['Tortilla de maíz', 'Pollo', 'Tomate', 'Cebolla', 'Chipotle', 'Aceite de oliva'], false, 'Guisa el pollo deshebrado con tomate, cebolla y chipotle. Sirve sobre tortillas tostadas.'),
      meal('Tostadas de tinga de setas', ['Tortilla de maíz', 'Setas', 'Tomate', 'Cebolla', 'Chipotle', 'Frijoles', 'Aceite de oliva'], true, 'Guisa las setas con tomate, cebolla y chipotle. Sirve en tostadas con frijoles.'),
    ],
  },
  co: {
    breakfast: [
      meal('Arepa con queso y huevo', ['Arepa de maíz', 'Queso fresco', 'Huevo', 'Aceite de oliva'], true, 'Calienta la arepa y acompáñala con queso fresco y huevo.'),
      meal('Calentado de arroz y fríjoles', ['Arroz', 'Fríjoles', 'Huevo', 'Tomate', 'Cebolla', 'Aceite de oliva'], true, 'Saltea arroz y fríjoles cocidos con tomate y cebolla. Sirve con huevo.'),
      meal('Changua casera', ['Leche', 'Huevo', 'Cebolla larga', 'Cilantro', 'Pan de trigo'], true, 'Calienta agua y leche con cebolla. Cocina el huevo en el caldo y sirve con cilantro y pan.'),
      meal('Arepa con aguacate', ['Arepa de maíz', 'Aguacate', 'Tomate', 'Limón'], true, 'Calienta la arepa y rellena con aguacate, tomate y unas gotas de limón.'),
    ],
    lunch: [
      meal('Ajiaco casero', ['Pollo', 'Papa criolla', 'Papa pastusa', 'Papa sabanera', 'Maíz', 'Guascas', 'Crema de leche'], false, 'Cocina el pollo, las papas y el maíz con agua y guascas. Sirve con crema.'),
      meal('Arroz con pollo y verduras', ['Arroz', 'Pollo', 'Zanahoria', 'Arvejas', 'Pimiento', 'Cebolla', 'Aceite de oliva'], false, 'Cocina el arroz con vegetales y agrega el pollo cocido y desmechado.'),
      meal('Fríjoles con arroz y maduro', ['Fríjoles', 'Arroz', 'Plátano maduro', 'Aguacate', 'Tomate', 'Cebolla', 'Aceite de oliva'], true, 'Guisa los fríjoles y acompaña con arroz, maduro al horno y aguacate.'),
      meal('Sopa de papa y garbanzos', ['Papa', 'Garbanzos', 'Maíz', 'Cebolla larga', 'Cilantro'], true, 'Cocina las papas y el maíz con agua y cebolla. Añade garbanzos y cilantro.'),
      meal('Arroz con fríjoles y verduras', ['Arroz', 'Fríjoles', 'Zanahoria', 'Arvejas', 'Pimiento', 'Cebolla', 'Aceite de oliva'], true, 'Cocina arroz con vegetales y mezcla con fríjoles cocidos.'),
    ],
    dinner: [
      meal('Arepa de pollo y aguacate', ['Arepa de maíz', 'Pollo', 'Aguacate', 'Tomate'], false, 'Calienta la arepa y rellena con pollo cocido, aguacate y tomate.'),
      meal('Sopa de papa y queso', ['Papa', 'Queso fresco', 'Leche', 'Cebolla larga'], true, 'Cocina las papas con agua y cebolla. Agrega leche y queso al final.'),
      meal('Patacones con hogao y fríjoles', ['Plátano verde', 'Fríjoles', 'Tomate', 'Cebolla', 'Aceite de oliva'], true, 'Prepara los patacones y cúbrelos con hogao de tomate y cebolla y fríjoles.'),
      meal('Arepa de fríjoles y aguacate', ['Arepa de maíz', 'Fríjoles', 'Aguacate', 'Tomate'], true, 'Calienta la arepa y rellena con fríjoles cocidos, aguacate y tomate.'),
    ],
  },
  es: {
    breakfast: [
      meal('Tostada con tomate y aceite', ['Pan de trigo', 'Tomate', 'Aceite de oliva'], true, 'Tuesta el pan, añade tomate rallado y termina con aceite de oliva.'),
      meal('Yogur con manzana y avena', ['Yogur natural', 'Manzana', 'Avena'], true, 'Mezcla yogur, manzana en dados y avena.'),
      meal('Tostada de tortilla', ['Pan de trigo', 'Huevo', 'Patata', 'Cebolla', 'Aceite de oliva'], true, 'Prepara una tortilla de patata y sirve una porción sobre pan tostado.'),
      meal('Avena con naranja y canela', ['Avena', 'Leche o bebida de avena', 'Naranja', 'Canela'], true, 'Cocina la avena con leche y canela y acompaña con naranja fresca.'),
    ],
    lunch: [
      meal('Arroz con pollo y verduras', ['Arroz', 'Pollo', 'Judías verdes', 'Pimiento', 'Tomate', 'Aceite de oliva'], false, 'Sofríe el pollo y los vegetales. Agrega arroz y agua y cocina hasta que esté listo.'),
      meal('Lentejas de verduras', ['Lentejas', 'Zanahoria', 'Patata', 'Cebolla', 'Ajo', 'Aceite de oliva'], true, 'Cocina las lentejas con las verduras, ajo y agua hasta que estén tiernas.'),
      meal('Garbanzos con espinacas', ['Garbanzos', 'Espinacas', 'Ajo', 'Pimentón', 'Aceite de oliva'], true, 'Saltea ajo y espinacas. Añade garbanzos cocidos y pimentón.'),
      meal('Arroz de verduras y garbanzos', ['Arroz', 'Garbanzos', 'Judías verdes', 'Pimiento', 'Tomate', 'Aceite de oliva'], true, 'Sofríe los vegetales y cocina con arroz y agua. Incorpora los garbanzos cocidos.'),
      meal('Merluza con patata y ensalada', ['Merluza', 'Patata', 'Lechuga', 'Tomate', 'Limón', 'Aceite de oliva'], false, 'Hornea la merluza y la patata y acompaña con ensalada y limón.'),
    ],
    dinner: [
      meal('Tortilla con ensalada', ['Huevo', 'Patata', 'Cebolla', 'Lechuga', 'Tomate', 'Aceite de oliva'], true, 'Prepara una tortilla de patata y acompaña con ensalada de lechuga y tomate.'),
      meal('Gazpacho y tostada', ['Tomate', 'Pepino', 'Pimiento', 'Ajo', 'Pan de trigo', 'Aceite de oliva', 'Vinagre'], true, 'Tritura los vegetales con aceite y vinagre. Sirve frío con pan tostado.'),
      meal('Pisto con huevo', ['Calabacín', 'Berenjena', 'Tomate', 'Pimiento', 'Cebolla', 'Huevo', 'Aceite de oliva'], true, 'Guisa las verduras a fuego suave y acompaña con huevo a la plancha.'),
      meal('Ensalada de garbanzos', ['Garbanzos', 'Tomate', 'Pepino', 'Pimiento', 'Cebolla', 'Aceite de oliva', 'Vinagre'], true, 'Mezcla garbanzos cocidos y vegetales troceados y aliña con aceite y vinagre.'),
    ],
  },
};

Object.assign(menus, additionalMenus);

export function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Elige las opciones de tu plan.');
  if (!Object.hasOwn(countries, config.country)) throw new Error('Elige uno de los países disponibles.');
  if (!['all', 'vegetarian'].includes(config.style)) throw new Error('Elige una alimentación disponible.');
  if (![3, 7].includes(config.days)) throw new Error('Elige un plan de 3 o 7 días.');
  if (Object.keys(config).some(key => !['country', 'style', 'days'].includes(key))) throw new Error('El plan contiene una opción desconocida.');
  return { country: config.country, style: config.style, days: config.days };
}

export function availableMeals(country, style, type) {
  if (!Object.hasOwn(countries, country) || !['all', 'vegetarian'].includes(style) || !Object.hasOwn(mealLabels, type)) throw new Error('No encontramos esa selección.');
  return menus[country][type].filter(item => style === 'all' || item.vegetarian);
}

export function createPlan(input, seed = 0) {
  const config = validateConfig(input);
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('No se pudo crear una variación del menú.');
  const days = Array.from({ length: config.days }, (_, day) => ({
    day: day + 1,
    meals: Object.fromEntries(Object.keys(mealLabels).map((type, index) => {
      const choices = availableMeals(config.country, config.style, type);
      return [type, choices[(day + seed + index) % choices.length]];
    })),
  }));
  return { ...config, countryName: countries[config.country].name, days };
}

export function planText(plan) {
  const lines = ['QUISKETT · TU PAÍS, TU SABOR, TU DIETA', '', plan.countryName,
    `${plan.days.length} días · ${plan.style === 'vegetarian' ? 'Vegetariana (incluye huevos y lácteos)' : 'De todo un poco'}`, ''];
  for (const day of plan.days) {
    lines.push(`DÍA ${day.day}`, '');
    for (const [type, item] of Object.entries(day.meals)) {
      lines.push(`${mealLabels[type].toUpperCase()} · ${item.title}`, `Ingredientes: ${item.ingredients.join(', ')}.`, `Preparación: ${item.preparation}`, '');
    }
  }
  lines.push('Menú orientativo de ideas de comidas. Ajusta las cantidades a tus necesidades. No sustituye un plan nutricional personalizado.',
    'La opción vegetariana incluye huevos y lácteos. Revisa ingredientes y etiquetas si tienes alergias.',
    'Versión de prueba gratuita. El cobro de 0,50 € por plan aún no está activado.');
  return lines.join('\n');
}
