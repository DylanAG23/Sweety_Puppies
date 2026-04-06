const { buildCompletedServicesReport } = require('../services/reportBuilders');

async function getAdminCompletedServicesReport(dependencies, sessionUser, query) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);
  const filters = dependencies.filters.normalizeReportFilters(query);
  return buildCompletedServicesReport(dependencies, filters);
}

module.exports = { getAdminCompletedServicesReport };
