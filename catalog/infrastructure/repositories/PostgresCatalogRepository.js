const db = require('../../../baseDatos');
const {
  PostgresStoreContext
} = require('../../../shared/store/PostgresStoreContext');
const { fail } = require('../../../shared/store/rules');
class PostgresCatalogRepository extends PostgresStoreContext {
  async categories(admin) {
    return (
      await db.query(
        `SELECT * FROM categorias ${admin ? '' : 'WHERE activo'} ORDER BY orden,nombre`
      )
    ).rows;
  }
  async products(filters, admin) {
    const values = [],
      conditions = admin ? [] : ['p.activo', 'c.activo'];
    const add = (sql, value) => {
      values.push(value);
      conditions.push(sql.replaceAll('?', '$' + values.length));
    };
    if (filters.q)
      add('(p.nombre ILIKE ? OR p.referencia ILIKE ?)', '%' + filters.q + '%');
    if (filters.categoria) add('p.categoria_id=?', filters.categoria);
    if (filters.id) add('p.id=?', filters.id);
    if (filters.min !== undefined) add('p.precio>=?', filters.min);
    if (filters.max !== undefined) add('p.precio<=?', filters.max);
    if (filters.disponibilidad === 'disponible')
      conditions.push('COALESCE(i.stock_actual,0)>0');
    if (filters.disponibilidad === 'agotado')
      conditions.push('COALESCE(i.stock_actual,0)=0');
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const order =
      {
        recientes: 'p.created_at DESC,p.id',
        precio_asc: 'p.precio,p.id',
        precio_desc: 'p.precio DESC,p.id',
        nombre: 'p.nombre,p.id'
      }[filters.orden] || 'p.created_at DESC,p.id';
    const query = `SELECT p.*,c.nombre AS categoria_nombre,c.activo AS categoria_activa,COALESCE(i.stock_actual,0) AS stock_actual,COALESCE(i.stock_minimo,0) AS stock_minimo,
      COALESCE((SELECT json_agg(pi ORDER BY pi.orden) FROM producto_imagenes pi WHERE pi.producto_id=p.id),'[]') AS imagenes
      FROM productos p JOIN categorias c ON c.id=p.categoria_id LEFT JOIN inventario i ON i.producto_id=p.id ${where}`;
    const count = await db.query(
      `SELECT count(*)::int AS total FROM productos p JOIN categorias c ON c.id=p.categoria_id LEFT JOIN inventario i ON i.producto_id=p.id ${where}`,
      values
    );
    values.push(filters.limit, (filters.page - 1) * filters.limit);
    const rows = await db.query(
      query +
        ` ORDER BY ${order} LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return {
      productos: rows.rows,
      total: count.rows[0].total,
      page: filters.page,
      limit: filters.limit
    };
  }
  async saveCategory(id, data) {
    const r = id
      ? await db.query(
          'UPDATE categorias SET nombre=$1,descripcion=$2,orden=$3,activo=$4 WHERE id=$5 RETURNING *',
          [data.nombre, data.descripcion, data.orden, data.activo, id]
        )
      : await db.query(
          'INSERT INTO categorias(nombre,descripcion,orden,activo) VALUES($1,$2,$3,$4) RETURNING *',
          [data.nombre, data.descripcion, data.orden, data.activo]
        );
    if (!r.rowCount) fail('Categoría no encontrada', 404);
    return r.rows[0];
  }
  async deleteCategory(id) {
    const r = await db.query(
      'DELETE FROM categorias WHERE id=$1 RETURNING id',
      [id]
    );
    if (!r.rowCount) fail('Categoría no encontrada', 404);
  }
  async saveProduct(id, data) {
    return this.transaction(async (tx) => {
      const values = [
        data.categoria_id,
        data.referencia,
        data.nombre,
        data.descripcion_corta,
        data.descripcion,
        data.precio,
        data.activo
      ];
      const r = id
        ? await tx.query(
            'UPDATE productos SET categoria_id=$1,referencia=$2,nombre=$3,descripcion_corta=$4,descripcion=$5,precio=$6,activo=$7 WHERE id=$8 RETURNING *',
            [...values, id]
          )
        : await tx.query(
            'INSERT INTO productos(categoria_id,referencia,nombre,descripcion_corta,descripcion,precio,activo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            values
          );
      if (!r.rowCount) fail('Producto no encontrado', 404);
      await tx.query(
        'INSERT INTO inventario(producto_id) VALUES($1) ON CONFLICT(producto_id) DO NOTHING',
        [r.rows[0].id]
      );
      return r.rows[0];
    });
  }
  async deleteProduct(id) {
    return this.transaction(async (tx) => {
      const p = await tx.query(
        'SELECT id FROM productos WHERE id=$1 FOR UPDATE',
        [id]
      );
      if (!p.rowCount) fail('Producto no encontrado', 404);
      const used = await tx.query(
        'SELECT 1 FROM detalle_orden WHERE producto_id=$1 UNION ALL SELECT 1 FROM movimientos_inventario WHERE producto_id=$1 LIMIT 1',
        [id]
      );
      if (used.rowCount)
        fail(
          'Este producto tiene historial. Desactívalo en lugar de eliminarlo',
          409
        );
      const images = (
        await tx.query(
          'SELECT url FROM producto_imagenes WHERE producto_id=$1',
          [id]
        )
      ).rows;
      await tx.query('DELETE FROM productos WHERE id=$1', [id]);
      return images;
    });
  }
  async addImage(id, url) {
    return this.transaction(async (tx) => {
      if (
        !(
          await tx.query('SELECT id FROM productos WHERE id=$1 FOR UPDATE', [
            id
          ])
        ).rowCount
      )
        fail('Producto no encontrado', 404);
      const rows = (
        await tx.query(
          'SELECT orden FROM producto_imagenes WHERE producto_id=$1',
          [id]
        )
      ).rows;
      const position = [1, 2, 3, 4].find(
        (n) => !rows.some((r) => r.orden === n)
      );
      if (!position) fail('El producto ya tiene cuatro imágenes', 409);
      return (
        await tx.query(
          'INSERT INTO producto_imagenes(producto_id,url,orden) VALUES($1,$2,$3) RETURNING *',
          [id, url, position]
        )
      ).rows[0];
    });
  }
  async removeImage(id, imageId) {
    return this.transaction(async (tx) => {
      await tx.query('SELECT id FROM productos WHERE id=$1 FOR UPDATE', [id]);
      const r = await tx.query(
        'DELETE FROM producto_imagenes WHERE id=$1 AND producto_id=$2 RETURNING url',
        [imageId, id]
      );
      if (!r.rowCount) fail('Imagen no encontrada', 404);
      return r.rows[0].url;
    });
  }
  async reorderImages(id, ids) {
    return this.transaction(async (tx) => {
      await tx.query('SELECT id FROM productos WHERE id=$1 FOR UPDATE', [id]);
      const rows = (
        await tx.query(
          'SELECT * FROM producto_imagenes WHERE producto_id=$1 ORDER BY orden',
          [id]
        )
      ).rows;
      if (
        rows.length !== ids.length ||
        new Set(ids).size !== ids.length ||
        ids.some((i) => !rows.some((r) => r.id === i))
      )
        fail('Orden de imágenes inválido');
      await tx.query('DELETE FROM producto_imagenes WHERE producto_id=$1', [
        id
      ]);
      for (let n = 0; n < ids.length; n++) {
        const img = rows.find((r) => r.id === ids[n]);
        await tx.query(
          'INSERT INTO producto_imagenes(id,producto_id,url,orden,created_at) VALUES($1,$2,$3,$4,$5)',
          [img.id, id, img.url, n + 1, img.created_at]
        );
      }
    });
  }
}
module.exports = { PostgresCatalogRepository };
