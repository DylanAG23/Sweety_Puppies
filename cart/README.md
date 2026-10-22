# Modulo `cart` — Carrito (Fase 2)

Estado: **estructura preparada, sin implementar.** No esta montado en `app.js`.

## Tablas (ya creadas en Supabase)

- `carritos`
- `carrito_items`

> El script de creacion (`Fase2_Script_Supabase_tienda_inventario.sql`) debe versionarse en el repositorio antes de implementar, para validar columnas y restricciones.

## Pantallas que lo usan (ACT-15)

- Cliente 3. Carrito (/cliente/carrito)
- Icono del carrito con contador en la barra superior (slot topbar-actions de PlatformShell)

## Casos de uso previstos

- getClientCart: lineas con precio actual y estado de stock (amarillo bajo, rojo agotado)
- addCartItem / updateCartItemQuantity / removeCartItem / clearCart
- Cantidad maxima = stock disponible; minimo 1

## Notas de diseno

- El carrito se guarda en la cuenta del cliente aunque cierre sesion (decision confirmada).
- Solo el cliente dueno puede leer o modificar su carrito (filtrar siempre por cliente_id, como en clientPets).

## Estructura

```
cart/
  index.js                      composicion: crea dependencias, casos de uso y controlador
  application/useCases/         un archivo por caso de uso: (dependencies, sessionUser, payload) => resultado
  domain/errors/CartError.js   error de dominio con status HTTP y codigo
  domain/services/              reglas puras (validaciones, calculos), sin I/O
  infrastructure/http/          controlador: lee req, llama al caso de uso, traduce errores
  infrastructure/repositories/  SQL parametrizado con pg (unico lugar con SQL)
```
