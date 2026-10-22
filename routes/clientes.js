const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminClientsModule } = require('../adminClients');

const router = express.Router();
const { controller } = createAdminClientsModule();

/**
 * @openapi
 * tags:
 *   - name: Admin Clientes
 *     description: Consulta y actualización de clientes desde administración.
 *
 * /clientes:
 *   get:
 *     summary: Lista clientes del portal
 *     tags: [Admin Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Búsqueda por nombre, apellido, cédula, teléfono o correo.
 *     responses:
 *       200:
 *         description: Clientes obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 clientes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *                 search:
 *                   type: string
 *
 * /clientes/{id}:
 *   get:
 *     summary: Obtiene el detalle de un cliente
 *     tags: [Admin Clientes]
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
 *         description: Cliente obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 cliente:
 *                   type: object
 *                   additionalProperties: true
 *       404:
 *         description: Cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Actualiza un cliente desde administración
 *     tags: [Admin Clientes]
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
 *               apellido:
 *                 type: string
 *               telefono:
 *                 type: string
 *               telefono_secundario:
 *                 type: string
 *               direccion:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cliente actualizado correctamente
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
 *                 cliente:
 *                   type: object
 *                   additionalProperties: true
 */

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.listClients);
router.get('/:id', controller.getClientDetail);
router.patch('/:id', controller.updateClient);

module.exports = router;
