const client = require('../../../baseDatos');
const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');
const { parseOperationalNotes } = require('../../domain/services/managementRules');

class PostgresAdminServiceManagementRepository {
  async resolveAdminContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredAdminId = sessionUser?.administradorId || sessionUser?.administrador_id || null;

    if (!userId) {
      throw new AdminServiceManagementError('No se encontro una sesion valida para esta gestion', 401, 'AUTH_REQUIRED');
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
      throw new AdminServiceManagementError(
        'No encontramos un perfil administrativo activo para esta sesion',
        404,
        'ADMIN_NOT_FOUND'
      );
    }

    return result.rows[0];
  }

  async listAppointments(filters) {
    const params = [];
    const where = ['c.activo = true'];

    if (filters.estado !== 'todas') {
      params.push(filters.estado);
      where.push(`c.estado::text = $${params.length}`);
    }

    if (filters.fecha) {
      params.push(filters.fecha);
      where.push(`c.fecha = $${params.length}::date`);
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      where.push(`
        (
          lower(coalesce(cl.nombre, '') || ' ' || coalesce(cl.apellido, '')) LIKE $${params.length}
          OR lower(coalesce(cl.cedula, '')) LIKE $${params.length}
          OR lower(coalesce(cl.telefono, '')) LIKE $${params.length}
          OR lower(coalesce(u.email, '')) LIKE $${params.length}
          OR lower(coalesce(m.nombre, '')) LIKE $${params.length}
          OR lower(coalesce(m.raza, '')) LIKE $${params.length}
          OR lower(coalesce(s.nombre, '')) LIKE $${params.length}
        )
      `);
    }

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
          CONCAT_WS(' ', cl.nombre, cl.apellido) AS cliente_nombre,
          cl.telefono AS cliente_telefono,
          u.email AS cliente_email,
          m.nombre AS mascota_nombre,
          m.raza AS mascota_raza,
          m.foto_mascota_url AS mascota_foto_url,
          s.nombre AS servicio_nombre
        FROM citas c
        INNER JOIN clientes cl ON cl.id = c.cliente_id
        INNER JOIN usuarios u ON u.id = cl.usuario_id
        INNER JOIN mascotas m ON m.id = c.mascota_id
        INNER JOIN servicios s ON s.id = c.servicio_id
        WHERE ${where.join(' AND ')}
        ORDER BY
          CASE c.estado::text
            WHEN 'pendiente' THEN 0
            WHEN 'confirmada' THEN 1
            WHEN 'en_atencion' THEN 2
            WHEN 'reprogramada' THEN 3
            WHEN 'completada' THEN 4
            WHEN 'cancelada' THEN 5
            ELSE 6
          END,
          c.fecha DESC,
          c.hora_inicio ASC,
          c.created_at DESC
      `,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      fecha: row.fecha,
      horaInicio: row.hora_inicio,
      horaFinEstimada: row.hora_fin_estimada,
      estado: row.estado,
      precioBase: row.precio_base,
      precioCalculado: row.precio_calculado,
      precioFinal: row.precio_final,
      precioMostrado: row.precio_final || row.precio_calculado || row.precio_base || 0,
      clienteNombre: row.cliente_nombre,
      clienteTelefono: row.cliente_telefono,
      clienteEmail: row.cliente_email,
      mascotaNombre: row.mascota_nombre,
      mascotaRaza: row.mascota_raza,
      mascotaFotoUrl: row.mascota_foto_url,
      servicioNombre: row.servicio_nombre
    }));
  }

  async findAppointmentDetail(appointmentId) {
    const result = await client.query(
      `
        SELECT
          c.id,
          c.cliente_id,
          c.mascota_id,
          c.servicio_id,
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
          cl.cedula AS cliente_cedula,
          cl.telefono AS cliente_telefono,
          u.email AS cliente_email,
          m.nombre AS mascota_nombre,
          m.raza AS mascota_raza,
          m.tamano::text AS mascota_tamano,
          m.tipo_pelaje::text AS mascota_tipo_pelaje,
          m.foto_mascota_url AS mascota_foto_url,
          s.nombre AS servicio_nombre,
          s.aplica_recargo_nudos,
          s.aplica_recargo_comportamiento
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
    const [selectedAdditionalsResult, catalogResult] = await Promise.all([
      client.query(
        `
          SELECT
            sa.id,
            sa.nombre,
            sa.descripcion,
            csa.precio_aplicado
          FROM cita_servicios_adicionales csa
          INNER JOIN servicios_adicionales sa ON sa.id = csa.servicio_adicional_id
          WHERE csa.cita_id = $1::uuid
          ORDER BY sa.nombre ASC
        `,
        [appointmentId]
      ),
      client.query(
        `
          SELECT
            sa.id,
            sa.nombre,
            sa.descripcion,
            tsa.precio,
            EXISTS (
              SELECT 1
              FROM cita_servicios_adicionales csa
              WHERE csa.cita_id = $1::uuid
                AND csa.servicio_adicional_id = sa.id
            ) AS selected
          FROM servicios_adicionales sa
          LEFT JOIN tarifas_servicio_adicional tsa
            ON tsa.servicio_adicional_id = sa.id
           AND tsa.tamano::text = $2
           AND tsa.activo = true
          WHERE sa.activo = true
          ORDER BY sa.nombre ASC
        `,
        [appointmentId, row.mascota_tamano]
      )
    ]);

    const attention = parseOperationalNotes(row.observaciones_admin);

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
      observacionesAdminRaw: row.observaciones_admin,
      precioBase: row.precio_base,
      precioCalculado: row.precio_calculado,
      precioFinal: row.precio_final,
      cliente: {
        id: row.cliente_id,
        nombre: row.cliente_nombre,
        cedula: row.cliente_cedula,
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
        nombre: row.servicio_nombre,
        aplicaRecargoNudos: row.aplica_recargo_nudos,
        aplicaRecargoComportamiento: row.aplica_recargo_comportamiento
      },
      serviciosAdicionales: selectedAdditionalsResult.rows.map((additional) => ({
        id: additional.id,
        nombre: additional.nombre,
        descripcion: additional.descripcion || null,
        precio: additional.precio_aplicado
      })),
      catalogoAdicionales: catalogResult.rows.map((additional) => ({
        id: additional.id,
        nombre: additional.nombre,
        descripcion: additional.descripcion || null,
        precio: additional.precio,
        selected: additional.selected
      })),
      atencion: {
        estadoPelajeReal: attention.estadoPelajeReal || row.estado_pelaje_reportado,
        comportamientoObservado: attention.comportamientoObservado || row.comportamiento_reportado,
        observacionesDuranteServicio: attention.observacionesDuranteServicio,
        precioCalculadoActualizado: attention.precioCalculadoActualizado ?? row.precio_calculado,
        precioFinalProvisional: attention.precioFinalProvisional ?? row.precio_final ?? row.precio_calculado,
        servicioAdicionalIds: attention.servicioAdicionalIds || selectedAdditionalsResult.rows.map((item) => item.id),
        observacionesFinales: attention.observacionesFinales,
        recomendaciones: attention.recomendaciones,
        resumenServicioRealizado: attention.resumenServicioRealizado
      }
    };
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

  async updateAppointmentOperationalState(appointmentId, adminId, payload, db = client) {
    await db.query(
      `
        UPDATE citas
        SET
          estado = $2,
          administrador_id = COALESCE($3::uuid, administrador_id),
          observaciones_admin = $4::text,
          precio_calculado = $5::integer,
          precio_final = $6::integer,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [appointmentId, payload.estado, adminId, payload.observacionesAdmin, payload.precioCalculado, payload.precioFinal]
    );
  }

  async replaceAppointmentAdditionalServices(appointmentId, additionalServices, db = client) {
    await db.query('DELETE FROM cita_servicios_adicionales WHERE cita_id = $1::uuid', [appointmentId]);

    for (const additional of additionalServices) {
      await db.query(
        `
          INSERT INTO cita_servicios_adicionales (cita_id, servicio_adicional_id, precio_aplicado)
          VALUES ($1::uuid, $2::uuid, $3::integer)
        `,
        [appointmentId, additional.id, additional.precio]
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

  async findHistoryByAppointmentId(appointmentId) {
    const result = await client.query(
      `
        SELECT id
        FROM historial_citas
        WHERE cita_id = $1::uuid
        LIMIT 1
      `,
      [appointmentId]
    );

    return result.rows[0] || null;
  }

  async createHistoryEntry(payload, db = client) {
    await db.query(
      `
        INSERT INTO historial_citas (
          cita_id,
          cliente_id,
          mascota_id,
          fecha_servicio,
          cliente_nombre_completo,
          cliente_cedula,
          cliente_email,
          cliente_telefono,
          mascota_nombre,
          mascota_raza,
          mascota_tamano,
          mascota_tipo_pelaje,
          servicio_principal_nombre,
          servicios_adicionales_resumen,
          resumen_servicio_realizado,
          estado_pelaje_real,
          comportamiento_observado,
          observaciones_finales,
          recomendaciones,
          precio_base,
          precio_calculado,
          precio_final
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::timestamptz,
          $5::varchar,
          $6::varchar,
          $7::varchar,
          $8::varchar,
          $9::varchar,
          $10::varchar,
          $11,
          $12,
          $13::varchar,
          $14::text,
          $15::text,
          $16,
          $17,
          $18::text,
          $19::text,
          $20::integer,
          $21::integer,
          $22::integer
        )
      `,
      [
        payload.citaId,
        payload.clienteId,
        payload.mascotaId,
        payload.fechaServicio,
        payload.clienteNombreCompleto,
        payload.clienteCedula,
        payload.clienteEmail,
        payload.clienteTelefono,
        payload.mascotaNombre,
        payload.mascotaRaza,
        payload.mascotaTamano,
        payload.mascotaTipoPelaje,
        payload.servicioPrincipalNombre,
        payload.serviciosAdicionalesResumen,
        payload.resumenServicioRealizado,
        payload.estadoPelajeReal,
        payload.comportamientoObservado,
        payload.observacionesFinales,
        payload.recomendaciones,
        payload.precioBase,
        payload.precioCalculado,
        payload.precioFinal
      ]
    );
  }

  async listCompletedServices(filters) {
    const params = [];
    const where = ['1 = 1'];

    if (filters.fechaDesde) {
      params.push(filters.fechaDesde);
      where.push(`hs.fecha_servicio::date >= $${params.length}::date`);
    }

    if (filters.fechaHasta) {
      params.push(filters.fechaHasta);
      where.push(`hs.fecha_servicio::date <= $${params.length}::date`);
    }

    if (filters.cliente) {
      params.push(`%${filters.cliente.toLowerCase()}%`);
      where.push(`lower(coalesce(hs.cliente_nombre_completo, '')) LIKE $${params.length}`);
    }

    if (filters.mascota) {
      params.push(`%${filters.mascota.toLowerCase()}%`);
      where.push(`lower(coalesce(hs.mascota_nombre, '')) LIKE $${params.length}`);
    }

    if (filters.servicio) {
      params.push(`%${filters.servicio.toLowerCase()}%`);
      where.push(`lower(coalesce(hs.servicio_principal_nombre, '')) LIKE $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      where.push(`
        (
          lower(coalesce(hs.cliente_nombre_completo, '')) LIKE $${params.length}
          OR lower(coalesce(hs.cliente_email, '')) LIKE $${params.length}
          OR lower(coalesce(hs.cliente_telefono, '')) LIKE $${params.length}
          OR lower(coalesce(hs.mascota_nombre, '')) LIKE $${params.length}
          OR lower(coalesce(hs.mascota_raza, '')) LIKE $${params.length}
          OR lower(coalesce(hs.servicio_principal_nombre, '')) LIKE $${params.length}
          OR lower(coalesce(hs.servicios_adicionales_resumen, '')) LIKE $${params.length}
        )
      `);
    }

    const result = await client.query(
      `
        SELECT
          hs.id,
          hs.cita_id,
          hs.fecha_servicio,
          hs.cliente_nombre_completo,
          hs.cliente_email,
          hs.cliente_telefono,
          hs.mascota_nombre,
          hs.mascota_raza,
          hs.servicio_principal_nombre,
          hs.servicios_adicionales_resumen,
          hs.precio_final
        FROM historial_citas hs
        WHERE ${where.join(' AND ')}
        ORDER BY hs.fecha_servicio DESC, hs.created_at DESC
      `,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      citaId: row.cita_id,
      fechaServicio: row.fecha_servicio,
      clienteNombreCompleto: row.cliente_nombre_completo,
      clienteEmail: row.cliente_email,
      clienteTelefono: row.cliente_telefono,
      mascotaNombre: row.mascota_nombre,
      mascotaRaza: row.mascota_raza,
      servicioPrincipalNombre: row.servicio_principal_nombre,
      serviciosAdicionalesResumen: row.servicios_adicionales_resumen,
      precioFinal: row.precio_final
    }));
  }

  async findCompletedServiceDetail(historyId) {
    const result = await client.query(
      `
        SELECT
          hs.id,
          hs.cita_id,
          hs.fecha_servicio,
          hs.cliente_nombre_completo,
          hs.cliente_email,
          hs.cliente_telefono,
          hs.mascota_nombre,
          hs.mascota_raza,
          hs.mascota_tamano::text AS mascota_tamano,
          hs.mascota_tipo_pelaje::text AS mascota_tipo_pelaje,
          hs.servicio_principal_nombre,
          hs.servicios_adicionales_resumen,
          hs.resumen_servicio_realizado,
          hs.estado_pelaje_real::text AS estado_pelaje_real,
          hs.comportamiento_observado::text AS comportamiento_observado,
          hs.observaciones_finales,
          hs.recomendaciones,
          hs.precio_base,
          hs.precio_calculado,
          hs.precio_final
        FROM historial_citas hs
        WHERE hs.id = $1::uuid
        LIMIT 1
      `,
      [historyId]
    );

    if (!result.rowCount) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      citaId: row.cita_id,
      fechaServicio: row.fecha_servicio,
      clienteNombreCompleto: row.cliente_nombre_completo,
      clienteEmail: row.cliente_email,
      clienteTelefono: row.cliente_telefono,
      mascotaNombre: row.mascota_nombre,
      mascotaRaza: row.mascota_raza,
      mascotaTamano: row.mascota_tamano,
      mascotaTipoPelaje: row.mascota_tipo_pelaje,
      servicioPrincipalNombre: row.servicio_principal_nombre,
      serviciosAdicionalesResumen: row.servicios_adicionales_resumen,
      resumenServicioRealizado: row.resumen_servicio_realizado,
      estadoPelajeReal: row.estado_pelaje_real,
      comportamientoObservado: row.comportamiento_observado,
      observacionesFinales: row.observaciones_finales,
      recomendaciones: row.recomendaciones,
      precioBase: row.precio_base,
      precioCalculado: row.precio_calculado,
      precioFinal: row.precio_final
    };
  }
}

module.exports = { PostgresAdminServiceManagementRepository };
