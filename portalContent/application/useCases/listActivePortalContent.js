async function listActivePortalContent(dependencies) {
  const publicaciones = await dependencies.contentRepository.listActiveContent();
  return { publicaciones };
}

module.exports = { listActivePortalContent };
