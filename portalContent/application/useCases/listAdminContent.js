async function listAdminContent(dependencies, sessionUser, query) {
  await dependencies.contentRepository.resolveAdminContext(sessionUser);

  const search = dependencies.catalog.normalizeSearchTerm(query);
  const publicaciones = await dependencies.contentRepository.listContent(search);

  return {
    publicaciones,
    search
  };
}

module.exports = { listAdminContent };
