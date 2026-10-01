# Quiskett Gym

Planes de comidas con los sabores de casa para acompañar el gimnasio. Diseño adaptable, selector de países, vista previa de nutrientes e interacción sin pasos innecesarios. **0,50 € por plan, sin suscripción.**

## Qué puedes probar

- Ganar músculo, definir o mantener; porciones moderadas, estándar o generosas.
- 21 países y territorios: Argentina, Bolivia, Chile, Colombia, Costa Rica, Cuba, Ecuador, El Salvador, España, Guatemala, Guinea Ecuatorial, Honduras, México, Nicaragua, Panamá, Paraguay, Perú, Puerto Rico, República Dominicana, Uruguay y Venezuela.
- Planes de 3 o 7 días, con desayuno, comida, merienda y cena. Marca los días de entrenamiento.
- Cantidades con estado del alimento, calorías y proteína/carbohidratos/grasas estimados.
- Cambios de platos, ajuste de porciones, recetas desplegables y comidas completadas.
- Lista de compra agrupada y con progreso, descarga TXT e impresión para guardar como PDF.
- Presupuesto con 25 precios observados de DIA/Caprabo; cinco cadenas visibles, cobertura parcial, formatos combinados y enlaces oficiales. Piloto Barcelona, zona de reparto sin confirmar.
- Seis vistas: planificador, menú, compra, confirmación, plan listo y ayuda.
- Menú recuperable al recargar la misma sesión, sin cuentas ni almacenamiento del peso.
- Herramienta WebMCP opcional para crear un plan desde un navegador compatible.

Son adaptaciones culinarias generales para adultos sanos. El objetivo ajusta algunas porciones; **no calcula necesidades individuales ni garantiza déficit/superávit**. La opción vegetariana incluye huevos y lácteos. El peso opcional solo sirve para mostrar una referencia general de proteína y permanece fuera del almacenamiento y de Stripe. Criterios y fuentes en [NUTRITION.md](dist/NUTRITION.md).

## Ejecutar y verificar

Node.js 22 o posterior. Sin dependencias que instalar.

~~~sh
npm start
npm test
~~~

Abre http://127.0.0.1:4173/. Los módulos requieren un servidor HTTP, no abrir el HTML directamente. Se han probado las combinaciones de países/objetivos/alimentación, cálculo y reconstrucción de cantidades, listas y exportación, validación de entradas, firma de webhooks, autorización, idempotencia y verificación de pedidos con respuestas simuladas de Stripe.

## Precios de la compra

Consulta [SUPERMARKETS.md](SUPERMARKETS.md) para actualizar precios y conocer cobertura y bloqueos. Caprabo tiene un colector público verificado. DIA conserva tres observaciones, con actualización automática bloqueada en el último intento. Mercadona, Consum y Carrefour esperan una fuente autorizada. El presupuesto es independiente del precio de 0,50 € del plan.

## Pagos

Por defecto, **demo gratuita**: no solicita tarjetas ni realiza cobros. La confirmación y descarga están identificadas como prueba.

El backend opcional incluye Stripe Checkout de 50 céntimos en EUR, pedido persistente, reintento del mismo checkout, cookie del propietario, retorno con pedido identificado y verificación del pago en servidor. Las selecciones y porciones se reconstruyen con el catálogo antes de guardarse como pedido. La página de éxito no confirma una compra por sí sola.

Para configurarlo, copia .env.example a .env, añade las credenciales y sigue [PAYMENTS.md](PAYMENTS.md). **No se ha probado una transacción real ni se han añadido credenciales.** GitHub Pages solo ejecuta la demo estática; el cobro necesita el servidor Node en un alojamiento posterior.

La vista previa y el catálogo son públicos. Este prototipo valida la compra y su pedido; no oculta las recetas detrás de un muro de pago.

## GitHub primero; publicación después

El proyecto es un repositorio Git preparado para GitHub. Subir código ejecuta las pruebas y **no publica la web automáticamente**. Conecta tu cuenta y elige el repositorio antes de subirlo.

El flujo **Publicar Quiskett** se ejecuta manualmente. Cuando quieras usar GitHub Pages, selecciona Settings → Pages → GitHub Actions y ejecútalo desde Actions. Sirve únicamente dist/; las rutas relativas funcionan también en /quiskett/. Para activar pagos más adelante, aloja el servidor Node y configura un origen HTTPS. No hay despliegue realizado.

## Estructura

~~~text
dist/
  index.html, styles.css, app.js    Interfaz y navegación
  menus.js, countries-extra.js      Catálogo cultural
  gym.js, nutrition-data.js         Cantidades, estimaciones y generador
  prices.js, price-ui.js            Presupuesto y comparador de cesta
  catalog/                         Precios observados y listado editorial
  NUTRITION.md                      Método y fuentes
  assets/                          Fotografía original e icono
server/payments.mjs                 Pedidos y Stripe, solo servidor
server/catalog/                     Extractores, robots y actualización
scripts/serve.mjs                   Servidor web y API
scripts/refresh-prices.mjs          Actualizar fuentes públicas accesibles
tests/                             Pruebas del catálogo, gimnasio y pagos
.github/workflows/                  Pruebas, precios y publicación manual
~~~

Edita el catálogo en menus.js/countries-extra.js y las tablas en nutrition-data.js. Los colores y puntos de adaptación a móvil están en styles.css. La fotografía se creó para Quiskett; las fuentes DM Sans y Manrope se cargan de Google Fonts con alternativas locales.

## Alcance de esta entrega

Pruebas automatizadas y servidor demo verificados localmente. La revisión visual de esta versión en el navegador quedó pendiente porque se denegó el acceso a la vista local. Antes de la publicación, revisa escritorio/móvil y completa una compra/cancelación en Stripe de prueba siguiendo PAYMENTS.md.
