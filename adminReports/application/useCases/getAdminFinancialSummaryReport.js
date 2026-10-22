const { buildFinancialSummaryReport } = require('../services/reportBuilders');

async function getAdminFinancialSummaryReport(dependencies, sessionUser, query) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);
  const filters = dependencies.filters.normalizeDashboardFilters(query);
  return buildFinancialSummaryReport(dependencies, filters);
}

module.exports = { getAdminFinancialSummaryReport };
