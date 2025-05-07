// routes/mascota.js
const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

// GET: Obtener todas las mascotas
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM mascotas');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mascotas', error: error.message });
  }
});

// GET: Obtener mascotas por cédula del cliente
router.get('/cliente/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const result = await client.query(
      'SELECT * FROM mascotas WHERE cedula_cliente = $1',
      [cedula]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'No se encontraron mascotas para esta cédula' });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mascotas por cédula', error: error.message });
  }
});

// GET: Obtener mascota por cédula del cliente y nombre de la mascota
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

// POST: Crear una mascota solo si la cédula del cliente existe
router.post('/', async (req, res) => {
  const { id_mascota, nombre, tamano, sexo, edad, temperamento, cedula_cliente } = req.body;

  try {
    // Verificar si la cédula existe en la tabla clientes
    const clienteResult = await client.query(
      'SELECT cedula FROM clientes WHERE cedula = $1',
      [cedula_cliente]
    );

    if (clienteResult.rowCount === 0) {
      return res.status(400).json({ message: 'La cédula del cliente no está registrada' });
    }

    // Si la cédula existe, insertar la mascota
    await client.query(
      'INSERT INTO mascotas (id_mascota, nombre, tamano, sexo, edad, temperamento, cedula_cliente) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id_mascota, nombre, tamano, sexo, edad, temperamento, cedula_cliente]
    );

    res.status(201).json({ message: 'Mascota creada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear mascota', error: error.message });
  }
});


// PUT: Actualizar una mascota por ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tamano, sexo, edad, temperamento, cedula_cliente } = req.body;
  try {
    const result = await client.query(
      'UPDATE mascotas SET nombre=$1, tamano=$2, sexo=$3, edad=$4, temperamento=$5, cedula_cliente=$6 WHERE id_mascota=$7',
      [nombre, tamano, sexo, edad, temperamento, cedula_cliente, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json({ message: 'Mascota actualizada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar mascota', error: error.message });
  }
});

// DELETE: Eliminar una mascota por ID
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