const express = require('express');
const client = require('../baseDatos');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const CURRENT_APPOINTMENT_STATES = ['pendiente', 'confirmada', 'en_atencion'];

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const [currentAppointments, completedServices] = await Promise.all([
      getCurrentAppointments(clientContext.clienteIds),
      getCompletedServices(clientContext.clienteIds)
    ]);

    const pets = buildPetOptions(currentAppointments, completedServices);

    res.json({
      success: true,
      citasActuales: currentAppointments,
      serviciosRealizados: completedServices,
      mascotas: pets
    });
  } catch (error) {
    handleError(res, error, 'Error al cargar el historial del cliente');
  }
});

router.get('/citas/:id', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const appointment = await getCurrentAppointmentDetail(req.params.id, clientContext.clienteIds);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'La cita solicitada no pertenece a tu cuenta o ya no esta activa'
      });
    }

    res.json({
      success: true,
      cita: appointment
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener el detalle de la cita');
  }
});

router.get('/servicios/:id', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const completedService = await getCompletedServiceDetail(req.params.id, clientContext.clienteIds);

    if (!completedService) {
      return res.status(404).json({
        success: false,
        message: 'El servicio solicitado no pertenece a tu historial'
      });
    }

    res.json({
      success: true,
      servicio: completedService
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener el detalle del servicio realizado');
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

async function getCurrentAppointments(clienteIds) {
  const result = await client.query(
    `
      SELECT
        c.id,
        c.mascota_id,
        c.fecha,
        c.hora_inicio,
        c.hora_fin_estimada,
        c.estado::text AS estado,
        c.precio_base,
        c.precio_calculado,
        c.precio_final,
        m.nombre AS mascota_nombre,
        m.raza AS mascota_raza,
        m.tamano::text AS mascota_tamano,
        m.tipo_pelaje::text AS mascota_tipo_pelaje,
        m.foto_mascota_url AS mascota_foto_url,
        s.nombre AS servicio_nombre
      FROM citas c
      INNER JOIN mascotas m ON m.id = c.mascota_id
      INNER JOIN servicios s ON s.id = c.servicio_id
      WHERE c.cliente_id = ANY($1::uuid[])
        AND c.activo = true
        AND c.estado::text = ANY($2::text[])
      ORDER BY c.fecha ASC, c.hora_inicio ASC, c.created_at DESC
    `,
    [clienteIds, CURRENT_APPOINTMENT_STATES]
  );

  return result.rows.map((row) => ({
    id: row.id,
    mascotaId: row.mascota_id,
    mascotaNombre: row.mascota_nombre,
    mascotaRaza: row.mascota_raza,
    mascotaTamano: row.mascota_tamano,
    mascotaTipoPelaje: row.mascota_tipo_pelaje,
    mascotaFotoUrl: row.mascota_foto_url,
    servicioNombre: row.servicio_nombre,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    horaFinEstimada: row.hora_fin_estimada,
    estado: row.estado,
    precioBase: row.precio_base,
    precioCalculado: row.precio_calculado,
    precioFinal: row.precio_final,
    precioMostrado: row.precio_final || row.precio_calculado
  }));
}

async function getCompletedServices(clienteIds) {
  const result = await client.query(
    `
      SELECT
        id,
        cita_id,
        mascota_id,
        fecha_servicio,
        mascota_nombre,
        mascota_raza,
        mascota_tamano::text AS mascota_tamano,
        mascota_tipo_pelaje::text AS mascota_tipo_pelaje,
        servicio_principal_nombre,
        servicios_adicionales_resumen,
        resumen_servicio_realizado,
        observaciones_finales,
        recomendaciones,
        precio_base,
        precio_calculado,
        precio_final
      FROM historial_servicios
      WHERE cliente_id = ANY($1::uuid[])
      ORDER BY fecha_servicio DESC, created_at DESC
    `,
    [clienteIds]
  );

  return result.rows.map((row) => ({
    id: row.id,
    citaId: row.cita_id,
    mascotaId: row.mascota_id,
    fechaServicio: row.fecha_servicio,
    mascotaNombre: row.mascota_nombre,
    mascotaRaza: row.mascota_raza,
    mascotaTamano: row.mascota_tamano,
    mascotaTipoPelaje: row.mascota_tipo_pelaje,
    servicioPrincipalNombre: row.servicio_principal_nombre,
    serviciosAdicionalesResumen: row.servicios_adicionales_resumen,
    resumenServicioRealizado: row.resumen_servicio_realizado,
    observacionesFinales: row.observaciones_finales,
    recomendaciones: row.recomendaciones,
    precioBase: row.precio_base,
    precioCalculado: row.precio_calculado,
    precioFinal: row.precio_final
  }));
}

async function getCurrentAppointmentDetail(appointmentId, clienteIds) {
  const appointmentResult = await client.query(
    `
      SELECT
        c.id,
        c.servicio_id,
        c.fecha,
        c.hora_inicio,
        c.hora_fin_estimada,
        c.estado::text AS estado,
        c.estado_pelaje_reportado::text AS estado_pelaje_reportado,
        c.comportamiento_reportado::text AS comportamiento_reportado,
        c.foto_estado_actual_url,
        c.observaciones_cliente,
        c.precio_base,
        c.precio_calculado,
        c.precio_final,
        m.id AS mascota_id,
        m.nombre AS mascota_nombre,
        m.raza AS mascota_raza,
        m.tamano::text AS mascota_tamano,
        m.tipo_pelaje::text AS mascota_tipo_pelaje,
        m.foto_mascota_url AS mascota_foto_url,
        s.nombre AS servicio_nombre
      FROM citas c
      INNER JOIN mascotas m ON m.id = c.mascota_id
      INNER JOIN servicios s ON s.id = c.servicio_id
      WHERE c.id = $1::uuid
        AND c.cliente_id = ANY($2::uuid[])
        AND c.activo = true
        AND c.estado::text = ANY($3::text[])
      LIMIT 1
    `,
    [appointmentId, clienteIds, CURRENT_APPOINTMENT_STATES]
  );

  if (appointmentResult.rowCount === 0) {
    return null;
  }

  const appointment = appointmentResult.rows[0];
  const additionalResult = await client.query(
    `
      SELECT sa.id, sa.nombre, csa.precio_aplicado
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
    fotoEstadoActualUrl: appointment.foto_estado_actual_url,
    observacionesCliente: appointment.observaciones_cliente,
    precioBase: appointment.precio_base,
    precioCalculado: appointment.precio_calculado,
    precioFinal: appointment.precio_final,
    mensajeEstado: getAppointmentStatusMessage(appointment.estado),
    mascota: {
      id: appointment.mascota_id,
      nombre: appointment.mascota_nombre,
      raza: appointment.mascota_raza,
      tamano: appointment.mascota_tamano,
      tipoPelaje: appointment.mascota_tipo_pelaje,
      fotoUrl: appointment.mascota_foto_url
    },
    servicioPrincipal: {
      id: appointment.servicio_id,
      nombre: appointment.servicio_nombre
    },
    serviciosAdicionales: additionalResult.rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      precio: row.precio_aplicado
    }))
  };
}

async function getCompletedServiceDetail(historyId, clienteIds) {
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
      FROM historial_servicios hs
      WHERE hs.id = $1::uuid
        AND hs.cliente_id = ANY($2::uuid[])
      LIMIT 1
    `,
    [historyId, clienteIds]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    citaId: result.rows[0].cita_id,
    fechaServicio: result.rows[0].fecha_servicio,
    clienteNombreCompleto: result.rows[0].cliente_nombre_completo,
    clienteEmail: result.rows[0].cliente_email,
    clienteTelefono: result.rows[0].cliente_telefono,
    mascotaNombre: result.rows[0].mascota_nombre,
    mascotaRaza: result.rows[0].mascota_raza,
    mascotaTamano: result.rows[0].mascota_tamano,
    mascotaTipoPelaje: result.rows[0].mascota_tipo_pelaje,
    servicioPrincipalNombre: result.rows[0].servicio_principal_nombre,
    serviciosAdicionalesResumen: result.rows[0].servicios_adicionales_resumen,
    resumenServicioRealizado: result.rows[0].resumen_servicio_realizado,
    estadoPelajeReal: result.rows[0].estado_pelaje_real,
    comportamientoObservado: result.rows[0].comportamiento_observado,
    observacionesFinales: result.rows[0].observaciones_finales,
    recomendaciones: result.rows[0].recomendaciones,
    precioBase: result.rows[0].precio_base,
    precioCalculado: result.rows[0].precio_calculado,
    precioFinal: result.rows[0].precio_final
  };
}

function buildPetOptions(currentAppointments, completedServices) {
  const petMap = new Map();

  for (const item of [...currentAppointments, ...completedServices]) {
    const petId = item.mascotaId;
    if (!petId || petMap.has(petId)) {
      continue;
    }

    petMap.set(petId, {
      id: petId,
      nombre: item.mascotaNombre,
      raza: item.mascotaRaza || null
    });
  }

  return [...petMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function getAppointmentStatusMessage(status) {
  if (status === 'pendiente') {
    return 'Tu cita esta pendiente de confirmacion por parte de Sweety Puppies.';
  }

  if (status === 'confirmada') {
    return 'Tu cita ya fue confirmada y estamos preparando todo para recibir a tu peludito.';
  }

  if (status === 'en_atencion') {
    return 'Tu mascota esta siendo atendida en este momento con mucho cuidado.';
  }

  return 'Consulta el estado actual de tu cita en este espacio.';
}

function handleError(res, error, defaultMessage) {
  console.error(defaultMessage, error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || defaultMessage
  });
}

module.exports = router;
