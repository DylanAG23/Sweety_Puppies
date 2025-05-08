const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

/**
 * @swagger
 * tags:
 *   name: Servicios
 *   description: Endpoints para gestionar los servicios ofrecidos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Servicio:
 *       type: object
 *       required:
 *         - id_servicio
 *         - nombre
 *         - precio
 *       properties:
 *         id_servicio:
 *           type: integer
 *         nombre:
 *           type: string
 *         descripcion:
 *           type: string
 *         precio:
 *           type: number
 */

/**
 * @swagger
 * /servicios:
 *   get:
 *     summary: Obtener todos los servicios
 *     tags: [Servicios]
 *     responses:
 *       200:
 *         description: Lista de servicios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Servicio'
 */
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM servicios');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener servicios', error: error.message });
  }
});

/**
 * @swagger
 * /servicios/{id}:
 *   get:
 *     summary: Obtener un servicio por ID
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servicio
 *     responses:
 *       200:
 *         description: Servicio encontrado
 *       404:
 *         description: Servicio no encontrado
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM servicios WHERE id_servicio = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Servicio no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener servicio', error: error.message });
  }
});

/**
 * @swagger
 * /servicios:
 *   post:
 *     summary: Crear un nuevo servicio
 *     tags: [Servicios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Servicio'
 *     responses:
 *       201:
 *         description: Servicio creado exitosamente
 *       500:
 *         description: Error al crear servicio
 */
router.post('/', async (req, res) => {
  const { id_servicio, nombre, descripcion, precio } = req.body;
  try {
    await client.query(
      'INSERT INTO servicios (id_servicio, nombre, descripcion, precio) VALUES ($1, $2, $3, $4)',
      [id_servicio, nombre, descripcion, precio]
    );
    res.status(201).json({ message: 'Servicio creado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear servicio', error: error.message });
  }
});

/**
 * @swagger
 * /servicios/{id}:
 *   put:
 *     summary: Actualizar un servicio por ID
 *     tags: [Servicios]
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
 *             $ref: '#/components/schemas/Servicio'
 *     responses:
 *       200:
 *         description: Servicio actualizado
 *       404:
 *         description: Servicio no encontrado
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio } = req.body;
  try {
    const result = await client.query(
      'UPDATE servicios SET nombre=$1, descripcion=$2, precio=$3 WHERE id_servicio=$4',
      [nombre, descripcion, precio, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Servicio no encontrado' });
    res.json({ message: 'Servicio actualizado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar servicio', error: error.message });
  }
});

/**
 * @swagger
 * /servicios/{id}:
 *   delete:
 *     summary: Eliminar un servicio por ID
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Servicio eliminado exitosamente
 *       404:
 *         description: Servicio no encontrado
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM servicios WHERE id_servicio = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Servicio no encontrado' });
    res.json({ message: 'Servicio eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar servicio', error: error.message });
  }
});

module.exports = router;