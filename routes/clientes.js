const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminClientsModule } = require('../adminClients');

const router = express.Router();
const { controller } = createAdminClientsModule();

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.listClients);
router.get('/:id', controller.getClientDetail);

module.exports = router;
