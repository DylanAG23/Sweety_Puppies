# Migracion backend hexagonal - fase 6

Fecha: 2026-04-04

## Modulo migrado

`adminPets`

## Motivo de eleccion

Fue el siguiente modulo administrativo natural despues de `adminClients` porque:

- comparte gran parte del contexto operativo con clientes e historial
- el codigo legacy de mascotas estaba acoplado a un esquema anterior que ya no sirve como base futura
- necesitabamos una ficha administrativa real del peludito para operar mejor el negocio

## Estructura creada

`adminPets/`

- `domain/errors/AdminPetError.js`
- `domain/services/petSearch.js`
- `application/useCases/listAdminPets.js`
- `application/useCases/getAdminPetDetail.js`
- `application/useCases/getAdminPetHistory.js`
- `infrastructure/repositories/PostgresAdminPetsRepository.js`
- `infrastructure/http/adminPetsController.js`
- `index.js`

## Compatibilidad mantenida

La ruta `routes/mascotas.js` ahora funciona como adaptador HTTP protegido por rol administrador y delega al modulo nuevo.

Endpoints activos para el modulo:

- `GET /api/mascotas`
- `GET /api/mascotas/:id`
- `GET /api/mascotas/:id/historial`

## Separacion conseguida

- las rutas no contienen SQL ni reglas de negocio
- los controladores solo delegan y responden
- los casos de uso coordinan listado, detalle e historial
- el repositorio encapsula consultas a PostgreSQL
- el historial de la mascota sale directamente de `historial_citas`

## Alcance funcional cubierto

- listado general de mascotas
- busqueda por nombre, raza, tamano, tipo de pelaje y datos del propietario
- detalle completo de mascota
- datos sanitarios y operativos del peludito
- propietario asociado
- historial de servicios por `mascota_id`

## Estado despues de esta fase

### Cliente backend

- `auth`
- `clientPets`
- `clientAppointments`
- `clientHistory`

### Admin backend

- `adminAgenda`
- `adminClients`
- `adminPets`

## Pendiente despues de esta fase

- `servicios`
- `servicios adicionales`
- `tarifas`
- `contenido`
- `historial` admin
- `reportes`

## Deuda tecnica restante

- `baseDatos.js` sigue acoplado a la conexion actual
- siguen existiendo rutas legacy que ya no deben tomarse como base de evolucion
- faltan acciones administrativas avanzadas sobre mascotas si mas adelante se requieren
