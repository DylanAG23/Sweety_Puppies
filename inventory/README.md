# Modulo `inventory` — Inventario (Fase 2, ACT-27)

Estado: **implementado en el backend.** Montado en `app.js` como `/api/admin/inventario` (solo rol `administrador`).

## Tablas

- `inventario` (1:1 con `productos`): `stock_actual`, `stock_minimo`
- `movimientos_inventario`: bitacora inmutable (un trigger impide editar o borrar)

Si un producto aun no tiene fila en `inventario`, se muestra con stock 0 y la fila se crea en el primer movimiento o al fijar el minimo.

## Endpoints (`/api/admin/inventario`)

| Metodo | Ruta | Pantalla ACT-15 | Para que |
|---|---|---|---|
| GET | `/` | 10. Control de inventario | Existencias, nivel de cada producto, indicadores (unidades, stock bajo, agotados, movimientos hoy), alerta y motivos sugeridos. Filtros `search` y `nivel` (`normal`, `bajo`, `agotado`, `alerta`) |
| GET | `/productos/:productoId` | 8 y 10 | Stock actual y minimo de un producto |
| PATCH | `/productos/:productoId/minimo` | 8. Crear / editar producto | Cambia el stock minimo (no genera movimiento) |
| POST | `/movimientos` | 10. Registrar movimiento | `{ productoId, tipo, cantidad, motivo, observacion? }` |
| GET | `/movimientos` | 11. Movimientos | Historial con filtros `desde`, `hasta`, `tipo`, `productoId`, `search`, `page`, `pageSize` y resumen del periodo |
| GET | `/movimientos/exportar` | 11. Exportar | CSV (`;`, UTF-8 con BOM) con los mismos filtros, sin paginar |

Documentacion completa en Swagger (`/api-docs`, etiqueta *Admin Inventario*).

## Reglas (`domain/services/inventoryRules.js`)

- **Nivel de stock:** normal (stock > minimo), bajo (0 < stock <= minimo), agotado (stock = 0).
- **Entrada** suma `cantidad` (> 0). **Salida** resta `cantidad` (> 0) y no puede dejar el stock negativo (409 `INSUFFICIENT_STOCK`). **Ajuste** recibe el **valor contado** (>= 0) y registra la diferencia; si es igual al stock actual se rechaza.
- `cantidad` se guarda con signo y `stock_resultante = stock_anterior + cantidad`, como exige la base.
- Motivo obligatorio (max. 100 caracteres), observacion opcional (max. 500).
- Origen: `Pedido SP-xxxxxx` si el movimiento tiene orden, si no `Manual`. Usuario: nombre de la administradora o `Sistema` si `usuario_id` es NULL.
- Fechas de filtros y "movimientos hoy" en hora de Colombia (`America/Bogota`).

## Concurrencia

Cada movimiento corre en `withTransaction`. `lockInventoryForProduct` crea la fila si falta y la bloquea con `SELECT ... FOR UPDATE`, asi dos operaciones simultaneas no leen el mismo stock (sin sobreventa).

## Puerto para `orders` (ACT-32)

`createInventoryModule().ports.discountStockForOrder(db, { ordenId, items })`

- Debe llamarse **dentro de la transaccion del pedido** (`db`), para que el pago y el descuento se confirmen o reviertan juntos.
- `items`: `[{ productoId, cantidad }]`. Agrupa lineas repetidas y bloquea los productos en orden estable (evita interbloqueos).
- Crea una salida por producto con motivo `Venta`, `orden_id` del pedido y usuario `Sistema`.
- Si algun producto no alcanza lanza `INSUFFICIENT_STOCK` y no se descuenta ninguno.

## Pendiente

- Devolver stock al cancelar un pedido ya pagado (entrada automatica): por confirmar con Sara (ver CONTEXTO, seccion 6).
- Pantallas del frontend (`/admin/inventario`, `/admin/inventario/movimientos`).

## Pruebas

- `tests/inventory.rules.test.js`: reglas puras.
- `tests/inventory.movements.test.js`: casos de uso con repositorio en memoria (transaccion, rechazo por stock, pedido completo o nada).
- `tests/app.smoke.test.js`: rutas protegidas por rol y validacion antes de la base de datos.
