const client = require('../../../baseDatos');
const { AdminServiceError } = require('../../domain/errors/AdminServiceError');

class PostgresAdminServicesRepository {
  async resolveAdminContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredAdminId = sessionUser?.administradorId || sessionUser?.administrador_id || null;

    if (!userId) {
      throw new AdminServiceError('No se encontro una sesion valida para consultar servicios', 401, 'AUTH_REQUIRED');
    }

    const result = await client.query(
      `
        SELECT id
        FROM administradores
        WHERE usuario_id = $1::uuid
          AND activo = true
        ORDER BY
          CASE
            WHEN $2::uuid IS NOT NULL AND id = $2::uuid THEN 0
            ELSE 1
          END,
          created_at ASC,
          id ASC
        LIMIT 1
      `,
      [userId, preferredAdminId]
    );

    if (!result.rowCount) {
      throw new AdminServiceError('No encontramos un perfil administrativo activo para esta sesion', 404, 'ADMIN_NOT_FOUND');
    }

    return result.rows[0];
  }

  async listPrimaryServices(search) {
    const result = await client.query(
      `
        SELECT
          s.id,
          s.nombre,
          s.descripcion,
          s.duracion_minutos,
          s.requiere_tamano,
          s.requiere_tipo_pelaje,
          s.aplica_recargo_nudos,
          s.aplica_recargo_comportamiento,
          s.activo,
          s.created_at,
          s.updated_at,
          COALESCE((
            SELECT MIN(ts.precio_base)
            FROM tarifas_servicio ts
            WHERE ts.servicio_id = s.id
              AND ts.activo = true
          ), 0) AS precio_desde,
          COALESCE((
            SELECT MAX(ts.precio_base)
            FROM tarifas_servicio ts
            WHERE ts.servicio_id = s.id
              AND ts.activo = true
          ), 0) AS precio_hasta
        FROM servicios s
        WHERE (
          $1::text = ''
          OR s.nombre ILIKE '%' || $1 || '%'
          OR COALESCE(s.descripcion, '') ILIKE '%' || $1 || '%'
        )
        ORDER BY s.activo DESC, s.nombre ASC, s.created_at DESC
      `,
      [search]
    );

    return result.rows;
  }

  async listAdditionalServices(search) {
    const result = await client.query(
      `
        SELECT
          sa.id,
          sa.nombre,
          sa.descripcion,
          sa.activo,
          sa.created_at,
          sa.updated_at,
          COALESCE((
            SELECT MIN(tsa.precio)
            FROM tarifas_servicio_adicional tsa
            WHERE tsa.servicio_adicional_id = sa.id
              AND tsa.activo = true
          ), 0) AS precio_desde,
          COALESCE((
            SELECT MAX(tsa.precio)
            FROM tarifas_servicio_adicional tsa
            WHERE tsa.servicio_adicional_id = sa.id
              AND tsa.activo = true
          ), 0) AS precio_hasta
        FROM servicios_adicionales sa
        WHERE (
          $1::text = ''
          OR sa.nombre ILIKE '%' || $1 || '%'
          OR COALESCE(sa.descripcion, '') ILIKE '%' || $1 || '%'
        )
        ORDER BY sa.activo DESC, sa.nombre ASC, sa.created_at DESC
      `,
      [search]
    );

    return result.rows;
  }

  async findPrimaryServiceById(identifier) {
    const result = await client.query(
      `
        SELECT
          id,
          nombre,
          descripcion,
          duracion_minutos,
          requiere_tamano,
          requiere_tipo_pelaje,
          aplica_recargo_nudos,
          aplica_recargo_comportamiento,
          activo,
          created_at,
          updated_at
        FROM servicios
        WHERE id::text = $1::text
        LIMIT 1
      `,
      [String(identifier)]
    );

    if (!result.rowCount) {
      return null;
    }

    const service = result.rows[0];
    const tariffResult = await client.query(
      `
        SELECT
          tamano::text AS tamano,
          tipo_pelaje::text AS tipo_pelaje,
          precio_base
        FROM tarifas_servicio
        WHERE servicio_id = $1::uuid
          AND activo = true
        ORDER BY
          CASE tamano::text
            WHEN 'miniatura' THEN 0
            WHEN 'pequeno' THEN 1
            WHEN 'mediano' THEN 2
            WHEN 'grande' THEN 3
            WHEN 'extra grande' THEN 4
            ELSE 5
          END,
          CASE tipo_pelaje::text
            WHEN 'corto' THEN 0
            WHEN 'largo' THEN 1
            ELSE 2
          END
      `,
      [service.id]
    );

    return {
      ...service,
      tarifas: tariffResult.rows
    };
  }

  async findAdditionalServiceById(identifier) {
    const result = await client.query(
      `
        SELECT
          id,
          nombre,
          descripcion,
          activo,
          created_at,
          updated_at
        FROM servicios_adicionales
        WHERE id::text = $1::text
        LIMIT 1
      `,
      [String(identifier)]
    );

    if (!result.rowCount) {
      return null;
    }

    const service = result.rows[0];
    const tariffResult = await client.query(
      `
        SELECT
          tamano::text AS tamano,
          precio
        FROM tarifas_servicio_adicional
        WHERE servicio_adicional_id = $1::uuid
          AND activo = true
        ORDER BY
          CASE tamano::text
            WHEN 'miniatura' THEN 0
            WHEN 'pequeno' THEN 1
            WHEN 'mediano' THEN 2
            WHEN 'grande' THEN 3
            WHEN 'extra grande' THEN 4
            ELSE 5
          END
      `,
      [service.id]
    );

    return {
      ...service,
      tarifas: tariffResult.rows
    };
  }

  async ensurePrimaryServiceNameAvailable(nombre, excludeId = null) {
    const result = await client.query(
      `
        SELECT id
        FROM servicios
        WHERE lower(nombre) = lower($1)
          AND ($2::uuid IS NULL OR id <> $2::uuid)
        LIMIT 1
      `,
      [nombre, excludeId]
    );

    if (result.rowCount) {
      throw new AdminServiceError('Ya existe un servicio principal registrado con ese nombre', 409, 'SERVICE_NAME_ALREADY_USED');
    }
  }

  async ensureAdditionalServiceNameAvailable(nombre, excludeId = null) {
    const result = await client.query(
      `
        SELECT id
        FROM servicios_adicionales
        WHERE lower(nombre) = lower($1)
          AND ($2::uuid IS NULL OR id <> $2::uuid)
        LIMIT 1
      `,
      [nombre, excludeId]
    );

    if (result.rowCount) {
      throw new AdminServiceError(
        'Ya existe un servicio adicional registrado con ese nombre',
        409,
        'ADDITIONAL_SERVICE_NAME_ALREADY_USED'
      );
    }
  }

  async runInTransaction(work) {
    await client.query('BEGIN');
    try {
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    }
  }

  async createPrimaryService(payload) {
    return this.runInTransaction(async (db) => {
      const serviceResult = await db.query(
        `
          INSERT INTO servicios (
            nombre,
            descripcion,
            duracion_minutos,
            requiere_tamano,
            requiere_tipo_pelaje,
            aplica_recargo_nudos,
            aplica_recargo_comportamiento,
            activo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `,
        [
          payload.nombre,
          payload.descripcion,
          payload.duracion_minutos,
          payload.requiere_tamano,
          payload.requiere_tipo_pelaje,
          payload.aplica_recargo_nudos,
          payload.aplica_recargo_comportamiento,
          payload.activo
        ]
      );

      const serviceId = serviceResult.rows[0].id;
      await this.replacePrimaryTariffs(serviceId, payload.tarifas, db);
      return this.findPrimaryServiceById(serviceId);
    });
  }

  async updatePrimaryService(serviceId, payload) {
    return this.runInTransaction(async (db) => {
      await db.query(
        `
          UPDATE servicios
          SET
            nombre = $2,
            descripcion = $3,
            duracion_minutos = $4,
            requiere_tamano = $5,
            requiere_tipo_pelaje = $6,
            aplica_recargo_nudos = $7,
            aplica_recargo_comportamiento = $8,
            activo = $9,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [
          serviceId,
          payload.nombre,
          payload.descripcion,
          payload.duracion_minutos,
          payload.requiere_tamano,
          payload.requiere_tipo_pelaje,
          payload.aplica_recargo_nudos,
          payload.aplica_recargo_comportamiento,
          payload.activo
        ]
      );

      await this.replacePrimaryTariffs(serviceId, payload.tarifas, db);
      return this.findPrimaryServiceById(serviceId);
    });
  }

  async updatePrimaryServiceStatus(serviceId, activo) {
    const result = await client.query(
      `
        UPDATE servicios
        SET
          activo = $2,
          updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING
          id,
          nombre,
          descripcion,
          duracion_minutos,
          requiere_tamano,
          requiere_tipo_pelaje,
          aplica_recargo_nudos,
          aplica_recargo_comportamiento,
          activo,
          created_at,
          updated_at
      `,
      [serviceId, activo]
    );

    return result.rows[0];
  }

  async createAdditionalService(payload) {
    return this.runInTransaction(async (db) => {
      const serviceResult = await db.query(
        `
          INSERT INTO servicios_adicionales (
            nombre,
            descripcion,
            activo
          )
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [payload.nombre, payload.descripcion, payload.activo]
      );

      const serviceId = serviceResult.rows[0].id;
      await this.replaceAdditionalTariffs(serviceId, payload.tarifas, db);
      return this.findAdditionalServiceById(serviceId);
    });
  }

  async updateAdditionalService(serviceId, payload) {
    return this.runInTransaction(async (db) => {
      await db.query(
        `
          UPDATE servicios_adicionales
          SET
            nombre = $2,
            descripcion = $3,
            activo = $4,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [serviceId, payload.nombre, payload.descripcion, payload.activo]
      );

      await this.replaceAdditionalTariffs(serviceId, payload.tarifas, db);
      return this.findAdditionalServiceById(serviceId);
    });
  }

  async updateAdditionalServiceStatus(serviceId, activo) {
    const result = await client.query(
      `
        UPDATE servicios_adicionales
        SET
          activo = $2,
          updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING
          id,
          nombre,
          descripcion,
          activo,
          created_at,
          updated_at
      `,
      [serviceId, activo]
    );

    return result.rows[0];
  }

  async replacePrimaryTariffs(serviceId, tariffs, db = client) {
    await db.query(
      `
        UPDATE tarifas_servicio
        SET
          activo = false,
          updated_at = NOW()
        WHERE servicio_id = $1::uuid
          AND activo = true
      `,
      [serviceId]
    );

    for (const tariff of tariffs) {
      await db.query(
        `
          INSERT INTO tarifas_servicio (
            servicio_id,
            tamano,
            tipo_pelaje,
            precio_base,
            activo
          )
          VALUES ($1::uuid, $2, $3, $4::integer, true)
        `,
        [serviceId, tariff.tamano, tariff.tipo_pelaje, tariff.precio_base]
      );
    }
  }

  async replaceAdditionalTariffs(serviceId, tariffs, db = client) {
    await db.query(
      `
        UPDATE tarifas_servicio_adicional
        SET
          activo = false,
          updated_at = NOW()
        WHERE servicio_adicional_id = $1::uuid
          AND activo = true
      `,
      [serviceId]
    );

    for (const tariff of tariffs) {
      await db.query(
        `
          INSERT INTO tarifas_servicio_adicional (
            servicio_adicional_id,
            tamano,
            precio,
            activo
          )
          VALUES ($1::uuid, $2, $3::integer, true)
        `,
        [serviceId, tariff.tamano, tariff.precio]
      );
    }
  }
}

module.exports = { PostgresAdminServicesRepository };
