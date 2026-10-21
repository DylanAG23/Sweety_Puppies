# Modulo `orders` — Pedidos (Fase 2)

Estado: **estructura preparada, sin implementar.** No esta montado en `app.js`.

## Tablas (ya creadas en Supabase)

- `ordenes`
- `detalle_orden`

> El script de creacion (`Fase2_Script_Supabase_tienda_inventario.sql`) debe versionarse en el repositorio antes de implementar, para validar columnas y restricciones.

## Pantallas que lo usan (ACT-15)

- Cliente 4. Checkout (/cliente/checkout)
- Cliente 5. Pasarela simulada y resultado (/cliente/pago/resultado)
- Cliente 6. Mis pedidos (/cliente/pedidos)
- Admin 12. Gestion de pedidos (/admin/pedidos)

## Casos de uso previstos

- checkoutOrder: crea el pedido "En espera de pago" desde el carrito (sin domicilio; recogida en la peluqueria)
- simulatePayment: aprobado -> "Pagado" y descuento de stock; rechazado -> sin cambios; cancelado -> vuelve al carrito
- cancelClientOrder: solo dentro de los primeros 15 minutos
- markOrderReadyForPickup / markOrderDelivered (administradora)
- registerCashPaymentAndDelivery: efectivo -> "Entregado" y descuento de stock en ese momento

## Notas de diseno

- Estados oficiales: En espera de pago, Pagado, Pendiente por recoger, Entregado, Cancelado.
- El descuento de stock y el cambio de estado van en la MISMA transaccion (withTransaction), verificando stock suficiente al momento de pagar.
- Codigo de pedido legible (SP-000123) para la peluqueria.
- Pendiente de definir con la administradora: si ella tambien cancela pedidos y si el stock vuelve al cancelar un pedido pagado.

## Estructura

```
orders/
  index.js                      composicion: crea dependencias, casos de uso y controlador
  application/useCases/         un archivo por caso de uso: (dependencies, sessionUser, payload) => resultado
  domain/errors/OrderError.js   error de dominio con status HTTP y codigo
  domain/services/              reglas puras (validaciones, calculos), sin I/O
  infrastructure/http/          controlador: lee req, llama al caso de uso, traduce errores
  infrastructure/repositories/  SQL parametrizado con pg (unico lugar con SQL)
```
