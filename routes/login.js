const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const client = require('../baseDatos');

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario
 *               - contrasena
 *             properties:
 *               usuario:
 *                 type: string
 *                 description: Nombre de usuario
 *               contrasena:
 *                 type: string
 *                 description: Contraseña del usuario
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     cedula:
 *                       type: string
 *                     usuario:
 *                       type: string
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Credenciales incorrectas
 *       500:
 *         description: Error del servidor
 */
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    // Validar que se envíen los datos requeridos
    if (!usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    // Buscar el usuario en la base de datos
    const query = `
      SELECT cedula, usuario, contrasena
      FROM usuarios 
      WHERE usuario = $1
    `;
    
    const result = await client.query(query, [usuario]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const usuarioEncontrado = result.rows[0];

    // Verificar la contraseña
    const contrasenaValida = await bcrypt.compare(contrasena, usuarioEncontrado.contrasena);

    if (!contrasenaValida) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        cedula: usuarioEncontrado.cedula,
        usuario: usuarioEncontrado.usuario
      },
      process.env.JWT_SECRET || 'sweetypuppies_secret_key',
      { expiresIn: '24h' }
    );

    // Respuesta exitosa (sin enviar la contraseña)
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        cedula: usuarioEncontrado.cedula,
        usuario: usuarioEncontrado.usuario
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cedula
 *               - usuario
 *               - contrasena
 *             properties:
 *               cedula:
 *                 type: string
 *               usuario:
 *                 type: string
 *               contrasena:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos o usuario ya existe
 *       500:
 *         description: Error del servidor
 */
router.post('/register', async (req, res) => {
  try {
    const { cedula, usuario, contrasena } = req.body;

    // Validar datos requeridos
    if (!cedula || !usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Cédula, usuario y contraseña son requeridos'
      });
    }

    // Verificar si la cédula o usuario ya existen
    const existeUsuario = await client.query(
      'SELECT cedula FROM usuarios WHERE cedula = $1 OR usuario = $2',
      [cedula, usuario]
    );

    if (existeUsuario.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'La cédula o usuario ya están registrados'
      });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const contrasenaHash = await bcrypt.hash(contrasena, saltRounds);

    // Insertar nuevo usuario
    const nuevoUsuario = await client.query(`
      INSERT INTO usuarios (cedula, usuario, contrasena)
      VALUES ($1, $2, $3)
      RETURNING cedula, usuario
    `, [cedula, usuario, contrasenaHash]);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      usuario: nuevoUsuario.rows[0]
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar token de autenticación
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sweetypuppies_secret_key');
    
    // Verificar que el usuario aún existe
    const usuario = await client.query(
      'SELECT cedula, usuario FROM usuarios WHERE cedula = $1',
      [decoded.cedula]
    );

    if (usuario.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    res.json({
      success: true,
      usuario: usuario.rows[0]
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

module.exports = router;