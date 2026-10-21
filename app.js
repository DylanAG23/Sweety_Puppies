const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { swaggerUi, swaggerSpec } = require('./swagger');
const { getCorsOrigins } = require('./config/env');
const { securityHeaders } = require('./middleware/securityHeaders');
const { errorHandler } = require('./middleware/errorHandler');

const frontendDist = path.join(__dirname, 'SwettyPuppies_Frontend', 'dist');

// Construye la aplicacion Express sin abrir el puerto ni conectar la base de
// datos, para poder probarla de forma aislada.
function createApp() {
  const app = express();
  const allowedOrigins = getCorsOrigins();

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(
    cors({
      // Sin origen (misma pagina, curl, servidor) siempre se permite;
      // los demas solo si estan en CORS_ORIGINS.
      origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin))
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok' });
  });

  app.use('/api/clientes', require('./routes/clientes'));
  app.use('/api/mascotas', require('./routes/mascotas'));
  app.use('/api/cliente/mascotas', require('./routes/clienteMascotas'));
  app.use('/api/cliente/citas', require('./routes/clienteCitas'));
  app.use('/api/cliente/historial', require('./routes/clienteHistorial'));
  app.use('/api/admin/agenda', require('./routes/adminAgenda'));
  app.use('/api/admin/gestion', require('./routes/adminGestion'));
  app.use('/api/servicios', require('./routes/servicios'));
  app.use('/api/contenido', require('./routes/contenido'));
  app.use('/api/imagenes', require('./routes/imagenes'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/login', require('./routes/auth'));
  app.use('/api/reportes', require('./routes/reportes'));
  app.use('/api/admin/inventario', require('./routes/adminInventario'));
  // `/api/citas` (legacy/backend/routes/citas.js) se desmonto: no tenia
  // autenticacion y consultaba el esquema antiguo. Ver AUDITORIA_PRE_FASE2.md (C4).

  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Recurso no encontrado' });
  });

  app.get('/cliente-dashboard.html', (req, res) => res.redirect('/cliente'));
  app.get('/index.html', (req, res) => res.redirect('/admin'));

  const hasBuiltFrontend = fs.existsSync(path.join(frontendDist, 'index.html'));

  if (hasBuiltFrontend) {
    app.use(express.static(frontendDist, { index: false }));
  }

  // Fallback del SPA: cualquier GET de navegacion (sin extension o .html)
  // entrega index.html y el enrutador de Vue decide la pantalla.
  app.get(/^\/(?!api(?:\/|$)|api-docs(?:\/|$)).*/, (req, res, next) => {
    const extension = path.extname(req.path);

    if (extension && extension !== '.html') {
      return next();
    }

    if (!hasBuiltFrontend) {
      return res
        .status(503)
        .type('text/plain; charset=utf-8')
        .send('El frontend no esta compilado. Ejecuta "npm run build" en SwettyPuppies_Frontend o usa "npm run dev" (Vite).');
    }

    return res.sendFile(path.join(frontendDist, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
