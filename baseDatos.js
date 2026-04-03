const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.roqfkukmaayuqffbsggb',
  password: process.env.SUPABASE_PASSWORD || 'E1czu3k9YmN3102h',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => console.log('Conectado a Supabase'))
  .catch(err => console.error('Error en la conexión:', err.message));

module.exports = client;