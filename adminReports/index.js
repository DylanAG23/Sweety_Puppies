const { getAdminRevenueReport } = require('./application/useCases/getAdminRevenueReport');
const { getAdminAdditionalRevenueReport } = require('./application/useCases/getAdminAdditionalRevenueReport');
const { getAdminCompletedServicesReport } = require('./application/useCases/getAdminCompletedServicesReport');
const { getAdminFinancialSummaryReport } = require('./application/useCases/getAdminFinancialSummaryReport');
const { getAdminTrendReport } = require('./application/useCases/getAdminTrendReport');
const { generateAdminReportPdf } = require('./application/useCases/generateAdminReportPdf');
const { createAdminReportsController } = require('./infrastructure/http/adminReportsController');
const { PostgresAdminReportsRepository } = require('./infrastructure/repositories/PostgresAdminReportsRepository');
const { SimplePdfReportService } = require('./infrastructure/services/SimplePdfReportService');
const filters = require('./domain/services/reportFilters');
const finance = require('./domain/services/reportFinance');
const trends = require('./domain/services/reportTrends');

function createAdminReportsModule() {
  const dependencies = {
    reportsRepository: new PostgresAdminReportsRepository(),
    pdfService: new SimplePdfReportService(),
    filters,
    finance,
    trends
  };

  const useCases = {
    getAdminRevenueReport: (sessionUser, query) => getAdminRevenueReport(dependencies, sessionUser, query),
    getAdminAdditionalRevenueReport: (sessionUser, query) =>
      getAdminAdditionalRevenueReport(dependencies, sessionUser, query),
    getAdminCompletedServicesReport: (sessionUser, query) =>
      getAdminCompletedServicesReport(dependencies, sessionUser, query),
    getAdminFinancialSummaryReport: (sessionUser, query) =>
      getAdminFinancialSummaryReport(dependencies, sessionUser, query),
    getAdminTrendReport: (sessionUser, query) => getAdminTrendReport(dependencies, sessionUser, query),
    generateAdminReportPdf: (sessionUser, query) => generateAdminReportPdf(dependencies, sessionUser, query)
  };

  return {
    useCases,
    controller: createAdminReportsController(useCases)
  };
}

module.exports = { createAdminReportsModule };
