const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

/**
 * @swagger
 * tags:
 *   name: Citas
 *   description: Endpoints para gestionar las citas de mascotas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Cita:
 *       type: object
 *       required:
 *         - id_cita
 *         - fecha
 *         - hora
 *         - id_servicio
 *         - id_mascota
 *       properties:
 *         id_cita:
 *           type: integer
 *         fecha:
 *           type: string
 *           format: date
 *         hora:
 *           type: string
 *           format: time
 *         id_servicio:
 *           type: integer
 *         id_mascota:
 *           type: integer
 */

/**
 * @swagger
 * /citas:
 *   get:
 *     summary: Obtener todas las citas
 *     tags: [Citas]
 *     responses:
 *       200:
 *         description: Lista de citas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cita'
 */
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM citas');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener citas', error: error.message });
  }
});

/**
 * @swagger
 * /citas/{id}:
 *   get:
 *     summary: Obtener una cita por ID
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita encontrada
 *       404:
 *         description: Cita no encontrada
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM citas WHERE id_cita = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cita no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cita', error: error.message });
  }
});

/**
 * @swagger
 * /citas:
 *   post:
 *     summary: Crear una nueva cita
 *     tags: [Citas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cita'
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *       500:
 *         description: Error del servidor
 */
router.post('/', async (req, res) => {
  const { id_cita, fecha, hora, id_servicio, id_mascota } = req.body;
  try {
    await client.query(
      'INSERT INTO citas (id_cita, fecha, hora, id_servicio, id_mascota) VALUES ($1, $2, $3, $4, $5)',
      [id_cita, fecha, hora, id_servicio, id_mascota]
    );
    res.status(201).json({ message: 'Cita creada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear cita', error: error.message });
  }
});

/**
 * @swagger
 * /citas/{id}:
 *   put:
 *     summary: Actualizar una cita por ID
 *     tags: [Citas]
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
 *             $ref: '#/components/schemas/Cita'
 *     responses:
 *       200:
 *         description: Cita actualizada
 *       404:
 *         description: Cita no encontrada
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fecha, hora, id_servicio, id_mascota } = req.body;
  try {
    const result = await client.query(
      'UPDATE citas SET fecha=$1, hora=$2, id_servicio=$3, id_mascota=$4 WHERE id_cita=$5',
      [fecha, hora, id_servicio, id_mascota, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cita no encontrada' });
    res.json({ message: 'Cita actualizada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar cita', error: error.message });
  }
});

/**
 * @swagger
 * /citas/{id}:
 *   delete:
 *     summary: Eliminar una cita por ID
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cita eliminada exitosamente
 *       404:
 *         description: Cita no encontrada
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM citas WHERE id_cita = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cita no encontrada' });
    res.json({ message: 'Cita eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cita', error: error.message });
  }
});

module.exports = router;
