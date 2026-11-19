async function listAdminCompletedServices(dependencies, sessionUser, query) {
  await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const filtros = dependencies.rules.normalizeCompletedServiceFilters(query);
  const servicios = await dependencies.managementRepository.listCompletedServices(filtros);

  return {
    filtros,
    servicios
  };
}

module.exports = { listAdminCompletedServices };
