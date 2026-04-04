require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { swaggerUi, swaggerSpec } = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendRoot = path.join(__dirname, 'SwettyPuppies_Frontend');
const frontendDist = path.join(frontendRoot, 'dist');
const appShellPath = fs.existsSync(path.join(frontendDist, 'index.html'))
  ? path.join(frontendDist, 'index.html')
  : path.join(frontendRoot, 'index.html');

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/mascotas', require('./routes/mascotas'));
app.use('/api/cliente/mascotas', require('./routes/clienteMascotas'));
app.use('/api/cliente/citas', require('./routes/clienteCitas'));
app.use('/api/cliente/historial', require('./routes/clienteHistorial'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/imagenes', require('./routes/imagenes'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/login', require('./routes/auth'));
app.use('/api/reportes', require('./routes/reportes'));

app.get('/cliente-dashboard.html', (req, res) => {
  res.redirect('/cliente');
});

app.get('/index.html', (req, res) => {
  res.redirect('/admin');
});

const appRoutes = [
  '/',
  '/login',
  '/admin',
  '/cliente',
  '/cliente/mascotas',
  '/cliente/mascotas/nueva',
  '/cliente/citas/nueva',
  '/cliente/historial',
  '/cliente/perfil',
  '/clientes',
  '/mascotas',
  '/servicios',
  '/citas',
  '/imagenes',
  '/reportes',
  '/clientes.html',
  '/mascotas.html',
  '/servicios.html',
  '/citas.html',
  '/imagenes.html',
  '/reportes.html',
  '/login.html'
];

app.get(appRoutes, (req, res) => {
  res.sendFile(appShellPath);
});

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

app.use(express.static(frontendRoot));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Documentación disponible en http://localhost:${PORT}/api-docs`);
});
