async function getClientPet(dependencies, sessionUser, petId) {
  const context = await dependencies.petRepository.resolveClientContext(sessionUser);
  const mascota = await dependencies.petRepository.findOwnedPetById(petId, context.clientIds);

  return { mascota };
}

module.exports = { getClientPet };
