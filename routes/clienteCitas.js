const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const client = require('../baseDatos');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadBufferToSupabase } = require('../services/supabaseStorage');
const { sendAppointmentRequestEmail, sendAppointmentStatusEmail } = require('../services/emailService');

const router = express.Router();
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const appointmentActionSecret = process.env.APPOINTMENT_ACTION_SECRET || process.env.JWT_SECRET || 'sweetypuppies_secret_key';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten imagenes'), false);
      return;
    }

    cb(null, true);
  }
});

const NUDO_SURCHARGE_BY_SIZE = {
  miniatura: 15000,
  pequeno: 15000,
  mediano: 15000,
  grande: 25000,
  'extra grande': 25000
};

const DEFAULT_SERVICE_PRICES = {
  'corte de uñas': 10000
};

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

router.use(express.urlencoded({ extended: false }));

router.get('/admin-review', async (req, res) => {
  try {
    const { token } = req.query;
    const payload = verifyAppointmentActionToken(token);
    const appointment = await getAppointmentNotificationDetails(payload.citaId);

    if (!appointment) {
      return res.status(404).send(renderAppointmentReviewPage({
        title: 'La cita ya no esta disponible',
        message: 'No encontramos la solicitud asociada a este enlace.',
        appointment: null
      }));
    }

    res.send(renderAppointmentReviewPage({
      title:
        appointment.estado === 'pendiente'
          ? payload.flowType === 'reprogramacion'
            ? 'Revisa la solicitud de reprogramacion'
            : 'Revisa la nueva solicitud de cita'
          : 'Esta cita ya fue atendida',
      message:
        appointment.estado === 'pendiente'
          ? payload.flowType === 'reprogramacion'
            ? 'Puedes confirmar o cancelar esta reprogramacion desde aqui.'
            : 'Puedes confirmar o cancelar esta solicitud desde aqui.'
          : `La cita ya se encuentra en estado ${formatStatusLabel(appointment.estado)}.`,
      appointment,
      token
    }));
  } catch (error) {
    res.status(error.status || 400).send(renderAppointmentReviewPage({
      title: 'No pudimos abrir la revision',
      message: error.message || 'El enlace ya no es valido o vencio.',
      appointment: null
    }));
  }
});

router.get('/admin-review/action', async (req, res) => {
  try {
    const { token, decision } = req.query;
    const payload = verifyAppointmentActionToken(token);
    res.send(await processAppointmentAdminDecision({ citaId: payload.citaId, decision, flowType: payload.flowType }));
  } catch (error) {
    res.status(error.status || 400).send(renderAppointmentReviewPage({
      title: 'No pudimos procesar la accion',
      message: error.message || 'El enlace no es valido o ya vencio.',
      appointment: null
    }));
  }
});

router.post('/admin-review/action', async (req, res) => {
  try {
    const { token, decision } = req.body;
    const payload = verifyAppointmentActionToken(token);
    res.send(await processAppointmentAdminDecision({ citaId: payload.citaId, decision, flowType: payload.flowType }));
  } catch (error) {
    res.status(error.status || 400).send(renderAppointmentReviewPage({
      title: 'No pudimos procesar la accion',
      message: error.message || 'El enlace no es valido o ya vencio.',
      appointment: null
    }));
  }
});

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/form-options', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const [pets, services, additionals] = await Promise.all([
      getClientPets(clientContext.clienteIds),
      getActiveServices(),
      getActiveAdditionalServices()
    ]);

    res.json({
      success: true,
      mascotas: pets,
      servicios: services,
      serviciosAdicionales: additionals
    });
  } catch (error) {
    handleError(res, error, 'Error al cargar el formulario de citas');
  }
});

router.post('/quote', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const quote = await buildAppointmentQuote(clientContext, req.body);

    res.json({
      success: true,
      quote
    });
  } catch (error) {
    handleError(res, error, 'Error al calcular el precio estimado');
  }
});

