const {
  buildRevenueReport,
  buildAdditionalRevenueReport,
  buildCompletedServicesReport,
  buildFinancialSummaryReport
} = require('../services/reportBuilders');

async function generateAdminReportPdf(dependencies, sessionUser, query) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);

  const tipo = dependencies.filters.normalizeReportType(query?.tipo || query?.reportType);
  const filters = dependencies.filters.normalizeReportFilters(query);

  let result;
  let reportTitle;

  if (tipo === 'adicionales') {
    result = await buildAdditionalRevenueReport(dependencies, filters);
    reportTitle = 'Reporte de ingresos por servicios adicionales';
  } else if (tipo === 'citas') {
    result = await buildCompletedServicesReport(dependencies, filters);
    reportTitle = 'Reporte de citas realizadas';
  } else if (tipo === 'resumen') {
    result = await buildFinancialSummaryReport(dependencies, filters);
    reportTitle = 'Resumen financiero 30/70';
  } else {
    result = await buildRevenueReport(dependencies, filters);
    reportTitle = 'Reporte de ganancias totales';
  }

  const pdfBuffer = await dependencies.pdfService.generateReportPdf({
    reportTitle,
    reportType: tipo,
    filtro: result.filtro,
    reporte: result.reporte
  });

  return {
    fileName: `reporte-${tipo}-${result.filtro.fechaInicio}-${result.filtro.fechaFin}.pdf`,
    pdfBuffer
  };
}

module.exports = { generateAdminReportPdf };
