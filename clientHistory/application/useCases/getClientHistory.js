async function getClientHistory(dependencies, sessionUser) {
  const clientContext = await dependencies.historyRepository.resolveClientContext(sessionUser);
  const [currentAppointments, completedServices] = await Promise.all([
    dependencies.historyRepository.listCurrentAppointments(clientContext.clientIds),
    dependencies.historyRepository.listCompletedServices(clientContext.clientIds)
  ]);

  return {
    citasActuales: currentAppointments,
    serviciosRealizados: completedServices,
    mascotas: dependencies.presentation.buildPetOptions(currentAppointments, completedServices)
  };
}

module.exports = { getClientHistory };
