# Precios de supermercados · piloto Barcelona

Quiskett v2.1 relaciona ingredientes de los menús con fichas públicas de productos concretos. Muestra compra orientativa por formatos completos, fecha, enlace, cobertura de ingredientes y cantidades sin precio. **No es una conexión completa con cinco cadenas ni confirma precios de reparto en Barcelona.**

## Estado comprobado el 1 de octubre de 2026

| Cadena | Datos iniciales | Automatización |
|---|---|---|
| Caprabo | 22 productos: pollo, arroz, avena, huevos, aceite, frutas, verduras, legumbres y un lácteo natural alto en proteína | Extractor de HTML público probado; última consulta de lote, 21/21 fichas válidas. El lácteo se verificó por separado con el mismo parser. |
| DIA | 3 productos: arroz, avena y solomillos de pollo | Extractor JSON-LD verificado sobre HTML observado. El último intento del colector recibió HTTP 403 en robots.txt y se detuvo. Conserva los tres precios y su hora original. |
| Mercadona | Sin precios en este catálogo | HTML público sin datos de producto extraíbles; robots.txt restringe /api. Conector desactivado. |
| Consum | Sin precios en este catálogo | HTML de la ficha pública sin precio extraíble; acceso por navegador rechazado. Conector desactivado. |
| Carrefour | Sin precios en este catálogo | Consulta pública devolvió HTTP 403. Conector desactivado. |

Hay **25 precios observados**, no un catálogo exhaustivo. Los estados pueden cambiar: cada ejecución registra errores e intentos. Los productos de más de 48 horas, sin stock declarado o con una fecha futura anómala se excluyen del presupuesto; la interfaz vuelve a comprobarlo al descargar.

Barcelona es la zona solicitada. **08001 es un código de referencia elegido para el piloto**, no un domicilio del cliente. Las fichas se consultaron sin fijar código postal: postalCode=null. Caprabo expone tienda 8284, cuya ubicación no se ha confirmado. Antes de completar una compra, el usuario abre la ficha y confirma su tienda, precio, peso, disponibilidad y gastos.

## Actualizar

Node 22 o posterior, sin dependencias npm. El comando recoge datos, valida fichas y escribe dist/catalog/prices.json de forma atómica.

~~~sh
npm run prices:refresh -- --store=caprabo --strict
npm test
~~~

Para consultar ambas fuentes configuradas, usa --store=all. Para DIA, usa --store=dia después de revisar sus condiciones de acceso. No se reintenta automáticamente un bloqueo HTTP 403/429 en la misma ejecución. --strict devuelve un error si la fuente elegida no pudo actualizarse completamente, pero guarda el resultado y conserva las observaciones anteriores con sus fechas originales.

En Windows, si Node no reconoce la CA de la red, usa **Node 24 con la confianza del sistema**:

~~~powershell
node --use-system-ca scripts/refresh-prices.mjs --store=caprabo --strict
~~~

No desactives TLS, no uses proxies para evadir bloqueos, ni introduzcas cookies o credenciales de clientes. El colector usa un identificador QuiskettPrices, solo HTTPS y hosts/rutas editoriales permitidos. Comprueba robots antes de cada destino, también en redirecciones. Espera al menos 850 ms entre peticiones a productos o el Crawl-delay superior. Cada petición tiene 20 s de límite, como máximo tres redirecciones y 2,5 MB de documento. No ejecuta JavaScript del comercio ni llama APIs privadas.

## GitHub

El flujo manual **Actualizar catálogo de precios** permite escoger Caprabo, DIA o ambas. Genera un artefacto quiskett-precios con el JSON y ejecuta las pruebas. **No sube cambios al repositorio ni publica la web**. Descarga el JSON, revisa cobertura/errores y reemplaza dist/catalog/prices.json en un commit revisable.

No se ha ejecutado ese flujo en GitHub: aún falta conectar cuenta/repositorio. No se ha creado una programación diaria ni desplegado un servicio permanente. Cuando se elija alojamiento y acceso autorizado a las fuentes, el mismo comando puede incorporarse a una tarea del servidor o a un proceso de integración. La web estática solo lee el JSON guardado; cada visita no dispara scraping.

## Qué compra el presupuesto

