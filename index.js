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

const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Documentacion disponible en http://localhost:${PORT}/api-docs`);
});

db.checkConnection()
  .then(() => console.log('Conectado a Supabase (pool de PostgreSQL)'))
  .catch((error) => console.error('Error en la conexion a la base de datos:', error.message));

function shutdown(signal) {
  console.log(`${signal} recibido, cerrando el servidor...`);
  server.close(() => {
    db.close().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