router.get('/availability', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const availability = await buildAvailability(clientContext, req.query);

    res.json({
      success: true,
      ...availability
    });
  } catch (error) {
    handleError(res, error, 'Error al consultar la disponibilidad');
  }
});

router.post(
  '/',
  upload.fields([{ name: 'fotoEstadoActual', maxCount: 1 }]),
  async (req, res) => {
    try {
      const clientContext = await getClientContext(req.user);
      const payload = normalizeAppointmentPayload(req.body);
      const quote = await buildAppointmentQuote(clientContext, payload);

      if (!payload.fecha) {
        return res.status(400).json({
          success: false,
          message: 'Debes seleccionar una fecha para la cita'
        });
      }

      if (!payload.horaInicio) {
        return res.status(400).json({
          success: false,
          message: 'Debes seleccionar una hora disponible'
        });
      }

      const availability = await buildAvailability(clientContext, {
        ...payload,
        fecha: payload.fecha
      });

      const selectedSlot = availability.slots.find((slot) => slot.horaInicio === payload.horaInicio);

      if (!selectedSlot) {
        return res.status(400).json({
          success: false,
          message: 'La hora seleccionada ya no esta disponible'
        });
      }

      const fotoEstadoActual = req.files?.fotoEstadoActual?.[0];
      const fotoEstadoActualData = fotoEstadoActual
        ? await uploadBufferToSupabase({
            buffer: fotoEstadoActual.buffer,
            originalName: fotoEstadoActual.originalname,
            mimeType: fotoEstadoActual.mimetype,
            folder: `clientes/${clientContext.clienteId}/citas/estado-actual`
          })
        : null;

      await client.query('BEGIN');

      const citaResult = await client.query(
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
          clientContext.clienteId,
          quote.mascota.id,
          quote.servicio.id,
          payload.fecha,
          payload.horaInicio,
          selectedSlot.horaFinEstimada,
          quote.estadoPelajeReportado,
          quote.comportamientoReportado,
          fotoEstadoActualData?.publicUrl || null,
          payload.observacionesCliente,
          quote.precioBase,
          quote.totalEstimado,
          quote.totalEstimado
        ]
      );

      const cita = citaResult.rows[0];

      if (quote.adicionales.length) {
        for (const adicional of quote.adicionales) {
          await client.query(
            `
              INSERT INTO cita_servicios_adicionales (cita_id, servicio_adicional_id, precio_aplicado)
              VALUES ($1::uuid, $2::uuid, $3::integer)
            `,
            [cita.id, adicional.id, adicional.precio]
          );
        }
      }

      await client.query('COMMIT');

      try {
        const notificationAppointment = await getAppointmentNotificationDetails(cita.id);
        const actionToken = createAppointmentActionToken(cita.id, 'nueva');
        const reviewUrl = `${appBaseUrl}/api/cliente/citas/admin-review?token=${encodeURIComponent(actionToken)}`;
        const confirmUrl = `${appBaseUrl}/api/cliente/citas/admin-review/action?token=${encodeURIComponent(actionToken)}&decision=confirmada`;
        const cancelUrl = `${appBaseUrl}/api/cliente/citas/admin-review/action?token=${encodeURIComponent(actionToken)}&decision=cancelada`;

        await sendAppointmentRequestEmail({
          email: getAdministrativeEmail(),
          reviewUrl,
          confirmUrl,
          cancelUrl,
          appointment: buildAppointmentEmailViewModel(notificationAppointment),
          flowType: 'nueva'
        });
      } catch (notificationError) {
        console.error('No se pudo notificar a la administradora sobre la nueva cita', notificationError);
      }

      res.status(201).json({
        success: true,
        message: 'Cita agendada correctamente y quedo pendiente por confirmacion',
        cita: {
          ...cita,
          mascotaNombre: quote.mascota.nombre,
          servicioNombre: quote.servicio.nombre,
          precioCalculado: quote.totalEstimado,
          adicionales: quote.adicionales,
          fotoEstadoActualUrl: fotoEstadoActualData?.publicUrl || null
        }
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      handleError(res, error, 'Error al crear la cita');
    }
  }
);

router.patch('/:id/cancel', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const appointment = await findOwnedAppointmentForClient(req.params.id, clientContext.clienteIds);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'La cita que intentas cancelar no pertenece a tu cuenta'
      });
    }

    if (!['pendiente', 'confirmada'].includes(appointment.estado)) {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes cancelar citas pendientes o confirmadas'
      });
    }

    await client.query(
      `
        UPDATE citas
        SET
          estado = 'cancelada',
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [appointment.id]
    );

    res.json({
      success: true,
      message: 'La cita fue cancelada correctamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al cancelar la cita');
  }
});

router.patch('/:id/reprogram', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const payload = normalizeAppointmentPayload(req.body);
    const appointment = await findOwnedAppointmentForClient(req.params.id, clientContext.clienteIds);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'La cita que intentas reprogramar no pertenece a tu cuenta'
      });
    }

    if (!['pendiente', 'confirmada'].includes(appointment.estado)) {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes reprogramar citas pendientes o confirmadas'
      });
    }

    if (!payload.fecha) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar una nueva fecha'
      });
    }

    if (!payload.horaInicio) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar una nueva hora'
      });
    }

    const additionalIds = await getAppointmentAdditionalServiceIds(appointment.id);
    const availability = await buildAvailability(clientContext, {
      appointmentId: appointment.id,
      mascotaId: appointment.mascotaId,
      servicioId: appointment.servicioId,
      servicioAdicionalIds: additionalIds,
      estadoPelajeReportado: appointment.estadoPelajeReportado,
      comportamientoReportado: appointment.comportamientoReportado,
      fecha: payload.fecha
    });

    const selectedSlot = availability.slots.find((slot) => slot.horaInicio === payload.horaInicio);

    if (!selectedSlot) {
      return res.status(400).json({
        success: false,
        message: 'La hora seleccionada ya no esta disponible para reprogramar'
      });
    }

    const updateResult = await client.query(
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
      [appointment.id, payload.fecha, payload.horaInicio, selectedSlot.horaFinEstimada]
    );

    try {
      const notificationAppointment = await getAppointmentNotificationDetails(appointment.id);
      const actionToken = createAppointmentActionToken(appointment.id, 'reprogramacion');
      const reviewUrl = `${appBaseUrl}/api/cliente/citas/admin-review?token=${encodeURIComponent(actionToken)}`;
      const confirmUrl = `${appBaseUrl}/api/cliente/citas/admin-review/action?token=${encodeURIComponent(actionToken)}&decision=confirmada`;
      const cancelUrl = `${appBaseUrl}/api/cliente/citas/admin-review/action?token=${encodeURIComponent(actionToken)}&decision=cancelada`;

      await sendAppointmentRequestEmail({
        email: getAdministrativeEmail(),
        reviewUrl,
        confirmUrl,
        cancelUrl,
        appointment: buildAppointmentEmailViewModel(notificationAppointment, {
          previousDate: appointment.fecha,
          previousTimeStart: appointment.horaInicio,
          previousTimeEnd: appointment.horaFinEstimada
        }),
        flowType: 'reprogramacion'
      });
    } catch (notificationError) {
      console.error('No se pudo notificar a la administradora sobre la reprogramacion', notificationError);
    }

    res.json({
      success: true,
      message: 'La cita fue reprogramada y quedo nuevamente pendiente de confirmacion',
      cita: updateResult.rows[0]
    });
  } catch (error) {
    handleError(res, error, 'Error al reprogramar la cita');
  }
});

async function getClientContext(user) {
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
    [user.sub, user.clienteId || null]
  );

  if (result.rowCount === 0) {
    const error = new Error('Cliente autenticado no encontrado');
    error.status = 404;
    throw error;
  }

  return {
    clienteId: result.rows[0].id,
    clienteIds: result.rows.map((row) => row.id)
  };
}

async function getClientPets(clienteIds) {
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
    [clienteIds]
  );

  return result.rows;
}

async function findOwnedAppointmentForClient(appointmentId, clienteIds) {
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
    [appointmentId, clienteIds]
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

async function getAppointmentAdditionalServiceIds(appointmentId) {
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

async function getActiveServices() {
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

async function getActiveAdditionalServices() {
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

async function buildAppointmentQuote(clientContext, rawPayload) {
  const payload = normalizeAppointmentPayload(rawPayload);

  if (!payload.mascotaId) {
    const error = new Error('Debes seleccionar una mascota');
    error.status = 400;
    throw error;
  }

  if (!payload.servicioId) {
    const error = new Error('Debes seleccionar un servicio principal');
    error.status = 400;
    throw error;
  }

  const mascota = await findOwnedPet(payload.mascotaId, clientContext.clienteIds);
  if (!mascota) {
    const error = new Error('La mascota seleccionada no pertenece a tu cuenta');
    error.status = 404;
    throw error;
  }

  const servicio = await findActiveService(payload.servicioId);
  if (!servicio) {
    const error = new Error('El servicio principal no esta disponible');
    error.status = 404;
    throw error;
  }

  const estadoPelajeReportado = normalizeReportedCoatState(payload.estadoPelajeReportado);
  const comportamientoReportado = normalizeBehaviorValue(payload.comportamientoReportado);
  const additionalIds = dedupeIds(payload.servicioAdicionalIds);
  const adicionales = await findActiveAdditionalServicesByIds(additionalIds);

  if (adicionales.length !== additionalIds.length) {
    const error = new Error('Uno de los servicios adicionales ya no esta disponible');
    error.status = 400;
    throw error;
  }

  const precioBase = await resolveBasePrice(servicio, mascota);
  const recargoNudos = resolveKnotSurcharge(servicio, mascota, estadoPelajeReportado);
  const recargoComportamiento = resolveBehaviorSurcharge(servicio, comportamientoReportado);
  const adicionalesConPrecio = await resolveAdditionalPrices(adicionales, mascota.tamano);
  const totalAdicionales = adicionalesConPrecio.reduce((sum, item) => sum + item.precio, 0);
  const totalEstimado = precioBase + recargoNudos + recargoComportamiento + totalAdicionales;

  return {
    mascota,
    servicio,
    adicionales: adicionalesConPrecio,
    precioBase,
    recargoNudos,
    recargoComportamiento,
    totalAdicionales,
    totalEstimado,
    duracionMinutos: Number(servicio.duracion_minutos) || 0,
    estadoPelajeReportado,
    comportamientoReportado
  };
}

async function buildAvailability(clientContext, rawPayload) {
  const payload = normalizeAppointmentPayload(rawPayload);

  if (!payload.fecha) {
    const error = new Error('Debes seleccionar una fecha');
    error.status = 400;
    throw error;
  }

  validateFutureDate(payload.fecha);

  const quote = await buildAppointmentQuote(clientContext, payload);
  const horario = await getBusinessScheduleForDate(payload.fecha);

  if (!horario || !horario.abierto) {
    return {
      fecha: payload.fecha,
      slots: [],
      message: 'No atendemos ese dia'
    };
  }

  const bloqueos = await getAgendaBlocks(payload.fecha);
  if (bloqueos.some((bloqueo) => !bloqueo.hora_inicio && !bloqueo.hora_fin)) {
    return {
      fecha: payload.fecha,
      slots: [],
      message: 'La agenda esta bloqueada para esa fecha'
    };
  }

  const citasOcupadas = await getBlockingAppointments(payload.fecha, payload.appointmentId);
  const slots = buildTimeSlots({
    fecha: payload.fecha,
    duracionMinutos: quote.duracionMinutos || Number(horario.duracion_base_minutos) || 0,
    horario,
    bloqueos,
    citasOcupadas
  });

  return {
    fecha: payload.fecha,
    slots,
    message: slots.length ? null : 'No quedan horarios disponibles para esa fecha'
  };
}

function normalizeAppointmentPayload(body) {
  const rawAdditionalIds = body?.servicioAdicionalIds ?? body?.servicio_adicional_ids ?? [];
  let servicioAdicionalIds = rawAdditionalIds;

  if (typeof rawAdditionalIds === 'string') {
    try {
      servicioAdicionalIds = JSON.parse(rawAdditionalIds);
    } catch (error) {
      servicioAdicionalIds = rawAdditionalIds
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return {
    mascotaId: body?.mascotaId || body?.mascota_id || '',
    servicioId: body?.servicioId || body?.servicio_id || '',
    servicioAdicionalIds: Array.isArray(servicioAdicionalIds) ? servicioAdicionalIds : [],
    estadoPelajeReportado: body?.estadoPelajeReportado || body?.estado_pelaje_reportado || 'normal',
    comportamientoReportado: body?.comportamientoReportado || body?.comportamiento_reportado || 'normal',
    observacionesCliente: normalizeOptionalText(body?.observacionesCliente || body?.observaciones_cliente || null),
    appointmentId: body?.appointmentId || body?.appointment_id || '',
    fecha: body?.fecha || '',
    horaInicio: body?.horaInicio || body?.hora_inicio || ''
  };
}

async function findOwnedPet(petId, clienteIds) {
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
    [petId, clienteIds]
  );

  return result.rows[0] || null;
}

async function findActiveService(serviceId) {
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

async function findActiveAdditionalServicesByIds(ids) {
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

async function resolveBasePrice(servicio, mascota) {
  if (servicio.requiere_tamano || servicio.requiere_tipo_pelaje) {
    const tarifaResult = await client.query(
      `
        SELECT precio_base
        FROM tarifas_servicio
        WHERE servicio_id = $1::uuid
          AND tamano::text = $2
          AND tipo_pelaje::text = $3
          AND activo = true
        LIMIT 1
      `,
      [servicio.id, mascota.tamano, mascota.tipo_pelaje]
    );

    if (tarifaResult.rowCount === 0) {
      const error = new Error('No encontramos una tarifa base para la mascota y el servicio seleccionados');
      error.status = 400;
      throw error;
    }

    return tarifaResult.rows[0].precio_base;
  }

  const normalizedServiceName = normalizeBasicValue(servicio.nombre);
  return DEFAULT_SERVICE_PRICES[normalizedServiceName] || 0;
}

function resolveKnotSurcharge(servicio, mascota, estadoPelajeReportado) {
  if (!servicio.aplica_recargo_nudos) {
    return 0;
  }

  if (!['con_nudos', 'muy_enredado'].includes(estadoPelajeReportado)) {
    return 0;
  }

  return NUDO_SURCHARGE_BY_SIZE[mascota.tamano] || 0;
}

function resolveBehaviorSurcharge(servicio, comportamientoReportado) {
  if (!servicio.aplica_recargo_comportamiento) {
    return 0;
  }

  if (!['sensible', 'agresivo'].includes(comportamientoReportado)) {
    return 0;
  }

  return 5000;
}

async function resolveAdditionalPrices(adicionales, tamano) {
  if (!adicionales.length) {
    return [];
  }

  const ids = adicionales.map((adicional) => adicional.id);
  const tarifasResult = await client.query(
    `
      SELECT servicio_adicional_id, precio
      FROM tarifas_servicio_adicional
      WHERE servicio_adicional_id = ANY($1::uuid[])
        AND tamano::text = $2
        AND activo = true
    `,
    [ids, tamano]
  );

  const priceMap = new Map(tarifasResult.rows.map((row) => [row.servicio_adicional_id, row.precio]));

  return adicionales.map((adicional) => {
    const precio = priceMap.get(adicional.id);

    if (typeof precio !== 'number') {
      const error = new Error(`No encontramos tarifa para el adicional ${adicional.nombre}`);
      error.status = 400;
      throw error;
    }

    return {
      id: adicional.id,
      nombre: adicional.nombre,
      descripcion: adicional.descripcion,
      precio
    };
  });
}

async function getBusinessScheduleForDate(fecha) {
  const date = new Date(`${fecha}T00:00:00`);
  const dayName = DAY_NAMES[date.getDay()];

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

async function getAgendaBlocks(fecha) {
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

async function getBlockingAppointments(fecha, appointmentId = null) {
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

async function getAppointmentNotificationDetails(citaId) {
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
    [citaId]
  );

  if (result.rowCount === 0) {
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
    [citaId]
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

async function getPrimaryAdministratorId() {
  const adminEmail = getAdministrativeEmail().toLowerCase();
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
    [adminEmail]
  );

  return result.rows[0]?.id || null;
}

async function processAppointmentAdminDecision({ citaId, decision, flowType = 'nueva' }) {
  if (!['confirmada', 'cancelada'].includes(decision)) {
    const error = new Error('La decision solicitada no es compatible con la agenda.');
    error.status = 400;
    throw error;
  }

  const appointment = await getAppointmentNotificationDetails(citaId);

  if (!appointment) {
    const error = new Error('No encontramos la solicitud que intentabas actualizar.');
    error.status = 404;
    throw error;
  }

  if (appointment.estado !== 'pendiente') {
    return renderAppointmentReviewPage({
      title: 'Esta cita ya fue atendida',
      message: `La cita ya se encuentra en estado ${formatStatusLabel(appointment.estado)}.`,
      appointment
    });
  }

  const administratorId = await getPrimaryAdministratorId();

  await client.query(
    `
      UPDATE citas
      SET
        estado = $2,
        administrador_id = COALESCE($3::uuid, administrador_id),
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [appointment.id, decision, administratorId]
  );

  const updatedAppointment = await getAppointmentNotificationDetails(appointment.id);

  try {
    await sendAppointmentStatusEmail({
      email: updatedAppointment.clientEmail,
      status: decision,
      appointment: buildAppointmentEmailViewModel(updatedAppointment),
      flowType
    });
  } catch (notificationError) {
    console.error('No se pudo notificar al cliente sobre el cambio de estado de la cita', notificationError);
  }

  return renderAppointmentReviewPage({
    title:
      decision === 'confirmada'
        ? flowType === 'reprogramacion'
          ? 'Reprogramacion confirmada correctamente'
          : 'Cita confirmada correctamente'
        : flowType === 'reprogramacion'
          ? 'Reprogramacion cancelada correctamente'
          : 'Cita cancelada correctamente',
    message:
      decision === 'confirmada'
        ? flowType === 'reprogramacion'
          ? 'La cliente ya recibio o recibira un correo informando que Sweety Puppies acepto y confirmo la reprogramacion.'
          : 'La cliente ya recibio o recibira un correo informando que su cita fue confirmada por Sweety Puppies.'
        : flowType === 'reprogramacion'
          ? 'La cliente ya recibio o recibira un correo informando que la reprogramacion fue cancelada.'
          : 'La cliente ya recibio o recibira un correo informando que la cita fue cancelada.',
    appointment: updatedAppointment
  });
}

