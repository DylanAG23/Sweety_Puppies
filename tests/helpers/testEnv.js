// Debe requerirse antes que cualquier modulo del proyecto.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas';
process.env.APPOINTMENT_ACTION_SECRET = 'otro-secreto-solo-para-pruebas';
process.env.MAIL_MODE = 'local';
process.env.CORS_ORIGINS = 'http://localhost:5173';

for (const name of ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'SUPABASE_PASSWORD', 'MAIL_USER', 'MAIL_APP_PASSWORD', 'RESEND_API_KEY']) {
  delete process.env[name];
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET
};
