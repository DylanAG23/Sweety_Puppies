require('dotenv').config();

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
  return Number(readEnv('PORT')) || 3000;
}

function getJwtSecret() {
  return requireEnv('JWT_SECRET');
}

function getAppointmentActionSecret() {
  return readEnv('APPOINTMENT_ACTION_SECRET') || getJwtSecret();
}

function getAppBaseUrl() {
  return readEnv('APP_BASE_URL') || `http://localhost:${getPort()}`;
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
  return !isProduction() && readEnv('MAIL_EXPOSE_DEV_CODES') === 'true';
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
  getJwtSecret();
  getDatabaseConfig();
}

module.exports = {
  ConfigError,
  readEnv,
  requireEnv,
  isProduction,
  getPort,
  getJwtSecret,
  getAppointmentActionSecret,
  getAppBaseUrl,
  getCorsOrigins,
  getDatabaseConfig,
  getMailMode,
  shouldExposeDevelopmentCodes,
  getAdminNotificationEmail,
  assertStartupConfig
};
