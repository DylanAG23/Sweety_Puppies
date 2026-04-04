const { HistoryError } = require('../../domain/errors/HistoryError');

async function getClientCurrentAppointmentDetail(dependencies, sessionUser, appointmentId) {
  const clientContext = await dependencies.historyRepository.resolveClientContext(sessionUser);
  const appointment = await dependencies.historyRepository.findCurrentAppointmentDetail(
    appointmentId,
    clientContext.clientIds
  );

  if (!appointment) {
    throw new HistoryError('La cita solicitada no pertenece a tu cuenta o ya no esta activa', 404, 'APPOINTMENT_NOT_FOUND');
  }

  return {
    cita: {
      ...appointment,
      mensajeEstado: dependencies.presentation.getAppointmentStatusMessage(appointment.estado)
    }
  };
}

module.exports = { getClientCurrentAppointmentDetail };
