const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminServicesModule } = require('../adminServices');

const router = express.Router();
const { controller } = createAdminServicesModule();

/**
 * @openapi
 * tags:
 *   - name: Admin Servicios
 *     description: Catálogo de servicios principales y adicionales con lógica de precios base.
 *
 * /servicios:
 *   get:
 *     summary: Alias para listar servicios principales
 *     tags: [Admin Servicios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Servicios principales obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 servicios:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *                 search:
 *                   type: string
 *                 categoria:
 *                   type: string
 *                   example: principales
 *   post:
 *     summary: Alias para crear un servicio principal
 *     tags: [Admin Servicios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               duracion_minutos:
 *                 type: integer
 *               requiere_tamano:
 *                 type: boolean
 *               requiere_tipo_pelaje:
 *                 type: boolean
 *               aplica_recargo_nudos:
 *                 type: boolean
 *               aplica_recargo_comportamiento:
 *                 type: boolean
 *               activo:
 *                 type: boolean
 *               tarifas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   additionalProperties: true
 *     responses:
 *       201:
 *         description: Servicio creado correctamente
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
 *                 servicio:
 *                   type: object
 *                   additionalProperties: true
 *                 categoria:
 *                   type: string
 *
 * /servicios/principales:
 *   get:
 *     summary: Lista los servicios principales
 *     tags: [Admin Servicios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Servicios principales obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   post:
 *     summary: Crea un servicio principal
 *     tags: [Admin Servicios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Servicio principal creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /servicios/principales/{id}:
 *   get:
 *     summary: Obtiene el detalle de un servicio principal
 *     tags: [Admin Servicios]
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
 *         description: Detalle obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   patch:
 *     summary: Actualiza un servicio principal
 *     tags: [Admin Servicios]
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
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Servicio actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   put:
 *     summary: Actualiza completamente un servicio principal
 *     tags: [Admin Servicios]
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
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Servicio actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /servicios/principales/{id}/status:
 *   patch:
 *     summary: Activa o desactiva un servicio principal
 *     tags: [Admin Servicios]
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
 *         description: Estado del servicio actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /servicios/adicionales:
 *   get:
 *     summary: Lista los servicios adicionales
 *     tags: [Admin Servicios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Servicios adicionales obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   post:
 *     summary: Crea un servicio adicional
 *     tags: [Admin Servicios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Servicio adicional creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /servicios/adicionales/{id}:
 *   get:
 *     summary: Obtiene el detalle de un servicio adicional
 *     tags: [Admin Servicios]
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
 *         description: Detalle obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   patch:
 *     summary: Actualiza un servicio adicional
 *     tags: [Admin Servicios]
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
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Servicio adicional actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   put:
 *     summary: Actualiza completamente un servicio adicional
 *     tags: [Admin Servicios]
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
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Servicio adicional actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /servicios/adicionales/{id}/status:
 *   patch:
 *     summary: Activa o desactiva un servicio adicional
 *     tags: [Admin Servicios]
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
 *         description: Estado del servicio adicional actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 */

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
