async function createAdminContent(dependencies, sessionUser, payload, imageFile) {
  await dependencies.contentRepository.resolveAdminContext(sessionUser);

  if (!imageFile) {
    throw new dependencies.errors.PortalContentError(
      'Debes adjuntar una imagen para crear la publicacion',
      400,
      'IMAGE_REQUIRED'
    );
  }

  const normalized = dependencies.catalog.normalizeCreatePayload(payload);
  await dependencies.contentRepository.ensureTitleAvailable(normalized.titulo);

  let uploadedImage = null;

  try {
    uploadedImage = await dependencies.storageService.uploadPublicationImage(imageFile);

    const publicacion = await dependencies.contentRepository.createContent({
      ...normalized,
      ruta: uploadedImage.publicUrl
    });

    return { publicacion };
  } catch (error) {
    if (uploadedImage?.publicUrl) {
      await dependencies.storageService.safeDeleteByPublicUrl(uploadedImage.publicUrl);
    }

    throw error;
  }
}

module.exports = { createAdminContent };