function createAppointmentActionToken(citaId, flowType = 'nueva') {
  return jwt.sign(
    {
      citaId,
      scope: 'appointment-review',
      flowType
    },
    appointmentActionSecret,
    { expiresIn: '72h' }
  );
}

function verifyAppointmentActionToken(token) {
  if (!token) {
    const error = new Error('El enlace de revision esta incompleto');
    error.status = 400;
    throw error;
  }

  try {
    const payload = jwt.verify(token, appointmentActionSecret);
    if (!payload?.citaId || payload.scope !== 'appointment-review') {
      throw new Error('Token sin alcance valido');
    }

    return {
      ...payload,
      flowType: payload.flowType || 'nueva'
    };
  } catch (caughtError) {
    const error = new Error('El enlace de revision ya no es valido o vencio');
    error.status = 400;
    throw error;
  }
}

function getAdministrativeEmail() {
  return process.env.MAIL_USER || extractEmailFromMailFrom(process.env.MAIL_FROM) || 'sweetypuppies01@gmail.com';
}

function extractEmailFromMailFrom(mailFrom) {
  const match = String(mailFrom || '').match(/<([^>]+)>/);
  return match ? match[1] : mailFrom || null;
}

function buildAppointmentEmailViewModel(appointment, options = {}) {
  const previousDateValue = options.previousDate ? formatDateLabel(options.previousDate) : null;
  const previousTimeValue =
    options.previousTimeStart && options.previousTimeEnd
      ? `${String(options.previousTimeStart).slice(0, 5)} - ${String(options.previousTimeEnd).slice(0, 5)}`
      : null;

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
    additionalServices: appointment.additionalServices,
    previousDateLabel: previousDateValue,
    previousTimeLabel: previousTimeValue
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

function renderAppointmentReviewPage({ title, message, appointment, token = '' }) {
  const appointmentCard = appointment
    ? `
      <div style="margin-top:24px; padding:24px; border-radius:24px; background:linear-gradient(145deg, rgba(255,244,250,0.96) 0%, rgba(255,255,255,0.96) 52%, rgba(238,250,255,0.96) 100%); border:1px solid rgba(243,209,230,0.92); text-align:left;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px;">
          <div><strong style="display:block; color:#8f176e;">Cliente</strong><span>${appointment.clientName}</span></div>
          <div><strong style="display:block; color:#8f176e;">Mascota</strong><span>${appointment.petName}</span></div>
          <div><strong style="display:block; color:#8f176e;">Servicio</strong><span>${appointment.serviceName}</span></div>
          <div><strong style="display:block; color:#8f176e;">Fecha</strong><span>${formatDateLabel(appointment.fecha)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Hora</strong><span>${String(appointment.horaInicio).slice(0, 5)} - ${String(appointment.horaFinEstimada).slice(0, 5)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Estado</strong><span>${formatStatusLabel(appointment.estado)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Pelaje reportado</strong><span>${formatStatusLabel(appointment.estadoPelajeReportado)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Comportamiento</strong><span>${formatStatusLabel(appointment.comportamientoReportado)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Precio estimado</strong><span>${formatCurrency(appointment.precioFinal || appointment.precioCalculado)}</span></div>
        </div>
        <div style="margin-top:18px;">
          <strong style="display:block; color:#8f176e; margin-bottom:8px;">Servicios adicionales</strong>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${
              appointment.additionalServices.length
                ? appointment.additionalServices
                    .map(
                      (item) =>
                        `<span style="display:inline-flex; padding:8px 12px; border-radius:999px; background:#fff3fb; color:#8f176e; font-weight:600;">${item.nombre} - ${formatCurrency(item.precio)}</span>`
                    )
                    .join('')
                : '<span style="display:inline-flex; padding:8px 12px; border-radius:999px; background:#fff3fb; color:#8f176e; font-weight:600;">Sin adicionales</span>'
            }
          </div>
        </div>
        ${
          appointment.observacionesCliente
            ? `<p style="margin:18px 0 0; line-height:1.7;"><strong style="color:#8f176e;">Observaciones del cliente:</strong> ${appointment.observacionesCliente}</p>`
            : ''
        }
      </div>
    `
    : '';

  const actionButtons =
    appointment && appointment.estado === 'pendiente' && token
      ? `
        <form method="POST" action="/api/cliente/citas/admin-review/action" style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:24px;">
          <input type="hidden" name="token" value="${token}">
          <button type="submit" name="decision" value="confirmada" style="border:none; cursor:pointer; padding:14px 22px; border-radius:999px; background:linear-gradient(135deg,#c1008f 0%,#e95adb 100%); color:#ffffff; font-weight:700;">Confirmar cita</button>
          <button type="submit" name="decision" value="cancelada" style="border:none; cursor:pointer; padding:14px 22px; border-radius:999px; background:linear-gradient(135deg,#63d0e0 0%,#45bdd3 100%); color:#ffffff; font-weight:700;">Cancelar cita</button>
        </form>
      `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sweety Puppies - Revision de cita</title>
      </head>
      <body style="margin:0; background:linear-gradient(180deg,#fff7fb 0%,#fff0f8 100%); font-family:Arial,sans-serif; color:#4b2d40;">
        <main style="max-width:860px; margin:0 auto; padding:36px 18px;">
          <section style="background:rgba(255,255,255,0.96); border-radius:32px; padding:34px; border:1px solid rgba(255,214,235,0.95); box-shadow:0 28px 70px rgba(204,115,174,0.12);">
            <div style="display:inline-flex; padding:8px 14px; border-radius:999px; background:linear-gradient(135deg,#fff1f9 0%,#eefafe 100%); color:#9c0076; font-weight:700; font-size:0.86rem;">Sweety Puppies</div>
            <h1 style="margin:16px 0 10px; color:#8f176e; font-size:2rem;">${title}</h1>
            <p style="margin:0; color:#6e5064; line-height:1.8;">${message}</p>
            ${appointmentCard}
            ${actionButtons}
          </section>
        </main>
      </body>
    </html>
  `;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function buildTimeSlots({ fecha, duracionMinutos, horario, bloqueos, citasOcupadas }) {
  const slots = [];
  const startMinutes = timeToMinutes(horario.hora_apertura);
  const closeMinutes = timeToMinutes(horario.hora_cierre);
  const lastAppointmentMinutes = timeToMinutes(horario.ultima_cita);
  const stepMinutes = 30;
  const now = new Date();
  const isToday = fecha === now.toISOString().split('T')[0];

  for (let start = startMinutes; start <= lastAppointmentMinutes; start += stepMinutes) {
    const end = start + duracionMinutos;

    if (end > closeMinutes) {
      continue;
    }

    if (isToday && start <= now.getHours() * 60 + now.getMinutes()) {
      continue;
    }

    const overlapsAppointment = citasOcupadas.some((cita) =>
      rangesOverlap(start, end, timeToMinutes(cita.hora_inicio), timeToMinutes(cita.hora_fin_estimada))
    );

    if (overlapsAppointment) {
      continue;
    }

    const overlapsBlock = bloqueos.some((bloqueo) => {
      if (!bloqueo.hora_inicio && !bloqueo.hora_fin) {
        return true;
      }

      const blockStart = bloqueo.hora_inicio ? timeToMinutes(bloqueo.hora_inicio) : 0;
      const blockEnd = bloqueo.hora_fin ? timeToMinutes(bloqueo.hora_fin) : 24 * 60;
      return rangesOverlap(start, end, blockStart, blockEnd);
    });

    if (overlapsBlock) {
      continue;
    }

    slots.push({
      horaInicio: minutesToTime(start),
      horaFinEstimada: minutesToTime(end),
      label: `${minutesToTime(start).slice(0, 5)} - ${minutesToTime(end).slice(0, 5)}`
    });
  }

  return slots;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function validateFutureDate(fecha) {
  const selectedDate = new Date(`${fecha}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(selectedDate.getTime())) {
    const error = new Error('La fecha seleccionada no es valida');
    error.status = 400;
    throw error;
  }

  if (selectedDate < today) {
    const error = new Error('No puedes agendar citas en fechas pasadas');
    error.status = 400;
    throw error;
  }
}

function dedupeIds(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeBasicValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeBehaviorValue(value) {
  const normalized = normalizeBasicValue(value);

  if (!['normal', 'sensible', 'agresivo'].includes(normalized)) {
    const error = new Error('Debes seleccionar un comportamiento reportado valido');
    error.status = 400;
    throw error;
  }

  return normalized;
}

function normalizeReportedCoatState(value) {
  const normalized = normalizeBasicValue(value).replace(/\s+/g, '_');

  if (!['normal', 'con_nudos', 'muy_enredado'].includes(normalized)) {
    const error = new Error('Debes seleccionar un estado de pelaje reportado valido');
    error.status = 400;
    throw error;
  }

  return normalized;
}

function handleError(res, error, defaultMessage) {
  console.error(defaultMessage, error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || defaultMessage
  });
}

module.exports = router;
