const { AppointmentError } = require('../../domain/errors/AppointmentError');

async function processAdminAppointmentDecision(dependencies, token, decision) {
  if (!['confirmada', 'cancelada'].includes(decision)) {
    throw new AppointmentError('La decision solicitada no es compatible con la agenda.', 400, 'INVALID_DECISION');
  }

  const payload = dependencies.notificationService.verifyActionToken(token);
  const appointment = await dependencies.appointmentRepository.getAppointmentNotificationDetails(payload.citaId);

  if (!appointment) {
    throw new AppointmentError('No encontramos la solicitud que intentabas actualizar.', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (appointment.estado !== 'pendiente') {
    return {
      status: 200,
      html: dependencies.reviewPageRenderer.render({
        title: 'Esta cita ya fue atendida',
        message: `La cita ya se encuentra en estado ${dependencies.rules.formatStatusLabel(appointment.estado)}.`,
        appointment
      })
    };
  }

  const administratorId = await dependencies.appointmentRepository.findPrimaryAdministratorIdByEmail(
    dependencies.notificationService.getAdministrativeEmail()
  );

  await dependencies.appointmentRepository.persistAdminDecision(appointment.id, decision, administratorId);
  const updatedAppointment = await dependencies.appointmentRepository.getAppointmentNotificationDetails(appointment.id);

  try {
    await dependencies.notificationService.sendAppointmentStatusChange(updatedAppointment, decision, payload.flowType);
  } catch (notificationError) {
    console.error('No se pudo notificar al cliente sobre el cambio de estado de la cita', notificationError);
  }

  return {
    status: 200,
    html: dependencies.reviewPageRenderer.render({
      title:
        decision === 'confirmada'
          ? payload.flowType === 'reprogramacion'
            ? 'Reprogramacion confirmada correctamente'
            : 'Cita confirmada correctamente'
          : payload.flowType === 'reprogramacion'
            ? 'Reprogramacion cancelada correctamente'
            : 'Cita cancelada correctamente',
      message:
        decision === 'confirmada'
          ? payload.flowType === 'reprogramacion'
            ? 'La cliente ya recibio o recibira un correo informando que Sweety Puppies acepto y confirmo la reprogramacion.'
            : 'La cliente ya recibio o recibira un correo informando que su cita fue confirmada por Sweety Puppies.'
          : payload.flowType === 'reprogramacion'
            ? 'La cliente ya recibio o recibira un correo informando que la reprogramacion fue cancelada.'
            : 'La cliente ya recibio o recibira un correo informando que la cita fue cancelada.',
      appointment: updatedAppointment
    })
  };
}

module.exports = { processAdminAppointmentDecision };
