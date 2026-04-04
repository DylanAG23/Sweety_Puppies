# Migracion backend hexagonal - fase 1

Fecha: 2026-04-04

## Modulo elegido

`clienteMascotas`

## Por que se eligio primero

- Es el siguiente modulo con mejor relacion entre valor y riesgo despues de `auth`.
- Tiene un dominio claro y acotado: CRUD del cliente sobre sus mascotas.
- Ya estaba altamente acoplado a HTTP, SQL y storage, asi que aporta separacion real desde la primera iteracion.
- El frontend ya depende de un contrato HTTP concreto que se puede mantener sin romper rutas.

## Convencion adoptada

Para evitar una reestructuracion brusca, se consolida una arquitectura hexagonal **por modulo**, siguiendo el patron ya iniciado en `auth`:

- `/<modulo>/domain`
- `/<modulo>/application`
- `/<modulo>/infrastructure`
- `routes/<ruta>.js` como adaptador HTTP fino

Esta fase no mueve todo a `src/` para no duplicar ni romper la estructura estable actual.

## Pendiente en siguientes fases

- Migrar `clienteCitas`
- Migrar `clienteHistorial`
- Migrar `adminAgenda`
- Centralizar configuracion sensible de base de datos y secretos en adaptadores/config desacoplados
