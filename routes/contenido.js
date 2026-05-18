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

/**
 * @openapi
 * tags:
 *   - name: Contenido
 *     description: Publicaciones visuales del portal y contenido activo para clientes.
 *
 * /contenido/activo:
 *   get:
 *     summary: Lista el contenido activo visible para el cliente
 *     tags: [Contenido]
 *     responses:
 *       200:
 *         description: Contenido activo obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 publicaciones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *
 * /contenido:
 *   get:
 *     summary: Lista publicaciones visuales para administración
 *     tags: [Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Publicaciones obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 publicaciones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *                 search:
 *                   type: string
 *   post:
 *     summary: Crea una nueva publicación visual
 *     tags: [Contenido]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [titulo, categoria, orden, imagen]
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               categoria:
 *                 type: string
 *               orden:
 *                 type: integer
 *               activo:
 *                 type: boolean
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Publicación creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /contenido/reordenar:
 *   post:
 *     summary: Reordena visualmente las publicaciones
 *     tags: [Contenido]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publicaciones]
 *             properties:
 *               publicaciones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     orden:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Orden visual actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /contenido/{id}:
 *   get:
 *     summary: Obtiene el detalle de una publicación
 *     tags: [Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Publicación obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   patch:
 *     summary: Actualiza una publicación visual
 *     tags: [Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               categoria:
 *                 type: string
 *               orden:
 *                 type: integer
 *               activo:
 *                 type: boolean
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Publicación actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   put:
 *     summary: Actualiza completamente una publicación visual
 *     tags: [Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Publicación actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /contenido/{id}/status:
 *   patch:
 *     summary: Activa o desactiva una publicación
 *     tags: [Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado de publicación actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 */

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
