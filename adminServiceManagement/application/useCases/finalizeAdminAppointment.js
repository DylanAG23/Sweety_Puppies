const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

async function finalizeAdminAppointment(dependencies, sessionUser, identifier, payload) {
  const adminContext = await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.managementRepository.findAppointmentDetail(identifier);

  if (!cita) {
    throw new AdminServiceManagementError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (cita.estado !== 'en_atencion') {
    throw new AdminServiceManagementError('Solo puedes finalizar citas que esten en atencion', 400, 'INVALID_STATUS_TRANSITION');
  }

  const existingHistory = await dependencies.managementRepository.findHistoryByAppointmentId(cita.id);
  if (existingHistory) {
    throw new AdminServiceManagementError('Esta cita ya fue finalizada anteriormente', 400, 'HISTORY_ALREADY_EXISTS');
  }

  const normalized = dependencies.rules.normalizeFinalizePayload(payload);
  const attention = cita.atencion || {};
  const estadoPelajeReal = attention.estadoPelajeReal || cita.estadoPelajeReportado || 'normal';
  const comportamientoObservado = attention.comportamientoObservado || cita.comportamientoReportado || 'normal';
  const observacionesDuranteServicio = attention.observacionesDuranteServicio || null;
  const resumenServicioRealizado =
    attention.resumenServicioRealizado ||
    observacionesDuranteServicio ||
    normalized.observacionesFinales ||
    'Servicio realizado en Sweety Puppies';
  const precioCalculado = attention.precioCalculadoActualizado ?? cita.precioCalculado ?? cita.precioBase ?? 0;
  const precioFinal = attention.precioFinalProvisional ?? cita.precioFinal ?? precioCalculado;

  const mergedAttention = {
    ...attention,
    estadoPelajeReal,
    comportamientoObservado,
    observacionesDuranteServicio,
    servicioAdicionalIds: attention.servicioAdicionalIds || cita.serviciosAdicionales.map((item) => item.id),
    precioCalculadoActualizado: precioCalculado,
    precioFinalProvisional: precioFinal,
    observacionesFinales: normalized.observacionesFinales,
    recomendaciones: normalized.recomendaciones,
    resumenServicioRealizado
  };

  const observacionesAdmin = dependencies.rules.serializeOperationalNotes(mergedAttention);
  const serviciosAdicionalesResumen = dependencies.rules.buildAdditionalSummary(cita.serviciosAdicionales);
  const fechaServicioDate = dependencies.rules.normalizeDatePortion(cita.fecha);
  const horaServicio = String(cita.horaInicio || '00:00:00').slice(0, 8);

  if (!fechaServicioDate) {
    throw new AdminServiceManagementError(
      'No pudimos interpretar la fecha de la cita para generar el historial',
      500,
      'INVALID_APPOINTMENT_DATE'
    );
  }

  await dependencies.managementRepository.runInTransaction(async (db) => {
    await dependencies.managementRepository.updateAppointmentOperationalState(
      cita.id,
      adminContext.id,
      {
        estado: 'completada',
        observacionesAdmin,
        precioCalculado,
        precioFinal
      },
      db
    );

    await dependencies.managementRepository.createHistoryEntry(
      {
        citaId: cita.id,
        clienteId: cita.cliente.id,
        mascotaId: cita.mascota.id,
        fechaServicio: `${fechaServicioDate}T${horaServicio}`,
        clienteNombreCompleto: cita.cliente.nombre,
        clienteEmail: cita.cliente.email,
        clienteTelefono: cita.cliente.telefono,
        mascotaNombre: cita.mascota.nombre,
        mascotaRaza: cita.mascota.raza,
        mascotaTamano: cita.mascota.tamano,
        mascotaTipoPelaje: cita.mascota.tipoPelaje,
        servicioPrincipalNombre: cita.servicioPrincipal.nombre,
        serviciosAdicionalesResumen,
        resumenServicioRealizado,
        estadoPelajeReal,
        comportamientoObservado,
        observacionesFinales: normalized.observacionesFinales,
        recomendaciones: normalized.recomendaciones,
        precioBase: cita.precioBase,
        precioCalculado,
        precioFinal
      },
      db
    );
  });

  const actualizada = await dependencies.managementRepository.findAppointmentDetail(cita.id);

  try {
    if (actualizada?.cliente?.email) {
      await dependencies.notificationService.notifyAppointmentCompleted({
        email: actualizada.cliente.email,
        appointment: dependencies.emailViewModelBuilder(actualizada)
      });
    }
  } catch (notificationError) {
    console.error('No se pudo notificar la finalizacion de la cita', notificationError);
  }

  return {
    message: 'La cita fue finalizada y ya hace parte de los servicios realizados',
    cita: actualizada
  };
}

module.exports = { finalizeAdminAppointment };
