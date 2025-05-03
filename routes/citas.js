const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

// GET: Obtener todas las citas
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM citas');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener citas', error: error.message });
  }
});

// GET: Obtener cita por ID
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

// POST: Crear una nueva cita
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

// PUT: Actualizar una cita
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

// DELETE: Eliminar una cita
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