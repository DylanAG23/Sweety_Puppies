async function uploadOptionalAsset(assetStorageService, file, uploadMethodName, warnings, warningMessage) {
  if (!file) {
    return null;
  }

  try {
    const asset = await assetStorageService[uploadMethodName](file);
    return asset.publicUrl;
  } catch (error) {
    console.warn(warningMessage, error.message);
    warnings.push(warningMessage);
    return null;
  }
}

function buildMessage(baseMessage, warnings) {
  if (!warnings.length) {
    return baseMessage;
  }

  return `${baseMessage}. Algunas imagenes no pudieron subirse en este momento.`;
}

async function updateClientPet(dependencies, sessionUser, petId, payload, files) {
  const context = await dependencies.petRepository.resolveClientContext(sessionUser);
  const currentPet = await dependencies.petRepository.findOwnedPetById(petId, context.clientIds);
  const normalizedPayload = dependencies.validation.validatePetPayload(
    dependencies.validation.normalizePetPayload(payload)
  );
  const warnings = [];

  const uploadedPetPhotoUrl = await uploadOptionalAsset(
    dependencies.assetStorageService,
    files.fotoMascota,
    'uploadPetPhoto',
    warnings,
    'No se pudo subir la foto de la mascota'
  );
  const uploadedVaccinationCardUrl = await uploadOptionalAsset(
    dependencies.assetStorageService,
    files.fotoCarnet,
    'uploadVaccinationCard',
    warnings,
    'No se pudo subir la foto del carnet de vacunacion'
  );

  const nextPetPhotoUrl = uploadedPetPhotoUrl || currentPet.foto_mascota_url;
  const nextVaccinationCardUrl = uploadedVaccinationCardUrl || currentPet.foto_carnet_vacunacion_url;

  const mascota = await dependencies.petRepository.update(petId, {
    ...normalizedPayload,
    foto_mascota_url: nextPetPhotoUrl,
    foto_carnet_vacunacion_url: nextVaccinationCardUrl
  });

  if (uploadedPetPhotoUrl && currentPet.foto_mascota_url) {
    await dependencies.assetStorageService.safeDeleteByPublicUrl(currentPet.foto_mascota_url);
  }

  if (uploadedVaccinationCardUrl && currentPet.foto_carnet_vacunacion_url) {
    await dependencies.assetStorageService.safeDeleteByPublicUrl(currentPet.foto_carnet_vacunacion_url);
  }

  return {
    message: buildMessage('Mascota actualizada correctamente', warnings),
    mascota,
    warnings
  };
}

module.exports = { updateClientPet };
