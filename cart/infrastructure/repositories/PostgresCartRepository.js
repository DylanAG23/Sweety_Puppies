const db = require('../../../baseDatos');
const {
  PostgresStoreContext
} = require('../../../shared/store/PostgresStoreContext');
class PostgresCartRepository extends PostgresStoreContext {
  async ensure(tx, clientId) {
    return (
      await tx.query(
        'INSERT INTO carritos(cliente_id) VALUES($1) ON CONFLICT(cliente_id) DO UPDATE SET cliente_id=EXCLUDED.cliente_id RETURNING id',
        [clientId]
      )
    ).rows[0].id;
  }
  async lines(clientId, tx = db) {
    return (
      await tx.query(
        `SELECT ci.id,ci.producto_id,ci.cantidad,ci.updated_at::text AS updated_at,p.nombre,p.precio,p.referencia,p.activo,c.activo AS categoria_activa,COALESCE(i.stock_actual,0) AS stock_actual,COALESCE(i.stock_minimo,0) AS stock_minimo,
    (SELECT url FROM producto_imagenes WHERE producto_id=p.id ORDER BY orden LIMIT 1) AS imagen
    FROM carritos ca JOIN carrito_items ci ON ci.carrito_id=ca.id JOIN productos p ON p.id=ci.producto_id JOIN categorias c ON c.id=p.categoria_id LEFT JOIN inventario i ON i.producto_id=p.id WHERE ca.cliente_id=$1 ORDER BY p.id`,
        [clientId]
      )
    ).rows;
  }
  async product(tx, id) {
    return (
      await tx.query(
        'SELECT p.id,p.activo,c.activo AS categoria_activa,COALESCE(i.stock_actual,0) AS stock_actual FROM productos p JOIN categorias c ON c.id=p.categoria_id LEFT JOIN inventario i ON i.producto_id=p.id WHERE p.id=$1',
        [id]
      )
    ).rows[0];
  }
  async set(tx, cartId, id, quantity) {
    await tx.query(
      'INSERT INTO carrito_items(carrito_id,producto_id,cantidad) VALUES($1,$2,$3) ON CONFLICT(carrito_id,producto_id) DO UPDATE SET cantidad=EXCLUDED.cantidad',
      [cartId, id, quantity]
    );
  }
  async remove(tx, clientId, id) {
    await tx.query(
      'DELETE FROM carrito_items WHERE carrito_id IN (SELECT id FROM carritos WHERE cliente_id=$1) AND producto_id=$2',
      [clientId, id]
    );
  }
  async clear(tx, clientId) {
    await tx.query(
      'DELETE FROM carrito_items WHERE carrito_id IN (SELECT id FROM carritos WHERE cliente_id=$1)',
      [clientId]
    );
  }
  async consume(tx, clientId, snapshot) {
    // Keep changes made in another tab after checkout. Exact timestamps matter.
    for (const i of snapshot)
      await tx.query(
        'DELETE FROM carrito_items WHERE id=$1 AND cantidad=$2 AND updated_at=$3 AND carrito_id IN (SELECT id FROM carritos WHERE cliente_id=$4)',
        [i.id, i.cantidad, i.updated_at, clientId]
      );
  }
}
module.exports = { PostgresCartRepository };
