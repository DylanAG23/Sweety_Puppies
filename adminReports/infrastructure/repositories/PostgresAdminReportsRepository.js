const client = require('../../../baseDatos');
const { AdminReportError } = require('../../domain/errors/AdminReportError');

const STATUS_ORDER = ['pendiente', 'confirmada', 'en_atencion', 'completada', 'cancelada', 'reprogramada'];

function buildHistoryWhereClause(filters, params, aliases = {}) {
  const historyAlias = aliases.historyAlias || 'hs';
  const appointmentAlias = aliases.appointmentAlias || 'c';
  const where = [`${historyAlias}.fecha_servicio::date BETWEEN $1::date AND $2::date`];

  if (filters.estadoCita && !['todas', 'completada'].includes(filters.estadoCita)) {
    where.push('1 = 0');
  }

  if (filters.clienteId) {
    params.push(filters.clienteId);
    where.push(`${historyAlias}.cliente_id = $${params.length}::uuid`);
  }

  if (filters.mascotaId) {
    params.push(filters.mascotaId);
    where.push(`${historyAlias}.mascota_id = $${params.length}::uuid`);
  }

  if (filters.servicioId) {
    params.push(filters.servicioId);
    where.push(`${appointmentAlias}.servicio_id = $${params.length}::uuid`);
  }

  if (filters.servicioAdicionalId) {
    params.push(filters.servicioAdicionalId);
    where.push(
      `EXISTS (
        SELECT 1
        FROM cita_servicios_adicionales csa_filter
        WHERE csa_filter.cita_id = ${historyAlias}.cita_id
          AND csa_filter.servicio_adicional_id = $${params.length}::uuid
      )`
    );
  }

  return where;
}

function buildAppointmentsWhereClause(filters, params, appointmentAlias = 'c') {
  const where = [`${appointmentAlias}.fecha BETWEEN $1::date AND $2::date`];

  if (filters.estadoCita && filters.estadoCita !== 'todas') {
    params.push(filters.estadoCita);
    where.push(`${appointmentAlias}.estado::text = $${params.length}`);
  }

  if (filters.clienteId) {
    params.push(filters.clienteId);
    where.push(`${appointmentAlias}.cliente_id = $${params.length}::uuid`);
  }

  if (filters.mascotaId) {
    params.push(filters.mascotaId);
    where.push(`${appointmentAlias}.mascota_id = $${params.length}::uuid`);
  }

  if (filters.servicioId) {
    params.push(filters.servicioId);
    where.push(`${appointmentAlias}.servicio_id = $${params.length}::uuid`);
  }

  if (filters.servicioAdicionalId) {
    params.push(filters.servicioAdicionalId);
    where.push(
      `EXISTS (
        SELECT 1
        FROM cita_servicios_adicionales csa_filter
        WHERE csa_filter.cita_id = ${appointmentAlias}.id
          AND csa_filter.servicio_adicional_id = $${params.length}::uuid
      )`
    );
  }

  return where;
}

function mapServiceRows(rows) {
  return rows.map((row) => ({
    nombre: row.servicio_principal_nombre || 'Sin servicio principal',
    totalCitas: Number(row.total_citas) || 0,
    totalIngresado: Number(row.total_ingresado) || 0
  }));
}

class PostgresAdminReportsRepository {
  async resolveAdminContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredAdminId = sessionUser?.administradorId || sessionUser?.administrador_id || null;

    if (!userId) {
      throw new AdminReportError('No se encontro una sesion valida para consultar reportes', 401, 'AUTH_REQUIRED');
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
      throw new AdminReportError(
        'No encontramos un perfil administrativo activo para esta sesion',
        404,
        'ADMIN_NOT_FOUND'
      );
    }

