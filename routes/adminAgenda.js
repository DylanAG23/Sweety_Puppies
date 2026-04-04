const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminAgendaModule } = require('../adminAgenda');

const router = express.Router();
const { controller } = createAdminAgendaModule();

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.getAgenda);
router.get('/citas/:id', controller.getAppointmentDetail);
router.patch('/citas/:id/confirm', controller.confirmAppointment);
router.get('/bloqueos', controller.listBlocks);
router.post('/bloqueos', controller.createBlock);
router.patch('/bloqueos/:id/deactivate', controller.deactivateBlock);

module.exports = router;
