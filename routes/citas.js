const router = require('../legacy/backend/routes/citas');

/**
 * @openapi
 * tags:
 *   - name: Legacy / Deprecated
 *     description: Rutas antiguas mantenidas temporalmente por compatibilidad.
 *
 * /citas:
 *   get:
 *     deprecated: true
 *     summary: Lista citas del módulo legacy
 *     description: Ruta heredada del sistema anterior. Se mantiene por compatibilidad temporal y no debe usarse para integraciones nuevas.
 *     tags: [Legacy / Deprecated]
 *     responses:
 *       200:
 *         description: Citas legacy obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 additionalProperties: true
 *   post:
 *     deprecated: true
 *     summary: Crea una cita usando el módulo legacy
 *     description: Ruta heredada del sistema anterior. Usar en su lugar el módulo moderno de cliente o gestión administrativa.
 *     tags: [Legacy / Deprecated]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Cita creada en el módulo legacy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /citas/{id}:
 *   get:
 *     deprecated: true
 *     summary: Obtiene una cita legacy por ID
 *     tags: [Legacy / Deprecated]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cita legacy obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   put:
 *     deprecated: true
 *     summary: Actualiza una cita legacy
 *     tags: [Legacy / Deprecated]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Cita legacy actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   delete:
 *     deprecated: true
 *     summary: Elimina una cita legacy
 *     tags: [Legacy / Deprecated]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cita legacy eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /citas/fecha/{fecha}:
 *   get:
 *     deprecated: true
 *     summary: Lista citas legacy por fecha
 *     tags: [Legacy / Deprecated]
 *     parameters:
 *       - in: path
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Citas legacy por fecha obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 additionalProperties: true
 */

module.exports = router;
