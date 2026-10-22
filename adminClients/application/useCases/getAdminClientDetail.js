const { AdminClientError } = require('../../domain/errors/AdminClientError');

async function getAdminClientDetail(dependencies, sessionUser, identifier) {
  await dependencies.clientsRepository.resolveAdminContext(sessionUser);
  const clientOverview = await dependencies.clientsRepository.findClientOverview(identifier);

  if (!clientOverview) {
    throw new AdminClientError('No encontramos el cliente solicitado', 404, 'CLIENT_NOT_FOUND');
  }

  const [mascotas, citasRecientes] = await Promise.all([
    dependencies.clientsRepository.listClientPets(clientOverview.id),
    dependencies.clientsRepository.listRecentAppointments(clientOverview.id)
  ]);

  return {
    cliente: {
      ...clientOverview,
      mascotas,
      resumen: {
        mascotasRegistradas: clientOverview.mascotas_registradas,
        citasActivas: clientOverview.citas_activas,
        serviciosRealizados: clientOverview.servicios_realizados,
        ultimaAtencion: clientOverview.ultima_atencion
      },
      citasRecientes
    }
  };
}

module.exports = { getAdminClientDetail };
