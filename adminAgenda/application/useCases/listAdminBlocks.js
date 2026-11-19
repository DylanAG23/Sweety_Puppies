async function listAdminBlocks(dependencies, sessionUser, query) {
  await dependencies.agendaRepository.resolveAdminContext(sessionUser);
  const fecha = dependencies.presentation.normalizeDateParam(query?.fecha) || dependencies.presentation.getBusinessNow().date;
  const bloqueos = (await dependencies.agendaRepository.listUpcomingBlocks(fecha, 20)).map(
    dependencies.presentation.mapBlockRow
  );

  return {
    fecha,
    bloqueos
  };
}

module.exports = { listAdminBlocks };
