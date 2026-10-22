const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

async function confirmAdminAppointment(dependencies, sessionUser, identifier) {
  const adminContext = await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.managementRepository.findAppointmentDetail(identifier);

  if (!cita) {
    throw new AdminServiceManagementError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (cita.estado !== 'pendiente') {
    throw new AdminServiceManagementError('Solo puedes confirmar citas pendientes', 400, 'INVALID_STATUS_TRANSITION');
  }

  await dependencies.managementRepository.updateAppointmentOperationalState(cita.id, adminContext.id, {
    estado: 'confirmada',
    observacionesAdmin: cita.observacionesAdminRaw,
    precioCalculado: cita.precioCalculado,
    precioFinal: cita.precioFinal
  });

  const actualizada = await dependencies.managementRepository.findAppointmentDetail(cita.id);

  try {
    if (actualizada?.cliente?.email) {
      await dependencies.notificationService.notifyAppointmentConfirmed({
        email: actualizada.cliente.email,
        appointment: dependencies.emailViewModelBuilder(actualizada),
        flowType: cita.estado === 'reprogramada' ? 'reprogramacion' : 'nueva'
      });
    }
  } catch (notificationError) {
    console.error('No se pudo notificar la confirmacion de la cita', notificationError);
  }

  return {
    message: 'La cita fue confirmada correctamente',
    cita: actualizada
  };
}

module.exports = { confirmAdminAppointment };
