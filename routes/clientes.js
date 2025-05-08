const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

/**
 * @swagger
 * tags:
 *   name: Clientes
 *   description: Operaciones relacionadas con los clientes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Cliente:
 *       type: object
 *       required:
 *         - cedula
 *         - nombre
 *       properties:
 *         cedula:
 *           type: string
 *           description: Número de cédula del cliente
 *         nombre:
 *           type: string
 *         telefono:
 *           type: string
 *         direccion:
 *           type: string
 *         email:
 *           type: string
 */

/**
 * @swagger
 * /clientes:
 *   get:
 *     summary: Obtener todos los clientes
 *     tags: [Clientes]
 *     responses:
 *       200:
 *         description: Lista de todos los clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cliente'
 */
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM clientes');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
  }
});

/**
 * @swagger
 * /clientes/{cedula}:
 *   get:
 *     summary: Obtener un cliente por cédula
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *         description: Cédula del cliente
 *     responses:
 *       200:
 *         description: Datos del cliente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await client.query('SELECT * FROM clientes WHERE cedula = $1', [cedula]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cliente', error: error.message });
  }
});

/**
 * @swagger
 * /clientes:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *       500:
 *         description: Error al crear cliente
 */
router.post('/', async (req, res) => {
  const { cedula, nombre, telefono, direccion, email } = req.body;
  try {
    await client.query(
      'INSERT INTO clientes (cedula, nombre, telefono, direccion, email) VALUES ($1, $2, $3, $4, $5)',
      [cedula, nombre, telefono, direccion, email]
    );
    res.status(201).json({ message: 'Cliente creado', cedula, nombre, telefono, direccion, email });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear cliente', error: error.message });
  }
});

/**
 * @swagger
 * /clientes/{cedula}:
 *   put:
 *     summary: Actualizar un cliente por cédula
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *       404:
 *         description: Cliente no encontrado
 */
router.put('/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { nombre, telefono, direccion, email } = req.body;
  try {
    const result = await client.query(
      'UPDATE clientes SET nombre=$1, telefono=$2, direccion=$3, email=$4 WHERE cedula=$5',
      [nombre, telefono, direccion, email, cedula]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json({ message: 'Cliente actualizado', cedula, nombre, telefono, direccion, email });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar cliente', error: error.message });
  }
});

/**
 * @swagger
 * /clientes/{cedula}:
 *   delete:
 *     summary: Eliminar un cliente por cédula
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cliente eliminado
 *       404:
 *         description: Cliente no encontrado
 */
router.delete('/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await client.query('DELETE FROM clientes WHERE cedula = $1', [cedula]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
  }
});

module.exports = router;
