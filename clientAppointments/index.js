const { getClientAppointmentFormOptions } = require('./application/useCases/getClientAppointmentFormOptions');
const { quoteClientAppointment } = require('./application/useCases/quoteClientAppointment');
const { getClientAppointmentAvailability } = require('./application/useCases/getClientAppointmentAvailability');
const { createClientAppointment } = require('./application/useCases/createClientAppointment');
const { cancelClientAppointment } = require('./application/useCases/cancelClientAppointment');
const { reprogramClientAppointment } = require('./application/useCases/reprogramClientAppointment');
const { getAdminAppointmentReview } = require('./application/useCases/getAdminAppointmentReview');
const { processAdminAppointmentDecision } = require('./application/useCases/processAdminAppointmentDecision');
const { createClientAppointmentsController } = require('./infrastructure/http/clientAppointmentsController');
const { PostgresClientAppointmentsRepository } = require('./infrastructure/repositories/PostgresClientAppointmentsRepository');
const { SupabaseAppointmentAssetStorageService } = require('./infrastructure/services/SupabaseAppointmentAssetStorageService');
const { EmailAppointmentNotificationService } = require('./infrastructure/services/EmailAppointmentNotificationService');
const { renderAppointmentReviewPage } = require('./infrastructure/services/AppointmentReviewPageRenderer');
const rules = require('./domain/services/appointmentRules');

function createClientAppointmentsModule() {
  const dependencies = {
    appointmentRepository: new PostgresClientAppointmentsRepository(),
    assetStorageService: new SupabaseAppointmentAssetStorageService(),
    notificationService: new EmailAppointmentNotificationService(),
    reviewPageRenderer: {
      render: renderAppointmentReviewPage
    },
    rules
  };

  const useCases = {
    getClientAppointmentFormOptions: (sessionUser) => getClientAppointmentFormOptions(dependencies, sessionUser),
    quoteClientAppointment: (sessionUser, payload) => quoteClientAppointment(dependencies, sessionUser, payload),
    getClientAppointmentAvailability: (sessionUser, payload) =>
      getClientAppointmentAvailability(dependencies, sessionUser, payload),
    createClientAppointment: (sessionUser, payload, files) =>
      createClientAppointment(dependencies, sessionUser, payload, files),
    cancelClientAppointment: (sessionUser, appointmentId) =>
      cancelClientAppointment(dependencies, sessionUser, appointmentId),
    reprogramClientAppointment: (sessionUser, appointmentId, payload) =>
      reprogramClientAppointment(dependencies, sessionUser, appointmentId, payload),
    getAdminAppointmentReview: (token) => getAdminAppointmentReview(dependencies, token),
    processAdminAppointmentDecision: (token, decision) =>
      processAdminAppointmentDecision(dependencies, token, decision)
  };

  return {
    useCases,
    controller: createClientAppointmentsController(useCases, dependencies.reviewPageRenderer)
  };
}

module.exports = { createClientAppointmentsModule };
