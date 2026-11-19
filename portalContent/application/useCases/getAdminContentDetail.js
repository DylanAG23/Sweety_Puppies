const { PortalContentError } = require('../../domain/errors/PortalContentError');

async function getAdminContentDetail(dependencies, sessionUser, identifier) {
  await dependencies.contentRepository.resolveAdminContext(sessionUser);

  const publicacion = await dependencies.contentRepository.findContentById(identifier);

  if (!publicacion) {
    throw new PortalContentError('No encontramos la publicacion solicitada', 404, 'CONTENT_NOT_FOUND');
  }

  return { publicacion };
}

module.exports = { getAdminContentDetail };
