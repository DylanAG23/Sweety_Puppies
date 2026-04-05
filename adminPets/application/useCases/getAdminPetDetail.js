const { AdminPetError } = require('../../domain/errors/AdminPetError');

async function getAdminPetDetail(dependencies, sessionUser, identifier) {
  await dependencies.petsRepository.resolveAdminContext(sessionUser);
  const mascota = await dependencies.petsRepository.findPetOverview(identifier);

  if (!mascota) {
    throw new AdminPetError('No encontramos la mascota solicitada', 404, 'PET_NOT_FOUND');
  }

  return {
    mascota
  };
}

module.exports = { getAdminPetDetail };
