async function listAdminServices(dependencies, sessionUser, query, category = 'principales') {
  await dependencies.servicesRepository.resolveAdminContext(sessionUser);
  const search = dependencies.catalog.normalizeSearchTerm(query);

  if (category === 'adicionales') {
    const servicios = await dependencies.servicesRepository.listAdditionalServices(search);
    return { servicios, search, categoria: 'adicionales' };
  }

  const servicios = await dependencies.servicesRepository.listPrimaryServices(search);
  return {
    servicios,
    search,
    categoria: 'principales'
  };
}

module.exports = { listAdminServices };
