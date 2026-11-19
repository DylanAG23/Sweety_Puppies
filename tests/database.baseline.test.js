require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { inspectSchema, differences } = require('../database/schema-inspection.cjs');
const expected = require('../database/schema-manifest.json');
const baseline = fs.readFileSync(path.join(__dirname, '../database/001_application_baseline.sql'), 'utf8');
const { seedDemoCatalog, products, assetsDirectory } = require('../database/demo-catalog.cjs');

test('comparacion admite casts equivalentes de PostgreSQL sin ocultar cambios de valores o enums', () => {
  const actual = structuredClone(expected);
  const check = actual.constraints.find(row => row.name === 'codigos_verificacion_tipo_check');
  check.definition = "CHECK (((tipo)::text = ANY ((ARRAY['registro'::character varying, 'recuperacion'::character varying])::text[])))";
  assert.deepEqual(differences(expected, actual), []);
  check.definition = check.definition.replace("'recuperacion'", "'otro'");
  assert.deepEqual(differences(expected, actual), ['constraints']);
  actual.enums[0].values.push('nuevo');
  assert.deepEqual(differences(expected, actual), ['constraints', 'enums']);
});

test('baseline reproduce las 24 tablas del respaldo, sin datos ni dependencias de Supabase', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(baseline);
    const actual = await inspectSchema(pg);
    assert.deepEqual(differences(expected, actual), []);
    assert.equal(actual.tables.length, 24);
    assert.ok(actual.tables.every(t => t.rls));
    assert.equal(actual.policies.length, 0);
    for (const table of actual.tables) {
      const result = await pg.query(`SELECT count(*)::int AS n FROM public."${table.name}"`);
      assert.equal(result.rows[0].n, 0, `${table.name} no debe contener datos del respaldo`);
    }
    assert.equal((await pg.query("SELECT count(*)::int AS n FROM pg_namespace WHERE nspname IN ('auth','storage','realtime')")).rows[0].n, 0);
    const first = await seedDemoCatalog(pg);
    assert.equal(first.length, 5);
    assert.deepEqual(await seedDemoCatalog(pg), first);
    assert.equal((await pg.query('SELECT count(*)::int n FROM movimientos_inventario')).rows[0].n, 5);
    for (const product of products) assert.ok(fs.existsSync(path.join(assetsDirectory,product.image)));
    await assert.rejects(seedDemoCatalog({ query: async () => { throw new Error('No debe consultar'); } }), /solo admite PGlite/);
  } finally { await pg.close(); }
});

test('baseline se niega a sobrescribir una instalación existente y conserva sus datos', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(baseline);
    await pg.query("INSERT INTO categorias(nombre) VALUES('Conservar')");
    await assert.rejects(pg.exec(baseline), /ya existen objetos/);
    await pg.exec('ROLLBACK');
    assert.equal((await pg.query("SELECT nombre FROM categorias")).rows[0].nombre, 'Conservar');
    assert.deepEqual(differences(expected, await inspectSchema(pg)), []);
  } finally { await pg.close(); }
});

test('la comprobación detecta cambios de seguridad y estructura sin tocar registros', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(baseline);
    await pg.exec('ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY; ALTER TABLE public.productos ADD COLUMN inesperada text;');
    const changed = differences(expected, await inspectSchema(pg));
    assert.ok(changed.includes('tables'));
    assert.ok(changed.includes('columns'));
  } finally { await pg.close(); }
});

test('un esquema parcial aborta antes de crear tablas adicionales', async () => {
  const pg = new PGlite();
  try {
    await pg.exec('CREATE TABLE public.usuarios(id integer PRIMARY KEY); INSERT INTO public.usuarios VALUES(7);');
    await assert.rejects(pg.exec(baseline), /ya existen objetos/);
    await pg.exec('ROLLBACK');
    assert.equal((await pg.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 1);
    assert.equal((await pg.query('SELECT id FROM usuarios')).rows[0].id, 7);
  } finally { await pg.close(); }
});
