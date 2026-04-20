async function deleteClientPet(dependencies, sessionUser, petId) {
  const context = await dependencies.petRepository.resolveClientContext(sessionUser);
  await dependencies.petRepository.findOwnedPetById(petId, context.clientIds);

  await dependencies.petRepository.delete(petId);

  return {
    message: 'Mascota retirada del portal correctamente'
  };
}

module.exports = { deleteClientPet };
