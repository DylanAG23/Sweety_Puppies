const { AdminAgendaError } = require('../../domain/errors/AdminAgendaError');

async function deactivateAdminBlock(dependencies, sessionUser, blockId) {
  await dependencies.agendaRepository.resolveAdminContext(sessionUser);
  const updated = await dependencies.agendaRepository.deactivateBlock(blockId);

  if (!updated) {
    throw new AdminAgendaError(
      'No encontramos el bloqueo activo que intentas desactivar',
      404,
      'BLOCK_NOT_FOUND'
    );
  }

  return {
    message: 'El bloqueo fue desactivado correctamente'
  };
}

module.exports = { deactivateAdminBlock };
