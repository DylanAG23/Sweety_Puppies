const { AdminServiceError } = require('../../domain/errors/AdminServiceError');

async function changeAdminServiceStatus(dependencies, sessionUser, identifier, payload, category = 'principales') {
  await dependencies.servicesRepository.resolveAdminContext(sessionUser);
  const normalized = dependencies.catalog.normalizeStatusPayload(payload);

  if (category === 'adicionales') {
    const existingService = await dependencies.servicesRepository.findAdditionalServiceById(identifier);
    if (!existingService) {
      throw new AdminServiceError('No encontramos el servicio adicional solicitado', 404, 'ADDITIONAL_SERVICE_NOT_FOUND');
    }

    const servicio = await dependencies.servicesRepository.updateAdditionalServiceStatus(existingService.id, normalized.activo);
    return { servicio, categoria: 'adicionales' };
  }

  const existingService = await dependencies.servicesRepository.findPrimaryServiceById(identifier);
  if (!existingService) {
    throw new AdminServiceError('No encontramos el servicio solicitado', 404, 'SERVICE_NOT_FOUND');
  }

  const servicio = await dependencies.servicesRepository.updatePrimaryServiceStatus(existingService.id, normalized.activo);
  return { servicio, categoria: 'principales' };
}

module.exports = { changeAdminServiceStatus };
