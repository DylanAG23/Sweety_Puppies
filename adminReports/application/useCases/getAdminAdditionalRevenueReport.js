const { buildAdditionalRevenueReport } = require('../services/reportBuilders');

async function getAdminAdditionalRevenueReport(dependencies, sessionUser, query) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);
  const filters = dependencies.filters.normalizeDashboardFilters(query);
  return buildAdditionalRevenueReport(dependencies, filters);
}

module.exports = { getAdminAdditionalRevenueReport };
