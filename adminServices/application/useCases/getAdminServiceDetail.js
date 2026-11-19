const { AdminServiceError } = require('../../domain/errors/AdminServiceError');

async function getAdminServiceDetail(dependencies, sessionUser, identifier, category = 'principales') {
  await dependencies.servicesRepository.resolveAdminContext(sessionUser);
  const servicio =
    category === 'adicionales'
      ? await dependencies.servicesRepository.findAdditionalServiceById(identifier)
      : await dependencies.servicesRepository.findPrimaryServiceById(identifier);

  if (!servicio) {
    throw new AdminServiceError('No encontramos el servicio solicitado', 404, 'SERVICE_NOT_FOUND');
  }

  return { servicio, categoria: category };
}

module.exports = { getAdminServiceDetail };
