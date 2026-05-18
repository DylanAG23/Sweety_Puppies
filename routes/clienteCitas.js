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

/**
 * @openapi
 * components:
 *   schemas:
 *     ClientAppointmentFormOptionsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         mascotas:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               nombre:
 *                 type: string
 *                 example: Lulu
 *               raza:
 *                 type: string
 *                 example: Criollo
 *               tamano:
 *                 type: string
 *                 example: pequeno
 *         servicios:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               nombre:
 *                 type: string
 *                 example: Bano completo
 *               duracionMinutos:
 *                 type: integer
 *                 example: 120
 *         serviciosAdicionales:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               nombre:
 *                 type: string
 *                 example: Hidratacion profunda
 *         fechaMinimaAgenda:
 *           type: string
 *           format: date
 *           example: '2026-04-24'
 *     ClientAppointmentQuoteRequest:
 *       type: object
 *       required: [mascotaId, servicioId, estadoPelajeReportado, comportamientoReportado]
 *       properties:
 *         mascotaId:
 *           type: string
 *           format: uuid
 *         servicioId:
 *           type: string
 *           format: uuid
 *         servicioAdicionalIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         estadoPelajeReportado:
 *           type: string
 *           enum: [normal, con_nudos, muy_enredado]
 *         comportamientoReportado:
 *           type: string
 *           enum: [normal, sensible, agresivo]
 *         observacionesCliente:
 *           type: string
 *           nullable: true
 *     ClientAppointmentQuoteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         quote:
 *           type: object
 *           properties:
 *             precioBase:
 *               type: number
 *               example: 85000
 *             precioAdicionales:
 *               type: number
 *               example: 20000
 *             recargoNudos:
 *               type: number
 *               example: 10000
 *             recargoComportamiento:
 *               type: number
 *               example: 0
 *             precioCalculado:
 *               type: number
 *               example: 115000
 *             duracionMinutos:
 *               type: integer
 *               example: 150
 *     ClientAppointmentAvailabilityResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         fecha:
 *           type: string
 *           format: date
 *           example: '2026-04-26'
 *         duracionMinutos:
 *           type: integer
 *           example: 150
 *         horarios:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               horaInicio:
 *                 type: string
 *                 example: '09:00:00'
 *               horaFin:
 *                 type: string
 *                 example: '11:30:00'
 *         mensaje:
 *           type: string
 *           nullable: true
 *     ClientAppointmentCreatedResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Cita registrada correctamente y pendiente de confirmacion.
 *         cita:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             estado:
 *               type: string
 *               example: pendiente
 *             fecha:
 *               type: string
 *               format: date
 *             horaInicio:
 *               type: string
 *               example: '09:00:00'
 *             precioCalculado:
 *               type: number
 *               example: 115000
 *         warnings:
 *           type: array
 *           items:
 *             type: string
 *     ClientAppointmentMutationResponse:
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
 * tags:
 *   - name: Cliente Citas
 *     description: Flujo de agendamiento y seguimiento de citas desde el portal del cliente.
 *
 * /cliente/citas/admin-review:
 *   get:
 *     summary: Muestra la pagina HTML de revision administrativa de una cita
 *     description: Renderiza la vista HTML que usa la administracion para aprobar o rechazar una cita pendiente.
 *     tags: [Cliente Citas]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: HTML de revision generado correctamente
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Token invalido o expirado
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *
 * /cliente/citas/admin-review/action:
 *   get:
 *     summary: Procesa una decision administrativa enviada por enlace
 *     tags: [Cliente Citas]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: decision
 *         required: true
 *         schema:
 *           type: string
 *           enum: [confirmar, rechazar]
 *     responses:
 *       200:
 *         description: HTML con el resultado de la decision
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *   post:
 *     summary: Procesa una decision administrativa enviada por formulario HTML
 *     tags: [Cliente Citas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [token, decision]
 *             properties:
 *               token:
 *                 type: string
 *               decision:
 *                 type: string
 *                 enum: [confirmar, rechazar]
 *     responses:
 *       200:
 *         description: HTML con el resultado de la decision
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *
 * /cliente/citas/form-options:
 *   get:
 *     summary: Obtiene mascotas, servicios y adicionales para el formulario de agendamiento
 *     description: Devuelve el catalogo minimo necesario para que el cliente construya una cita desde el portal.
 *     tags: [Cliente Citas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Opciones del formulario cargadas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientAppointmentFormOptionsResponse'
 *             examples:
 *               opcionesBase:
 *                 value:
 *                   success: true
 *                   mascotas:
 *                     - id: 5dcfb0bb-67c0-4a5d-bf6d-2330c2dcb3f6
 *                       nombre: Lulu
 *                       raza: Criollo
 *                       tamano: pequeno
 *                   servicios:
 *                     - id: 9aa1d1e3-07b4-4210-a246-8735b31a93e8
 *                       nombre: Bano completo
 *                       duracionMinutos: 120
 *                   serviciosAdicionales:
 *                     - id: 63f178c2-0866-4cfb-b36d-7edfae38cd6f
 *                       nombre: Hidratacion profunda
 *                   fechaMinimaAgenda: '2026-04-24'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /cliente/citas/quote:
 *   post:
 *     summary: Calcula la cotizacion estimada de una cita
 *     description: Evalua servicio principal, tamano, pelaje, comportamiento y adicionales para devolver una estimacion previa al agendamiento.
 *     tags: [Cliente Citas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientAppointmentQuoteRequest'
 *           examples:
 *             banoCompleto:
 *               value:
 *                 mascotaId: 5dcfb0bb-67c0-4a5d-bf6d-2330c2dcb3f6
 *                 servicioId: 9aa1d1e3-07b4-4210-a246-8735b31a93e8
 *                 servicioAdicionalIds:
 *                   - 63f178c2-0866-4cfb-b36d-7edfae38cd6f
 *                 estadoPelajeReportado: con_nudos
 *                 comportamientoReportado: normal
 *                 observacionesCliente: Tiene algunos nudos en el lomo.
 *     responses:
 *       200:
 *         description: Cotizacion generada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientAppointmentQuoteResponse'
 *             examples:
 *               cotizacionBase:
 *                 value:
 *                   success: true
 *                   quote:
 *                     precioBase: 85000
 *                     precioAdicionales: 20000
 *                     recargoNudos: 10000
 *                     recargoComportamiento: 0
 *                     precioCalculado: 115000
 *                     duracionMinutos: 150
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /cliente/citas/availability:
 *   get:
 *     summary: Consulta los horarios disponibles para una fecha y configuracion de cita
 *     description: Calcula los slots disponibles teniendo en cuenta duracion del servicio, adicionales, bloqueos y citas ocupadas.
 *     tags: [Cliente Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mascotaId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: servicioId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: servicioAdicionalIds
 *         schema:
 *           type: string
 *           description: Lista separada por comas o JSON array serializado.
 *       - in: query
 *         name: estadoPelajeReportado
 *         schema:
 *           type: string
 *           enum: [normal, con_nudos, muy_enredado]
 *       - in: query
 *         name: comportamientoReportado
 *         schema:
 *           type: string
 *           enum: [normal, sensible, agresivo]
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Disponibilidad consultada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientAppointmentAvailabilityResponse'
 *             examples:
 *               disponibilidadManana:
 *                 value:
 *                   success: true
 *                   fecha: '2026-04-26'
 *                   duracionMinutos: 150
 *                   horarios:
 *                     - horaInicio: '09:00:00'
 *                       horaFin: '11:30:00'
 *                     - horaInicio: '13:00:00'
 *                       horaFin: '15:30:00'
 *                   mensaje: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /cliente/citas:
 *   post:
 *     summary: Crea una nueva cita del cliente
 *     description: Registra una solicitud de cita pendiente de confirmacion administrativa. Puede incluir foto del estado actual.
 *     tags: [Cliente Citas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [mascotaId, servicioId, estadoPelajeReportado, comportamientoReportado, fecha, horaInicio]
 *             properties:
 *               mascotaId:
 *                 type: string
 *                 format: uuid
 *               servicioId:
 *                 type: string
 *                 format: uuid
 *               servicioAdicionalIds:
 *                 type: string
 *                 description: Lista JSON serializada o ids separados por comas.
 *               estadoPelajeReportado:
 *                 type: string
 *                 enum: [normal, con_nudos, muy_enredado]
 *               comportamientoReportado:
 *                 type: string
 *                 enum: [normal, sensible, agresivo]
 *               observacionesCliente:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date
 *               horaInicio:
 *                 type: string
 *                 example: '09:00:00'
 *               fotoEstadoActual:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Cita creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientAppointmentCreatedResponse'
 *             examples:
 *               citaPendiente:
 *                 value:
 *                   success: true
 *                   message: Cita registrada correctamente y pendiente de confirmacion.
 *                   cita:
 *                     id: 73973d37-89fb-4880-aed6-620adf036769
 *                     estado: pendiente
 *                     fecha: '2026-04-26'
 *                     horaInicio: '09:00:00'
 *                     precioCalculado: 115000
 *                   warnings: []
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /cliente/citas/{id}/cancel:
 *   patch:
 *     summary: Cancela una cita pendiente o confirmada del cliente
 *     description: Permite al cliente retirar una cita antes de la atencion e informar el motivo por correo.
 *     tags: [Cliente Citas]
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
 *                 example: Se presento una urgencia familiar.
 *     responses:
 *       200:
 *         description: Cita cancelada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientAppointmentMutationResponse'
 *             examples:
 *               cancelacionCliente:
 *                 value:
 *                   success: true
 *                   message: La cita fue cancelada correctamente.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /cliente/citas/{id}/reprogram:
 *   patch:
 *     summary: Reprograma una cita pendiente o confirmada
 *     description: Cambia la fecha y hora de una cita pendiente o confirmada. Despues de reprogramar queda nuevamente pendiente de confirmacion.
 *     tags: [Cliente Citas]
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
 *             required: [fecha, horaInicio]
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *               horaInicio:
 *                 type: string
 *                 example: '10:00:00'
 *     responses:
 *       200:
 *         description: Cita reprogramada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientAppointmentMutationResponse'
 *             examples:
 *               citaReprogramada:
 *                 value:
 *                   success: true
 *                   message: La cita fue reprogramada correctamente.
 *                   cita:
 *                     id: 73973d37-89fb-4880-aed6-620adf036769
 *                     estado: pendiente
 *                     fecha: '2026-04-28'
 *                     horaInicio: '10:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

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
