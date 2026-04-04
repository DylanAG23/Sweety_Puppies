const client = require('../../../baseDatos');
const { AppointmentError } = require('../../domain/errors/AppointmentError');

class PostgresClientAppointmentsRepository {
  async resolveClientContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredClientId = sessionUser?.clienteId || sessionUser?.cliente_id || null;

    if (!userId) {
      throw new AppointmentError('No se encontro una sesion valida para consultar citas', 401, 'AUTH_REQUIRED');
    }

    const result = await client.query(
      `
        SELECT id
        FROM clientes
        WHERE usuario_id = $1
          AND activo = true
        ORDER BY
          CASE
            WHEN $2::uuid IS NOT NULL AND id = $2::uuid THEN 0
            ELSE 1
          END,
          created_at ASC,
          id ASC
      `,
      [userId, preferredClientId]
    );

    if (!result.rowCount) {
      throw new AppointmentError('No se encontro un perfil de cliente activo para esta sesion', 404, 'CLIENT_NOT_FOUND');
    }

    return {
      primaryClientId: result.rows[0].id,
      clientIds: result.rows.map((row) => row.id)
    };
  }

  async listClientPets(clientIds) {
    const result = await client.query(
      `
        SELECT
          id,
          nombre,
          raza,
          tamano::text AS tamano,
          tipo_pelaje::text AS tipo_pelaje,
          comportamiento_habitual::text AS comportamiento_habitual,
          foto_mascota_url
        FROM mascotas
        WHERE cliente_id = ANY($1::uuid[])
          AND activo = true
        ORDER BY nombre ASC
      `,
      [clientIds]
    );

    return result.rows;
  }

  async findOwnedPet(petId, clientIds) {
    const result = await client.query(
      `
        SELECT
          id,
          nombre,
          raza,
          tamano::text AS tamano,
          tipo_pelaje::text AS tipo_pelaje,
          comportamiento_habitual::text AS comportamiento_habitual,
          foto_mascota_url
        FROM mascotas
        WHERE id = $1::uuid
          AND cliente_id = ANY($2::uuid[])
          AND activo = true
        LIMIT 1
      `,
      [petId, clientIds]
    );

    return result.rows[0] || null;
  }

  async listActiveServices() {
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
          aplica_recargo_comportamiento
        FROM servicios
        WHERE activo = true
        ORDER BY nombre ASC
      `
    );

    return result.rows;
  }

  async findActiveService(serviceId) {
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
          aplica_recargo_comportamiento
        FROM servicios
        WHERE id = $1::uuid
          AND activo = true
        LIMIT 1
      `,
      [serviceId]
    );

    return result.rows[0] || null;
  }

  async listActiveAdditionalServices() {
    const result = await client.query(
      `
        SELECT id, nombre, descripcion
        FROM servicios_adicionales
        WHERE activo = true
        ORDER BY nombre ASC
      `
    );

    return result.rows;
  }

  async findActiveAdditionalServicesByIds(ids) {
    if (!ids.length) {
      return [];
    }

    const result = await client.query(
      `
        SELECT id, nombre, descripcion
        FROM servicios_adicionales
        WHERE id = ANY($1::uuid[])
          AND activo = true
      `,
      [ids]
    );

    return result.rows;
  }

  async findBaseServicePrice(serviceId, tamano, tipoPelaje) {
    const result = await client.query(
      `
        SELECT precio_base
        FROM tarifas_servicio
        WHERE servicio_id = $1::uuid
          AND tamano::text = $2
          AND tipo_pelaje::text = $3
          AND activo = true
        LIMIT 1
      `,
      [serviceId, tamano, tipoPelaje]
    );

    return result.rows[0]?.precio_base ?? null;
  }

  async findAdditionalServicePrices(ids, tamano) {
    if (!ids.length) {
      return [];
    }

    const result = await client.query(
      `
        SELECT servicio_adicional_id, precio
        FROM tarifas_servicio_adicional
        WHERE servicio_adicional_id = ANY($1::uuid[])
          AND tamano::text = $2
          AND activo = true
      `,
      [ids, tamano]
    );

    return result.rows;
  }

  async getBusinessScheduleForDate(fecha) {
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const date = new Date(`${fecha}T00:00:00`);
    const dayName = dayNames[date.getDay()];

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

  async listAgendaBlocks(fecha) {
    const result = await client.query(
      `
        SELECT hora_inicio, hora_fin, motivo
        FROM bloqueos_agenda
        WHERE fecha = $1::date
          AND activo = true
      `,
      [fecha]
    );

    return result.rows;
  }

  async listBlockingAppointments(fecha, appointmentId = null) {
    const result = await client.query(
      `
        SELECT hora_inicio, hora_fin_estimada
        FROM citas
        WHERE fecha = $1::date
          AND activo = true
          AND estado::text IN ('confirmada', 'en_atencion')
          AND ($2::uuid IS NULL OR id <> $2::uuid)
      `,
      [fecha, appointmentId || null]
    );

    return result.rows;
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

  async createAppointment(payload, db = client) {
    const result = await db.query(
      `
        INSERT INTO citas (
          cliente_id,
          mascota_id,
          servicio_id,
          fecha,
          hora_inicio,
          hora_fin_estimada,
          estado,
          estado_pelaje_reportado,
          comportamiento_reportado,
          foto_estado_actual_url,
          observaciones_cliente,
          precio_base,
          precio_calculado,
          precio_final,
          activo
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::date,
          $5::time,
          $6::time,
          'pendiente',
          $7,
          $8,
          $9::text,
          $10::text,
          $11::integer,
          $12::integer,
          $13::integer,
          true
        )
        RETURNING id, fecha, hora_inicio, hora_fin_estimada, estado::text AS estado
      `,
      [
        payload.clienteId,
        payload.mascotaId,
        payload.servicioId,
        payload.fecha,
        payload.horaInicio,
        payload.horaFinEstimada,
        payload.estadoPelajeReportado,
        payload.comportamientoReportado,
        payload.fotoEstadoActualUrl,
        payload.observacionesCliente,
        payload.precioBase,
        payload.precioCalculado,
        payload.precioFinal
      ]
    );

    return result.rows[0];
  }

  async addAppointmentAdditional(appointmentId, additional, db = client) {
    await db.query(
      `
        INSERT INTO cita_servicios_adicionales (cita_id, servicio_adicional_id, precio_aplicado)
        VALUES ($1::uuid, $2::uuid, $3::integer)
      `,
      [appointmentId, additional.id, additional.precio]
    );
  }

  async findOwnedAppointmentById(appointmentId, clientIds) {
    const result = await client.query(
      `
        SELECT
          id,
          mascota_id,
          servicio_id,
          fecha,
          hora_inicio,
          hora_fin_estimada,
          estado::text AS estado,
          estado_pelaje_reportado::text AS estado_pelaje_reportado,
          comportamiento_reportado::text AS comportamiento_reportado
        FROM citas
        WHERE id = $1::uuid
          AND cliente_id = ANY($2::uuid[])
          AND activo = true
        LIMIT 1
      `,
      [appointmentId, clientIds]
    );

    if (!result.rowCount) {
      return null;
    }

    return {
      id: result.rows[0].id,
      mascotaId: result.rows[0].mascota_id,
      servicioId: result.rows[0].servicio_id,
      fecha: result.rows[0].fecha,
      horaInicio: result.rows[0].hora_inicio,
      horaFinEstimada: result.rows[0].hora_fin_estimada,
      estado: result.rows[0].estado,
      estadoPelajeReportado: result.rows[0].estado_pelaje_reportado,
      comportamientoReportado: result.rows[0].comportamiento_reportado
    };
  }

  async listAppointmentAdditionalServiceIds(appointmentId) {
    const result = await client.query(
      `
        SELECT servicio_adicional_id
        FROM cita_servicios_adicionales
        WHERE cita_id = $1::uuid
        ORDER BY servicio_adicional_id ASC
      `,
      [appointmentId]
    );

    return result.rows.map((row) => row.servicio_adicional_id);
  }

  async updateAppointmentStatus(appointmentId, status) {
    await client.query(
      `
        UPDATE citas
        SET
          estado = $2,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [appointmentId, status]
    );
  }

  async updateAppointmentScheduleAndStatus(appointmentId, payload) {
    const result = await client.query(
      `
        UPDATE citas
        SET
          fecha = $2::date,
          hora_inicio = $3::time,
          hora_fin_estimada = $4::time,
          estado = 'pendiente',
          updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING id, fecha, hora_inicio, hora_fin_estimada, estado::text AS estado
      `,
      [appointmentId, payload.fecha, payload.horaInicio, payload.horaFinEstimada]
    );

    return result.rows[0];
  }

  async getAppointmentNotificationDetails(appointmentId) {
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
          c.observaciones_cliente,
          c.precio_base,
          c.precio_calculado,
          c.precio_final,
          cl.nombre AS cliente_nombre,
          cl.apellido AS cliente_apellido,
          u.email AS cliente_email,
          m.nombre AS mascota_nombre,
          s.nombre AS servicio_nombre
        FROM citas c
        INNER JOIN clientes cl ON cl.id = c.cliente_id
        INNER JOIN usuarios u ON u.id = cl.usuario_id
        INNER JOIN mascotas m ON m.id = c.mascota_id
        INNER JOIN servicios s ON s.id = c.servicio_id
        WHERE c.id = $1::uuid
        LIMIT 1
      `,
      [appointmentId]
    );

    if (!result.rowCount) {
      return null;
    }

    const appointment = result.rows[0];
    const additionalResult = await client.query(
      `
        SELECT sa.nombre, csa.precio_aplicado
        FROM cita_servicios_adicionales csa
        INNER JOIN servicios_adicionales sa ON sa.id = csa.servicio_adicional_id
        WHERE csa.cita_id = $1::uuid
        ORDER BY sa.nombre ASC
      `,
      [appointmentId]
    );

    return {
      id: appointment.id,
      fecha: appointment.fecha,
      horaInicio: appointment.hora_inicio,
      horaFinEstimada: appointment.hora_fin_estimada,
      estado: appointment.estado,
      estadoPelajeReportado: appointment.estado_pelaje_reportado,
      comportamientoReportado: appointment.comportamiento_reportado,
      observacionesCliente: appointment.observaciones_cliente,
      precioBase: appointment.precio_base,
      precioCalculado: appointment.precio_calculado,
      precioFinal: appointment.precio_final,
      clientName: [appointment.cliente_nombre, appointment.cliente_apellido].filter(Boolean).join(' '),
      clientEmail: appointment.cliente_email,
      petName: appointment.mascota_nombre,
      serviceName: appointment.servicio_nombre,
      additionalServices: additionalResult.rows.map((row) => ({
        nombre: row.nombre,
        precio: row.precio_aplicado
      }))
    };
  }

  async findPrimaryAdministratorIdByEmail(email) {
    const result = await client.query(
      `
        SELECT a.id
        FROM administradores a
        INNER JOIN usuarios u ON u.id = a.usuario_id
        WHERE lower(u.email) = $1
          AND a.activo = true
          AND u.activo = true
        ORDER BY a.created_at ASC, a.id ASC
        LIMIT 1
      `,
      [String(email || '').toLowerCase()]
    );

    return result.rows[0]?.id || null;
  }

  async persistAdminDecision(appointmentId, decision, administratorId) {
    await client.query(
      `
        UPDATE citas
        SET
          estado = $2,
          administrador_id = COALESCE($3::uuid, administrador_id),
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [appointmentId, decision, administratorId]
    );
  }
}

module.exports = { PostgresClientAppointmentsRepository };
