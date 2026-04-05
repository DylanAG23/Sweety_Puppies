const client = require('../../../baseDatos');
const { AdminPetError } = require('../../domain/errors/AdminPetError');

const ACTIVE_APPOINTMENT_STATES = ['pendiente', 'confirmada', 'en_atencion'];

class PostgresAdminPetsRepository {
  async resolveAdminContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredAdminId = sessionUser?.administradorId || sessionUser?.administrador_id || null;

    if (!userId) {
      throw new AdminPetError('No se encontro una sesion valida para consultar mascotas', 401, 'AUTH_REQUIRED');
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
      throw new AdminPetError('No encontramos un perfil administrativo activo para esta sesion', 404, 'ADMIN_NOT_FOUND');
    }

    return result.rows[0];
  }

  async listPets(searchTerm) {
    const result = await client.query(
      `
        SELECT
          m.id,
          m.cliente_id,
          m.nombre,
          m.raza,
          m.tamano::text AS tamano,
          m.sexo::text AS sexo,
          m.edad,
          m.tipo_pelaje::text AS tipo_pelaje,
          m.comportamiento_habitual::text AS comportamiento_habitual,
          m.foto_mascota_url,
          m.activo,
          m.created_at,
          c.nombre AS cliente_nombre,
          c.apellido AS cliente_apellido,
          c.cedula AS cliente_cedula,
          u.email AS cliente_email,
          (
            SELECT COUNT(*)
            FROM historial_servicios hs
            WHERE hs.mascota_id = m.id
          )::int AS servicios_realizados,
          (
            SELECT COUNT(*)
            FROM citas ci
            WHERE ci.mascota_id = m.id
              AND ci.activo = true
              AND ci.estado::text = ANY($2::text[])
          )::int AS citas_activas,
          (
            SELECT MAX(hs.fecha_servicio)
            FROM historial_servicios hs
            WHERE hs.mascota_id = m.id
          ) AS ultimo_servicio
        FROM mascotas m
        INNER JOIN clientes c ON c.id = m.cliente_id
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE (
          $1::text = ''
          OR m.nombre ILIKE '%' || $1 || '%'
          OR COALESCE(m.raza, '') ILIKE '%' || $1 || '%'
          OR m.tamano::text ILIKE '%' || $1 || '%'
          OR m.tipo_pelaje::text ILIKE '%' || $1 || '%'
          OR concat_ws(' ', c.nombre, c.apellido) ILIKE '%' || $1 || '%'
          OR c.cedula ILIKE '%' || $1 || '%'
        )
        ORDER BY m.activo DESC, m.created_at DESC, m.nombre ASC
      `,
      [searchTerm, ACTIVE_APPOINTMENT_STATES]
    );

    return result.rows;
  }

  async findPetOverview(identifier) {
    const result = await client.query(
      `
        SELECT
          m.id,
          m.cliente_id,
          m.nombre,
          m.raza,
          m.tamano::text AS tamano,
          m.sexo::text AS sexo,
          m.edad,
          m.tipo_pelaje::text AS tipo_pelaje,
          m.comportamiento_habitual::text AS comportamiento_habitual,
          m.alergias,
          m.enfermedades,
          m.cosas_no_le_gustan,
          m.fecha_ultimo_bano,
          m.vacunacion_al_dia,
          m.desparasitacion_interna_al_dia,
          m.desparasitacion_externa_al_dia,
          m.foto_mascota_url,
          m.foto_carnet_vacunacion_url,
          m.observaciones,
          m.activo,
          m.created_at,
          m.updated_at,
          c.id AS cliente_id_relacionado,
          c.nombre AS cliente_nombre,
          c.apellido AS cliente_apellido,
          c.cedula AS cliente_cedula,
          c.telefono AS cliente_telefono,
          c.telefono_secundario AS cliente_telefono_secundario,
          c.direccion AS cliente_direccion,
          c.activo AS cliente_activo,
          u.email AS cliente_email,
          (
            SELECT COUNT(*)
            FROM historial_servicios hs
            WHERE hs.mascota_id = m.id
          )::int AS servicios_realizados,
          (
            SELECT COUNT(*)
            FROM citas ci
            WHERE ci.mascota_id = m.id
              AND ci.activo = true
              AND ci.estado::text = ANY($2::text[])
          )::int AS citas_activas,
          (
            SELECT MAX(hs.fecha_servicio)
            FROM historial_servicios hs
            WHERE hs.mascota_id = m.id
          ) AS ultimo_servicio
        FROM mascotas m
        INNER JOIN clientes c ON c.id = m.cliente_id
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE m.id::text = $1::text
        LIMIT 1
      `,
      [String(identifier), ACTIVE_APPOINTMENT_STATES]
    );

    return result.rows[0] || null;
  }

  async listPetHistory(petId) {
    const result = await client.query(
      `
        SELECT
          id,
          cita_id,
          fecha_servicio,
          servicio_principal_nombre,
          servicios_adicionales_resumen,
          resumen_servicio_realizado,
          observaciones_finales,
          recomendaciones,
          precio_base,
          precio_calculado,
          precio_final
        FROM historial_servicios
        WHERE mascota_id = $1::uuid
        ORDER BY fecha_servicio DESC, created_at DESC
      `,
      [petId]
    );

    return result.rows;
  }

  async updatePetProfile(petId, payload) {
    await client.query(
      `
        UPDATE mascotas
        SET
          nombre = $2,
          raza = $3,
          tamano = $4,
          sexo = $5,
          edad = $6,
          tipo_pelaje = $7,
          comportamiento_habitual = $8,
          alergias = $9,
          enfermedades = $10,
          cosas_no_le_gustan = $11,
          fecha_ultimo_bano = $12,
          vacunacion_al_dia = $13,
          desparasitacion_interna_al_dia = $14,
          desparasitacion_externa_al_dia = $15,
          observaciones = $16,
          activo = $17,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [
        petId,
        payload.nombre,
        payload.raza,
        payload.tamano,
        payload.sexo,
        payload.edad,
        payload.tipo_pelaje,
        payload.comportamiento_habitual,
        payload.alergias,
        payload.enfermedades,
        payload.cosas_no_le_gustan,
        payload.fecha_ultimo_bano,
        payload.vacunacion_al_dia,
        payload.desparasitacion_interna_al_dia,
        payload.desparasitacion_externa_al_dia,
        payload.observaciones,
        payload.activo
      ]
    );
  }
}

module.exports = { PostgresAdminPetsRepository };
