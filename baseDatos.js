const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.onyzutykzjiocjnlaqgr',
  password: 'sweetypuppies123',
  database: 'postgres',
  ssl: { rejectUnauthorized: false } // necesario para Supabase
});

client.connect()
  .then(() => console.log('Conectado a Supabase'))
  .catch(err => console.error('Error en la conexión:', err.message));

module.exports = client;