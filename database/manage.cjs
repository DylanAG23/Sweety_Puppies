const fs = require('node:fs');
const path = require('node:path');
const { inspectSchema, differences } = require('./schema-inspection.cjs');
const baselinePath = path.join(__dirname, '001_application_baseline.sql');
const expected = require('./schema-manifest.json');

async function check(db) {
  const actual = await inspectSchema(db);
  const changes = differences(expected, actual);
  return { compatible: changes.length === 0, diferencias: changes,
    tablas: actual.tables.length, tablasEsperadas: expected.tables.length };
}

async function applyEmpty(db) {
  // La guardia SQL y toda la creación pertenecen a una única transacción.
  const connection = await db.connect();
  try { await connection.query(fs.readFileSync(baselinePath, 'utf8')); }
  catch (error) { await connection.query('ROLLBACK').catch(() => {}); throw error; }
  finally { connection.release(); }
}

if (require.main === module) {
  const command = process.argv[2] || 'check';
  if (!['check', 'apply-empty'].includes(command)) {
    console.error('Uso: node database/manage.cjs check | apply-empty --confirm-empty');
    process.exitCode = 1;
  } else if (command === 'apply-empty' && process.argv[3] !== '--confirm-empty') {
    console.error('Sin cambios: apply-empty requiere --confirm-empty y una base nueva dedicada.');
    process.exitCode = 1;
  } else {
    const db = require('../baseDatos');
    (async () => {
      if (command === 'apply-empty') await applyEmpty(db);
      const result = await check(db);
      console.log(JSON.stringify(result, null, 2));
      if (!result.compatible) process.exitCode = 2;
    })().catch(error => {
      // Evita imprimir URL, usuario o configuración de conexión.
      console.error(`No se completó ${command} (${error.code || 'ERROR'}). Verifica conexión y esquema; no se imprimen credenciales.`);
      process.exitCode = 1;
    }).finally(() => db.close());
  }
}

module.exports = { check, applyEmpty };
