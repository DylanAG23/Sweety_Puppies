const client = require('../../../baseDatos');
const { AuthError } = require('../../domain/errors/AuthError');

class TransactionContext {
  async createUser({ email, passwordHash, rol }) {
    const result = await client.query(
      `
        INSERT INTO usuarios (email, password_hash, rol, activo)
        VALUES ($1, $2, $3, true)
        RETURNING id, email, rol
      `,
      [email, passwordHash, rol]
    );

    return result.rows[0];
  }

  async createClient({ usuarioId, nombre, apellido, cedula, telefono }) {
    const result = await client.query(
      `
        INSERT INTO clientes (usuario_id, nombre, apellido, cedula, telefono, activo)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id, nombre, apellido, cedula, telefono
      `,
      [usuarioId, nombre, apellido, cedula, telefono]
    );

    return result.rows[0];
  }

  async markVerificationCodeAsUsed(id) {
    await client.query('UPDATE codigos_verificacion SET usado = true WHERE id = $1', [id]);
  }
}

class PostgresAuthRepository {
  async findActiveClientIdsByUserId(userId) {
    const result = await client.query(
      `
        SELECT id
        FROM clientes
        WHERE usuario_id = $1
          AND activo = true
        ORDER BY created_at ASC, id ASC
      `,
      [userId]
    );

    return result.rows.map((row) => row.id);
  }

  async ensureNoDuplicateUser({ email, cedula, excludeVerificationId = null }) {
    const duplicateEmailQuery = `
      SELECT 'usuarios' AS origen
      FROM usuarios
      WHERE lower(email) = $1
      UNION
      SELECT 'codigos_verificacion' AS origen
      FROM codigos_verificacion
      WHERE lower(email) = $1
        AND tipo = 'registro'
        AND usado = false
        AND expiracion > NOW()
        AND ($2::uuid IS NULL OR id <> $2::uuid)
      LIMIT 1
    `;

    const duplicateCedulaQuery = `
      SELECT 'clientes' AS origen
      FROM clientes
      WHERE cedula = $1
      UNION
      SELECT 'codigos_verificacion' AS origen
      FROM codigos_verificacion
      WHERE tipo = 'registro'
        AND usado = false
        AND expiracion > NOW()
        AND payload->>'cedula' = $1
        AND ($2::uuid IS NULL OR id <> $2::uuid)
      LIMIT 1
    `;

    const [emailResult, cedulaResult] = await Promise.all([
      client.query(duplicateEmailQuery, [email, excludeVerificationId]),
      client.query(duplicateCedulaQuery, [cedula, excludeVerificationId])
    ]);

    if (emailResult.rowCount > 0) {
      throw new AuthError('Ya existe una cuenta registrada o pendiente con ese correo', 409);
    }

    if (cedulaResult.rowCount > 0) {
      throw new AuthError('Ya existe una cuenta registrada o pendiente con esa cédula', 409);
    }
  }

  async invalidatePendingRegistrationCodes(email) {
    await client.query(
      `
        UPDATE codigos_verificacion
        SET usado = true
        WHERE lower(email) = $1
          AND tipo = 'registro'
          AND usado = false
      `,
      [email]
    );
  }

  async createPendingRegistration({ email, codigo, expiracion, payload }) {
    await client.query(
      `
        INSERT INTO codigos_verificacion (email, codigo, tipo, payload, expiracion, usado)
        VALUES ($1, $2, 'registro', $3::jsonb, $4, false)
      `,
      [email, codigo, JSON.stringify(payload), expiracion]
    );
  }

