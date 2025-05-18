const express = require('express');
const router = express.Router();
const client = require('../baseDatos');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configuración de Supabase - Usar variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const BUCKET_NAME = process.env.BUCKET_NAME || 'imagenes';

// Verificar si las variables de entorno están disponibles
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Variables de entorno SUPABASE_URL y SUPABASE_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de multer para subida temporal de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../temp');
    // Asegurar que la carpeta existe
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para la imagen
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'imagen_' + uniqueSuffix + extension);
  }
});

// Filtro para permitir solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  }
});

/**
 * Sube un archivo a Supabase Storage
 * @param {string} filePath - Ruta del archivo local
 * @param {string} fileName - Nombre del archivo en Supabase
 * @returns {Promise<string>} - URL pública del archivo
 */
async function uploadToSupabase(filePath, fileName) {
  try {
    console.log(`Subiendo archivo ${fileName} a Supabase...`);
    
    // Determinar el tipo MIME
    const extension = path.extname(fileName).toLowerCase();
    let contentType = 'image/jpeg'; // Por defecto
    
    // Asignar el tipo MIME adecuado según la extensión
    if (extension === '.png') contentType = 'image/png';
    if (extension === '.gif') contentType = 'image/gif';
    if (extension === '.webp') contentType = 'image/webp';
    
    // Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);
    
    // Nombre de archivo en Supabase (usar timestamp para evitar colisiones)
    const storageFileName = `${Date.now()}_${fileName}`;
    
    // Subir a Supabase
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(`uploads/${storageFileName}`, fileBuffer, {
        contentType: contentType,
        upsert: false,
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Error de Supabase al subir archivo:', error);
      throw error;
    }
    
    console.log('Archivo subido exitosamente a Supabase');
    
    // Obtener la URL pública
    const { data: publicUrlData } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(`uploads/${storageFileName}`);
    
    // Eliminar el archivo temporal
    fs.unlinkSync(filePath);
    console.log(`Archivo temporal eliminado: ${filePath}`);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error al subir archivo a Supabase:', error);
    // Asegurarse de eliminar el archivo temporal en caso de error
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Archivo temporal eliminado después de error: ${filePath}`);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    throw error;
  }
}

/**
 * Elimina un archivo de Supabase Storage
 * @param {string} fileUrl - URL del archivo a eliminar
 */
async function deleteFromSupabase(fileUrl) {
  try {
    if (!fileUrl) {
      console.warn('URL de archivo vacía, no se puede eliminar');
      return;
    }
    
    // Extraer el nombre del archivo de la URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `uploads/${fileName}`;
    
    console.log(`Intentando eliminar archivo: ${filePath}`);
    
    const { error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Error de Supabase al eliminar archivo:', error);
      throw error;
    }
    
    console.log('Archivo eliminado de Supabase:', filePath);
  } catch (error) {
    console.error('Error al eliminar archivo de Supabase:', error);
    throw error;
  }
}

/**
 * @swagger
 * tags:
 *   name: Imagenes
 *   description: Endpoints para gestionar las imágenes del sistema
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Imagen:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *         - ruta
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         ruta:
 *           type: string
 *         descripcion:
 *           type: string
 *         categoria:
 *           type: string
 *         activo:
 *           type: boolean
 *         orden:
 *           type: integer
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *         fecha_actualizacion:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /imagenes:
 *   get:
 *     summary: Obtener todas las imágenes
 *     tags: [Imagenes]
 *     responses:
 *       200:
 *         description: Lista de imágenes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Imagen'
 */
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM imagenes ORDER BY orden');
    res.json(result.rows);
  } catch (error) {
    console.error('Error en GET /imagenes:', error);
    res.status(500).json({ message: 'Error al obtener imágenes', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/{id}:
 *   get:
 *     summary: Obtener una imagen por ID
 *     tags: [Imagenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la imagen
 *     responses:
 *       200:
 *         description: Imagen encontrada
 *       404:
 *         description: Imagen no encontrada
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM imagenes WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error en GET /imagenes/${id}:`, error);
    res.status(500).json({ message: 'Error al obtener imagen', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/categoria/{categoria}:
 *   get:
 *     summary: Obtener imágenes por categoría
 *     tags: [Imagenes]
 *     parameters:
 *       - in: path
 *         name: categoria
 *         required: true
 *         schema:
 *           type: string
 *         description: Categoría de las imágenes
 *     responses:
 *       200:
 *         description: Lista de imágenes de la categoría especificada
 */
router.get('/categoria/:categoria', async (req, res) => {
  const { categoria } = req.params;
  try {
    const result = await client.query('SELECT * FROM imagenes WHERE categoria = $1 ORDER BY orden', [categoria]);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error en GET /imagenes/categoria/${categoria}:`, error);
    res.status(500).json({ message: 'Error al obtener imágenes por categoría', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/upload:
 *   post:
 *     summary: Subir una nueva imagen al servidor
 *     tags: [Imagenes]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: imagen
 *         type: file
 *         description: Archivo de imagen a subir
 *       - in: formData
 *         name: nombre
 *         type: string
 *         description: Nombre de la imagen
 *       - in: formData
 *         name: descripcion
 *         type: string
 *         description: Descripción de la imagen
 *       - in: formData
 *         name: categoria
 *         type: string
 *         description: Categoría de la imagen
 *     responses:
 *       201:
 *         description: Imagen subida exitosamente
 *       400:
 *         description: Datos inválidos
 */
router.post('/upload', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ninguna imagen' });
    }

    const { nombre, descripcion, categoria, activo, orden } = req.body;
    
    // Validación básica
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    
    console.log('Procesando subida de imagen:', req.file.originalname);
    
    // Subir archivo a Supabase Storage
    const rutaCompleta = await uploadToSupabase(req.file.path, req.file.filename);
    
    console.log('URL pública obtenida:', rutaCompleta);
    
    const currentDate = new Date();
    
    const result = await client.query(
      'INSERT INTO imagenes (nombre, ruta, descripcion, categoria, activo, orden, fecha_creacion, fecha_actualizacion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        nombre, 
        rutaCompleta, 
        descripcion || '', 
        categoria || '', 
        activo !== undefined ? activo : true, 
        orden || 0, 
        currentDate, 
        currentDate
      ]
    );
    
    console.log('Imagen guardada en base de datos con ID:', result.rows[0].id);
    
    res.status(201).json({ 
      message: 'Imagen subida exitosamente', 
      imagen: result.rows[0]
    });
  } catch (error) {
    console.error('Error en POST /imagenes/upload:', error);
    // Eliminar archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Error al subir la imagen', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes:
 *   post:
 *     summary: Crear un registro de imagen (sin subir archivo)
 *     tags: [Imagenes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Imagen'
 *     responses:
 *       201:
 *         description: Imagen creada exitosamente
 *       400:
 *         description: Datos inválidos
 */
router.post('/', async (req, res) => {
  const { nombre, ruta, descripcion, categoria, activo, orden } = req.body;
  
  // Validación básica
  if (!nombre || !ruta) {
    return res.status(400).json({ message: 'Nombre y ruta son requeridos' });
  }
  
  try {
    const currentDate = new Date();
    
    const result = await client.query(
      'INSERT INTO imagenes (nombre, ruta, descripcion, categoria, activo, orden, fecha_creacion, fecha_actualizacion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [
        nombre, 
        ruta, 
        descripcion || '', 
        categoria || '', 
        activo !== undefined ? activo : true, 
        orden || 0, 
        currentDate, 
        currentDate
      ]
    );
    
    res.status(201).json({ 
      message: 'Imagen creada exitosamente', 
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Error en POST /imagenes:', error);
    res.status(500).json({ message: 'Error al crear imagen', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/update/{id}:
 *   put:
 *     summary: Actualizar una imagen con un nuevo archivo
 *     tags: [Imagenes]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: formData
 *         name: imagen
 *         type: file
 *         description: Nuevo archivo de imagen (opcional)
 *       - in: formData
 *         name: nombre
 *         type: string
 *         description: Nombre de la imagen
 *       - in: formData
 *         name: descripcion
 *         type: string
 *         description: Descripción de la imagen
 *       - in: formData
 *         name: categoria
 *         type: string
 *         description: Categoría de la imagen
 *     responses:
 *       200:
 *         description: Imagen actualizada exitosamente
 *       404:
 *         description: Imagen no encontrada
 */
router.put('/update/:id', upload.single('imagen'), async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, categoria, activo, orden } = req.body;
  
  try {
    // Verificar primero si la imagen existe
    const checkExisting = await client.query('SELECT * FROM imagenes WHERE id = $1', [id]);
    if (checkExisting.rowCount === 0) {
      // Si se subió un archivo pero la imagen no existe, eliminar el archivo temporal
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }
    
    const current = checkExisting.rows[0];
    let rutaImagen = current.ruta;
    
    // Si hay una nueva imagen, actualizar la ruta y eliminar la anterior
    if (req.file) {
      console.log(`Actualizando imagen para ID ${id}, reemplazando archivo existente`);
      
      // Subir nuevo archivo a Supabase Storage
      rutaImagen = await uploadToSupabase(req.file.path, req.file.filename);
      
      // Eliminar archivo anterior de Supabase Storage
      if (current.ruta && !current.ruta.includes('placeholder')) {
        try {
          await deleteFromSupabase(current.ruta);
        } catch (deleteError) {
          console.error('Error al eliminar imagen anterior:', deleteError);
          // Continuar con la actualización aunque no se pueda eliminar la imagen antigua
        }
      }
    }
    
    const result = await client.query(
      `UPDATE imagenes SET 
        nombre=$1, 
        ruta=$2, 
        descripcion=$3, 
        categoria=$4, 
        activo=$5, 
        orden=$6, 
        fecha_actualizacion=$7 
       WHERE id=$8 RETURNING *`,
      [
        nombre !== undefined ? nombre : current.nombre,
        rutaImagen,
        descripcion !== undefined ? descripcion : current.descripcion,
        categoria !== undefined ? categoria : current.categoria,
        activo !== undefined ? activo : current.activo,
        orden !== undefined ? orden : current.orden,
        new Date(),
        id
      ]
    );
    
    console.log(`Imagen ID ${id} actualizada exitosamente`);
    
    res.json({ 
      message: 'Imagen actualizada exitosamente', 
      imagen: result.rows[0]
    });
  } catch (error) {
    console.error(`Error en PUT /imagenes/update/${id}:`, error);
    // Eliminar archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Error al actualizar imagen', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/{id}:
 *   put:
 *     summary: Actualizar información de una imagen sin cambiar el archivo
 *     tags: [Imagenes]
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
 *             $ref: '#/components/schemas/Imagen'
 *     responses:
 *       200:
 *         description: Imagen actualizada exitosamente
 *       404:
 *         description: Imagen no encontrada
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, ruta, descripcion, categoria, activo, orden } = req.body;
  
  // Validación básica
  if (!nombre && !ruta && descripcion === undefined && categoria === undefined && activo === undefined && orden === undefined) {
    return res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
  }
  
  try {
    // Verificar primero si la imagen existe
    const checkExisting = await client.query('SELECT id FROM imagenes WHERE id = $1', [id]);
    if (checkExisting.rowCount === 0) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }
    
    // Obtener los valores actuales para mantener lo que no se actualiza
    const currentImage = await client.query('SELECT * FROM imagenes WHERE id = $1', [id]);
    const current = currentImage.rows[0];
    
    const result = await client.query(
      `UPDATE imagenes SET 
        nombre=$1, 
        ruta=$2, 
        descripcion=$3, 
        categoria=$4, 
        activo=$5, 
        orden=$6, 
        fecha_actualizacion=$7 
       WHERE id=$8 RETURNING *`,
      [
        nombre !== undefined ? nombre : current.nombre,
        ruta !== undefined ? ruta : current.ruta,
        descripcion !== undefined ? descripcion : current.descripcion,
        categoria !== undefined ? categoria : current.categoria,
        activo !== undefined ? activo : current.activo,
        orden !== undefined ? orden : current.orden,
        new Date(),
        id
      ]
    );
    
    res.json({ 
      message: 'Imagen actualizada exitosamente', 
      imagen: result.rows[0]
    });
  } catch (error) {
    console.error(`Error en PUT /imagenes/${id}:`, error);
    res.status(500).json({ message: 'Error al actualizar imagen', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/{id}:
 *   delete:
 *     summary: Eliminar una imagen por ID
 *     tags: [Imagenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Imagen eliminada exitosamente
 *       404:
 *         description: Imagen no encontrada
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar primero si la imagen existe
    const checkExisting = await client.query('SELECT * FROM imagenes WHERE id = $1', [id]);
    if (checkExisting.rowCount === 0) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }
    
    const imagenAEliminar = checkExisting.rows[0];
    
    // Eliminar el archivo de Supabase Storage
    if (imagenAEliminar.ruta && !imagenAEliminar.ruta.includes('placeholder')) {
      try {
        await deleteFromSupabase(imagenAEliminar.ruta);
      } catch (deleteError) {
        console.error('Error al eliminar archivo de Supabase:', deleteError);
        // Continuar con la eliminación aunque no se pueda eliminar el archivo
      }
    }
    
    const result = await client.query('DELETE FROM imagenes WHERE id = $1 RETURNING id, nombre', [id]);
    
    res.json({ 
      message: 'Imagen eliminada exitosamente',
      imagen: result.rows[0]
    });
  } catch (error) {
    console.error(`Error en DELETE /imagenes/${id}:`, error);
    res.status(500).json({ message: 'Error al eliminar imagen', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/toggle/{id}:
 *   patch:
 *     summary: Cambiar el estado activo/inactivo de una imagen
 *     tags: [Imagenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado de la imagen cambiado exitosamente
 *       404:
 *         description: Imagen no encontrada
 */
router.patch('/toggle/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar primero si la imagen existe
    const checkExisting = await client.query('SELECT id, activo FROM imagenes WHERE id = $1', [id]);
    if (checkExisting.rowCount === 0) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }
    
    const currentActive = checkExisting.rows[0].activo;
    const result = await client.query(
      'UPDATE imagenes SET activo = $1, fecha_actualizacion = $2 WHERE id = $3 RETURNING *',
      [!currentActive, new Date(), id]
    );
    
    res.json({ 
      message: `Imagen ${result.rows[0].activo ? 'activada' : 'desactivada'} exitosamente`,
      imagen: result.rows[0]
    });
  } catch (error) {
    console.error(`Error en PATCH /imagenes/toggle/${id}:`, error);
    res.status(500).json({ message: 'Error al cambiar estado de la imagen', error: error.message });
  }
});

/**
 * @swagger
 * /imagenes/reordenar:
 *   post:
 *     summary: Reordenar múltiples imágenes
 *     tags: [Imagenes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 orden:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Imágenes reordenadas exitosamente
 */
router.post('/reordenar', async (req, res) => {
  const items = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Se requiere un array de items con id y orden' });
  }
  
  try {
    await client.query('BEGIN');
    
    for (const item of items) {
      if (!item.id || item.orden === undefined) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Todos los items deben tener id y orden' });
      }
      
      await client.query(
        'UPDATE imagenes SET orden = $1, fecha_actualizacion = $2 WHERE id = $3',
        [item.orden, new Date(), item.id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ message: 'Imágenes reordenadas exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en POST /imagenes/reordenar:', error);
    res.status(500).json({ message: 'Error al reordenar imágenes', error: error.message });
  }
});

module.exports = router;