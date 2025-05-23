require('dotenv').config(); // Agregar esta línea al principio
const express = require('express');
const cors = require('cors');
const path = require('path');
const { swaggerUi, swaggerSpec } = require('./swagger');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'SwettyPuppies_Frontend')));

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Importar las rutas
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/mascotas', require('./routes/mascotas'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/imagenes', require('./routes/imagenes'));
app.use('/api/login', require('./routes/login'));
app.use('/api/reportes', require('./routes/reportes')); // Agregar ruta de reportes

// Ruta para servir el index.html en la raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'SwettyPuppies_Frontend', 'index.html'));
});

// Ruta para servir el login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'SwettyPuppies_Frontend', 'login.html'));
});

// Ruta para servir reportes.html
app.get('/reportes', (req, res) => {
    res.sendFile(path.join(__dirname, 'SwettyPuppies_Frontend', 'reportes.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Documentación disponible en http://localhost:${PORT}/api-docs`);
});