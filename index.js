const { assertStartupConfig, getPort, ConfigError } = require('./config/env');

try {
  assertStartupConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`No se puede iniciar el servidor: ${error.message}`);
    process.exit(1);
  }

  throw error;
}

const { createApp } = require('./app');
const db = require('./baseDatos');

const PORT = getPort();
const app = createApp();

const server = app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Documentacion disponible en http://localhost:${PORT}/api-docs`);
});

db.checkConnection()
  .then(() => console.log('Conectado a Supabase (pool de PostgreSQL)'))
  .catch((error) => console.error('Error en la conexion a la base de datos:', error.message));

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} recibido, cerrando el servidor...`);
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 15000);
  deadline.unref();
  server.close(() => {
    db.close().then(() => process.exit(0), () => process.exit(1));
  });
  server.closeIdleConnections();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
