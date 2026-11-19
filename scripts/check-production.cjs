// Comprueba configuracion y build sin conectar a BD, Storage ni correo.
process.env.NODE_ENV = 'production';
const fs = require('node:fs');
const path = require('node:path');
try {
  require('../config/env').assertStartupConfig();
  if (!fs.existsSync(path.join(__dirname, '../SwettyPuppies_Frontend/dist/index.html'))) {
    throw new Error('Falta compilar el frontend: npm run build.');
  }
  console.log('Configuracion y frontend preparados. Falta comprobar servicios externos en el destino.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