- Pollo cocinado → peso crudo, rendimiento inicial 75 %; arroz cocido → seco, rendimiento 3:1. Ambos son ajustables en la interfaz.
- Garbanzos, lentejas y alubias blancas → peso seco con factores orientativos 2,4, 2,5 y 2,4. Necesitan cocción.
- Huevos: 50 g comestibles por huevo M; redondea a unidades antes de calcular sobrantes.
- Aceite: 0,91 g/ml. Fruta y verdura: rendimientos orientativos para piel, hueso, limpieza y algunas cocciones.
- Agrupa demandas del mismo producto y combina formatos para minimizar el desembolso de ese alimento entre las fichas disponibles.
- Productos al peso: sin un incremento de venta verificado, redondea conservadoramente a múltiplos de la compra mínima. Puede comprar más que el mínimo real permitido.
- No convierte guandules en frijoles, papa criolla en patata, cebolla larga en cebolla blanca ni plátano de cocinar en banana. Las equivalencias nutricionales del generador no se usan para elegir alimentos de compra.
- Los yogures quedan pendientes por defecto. Hay una elección explícita de **YoPRO natural como alternativa para el presupuesto**. Su ficha declara 10,3 g de proteína y 0,1 g de grasa /100 g; el menú conserva sus estimaciones genéricas. No es una afirmación de equivalencia culinaria con yogur griego. Su denominación legal no se ha determinado con la ficha consultada.

Los factores de rendimiento son **supuestos de planificación**, no coeficientes universales ni mediciones de las recetas. Varían con corte, cocción y desperdicio. La metodología de separar alimento comprado y alimento servido puede consultarse en la [Food Buying Guide del USDA](https://foodbuyingguide.fns.usda.gov/Appendix/ResourceAppendixB) y las [tablas de rendimiento por cocción](https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/cooking-yields/). Los factores concretos de este prototipo no se atribuyen a una fila exacta de esas tablas.

**El total es parcial mientras haya ingredientes sin precio.** Un producto pendiente no cuesta cero. Solo compara entre tiendas los ingredientes cubiertos por ambas; no declara una tienda más barata para todo el menú con coberturas distintas. La parte consumida es una distribución orientativa del coste de los formatos comprados; el resto queda en despensa. No incluye gastos de entrega, mínimos de pedido, descuentos de fidelidad ni promociones de segunda unidad. **Los 0,50 € corresponden al plan Quiskett, no a los alimentos.**

## Fuentes y mantenimiento

El listado editorial está en dist/catalog/products.js. Los extractores están en server/catalog/extract.mjs y su orquestación en refresh.mjs; manifest.mjs reexporta el listado compartido. Añade productos con su URL canónica, identificador, forma y unidad esperadas. Cualquier cambio de producto incompatible se rechaza y exige revisión editorial. No se almacena el HTML completo de los comercios en el repositorio; solo hechos del producto, precio, hora y un hash de evidencia.

DIA: extrae Product/Offer JSON-LD de la ficha exacta. Caprabo: interpreta como JSON los datos estructurados incrustados y contrasta el precio visible y €/kg cuando existe. Rechaza precios ambiguos, moneda distinta, pack desconocido, datos duplicados e identidad o forma alimentaria incompatibles.

Para las otras tres cadenas hace falta una fuente accesible y autorizada y desarrollar su conector y listado. No hay claves ficticias, datos inventados ni elusión de restricciones.

Ejemplos de fichas originales: [pollo Caprabo](https://www.capraboacasa.com/es/productdetail/19230572-pechugas-enteras-pollo-formato-ahorro-xxl-eroski-bandeja-aprox-950-g/), [arroz DIA](https://www.dia.es/arroz-pastas-y-legumbres/arroz/p/21415), [avena DIA](https://www.dia.es/galletas-cereales-y-mermeladas/cereales-integrales-y-muesli/p/105429), [YoPRO natural](https://www.capraboacasa.com/es/productdetail/22316962-natural-yopro-pack-2x160-g/).

## Validación y límites

Las pruebas cubren robots y redirecciones, bloqueo sin evasión, conservación de fechas, identidad editorial, moneda/unidades, datos corruptos, stock/caducidad, conversiones, formatos combinados, cobertura parcial, alternativas explícitas, todos los países y servicio del JSON. Las pruebas no consultan comercios. Los precios reales iniciales se consultaron por separado.

La revisión visual de escritorio/móvil está pendiente porque el acceso al navegador local fue rechazado. Las fuentes externas pueden variar y este piloto no garantiza cobertura completa ni actualización permanente. No se ha realizado ninguna compra de alimentos.
