const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

async function cancelAdminAppointment(dependencies, sessionUser, identifier, payload = {}) {
  const adminContext = await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.managementRepository.findAppointmentDetail(identifier);

  if (!cita) {
    throw new AdminServiceManagementError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (!['pendiente', 'confirmada'].includes(cita.estado)) {
    throw new AdminServiceManagementError(
      'Solo puedes cancelar citas pendientes o confirmadas',
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const cancellationReason = dependencies.rules.normalizeCancellationReason(
    payload?.motivoCancelacion || payload?.motivo_cancelacion || payload?.motivo
  );
  const currentAttention = cita.atencion || {};

  await dependencies.managementRepository.updateAppointmentOperationalState(cita.id, adminContext.id, {
    estado: 'cancelada',
    observacionesAdmin: dependencies.rules.serializeOperationalNotes({
      ...currentAttention,
      cancellationReason,
      cancellationRequestedBy: 'administracion'
    }),
    precioCalculado: cita.precioCalculado,
    precioFinal: cita.precioFinal
  });

  const actualizada = await dependencies.managementRepository.findAppointmentDetail(cita.id);

  try {
    if (actualizada) {
      await dependencies.notificationService.notifyAppointmentCancelled({
        email: actualizada?.cliente?.email || null,
        appointment: dependencies.emailViewModelBuilder(actualizada),
        flowType: cita.estado === 'reprogramada' ? 'reprogramacion' : 'nueva',
        cancellationReason,
        cancelledBy: 'administracion'
      });
    }
  } catch (notificationError) {
    console.error('No se pudo notificar la cancelacion de la cita', notificationError);
  }

  return {
    message: 'La cita fue cancelada correctamente',
    cita: actualizada
  };
}

module.exports = { cancelAdminAppointment };
