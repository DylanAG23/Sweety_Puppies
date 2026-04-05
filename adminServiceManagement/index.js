const { listAdminAppointments } = require('./application/useCases/listAdminAppointments');
const { getAdminAppointmentDetail } = require('./application/useCases/getAdminAppointmentDetail');
const { confirmAdminAppointment } = require('./application/useCases/confirmAdminAppointment');
const { cancelAdminAppointment } = require('./application/useCases/cancelAdminAppointment');
const { startAdminAppointment } = require('./application/useCases/startAdminAppointment');
const { updateAdminAppointmentAttention } = require('./application/useCases/updateAdminAppointmentAttention');
const { finalizeAdminAppointment } = require('./application/useCases/finalizeAdminAppointment');
const { listAdminCompletedServices } = require('./application/useCases/listAdminCompletedServices');
const { getAdminCompletedServiceDetail } = require('./application/useCases/getAdminCompletedServiceDetail');
const { createAdminServiceManagementController } = require('./infrastructure/http/adminServiceManagementController');
const { PostgresAdminServiceManagementRepository } = require('./infrastructure/repositories/PostgresAdminServiceManagementRepository');
const { AdminServiceManagementNotificationService } = require('./infrastructure/services/AdminServiceManagementNotificationService');
const rules = require('./domain/services/managementRules');
const { buildAppointmentEmailViewModel } = require('../clientAppointments/domain/services/appointmentRules');

function createAdminServiceManagementModule() {
  const dependencies = {
    managementRepository: new PostgresAdminServiceManagementRepository(),
    notificationService: new AdminServiceManagementNotificationService(),
    rules,
    emailViewModelBuilder: (appointment) =>
      buildAppointmentEmailViewModel({
        clientName: appointment.cliente.nombre,
        petName: appointment.mascota.nombre,
        serviceName: appointment.servicioPrincipal.nombre,
        fecha: appointment.fecha,
        horaInicio: appointment.horaInicio,
        horaFinEstimada: appointment.horaFinEstimada,
        estadoPelajeReportado: appointment.estadoPelajeReportado,
        comportamientoReportado: appointment.comportamientoReportado,
        observacionesCliente: appointment.observacionesCliente,
        precioCalculado: appointment.precioCalculado,
        precioFinal: appointment.precioFinal,
        additionalServices: appointment.serviciosAdicionales
      })
  };

  const useCases = {
    listAdminAppointments: (sessionUser, query) => listAdminAppointments(dependencies, sessionUser, query),
    getAdminAppointmentDetail: (sessionUser, identifier) => getAdminAppointmentDetail(dependencies, sessionUser, identifier),
    confirmAdminAppointment: (sessionUser, identifier) => confirmAdminAppointment(dependencies, sessionUser, identifier),
    cancelAdminAppointment: (sessionUser, identifier) => cancelAdminAppointment(dependencies, sessionUser, identifier),
    startAdminAppointment: (sessionUser, identifier) => startAdminAppointment(dependencies, sessionUser, identifier),
    updateAdminAppointmentAttention: (sessionUser, identifier, payload) =>
      updateAdminAppointmentAttention(dependencies, sessionUser, identifier, payload),
    finalizeAdminAppointment: (sessionUser, identifier, payload) =>
      finalizeAdminAppointment(dependencies, sessionUser, identifier, payload),
    listAdminCompletedServices: (sessionUser, query) => listAdminCompletedServices(dependencies, sessionUser, query),
    getAdminCompletedServiceDetail: (sessionUser, identifier) =>
      getAdminCompletedServiceDetail(dependencies, sessionUser, identifier)
  };

  return {
    useCases,
    controller: createAdminServiceManagementController(useCases)
  };
}

module.exports = { createAdminServiceManagementModule };
