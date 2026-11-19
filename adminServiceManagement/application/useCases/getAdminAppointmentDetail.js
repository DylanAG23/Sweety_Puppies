const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

async function getAdminAppointmentDetail(dependencies, sessionUser, identifier) {
  await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.managementRepository.findAppointmentDetail(identifier);

  if (!cita) {
    throw new AdminServiceManagementError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  return { cita };
}

module.exports = { getAdminAppointmentDetail };
