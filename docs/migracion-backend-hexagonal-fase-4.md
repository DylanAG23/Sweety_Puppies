# Migracion backend hexagonal - fase 4

Fecha: 2026-04-04

## Modulo migrado

`adminAgenda`

## Motivo de eleccion

Fue el primer modulo administrativo elegido porque:

- es el centro operativo principal del ERP
- ya tiene frontend real consumiendo endpoints estables
- concentra reglas de negocio de agenda, horarios, bloqueos y confirmacion
- al migrarlo se consolida el patron hexagonal para continuar con el resto de administracion

## Estructura creada

`adminAgenda/`

- `domain/errors/AdminAgendaError.js`
- `domain/services/agendaPresentation.js`
- `application/services/adminAgendaPlanner.js`
- `application/useCases/...`
- `infrastructure/repositories/PostgresAdminAgendaRepository.js`
- `infrastructure/services/AdminAgendaNotificationService.js`
- `infrastructure/http/adminAgendaController.js`
- `index.js`

## Compatibilidad mantenida

Se mantuvo el contrato HTTP existente:

- `GET /api/admin/agenda`
- `GET /api/admin/agenda/citas/:id`
- `PATCH /api/admin/agenda/citas/:id/confirm`
- `GET /api/admin/agenda/bloqueos`
- `POST /api/admin/agenda/bloqueos`
- `PATCH /api/admin/agenda/bloqueos/:id/deactivate`

La ruta `routes/adminAgenda.js` ahora solo delega al modulo.

## Separacion conseguida

- validacion y normalizacion fuera de la ruta
- construccion de agenda diaria / semanal / mensual fuera del HTTP layer
- acceso a PostgreSQL encapsulado en repositorio
- notificacion por correo encapsulada en infraestructura
- controlador liviano y sin SQL

## Estado despues de esta fase

### Cliente backend

- `auth`
- `clientPets`
- `clientAppointments`
- `clientHistory`

### Admin backend

- `adminAgenda`

## Pendiente despues de esta fase

- `clientes` admin
- `mascotas` admin
- `servicios`
- `tarifas`
- `bloqueos` mas amplios si se independizan de agenda
- `reportes`

## Deuda tecnica restante

- `baseDatos.js` sigue acoplado a la conexion actual
- siguen existiendo rutas admin legacy fuera de `adminAgenda`
