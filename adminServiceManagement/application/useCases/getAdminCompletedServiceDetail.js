const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

async function getAdminCompletedServiceDetail(dependencies, sessionUser, identifier) {
  await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const servicio = await dependencies.managementRepository.findCompletedServiceDetail(identifier);

  if (!servicio) {
    throw new AdminServiceManagementError(
      'No encontramos el servicio realizado solicitado',
      404,
      'COMPLETED_SERVICE_NOT_FOUND'
    );
  }

  return { servicio };
}

module.exports = { getAdminCompletedServiceDetail };
