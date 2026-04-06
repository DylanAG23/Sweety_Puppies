async function buildRevenueReport(dependencies, filters) {
  const summary = await dependencies.reportsRepository.getRevenueSummary(filters);
  return {
    filtro: filters,
    reporte: {
      totalIngresado: summary.totalIngresado,
      totalCitasRealizadas: summary.totalCitasRealizadas,
      promedioPorCita: summary.promedioPorCita,
      serviciosPrincipales: summary.serviciosPrincipales
    }
  };
}

async function buildAdditionalRevenueReport(dependencies, filters) {
  const summary = await dependencies.reportsRepository.getAdditionalRevenueSummary(filters);
  return {
    filtro: filters,
    reporte: {
      totalIngresado: summary.totalIngresado,
      totalAplicaciones: summary.totalAplicaciones,
      adicionales: summary.adicionales
    }
  };
}

async function buildCompletedServicesReport(dependencies, filters) {
  const summary = await dependencies.reportsRepository.getCompletedServicesSummary(filters);
  return {
    filtro: filters,
    reporte: {
      totalCitasRealizadas: summary.totalCitasRealizadas,
      totalServiciosPrincipales: summary.totalServiciosPrincipales,
      totalAdicionalesAplicados: summary.totalAdicionalesAplicados,
      serviciosPrincipales: summary.serviciosPrincipales
    }
  };
}

async function buildFinancialSummaryReport(dependencies, filters) {
  const summary = await dependencies.reportsRepository.getRevenueSummary(filters);
  const distribution = dependencies.finance.buildFinancialDistribution(summary.totalIngresado);

  return {
    filtro: filters,
    reporte: {
      ...distribution,
      totalCitasRealizadas: summary.totalCitasRealizadas,
      promedioPorCita: summary.promedioPorCita
    }
  };
}

module.exports = {
  buildRevenueReport,
  buildAdditionalRevenueReport,
  buildCompletedServicesReport,
  buildFinancialSummaryReport
};
