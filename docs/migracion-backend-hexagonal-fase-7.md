# Fase 7 - Gestion de citas y servicios

## Modulo creado
- `adminServiceManagement`

## Objetivo
Reemplazar el antiguo concepto de `Historial` en admin por un modulo operativo real para:
- gestionar citas
- revisar servicios realizados
- iniciar y finalizar atenciones
- generar `historial_servicios` al completar una cita

## Cambios principales
- Nuevo backend hexagonal en `adminServiceManagement/`
- Nueva ruta administrativa:
  - `GET /api/admin/gestion/citas`
  - `GET /api/admin/gestion/citas/:id`
  - `PATCH /api/admin/gestion/citas/:id/confirm`
  - `PATCH /api/admin/gestion/citas/:id/cancel`
  - `PATCH /api/admin/gestion/citas/:id/start`
  - `PATCH /api/admin/gestion/citas/:id/attention`
  - `PATCH /api/admin/gestion/citas/:id/finalize`
  - `GET /api/admin/gestion/servicios`
  - `GET /api/admin/gestion/servicios/:id`
- Flujo de finalizacion conectado a `historial_servicios`

## Compatibilidad
- Se mantiene `/admin/historial` como alias visual hacia el nuevo modulo mientras el menu se actualiza
- No se rompe `adminAgenda`; sigue existiendo para la vista de agenda diaria

## Deuda restante
- Extender despues la misma logica a `servicios`, `adicionales`, `tarifas`, `contenido` y `reportes`
- Seguir sin tocar `baseDatos.js` hasta una iteracion de configuracion controlada
