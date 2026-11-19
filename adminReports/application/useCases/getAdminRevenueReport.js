const { buildRevenueReport } = require('../services/reportBuilders');

async function getAdminRevenueReport(dependencies, sessionUser, query) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);
  const filters = dependencies.filters.normalizeDashboardFilters(query);
  return buildRevenueReport(dependencies, filters);
}

module.exports = { getAdminRevenueReport };
