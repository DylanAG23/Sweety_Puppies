const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const products = require('./demo-catalog.json');

async function seedDemoCatalog(pg) {
  // Este auxiliar nunca acepta pg.Pool ni el adaptador de la base compartida.
  if (!(pg instanceof PGlite)) throw new Error('El catálogo DEMO solo admite PGlite aislado. No conectar a Supabase.');
  return pg.transaction(async tx => {
    for (const p of products) {
      const existing = await tx.query('SELECT id FROM productos WHERE referencia=$1', [p.reference]);
      if (existing.rows.length) continue;
      const category = (await tx.query(`INSERT INTO categorias(nombre,descripcion) VALUES($1,'Categoría ficticia para pruebas locales')
        ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id`, [p.category])).rows[0];
      const product = (await tx.query(`INSERT INTO productos(categoria_id,referencia,nombre,descripcion_corta,descripcion,precio)
        VALUES($1,$2,$3,'Ejemplo de prueba, no disponible para venta real',$4,$5) RETURNING id`,
      [category.id, p.reference, p.name, p.description, p.price])).rows[0];
      await tx.query('INSERT INTO inventario(producto_id,stock_actual,stock_minimo) VALUES($1,$2,$3)', [product.id,p.stock,p.minimum]);
      await tx.query(`INSERT INTO movimientos_inventario(producto_id,tipo_movimiento,cantidad,stock_anterior,stock_resultante,motivo)
        VALUES($1,'entrada',$2,0,$2,'Inventario ficticio de demostración')`, [product.id,p.stock]);
      await tx.query('INSERT INTO producto_imagenes(producto_id,url,orden) VALUES($1,$2,1)', [product.id,'/demo-catalog/'+p.image]);
    }
    return (await tx.query("SELECT p.referencia,p.nombre,p.precio,i.stock_actual FROM productos p JOIN inventario i ON i.producto_id=p.id WHERE p.referencia LIKE 'DEMO-%' ORDER BY p.referencia")).rows;
  });
}

if (require.main === module) {
  (async () => {
    // Sin .env, sin persistencia y sin red; cerrar elimina esta base temporal.
    const pg = new PGlite();
    try {
      await pg.exec(fs.readFileSync(path.join(__dirname,'001_application_baseline.sql'),'utf8'));
      console.log(JSON.stringify(await seedDemoCatalog(pg),null,2));
    } finally { await pg.close(); }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { seedDemoCatalog, products, assetsDirectory: path.join(__dirname,'demo-assets') };
