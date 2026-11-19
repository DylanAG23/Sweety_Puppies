const { AdminServiceError } = require('../../domain/errors/AdminServiceError');

async function updateAdminService(dependencies, sessionUser, identifier, payload, category = 'principales') {
  await dependencies.servicesRepository.resolveAdminContext(sessionUser);

  if (category === 'adicionales') {
    const existingService = await dependencies.servicesRepository.findAdditionalServiceById(identifier);
    if (!existingService) {
      throw new AdminServiceError('No encontramos el servicio adicional solicitado', 404, 'ADDITIONAL_SERVICE_NOT_FOUND');
    }

    const normalized = dependencies.catalog.normalizeAdditionalServicePayload({
      ...existingService,
      ...payload
    });
    await dependencies.servicesRepository.ensureAdditionalServiceNameAvailable(normalized.nombre, existingService.id);
    const servicio = await dependencies.servicesRepository.updateAdditionalService(existingService.id, normalized);
    return { servicio, categoria: 'adicionales' };
  }

  const existingService = await dependencies.servicesRepository.findPrimaryServiceById(identifier);
  if (!existingService) {
    throw new AdminServiceError('No encontramos el servicio solicitado', 404, 'SERVICE_NOT_FOUND');
  }

  const normalized = dependencies.catalog.normalizePrimaryServicePayload({
    ...existingService,
    ...payload
  });
  await dependencies.servicesRepository.ensurePrimaryServiceNameAvailable(normalized.nombre, existingService.id);
  const servicio = await dependencies.servicesRepository.updatePrimaryService(existingService.id, normalized);
  return { servicio, categoria: 'principales' };
}

module.exports = { updateAdminService };
