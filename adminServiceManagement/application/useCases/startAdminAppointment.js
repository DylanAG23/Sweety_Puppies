const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

async function startAdminAppointment(dependencies, sessionUser, identifier) {
  const adminContext = await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.managementRepository.findAppointmentDetail(identifier);

  if (!cita) {
    throw new AdminServiceManagementError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (cita.estado !== 'confirmada') {
    throw new AdminServiceManagementError('Solo puedes iniciar citas que ya esten confirmadas', 400, 'INVALID_STATUS_TRANSITION');
  }

  const startValidation = dependencies.rules.canStartAppointmentNow({
    fecha: cita.fecha,
    horaInicio: cita.horaInicio
  });

  if (!startValidation.allowed) {
    throw new AdminServiceManagementError(
      startValidation.reason || 'La cita no se puede iniciar todavia',
      400,
      'APPOINTMENT_NOT_READY_TO_START'
    );
  }

  const atencionActual = cita.atencion || {};
  await dependencies.managementRepository.updateAppointmentOperationalState(cita.id, adminContext.id, {
    estado: 'en_atencion',
    observacionesAdmin: dependencies.rules.serializeOperationalNotes({
      ...atencionActual,
      estadoPelajeReal: atencionActual.estadoPelajeReal || cita.estadoPelajeReportado || 'normal',
      comportamientoObservado: atencionActual.comportamientoObservado || cita.comportamientoReportado || 'normal',
      servicioAdicionalIds: atencionActual.servicioAdicionalIds || cita.serviciosAdicionales.map((item) => item.id),
      precioCalculadoActualizado: atencionActual.precioCalculadoActualizado ?? cita.precioCalculado,
      precioFinalProvisional: atencionActual.precioFinalProvisional ?? cita.precioFinal ?? cita.precioCalculado
    }),
    precioCalculado: cita.precioCalculado,
    precioFinal: cita.precioFinal ?? cita.precioCalculado
  });

  const actualizada = await dependencies.managementRepository.findAppointmentDetail(cita.id);

  try {
    if (actualizada?.cliente?.email) {
      await dependencies.notificationService.notifyAppointmentStarted({
        email: actualizada.cliente.email,
        appointment: dependencies.emailViewModelBuilder(actualizada)
      });
    }
  } catch (notificationError) {
    console.error('No se pudo notificar el inicio de la cita', notificationError);
  }

  return {
    message: 'La cita ya esta en atencion',
    cita: actualizada
  };
}

module.exports = { startAdminAppointment };
