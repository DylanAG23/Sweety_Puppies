// En pruebas (NODE_ENV=test) no se carga el .env real: cada prueba define
// sus propias variables y nunca usa secretos ni la base de datos real.
if (!['test', 'production'].includes(process.env.NODE_ENV)) {
  require('dotenv').config();
}

// Unico punto de lectura de configuracion sensible. No hay valores de respaldo
// para secretos: si falta uno, el servidor no arranca.

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function requireEnv(name) {
  const value = readEnv(name);

  if (!value) {
    throw new ConfigError(`Falta la variable de entorno ${name}. Revisa .env.example.`);
  }

  return value;
}

function isProduction() {
  return readEnv('NODE_ENV') === 'production';
}

function getPort() {
  const port = Number(readEnv('PORT') || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError('PORT debe ser un entero entre 1 y 65535.');
  }
  return port;
}

function getTrustProxy() {
  const value = readEnv('TRUST_PROXY');
  if (!value || value === 'false' || value === '0') return false;
  if (/^[1-5]$/.test(value)) return Number(value);
  const ranges = value.split(',').map(item => item.trim());
  const { isIP } = require('node:net');
  const valid = ranges.every(item => {
    if (['loopback', 'linklocal', 'uniquelocal'].includes(item)) return true;
    const parts = item.split('/');
    const [address, prefix] = parts;
    const family = isIP(address);
    return family && parts.length <= 2 && (prefix === undefined ||
      (/^\d+$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128)));
  });
  if (!valid) throw new ConfigError('TRUST_PROXY debe ser false, de 1 a 5 saltos o una lista de IP/subredes confiables.');
  return ranges;
}

function getJwtSecret() {
  return requireEnv('JWT_SECRET');
}

function getAppointmentActionSecret() {
  return readEnv('APPOINTMENT_ACTION_SECRET') || getJwtSecret();
}

function getAppBaseUrl() {
  return (readEnv('APP_BASE_URL') || `http://localhost:${getPort()}`).replace(/\/+$/, '');
}

function getCorsOrigins() {
  return (readEnv('CORS_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getDatabaseConfig() {
  const ssl = readEnv('DB_SSL') === 'false' ? false : { rejectUnauthorized: false };
  const max = Number(readEnv('DB_POOL_MAX')) || 10;
  const connectionString = readEnv('DATABASE_URL');

  if (connectionString) {
    return { connectionString, ssl, max };
  }

  const missing = ['DB_HOST', 'DB_USER'].filter((name) => !readEnv(name));
  // SUPABASE_PASSWORD se acepta por compatibilidad con la configuracion anterior.
  const password = readEnv('DB_PASSWORD') || readEnv('SUPABASE_PASSWORD');

  if (!password) {
    missing.push('DB_PASSWORD');
  }

  if (missing.length) {
    throw new ConfigError(
      `Configuracion de base de datos incompleta: define DATABASE_URL o ${missing.join(', ')}. Revisa .env.example.`
    );
  }

  return {
    host: readEnv('DB_HOST'),
    port: Number(readEnv('DB_PORT')) || 5432,
    user: readEnv('DB_USER'),
    password,
    database: readEnv('DB_NAME') || 'postgres',
    ssl,
    max
  };
}

function getMailMode() {
  return (readEnv('MAIL_MODE') || 'local').toLowerCase();
}

function shouldExposeDevelopmentCodes() {
  return !isProduction() && (readEnv('MAIL_EXPOSE_DEV_CODES') || '').toLowerCase() === 'true';
}

function getAdminNotificationEmail() {
  const explicit = readEnv('ADMIN_NOTIFICATION_EMAIL') || readEnv('MAIL_USER');

  if (explicit) {
    return explicit;
  }

  const match = String(readEnv('MAIL_FROM') || '').match(/<([^>]+)>/);
  return match ? match[1] : readEnv('MAIL_FROM');
}

// Se llama al arrancar el servidor para fallar con un mensaje claro.
function assertStartupConfig() {
  getPort();
  getTrustProxy();
  getJwtSecret();
  getDatabaseConfig();
  if (isProduction()) assertProductionConfig();
}

function assertProductionConfig() {
  for (const name of ['JWT_SECRET', 'APPOINTMENT_ACTION_SECRET']) {
    const secret = requireEnv(name);
    if (secret.length < 32 || /cambiar|reemplaza|change.?me/i.test(secret)) {
      throw new ConfigError(`${name} debe ser un secreto aleatorio de al menos 32 caracteres en produccion.`);
    }
  }
  if (getJwtSecret() === getAppointmentActionSecret()) {
    throw new ConfigError('JWT_SECRET y APPOINTMENT_ACTION_SECRET deben ser diferentes en produccion.');
  }
  const baseUrl = requireEnv('APP_BASE_URL');
  let url;
  try { url = new URL(baseUrl); } catch { throw new ConfigError('APP_BASE_URL debe ser una URL valida.'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new ConfigError('APP_BASE_URL debe ser el origen HTTPS publico, sin ruta ni credenciales (HTTP solo en loopback).');
  }
  for (const origin of getCorsOrigins()) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new ConfigError('CORS_ORIGINS contiene un origen invalido.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new ConfigError('CORS_ORIGINS debe contener origenes exactos, sin rutas ni barra final.');
    }
  }
  requireEnv('SUPABASE_URL');
  requireEnv('SUPABASE_KEY');
  requireEnv('BUCKET_NAME');
  const mode = getMailMode();
  // Un despliegue temporal puede operar sin proveedor de correo. En ese caso
  // las notificaciones no se envían; registro y recuperación quedan
  // explícitamente no disponibles hasta configurar gmail o Resend.
  if (mode === 'disabled') return;
  requireEnv('MAIL_FROM');
  if (mode === 'remote') {
    if (requireEnv('RESEND_API_KEY').includes('reemplaza') || readEnv('MAIL_FROM').includes('reemplaza')) {
      throw new ConfigError('Completa RESEND_API_KEY y MAIL_FROM con la configuracion real del proveedor.');
    }
  }
  else if (mode === 'gmail' || mode === 'smtp') {
    requireEnv('MAIL_USER');
    requireEnv('MAIL_APP_PASSWORD');
  } else {
    throw new ConfigError('Produccion requiere MAIL_MODE=gmail, smtp (Gmail) o remote; local no entrega los codigos.');
  }
}

module.exports = {
  ConfigError,
  readEnv,
  requireEnv,
  isProduction,
  getPort,
  getTrustProxy,
  getJwtSecret,
  getAppointmentActionSecret,
  getAppBaseUrl,
  getCorsOrigins,
  getDatabaseConfig,
  getMailMode,
  shouldExposeDevelopmentCodes,
  getAdminNotificationEmail,
  assertStartupConfig,
  assertProductionConfig
};
