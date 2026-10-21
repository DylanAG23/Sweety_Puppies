# Modulo `inventory` — Inventario (Fase 2)

Estado: **estructura preparada, sin implementar.** No esta montado en `app.js`.

## Tablas (ya creadas en Supabase)

- `inventario`
- `movimientos_inventario`

> El script de creacion (`Fase2_Script_Supabase_tienda_inventario.sql`) debe versionarse en el repositorio antes de implementar, para validar columnas y restricciones.

## Pantallas que lo usan (ACT-15)

- Admin 10. Control de inventario (/admin/inventario)
- Admin 11. Movimientos (/admin/inventario/movimientos)

## Casos de uso previstos

- getInventoryOverview: existencias, minimos, alertas de stock bajo y agotados
- registerInventoryMovement: entrada (suma), salida (resta) o ajuste (valor contado); observacion opcional
- listInventoryMovements: filtros por fechas, tipo y producto; exportable
- discountStockForOrder (puerto usado por orders): salida automatica con origen "Pedido SP-xxxxx" y usuario "Sistema"

## Notas de diseno

- Los movimientos no se editan ni se eliminan (trazabilidad).
- Todo cambio de stock va en una transaccion con bloqueo de la fila: db.withTransaction(...) y SELECT ... FOR UPDATE sobre inventario, para que dos compras simultaneas no vendan la misma unidad.
- El stock nunca puede quedar negativo: validar dentro de la misma transaccion.

## Estructura

```
inventory/
  index.js                      composicion: crea dependencias, casos de uso y controlador
  application/useCases/         un archivo por caso de uso: (dependencies, sessionUser, payload) => resultado
  domain/errors/InventoryError.js   error de dominio con status HTTP y codigo
  domain/services/              reglas puras (validaciones, calculos), sin I/O
  infrastructure/http/          controlador: lee req, llama al caso de uso, traduce errores
  infrastructure/repositories/  SQL parametrizado con pg (unico lugar con SQL)
```
