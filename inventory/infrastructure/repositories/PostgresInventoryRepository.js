const client = require('../../../baseDatos');

const BOGOTA_TIME_ZONE = 'America/Bogota';

function mapInventoryRow(row) {
  return {
    productoId: row.producto_id,
    nombre: row.nombre,
    referencia: row.referencia,
    categoriaId: row.categoria_id,
    categoriaNombre: row.categoria_nombre,
    precio: row.precio,
    activo: row.activo,
    stockActual: Number(row.stock_actual) || 0,
    stockMinimo: Number(row.stock_minimo) || 0,
    actualizado: row.inventario_actualizado || null
  };
}

function mapMovementRow(row) {
  return {
    id: row.id,
    fecha: row.created_at,
    productoId: row.producto_id,
    productoNombre: row.producto_nombre,
    productoReferencia: row.producto_referencia,
    tipo: row.tipo_movimiento,
    cantidad: row.cantidad,
    stockAnterior: row.stock_anterior,
    stockResultante: row.stock_resultante,
    motivo: row.motivo,
    observacion: row.observacion,
    ordenId: row.orden_id,
    ordenCodigo: row.orden_codigo || null,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre || null
  };
}

const INVENTORY_SELECT = `
  SELECT
    p.id AS producto_id,
    p.nombre,
    p.referencia,
    p.precio,
    p.activo,
    p.categoria_id,
    c.nombre AS categoria_nombre,
    COALESCE(i.stock_actual, 0) AS stock_actual,
    COALESCE(i.stock_minimo, 0) AS stock_minimo,
    i.updated_at AS inventario_actualizado
  FROM productos p
  INNER JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN inventario i ON i.producto_id = p.id
`;

class PostgresInventoryRepository {
  async runInTransaction(work) {
    return client.withTransaction(work);
  }

  async listInventory() {
    const result = await client.query(`${INVENTORY_SELECT} ORDER BY lower(p.nombre) ASC, p.referencia ASC`);
    return result.rows.map(mapInventoryRow);
  }

  async findProductInventory(productId) {
    const result = await client.query(`${INVENTORY_SELECT} WHERE p.id = $1::uuid`, [productId]);
    return result.rowCount ? mapInventoryRow(result.rows[0]) : null;
  }

  async countMovementsToday() {
    const result = await client.query(
      `
        SELECT COUNT(*)::integer AS total
        FROM movimientos_inventario
        WHERE (created_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date
      `,
      [BOGOTA_TIME_ZONE]
    );

    return result.rows[0]?.total || 0;
  }

  // Crea la fila de inventario si el producto aun no la tiene y la bloquea
  // hasta el final de la transaccion, para que dos operaciones simultaneas no
  // lean el mismo stock. Devuelve null si el producto no existe.
  async lockInventoryForProduct(db, productId) {
    await db.query(
      `
        INSERT INTO inventario (producto_id)
        SELECT p.id FROM productos p WHERE p.id = $1::uuid
        ON CONFLICT (producto_id) DO NOTHING
      `,
      [productId]
    );

    const result = await db.query(
      `
        SELECT i.stock_actual, i.stock_minimo, p.nombre, p.referencia
        FROM inventario i
        INNER JOIN productos p ON p.id = i.producto_id
        WHERE i.producto_id = $1::uuid
        FOR UPDATE OF i
      `,
      [productId]
    );

    if (!result.rowCount) {
      return null;
    }

    const row = result.rows[0];
    return {
      nombre: row.nombre,
      referencia: row.referencia,
      stockActual: Number(row.stock_actual) || 0,
      stockMinimo: Number(row.stock_minimo) || 0
    };
  }

  async updateStock(db, productId, stockActual) {
    await db.query('UPDATE inventario SET stock_actual = $2::integer WHERE producto_id = $1::uuid', [productId, stockActual]);
  }

