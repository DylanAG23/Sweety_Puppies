async function createAdminService(dependencies, sessionUser, payload, category = 'principales') {
  await dependencies.servicesRepository.resolveAdminContext(sessionUser);

  if (category === 'adicionales') {
    const normalized = dependencies.catalog.normalizeAdditionalServicePayload(payload);
    await dependencies.servicesRepository.ensureAdditionalServiceNameAvailable(normalized.nombre);
    const servicio = await dependencies.servicesRepository.createAdditionalService(normalized);
    return { servicio, categoria: 'adicionales' };
  }

  const normalized = dependencies.catalog.normalizePrimaryServicePayload(payload);
  await dependencies.servicesRepository.ensurePrimaryServiceNameAvailable(normalized.nombre);
  const servicio = await dependencies.servicesRepository.createPrimaryService(normalized);
  return { servicio, categoria: 'principales' };
}

module.exports = { createAdminService };
