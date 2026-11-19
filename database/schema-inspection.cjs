// Sólo consultas a catálogos de PostgreSQL; nunca lee registros de negocio.
const queries = {
  tables: `SELECT c.relname AS name, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`,
  columns: `SELECT c.relname AS table_name, a.attname AS name, a.attnum AS position,
    format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS not_null,
    pg_get_expr(d.adbin,d.adrelid) AS default_value, a.attidentity AS identity, a.attgenerated AS generated
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY c.relname,a.attnum`,
  constraints: `SELECT c.relname AS table_name, con.conname AS name, con.contype AS type,
    pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con
    JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND con.contype <> 'n' ORDER BY c.relname,con.conname`,
  indexes: `SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_indexes
    WHERE schemaname='public' ORDER BY tablename,indexname`,
  triggers: `SELECT c.relname AS table_name,t.tgname AS name,t.tgenabled AS enabled,
    pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
    ORDER BY c.relname,t.tgname`,
  enums: `SELECT t.typname AS name,array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid
    WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`,
  functions: `SELECT p.proname AS name,pg_get_functiondef(p.oid) AS definition FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
    ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)`,
  sequences: `SELECT sequencename AS name,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size
    FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`,
  policies: `SELECT tablename AS table_name,policyname AS name,permissive,roles,cmd,qual,with_check
    FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`
};

async function inspectSchema(db) {
  const result = {};
  for (const [key, sql] of Object.entries(queries)) result[key] = (await db.query(sql)).rows;
  // Normaliza bigint del driver y saltos de línea sin alterar texto SQL o literales.
  return JSON.parse(JSON.stringify(result, (key, value) => {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'number' && ['start_value', 'min_value', 'max_value', 'increment_by', 'cache_size'].includes(key)) return String(value);
    return typeof value === 'string' ? value.replace(/\r\n/g, '\n') : value;
  }));
}

function differences(expected, actual) {
  return Object.keys(queries).filter(key => JSON.stringify(expected[key]) !== JSON.stringify(actual[key]));
}

module.exports = { inspectSchema, differences };
