const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminPetsModule } = require('../adminPets');

const router = express.Router();
const { controller } = createAdminPetsModule();

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.listPets);
router.get('/:id/historial', controller.getPetHistory);
router.get('/:id', controller.getPetDetail);
router.patch('/:id', controller.updatePet);

module.exports = router;
