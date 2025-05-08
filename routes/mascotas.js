const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

/**
 * @swagger
 * tags:
 *   name: Mascotas
 *   description: Endpoints para gestionar las mascotas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Mascota:
 *       type: object
 *       required:
 *         - nombre
 *         - especie
 *         - cedula_cliente
 *       properties:
 *         id_mascota:
 *           type: integer
 *         nombre:
 *           type: string
 *         especie:
 *           type: string
 *         raza:
 *           type: string
 *         edad:
 *           type: integer
 *         peso:
 *           type: number
 *         cedula_cliente:
 *           type: string
 */

/**
 * @swagger
 * /mascotas:
 *   get:
 *     summary: Obtener todas las mascotas
 *     tags: [Mascotas]
 *     responses:
 *       200:
 *         description: Lista de mascotas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mascota'
 */
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM mascotas');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mascotas', error: error.message });
  }
});

/**
 * @swagger
 * /mascotas/cliente/{cedula}:
 *   get:
 *     summary: Obtener mascotas por cédula del cliente
 *     tags: [Mascotas]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mascotas del cliente
 *       404:
 *         description: No se encontraron mascotas
 */
router.get('/cliente/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await client.query('SELECT * FROM mascotas WHERE cedula_cliente = $1', [cedula]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'No se encontraron mascotas para esta cédula' });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mascotas por cédula', error: error.message });
  }
});

/**
 * @swagger
 * /mascotas/buscar:
 *   get:
 *     summary: Obtener una mascota por cédula del cliente y nombre
 *     tags: [Mascotas]
 *     parameters:
 *       - in: query
 *         name: cedula
 *         schema:
 *           type: string
 *         required: true
 *         description: Cédula del cliente
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         required: true
 *         description: Nombre de la mascota
 *     responses:
 *       200:
 *         description: Mascota encontrada
 *       404:
 *         description: Mascota no encontrada
 */
router.get('/buscar', async (req, res) => {
  const { cedula, nombre } = req.query;
  try {
    const result = await client.query(
      'SELECT * FROM mascotas WHERE cedula_cliente = $1 AND nombre = $2',
      [cedula, nombre]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mascota no encontrada con esa cédula y nombre' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar mascota', error: error.message });
  }
});

/**
 * @swagger
 * /mascotas:
 *   post:
 *     summary: Registrar una nueva mascota
 *     tags: [Mascotas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Mascota'
 *     responses:
 *       201:
 *         description: Mascota registrada
 *       500:
 *         description: Error al crear mascota
 */
router.post('/', async (req, res) => {
  const { id_mascota, nombre, especie, raza, edad, peso, cedula_cliente } = req.body;
  try {
    await client.query(
      'INSERT INTO mascotas (id_mascota, nombre, especie, raza, edad, peso, cedula_cliente) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id_mascota, nombre, especie, raza, edad, peso, cedula_cliente]
    );
    res.status(201).json({ message: 'Mascota creada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear mascota', error: error.message });
  }
});

/**
 * @swagger
 * /mascotas/{id}:
 *   put:
 *     summary: Actualizar una mascota por ID
 *     tags: [Mascotas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la mascota
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Mascota'
 *     responses:
 *       200:
 *         description: Mascota actualizada
 *       404:
 *         description: Mascota no encontrada
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, especie, raza, edad, peso } = req.body;
  try {
    const result = await client.query(
      'UPDATE mascotas SET nombre=$1, especie=$2, raza=$3, edad=$4, peso=$5 WHERE id_mascota=$6',
      [nombre, especie, raza, edad, peso, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json({ message: 'Mascota actualizada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar mascota', error: error.message });
  }
});

/**
 * @swagger
 * /mascotas/{id}:
 *   delete:
 *     summary: Eliminar una mascota por ID
 *     tags: [Mascotas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mascota eliminada exitosamente
 *       404:
 *         description: Mascota no encontrada
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM mascotas WHERE id_mascota = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json({ message: 'Mascota eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar mascota', error: error.message });
  }
});

module.exports = router;