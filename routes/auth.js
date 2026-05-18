const express = require('express');
const { createAuthModule } = require('../auth');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const { controller } = createAuthModule();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Autenticación, registro, recuperación de contraseña y perfil del cliente.
 *
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: No tienes permisos para acceder a este recurso
 *       required:
 *         - success
 *         - message
 *     AuthUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         rol:
 *           type: string
 *           enum: [cliente, administrador]
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         clienteId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         administradorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *     ClienteProfile:
 *       type: object
 *       properties:
 *         clienteId:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         telefono:
 *           type: string
 *         direccion:
 *           type: string
 *           nullable: true
 *         cedula:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *     AdminProfile:
 *       type: object
 *       properties:
 *         administradorId:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         telefono:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *     ClientSummary:
 *       type: object
 *       properties:
 *         mascotasCount:
 *           type: integer
 *           example: 2
 *         nextAppointment:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             fecha:
 *               type: string
 *               format: date
 *             hora_inicio:
 *               type: string
 *               example: '09:00:00'
 *             servicio_nombre:
 *               type: string
 *             mascota_nombre:
 *               type: string
 *             estado:
 *               type: string
 *         lastService:
 *           type: object
 *           nullable: true
 *           properties:
 *             fecha_servicio:
 *               type: string
 *               format: date-time
 *             servicio_principal_nombre:
 *               type: string
 *             mascota_nombre:
 *               type: string
 *             precio_final:
 *               type: number
 *               format: float
 *     ClientHomeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         profile:
 *           $ref: '#/components/schemas/ClienteProfile'
 *         about:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             description:
 *               type: string
 *             location:
 *               type: string
 *             note:
 *               type: string
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *                 nullable: true
 *               ruta:
 *                 type: string
 *               categoria:
 *                 type: string
 *               orden:
 *                 type: integer
 *         summary:
 *           $ref: '#/components/schemas/ClientSummary'
 *         quickLinks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               href:
 *                 type: string
 *               description:
 *                 type: string
 *     AdminHomeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         profile:
 *           $ref: '#/components/schemas/AdminProfile'
 *         summary:
 *           type: object
 *           additionalProperties: true
 *         about:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             description:
 *               type: string
 *             note:
 *               type: string
 *
 * /auth/register/initiate:
 *   post:
 *     summary: Inicia el registro de un nuevo cliente
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, cedula, telefono, email, password, confirmPassword]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Dylan
 *               apellido:
 *                 type: string
 *                 example: Avellaneda
 *               cedula:
 *                 type: string
 *                 example: '1003882041'
 *               telefono:
 *                 type: string
 *                 example: '3223603616'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: dylan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MiClave123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: MiClave123
 *     responses:
 *       200:
 *         description: Código de verificación generado
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
 *                 email:
 *                   type: string
 *                   format: email
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 developmentCode:
 *                   type: string
 *                   nullable: true
 *                 emailDeliveryMode:
 *                   type: string
 *                   enum: [sent, fallback]
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/register/verify:
 *   post:
 *     summary: Verifica el código y crea la cuenta del cliente
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, codigo]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               codigo:
 *                 type: string
 *                 example: '483921'
 *     responses:
 *       201:
 *         description: Cuenta creada correctamente
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
 *                 usuario:
 *                   type: object
 *                   additionalProperties: true
 *                 cliente:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Código inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/login:
 *   post:
 *     summary: Inicia sesión y devuelve el JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: dylan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MiClave123
 *     responses:
 *       200:
 *         description: Sesión iniciada
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
 *                   example: Inicio de sesión exitoso
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *                 redirectTo:
 *                   type: string
 *                   example: /cliente
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuario inactivo o sin acceso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/password-recovery/request:
 *   post:
 *     summary: Solicita un código para recuperar la contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Solicitud procesada
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
 *                 email:
 *                   type: string
 *                   format: email
 *                 developmentCode:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Correo inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/password-recovery/verify:
 *   post:
 *     summary: Verifica el código de recuperación
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, codigo]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               codigo:
 *                 type: string
 *                 example: '483921'
 *     responses:
 *       200:
 *         description: Código válido
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
 *       400:
 *         description: Código inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/password-recovery/reset:
 *   post:
 *     summary: Actualiza la contraseña usando un código de recuperación
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, codigo, password, confirmPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               codigo:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Contraseña actualizada
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
 *       400:
 *         description: Datos inválidos o código expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cuenta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/me/admin-home:
 *   get:
 *     summary: Obtiene el resumen del inicio administrativo
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Panel administrativo cargado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminHomeResponse'
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
 *       404:
 *         description: Perfil administrativo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/me/client-home:
 *   get:
 *     summary: Obtiene el resumen del inicio del cliente
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portal del cliente cargado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientHomeResponse'
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
 *       404:
 *         description: Perfil de cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/me/profile:
 *   get:
 *     summary: Obtiene el perfil del cliente autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profile:
 *                   $ref: '#/components/schemas/ClienteProfile'
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
 *       404:
 *         description: Cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Actualiza el perfil del cliente autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [telefono]
 *             properties:
 *               telefono:
 *                 type: string
 *                 example: '3223603616'
 *               direccion:
 *                 type: string
 *                 nullable: true
 *                 example: Calle 12 # 45-67
 *     responses:
 *       200:
 *         description: Perfil actualizado
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
 *                   example: Perfil actualizado correctamente
 *                 profile:
 *                   $ref: '#/components/schemas/ClienteProfile'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *       404:
 *         description: Cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.post('/register/initiate', controller.initiateRegistration);
router.post('/register/verify', controller.verifyRegistration);
router.post('/login', controller.login);
router.post('/password-recovery/request', controller.requestPasswordRecovery);
router.post('/password-recovery/verify', controller.verifyPasswordRecoveryCode);
router.post('/password-recovery/reset', controller.resetPasswordWithRecoveryCode);
router.get('/me/admin-home', authenticateToken, authorizeRoles('administrador'), controller.getAdminHome);
router.get('/me/client-home', authenticateToken, authorizeRoles('cliente'), controller.getClientHome);
router.get('/me/profile', authenticateToken, authorizeRoles('cliente'), controller.getClientProfile);
router.patch('/me/profile', authenticateToken, authorizeRoles('cliente'), controller.updateClientProfile);

module.exports = router;
