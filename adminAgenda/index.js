const { getAdminAgenda } = require('./application/useCases/getAdminAgenda');
const { getAdminAppointmentDetail } = require('./application/useCases/getAdminAppointmentDetail');
const { confirmAdminAppointment } = require('./application/useCases/confirmAdminAppointment');
const { listAdminBlocks } = require('./application/useCases/listAdminBlocks');
const { createAdminBlock } = require('./application/useCases/createAdminBlock');
const { deactivateAdminBlock } = require('./application/useCases/deactivateAdminBlock');
const { createAdminAgendaController } = require('./infrastructure/http/adminAgendaController');
const { PostgresAdminAgendaRepository } = require('./infrastructure/repositories/PostgresAdminAgendaRepository');
const { AdminAgendaNotificationService } = require('./infrastructure/services/AdminAgendaNotificationService');
const presentation = require('./domain/services/agendaPresentation');

function createAdminAgendaModule() {
  const dependencies = {
    agendaRepository: new PostgresAdminAgendaRepository(),
    notificationService: new AdminAgendaNotificationService(),
    presentation
  };

  const useCases = {
    getAdminAgenda: (sessionUser, query) => getAdminAgenda(dependencies, sessionUser, query),
    getAdminAppointmentDetail: (sessionUser, appointmentId) =>
      getAdminAppointmentDetail(dependencies, sessionUser, appointmentId),
    confirmAdminAppointment: (sessionUser, appointmentId) =>
      confirmAdminAppointment(dependencies, sessionUser, appointmentId),
    listAdminBlocks: (sessionUser, query) => listAdminBlocks(dependencies, sessionUser, query),
    createAdminBlock: (sessionUser, body) => createAdminBlock(dependencies, sessionUser, body),
    deactivateAdminBlock: (sessionUser, blockId) => deactivateAdminBlock(dependencies, sessionUser, blockId)
  };

  return {
    useCases,
    controller: createAdminAgendaController(useCases)
  };
}

module.exports = { createAdminAgendaModule };
