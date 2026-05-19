const { AdminReportError } = require('../../domain/errors/AdminReportError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof AdminReportError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  console.error(defaultMessage, error);
  return res.status(500).json({
    success: false,
    message: error.message || defaultMessage
  });
}

function createAdminReportsController(useCases) {
  return {
    getRevenueReport: async (req, res) => {
      try {
        const result = await useCases.getAdminRevenueReport(req.user, req.query);
        res.json({ success: true, tipo: 'ganancias', ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al generar el reporte de ganancias');
      }
    },

    getAdditionalRevenueReport: async (req, res) => {
      try {
        const result = await useCases.getAdminAdditionalRevenueReport(req.user, req.query);
        res.json({ success: true, tipo: 'adicionales', ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al generar el reporte de adicionales');
      }
    },

    getCompletedServicesReport: async (req, res) => {
      try {
        const result = await useCases.getAdminCompletedServicesReport(req.user, req.query);
        res.json({ success: true, tipo: 'citas', ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al generar el reporte de citas realizadas');
      }
    },

    getFinancialSummaryReport: async (req, res) => {
      try {
        const result = await useCases.getAdminFinancialSummaryReport(req.user, req.query);
        res.json({ success: true, tipo: 'resumen', ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al generar el resumen financiero');
      }
    },

    getTrendReport: async (req, res) => {
      try {
        const result = await useCases.getAdminTrendReport(req.user, req.query);
        res.json({ success: true, tipo: 'grafica', ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al generar la grafica estadistica');
      }
    },

    getDashboardReport: async (req, res) => {
      try {
        const result = await useCases.getAdminDashboardReport(req.user, req.query);
        res.json({ success: true, tipo: 'dashboard', ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al generar el dashboard de reportes');
      }
    },

    getFilterCatalogs: async (req, res) => {
      try {
        const result = await useCases.getAdminReportFilterCatalogs(req.user);
        res.json({ success: true, catalogos: result });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar los catalogos de filtros');
      }
    },

    downloadReportPdf: async (req, res) => {
      try {
        const result = await useCases.generateAdminReportPdf(req.user, req.query);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=\"${result.fileName}\"`);
        res.send(result.pdfBuffer);
      } catch (error) {
        handleHttpError(res, error, 'Error al generar el PDF del reporte');
      }
    }
  };
}

module.exports = { createAdminReportsController };
