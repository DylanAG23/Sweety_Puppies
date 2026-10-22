# Modulo `catalog` — Catalogo (Fase 2)

Estado: **estructura preparada, sin implementar.** No esta montado en `app.js`.

## Tablas (ya creadas en Supabase)

- `categorias`
- `productos`
- `producto_imagenes`

> El script de creacion (`Fase2_Script_Supabase_tienda_inventario.sql`) debe versionarse en el repositorio antes de implementar, para validar columnas y restricciones.

## Pantallas que lo usan (ACT-15)

- Cliente 1. Tienda / catalogo (/cliente/tienda)
- Cliente 2. Detalle del producto (/cliente/tienda/:id)
- Admin 7. Gestion de productos (/admin/productos)
- Admin 8. Crear / editar producto (/admin/productos/nuevo, /:id/editar)
- Admin 9. Gestion de categorias (/admin/categorias)

## Casos de uso previstos

- listStoreProducts: solo productos activos con categoria activa; busqueda, filtros (categoria, precio, disponibilidad) y orden
- getStoreProductDetail
- listAdminProducts / createAdminProduct / updateAdminProduct / changeAdminProductVisibility
- deleteAdminProduct: solo si no tiene pedidos ni movimientos; si tiene historial, sugerir desactivar
- listAdminCategories / createAdminCategory / updateAdminCategory / changeAdminCategoryStatus (con productos solo se desactiva)

## Notas de diseno

- Imagenes: JPG o PNG, maximo 2 MB, hasta 4 por producto (guia pag. 15). Reutilizar shared/http/imageUpload.js con maxFileSize de 2 MB.
- El stock que se muestra viene del modulo inventory (puerto de lectura), no de una columna copiada.

## Estructura

```
catalog/
  index.js                      composicion: crea dependencias, casos de uso y controlador
  application/useCases/         un archivo por caso de uso: (dependencies, sessionUser, payload) => resultado
  domain/errors/CatalogError.js   error de dominio con status HTTP y codigo
  domain/services/              reglas puras (validaciones, calculos), sin I/O
  infrastructure/http/          controlador: lee req, llama al caso de uso, traduce errores
  infrastructure/repositories/  SQL parametrizado con pg (unico lugar con SQL)
```
