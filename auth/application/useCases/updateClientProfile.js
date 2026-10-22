const { AuthError } = require('../../domain/errors/AuthError');

async function updateClientProfile(dependencies, sessionUser, payload) {
  const { authRepository } = dependencies;

  const telefono = String(payload?.telefono || '').trim();
  const direccionValue = String(payload?.direccion || '').trim();
  const direccion = direccionValue || null;

  if (!telefono) {
    throw new AuthError('El telefono es obligatorio', 400);
  }

  if (telefono.length < 7 || telefono.length > 20) {
    throw new AuthError('El telefono debe tener entre 7 y 20 caracteres', 400);
  }

  if (direccion && direccion.length > 180) {
    throw new AuthError('La direccion no puede superar los 180 caracteres', 400);
  }

  const updatedProfile = await authRepository.updateClientProfileByUserId(sessionUser.sub, {
    telefono,
    direccion,
    preferredClientId: sessionUser.clienteId || null
  });

  if (!updatedProfile) {
    throw new AuthError('Cliente no encontrado', 404);
  }

  return {
    message: 'Perfil actualizado correctamente',
    profile: updatedProfile
  };
}

module.exports = { updateClientProfile };
