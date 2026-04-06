const { PortalContentError } = require('../../domain/errors/PortalContentError');

async function changeAdminContentStatus(dependencies, sessionUser, identifier, payload) {
  await dependencies.contentRepository.resolveAdminContext(sessionUser);

  const currentContent = await dependencies.contentRepository.findContentById(identifier);

  if (!currentContent) {
    throw new PortalContentError('No encontramos la publicacion solicitada', 404, 'CONTENT_NOT_FOUND');
  }

  const normalized = dependencies.catalog.normalizeStatusPayload(payload);
  const publicacion = await dependencies.contentRepository.updateContentStatus(currentContent.id, normalized.activo);

  return { publicacion };
}

module.exports = { changeAdminContentStatus };
