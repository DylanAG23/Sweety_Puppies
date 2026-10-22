const { AppointmentError } = require('../../domain/errors/AppointmentError');

async function cancelClientAppointment(dependencies, sessionUser, appointmentId, payload = {}) {
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

  const cancellationReason = dependencies.rules.normalizeCancellationReason(
    payload?.motivoCancelacion || payload?.motivo_cancelacion || payload?.motivo
  );
  const currentNotes = dependencies.rules.parseAppointmentAdminNotes(appointment.observacionesAdminRaw);

  await dependencies.appointmentRepository.updateAppointmentStatus(appointment.id, 'cancelada', {
    observacionesAdmin: dependencies.rules.serializeAppointmentAdminNotes({
      ...currentNotes,
      cancellationReason,
      cancellationRequestedBy: 'cliente'
    })
  });

  const notificationAppointment = await dependencies.appointmentRepository.getAppointmentNotificationDetails(appointment.id);

  try {
    if (notificationAppointment) {
      await dependencies.notificationService.sendAppointmentCancellationNotifications(notificationAppointment, {
        cancellationReason,
        cancelledBy: 'cliente',
        flowType: appointment.estado === 'reprogramada' ? 'reprogramacion' : 'nueva'
      });
    }
  } catch (notificationError) {
    console.error('No se pudo notificar la cancelacion de la cita del cliente', notificationError);
  }

  return {
    message: 'La cita fue cancelada correctamente'
  };
}

module.exports = { cancelClientAppointment };
