async function getAdminTrendReport(dependencies, sessionUser, query) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);
  const filters = dependencies.filters.normalizeDashboardFilters(query);
  const metrica = dependencies.trends.normalizeTrendMetric(query?.metrica || query?.metric);
  const rows = await dependencies.reportsRepository.getTrendSeries(filters, metrica);
  const resultado = dependencies.trends.buildTrendSeries(filters, metrica, rows);

  return {
    filtro: filters,
    grafica: resultado
  };
}

module.exports = { getAdminTrendReport };
