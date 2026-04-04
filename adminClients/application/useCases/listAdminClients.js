async function listAdminClients(dependencies, sessionUser, query) {
  await dependencies.clientsRepository.resolveAdminContext(sessionUser);
  const search = dependencies.search.normalizeSearchTerm(query?.search);
  const clients = await dependencies.clientsRepository.listClients(search);

  return {
    clientes: clients,
    search
  };
}

module.exports = { listAdminClients };
