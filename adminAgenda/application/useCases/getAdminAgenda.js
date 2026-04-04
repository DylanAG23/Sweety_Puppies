const { buildAdminAgenda } = require('../services/adminAgendaPlanner');

async function getAdminAgenda(dependencies, sessionUser, query) {
  const fecha = dependencies.presentation.normalizeDateParam(query?.fecha) || dependencies.presentation.getBusinessNow().date;
  const vista = dependencies.presentation.normalizeViewMode(query?.vista);

  await dependencies.agendaRepository.resolveAdminContext(sessionUser);

  return buildAdminAgenda(dependencies, fecha, vista);
}

module.exports = { getAdminAgenda };
