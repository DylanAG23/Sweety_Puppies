const express = require('express');
const client = require('../baseDatos');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sendAppointmentStatusEmail } = require('../services/emailService');

const router = express.Router();

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const APPOINTMENT_STATES = ['pendiente', 'confirmada', 'en_atencion', 'completada', 'cancelada', 'reprogramada'];
const BLOCKING_STATES = ['confirmada', 'en_atencion'];

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', async (req, res) => {
  try {
    const fecha = normalizeDateParam(req.query.fecha) || getTodayDateString();
    const vista = normalizeViewMode(req.query.vista);
    const adminContext = await getAdminContext(req.user);
    const agenda = await buildAdminAgenda({
      fecha,
      vista,
      adminId: adminContext.id
    });

    res.json({
      success: true,
      ...agenda
    });
  } catch (error) {
    handleError(res, error, 'Error al cargar la agenda administrativa');
  }
});

router.get('/citas/:id', async (req, res) => {
  try {
    await getAdminContext(req.user);
    const cita = await getAppointmentDetail(req.params.id);

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: 'No encontramos la cita solicitada'
      });
    }

    res.json({
      success: true,
      cita
    });
  } catch (error) {
    handleError(res, error, 'Error al cargar el detalle de la cita');
  }
});

router.patch('/citas/:id/confirm', async (req, res) => {
  try {
    const adminContext = await getAdminContext(req.user);
    const cita = await getAppointmentDetail(req.params.id);

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: 'No encontramos la cita solicitada'
      });
    }

    if (cita.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes confirmar citas que aun estan pendientes'
      });
    }

    await client.query(
      `
        UPDATE citas
        SET
          estado = 'confirmada',
          administrador_id = COALESCE($2::uuid, administrador_id),
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [cita.id, adminContext.id]
    );

    const updatedAppointment = await getAppointmentDetail(cita.id);

    try {
      const notificationAppointment = await getAppointmentNotificationDetails(cita.id);
      if (notificationAppointment?.clientEmail) {
        await sendAppointmentStatusEmail({
          email: notificationAppointment.clientEmail,
          status: 'confirmada',
          appointment: buildAppointmentEmailViewModel(notificationAppointment),
          flowType: notificationAppointment.estado === 'reprogramada' ? 'reprogramacion' : 'nueva'
        });
      }
    } catch (notificationError) {
      console.error('No se pudo notificar al cliente desde la agenda administrativa', notificationError);
    }

    res.json({
      success: true,
      message: 'La cita fue confirmada correctamente',
      cita: updatedAppointment
    });
  } catch (error) {
    handleError(res, error, 'Error al confirmar la cita');
  }
});

router.get('/bloqueos', async (req, res) => {
  try {
    await getAdminContext(req.user);
    const fecha = normalizeDateParam(req.query.fecha) || getTodayDateString();
    const bloqueos = await getUpcomingBlocks(fecha, 20);

    res.json({
      success: true,
      fecha,
      bloqueos
    });
  } catch (error) {
    handleError(res, error, 'Error al cargar los bloqueos de agenda');
  }
});

router.post('/bloqueos', async (req, res) => {
  try {
    const adminContext = await getAdminContext(req.user);
    const payload = normalizeBlockPayload(req.body);
    const fecha = normalizeDateParam(payload.fecha);

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar una fecha valida para el bloqueo'
      });
    }

    const fechaMinimaBloqueo = await getEffectiveOperationalStartDate();
    if (fecha < fechaMinimaBloqueo) {
      return res.status(400).json({
        success: false,
        message:
          fechaMinimaBloqueo === getTodayDateString()
            ? 'Solo puedes crear bloqueos desde hoy en adelante'
            : `La jornada de hoy ya cerro. Los nuevos bloqueos deben crearse desde ${formatShortHumanDate(fechaMinimaBloqueo)}`
      });
    }

    const dayName = getDayName(fecha);
    if (dayName === 'domingo') {
      return res.status(400).json({
        success: false,
        message: 'Los domingos ya aparecen cerrados por defecto en la agenda'
      });
    }

    const horario = await getBusinessScheduleForDate(fecha);
    if (!horario || !horario.abierto) {
      return res.status(400).json({
        success: false,
        message: 'La fecha seleccionada no tiene horario operativo disponible'
      });
    }

    if ((payload.horaInicio && !payload.horaFin) || (!payload.horaInicio && payload.horaFin)) {
      return res.status(400).json({
        success: false,
        message: 'Debes diligenciar ambas horas para crear un bloqueo por franja'
      });
    }

    if (payload.horaInicio && payload.horaFin) {
      if (timeToMinutes(payload.horaFin) <= timeToMinutes(payload.horaInicio)) {
        return res.status(400).json({
          success: false,
          message: 'La hora final debe ser mayor a la hora inicial'
        });
      }

      if (
        timeToMinutes(payload.horaInicio) < timeToMinutes(horario.hora_apertura) ||
        timeToMinutes(payload.horaFin) > timeToMinutes(horario.hora_cierre)
      ) {
        return res.status(400).json({
          success: false,
          message: 'La franja debe estar dentro del horario del negocio'
        });
      }
    }

    const hasOverlap = await hasOverlappingBlock({
      fecha,
      horaInicio: payload.horaInicio,
      horaFin: payload.horaFin
    });

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un bloqueo activo que se cruza con esa fecha o franja'
      });
    }

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
      [adminContext.id, fecha, payload.horaInicio, payload.horaFin, payload.motivo]
    );

    res.status(201).json({
      success: true,
      message: 'El bloqueo fue creado correctamente',
      bloqueo: mapBlockRow(result.rows[0])
    });
  } catch (error) {
    handleError(res, error, 'Error al crear el bloqueo');
  }
});

router.patch('/bloqueos/:id/deactivate', async (req, res) => {
  try {
    await getAdminContext(req.user);

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
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: 'No encontramos el bloqueo activo que intentas desactivar'
      });
    }

    res.json({
      success: true,
      message: 'El bloqueo fue desactivado correctamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al desactivar el bloqueo');
  }
});

async function buildAdminAgenda({ fecha, vista }) {
  const fechaMinimaBloqueo = await getEffectiveOperationalStartDate();
  const horario = await getBusinessScheduleForDate(fecha);
  const bloqueos = await getActiveBlocksForDate(fecha);
  const citas = await getAppointmentsByDate(fecha);
  const bloqueosProximos = await getUpcomingBlocks(fecha, 12);
  const dayName = getDayName(fecha);
  const cerradoPorDomingo = dayName === 'domingo';
  const cerrado = cerradoPorDomingo || !horario || !horario.abierto;
  const rango = await buildRangeSummary(fecha, vista);

  return {
    vista,
    fecha,
    fechaMinimaBloqueo,
    dia: formatDayLabel(dayName),
    cerrado,
    cierreMotivo: cerrado
      ? cerradoPorDomingo
        ? 'Los domingos Sweety Puppies siempre permanece cerrado.'
        : 'No hay horario operativo configurado para esta fecha.'
      : null,
    horario: horario
      ? {
          horaApertura: horario.hora_apertura,
          horaCierre: horario.hora_cierre,
          ultimaCita: horario.ultima_cita,
          duracionBaseMinutos: horario.duracion_base_minutos,
          abierto: horario.abierto
        }
      : null,
    resumen: {
      total: citas.length,
      pendientes: countByState(citas, 'pendiente'),
      confirmadas: countByState(citas, 'confirmada'),
      enAtencion: countByState(citas, 'en_atencion'),
      completadas: countByState(citas, 'completada'),
      canceladas: countByState(citas, 'cancelada'),
      reprogramadas: countByState(citas, 'reprogramada'),
      bloqueos: bloqueos.length
    },
    citas,
    bloqueos,
    bloqueosProximos,
    rango
  };
}

async function buildRangeSummary(fecha, vista) {
  const range = resolveDateRange(fecha, vista);
  const dias = [];

  for (const dateValue of range.dates) {
    const [horario, bloqueos, citas] = await Promise.all([
      getBusinessScheduleForDate(dateValue),
      getActiveBlocksForDate(dateValue),
      getAppointmentsByDate(dateValue)
    ]);

    const dayName = getDayName(dateValue);
    const cerradoPorDomingo = dayName === 'domingo';
    const cerrado = cerradoPorDomingo || !horario || !horario.abierto;

    dias.push({
      fecha: dateValue,
      dia: formatDayLabel(dayName),
      cerrado,
      resumen: {
        total: citas.length,
        pendientes: countByState(citas, 'pendiente'),
        confirmadas: countByState(citas, 'confirmada'),
        enAtencion: countByState(citas, 'en_atencion'),
        completadas: countByState(citas, 'completada'),
        canceladas: countByState(citas, 'cancelada'),
        reprogramadas: countByState(citas, 'reprogramada'),
        bloqueos: bloqueos.length
      }
    });
  }

  return {
    vista,
    inicio: range.start,
    fin: range.end,
    etiqueta: range.label,
    dias
  };
}

async function getAdminContext(user) {
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
    [user.sub, user.administradorId || null]
  );

  if (!result.rowCount) {
    const error = new Error('No encontramos un perfil administrativo activo para esta sesion');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function getBusinessScheduleForDate(fecha) {
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
    [getDayName(fecha)]
  );

  return result.rows[0] || null;
}

async function getActiveBlocksForDate(fecha) {
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

  return result.rows.map(mapBlockRow);
}

async function getUpcomingBlocks(fromDate, limit = 12) {
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

  return result.rows.map(mapBlockRow);
}

async function getAppointmentsByDate(fecha) {
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
    [fecha, APPOINTMENT_STATES]
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
    mascotaNombre: row.mascota_nombre,
    mascotaRaza: row.mascota_raza,
    mascotaFotoUrl: row.mascota_foto_url,
    servicioNombre: row.servicio_nombre,
    bloqueaDisponibilidad: BLOCKING_STATES.includes(row.estado)
  }));
}

async function getAppointmentDetail(citaId) {
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
    [citaId]
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
    [citaId]
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

async function getAppointmentNotificationDetails(citaId) {
  const cita = await getAppointmentDetail(citaId);
  if (!cita) {
    return null;
  }

  return {
    id: cita.id,
    fecha: cita.fecha,
    horaInicio: cita.horaInicio,
    horaFinEstimada: cita.horaFinEstimada,
    estado: cita.estado,
    estadoPelajeReportado: cita.estadoPelajeReportado,
    comportamientoReportado: cita.comportamientoReportado,
    observacionesCliente: cita.observacionesCliente,
    precioBase: cita.precioBase,
    precioCalculado: cita.precioCalculado,
    precioFinal: cita.precioFinal,
    clientName: cita.cliente.nombre,
    clientEmail: cita.cliente.email,
    petName: cita.mascota.nombre,
    serviceName: cita.servicioPrincipal.nombre,
    additionalServices: cita.serviciosAdicionales
  };
}

async function hasOverlappingBlock({ fecha, horaInicio, horaFin }) {
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

function normalizeDateParam(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return raw;
}

function normalizeViewMode(value) {
  const normalized = String(value || 'hoy').trim().toLowerCase();
  if (['hoy', 'semana', 'mes'].includes(normalized)) {
    return normalized;
  }

  return 'hoy';
}

function normalizeBlockPayload(payload) {
  return {
    fecha: payload?.fecha || '',
    horaInicio: normalizeOptionalTime(payload?.horaInicio),
    horaFin: normalizeOptionalTime(payload?.horaFin),
    motivo: normalizeOptionalText(payload?.motivo)
  };
}

function normalizeOptionalTime(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  return normalized.length === 5 ? `${normalized}:00` : normalized;
}

function normalizeOptionalText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function getTodayDateString() {
  return getBusinessNow().date;
}

async function getEffectiveOperationalStartDate() {
  const now = getBusinessNow();
  const todaySchedule = await getBusinessScheduleForDate(now.date);

  const shouldMoveToNextDay =
    !todaySchedule ||
    !todaySchedule.abierto ||
    getDayName(now.date) === 'domingo' ||
    now.totalMinutes >= timeToMinutes(todaySchedule.hora_cierre);

  return findNextOperationalDate(shouldMoveToNextDay ? addDays(now.date, 1) : now.date);
}

async function findNextOperationalDate(startDate) {
  let candidate = startDate;

  for (let index = 0; index < 15; index += 1) {
    const horario = await getBusinessScheduleForDate(candidate);
    if (horario?.abierto && getDayName(candidate) !== 'domingo') {
      return candidate;
    }

    candidate = addDays(candidate, 1);
  }

  return startDate;
}

function getBusinessNow() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    totalMinutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

function resolveDateRange(fecha, vista) {
  const base = new Date(`${fecha}T00:00:00`);
  const dates = [];
  let start = new Date(base);
  let end = new Date(base);

  if (vista === 'semana') {
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(base.getDate() + diffToMonday);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (vista === 'mes') {
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(formatDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    start: formatDateOnly(start),
    end: formatDateOnly(end),
    dates,
    label:
      vista === 'mes'
        ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(start)
        : vista === 'semana'
          ? `${formatShortDate(start)} - ${formatShortDate(end)}`
          : formatDateLabel(fecha)
  };
}

function formatDateOnly(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short'
  }).format(value);
}

function formatShortHumanDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function getDayName(fecha) {
  const date = new Date(`${fecha}T00:00:00`);
  return DAY_NAMES[date.getDay()];
}

function formatDayLabel(value) {
  return String(value || '')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapBlockRow(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    motivo: row.motivo,
    activo: row.activo,
    esDiaCompleto: !row.hora_inicio && !row.hora_fin,
    createdAt: row.created_at
  };
}

function countByState(items, state) {
  return items.filter((item) => item.estado === state).length;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

function buildAppointmentEmailViewModel(appointment) {
  return {
    clientName: appointment.clientName,
    petName: appointment.petName,
    serviceName: appointment.serviceName,
    dateLabel: formatDateLabel(appointment.fecha),
    timeLabel: `${String(appointment.horaInicio).slice(0, 5)} - ${String(appointment.horaFinEstimada).slice(0, 5)}`,
    reportedCoatState: formatStatusLabel(appointment.estadoPelajeReportado),
    reportedBehavior: formatStatusLabel(appointment.comportamientoReportado),
    clientNotes: appointment.observacionesCliente,
    totalPrice: appointment.precioFinal || appointment.precioCalculado,
    additionalServices: appointment.additionalServices || []
  };
}

function formatDateLabel(dateValue) {
  const value = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(value.getTime())) {
    return String(dateValue);
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full'
  }).format(value);
}

function formatStatusLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function handleError(res, error, defaultMessage) {
  console.error(defaultMessage, error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || defaultMessage
  });
}

module.exports = router;
