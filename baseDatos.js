const { Pool } = require('pg');
const { getDatabaseConfig } = require('./config/env');

// Pool de conexiones compartido por todos los repositorios.
// Mantiene la interfaz anterior (`db.query(sql, params)`) y agrega
// `withTransaction(work)`, que reserva una conexion propia para la transaccion.
// El pool se crea en la primera consulta, asi los modulos se pueden cargar
// (por ejemplo en pruebas) sin configuracion de base de datos.

let pool = null;

function getPool() {
  if (!pool) {
    const { max, ...connection } = getDatabaseConfig();

    pool = new Pool({
      ...connection,
      max,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (error) => {
      console.error('Error en una conexion inactiva del pool de PostgreSQL:', error.message);
    });
  }

  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

function connect() {
  return getPool().connect();
}

async function withTransaction(work) {
  const transactionClient = await connect();

  try {
    await transactionClient.query('BEGIN');
    const result = await work(transactionClient);
    await transactionClient.query('COMMIT');
    return result;
  } catch (error) {
    await transactionClient.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    transactionClient.release();
  }
}

async function checkConnection() {
  await query('SELECT 1');
}

async function close() {
  if (pool) {
    const current = pool;
    pool = null;
    await current.end();
  }
}

module.exports = {
  query,
  connect,
  withTransaction,
  checkConnection,
  close
};