  async insertMovement(db, movement) {
    const result = await db.query(
      `
        INSERT INTO movimientos_inventario (
          producto_id, orden_id, usuario_id, tipo_movimiento, cantidad,
          stock_anterior, stock_resultante, motivo, observacion
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::tipo_movimiento_enum, $5::integer, $6::integer, $7::integer, $8, $9)
        RETURNING id, created_at, tipo_movimiento::text AS tipo_movimiento, cantidad,
          stock_anterior, stock_resultante, motivo, observacion, orden_id, usuario_id
      `,
      [
        movement.productoId,
        movement.ordenId,
        movement.usuarioId,
        movement.tipo,
        movement.cantidad,
        movement.stockAnterior,
        movement.stockResultante,
        movement.motivo,
        movement.observacion
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      fecha: row.created_at,
      productoId: movement.productoId,
      tipo: row.tipo_movimiento,
      cantidad: row.cantidad,
      stockAnterior: row.stock_anterior,
      stockResultante: row.stock_resultante,
      motivo: row.motivo,
      observacion: row.observacion,
      ordenId: row.orden_id,
      usuarioId: row.usuario_id
    };
  }

  // Devuelve null si el producto no existe.
  async updateMinimumStock(productId, stockMinimo) {
    const result = await client.query(
      `
        INSERT INTO inventario (producto_id, stock_minimo)
        SELECT p.id, $2::integer FROM productos p WHERE p.id = $1::uuid
        ON CONFLICT (producto_id) DO UPDATE SET stock_minimo = EXCLUDED.stock_minimo
        RETURNING producto_id
      `,
      [productId, stockMinimo]
    );

    return result.rowCount ? this.findProductInventory(productId) : null;
  }

  async listMovements(filters) {
    const params = [];
    const where = [];

    if (filters.desde || filters.hasta) {
      params.push(BOGOTA_TIME_ZONE);
    }

    if (filters.desde) {
      params.push(filters.desde);
      where.push(`(m.created_at AT TIME ZONE $1)::date >= $${params.length}::date`);
    }

    if (filters.hasta) {
      params.push(filters.hasta);
      where.push(`(m.created_at AT TIME ZONE $1)::date <= $${params.length}::date`);
    }

    if (filters.tipo && filters.tipo !== 'todos') {
      params.push(filters.tipo);
      where.push(`m.tipo_movimiento::text = $${params.length}`);
    }

    if (filters.productoId) {
      params.push(filters.productoId);
      where.push(`m.producto_id = $${params.length}::uuid`);
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      where.push(`(lower(p.nombre) LIKE $${params.length} OR lower(p.referencia) LIKE $${params.length})`);
    }

    const fromClause = `
      FROM movimientos_inventario m
      INNER JOIN productos p ON p.id = m.producto_id
    `;
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const summaryResult = await client.query(
      `
        SELECT
          COUNT(*)::integer AS total,
          COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo_movimiento = 'entrada'), 0)::integer AS entradas,
          COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo_movimiento = 'salida'), 0)::integer AS salidas,
          COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo_movimiento = 'ajuste'), 0)::integer AS ajustes,
          COUNT(*) FILTER (WHERE m.tipo_movimiento = 'ajuste')::integer AS cantidad_ajustes
        ${fromClause}
        ${whereClause}
      `,
      params
    );

    const listParams = [...params];
    let pagination = '';

    if (filters.pageSize) {
      listParams.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
      pagination = `LIMIT $${listParams.length - 1}::integer OFFSET $${listParams.length}::integer`;
    }

    const listResult = await client.query(
      `
        SELECT
          m.id,
          m.created_at,
          m.producto_id,
          p.nombre AS producto_nombre,
          p.referencia AS producto_referencia,
          m.tipo_movimiento::text AS tipo_movimiento,
          m.cantidad,
          m.stock_anterior,
          m.stock_resultante,
          m.motivo,
          m.observacion,
          m.orden_id,
          o.codigo AS orden_codigo,
          m.usuario_id,
          COALESCE(
            NULLIF(CONCAT_WS(' ', a.nombre, a.apellido), ''),
            a.username,
            u.email
          ) AS usuario_nombre
        ${fromClause}
        LEFT JOIN ordenes o ON o.id = m.orden_id
        LEFT JOIN usuarios u ON u.id = m.usuario_id
        LEFT JOIN administradores a ON a.usuario_id = m.usuario_id
        ${whereClause}
        ORDER BY m.created_at DESC, m.id DESC
        ${pagination}
      `,
      listParams
    );

    const summary = summaryResult.rows[0];

    return {
      total: summary.total,
      resumen: {
        entradas: summary.entradas,
        salidas: summary.salidas,
        ajustesNeto: summary.ajustes,
        cantidadAjustes: summary.cantidad_ajustes
      },
      movimientos: listResult.rows.map(mapMovementRow)
    };
  }
}

module.exports = { PostgresInventoryRepository };
