const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createClientHistoryModule } = require('../clientHistory');

const router = express.Router();
const { controller } = createClientHistoryModule();

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/', controller.getHistory);
router.get('/citas/:id', controller.getCurrentAppointmentDetail);
router.get('/servicios/:id', controller.getCompletedServiceDetail);

module.exports = router;
