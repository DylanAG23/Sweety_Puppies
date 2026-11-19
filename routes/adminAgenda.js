const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminAgendaModule } = require('../adminAgenda');

const router = express.Router();
const { controller } = createAdminAgendaModule();

/**
 * @openapi
 * tags:
 *   - name: Admin Agenda
 *     description: Agenda operativa, bloqueos y detalle rápido de citas.
 *
 * /admin/agenda:
 *   get:
 *     summary: Consulta la agenda administrativa
 *     tags: [Admin Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: vista
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agenda obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /admin/agenda/citas/{id}:
 *   get:
 *     summary: Obtiene el detalle rápido de una cita desde agenda
 *     tags: [Admin Agenda]
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
 *
 * /admin/agenda/citas/{id}/confirm:
 *   patch:
 *     summary: Confirma una cita desde agenda
 *     tags: [Admin Agenda]
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
 *         description: Cita confirmada correctamente
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
 *                 cita:
 *                   type: object
 *                   additionalProperties: true
 *
 * /admin/agenda/bloqueos:
 *   get:
 *     summary: Lista los bloqueos de agenda
 *     tags: [Admin Agenda]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Bloqueos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 fecha:
 *                   type: string
 *                   format: date
 *                 bloqueos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *   post:
 *     summary: Crea un nuevo bloqueo de agenda
 *     tags: [Admin Agenda]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fecha, motivo]
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *               horaInicio:
 *                 type: string
 *               horaFin:
 *                 type: string
 *               motivo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bloqueo creado correctamente
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
 *                 bloqueo:
 *                   type: object
 *                   additionalProperties: true
 *
 * /admin/agenda/bloqueos/{id}/deactivate:
 *   patch:
 *     summary: Desactiva un bloqueo de agenda
 *     tags: [Admin Agenda]
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
 *         description: Bloqueo desactivado correctamente
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
 */

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.getAgenda);
router.get('/citas/:id', controller.getAppointmentDetail);
router.patch('/citas/:id/confirm', controller.confirmAppointment);
router.get('/bloqueos', controller.listBlocks);
router.post('/bloqueos', controller.createBlock);
router.patch('/bloqueos/:id/deactivate', controller.deactivateBlock);

module.exports = router;
