const { AdminAgendaError } = require('../../domain/errors/AdminAgendaError');

async function getAdminAppointmentDetail(dependencies, sessionUser, appointmentId) {
  await dependencies.agendaRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.agendaRepository.findAppointmentDetail(appointmentId);

  if (!cita) {
    throw new AdminAgendaError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  return { cita };
}

module.exports = { getAdminAppointmentDetail };
