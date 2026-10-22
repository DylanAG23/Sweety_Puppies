const client = require('../../../baseDatos');
const { AdminAgendaError } = require('../../domain/errors/AdminAgendaError');

class PostgresAdminAgendaRepository {
  async resolveAdminContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredAdminId = sessionUser?.administradorId || sessionUser?.administrador_id || null;

    if (!userId) {
      throw new AdminAgendaError('No se encontro una sesion valida para consultar la agenda', 401, 'AUTH_REQUIRED');
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
      throw new AdminAgendaError('No encontramos un perfil administrativo activo para esta sesion', 404, 'ADMIN_NOT_FOUND');
    }

    return result.rows[0];
  }

  async getBusinessScheduleForDate(dayName) {
    const result = await client.query(
      `
        SELECT
          dia::text AS dia,
          hora_apertura,
          hora_cierre,
          ultima_cita,
          duracion_base_minutos,
          abierto
        FROM horarios_negocio
        WHERE dia::text = $1
        LIMIT 1
      `,
      [dayName]
    );

    return result.rows[0] || null;
  }

  async listActiveBlocksForDate(fecha) {
    const result = await client.query(
      `
        SELECT
          id,
          fecha,
          hora_inicio,
          hora_fin,
          motivo,
          activo,
          created_at
        FROM bloqueos_agenda
        WHERE fecha = $1::date
          AND activo = true
        ORDER BY COALESCE(hora_inicio, '00:00'::time) ASC, created_at ASC
      `,
      [fecha]
    );

    return result.rows;
  }

  async listUpcomingBlocks(fromDate, limit = 12) {
    const result = await client.query(
      `
        SELECT
          id,
          fecha,
          hora_inicio,
          hora_fin,
          motivo,
          activo,
          created_at
        FROM bloqueos_agenda
        WHERE fecha >= $1::date
          AND activo = true
        ORDER BY fecha ASC, COALESCE(hora_inicio, '00:00'::time) ASC, created_at ASC
        LIMIT $2
      `,
      [fromDate, limit]
    );

    return result.rows;
  }

  async listAppointmentsByDate(fecha, appointmentStates) {
    const result = await client.query(
      `
        SELECT
          c.id,
          c.fecha,
          c.hora_inicio,
          c.hora_fin_estimada,
          c.estado::text AS estado,
          c.precio_base,
          c.precio_calculado,
          c.precio_final,
          c.created_at,
          CONCAT_WS(' ', cl.nombre, cl.apellido) AS cliente_nombre,
          cl.telefono AS cliente_telefono,
          m.nombre AS mascota_nombre,
          m.raza AS mascota_raza,
          m.foto_mascota_url AS mascota_foto_url,
          s.nombre AS servicio_nombre
        FROM citas c
        INNER JOIN clientes cl ON cl.id = c.cliente_id
        INNER JOIN mascotas m ON m.id = c.mascota_id
        INNER JOIN servicios s ON s.id = c.servicio_id
        WHERE c.fecha = $1::date
          AND c.activo = true
          AND c.estado::text = ANY($2::text[])
        ORDER BY c.hora_inicio ASC, c.created_at ASC
      `,
      [fecha, appointmentStates]
    );

    return result.rows;
  }

  async findAppointmentDetail(appointmentId) {
    const result = await client.query(
      `
        SELECT
          c.id,
          c.fecha,
          c.hora_inicio,
          c.hora_fin_estimada,
          c.estado::text AS estado,
          c.estado_pelaje_reportado::text AS estado_pelaje_reportado,
          c.comportamiento_reportado::text AS comportamiento_reportado,
          c.foto_estado_actual_url,
          c.observaciones_cliente,
          c.observaciones_admin,
          c.precio_base,
          c.precio_calculado,
          c.precio_final,
          CONCAT_WS(' ', cl.nombre, cl.apellido) AS cliente_nombre,
          cl.telefono AS cliente_telefono,
          u.email AS cliente_email,
          m.id AS mascota_id,
          m.nombre AS mascota_nombre,
          m.raza AS mascota_raza,
          m.tamano::text AS mascota_tamano,
          m.tipo_pelaje::text AS mascota_tipo_pelaje,
          m.foto_mascota_url AS mascota_foto_url,
          s.id AS servicio_id,
          s.nombre AS servicio_nombre
        FROM citas c
        INNER JOIN clientes cl ON cl.id = c.cliente_id
        INNER JOIN usuarios u ON u.id = cl.usuario_id
        INNER JOIN mascotas m ON m.id = c.mascota_id
        INNER JOIN servicios s ON s.id = c.servicio_id
        WHERE c.id = $1::uuid
          AND c.activo = true
        LIMIT 1
      `,
      [appointmentId]
    );

    if (!result.rowCount) {
      return null;
    }

    const row = result.rows[0];
    const additionalResult = await client.query(
      `
        SELECT
          sa.id,
          sa.nombre,
          csa.precio_aplicado
        FROM cita_servicios_adicionales csa
        INNER JOIN servicios_adicionales sa ON sa.id = csa.servicio_adicional_id
        WHERE csa.cita_id = $1::uuid
        ORDER BY sa.nombre ASC
      `,
      [appointmentId]
    );

    return {
      id: row.id,
      fecha: row.fecha,
      horaInicio: row.hora_inicio,
      horaFinEstimada: row.hora_fin_estimada,
      estado: row.estado,
      estadoPelajeReportado: row.estado_pelaje_reportado,
      comportamientoReportado: row.comportamiento_reportado,
      fotoEstadoActualUrl: row.foto_estado_actual_url,
      observacionesCliente: row.observaciones_cliente,
      observacionesAdmin: row.observaciones_admin,
      precioBase: row.precio_base,
      precioCalculado: row.precio_calculado,
      precioFinal: row.precio_final,
      cliente: {
        nombre: row.cliente_nombre,
        telefono: row.cliente_telefono,
        email: row.cliente_email
      },
      mascota: {
        id: row.mascota_id,
        nombre: row.mascota_nombre,
        raza: row.mascota_raza,
        tamano: row.mascota_tamano,
        tipoPelaje: row.mascota_tipo_pelaje,
        fotoUrl: row.mascota_foto_url
      },
      servicioPrincipal: {
        id: row.servicio_id,
        nombre: row.servicio_nombre
      },
      serviciosAdicionales: additionalResult.rows.map((additional) => ({
        id: additional.id,
        nombre: additional.nombre,
        precio: additional.precio_aplicado
      }))
    };
  }

  async updateAppointmentToConfirmed(appointmentId, adminId) {
    await client.query(
      `
        UPDATE citas
        SET
          estado = 'confirmada',
          administrador_id = COALESCE($2::uuid, administrador_id),
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [appointmentId, adminId]
    );
  }

  async hasOverlappingBlock({ fecha, horaInicio, horaFin }) {
    if (!horaInicio && !horaFin) {
      const result = await client.query(
        `
          SELECT id
          FROM bloqueos_agenda
          WHERE fecha = $1::date
            AND activo = true
          LIMIT 1
        `,
        [fecha]
      );

      return result.rowCount > 0;
    }

    const result = await client.query(
      `
        SELECT id
        FROM bloqueos_agenda
        WHERE fecha = $1::date
          AND activo = true
          AND (
            (hora_inicio IS NULL AND hora_fin IS NULL)
            OR (
              COALESCE(hora_inicio, '00:00'::time) < $3::time
              AND COALESCE(hora_fin, '23:59'::time) > $2::time
            )
          )
        LIMIT 1
      `,
      [fecha, horaInicio, horaFin]
    );

    return result.rowCount > 0;
  }

  async createBlock({ adminId, fecha, horaInicio, horaFin, motivo }) {
    const result = await client.query(
      `
        INSERT INTO bloqueos_agenda (
          administrador_id,
          fecha,
          hora_inicio,
          hora_fin,
          motivo,
          activo
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3::time,
          $4::time,
          $5::varchar,
          true
        )
        RETURNING
          id,
          fecha,
          hora_inicio,
          hora_fin,
          motivo,
          activo,
          created_at
      `,
      [adminId, fecha, horaInicio, horaFin, motivo]
    );

    return result.rows[0];
  }

  async deactivateBlock(blockId) {
    const result = await client.query(
      `
        UPDATE bloqueos_agenda
        SET
          activo = false,
          updated_at = NOW()
        WHERE id = $1::uuid
          AND activo = true
        RETURNING id
      `,
      [blockId]
    );

    return result.rowCount > 0;
  }
}

module.exports = { PostgresAdminAgendaRepository };
