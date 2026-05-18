const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createClientHistoryModule } = require('../clientHistory');

const router = express.Router();
const { controller } = createClientHistoryModule();

/**
 * @openapi
 * tags:
 *   - name: Cliente Historial
 *     description: Historial y detalle de citas del cliente autenticado.
 *
 * /cliente/historial:
 *   get:
 *     summary: Obtiene el historial general del cliente
 *     tags: [Cliente Historial]
 *     security:
 *       - bearerAuth: []
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
 *                 citasActuales:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *                 serviciosRealizados:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *                 mascotas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       401:
 *         description: Token faltante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /cliente/historial/citas/{id}:
 *   get:
 *     summary: Obtiene el detalle de una cita actual del cliente
 *     tags: [Cliente Historial]
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
 *         description: Detalle de cita obtenido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 cita:
 *                   type: object
 *                   additionalProperties: true
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /cliente/historial/servicios/{id}:
 *   get:
 *     summary: Obtiene el detalle de una cita realizada del cliente
 *     tags: [Cliente Historial]
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
 *         description: Detalle del servicio realizado obtenido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 servicio:
 *                   type: object
 *                   additionalProperties: true
 *       404:
 *         description: Servicio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/', controller.getHistory);
router.get('/citas/:id', controller.getCurrentAppointmentDetail);
router.get('/servicios/:id', controller.getCompletedServiceDetail);

module.exports = router;
