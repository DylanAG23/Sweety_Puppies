require('./helpers/testEnv');
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const pg = require('pg');

// Pool falso: registra las consultas de cada conexion reservada.
const log = [];
class FakePool {
  constructor(options) {
    this.options = options;
  }

  on() {}

  async query(text) {
    log.push({ connection: 'pool', text });
    return { rows: [], rowCount: 0 };
  }

  async connect() {
    const id = `conexion-${log.filter((entry) => entry.text === 'CONNECT').length + 1}`;
    log.push({ connection: id, text: 'CONNECT' });
    return {
      query: async (text) => {
        log.push({ connection: id, text });
        if (text === 'FALLA') {
          throw new Error('fallo simulado');
        }
        return { rows: [], rowCount: 0 };
      },
      release: () => log.push({ connection: id, text: 'RELEASE' })
    };
  }

  async end() {}
}

pg.Pool = FakePool;
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'prueba';
process.env.DB_PASSWORD = 'prueba';
const db = require('../baseDatos');

beforeEach(() => {
  log.length = 0;
});

test('withTransaction usa una conexion propia y hace COMMIT', async () => {
  const result = await db.withTransaction(async (tx) => {
    await tx.query('UPDATE uno');
    await tx.query('UPDATE dos');
    return 'listo';
  });

  assert.equal(result, 'listo');
  assert.deepEqual(
    log.map((entry) => entry.text),
    ['CONNECT', 'BEGIN', 'UPDATE uno', 'UPDATE dos', 'COMMIT', 'RELEASE']
  );
  assert.ok(log.every((entry) => entry.connection === 'conexion-1'));
});

test('withTransaction hace ROLLBACK, libera la conexion y propaga el error', async () => {
  await assert.rejects(
    db.withTransaction(async (tx) => {
      await tx.query('UPDATE uno');
      await tx.query('FALLA');
    }),
    /fallo simulado/
  );

  assert.deepEqual(
    log.map((entry) => entry.text),
    ['CONNECT', 'BEGIN', 'UPDATE uno', 'FALLA', 'ROLLBACK', 'RELEASE']
  );
});

test('dos transacciones concurrentes no comparten conexion', async () => {
  await Promise.all([
    db.withTransaction((tx) => tx.query('A')),
    db.withTransaction((tx) => tx.query('B'))
  ]);

  const connectionOf = (text) => log.find((entry) => entry.text === text).connection;
  assert.notEqual(connectionOf('A'), connectionOf('B'));
});

test('query() fuera de transaccion usa el pool', async () => {
  await db.query('SELECT 1');
  assert.deepEqual(log, [{ connection: 'pool', text: 'SELECT 1' }]);
});