    return result.rows[0];
  }

  async getFilterCatalogs() {
    const [servicesResult, additionalsResult, clientsResult, petsResult] = await Promise.all([
      client.query(
        `
          SELECT id, nombre
          FROM servicios
          WHERE activo = true
          ORDER BY nombre ASC
        `
      ),
      client.query(
        `
          SELECT id, nombre
          FROM servicios_adicionales
          WHERE activo = true
          ORDER BY nombre ASC
        `
      ),
      client.query(
        `
          SELECT
            c.id,
            TRIM(CONCAT(c.nombre, ' ', c.apellido)) AS nombre_completo,
            c.cedula
          FROM clientes c
          WHERE c.activo = true
          ORDER BY c.nombre ASC, c.apellido ASC
        `
      ),
      client.query(
        `
          SELECT
            m.id,
            m.nombre,
            TRIM(CONCAT(c.nombre, ' ', c.apellido)) AS cliente_nombre_completo
          FROM mascotas m
          INNER JOIN clientes c ON c.id = m.cliente_id
          WHERE m.activo = true
          ORDER BY m.nombre ASC, cliente_nombre_completo ASC
        `
      )
    ]);

    return {
      serviciosPrincipales: servicesResult.rows.map((row) => ({
        id: row.id,
        nombre: row.nombre
      })),
      serviciosAdicionales: additionalsResult.rows.map((row) => ({
        id: row.id,
        nombre: row.nombre
      })),
      clientes: clientsResult.rows.map((row) => ({
        id: row.id,
        nombre: row.nombre_completo,
        cedula: row.cedula
      })),
      mascotas: petsResult.rows.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        clienteNombreCompleto: row.cliente_nombre_completo
      }))
    };
  }

  async getRevenueSummary(filters) {
    const baseParams = [filters.fechaInicio, filters.fechaFin];
    const where = buildHistoryWhereClause(filters, baseParams);
    const totalsParams = [...baseParams];
    const servicesParams = [...baseParams];

    const [totalsResult, servicesResult] = await Promise.all([
      client.query(
        `
          SELECT
            COUNT(*)::int AS total_citas_realizadas,
            COALESCE(SUM(COALESCE(hs.precio_final, hs.precio_calculado, hs.precio_base, 0)), 0)::int AS total_ingresado,
            COALESCE(AVG(COALESCE(hs.precio_final, hs.precio_calculado, hs.precio_base, 0)), 0)::numeric(12,2) AS promedio_por_cita
          FROM historial_citas hs
          LEFT JOIN citas c ON c.id = hs.cita_id
          WHERE ${where.join(' AND ')}
        `,
        totalsParams
      ),
      client.query(
        `
          SELECT
            hs.servicio_principal_nombre,
            COUNT(*)::int AS total_citas,
            COALESCE(SUM(COALESCE(hs.precio_final, hs.precio_calculado, hs.precio_base, 0)), 0)::int AS total_ingresado
          FROM historial_citas hs
          LEFT JOIN citas c ON c.id = hs.cita_id
          WHERE ${where.join(' AND ')}
          GROUP BY hs.servicio_principal_nombre
          ORDER BY total_citas DESC, total_ingresado DESC, hs.servicio_principal_nombre ASC
        `,
        servicesParams
      )
    ]);

    const totals = totalsResult.rows[0] || {};

    return {
      totalIngresado: Number(totals.total_ingresado) || 0,
      totalCitasRealizadas: Number(totals.total_citas_realizadas) || 0,
      promedioPorCita: Number(totals.promedio_por_cita) || 0,
      serviciosPrincipales: mapServiceRows(servicesResult.rows)
    };
  }

  async getAdditionalRevenueSummary(filters) {
    const params = [filters.fechaInicio, filters.fechaFin];
    const where = buildHistoryWhereClause(filters, params);

    const result = await client.query(
      `
        SELECT
          sa.id,
          sa.nombre,
          COUNT(*)::int AS total_aplicaciones,
          COALESCE(SUM(COALESCE(csa.precio_aplicado, 0)), 0)::int AS total_ingresado
        FROM historial_citas hs
        INNER JOIN cita_servicios_adicionales csa ON csa.cita_id = hs.cita_id
        INNER JOIN servicios_adicionales sa ON sa.id = csa.servicio_adicional_id
        LEFT JOIN citas c ON c.id = hs.cita_id
        WHERE ${where.join(' AND ')}
        GROUP BY sa.id, sa.nombre
        ORDER BY total_ingresado DESC, total_aplicaciones DESC, sa.nombre ASC
      `,
      params
    );

    const adicionales = result.rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      totalAplicaciones: Number(row.total_aplicaciones) || 0,
      totalIngresado: Number(row.total_ingresado) || 0
    }));

    return {
      totalIngresado: adicionales.reduce((sum, item) => sum + item.totalIngresado, 0),
      totalAplicaciones: adicionales.reduce((sum, item) => sum + item.totalAplicaciones, 0),
      adicionales
    };
  }

  async getCompletedServicesSummary(filters) {
    const totalsParams = [filters.fechaInicio, filters.fechaFin];
    const servicesParams = [filters.fechaInicio, filters.fechaFin];
    const additionalsParams = [filters.fechaInicio, filters.fechaFin];
    const where = buildHistoryWhereClause(filters, totalsParams);
    buildHistoryWhereClause(filters, servicesParams);
    buildHistoryWhereClause(filters, additionalsParams);

    const [totalsResult, servicesResult, additionalsCountResult] = await Promise.all([
      client.query(
        `
          SELECT COUNT(*)::int AS total_citas_realizadas
          FROM historial_citas hs
          LEFT JOIN citas c ON c.id = hs.cita_id
          WHERE ${where.join(' AND ')}
        `,
        totalsParams
      ),
      client.query(
        `
          SELECT
            hs.servicio_principal_nombre,
            COUNT(*)::int AS total_citas,
            COALESCE(SUM(COALESCE(hs.precio_final, hs.precio_calculado, hs.precio_base, 0)), 0)::int AS total_ingresado
          FROM historial_citas hs
          LEFT JOIN citas c ON c.id = hs.cita_id
          WHERE ${buildHistoryWhereClause(filters, servicesParams).join(' AND ')}
          GROUP BY hs.servicio_principal_nombre
          ORDER BY total_citas DESC, total_ingresado DESC, hs.servicio_principal_nombre ASC
        `,
        servicesParams
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total_adicionales_aplicados
          FROM historial_citas hs
          INNER JOIN cita_servicios_adicionales csa ON csa.cita_id = hs.cita_id
          LEFT JOIN citas c ON c.id = hs.cita_id
          WHERE ${buildHistoryWhereClause(filters, additionalsParams).join(' AND ')}
        `,
        additionalsParams
      )
    ]);

    const totals = totalsResult.rows[0] || {};
    const additionals = additionalsCountResult.rows[0] || {};

    return {
      totalCitasRealizadas: Number(totals.total_citas_realizadas) || 0,
      totalServiciosPrincipales: servicesResult.rows.reduce((sum, row) => sum + (Number(row.total_citas) || 0), 0),
      totalAdicionalesAplicados: Number(additionals.total_adicionales_aplicados) || 0,
      serviciosPrincipales: mapServiceRows(servicesResult.rows)
    };
  }

  async getTrendSeries(filters, metric) {
    const valueExpression =
      metric === 'ganancias'
        ? 'COALESCE(SUM(COALESCE(hs.precio_final, hs.precio_calculado, hs.precio_base, 0)), 0)::int'
        : 'COUNT(*)::int';

    const params = [filters.fechaInicio, filters.fechaFin];
    const where = buildHistoryWhereClause(filters, params);

    if (filters.periodo === 'day') {
      const result = await client.query(
        `
          SELECT
            EXTRACT(HOUR FROM hs.fecha_servicio)::int AS bucket_index,
            ${valueExpression} AS value
          FROM historial_citas hs
          LEFT JOIN citas c ON c.id = hs.cita_id
          WHERE ${where.join(' AND ')}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        params
      );

      return result.rows.map((row) => ({
        key: String(Number(row.bucket_index) || 0),
        value: Number(row.value) || 0
      }));
    }

    if (filters.periodo === 'range') {
      const start = new Date(filters.fechaInicio);
      const end = new Date(filters.fechaFin);
      const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

      if (totalDays > 62) {
        const result = await client.query(
          `
            SELECT
              DATE_TRUNC('month', hs.fecha_servicio)::date AS bucket_date,
              ${valueExpression} AS value
            FROM historial_citas hs
            LEFT JOIN citas c ON c.id = hs.cita_id
            WHERE ${where.join(' AND ')}
            GROUP BY 1
            ORDER BY 1 ASC
          `,
          params
        );

        return result.rows.map((row) => ({
          key: String(row.bucket_date).slice(0, 10),
          value: Number(row.value) || 0
        }));
      }
    }

    const result = await client.query(
      `
        SELECT
          hs.fecha_servicio::date AS bucket_date,
          ${valueExpression} AS value
        FROM historial_citas hs
        LEFT JOIN citas c ON c.id = hs.cita_id
        WHERE ${where.join(' AND ')}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      params
    );

    return result.rows.map((row) => ({
      key: String(row.bucket_date).slice(0, 10),
      value: Number(row.value) || 0
    }));
  }

  async getAppointmentStatusSummary(filters) {
    const params = [filters.fechaInicio, filters.fechaFin];
    const where = buildAppointmentsWhereClause(filters, params);

    const result = await client.query(
      `
        SELECT
          c.estado::text AS estado,
          COUNT(*)::int AS total_citas
        FROM citas c
        WHERE ${where.join(' AND ')}
        GROUP BY c.estado
      `,
      params
    );

    const totalsByState = new Map(result.rows.map((row) => [row.estado, Number(row.total_citas) || 0]));

    return STATUS_ORDER.map((estado) => ({
      estado,
      totalCitas: totalsByState.get(estado) || 0
    }));
  }

  async getDailyOperationalSummary(filters) {
    const historyParams = [filters.fechaInicio, filters.fechaFin];
    const appointmentsParams = [filters.fechaInicio, filters.fechaFin];
    const historyWhere = buildHistoryWhereClause(filters, historyParams);
    const appointmentsWhere = buildAppointmentsWhereClause(filters, appointmentsParams);

    const [incomeResult, appointmentsResult] = await Promise.all([
      client.query(
        `
          SELECT
            hs.fecha_servicio::date AS fecha,
            COALESCE(SUM(COALESCE(hs.precio_final, hs.precio_calculado, hs.precio_base, 0)), 0)::int AS total_ingresado,
            COUNT(*)::int AS total_citas_realizadas
          FROM historial_citas hs
          LEFT JOIN citas c ON c.id = hs.cita_id
          WHERE ${historyWhere.join(' AND ')}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        historyParams
      ),
      client.query(
        `
          SELECT
            c.fecha::date AS fecha,
            COUNT(*)::int AS total_citas
          FROM citas c
          WHERE ${appointmentsWhere.join(' AND ')}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        appointmentsParams
      )
    ]);

    return {
      ingresosPorDia: incomeResult.rows.map((row) => ({
        fecha: String(row.fecha).slice(0, 10),
        totalIngresado: Number(row.total_ingresado) || 0,
        totalCitasRealizadas: Number(row.total_citas_realizadas) || 0
      })),
      citasPorDia: appointmentsResult.rows.map((row) => ({
        fecha: String(row.fecha).slice(0, 10),
        totalCitas: Number(row.total_citas) || 0
      }))
    };
  }

  async getCompletedAppointmentsTable(filters) {
    const params = [filters.fechaInicio, filters.fechaFin];
    const where = buildHistoryWhereClause(filters, params);

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
          hs.servicio_principal_nombre,
          hs.servicios_adicionales_resumen,
          hs.precio_final
        FROM historial_citas hs
        LEFT JOIN citas c ON c.id = hs.cita_id
        WHERE ${where.join(' AND ')}
        ORDER BY hs.fecha_servicio DESC, hs.created_at DESC
        LIMIT 80
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
      servicioPrincipalNombre: row.servicio_principal_nombre,
      serviciosAdicionalesResumen: row.servicios_adicionales_resumen,
      precioFinal: Number(row.precio_final) || 0
    }));
  }

  async getMonthlyRevenueTrend(filters) {
    const params = [filters.fechaInicio, filters.fechaFin];
    const where = buildHistoryWhereClause(filters, params);

    const result = await client.query(
      `
        SELECT
          DATE_TRUNC('month', hs.fecha_servicio)::date AS periodo,
          COUNT(*)::int AS total_citas,
          COALESCE(SUM(COALESCE(hs.precio_final, hs.precio_calculado, hs.precio_base, 0)), 0)::int AS total_ingresado
        FROM historial_citas hs
        LEFT JOIN citas c ON c.id = hs.cita_id
        WHERE ${where.join(' AND ')}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      params
    );

    return result.rows.map((row) => ({
      periodo: String(row.periodo).slice(0, 10),
      totalCitas: Number(row.total_citas) || 0,
      totalIngresado: Number(row.total_ingresado) || 0
    }));
  }
}

module.exports = { PostgresAdminReportsRepository };
