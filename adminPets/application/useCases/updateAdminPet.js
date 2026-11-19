const { AdminPetError } = require('../../domain/errors/AdminPetError');

async function updateAdminPet(dependencies, sessionUser, identifier, payload) {
  await dependencies.petsRepository.resolveAdminContext(sessionUser);
  const currentPet = await dependencies.petsRepository.findPetOverview(identifier);

  if (!currentPet) {
    throw new AdminPetError('No encontramos la mascota solicitada', 404, 'PET_NOT_FOUND');
  }

  const normalizedPayload = dependencies.profile.validateAdminPetPayload(
    dependencies.profile.normalizeAdminPetPayload(payload)
  );

  await dependencies.petsRepository.updatePetProfile(currentPet.id, normalizedPayload);
  return dependencies.getAdminPetDetail(sessionUser, currentPet.id);
}

module.exports = { updateAdminPet };
