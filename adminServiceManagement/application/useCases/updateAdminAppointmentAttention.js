const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

async function updateAdminAppointmentAttention(dependencies, sessionUser, identifier, payload) {
  const adminContext = await dependencies.managementRepository.resolveAdminContext(sessionUser);
  const cita = await dependencies.managementRepository.findAppointmentDetail(identifier);

  if (!cita) {
    throw new AdminServiceManagementError('No encontramos la cita solicitada', 404, 'APPOINTMENT_NOT_FOUND');
  }

  if (cita.estado !== 'en_atencion') {
    throw new AdminServiceManagementError('Solo puedes registrar atencion en citas que esten en proceso', 400, 'INVALID_STATUS_TRANSITION');
  }

  const normalized = dependencies.rules.normalizeAttentionPayload(payload);
  const additionalServices = await dependencies.managementRepository.findActiveAdditionalServicesByIds(
    normalized.servicioAdicionalIds
  );

  if (additionalServices.length !== normalized.servicioAdicionalIds.length) {
    throw new AdminServiceManagementError(
      'Uno o mas servicios adicionales ya no estan disponibles para esta cita',
      400,
      'INVALID_ADDITIONAL_SERVICE'
    );
  }

  const priceRows = await dependencies.managementRepository.findAdditionalServicePrices(
    normalized.servicioAdicionalIds,
    cita.mascota.tamano
  );

  const additionalServicesWithPrices = dependencies.rules.buildAdditionalServices(additionalServices, priceRows);
  const pricing = dependencies.rules.calculateOperationalPricing({
    precioBase: cita.precioBase,
    serviceConfig: cita.servicioPrincipal,
    petSize: cita.mascota.tamano,
    coatState: normalized.estadoPelajeReal,
    behaviorState: normalized.comportamientoObservado,
    additionalServices: additionalServicesWithPrices
  });

  const mergedAttention = {
    ...(cita.atencion || {}),
    estadoPelajeReal: normalized.estadoPelajeReal,
    comportamientoObservado: normalized.comportamientoObservado,
    observacionesDuranteServicio: normalized.observacionesDuranteServicio,
    servicioAdicionalIds: normalized.servicioAdicionalIds,
    precioCalculadoActualizado: pricing.precioCalculadoActualizado,
    precioFinalProvisional: normalized.precioFinalProvisional ?? pricing.precioCalculadoActualizado
  };

  const observacionesAdmin = dependencies.rules.serializeOperationalNotes(mergedAttention);

  await dependencies.managementRepository.runInTransaction(async (db) => {
    await dependencies.managementRepository.replaceAppointmentAdditionalServices(
      cita.id,
      additionalServicesWithPrices,
      db
    );
    await dependencies.managementRepository.updateAppointmentOperationalState(
      cita.id,
      adminContext.id,
      {
        estado: cita.estado,
        observacionesAdmin,
        precioCalculado: pricing.precioCalculadoActualizado,
        precioFinal: mergedAttention.precioFinalProvisional
      },
      db
    );
  });

  return {
    message: 'La atencion en curso fue actualizada correctamente',
    cita: await dependencies.managementRepository.findAppointmentDetail(cita.id)
  };
}

module.exports = { updateAdminAppointmentAttention };
