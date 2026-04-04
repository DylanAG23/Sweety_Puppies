const { PetError } = require('../../domain/errors/PetError');

async function updateClientPetStatus(dependencies, sessionUser, petId, activo) {
  if (typeof activo !== 'boolean') {
    throw new PetError('Debes indicar si la mascota debe quedar activa o inactiva', 400, 'VALIDATION_ERROR');
  }

  const context = await dependencies.petRepository.resolveClientContext(sessionUser);
  await dependencies.petRepository.findOwnedPetById(petId, context.clientIds);
  const mascota = await dependencies.petRepository.updateStatus(petId, activo);

  return {
    message: activo ? 'Mascota activada correctamente' : 'Mascota desactivada correctamente',
    mascota
  };
}

module.exports = { updateClientPetStatus };
