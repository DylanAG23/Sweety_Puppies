async function getAdminAppointmentReview(dependencies, token) {
  const payload = dependencies.notificationService.verifyActionToken(token);
  const appointment = await dependencies.appointmentRepository.getAppointmentNotificationDetails(payload.citaId);

  if (!appointment) {
    return {
      status: 404,
      html: dependencies.reviewPageRenderer.render({
        title: 'La cita ya no esta disponible',
        message: 'No encontramos la solicitud asociada a este enlace.',
        appointment: null
      })
    };
  }

  return {
    status: 200,
    html: dependencies.reviewPageRenderer.render({
      title:
        appointment.estado === 'pendiente'
          ? payload.flowType === 'reprogramacion'
            ? 'Revisa la solicitud de reprogramacion'
            : 'Revisa la nueva solicitud de cita'
          : 'Esta cita ya fue atendida',
      message:
        appointment.estado === 'pendiente'
          ? payload.flowType === 'reprogramacion'
            ? 'Puedes confirmar o cancelar esta reprogramacion desde aqui.'
            : 'Puedes confirmar o cancelar esta solicitud desde aqui.'
          : `La cita ya se encuentra en estado ${dependencies.rules.formatStatusLabel(appointment.estado)}.`,
      appointment,
      token
    })
  };
}

module.exports = { getAdminAppointmentReview };
