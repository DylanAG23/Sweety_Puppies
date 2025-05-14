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
 *         - cedula_cliente
 *       properties:
 *         id_mascota:
 *           type: integer
 *         nombre:
 *           type: string
 *         tamano:
 *           type: string
 *         sexo:
 *           type: string
 *         edad:
 *           type: integer
 *         temperamento:
 *           type: string
 *         cedula_cliente:
 *           type: string
 */

/**
 * @swagger
 * /mascotas:
 *   get:
 *     summary: Obtener todas las mascotas con información de clientes
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
    // Modificado para incluir información del cliente con un INNER JOIN
    const result = await client.query(`
      SELECT m.*, c.nombre AS nombre_cliente 
      FROM mascotas m
      INNER JOIN clientes c ON m.cedula_cliente = c.cedula
    `);
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
    // Verificar primero si el cliente existe
    const clienteResult = await client.query('SELECT * FROM clientes WHERE cedula = $1', [cedula]);
    if (clienteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    const result = await client.query(`
      SELECT m.*, c.nombre AS nombre_cliente 
      FROM mascotas m
      INNER JOIN clientes c ON m.cedula_cliente = c.cedula
      WHERE m.cedula_cliente = $1
    `, [cedula]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'No se encontraron mascotas para esta cédula' });
    }
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
 *         description: Cédula del cliente
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Nombre de la mascota
 *     responses:
 *       200:
 *         description: Mascota encontrada
 *       404:
 *         description: Mascota no encontrada
 */
router.get('/buscar', async (req, res) => {
  const { cedula, nombre } = req.query;
  let query = `
    SELECT m.*, c.nombre AS nombre_cliente 
    FROM mascotas m
    INNER JOIN clientes c ON m.cedula_cliente = c.cedula
    WHERE 1=1
  `;
  const queryParams = [];
  
  // Construir la consulta dinámicamente según los parámetros proporcionados
  if (cedula) {
    queryParams.push(cedula);
    query += ` AND m.cedula_cliente = $${queryParams.length}`;
  }
  
  if (nombre) {
    queryParams.push(`%${nombre}%`);
    query += ` AND m.nombre ILIKE $${queryParams.length}`;
  }
  
  try {
    const result = await client.query(query, queryParams);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'No se encontraron mascotas con esos criterios' });
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar mascota', error: error.message });
  }
});

/**
 * @swagger
 * /mascotas/{id}:
 *   get:
 *     summary: Obtener una mascota por ID
 *     tags: [Mascotas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la mascota
 *     responses:
 *       200:
 *         description: Datos de la mascota
 *       404:
 *         description: Mascota no encontrada
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(`
      SELECT m.*, c.nombre AS nombre_cliente 
      FROM mascotas m
      INNER JOIN clientes c ON m.cedula_cliente = c.cedula
      WHERE m.id_mascota = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mascota', error: error.message });
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
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error al crear mascota
 */
router.post('/', async (req, res) => {
  const { id_mascota, nombre, tamano, sexo, edad, temperamento, cedula_cliente } = req.body;
  
  try {
    // Verificar si el cliente existe
    const clienteResult = await client.query('SELECT * FROM clientes WHERE cedula = $1', [cedula_cliente]);
    if (clienteResult.rowCount === 0) {
      return res.status(400).json({ message: 'La cédula del cliente no está registrada' });
    }
    
    // Verificar si el ID ya existe (si se proporciona)
    if (id_mascota) {
      const existeResult = await client.query('SELECT * FROM mascotas WHERE id_mascota = $1', [id_mascota]);
      if (existeResult.rowCount > 0) {
        return res.status(400).json({ message: 'Ya existe una mascota con ese ID' });
      }
    }
    
    // Si no se proporciona un ID, obtener el siguiente ID disponible
    let idToUse = id_mascota;
    if (!idToUse) {
      const maxIdResult = await client.query('SELECT COALESCE(MAX(id_mascota), 0) + 1 as next_id FROM mascotas');
      idToUse = maxIdResult.rows[0].next_id;
    }
    
    await client.query(
      'INSERT INTO mascotas (id_mascota, nombre, tamano, sexo, edad, temperamento, cedula_cliente) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [idToUse, nombre, tamano, sexo, edad, temperamento, cedula_cliente]
    );
    
    res.status(201).json({ 
      message: 'Mascota creada',
      mascota: {
        id_mascota: idToUse,
        nombre,
        tamano,
        sexo,
        edad,
        temperamento,
        cedula_cliente
      }
    });
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
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Mascota no encontrada
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tamano, sexo, edad, temperamento, cedula_cliente } = req.body;
  
  try {
    // Verificar si la mascota existe
    const mascotaResult = await client.query('SELECT * FROM mascotas WHERE id_mascota = $1', [id]);
    if (mascotaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    
    // Verificar si el cliente existe (si se proporciona)
    if (cedula_cliente) {
      const clienteResult = await client.query('SELECT * FROM clientes WHERE cedula = $1', [cedula_cliente]);
      if (clienteResult.rowCount === 0) {
        return res.status(400).json({ message: 'La cédula del cliente no está registrada' });
      }
    }
    
    // Construir la consulta dinámicamente
    let query = 'UPDATE mascotas SET ';
    const queryParams = [];
    const updateFields = [];
    
    if (nombre !== undefined) {
      queryParams.push(nombre);
      updateFields.push(`nombre = $${queryParams.length}`);
    }
    
    if (tamano !== undefined) {
      queryParams.push(tamano);
      updateFields.push(`tamano = $${queryParams.length}`);
    }
    
    if (sexo !== undefined) {
      queryParams.push(sexo);
      updateFields.push(`sexo = $${queryParams.length}`);
    }
    
    if (edad !== undefined) {
      queryParams.push(edad);
      updateFields.push(`edad = $${queryParams.length}`);
    }
    
    if (temperamento !== undefined) {
      queryParams.push(temperamento);
      updateFields.push(`temperamento = $${queryParams.length}`);
    }

    if (cedula_cliente !== undefined) {
      queryParams.push(cedula_cliente);
      updateFields.push(`cedula_cliente = $${queryParams.length}`);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos para actualizar' });
    }
    
    query += updateFields.join(', ');
    queryParams.push(id);
    query += ` WHERE id_mascota = $${queryParams.length}`;
    
    const result = await client.query(query, queryParams);
    
    // Obtener la información actualizada de la mascota
    const updatedMascota = await client.query(`
      SELECT m.*, c.nombre AS nombre_cliente 
      FROM mascotas m
      INNER JOIN clientes c ON m.cedula_cliente = c.cedula
      WHERE m.id_mascota = $1
    `, [id]);
    
    res.json({ 
      message: 'Mascota actualizada',
      mascota: updatedMascota.rows[0]
    });
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
    const result = await client.query('DELETE FROM mascotas WHERE id_mascota = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    res.json({ 
      message: 'Mascota eliminada',
      mascota: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar mascota', error: error.message });
  }
});

module.exports = router;