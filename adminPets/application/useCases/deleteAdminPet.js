const { AdminPetError } = require('../../domain/errors/AdminPetError');

// Solo la administradora elimina mascotas, y de forma definitiva solo si no
// tienen citas ni historial: borrarlas dejaria reportes e historiales sin su
// mascota. En ese caso se sugiere desactivarla (misma regla que ACT-15 fija
// para productos con pedidos o movimientos).
async function deleteAdminPet(dependencies, sessionUser, identifier) {
  await dependencies.petsRepository.resolveAdminContext(sessionUser);
  const mascota = await dependencies.petsRepository.findPetOverview(identifier);

  if (!mascota) {
    throw new AdminPetError('No encontramos la mascota solicitada', 404, 'PET_NOT_FOUND');
  }

  const references = await dependencies.petsRepository.countPetReferences(mascota.id);
  const totalCitas = Number(references?.citas || 0);
  const totalHistorial = Number(references?.historial || 0);

  if (totalCitas > 0 || totalHistorial > 0) {
    throw new AdminPetError(
      `${mascota.nombre} tiene ${totalCitas} cita(s) registradas, por eso no se puede eliminar sin perder su historial. Puedes desactivarla para ocultarla.`,
      409,
      'PET_HAS_HISTORY'
    );
  }

  const deleted = await dependencies.petsRepository.deletePet(mascota.id);

  if (!deleted) {
    throw new AdminPetError('No encontramos la mascota solicitada', 404, 'PET_NOT_FOUND');
  }

  // Las fotos se borran despues; si falla, la mascota ya no existe y solo
  // queda un archivo huerfano en el almacenamiento.
  await dependencies.assetStorageService.safeDeleteByPublicUrl(mascota.foto_mascota_url);
  await dependencies.assetStorageService.safeDeleteByPublicUrl(mascota.foto_carnet_vacunacion_url);

  return {
    message: `${mascota.nombre} se elimino correctamente`,
    mascotaId: mascota.id
  };
}

module.exports = { deleteAdminPet };
