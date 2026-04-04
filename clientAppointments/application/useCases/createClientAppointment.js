const {
  buildAppointmentQuote,
  buildAppointmentAvailability
} = require('../services/appointmentPlanner');
const { AppointmentError } = require('../../domain/errors/AppointmentError');

async function createClientAppointment(dependencies, sessionUser, body, files) {
  const clientContext = await dependencies.appointmentRepository.resolveClientContext(sessionUser);
  const payload = dependencies.rules.normalizeAppointmentPayload(body);
  const quote = await buildAppointmentQuote(dependencies, clientContext, payload);

  if (!payload.fecha) {
    throw new AppointmentError('Debes seleccionar una fecha para la cita', 400, 'VALIDATION_ERROR');
  }

  if (!payload.horaInicio) {
    throw new AppointmentError('Debes seleccionar una hora disponible', 400, 'VALIDATION_ERROR');
  }

  const availability = await buildAppointmentAvailability(dependencies, clientContext, {
    ...payload,
    fecha: payload.fecha
  });

  const selectedSlot = availability.slots.find((slot) => slot.horaInicio === payload.horaInicio);

  if (!selectedSlot) {
    throw new AppointmentError('La hora seleccionada ya no esta disponible', 400, 'SLOT_NOT_AVAILABLE');
  }

  const warnings = [];
  let fotoEstadoActualUrl = null;

  if (files?.fotoEstadoActual) {
    try {
      const uploaded = await dependencies.assetStorageService.uploadCurrentStatePhoto(
        files.fotoEstadoActual,
        clientContext.primaryClientId
      );
      fotoEstadoActualUrl = uploaded?.publicUrl || null;
    } catch (error) {
      console.error('No se pudo subir la foto del estado actual:', error);
      warnings.push('No se pudo subir la foto del estado actual por un problema temporal de conexion.');
    }
  }

  const cita = await dependencies.appointmentRepository.runInTransaction(async (db) => {
    const createdAppointment = await dependencies.appointmentRepository.createAppointment(
      {
        clienteId: clientContext.primaryClientId,
        mascotaId: quote.mascota.id,
        servicioId: quote.servicio.id,
        fecha: payload.fecha,
        horaInicio: payload.horaInicio,
        horaFinEstimada: selectedSlot.horaFinEstimada,
        estadoPelajeReportado: quote.estadoPelajeReportado,
        comportamientoReportado: quote.comportamientoReportado,
        fotoEstadoActualUrl,
        observacionesCliente: payload.observacionesCliente,
        precioBase: quote.precioBase,
        precioCalculado: quote.totalEstimado,
        precioFinal: quote.totalEstimado
      },
      db
    );

    for (const adicional of quote.adicionales) {
      await dependencies.appointmentRepository.addAppointmentAdditional(createdAppointment.id, adicional, db);
    }

    return createdAppointment;
  });

  try {
    const notificationAppointment = await dependencies.appointmentRepository.getAppointmentNotificationDetails(cita.id);
    await dependencies.notificationService.sendAppointmentRequest(notificationAppointment, 'nueva');
  } catch (notificationError) {
    console.error('No se pudo notificar a la administradora sobre la nueva cita', notificationError);
  }

  return {
    message: warnings.length
      ? `Cita agendada correctamente y quedo pendiente por confirmacion. ${warnings.join(' ')}`
      : 'Cita agendada correctamente y quedo pendiente por confirmacion',
    cita: {
      ...cita,
      mascotaNombre: quote.mascota.nombre,
      servicioNombre: quote.servicio.nombre,
      precioCalculado: quote.totalEstimado,
      adicionales: quote.adicionales,
      fotoEstadoActualUrl
    },
    warnings
  };
}

module.exports = { createClientAppointment };
