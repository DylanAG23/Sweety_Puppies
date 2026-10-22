const { validateBlockCreation } = require('../services/adminAgendaPlanner');

async function createAdminBlock(dependencies, sessionUser, body) {
  const adminContext = await dependencies.agendaRepository.resolveAdminContext(sessionUser);
  const payload = dependencies.presentation.normalizeBlockPayload(body);
  const { fecha } = await validateBlockCreation(dependencies, payload);

  const bloqueo = await dependencies.agendaRepository.createBlock({
    adminId: adminContext.id,
    fecha,
    horaInicio: payload.horaInicio,
    horaFin: payload.horaFin,
    motivo: payload.motivo
  });

  return {
    message: 'El bloqueo fue creado correctamente',
    bloqueo: dependencies.presentation.mapBlockRow(bloqueo)
  };
}

module.exports = { createAdminBlock };
