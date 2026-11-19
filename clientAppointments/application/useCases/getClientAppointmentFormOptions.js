const { getEffectiveBookableStartDate } = require('../services/appointmentPlanner');

async function getClientAppointmentFormOptions(dependencies, sessionUser) {
  const clientContext = await dependencies.appointmentRepository.resolveClientContext(sessionUser);
  const [mascotas, servicios, serviciosAdicionales, fechaMinimaAgenda] = await Promise.all([
    dependencies.appointmentRepository.listClientPets(clientContext.clientIds),
    dependencies.appointmentRepository.listActiveServices(),
    dependencies.appointmentRepository.listActiveAdditionalServices(),
    getEffectiveBookableStartDate(dependencies)
  ]);

  return {
    mascotas,
    servicios,
    serviciosAdicionales,
    fechaMinimaAgenda
  };
}

module.exports = { getClientAppointmentFormOptions };
