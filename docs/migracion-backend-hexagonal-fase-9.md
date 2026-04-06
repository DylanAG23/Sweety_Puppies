# Fase 9 - Modulo de Contenido en arquitectura hexagonal

## Objetivo
Reemplazar el modulo legacy de imagenes por un modulo real de `Contenido` para la vista administrativa, conectado a la tabla `imagenes` y reutilizable desde el inicio del cliente.

## Backend
- Se creo el modulo `portalContent` siguiendo el patron hexagonal:
  - `domain/errors/PortalContentError.js`
  - `domain/services/contentCatalog.js`
  - `application/useCases/*`
  - `infrastructure/repositories/PostgresPortalContentRepository.js`
  - `infrastructure/services/SupabasePortalContentStorageService.js`
  - `infrastructure/http/portalContentController.js`
- Se agrego la nueva ruta `routes/contenido.js`.
- `routes/imagenes.js` ahora delega al modulo nuevo para mantener compatibilidad de montaje.

## Funcionalidad
- Listado administrativo de publicaciones visuales.
- Creacion y edicion con subida de imagen a Supabase Storage.
- Activacion y desactivacion logica.
- Reordenamiento por campo `orden`.
- Endpoint publico/controlado para cliente:
  - `GET /api/contenido/activo`

## Integracion con cliente
- El home cliente ahora puede refrescar su galeria destacada desde `GET /api/contenido/activo`.
- Si ese endpoint falla, mantiene como respaldo las imagenes entregadas por `client-home`.

## Compatibilidad
- Se mantuvieron alias utiles del flujo anterior:
  - `POST /api/imagenes/upload`
  - `PUT /api/imagenes/update/:id`
  - `PATCH /api/imagenes/toggle/:id`
  - `POST /api/imagenes/reordenar`
