const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

// GET: Obtener todos los servicios
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM servicios');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener servicios', error: error.message });
  }
});

// GET: Obtener un servicio por ID
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

// POST: Crear un nuevo servicio
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

// PUT: Actualizar un servicio por ID
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

// DELETE: Eliminar un servicio por ID
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