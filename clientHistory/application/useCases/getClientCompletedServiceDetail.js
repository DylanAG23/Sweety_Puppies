const { HistoryError } = require('../../domain/errors/HistoryError');

async function getClientCompletedServiceDetail(dependencies, sessionUser, historyId) {
  const clientContext = await dependencies.historyRepository.resolveClientContext(sessionUser);
  const servicio = await dependencies.historyRepository.findCompletedServiceDetail(historyId, clientContext.clientIds);

  if (!servicio) {
    throw new HistoryError('El servicio solicitado no pertenece a tu historial', 404, 'SERVICE_HISTORY_NOT_FOUND');
  }

  return { servicio };
}

module.exports = { getClientCompletedServiceDetail };
