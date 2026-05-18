const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminPetsModule } = require('../adminPets');

const router = express.Router();
const { controller } = createAdminPetsModule();

/**
 * @openapi
 * tags:
 *   - name: Admin Mascotas
 *     description: Consulta y edición administrativa de mascotas y su historial.
 *
 * /mascotas:
 *   get:
 *     summary: Lista todas las mascotas registradas
 *     tags: [Admin Mascotas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Búsqueda por nombre, raza, tamaño, pelaje, cliente o cédula.
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
 *                     type: object
 *                     additionalProperties: true
 *                 search:
 *                   type: string
 *
 * /mascotas/{id}:
 *   get:
 *     summary: Obtiene el detalle de una mascota
 *     tags: [Admin Mascotas]
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
 *         description: Mascota obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mascota:
 *                   type: object
 *                   additionalProperties: true
 *   patch:
 *     summary: Actualiza una mascota desde administración
 *     tags: [Admin Mascotas]
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
 *               nombre:
 *                 type: string
 *               raza:
 *                 type: string
 *               tamano:
 *                 type: string
 *               sexo:
 *                 type: string
 *               edad:
 *                 type: integer
 *               tipo_pelaje:
 *                 type: string
 *               comportamiento_habitual:
 *                 type: string
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
 *               activo:
 *                 type: boolean
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
 *                   type: object
 *                   additionalProperties: true
 *
 * /mascotas/{id}/historial:
 *   get:
 *     summary: Obtiene el historial de citas realizadas de una mascota
 *     tags: [Admin Mascotas]
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
 *         description: Historial obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mascotaId:
 *                   type: string
 *                   format: uuid
 *                 historial:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 */

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/catalogs/breeds', controller.listPetBreeds);
router.get('/', controller.listPets);
router.get('/:id/historial', controller.getPetHistory);
router.get('/:id', controller.getPetDetail);
router.patch('/:id', controller.updatePet);

module.exports = router;
