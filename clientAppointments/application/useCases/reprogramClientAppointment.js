const {
  buildAppointmentAvailability
} = require('../services/appointmentPlanner');
const { AppointmentError } = require('../../domain/errors/AppointmentError');

async function reprogramClientAppointment(dependencies, sessionUser, appointmentId, body) {
  const clientContext = await dependencies.appointmentRepository.resolveClientContext(sessionUser);
  const payload = dependencies.rules.normalizeAppointmentPayload(body);
  const appointment = await dependencies.appointmentRepository.findOwnedAppointmentById(
    appointmentId,
    clientContext.clientIds
  );

  if (!appointment) {
    throw new AppointmentError('La cita que intentas reprogramar no pertenece a tu cuenta', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (!['pendiente', 'confirmada'].includes(appointment.estado)) {
    throw new AppointmentError('Solo puedes reprogramar citas pendientes o confirmadas', 400, 'INVALID_STATUS_TRANSITION');
  }

  if (!payload.fecha) {
    throw new AppointmentError('Debes seleccionar una nueva fecha', 400, 'VALIDATION_ERROR');
  }

  if (!payload.horaInicio) {
    throw new AppointmentError('Debes seleccionar una nueva hora', 400, 'VALIDATION_ERROR');
  }

  const additionalIds = await dependencies.appointmentRepository.listAppointmentAdditionalServiceIds(appointment.id);
  const availability = await buildAppointmentAvailability(dependencies, clientContext, {
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
    throw new AppointmentError(
      'La hora seleccionada ya no esta disponible para reprogramar',
      400,
      'SLOT_NOT_AVAILABLE'
    );
  }

  const cita = await dependencies.appointmentRepository.updateAppointmentScheduleAndStatus(appointment.id, {
    fecha: payload.fecha,
    horaInicio: payload.horaInicio,
    horaFinEstimada: selectedSlot.horaFinEstimada
  });

  try {
    const notificationAppointment = await dependencies.appointmentRepository.getAppointmentNotificationDetails(appointment.id);
    await dependencies.notificationService.sendAppointmentRequest(notificationAppointment, 'reprogramacion', {
      previousDate: appointment.fecha,
      previousTimeStart: appointment.horaInicio,
      previousTimeEnd: appointment.horaFinEstimada
    });
  } catch (notificationError) {
    console.error('No se pudo notificar a la administradora sobre la reprogramacion', notificationError);
  }

  return {
    message: 'La cita fue reprogramada y quedo nuevamente pendiente de confirmacion',
    cita
  };
}

module.exports = { reprogramClientAppointment };
