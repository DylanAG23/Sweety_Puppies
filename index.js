require('dotenv').config(); // Agregar esta línea al principio
const express = require('express');
const cors = require('cors');
const { swaggerUi, swaggerSpec } = require('./swagger');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Importar las rutas
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/mascotas', require('./routes/mascotas'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/imagenes', require('./routes/imagenes'));
app.use('/api/login', require('./routes/login'));  

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});