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
    

module.exports = router;