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

/**
 * @openapi
 * tags:
 *   - name: Cliente Mascotas
 *     description: Gestión de mascotas del cliente autenticado.
 *
 * components:
 *   schemas:
 *     ClienteMascota:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         cliente_id:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *         raza:
 *           type: string
 *           nullable: true
 *         tamano:
 *           type: string
 *           enum: [miniatura, pequeno, mediano, grande, extra grande]
 *         sexo:
 *           type: string
 *           nullable: true
 *           enum: [macho, hembra]
 *         edad:
 *           type: integer
 *         tipo_pelaje:
 *           type: string
 *           enum: [corto, largo]
 *         comportamiento_habitual:
 *           type: string
 *           enum: [normal, sensible, agresivo]
 *         alergias:
 *           type: string
 *           nullable: true
 *         enfermedades:
 *           type: string
 *           nullable: true
 *         cosas_no_le_gustan:
 *           type: string
 *           nullable: true
 *         fecha_ultimo_bano:
 *           type: string
 *           format: date
 *           nullable: true
 *         vacunacion_al_dia:
 *           type: boolean
 *         desparasitacion_interna_al_dia:
 *           type: boolean
 *         desparasitacion_externa_al_dia:
 *           type: boolean
 *         foto_mascota_url:
 *           type: string
 *           nullable: true
 *         foto_carnet_vacunacion_url:
 *           type: string
 *           nullable: true
 *         observaciones:
 *           type: string
 *           nullable: true
 *         activo:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 * /cliente/mascotas:
 *   get:
 *     summary: Lista las mascotas del cliente autenticado
 *     tags: [Cliente Mascotas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mascotas obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mascotas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClienteMascota'
 *       401:
 *         description: Token faltante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Token inválido o rol incorrecto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Registra una nueva mascota del cliente
 *     tags: [Cliente Mascotas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [nombre, tamano, edad, tipo_pelaje, comportamiento_habitual]
 *             properties:
 *               nombre:
 *                 type: string
 *               raza:
 *                 type: string
 *               tamano:
 *                 type: string
 *                 enum: [miniatura, pequeno, mediano, grande, extra grande]
 *               sexo:
 *                 type: string
 *                 enum: [macho, hembra]
 *               edad:
 *                 type: integer
 *               tipo_pelaje:
 *                 type: string
 *                 enum: [corto, largo]
 *               comportamiento_habitual:
 *                 type: string
 *                 enum: [normal, sensible, agresivo]
 *               alergias:
 *                 type: string
 *               enfermedades:
 *                 type: string
 *               cosas_no_le_gustan:
 *                 type: string
 *               fecha_ultimo_bano:
 *                 type: string
 *                 format: date
 *               vacunacion_al_dia:
 *                 type: boolean
 *               desparasitacion_interna_al_dia:
 *                 type: boolean
 *               desparasitacion_externa_al_dia:
 *                 type: boolean
 *               observaciones:
 *                 type: string
 *               fotoMascota:
 *                 type: string
 *                 format: binary
 *               fotoCarnet:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Mascota creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 mascota:
 *                   $ref: '#/components/schemas/ClienteMascota'
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Datos inválidos o archivos incompatibles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /cliente/mascotas/{id}:
 *   get:
 *     summary: Obtiene el detalle de una mascota del cliente
 *     tags: [Cliente Mascotas]
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
 *         description: Mascota encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mascota:
 *                   $ref: '#/components/schemas/ClienteMascota'
 *       404:
 *         description: Mascota no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Actualiza una mascota del cliente
 *     tags: [Cliente Mascotas]
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
 *             required: [nombre, tamano, edad, tipo_pelaje, comportamiento_habitual]
 *             properties:
 *               nombre:
 *                 type: string
 *               raza:
 *                 type: string
 *               tamano:
 *                 type: string
 *                 enum: [miniatura, pequeno, mediano, grande, extra grande]
 *               sexo:
 *                 type: string
 *                 enum: [macho, hembra]
 *               edad:
 *                 type: integer
 *               tipo_pelaje:
 *                 type: string
 *                 enum: [corto, largo]
 *               comportamiento_habitual:
 *                 type: string
 *                 enum: [normal, sensible, agresivo]
 *               alergias:
 *                 type: string
 *               enfermedades:
 *                 type: string
 *               cosas_no_le_gustan:
 *                 type: string
 *               fecha_ultimo_bano:
 *                 type: string
 *                 format: date
 *               vacunacion_al_dia:
 *                 type: boolean
 *               desparasitacion_interna_al_dia:
 *                 type: boolean
 *               desparasitacion_externa_al_dia:
 *                 type: boolean
 *               observaciones:
 *                 type: string
 *               fotoMascota:
 *                 type: string
 *                 format: binary
 *               fotoCarnet:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Mascota actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 mascota:
 *                   $ref: '#/components/schemas/ClienteMascota'
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Mascota no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Retira una mascota del portal mediante baja lógica
 *     tags: [Cliente Mascotas]
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
 *         description: Mascota retirada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Mascota retirada del portal correctamente
 *       404:
 *         description: Mascota no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /cliente/mascotas/{id}/status:
 *   patch:
 *     summary: Activa o desactiva una mascota del cliente
 *     tags: [Cliente Mascotas]
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
 *             required: [activo]
 *             properties:
 *               activo:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 mascota:
 *                   $ref: '#/components/schemas/ClienteMascota'
 *       400:
 *         description: El campo activo no fue enviado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Mascota no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/catalogs/breeds', controller.listPetBreeds);
router.get('/', controller.listPets);
router.get('/:id', controller.getPet);
router.post('/', runPetUpload, controller.createPet);
router.patch('/:id', runPetUpload, controller.updatePet);
router.delete('/:id', controller.deletePet);
router.patch('/:id/status', controller.updatePetStatus);

module.exports = router;
