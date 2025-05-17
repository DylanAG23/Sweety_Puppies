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
 *         duracion:
 *           type: integer
 *           description: Duración del servicio en minutos
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
    const result = await client.query('SELECT * FROM servicios ORDER BY id_servicio');
    res.json(result.rows);
  } catch (error) {
    console.error('Error en GET /servicios:', error);
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
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error en GET /servicios/${id}:`, error);
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
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Conflicto, ID de servicio ya existe
 *       500:
 *         description: Error al crear servicio
 */
router.post('/', async (req, res) => {
  const { id_servicio, nombre, descripcion, precio, duracion } = req.body;
  
  // Validación básica
  if (!id_servicio || !nombre || precio === undefined) {
    return res.status(400).json({ message: 'ID de servicio, nombre y precio son requeridos' });
  }
  
  try {
    // Verificar si ya existe un servicio con el mismo ID
    const checkExisting = await client.query('SELECT id_servicio FROM servicios WHERE id_servicio = $1', [id_servicio]);
    if (checkExisting.rowCount > 0) {
      return res.status(409).json({ 
        message: 'Error al crear servicio', 
        error: 'duplicate key value violates unique constraint' 
      });
    }
    
    await client.query(
      'INSERT INTO servicios (id_servicio, nombre, descripcion, precio, duracion) VALUES ($1, $2, $3, $4, $5)',
      [id_servicio, nombre, descripcion || '', precio, duracion || 0]
    );
    res.status(201).json({ message: 'Servicio creado exitosamente', id_servicio });
  } catch (error) {
    console.error('Error en POST /servicios:', error);
    // Manejar específicamente el error de clave duplicada
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(409).json({ 
        message: 'Error al crear servicio', 
        error: 'duplicate key value violates unique constraint' 
      });
    }
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
  const { nombre, descripcion, precio, duracion } = req.body;
  
  // Validación básica
  if (!nombre && precio === undefined && duracion === undefined && descripcion === undefined) {
    return res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
  }
  
  try {
    // Verificar primero si el servicio existe
    const checkExisting = await client.query('SELECT id_servicio FROM servicios WHERE id_servicio = $1', [id]);
    if (checkExisting.rowCount === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    const result = await client.query(
      'UPDATE servicios SET nombre=$1, descripcion=$2, precio=$3, duracion=$4 WHERE id_servicio=$5 RETURNING *',
      [nombre, descripcion || '', precio, duracion || 0, id]
    );
    
    res.json({ 
      message: 'Servicio actualizado exitosamente', 
      servicio: result.rows[0]
    });
  } catch (error) {
    console.error(`Error en PUT /servicios/${id}:`, error);
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
    // Verificar primero si el servicio existe
    const checkExisting = await client.query('SELECT id_servicio FROM servicios WHERE id_servicio = $1', [id]);
    if (checkExisting.rowCount === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    const result = await client.query('DELETE FROM servicios WHERE id_servicio = $1 RETURNING id_servicio, nombre', [id]);
    
    res.json({ 
      message: 'Servicio eliminado exitosamente',
      servicio: result.rows[0]
    });
  } catch (error) {
    console.error(`Error en DELETE /servicios/${id}:`, error);
    res.status(500).json({ message: 'Error al eliminar servicio', error: error.message });
  }
});

module.exports = router;