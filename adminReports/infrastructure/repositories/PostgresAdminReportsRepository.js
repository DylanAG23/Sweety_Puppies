const client = require('../../../baseDatos');
const { AdminReportError } = require('../../domain/errors/AdminReportError');

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

  async getRevenueSummary(filters) {
    const [totalsResult, servicesResult] = await Promise.all([
      client.query(
        `
          SELECT
            COUNT(*)::int AS total_citas_realizadas,
            COALESCE(SUM(COALESCE(precio_final, precio_calculado, precio_base, 0)), 0)::int AS total_ingresado,
            COALESCE(AVG(COALESCE(precio_final, precio_calculado, precio_base, 0)), 0)::numeric(12,2) AS promedio_por_cita
          FROM historial_citas
          WHERE fecha_servicio::date BETWEEN $1::date AND $2::date
        `,
        [filters.fechaInicio, filters.fechaFin]
      ),
      client.query(
        `
          SELECT
            servicio_principal_nombre,
            COUNT(*)::int AS total_citas,
            COALESCE(SUM(COALESCE(precio_final, precio_calculado, precio_base, 0)), 0)::int AS total_ingresado
          FROM historial_citas
          WHERE fecha_servicio::date BETWEEN $1::date AND $2::date
          GROUP BY servicio_principal_nombre
          ORDER BY total_citas DESC, total_ingresado DESC, servicio_principal_nombre ASC
        `,
        [filters.fechaInicio, filters.fechaFin]
      )
    ]);

    const totals = totalsResult.rows[0] || {};

    return {
      totalIngresado: Number(totals.total_ingresado) || 0,
      totalCitasRealizadas: Number(totals.total_citas_realizadas) || 0,
      promedioPorCita: Number(totals.promedio_por_cita) || 0,
      serviciosPrincipales: servicesResult.rows.map((row) => ({
        nombre: row.servicio_principal_nombre || 'Sin servicio principal',
        totalCitas: Number(row.total_citas) || 0,
        totalIngresado: Number(row.total_ingresado) || 0
      }))
    };
  }

  async getAdditionalRevenueSummary(filters) {
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
        WHERE hs.fecha_servicio::date BETWEEN $1::date AND $2::date
        GROUP BY sa.id, sa.nombre
        ORDER BY total_ingresado DESC, total_aplicaciones DESC, sa.nombre ASC
      `,
      [filters.fechaInicio, filters.fechaFin]
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
    const [totalsResult, servicesResult, additionalsCountResult] = await Promise.all([
      client.query(
        `
          SELECT COUNT(*)::int AS total_citas_realizadas
          FROM historial_citas
          WHERE fecha_servicio::date BETWEEN $1::date AND $2::date
        `,
        [filters.fechaInicio, filters.fechaFin]
      ),
      client.query(
        `
          SELECT
            servicio_principal_nombre,
            COUNT(*)::int AS total_citas,
            COALESCE(SUM(COALESCE(precio_final, precio_calculado, precio_base, 0)), 0)::int AS total_ingresado
          FROM historial_citas
          WHERE fecha_servicio::date BETWEEN $1::date AND $2::date
          GROUP BY servicio_principal_nombre
          ORDER BY total_citas DESC, total_ingresado DESC, servicio_principal_nombre ASC
        `,
        [filters.fechaInicio, filters.fechaFin]
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total_adicionales_aplicados
          FROM historial_citas hs
          INNER JOIN cita_servicios_adicionales csa ON csa.cita_id = hs.cita_id
          WHERE hs.fecha_servicio::date BETWEEN $1::date AND $2::date
        `,
        [filters.fechaInicio, filters.fechaFin]
      )
    ]);

    const totals = totalsResult.rows[0] || {};
    const additionals = additionalsCountResult.rows[0] || {};

    return {
      totalCitasRealizadas: Number(totals.total_citas_realizadas) || 0,
      totalServiciosPrincipales: servicesResult.rows.reduce((sum, row) => sum + (Number(row.total_citas) || 0), 0),
      totalAdicionalesAplicados: Number(additionals.total_adicionales_aplicados) || 0,
      serviciosPrincipales: servicesResult.rows.map((row) => ({
        nombre: row.servicio_principal_nombre || 'Sin servicio principal',
        totalCitas: Number(row.total_citas) || 0,
        totalIngresado: Number(row.total_ingresado) || 0
      }))
    };
  }

  async getTrendSeries(filters, metric) {
    const valueExpression =
      metric === 'ganancias'
        ? 'COALESCE(SUM(COALESCE(precio_final, precio_calculado, precio_base, 0)), 0)::int'
        : 'COUNT(*)::int';

    if (filters.periodo === 'day') {
      const result = await client.query(
        `
          SELECT
            EXTRACT(HOUR FROM fecha_servicio)::int AS bucket_index,
            ${valueExpression} AS value
          FROM historial_citas
          WHERE fecha_servicio::date = $1::date
          GROUP BY bucket_index
          ORDER BY bucket_index ASC
        `,
        [filters.fechaInicio]
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
              DATE_TRUNC('month', fecha_servicio)::date AS bucket_date,
              ${valueExpression} AS value
            FROM historial_citas
            WHERE fecha_servicio::date BETWEEN $1::date AND $2::date
            GROUP BY bucket_date
            ORDER BY bucket_date ASC
          `,
          [filters.fechaInicio, filters.fechaFin]
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
          fecha_servicio::date AS bucket_date,
          ${valueExpression} AS value
        FROM historial_citas
        WHERE fecha_servicio::date BETWEEN $1::date AND $2::date
        GROUP BY bucket_date
        ORDER BY bucket_date ASC
      `,
      [filters.fechaInicio, filters.fechaFin]
    );

    return result.rows.map((row) => ({
      key: String(row.bucket_date).slice(0, 10),
      value: Number(row.value) || 0
    }));
  }
}

module.exports = { PostgresAdminReportsRepository };
