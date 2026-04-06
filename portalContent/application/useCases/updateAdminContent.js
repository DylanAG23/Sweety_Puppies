const { PortalContentError } = require('../../domain/errors/PortalContentError');

async function updateAdminContent(dependencies, sessionUser, identifier, payload, imageFile) {
  await dependencies.contentRepository.resolveAdminContext(sessionUser);

  const currentContent = await dependencies.contentRepository.findContentById(identifier);

  if (!currentContent) {
    throw new PortalContentError('No encontramos la publicacion solicitada', 404, 'CONTENT_NOT_FOUND');
  }

  const normalized = dependencies.catalog.normalizeUpdatePayload(payload, currentContent);
  await dependencies.contentRepository.ensureTitleAvailable(normalized.titulo, currentContent.id);

  let uploadedImage = null;

  try {
    if (imageFile) {
      uploadedImage = await dependencies.storageService.uploadPublicationImage(imageFile);
      normalized.ruta = uploadedImage.publicUrl;
    }

    const publicacion = await dependencies.contentRepository.updateContent(currentContent.id, normalized);

    if (uploadedImage?.publicUrl && currentContent.ruta && currentContent.ruta !== uploadedImage.publicUrl) {
      await dependencies.storageService.safeDeleteByPublicUrl(currentContent.ruta);
    }

    return { publicacion };
  } catch (error) {
    if (uploadedImage?.publicUrl) {
      await dependencies.storageService.safeDeleteByPublicUrl(uploadedImage.publicUrl);
    }

    throw error;
  }
}

module.exports = { updateAdminContent };
