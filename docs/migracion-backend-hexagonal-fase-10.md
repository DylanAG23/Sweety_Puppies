# Fase 10 - Modulo de Reportes en arquitectura hexagonal

## Objetivo
Reemplazar el modulo legacy de reportes por un modulo administrativo real, calculado desde `historial_citas` y desde los adicionales realmente aplicados a citas completadas.

## Backend
- Se creo el modulo `adminReports` siguiendo el patron hexagonal:
  - `domain/errors/AdminReportError.js`
  - `domain/services/reportFilters.js`
  - `domain/services/reportFinance.js`
  - `application/services/reportBuilders.js`
  - `application/useCases/*`
  - `infrastructure/repositories/PostgresAdminReportsRepository.js`
  - `infrastructure/services/SimplePdfReportService.js`
  - `infrastructure/http/adminReportsController.js`
- La ruta `routes/reportes.js` ahora funciona como adaptador HTTP liviano.

## Reportes implementados
- Ganancias totales del periodo.
- Ingresos por servicios adicionales.
- Citas realizadas / servicios principales ejecutados.
- Resumen financiero con distribucion:
  - 30% insumos / ahorro operativo
  - 70% ganancia neta considerada

## Filtros
- Dia
- Semana
- Mes
- Rango personalizado

## PDF
- Cada consulta puede exportarse como PDF desde backend usando un generador simple propio.
- El PDF se arma con el mismo tipo de reporte y el mismo rango consultado en pantalla.

## Frontend
- `ReportesPage.vue` ya no usa la vista legacy.
- Ahora consume los endpoints nuevos y descarga el PDF autenticado desde el backend.
