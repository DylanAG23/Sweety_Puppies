const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminServiceManagementModule } = require('../adminServiceManagement');

const router = express.Router();
const { controller } = createAdminServiceManagementModule();

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/citas', controller.listAppointments);
router.get('/citas/:id', controller.getAppointmentDetail);
router.patch('/citas/:id/confirm', controller.confirmAppointment);
router.patch('/citas/:id/cancel', controller.cancelAppointment);
router.patch('/citas/:id/start', controller.startAppointment);
router.patch('/citas/:id/attention', controller.updateAppointmentAttention);
router.patch('/citas/:id/finalize', controller.finalizeAppointment);

router.get('/servicios', controller.listCompletedServices);
router.get('/servicios/:id', controller.getCompletedServiceDetail);

module.exports = router;
