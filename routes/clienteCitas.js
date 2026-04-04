const express = require('express');
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createClientAppointmentsModule } = require('../clientAppointments');

const router = express.Router();
const { controller } = createClientAppointmentsModule();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten imagenes'), false);
      return;
    }

    cb(null, true);
  }
});

router.use(express.urlencoded({ extended: false }));

router.get('/admin-review', controller.getAdminReview);
router.get('/admin-review/action', controller.processAdminReviewGet);
router.post('/admin-review/action', controller.processAdminReviewPost);

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/form-options', controller.getFormOptions);
router.post('/quote', controller.getQuote);
router.get('/availability', controller.getAvailability);
router.post('/', upload.fields([{ name: 'fotoEstadoActual', maxCount: 1 }]), controller.createAppointment);
router.patch('/:id/cancel', controller.cancelAppointment);
router.patch('/:id/reprogram', controller.reprogramAppointment);

module.exports = router;
