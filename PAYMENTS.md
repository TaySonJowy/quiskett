# Pago de 0,50 € en Quiskett

## Estado

La entrega usa una demo gratuita y no contiene claves. Las pruebas usan respuestas simuladas; ningún test contacta Stripe. El backend está preparado para configurar y probar la pasarela antes de publicar.

## Configuración

1. Copia .env.example a .env. Está excluido de Git.
2. Añade una clave sk_test_... y el secreto whsec_... de tu webhook.
3. Configura PUBLIC_ORIGIN con el origen completo del servidor. En producción debe ser HTTPS; el modo de prueba admite http://127.0.0.1:4173 o localhost.
4. Configura PAYMENTS_ENABLED=true.
5. Ejecuta npm run start:payments.
6. En Stripe de prueba configura el endpoint POST /api/stripe/webhook para checkout.session.completed. Para pruebas locales puedes reenviar eventos con la herramienta oficial Stripe CLI.
7. En un alojamiento posterior configura HOST=0.0.0.0, un volumen persistente para DATA_DIR y un proxy HTTPS. No expongas datos ni archivos del repositorio fuera de dist/.

Con claves de prueba, la web muestra Stripe en modo de prueba y no presenta la transacción como un cobro real. Para producción usa las claves y secreto del entorno live, conserva HTTPS y revisa tu configuración comercial en Stripe. Las claves nunca van en dist/, GitHub ni parámetros de URL.

## Recorrido

- GET /api/config: devuelve modo demo/Stripe y prepara la cookie de sesión del propietario.
- POST /api/checkout-sessions: recibe preferencias generales, semilla, elecciones de recetas y requestId. Rechaza el peso, campos desconocidos y selecciones ajenas al catálogo.
- El servidor reconstruye cantidades y nutrientes, guarda la instantánea, fija currency=eur, unit_amount=50 y quantity=1.
- El pedido y requestId permiten reutilizar un intento; la llamada a Stripe usa una clave de idempotencia derivada del pedido.
- Stripe recibe el importe, el nombre del producto y un identificador opaco de pedido. Las preferencias y el peso no se incluyen en metadata.
- Las URL de retorno se construyen desde PUBLIC_ORIGIN e incluyen el pedido. El identificador en la URL no concede acceso ni demuestra un pago.
- GET /api/orders/:id exige la cookie del propietario. Consulta la sesión y comprueba identidad, producto, cantidad, moneda, importe, modo test/live y estado paid antes de entregar el pedido verificado.
- El webhook usa el cuerpo sin transformar, firma HMAC y tolerancia de 5 minutos. Recupera la sesión de Stripe y aplica la misma verificación.
- Cancelar devuelve el menú y permite retomar el mismo checkout. Si caduca, el siguiente intento recibe un identificador nuevo.
- La compra confirmada se puede recuperar durante la vigencia de su sesión. Ajustar sus porciones conserva la confirmación; crear un plan nuevo inicia otra compra.

## Antes de activar cobros

Comprueba en Stripe de prueba: éxito, cancelación y retorno, recarga, reintento tras fallo de red, evento repetido, firma incorrecta, pedido de otra sesión e importe distinto. Verifica que el menú entregado mantiene los cambios de platos y porciones. El servidor de esta entrega guarda pedidos en un archivo JSON y admite una sola instancia; para varias instancias sustituye OrderStore por una base de datos con claves únicas por propietario/requestId y operación atómica de entrega.

Los datos de pedidos requieren un volumen persistente y copia de seguridad. La cookie caduca a los 7 días; no existe todavía recuperación por cuenta o correo. Las limitaciones de petición y caché incluidas son básicas; para tráfico público añade control en el proxy y una política de retención de pedidos. El catálogo y los menús de demostración son públicos: el prototipo no garantiza acceso exclusivo a recetas compradas.

GitHub Pages no ejecuta este backend. Allí solo funciona la demo. El precio de 0,50 € debe revisarse frente a las comisiones de la cuenta y moneda de liquidación antes de abrir ventas; el código conserva el precio solicitado.

## Documentación primaria

- [Stripe: monedas e importe mínimo](https://docs.stripe.com/currencies)
- [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions)
- [Verificar y entregar una compra](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted)
- [Webhooks y firmas](https://docs.stripe.com/webhooks)
- [Idempotencia](https://docs.stripe.com/api/idempotent_requests)
- [Claves privadas](https://docs.stripe.com/keys)
