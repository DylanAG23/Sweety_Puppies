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

async function createClientPet(dependencies, sessionUser, payload, files) {
  const context = await dependencies.petRepository.resolveClientContext(sessionUser);
  const normalizedPayload = dependencies.validation.validatePetPayload(
    dependencies.validation.normalizePetPayload(payload)
  );
  const warnings = [];

  const fotoMascotaUrl = await uploadOptionalAsset(
    dependencies.assetStorageService,
    files.fotoMascota,
    'uploadPetPhoto',
    warnings,
    'No se pudo subir la foto de la mascota'
  );
  const fotoCarnetUrl = await uploadOptionalAsset(
    dependencies.assetStorageService,
    files.fotoCarnet,
    'uploadVaccinationCard',
    warnings,
    'No se pudo subir la foto del carnet de vacunacion'
  );

  const mascota = await dependencies.petRepository.create({
    ...normalizedPayload,
    clienteId: context.primaryClientId,
    foto_mascota_url: fotoMascotaUrl,
    foto_carnet_vacunacion_url: fotoCarnetUrl
  });

  return {
    message: buildMessage('Mascota registrada correctamente', warnings),
    mascota,
    warnings
  };
}

module.exports = { createClientPet };
