// routes/cliente.js
const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

// GET: Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM cliente');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
  }
});

// GET: Obtener cliente por cédula
router.get('/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await client.query('SELECT * FROM cliente WHERE cedula = $1', [cedula]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cliente', error: error.message });
  }
});

// POST: Crear un cliente
router.post('/', async (req, res) => {
  const { cedula, nombre, telefono, direccion } = req.body;
  try {
    await client.query(
      'INSERT INTO cliente (cedula, nombre, telefono, direccion) VALUES ($1, $2, $3, $4)',
      [cedula, nombre, telefono, direccion]
    );
    res.status(201).json({ message: 'Cliente creado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear cliente', error: error.message });
  }
});

// PUT: Actualizar un cliente
router.put('/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { nombre, telefono, direccion } = req.body;
  try {
    const result = await client.query(
      'UPDATE cliente SET nombre=$1, telefono=$2, direccion=$3 WHERE cedula=$4',
      [nombre, telefono, direccion, cedula]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json({ message: 'Cliente actualizado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar cliente', error: error.message });
  }
});

// DELETE: Eliminar un cliente
router.delete('/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await client.query('DELETE FROM cliente WHERE cedula = $1', [cedula]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
  }
});

module.exports = router;