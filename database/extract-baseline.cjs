// Herramienta de mantenimiento: extrae exclusivamente DDL de public desde pg_dumpall.
// Nunca escribe datos, roles, permisos globales ni objetos internos de Supabase.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

function extract(buffer) {
  const source = zlib.gunzipSync(buffer).toString('utf8');
  const allowed = new Set(['TYPE', 'FUNCTION', 'TABLE', 'SEQUENCE', 'CONSTRAINT', 'FK CONSTRAINT', 'INDEX', 'TRIGGER', 'ROW SECURITY']);
  const blocks = source.split(/(?=--\n-- (?:Name|Data for Name): )/);
  const tables = [], selected = [];
  for (const block of blocks) {
    const match = block.match(/^--\n-- Name: (.*?); Type: (.*?); Schema: public; Owner: [^\n]*\n--\n/);
    if (!match || !allowed.has(match[2])) continue;
    let sql = block.slice(match[0].length).trim();
    sql = sql.replace(/^ALTER (?:TABLE|FUNCTION|SEQUENCE|TYPE) .* OWNER TO .*;\r?\n?/gm, '').trim();
    if (/\b(?:COPY|INSERT INTO|GRANT|REVOKE|SETVAL|CREATE ROLE|CREATE POLICY)\b|^\\/im.test(sql)) {
      throw new Error(`Bloque no exclusivamente DDL: ${match[1]}`);
    }
    if (/\b(?:auth|storage|realtime|extensions)\./.test(sql)) {
      throw new Error(`Dependencia de esquema ajeno a la aplicación: ${match[1]}`);
    }
    if (match[2] === 'TABLE') tables.push(match[1]);
    selected.push(`-- ${match[2]}: ${match[1]}\n${sql}`);
  }
  if (tables.length !== 24) throw new Error(`Se esperaban 24 tablas de aplicación, encontradas ${tables.length}`);
  const names = tables.map(name => `'${name.replaceAll("'", "''")}'`).join(',');
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const header = `-- Baseline de la aplicación, fuente: respaldo pg_dumpall del 29/10/2026.\n-- SHA-256 del respaldo: ${hash}\n-- SOLO esquema; NO restaura datos ni Storage. SOLO para una base nueva.\nBEGIN;\nSET LOCAL search_path = public, pg_catalog;\nDO $guard$\nBEGIN\n  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace\n    WHERE n.nspname='public' AND c.relname IN (${names})) THEN\n    RAISE EXCEPTION 'Baseline cancelado: ya existen objetos de la aplicación. Use check; no sobrescriba la base.';\n  END IF;\nEND\n$guard$;\n\n`;
  return header + selected.join('\n\n') + '\n\nCOMMIT;\n';
}

if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Uso: node database/extract-baseline.cjs respaldo.backup.gz salida.sql');
  if (fs.existsSync(output)) throw new Error('El archivo de salida ya existe; no se sobrescribe una migración publicada.');
  fs.writeFileSync(path.resolve(output), extract(fs.readFileSync(input)), 'utf8');
  console.log('DDL de aplicación extraído, sin datos ni credenciales.');
}
module.exports = { extract };
