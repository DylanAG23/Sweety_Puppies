const { buildAppointmentQuote } = require('../services/appointmentPlanner');

async function quoteClientAppointment(dependencies, sessionUser, payload) {
  const clientContext = await dependencies.appointmentRepository.resolveClientContext(sessionUser);
  const quote = await buildAppointmentQuote(dependencies, clientContext, payload);
  return { quote };
}

module.exports = { quoteClientAppointment };
