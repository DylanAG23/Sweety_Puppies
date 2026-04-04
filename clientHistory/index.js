const { getClientHistory } = require('./application/useCases/getClientHistory');
const { getClientCurrentAppointmentDetail } = require('./application/useCases/getClientCurrentAppointmentDetail');
const { getClientCompletedServiceDetail } = require('./application/useCases/getClientCompletedServiceDetail');
const { createClientHistoryController } = require('./infrastructure/http/clientHistoryController');
const { PostgresClientHistoryRepository } = require('./infrastructure/repositories/PostgresClientHistoryRepository');
const presentation = require('./domain/services/historyPresentation');

function createClientHistoryModule() {
  const dependencies = {
    historyRepository: new PostgresClientHistoryRepository(),
    presentation
  };

  const useCases = {
    getClientHistory: (sessionUser) => getClientHistory(dependencies, sessionUser),
    getClientCurrentAppointmentDetail: (sessionUser, appointmentId) =>
      getClientCurrentAppointmentDetail(dependencies, sessionUser, appointmentId),
    getClientCompletedServiceDetail: (sessionUser, historyId) =>
      getClientCompletedServiceDetail(dependencies, sessionUser, historyId)
  };

  return {
    useCases,
    controller: createClientHistoryController(useCases)
  };
}

module.exports = { createClientHistoryModule };
