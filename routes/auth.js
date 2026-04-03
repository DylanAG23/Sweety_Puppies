const express = require('express');
const { createAuthModule } = require('../auth');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const { controller } = createAuthModule();

router.post('/register/initiate', controller.initiateRegistration);
router.post('/register/verify', controller.verifyRegistration);
router.post('/login', controller.login);
router.post('/password-recovery/request', controller.requestPasswordRecovery);
router.get('/me/client-home', authenticateToken, authorizeRoles('cliente'), controller.getClientHome);
router.get('/me/profile', authenticateToken, authorizeRoles('cliente'), controller.getClientProfile);
router.patch('/me/profile', authenticateToken, authorizeRoles('cliente'), controller.updateClientProfile);

module.exports = router;
