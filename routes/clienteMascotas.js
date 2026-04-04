const express = require('express');
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createClientPetsModule } = require('../clientPets');

const router = express.Router();
const { controller } = createClientPetsModule();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Solo se permiten imagenes'), false);
      return;
    }

    callback(null, true);
  }
});

function runPetUpload(req, res, next) {
  upload.fields([
    { name: 'fotoMascota', maxCount: 1 },
    { name: 'fotoCarnet', maxCount: 1 }
  ])(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'No se pudieron procesar los archivos enviados'
      });
    }

    next();
  });
}

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/', controller.listPets);
router.get('/:id', controller.getPet);
router.post('/', runPetUpload, controller.createPet);
router.patch('/:id', runPetUpload, controller.updatePet);
router.delete('/:id', controller.deletePet);
router.patch('/:id/status', controller.updatePetStatus);

module.exports = router;
