async function listAdminAppointments(dependencies, sessionUser, query) {
  await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const filtros = dependencies.rules.normalizeAppointmentFilters(query);
  const citas = await dependencies.managementRepository.listAppointments(filtros);

  return {
    filtros,
    citas
  };
}

module.exports = { listAdminAppointments };
