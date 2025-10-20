const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.roqfkukmaayuqffbsggb',
  password: process.env.SUPABASE_PASSWORD || 'aEwBWJqfJVUBBnto',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => console.log('Conectado a Supabase'))
  .catch(err => console.error('Error en la conexión:', err.message));

module.exports = client;