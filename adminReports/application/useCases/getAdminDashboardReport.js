const { buildAdminDashboardReport } = require('../services/dashboardBuilders');

async function getAdminDashboardReport(dependencies, sessionUser, query) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);
  const filters = dependencies.filters.normalizeDashboardFilters(query);
  return buildAdminDashboardReport(dependencies, filters);
}

module.exports = { getAdminDashboardReport };