  async findValidVerificationCode({ email, codigo, tipo }) {
    const result = await client.query(
      `
        SELECT *
        FROM codigos_verificacion
        WHERE lower(email) = $1
          AND codigo = $2
          AND tipo = $3
          AND usado = false
          AND expiracion > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [email, codigo, tipo]
    );

    return result.rows[0] || null;
  }

  async transaction(work) {
    await client.query('BEGIN');

    try {
      const result = await work(new TransactionContext());
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  async findUserForLogin(email) {
    const result = await client.query(
      `
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.rol::text AS rol,
          u.activo,
          c.id AS cliente_id,
          COALESCE(c.nombre, a.nombre, '') AS nombre,
          COALESCE(c.apellido, a.apellido, '') AS apellido,
          a.id AS administrador_id
        FROM usuarios u
        LEFT JOIN LATERAL (
          SELECT id, nombre, apellido
          FROM clientes
          WHERE usuario_id = u.id
            AND activo = true
          ORDER BY created_at ASC, id ASC
          LIMIT 1
        ) c ON true
        LEFT JOIN LATERAL (
          SELECT id, nombre, apellido
          FROM administradores
          WHERE usuario_id = u.id
            AND activo = true
          ORDER BY created_at ASC, id ASC
          LIMIT 1
        ) a ON true
        WHERE lower(u.email) = $1
        LIMIT 1
      `,
      [email]
    );

    return result.rows[0] || null;
  }

  async userExistsByEmail(email) {
    const result = await client.query(
      'SELECT id FROM usuarios WHERE lower(email) = $1 LIMIT 1',
      [email]
    );

    return result.rowCount > 0;
  }

  async resolveClientProfileForSession({ userId, preferredClientId = null }) {
    const result = await client.query(
      `
        SELECT
          c.id AS cliente_id,
          c.nombre,
          c.apellido,
          c.telefono,
          c.direccion,
          c.cedula,
          u.email
        FROM clientes c
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.usuario_id = $1
          AND c.activo = true
          AND ($2::uuid IS NULL OR c.id = $2::uuid)
        ORDER BY
          CASE
            WHEN $2::uuid IS NOT NULL AND c.id = $2::uuid THEN 0
            ELSE 1
          END,
          c.created_at ASC,
          c.id ASC
        LIMIT 1
      `,
      [userId, preferredClientId]
    );

    if (result.rowCount > 0) {
      const row = result.rows[0];

      return {
        clienteId: row.cliente_id,
        nombre: row.nombre,
        apellido: row.apellido,
        telefono: row.telefono,
        direccion: row.direccion,
        cedula: row.cedula,
        email: row.email
      };
    }

    if (!preferredClientId) {
      return null;
    }

    return this.resolveClientProfileForSession({ userId });
  }

  async findClientProfileByUserId(userId) {
    return this.resolveClientProfileForSession({ userId });
  }

  async resolveAdminProfileForSession({ userId, preferredAdminId = null }) {
    const result = await client.query(
      `
        SELECT
          a.id AS administrador_id,
          a.nombre,
          a.apellido,
          a.telefono,
          u.email
        FROM administradores a
        INNER JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.usuario_id = $1
          AND a.activo = true
          AND ($2::uuid IS NULL OR a.id = $2::uuid)
        ORDER BY
          CASE
            WHEN $2::uuid IS NOT NULL AND a.id = $2::uuid THEN 0
            ELSE 1
          END,
          a.created_at ASC,
          a.id ASC
        LIMIT 1
      `,
      [userId, preferredAdminId]
    );

    if (result.rowCount > 0) {
      const row = result.rows[0];

      return {
        administradorId: row.administrador_id,
        nombre: row.nombre,
        apellido: row.apellido,
        telefono: row.telefono,
        email: row.email
      };
    }

    if (!preferredAdminId) {
      return null;
    }

    return this.resolveAdminProfileForSession({ userId });
  }

  async updateClientProfileByUserId(userId, { telefono, direccion, preferredClientId = null }) {
    const profile = await this.resolveClientProfileForSession({ userId, preferredClientId });

    if (!profile) {
      return null;
    }

    const result = await client.query(
      `
        UPDATE clientes
        SET
          telefono = $2,
          direccion = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [profile.clienteId, telefono, direccion]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.resolveClientProfileForSession({
      userId,
      preferredClientId: profile.clienteId
    });
  }

  async findActiveImages() {
    const result = await client.query(
      `
        SELECT id, titulo, descripcion, ruta, categoria, orden
        FROM imagenes
        WHERE activo = true
        ORDER BY orden ASC, created_at DESC
      `
    );

    return result.rows;
  }

  async findClientSummary(clienteId) {
    const [petsResult, nextAppointmentResult, latestServiceResult] = await Promise.all([
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM mascotas
          WHERE cliente_id = $1
            AND activo = true
        `,
        [clienteId]
      ),
      client.query(
        `
          SELECT
            c.id,
            c.fecha,
            c.hora_inicio,
            s.nombre AS servicio_nombre,
            m.nombre AS mascota_nombre,
            c.estado::text AS estado
          FROM citas c
          LEFT JOIN servicios s ON s.id = c.servicio_id
          LEFT JOIN mascotas m ON m.id = c.mascota_id
          WHERE c.cliente_id = $1
            AND c.activo = true
            AND (
              c.fecha > CURRENT_DATE
              OR (
                c.fecha = CURRENT_DATE
                AND c.hora_inicio >= CURRENT_TIME::time without time zone
              )
            )
          ORDER BY c.fecha ASC, c.hora_inicio ASC
          LIMIT 1
        `,
        [clienteId]
      ),
      client.query(
        `
          SELECT
            fecha_servicio,
            servicio_principal_nombre,
            mascota_nombre,
            precio_final
          FROM historial_servicios
          WHERE cliente_id = $1
          ORDER BY fecha_servicio DESC
          LIMIT 1
        `,
        [clienteId]
      )
    ]);

    return {
      mascotasCount: petsResult.rows[0]?.total ?? 0,
      nextAppointment: nextAppointmentResult.rows[0] || null,
      lastService: latestServiceResult.rows[0] || null
    };
  }

  async findClientSummaryByUserId(userId) {
    const clientIds = await this.findActiveClientIdsByUserId(userId);

    if (!clientIds.length) {
      return {
        mascotasCount: 0,
        nextAppointment: null,
        lastService: null
      };
    }

    const [petsResult, nextAppointmentResult, latestServiceResult] = await Promise.all([
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM mascotas
          WHERE cliente_id = ANY($1::uuid[])
            AND activo = true
        `,
        [clientIds]
      ),
      client.query(
        `
          SELECT
            c.id,
            c.fecha,
            c.hora_inicio,
            s.nombre AS servicio_nombre,
            m.nombre AS mascota_nombre,
            c.estado::text AS estado
          FROM citas c
          LEFT JOIN servicios s ON s.id = c.servicio_id
          LEFT JOIN mascotas m ON m.id = c.mascota_id
          WHERE c.cliente_id = ANY($1::uuid[])
            AND c.activo = true
            AND (
              c.fecha > CURRENT_DATE
              OR (
                c.fecha = CURRENT_DATE
                AND c.hora_inicio >= CURRENT_TIME::time without time zone
              )
            )
          ORDER BY c.fecha ASC, c.hora_inicio ASC
          LIMIT 1
        `,
        [clientIds]
      ),
      client.query(
        `
          SELECT
            fecha_servicio,
            servicio_principal_nombre,
            mascota_nombre,
            precio_final
          FROM historial_servicios
          WHERE cliente_id = ANY($1::uuid[])
          ORDER BY fecha_servicio DESC
          LIMIT 1
        `,
        [clientIds]
      )
    ]);

    return {
      mascotasCount: petsResult.rows[0]?.total ?? 0,
      nextAppointment: nextAppointmentResult.rows[0] || null,
      lastService: latestServiceResult.rows[0] || null
    };
  }

