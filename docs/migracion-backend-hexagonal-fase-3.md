# Migracion backend hexagonal - fase 3

Fecha: 2026-04-04

## Modulos cliente consolidados en backend

Con esta fase queda cerrada la parte cliente del backend en estos bloques:

- `auth`
  - login
  - inicio cliente
  - mi perfil
- `clientPets`
  - mis mascotas
- `clientAppointments`
  - agendar cita
- `clientHistory`
  - historial

## Decision tecnica

`inicio cliente` y `mi perfil` no se separaron a un modulo nuevo porque ya estaban correctamente encapsulados dentro de `auth`, que sigue siendo el modulo mas maduro y coherente en arquitectura hexagonal del proyecto.

La migracion real pendiente dentro de la experiencia cliente era `clienteHistorial`, y por eso se trabajo como modulo independiente.

## Modulo migrado en esta fase

`clienteHistorial`

## Estructura creada

`clientHistory/`

- `domain/errors/HistoryError.js`
- `domain/services/historyPresentation.js`
- `application/useCases/getClientHistory.js`
- `application/useCases/getClientCurrentAppointmentDetail.js`
- `application/useCases/getClientCompletedServiceDetail.js`
- `infrastructure/repositories/PostgresClientHistoryRepository.js`
- `infrastructure/http/clientHistoryController.js`
- `index.js`

## Compatibilidad mantenida

Se conservo el contrato HTTP existente:

- `GET /api/cliente/historial`
- `GET /api/cliente/historial/citas/:id`
- `GET /api/cliente/historial/servicios/:id`

La ruta `routes/clienteHistorial.js` quedo como adaptador HTTP liviano.

## Estado del backend cliente despues de esta fase

- `auth`: hexagonal y estable
- `clientPets`: hexagonal
- `clientAppointments`: hexagonal
- `clientHistory`: hexagonal

## Pendiente despues de cerrar cliente

Quedan pendientes de migracion gradual:

- `adminAgenda`
- `clientes` admin legacy
- `mascotas` admin legacy
- `servicios / tarifas`
- `bloqueos`
- `reportes`

## Deuda tecnica importante

- `baseDatos.js` sigue acoplado a la conexion concreta y con configuracion sensible embebida
- siguen existiendo rutas legacy administrativas que aun no se desmontan
