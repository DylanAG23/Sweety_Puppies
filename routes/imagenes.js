const router = require('./contenido');

/**
 * @openapi
 * /imagenes/activo:
 *   get:
 *     deprecated: true
 *     summary: Alias legacy de contenido activo
 *     description: Alias heredado. Para integraciones nuevas usar /contenido/activo.
 *     tags: [Legacy / Deprecated]
 *     responses:
 *       200:
 *         description: Contenido activo obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /imagenes:
 *   get:
 *     deprecated: true
 *     summary: Alias legacy del listado administrativo de contenido
 *     description: Alias heredado. Para integraciones nuevas usar /contenido.
 *     tags: [Legacy / Deprecated]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Publicaciones obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   post:
 *     deprecated: true
 *     summary: Alias legacy para crear contenido
 *     tags: [Legacy / Deprecated]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Publicación creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /imagenes/reordenar:
 *   post:
 *     deprecated: true
 *     summary: Alias legacy para reordenar contenido
 *     tags: [Legacy / Deprecated]
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
 *       200:
 *         description: Orden visual actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /imagenes/{id}:
 *   get:
 *     deprecated: true
 *     summary: Alias legacy del detalle de contenido
 *     tags: [Legacy / Deprecated]
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
 *         description: Publicación obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   patch:
 *     deprecated: true
 *     summary: Alias legacy para actualizar contenido
 *     tags: [Legacy / Deprecated]
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
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Publicación actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *   put:
 *     deprecated: true
 *     summary: Alias legacy para actualización completa de contenido
 *     tags: [Legacy / Deprecated]
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
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Publicación actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *
 * /imagenes/{id}/status:
 *   patch:
 *     deprecated: true
 *     summary: Alias legacy para cambiar el estado del contenido
 *     tags: [Legacy / Deprecated]
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
 *         description: Estado actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 */

module.exports = router;
