const client = require('../../../baseDatos');
const { AdminClientError } = require('../../domain/errors/AdminClientError');

const ACTIVE_APPOINTMENT_STATES = ['pendiente', 'confirmada', 'en_atencion'];

class PostgresAdminClientsRepository {
  async resolveAdminContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredAdminId = sessionUser?.administradorId || sessionUser?.administrador_id || null;

    if (!userId) {
      throw new AdminClientError('No se encontro una sesion valida para consultar clientes', 401, 'AUTH_REQUIRED');
    }

    const result = await client.query(
      `
        SELECT id, nombre, apellido
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
      throw new AdminClientError('No encontramos un perfil administrativo activo para esta sesion', 404, 'ADMIN_NOT_FOUND');
    }

    return result.rows[0];
  }

  async listClients(searchTerm) {
    const query = `
      SELECT
        c.id,
        c.usuario_id,
        c.nombre,
        c.apellido,
        c.cedula,
        c.telefono,
        c.telefono_secundario,
        c.direccion,
        c.activo,
        c.created_at,
        c.updated_at,
        u.email,
        (
          SELECT COUNT(*)
          FROM mascotas m
          WHERE m.cliente_id = c.id
            AND m.activo = true
        )::int AS mascotas_registradas,
        (
          SELECT COUNT(*)
          FROM citas ci
          WHERE ci.cliente_id = c.id
            AND ci.activo = true
            AND ci.estado::text = ANY($2::text[])
        )::int AS citas_activas,
        (
          SELECT COUNT(*)
          FROM historial_servicios hs
          WHERE hs.cliente_id = c.id
        )::int AS servicios_realizados,
        (
          SELECT MAX(hs.fecha_servicio)
          FROM historial_servicios hs
          WHERE hs.cliente_id = c.id
        ) AS ultima_atencion
      FROM clientes c
      INNER JOIN usuarios u ON u.id = c.usuario_id
      WHERE (
        $1::text = ''
        OR concat_ws(' ', c.nombre, c.apellido) ILIKE '%' || $1 || '%'
        OR c.nombre ILIKE '%' || $1 || '%'
        OR c.apellido ILIKE '%' || $1 || '%'
        OR c.cedula ILIKE '%' || $1 || '%'
        OR COALESCE(c.telefono, '') ILIKE '%' || $1 || '%'
        OR COALESCE(c.telefono_secundario, '') ILIKE '%' || $1 || '%'
        OR COALESCE(c.direccion, '') ILIKE '%' || $1 || '%'
        OR u.email ILIKE '%' || $1 || '%'
      )
      ORDER BY c.activo DESC, c.created_at DESC, c.nombre ASC, c.apellido ASC
    `;

    const result = await client.query(query, [searchTerm, ACTIVE_APPOINTMENT_STATES]);
    return result.rows;
  }

  async findClientOverview(identifier) {
    const result = await client.query(
      `
        SELECT
          c.id,
          c.usuario_id,
          c.nombre,
          c.apellido,
          c.cedula,
          c.telefono,
          c.telefono_secundario,
          c.direccion,
          c.activo,
          c.created_at,
          c.updated_at,
          u.email,
          (
            SELECT COUNT(*)
            FROM mascotas m
            WHERE m.cliente_id = c.id
              AND m.activo = true
          )::int AS mascotas_registradas,
          (
            SELECT COUNT(*)
            FROM citas ci
            WHERE ci.cliente_id = c.id
              AND ci.activo = true
              AND ci.estado::text = ANY($2::text[])
          )::int AS citas_activas,
          (
            SELECT COUNT(*)
            FROM historial_servicios hs
            WHERE hs.cliente_id = c.id
          )::int AS servicios_realizados,
          (
            SELECT MAX(hs.fecha_servicio)
            FROM historial_servicios hs
            WHERE hs.cliente_id = c.id
          ) AS ultima_atencion
        FROM clientes c
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.id::text = $1::text
          OR c.cedula = $1::text
        LIMIT 1
      `,
      [String(identifier), ACTIVE_APPOINTMENT_STATES]
    );

    return result.rows[0] || null;
  }

  async listClientPets(clientId) {
    const result = await client.query(
      `
        SELECT
          id,
          nombre,
          raza,
          tamano::text AS tamano,
          tipo_pelaje::text AS tipo_pelaje,
          comportamiento_habitual::text AS comportamiento_habitual,
          activo,
          foto_mascota_url
        FROM mascotas
        WHERE cliente_id = $1::uuid
        ORDER BY activo DESC, created_at DESC, nombre ASC
      `,
      [clientId]
    );

    return result.rows;
  }

  async listRecentAppointments(clientId, limit = 5) {
    const result = await client.query(
      `
        SELECT
          id,
          fecha,
          hora_inicio,
          estado::text AS estado
        FROM citas
        WHERE cliente_id = $1::uuid
          AND activo = true
        ORDER BY fecha DESC, hora_inicio DESC
        LIMIT $2
      `,
      [clientId, limit]
    );

    return result.rows;
  }

  async ensureEmailAvailable(email, excludeUserId) {
    const result = await client.query(
      `
        SELECT id
        FROM usuarios
        WHERE lower(email) = lower($1)
          AND id <> $2::uuid
        LIMIT 1
      `,
      [email, excludeUserId]
    );

    if (result.rowCount) {
      throw new AdminClientError('Ya existe otro usuario registrado con ese correo', 409, 'EMAIL_ALREADY_USED');
    }
  }

  async updateClientProfile(clientId, payload) {
    await client.query('BEGIN');

    try {
      const ownershipResult = await client.query(
        `
          SELECT usuario_id
          FROM clientes
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [clientId]
      );

      if (!ownershipResult.rowCount) {
        throw new AdminClientError('No encontramos el cliente solicitado', 404, 'CLIENT_NOT_FOUND');
      }

      const userId = ownershipResult.rows[0].usuario_id;

      await client.query(
        `
          UPDATE usuarios
          SET
            email = $2,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [userId, payload.email]
      );

      await client.query(
        `
          UPDATE clientes
          SET
            nombre = $2,
            apellido = $3,
            telefono = $4,
            telefono_secundario = $5,
            direccion = $6,
            activo = $7,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [
          clientId,
          payload.nombre,
          payload.apellido,
          payload.telefono,
          payload.telefono_secundario,
          payload.direccion,
          payload.activo
        ]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}

module.exports = { PostgresAdminClientsRepository };
