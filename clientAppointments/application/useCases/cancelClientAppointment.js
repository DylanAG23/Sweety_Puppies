const { AppointmentError } = require('../../domain/errors/AppointmentError');

async function cancelClientAppointment(dependencies, sessionUser, appointmentId) {
  const clientContext = await dependencies.appointmentRepository.resolveClientContext(sessionUser);
  const appointment = await dependencies.appointmentRepository.findOwnedAppointmentById(
    appointmentId,
    clientContext.clientIds
  );

  if (!appointment) {
    throw new AppointmentError('La cita que intentas cancelar no pertenece a tu cuenta', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (!['pendiente', 'confirmada'].includes(appointment.estado)) {
    throw new AppointmentError('Solo puedes cancelar citas pendientes o confirmadas', 400, 'INVALID_STATUS_TRANSITION');
  }

  await dependencies.appointmentRepository.updateAppointmentStatus(appointment.id, 'cancelada');

  return {
    message: 'La cita fue cancelada correctamente'
  };
}

module.exports = { cancelClientAppointment };
