const { AuthError } = require('../../domain/errors/AuthError');

async function getClientProfile(dependencies, sessionUser) {
  const { authRepository } = dependencies;

  const profile = await authRepository.resolveClientProfileForSession({
    userId: sessionUser.sub,
    preferredClientId: sessionUser.clienteId || null
  });

  if (!profile) {
    throw new AuthError('Cliente no encontrado', 404);
  }

  return { profile };
}

module.exports = { getClientProfile };
