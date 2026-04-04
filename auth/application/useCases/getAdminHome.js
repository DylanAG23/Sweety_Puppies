const { AuthError } = require('../../domain/errors/AuthError');

async function getAdminHome(dependencies, sessionUser) {
  const { authRepository } = dependencies;

  const profile = await authRepository.resolveAdminProfileForSession({
    userId: sessionUser.sub,
    preferredAdminId: sessionUser.administradorId || null
  });

  if (!profile) {
    throw new AuthError('No se encontro el perfil del administrador autenticado', 404);
  }

  const summary = await authRepository.findAdminSummary();

  return {
    profile,
    summary,
    about: {
      title: 'Centro de control de Sweety Puppies',
      description:
        'Desde aqui puedes revisar la operacion diaria del negocio, atender solicitudes y acceder a los modulos principales del ERP con una vista clara y amorosa.',
      note: 'Un espacio operativo, ordenado y bonito para el cuidado de cada familia peludita.'
    }
  };
}

module.exports = { getAdminHome };
