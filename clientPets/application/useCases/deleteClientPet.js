async function deleteClientPet(dependencies, sessionUser, petId) {
  const context = await dependencies.petRepository.resolveClientContext(sessionUser);
  const mascota = await dependencies.petRepository.findOwnedPetById(petId, context.clientIds);

  await dependencies.petRepository.delete(petId);

  await dependencies.assetStorageService.safeDeleteByPublicUrl(mascota.foto_mascota_url);
  await dependencies.assetStorageService.safeDeleteByPublicUrl(mascota.foto_carnet_vacunacion_url);

  return {
    message: 'Mascota eliminada correctamente'
  };
}

module.exports = { deleteClientPet };
