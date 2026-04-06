const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminServicesModule } = require('../adminServices');

const router = express.Router();
const { controller } = createAdminServicesModule();

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.listPrimaryServices);
router.post('/', controller.createPrimaryService);

router.get('/principales', controller.listPrimaryServices);
router.post('/principales', controller.createPrimaryService);
router.get('/principales/:id', controller.getPrimaryServiceDetail);
router.patch('/principales/:id', controller.updatePrimaryService);
router.put('/principales/:id', controller.updatePrimaryService);
router.patch('/principales/:id/status', controller.changePrimaryServiceStatus);

router.get('/adicionales', controller.listAdditionalServices);
router.post('/adicionales', controller.createAdditionalService);
router.get('/adicionales/:id', controller.getAdditionalServiceDetail);
router.patch('/adicionales/:id', controller.updateAdditionalService);
router.put('/adicionales/:id', controller.updateAdditionalService);
router.patch('/adicionales/:id/status', controller.changeAdditionalServiceStatus);

router.get('/:id', controller.getPrimaryServiceDetail);
router.patch('/:id', controller.updatePrimaryService);
router.put('/:id', controller.updatePrimaryService);
router.patch('/:id/status', controller.changePrimaryServiceStatus);

module.exports = router;
