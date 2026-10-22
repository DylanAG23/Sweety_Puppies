const { buildAppointmentAvailability } = require('../services/appointmentPlanner');

async function getClientAppointmentAvailability(dependencies, sessionUser, payload) {
  const clientContext = await dependencies.appointmentRepository.resolveClientContext(sessionUser);
  return buildAppointmentAvailability(dependencies, clientContext, payload);
}

module.exports = { getClientAppointmentAvailability };
