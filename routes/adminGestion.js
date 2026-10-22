const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminServiceManagementModule } = require('../adminServiceManagement');

const router = express.Router();
const { controller } = createAdminServiceManagementModule();

/**
 * @openapi
 * components:
 *   schemas:
 *     AdminAppointmentListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         citas:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               estado:
 *                 type: string
 *                 example: pendiente
 *               fecha:
 *                 type: string
 *                 format: date
 *               horaInicio:
 *                 type: string
 *                 example: '09:00:00'
 *               clienteNombre:
 *                 type: string
 *                 example: Dylan Avellaneda
 *               mascotaNombre:
 *                 type: string
 *                 example: Lulu
 *               servicioNombre:
 *                 type: string
 *                 example: Bano completo
 *         filtros:
 *           type: object
 *           properties:
 *             estado:
 *               type: string
 *               example: pendiente
 *             busqueda:
 *               type: string
 *               example: lulu
 *     AdminAppointmentDetailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         cita:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             estado:
 *               type: string
 *               example: confirmada
 *             fecha:
 *               type: string
 *               format: date
 *             horaInicio:
 *               type: string
 *               example: '10:00:00'
 *             horaFinEstimada:
 *               type: string
 *               example: '12:30:00'
 *             cliente:
 *               type: object
 *               properties:
 *                 nombreCompleto:
 *                   type: string
 *                   example: Dylan Avellaneda
 *                 telefono:
 *                   type: string
 *                   example: '3223603616'
 *                 correo:
 *                   type: string
 *                   format: email
 *             mascota:
 *               type: object
 *               properties:
 *                 nombre:
 *                   type: string
 *                   example: Lulu
 *                 raza:
 *                   type: string
 *                   example: Criollo
 *                 tamano:
 *                   type: string
 *                   example: Grande
 *             servicio:
 *               type: object
 *               properties:
 *                 principal:
 *                   type: string
 *                   example: Bano completo
 *                 adicionales:
 *                   type: array
 *                   items:
 *                     type: string
 *             precioBase:
 *               type: number
 *               example: 85000
 *             precioCalculado:
 *               type: number
 *               example: 105000
 *             precioFinal:
 *               type: number
 *               example: 105000
 *     AdminAppointmentMutationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Operacion realizada correctamente.
 *         cita:
 *           type: object
 *           additionalProperties: true
 *     AdminAppointmentAttentionRequest:
 *       type: object
 *       properties:
 *         estadoPelajeReal:
 *           type: string
 *           example: normal
 *         comportamientoObservado:
 *           type: string
 *           example: normal
 *         observacionesDuranteServicio:
 *           type: string
 *           example: Estuvo tranquila durante el bano.
 *         servicioAdicionalIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         precioCalculado:
 *           type: number
 *           example: 115000
 *         precioFinal:
 *           type: number
 *           example: 115000
 *     AdminAppointmentFinalizeRequest:
 *       type: object
 *       properties:
 *         observacionesFinales:
 *           type: string
 *           example: Se realizo bano completo y corte de unas sin novedades.
 *         recomendaciones:
 *           type: string
 *           example: Cepillar el pelaje cada dos dias.
 *     AdminCompletedServicesListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         servicios:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               fechaServicio:
 *                 type: string
 *                 format: date
 *               clienteNombre:
 *                 type: string
 *                 example: Dylan Avellaneda
 *               mascotaNombre:
 *                 type: string
 *                 example: Lulu
 *               servicioPrincipal:
 *                 type: string
 *                 example: Bano completo
 *               precioFinal:
 *                 type: number
 *                 example: 105000
 *         filtros:
 *           type: object
 *           additionalProperties: true
 *     AdminCompletedServiceDetailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         servicio:
 *           type: object
 *           additionalProperties: true
 * tags:
 *   - name: Admin Gestión de Citas
 *     description: Operacion administrativa de citas y citas realizadas.
 *
 * /admin/gestion/citas:
 *   get:
 *     summary: Lista las citas operativas del negocio
 *     description: Permite filtrar el tablero operativo por estado y busqueda libre.
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [todas, pendiente, confirmada, en_atencion, completada, cancelada, reprogramada]
 *           example: pendiente
 *       - $ref: '#/components/parameters/SearchQuery'
 *     responses:
 *       200:
 *         description: Citas obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAppointmentListResponse'
 *             examples:
 *               tableroPendientes:
 *                 value:
 *                   success: true
 *                   citas:
 *                     - id: 73973d37-89fb-4880-aed6-620adf036769
 *                       estado: pendiente
 *                       fecha: '2026-04-26'
 *                       horaInicio: '09:00:00'
 *                       clienteNombre: Dylan Avellaneda
 *                       mascotaNombre: Lulu
 *                       servicioNombre: Bano completo
 *                   filtros:
 *                     estado: pendiente
 *                     busqueda: lulu
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/gestion/citas/{id}:
 *   get:
 *     summary: Obtiene el detalle completo de una cita
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Detalle de cita obtenido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAppointmentDetailResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/gestion/citas/{id}/confirm:
 *   patch:
 *     summary: Confirma una cita pendiente
 *     description: Confirma una cita pendiente y dispara la notificacion al cliente.
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Cita confirmada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAppointmentMutationResponse'
 *             examples:
 *               citaConfirmada:
 *                 value:
 *                   success: true
 *                   message: La cita fue confirmada correctamente.
 *                   cita:
 *                     id: 73973d37-89fb-4880-aed6-620adf036769
 *                     estado: confirmada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/gestion/citas/{id}/cancel:
 *   patch:
 *     summary: Cancela una cita desde administracion
 *     description: Cancela una cita desde el panel administrativo y registra un motivo obligatorio.
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivoCancelacion:
 *                 type: string
 *                 example: Se cerrara el local por mantenimiento urgente.
 *     responses:
 *       200:
 *         description: Cita cancelada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAppointmentMutationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/gestion/citas/{id}/start:
 *   patch:
 *     summary: Inicia una cita confirmada
 *     description: Cambia el estado de la cita a en_atencion cuando ya corresponde operarla.
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Cita iniciada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAppointmentMutationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/gestion/citas/{id}/attention:
 *   patch:
 *     summary: Guarda avances del panel de atencion
 *     description: Persiste observaciones parciales, comportamiento observado, estado real del pelaje y precio provisional.
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminAppointmentAttentionRequest'
 *           examples:
 *             avanceBasico:
 *               value:
 *                 estadoPelajeReal: normal
 *                 comportamientoObservado: normal
 *                 observacionesDuranteServicio: Estuvo tranquila durante el bano.
 *                 servicioAdicionalIds:
 *                   - 63f178c2-0866-4cfb-b36d-7edfae38cd6f
 *                 precioCalculado: 115000
 *                 precioFinal: 115000
 *     responses:
 *       200:
 *         description: Atencion actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAppointmentMutationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/gestion/citas/{id}/finalize:
 *   patch:
 *     summary: Finaliza una cita y la mueve al historial
 *     description: Cierra la atencion, marca la cita como completada y genera el registro en historial_citas.
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminAppointmentFinalizeRequest'
 *           examples:
 *             cierreBasico:
 *               value:
 *                 observacionesFinales: Se realizo bano completo y corte de unas sin novedades.
 *                 recomendaciones: Cepillar el pelaje cada dos dias.
 *     responses:
 *       200:
 *         description: Cita finalizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAppointmentMutationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/gestion/servicios:
 *   get:
 *     summary: Lista las citas realizadas del negocio
 *     description: Lista citas ya completadas para consulta historica desde administracion.
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/SearchQuery'
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Citas realizadas obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCompletedServicesListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/gestion/servicios/{id}:
 *   get:
 *     summary: Obtiene el detalle de una cita realizada
 *     tags: [Admin Gestión de Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Detalle de cita realizada obtenido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCompletedServiceDetailResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/citas', controller.listAppointments);
router.get('/citas/:id', controller.getAppointmentDetail);
router.patch('/citas/:id/confirm', controller.confirmAppointment);
router.patch('/citas/:id/cancel', controller.cancelAppointment);
router.patch('/citas/:id/start', controller.startAppointment);
router.patch('/citas/:id/attention', controller.updateAppointmentAttention);
router.patch('/citas/:id/finalize', controller.finalizeAppointment);

router.get('/servicios', controller.listCompletedServices);
router.get('/servicios/:id', controller.getCompletedServiceDetail);

module.exports = router;
