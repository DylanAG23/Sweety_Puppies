const { getClientHistory } = require('./application/useCases/getClientHistory');
const { getClientCurrentAppointmentDetail } = require('./application/useCases/getClientCurrentAppointmentDetail');
const { getClientCompletedServiceDetail } = require('./application/useCases/getClientCompletedServiceDetail');
const { generateClientCompletedServiceReceipt } = require('./application/useCases/generateClientCompletedServiceReceipt');
const { createClientHistoryController } = require('./infrastructure/http/clientHistoryController');
const { PostgresClientHistoryRepository } = require('./infrastructure/repositories/PostgresClientHistoryRepository');
const { SimpleClientReceiptPdfService } = require('./infrastructure/services/SimpleClientReceiptPdfService');
const presentation = require('./domain/services/historyPresentation');

function createClientHistoryModule() {
  const dependencies = {
    historyRepository: new PostgresClientHistoryRepository(),
    presentation,
    receiptPdfService: new SimpleClientReceiptPdfService()
  };

  const useCases = {
    getClientHistory: (sessionUser) => getClientHistory(dependencies, sessionUser),
    getClientCurrentAppointmentDetail: (sessionUser, appointmentId) =>
      getClientCurrentAppointmentDetail(dependencies, sessionUser, appointmentId),
    getClientCompletedServiceDetail: (sessionUser, historyId) =>
      getClientCompletedServiceDetail(dependencies, sessionUser, historyId),
    generateClientCompletedServiceReceipt: (sessionUser, historyId) =>
      generateClientCompletedServiceReceipt(dependencies, sessionUser, historyId)
  };

  return {
    useCases,
    controller: createClientHistoryController(useCases)
  };
}

module.exports = { createClientHistoryModule };
