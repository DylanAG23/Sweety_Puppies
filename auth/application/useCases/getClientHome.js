const { AuthError } = require('../../domain/errors/AuthError');

async function getClientHome(dependencies, sessionUser) {
  const { authRepository } = dependencies;

  const profile = await authRepository.resolveClientProfileForSession({
    userId: sessionUser.sub,
    preferredClientId: sessionUser.clienteId || null
  });

  if (!profile) {
    throw new AuthError('Cliente no encontrado', 404);
  }

  const [images, summary] = await Promise.all([
    authRepository.findActiveImages(),
    authRepository.findClientSummaryByUserId(sessionUser.sub)
  ]);

  return {
    profile,
    about: {
      title: 'Sobre Sweety Puppies',
      description:
        'Somos un espacio creado para consentir a cada peludito con cuidado profesional, mucho cariño y una experiencia tranquila para sus familias.',
      location: 'Ubicación por confirmar en el módulo informativo del negocio',
      note: 'Tu portal te ayudará a gestionar mascotas, citas y el seguimiento de sus servicios.'
    },
    images,
    summary,
    quickLinks: [
      { title: 'Mis mascotas', href: '/cliente/mascotas', description: 'Consulta y administra el perfil de tus peluditos.' },
      { title: 'Agendar cita', href: '/cliente/citas/nueva', description: 'Prepara la próxima visita con una experiencia simple.' },
      { title: 'Historial de servicios', href: '/cliente/historial', description: 'Revisa baños, cortes y recomendaciones anteriores.' },
      { title: 'Mi perfil', href: '/cliente/perfil', description: 'Mantén al día tus datos personales y de contacto.' }
    ]
  };
}

module.exports = { getClientHome };
