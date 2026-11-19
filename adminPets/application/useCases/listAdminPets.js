async function listAdminPets(dependencies, sessionUser, query) {
  await dependencies.petsRepository.resolveAdminContext(sessionUser);
  const search = dependencies.search.normalizeSearchTerm(query?.search);
  const mascotas = await dependencies.petsRepository.listPets(search);

  return {
    mascotas,
    search
  };
}

module.exports = { listAdminPets };
