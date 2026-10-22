const db = require('../../../baseDatos');
const {
  PostgresStoreContext
} = require('../../../shared/store/PostgresStoreContext');
class PostgresOrdersRepository extends PostgresStoreContext {
  async existing(tx, clientId, key) {
    return (
      await tx.query(
        'SELECT * FROM ordenes WHERE cliente_id=$1 AND observaciones LIKE $2 ORDER BY created_at LIMIT 1',
        [clientId, '%"requestId":"' + key + '"%']
      )
    ).rows[0];
  }
  async lockProducts(tx, ids) {
    return (
      await tx.query(
        'SELECT p.id,p.activo,c.activo AS categoria_activa FROM productos p JOIN categorias c ON c.id=p.categoria_id WHERE p.id=ANY($1::uuid[]) ORDER BY p.id FOR SHARE OF p,c',
        [ids]
      )
    ).rows;
  }
  async create(tx, clientId, method, total, meta, items) {
    const order = (
      await tx.query(
        'INSERT INTO ordenes(cliente_id,metodo_pago,total,observaciones) VALUES($1,$2,$3,$4) RETURNING *',
        [clientId, method, total, JSON.stringify(meta)]
      )
    ).rows[0];
    for (const i of items)
      await tx.query(
        'INSERT INTO detalle_orden(orden_id,producto_id,producto_nombre,cantidad,precio_unitario,subtotal) VALUES($1,$2,$3,$4,$5,$6)',
        [
          order.id,
          i.producto_id,
          i.nombre,
          i.cantidad,
          i.precio,
          i.cantidad * i.precio
        ]
      );
    return order;
  }
  async find(tx, id) {
    return (await tx.query('SELECT * FROM ordenes WHERE id=$1', [id])).rows[0];
  }
  async lock(tx, id) {
    return (
      await tx.query('SELECT * FROM ordenes WHERE id=$1 FOR UPDATE', [id])
    ).rows[0];
  }
  async details(id, tx = db) {
    return (
      await tx.query(
        'SELECT * FROM detalle_orden WHERE orden_id=$1 ORDER BY producto_id',
        [id]
      )
    ).rows;
  }
  async update(tx, order, meta) {
    return (
      await tx.query(
        'UPDATE ordenes SET estado=$1,metodo_pago=$2,fecha_pago=$3,fecha_cancelacion=$4,motivo_cancelacion=$5,observaciones=$6 WHERE id=$7 RETURNING *',
        [
          order.estado,
          order.metodo_pago,
          order.fecha_pago,
          order.fecha_cancelacion,
          order.motivo_cancelacion,
          JSON.stringify(meta),
          order.id
        ]
      )
    ).rows[0];
  }
  async list(clientId, filters) {
    const vals = [],
      where = [];
    if (clientId) {
      vals.push(clientId);
      where.push('o.cliente_id=$' + vals.length);
    }
    if (filters.estado) {
      vals.push(filters.estado);
      where.push('o.estado::text=$' + vals.length);
    }
    const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const count = (
      await db.query(
        'SELECT count(*)::int AS total FROM ordenes o ' + clause,
        vals
      )
    ).rows[0].total;
    vals.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = (
      await db.query(
        `SELECT o.*,c.nombre||' '||c.apellido AS cliente_nombre FROM ordenes o JOIN clientes c ON c.id=o.cliente_id ${clause} ORDER BY o.created_at DESC,o.id LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
        vals
      )
    ).rows;
    return {
      ordenes: rows,
      total: count,
      page: filters.page,
      limit: filters.limit
    };
  }
  async report(desde, hasta) {
    const bounds = [desde, hasta];
    const products = (
      await db.query(
        `SELECT COALESCE(sum(total),0)::bigint AS ingresos,count(*)::int AS pedidos FROM ordenes WHERE estado IN ('pagado','pendiente_recoger','entregado') AND (fecha_pago AT TIME ZONE 'America/Bogota')::date BETWEEN $1::date AND $2::date`,
        bounds
      )
    ).rows[0];
    const services = (
      await db.query(
        `SELECT COALESCE(sum(COALESCE(precio_final,precio_calculado,precio_base,0)),0)::bigint AS ingresos,count(*)::int AS servicios FROM historial_citas WHERE (fecha_servicio AT TIME ZONE 'America/Bogota')::date BETWEEN $1::date AND $2::date`,
        bounds
      )
    ).rows[0];
    const methods = (
      await db.query(
        `SELECT metodo_pago,sum(total)::bigint AS ingresos,count(*)::int AS pedidos FROM ordenes WHERE estado IN ('pagado','pendiente_recoger','entregado') AND (fecha_pago AT TIME ZONE 'America/Bogota')::date BETWEEN $1::date AND $2::date GROUP BY metodo_pago`,
        bounds
      )
    ).rows;
    return {
      desde,
      hasta,
      productos: Number(products.ingresos),
      servicios: Number(services.ingresos),
      consolidado: Number(products.ingresos) + Number(services.ingresos),
      pedidos: products.pedidos,
      serviciosCompletados: services.servicios,
      metodos: methods
    };
  }
}
module.exports = { PostgresOrdersRepository };
