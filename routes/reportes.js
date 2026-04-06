const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminReportsModule } = require('../adminReports');

const router = express.Router();
const { controller } = createAdminReportsModule();

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/ganancias', controller.getRevenueReport);
router.get('/adicionales', controller.getAdditionalRevenueReport);
router.get('/citas-realizadas', controller.getCompletedServicesReport);
router.get('/resumen-financiero', controller.getFinancialSummaryReport);
router.get('/grafica', controller.getTrendReport);
router.get('/pdf', controller.downloadReportPdf);

module.exports = router;
