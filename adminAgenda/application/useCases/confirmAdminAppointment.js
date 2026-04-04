const { AdminAgendaError } = require('../../domain/errors/AdminAgendaError');

async function confirmAdminAppointment(dependencies, sessionUser, appointmentId) {
  const adminContext = await dependencies.agendaRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.agendaRepository.findAppointmentDetail(appointmentId);

  if (!cita) {
    throw new AdminAgendaError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (cita.estado !== 'pendiente') {
    throw new AdminAgendaError('Solo puedes confirmar citas que aun estan pendientes', 400, 'INVALID_STATUS_TRANSITION');
  }

  await dependencies.agendaRepository.updateAppointmentToConfirmed(cita.id, adminContext.id);
  const updatedAppointment = await dependencies.agendaRepository.findAppointmentDetail(cita.id);

  try {
    if (updatedAppointment?.cliente?.email) {
      await dependencies.notificationService.notifyAppointmentConfirmed({
        email: updatedAppointment.cliente.email,
        appointment: dependencies.presentation.buildAppointmentEmailViewModel({
          clientName: updatedAppointment.cliente.nombre,
          petName: updatedAppointment.mascota.nombre,
          serviceName: updatedAppointment.servicioPrincipal.nombre,
          fecha: updatedAppointment.fecha,
          horaInicio: updatedAppointment.horaInicio,
          horaFinEstimada: updatedAppointment.horaFinEstimada,
          estadoPelajeReportado: updatedAppointment.estadoPelajeReportado,
          comportamientoReportado: updatedAppointment.comportamientoReportado,
          observacionesCliente: updatedAppointment.observacionesCliente,
          precioCalculado: updatedAppointment.precioCalculado,
          precioFinal: updatedAppointment.precioFinal,
          additionalServices: updatedAppointment.serviciosAdicionales
        }),
        flowType: updatedAppointment.estado === 'reprogramada' ? 'reprogramacion' : 'nueva'
      });
    }
  } catch (notificationError) {
    console.error('No se pudo notificar al cliente desde la agenda administrativa', notificationError);
  }

  return {
    message: 'La cita fue confirmada correctamente',
    cita: updatedAppointment
  };
}

module.exports = { confirmAdminAppointment };
