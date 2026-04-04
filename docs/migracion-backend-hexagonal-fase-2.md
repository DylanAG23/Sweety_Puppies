# Migracion backend hexagonal - fase 2

Fecha: 2026-04-04

## Modulo migrado

`clienteCitas` / `agendar cita`

## Motivo de eleccion

Despues de `auth` y `clienteMascotas`, este era el siguiente modulo con mejor balance entre:

- alto valor funcional para el sistema actual
- contrato HTTP ya estable consumido por el frontend
- reglas de negocio importantes que convenia sacar de `routes/`
- posibilidad de reutilizar el patron aplicado en `clientPets`

## Alcance de esta fase

Se migro a un modulo hexagonal real la logica de:

- cargar opciones del formulario
- cotizar cita
- consultar disponibilidad
- crear cita
- cancelar cita
- reprogramar cita
- revisar la cita por correo para la administradora
- confirmar o cancelar desde el enlace de revision

## Estructura creada

`clientAppointments/`

- `domain/errors/AppointmentError.js`
- `domain/services/appointmentRules.js`
- `application/services/appointmentPlanner.js`
- `application/useCases/...`
- `infrastructure/repositories/PostgresClientAppointmentsRepository.js`
- `infrastructure/services/...`
- `infrastructure/http/clientAppointmentsController.js`
- `index.js`

## Compatibilidad mantenida

Se conservo el contrato HTTP existente en `routes/clienteCitas.js`:

- `GET /api/cliente/citas/form-options`
- `POST /api/cliente/citas/quote`
- `GET /api/cliente/citas/availability`
- `POST /api/cliente/citas`
- `PATCH /api/cliente/citas/:id/cancel`
- `PATCH /api/cliente/citas/:id/reprogram`
- `GET /api/cliente/citas/admin-review`
- `GET /api/cliente/citas/admin-review/action`
- `POST /api/cliente/citas/admin-review/action`

La ruta ahora actua solo como adaptador HTTP y delega la logica al modulo.

## Mejora arquitectonica lograda

- las validaciones y reglas del modulo salieron de `routes/`
- la logica de cotizacion y disponibilidad quedo en `application/services`
- los casos de uso orquestan el flujo del modulo
- el acceso a PostgreSQL quedo en un repositorio de infraestructura
- las notificaciones y subida de archivos quedaron como servicios de infraestructura
- el controlador HTTP quedo liviano

## Deuda tecnica restante

- `baseDatos.js` sigue acoplado con configuracion sensible y conexion directa
- `clienteHistorial` sigue sin migrar a hexagonal
- `adminAgenda` sigue operativo pero no con el mismo nivel de separacion que `auth`, `clientPets` y `clientAppointments`
- varios modulos admin legacy siguen pendientes de desmontaje gradual
