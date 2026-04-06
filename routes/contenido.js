const express = require('express');
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createPortalContentModule } = require('../portalContent');

const router = express.Router();
const { controller } = createPortalContentModule();

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

function runContentUpload(req, res, next) {
  upload.fields([{ name: 'imagen', maxCount: 1 }])(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'No se pudieron procesar los archivos enviados'
      });
    }

    next();
  });
}

router.get('/activo', controller.listActiveContent);

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.listAdminContent);
router.post('/', runContentUpload, controller.createContent);
router.post('/upload', runContentUpload, controller.createContent);
router.post('/reordenar', controller.reorderContent);
router.get('/:id', controller.getContentDetail);
router.patch('/:id', runContentUpload, controller.updateContent);
router.put('/:id', runContentUpload, controller.updateContent);
router.put('/update/:id', runContentUpload, controller.updateContent);
router.patch('/:id/status', controller.changeContentStatus);
router.patch('/toggle/:id', controller.changeContentStatus);

module.exports = router;