  async findAdminSummary() {
    const [
      citasHoyResult,
      citasPendientesResult,
      mascotasResult,
      clientesResult,
      serviciosMesResult,
      bloqueosResult,
      agendaHoyResult
    ] = await Promise.all([
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM citas
          WHERE fecha = CURRENT_DATE
            AND activo = true
            AND estado::text IN ('pendiente', 'confirmada', 'en_atencion')
        `
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM citas
          WHERE activo = true
            AND estado::text = 'pendiente'
        `
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM mascotas
          WHERE activo = true
        `
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM clientes
          WHERE activo = true
        `
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM historial_servicios
          WHERE date_trunc('month', fecha_servicio) = date_trunc('month', CURRENT_DATE)
        `
      ),
      client.query(
        `
          SELECT
            COUNT(*)::int AS total,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', id,
                  'fecha', fecha,
                  'horaInicio', hora_inicio,
                  'horaFin', hora_fin,
                  'motivo', motivo
                )
                ORDER BY fecha ASC, hora_inicio ASC
              ) FILTER (WHERE id IS NOT NULL),
              '[]'::json
            ) AS proximos
          FROM (
            SELECT id, fecha, hora_inicio, hora_fin, motivo
            FROM bloqueos_agenda
            WHERE activo = true
              AND fecha >= CURRENT_DATE
            ORDER BY fecha ASC, hora_inicio ASC NULLS FIRST
            LIMIT 4
          ) bloques
        `
      ),
      client.query(
        `
          SELECT
            c.id,
            c.fecha,
            c.hora_inicio,
            c.estado::text AS estado,
            CONCAT_WS(' ', cl.nombre, cl.apellido) AS cliente_nombre,
            m.nombre AS mascota_nombre,
            s.nombre AS servicio_nombre
          FROM citas c
          INNER JOIN clientes cl ON cl.id = c.cliente_id
          LEFT JOIN mascotas m ON m.id = c.mascota_id
          LEFT JOIN servicios s ON s.id = c.servicio_id
          WHERE c.fecha = CURRENT_DATE
            AND c.activo = true
            AND c.estado::text IN ('pendiente', 'confirmada', 'en_atencion')
          ORDER BY c.hora_inicio ASC
          LIMIT 5
        `
      )
    ]);

    return {
      citasHoy: citasHoyResult.rows[0]?.total ?? 0,
      citasPendientes: citasPendientesResult.rows[0]?.total ?? 0,
      mascotasRegistradas: mascotasResult.rows[0]?.total ?? 0,
      clientesRegistrados: clientesResult.rows[0]?.total ?? 0,
      serviciosMes: serviciosMesResult.rows[0]?.total ?? 0,
      bloqueosProximos: {
        total: bloqueosResult.rows[0]?.total ?? 0,
        items: bloqueosResult.rows[0]?.proximos ?? []
      },
      agendaHoy: agendaHoyResult.rows.map((row) => ({
        id: row.id,
        fecha: row.fecha,
        horaInicio: row.hora_inicio,
        estado: row.estado,
        clienteNombre: row.cliente_nombre,
        mascotaNombre: row.mascota_nombre,
        servicioNombre: row.servicio_nombre
      }))
    };
  }

  async invalidatePendingRecoveryCodes(email) {
    await client.query(
      `
        UPDATE codigos_verificacion
        SET usado = true
        WHERE lower(email) = $1
          AND tipo = 'recuperacion'
          AND usado = false
      `,
      [email]
    );
  }

  async createRecoveryCode({ email, codigo, expiracion }) {
    await client.query(
      `
        INSERT INTO codigos_verificacion (email, codigo, tipo, expiracion, usado)
        VALUES ($1, $2, 'recuperacion', $3, false)
      `,
      [email, codigo, expiracion]
    );
  }
}

module.exports = { PostgresAuthRepository };
