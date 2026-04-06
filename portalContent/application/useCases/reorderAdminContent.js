async function reorderAdminContent(dependencies, sessionUser, payload) {
  await dependencies.contentRepository.resolveAdminContext(sessionUser);

  const items = dependencies.catalog.normalizeReorderPayload(payload);
  await dependencies.contentRepository.reorderContent(items);

  const publicaciones = await dependencies.contentRepository.listContent('');
  return { publicaciones };
}

module.exports = { reorderAdminContent };
