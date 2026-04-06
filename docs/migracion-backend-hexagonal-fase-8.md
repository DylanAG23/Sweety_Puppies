# Migracion backend hexagonal - fase 8

## Modulo migrado

- `Servicios` del administrador

## Objetivo de esta fase

Reemplazar el modulo legacy de servicios por un modulo nuevo, util para la administradora y alineado con la arquitectura hexagonal ya adoptada en el backend.

## Backend implementado

Se creo el modulo `adminServices` con separacion por capas:

- `domain`
  - `errors/AdminServiceError.js`
  - `services/serviceCatalog.js`
- `application/useCases`
  - `listAdminServices.js`
  - `getAdminServiceDetail.js`
  - `createAdminService.js`
  - `updateAdminService.js`
  - `changeAdminServiceStatus.js`
- `infrastructure`
  - `repositories/PostgresAdminServicesRepository.js`
  - `http/adminServicesController.js`
- `index.js`

## Compatibilidad mantenida

Se conservo la ruta existente:

- `/api/servicios`

Pero ahora funciona como adaptador HTTP del modulo hexagonal y queda protegida para `administrador`.

## Endpoints activos

- `GET /api/servicios`
- `POST /api/servicios`
- `GET /api/servicios/:id`
- `PATCH /api/servicios/:id`
- `PUT /api/servicios/:id`
- `PATCH /api/servicios/:id/status`

## Frontend

La vista `SwettyPuppies_Frontend/src/pages/ServiciosPage.vue` dejo de depender del contenido legacy y ahora muestra:

- listado de servicios principales
- busqueda
- creacion de nuevo servicio
- detalle de servicio
- edicion
- activacion y desactivacion logica

## Validacion

- `node --check routes/servicios.js`
- `node --check adminServices/index.js`
- `node --check adminServices/infrastructure/repositories/PostgresAdminServicesRepository.js`
- `vue-tsc --build`

## Pendiente

- modulo de tarifas
- modulo de servicios adicionales
- integraciones mas ricas con agenda, citas e historial desde UI
