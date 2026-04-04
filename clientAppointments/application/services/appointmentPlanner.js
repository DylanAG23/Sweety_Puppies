const { AppointmentError } = require('../../domain/errors/AppointmentError');

async function buildAppointmentQuote(dependencies, clientContext, rawPayload) {
  const payload = dependencies.rules.normalizeAppointmentPayload(rawPayload);

  if (!payload.mascotaId) {
    throw new AppointmentError('Debes seleccionar una mascota', 400, 'VALIDATION_ERROR');
  }

  if (!payload.servicioId) {
    throw new AppointmentError('Debes seleccionar un servicio principal', 400, 'VALIDATION_ERROR');
  }

  const mascota = await dependencies.appointmentRepository.findOwnedPet(payload.mascotaId, clientContext.clientIds);
  if (!mascota) {
    throw new AppointmentError('La mascota seleccionada no pertenece a tu cuenta', 404, 'PET_NOT_FOUND');
  }

  const servicio = await dependencies.appointmentRepository.findActiveService(payload.servicioId);
  if (!servicio) {
    throw new AppointmentError('El servicio principal no esta disponible', 404, 'SERVICE_NOT_FOUND');
  }

  const estadoPelajeReportado = dependencies.rules.normalizeReportedCoatState(payload.estadoPelajeReportado);
  const comportamientoReportado = dependencies.rules.normalizeBehaviorValue(payload.comportamientoReportado);
  const additionalIds = dependencies.rules.dedupeIds(payload.servicioAdicionalIds);
  const adicionales = await dependencies.appointmentRepository.findActiveAdditionalServicesByIds(additionalIds);

  if (adicionales.length !== additionalIds.length) {
    throw new AppointmentError('Uno de los servicios adicionales ya no esta disponible', 400, 'ADDITIONAL_NOT_AVAILABLE');
  }

  let precioBase = 0;
  if (servicio.requiere_tamano || servicio.requiere_tipo_pelaje) {
    precioBase = await dependencies.appointmentRepository.findBaseServicePrice(
      servicio.id,
      mascota.tamano,
      mascota.tipo_pelaje
    );

    if (precioBase === null) {
      throw new AppointmentError(
        'No encontramos una tarifa base para la mascota y el servicio seleccionados',
        400,
        'BASE_PRICE_NOT_FOUND'
      );
    }
  } else {
    precioBase = dependencies.rules.resolveDefaultServicePrice(servicio.nombre);
  }

  const recargoNudos = dependencies.rules.resolveKnotSurcharge(servicio, mascota, estadoPelajeReportado);
  const recargoComportamiento = dependencies.rules.resolveBehaviorSurcharge(servicio, comportamientoReportado);
  const additionalPrices = await dependencies.appointmentRepository.findAdditionalServicePrices(
    adicionales.map((item) => item.id),
    mascota.tamano
  );
  const additionalPriceMap = new Map(additionalPrices.map((row) => [row.servicio_adicional_id, row.precio]));

  const adicionalesConPrecio = adicionales.map((adicional) => {
    const precio = additionalPriceMap.get(adicional.id);

    if (typeof precio !== 'number') {
      throw new AppointmentError(`No encontramos tarifa para el adicional ${adicional.nombre}`, 400, 'ADDITIONAL_PRICE_NOT_FOUND');
    }

    return {
      id: adicional.id,
      nombre: adicional.nombre,
      descripcion: adicional.descripcion,
      precio
    };
  });

  const totalAdicionales = adicionalesConPrecio.reduce((sum, item) => sum + item.precio, 0);
  const totalEstimado = precioBase + recargoNudos + recargoComportamiento + totalAdicionales;

  return {
    payload,
    mascota,
    servicio,
    adicionales: adicionalesConPrecio,
    precioBase,
    recargoNudos,
    recargoComportamiento,
    totalAdicionales,
    totalEstimado,
    duracionMinutos: Number(servicio.duracion_minutos) || 0,
    estadoPelajeReportado,
    comportamientoReportado
  };
}

async function getEffectiveBookableStartDate(dependencies) {
  const now = dependencies.rules.getBusinessNow();
  const todaySchedule = await dependencies.appointmentRepository.getBusinessScheduleForDate(now.date);

  const shouldMoveToNextDay =
    !todaySchedule ||
    !todaySchedule.abierto ||
    dependencies.rules.getDayName(now.date) === 'domingo' ||
    now.totalMinutes >= dependencies.rules.timeToMinutes(todaySchedule.hora_cierre);

  return findNextOperationalDate(dependencies, shouldMoveToNextDay ? dependencies.rules.addDays(now.date, 1) : now.date);
}

async function findNextOperationalDate(dependencies, startDate) {
  let candidate = startDate;

  for (let index = 0; index < 15; index += 1) {
    const horario = await dependencies.appointmentRepository.getBusinessScheduleForDate(candidate);
    if (horario?.abierto && dependencies.rules.getDayName(candidate) !== 'domingo') {
      return candidate;
    }

    candidate = dependencies.rules.addDays(candidate, 1);
  }

  return startDate;
}

async function validateBookableDate(dependencies, fecha) {
  const selectedDate = new Date(`${fecha}T00:00:00`);
  const minDate = await getEffectiveBookableStartDate(dependencies);
  const minimumAllowedDate = new Date(`${minDate}T00:00:00`);

  if (Number.isNaN(selectedDate.getTime())) {
    throw new AppointmentError('La fecha seleccionada no es valida', 400, 'INVALID_DATE');
  }

  if (selectedDate < minimumAllowedDate) {
    throw new AppointmentError(
      minDate === dependencies.rules.getBusinessNow().date
        ? 'Solo puedes agendar citas desde hoy en adelante'
        : `La agenda de hoy ya cerro. Las nuevas citas deben programarse desde ${dependencies.rules.formatShortHumanDate(minDate)}`,
      400,
      'DATE_BEFORE_ALLOWED_RANGE'
    );
  }

  if (dependencies.rules.getDayName(fecha) === 'domingo') {
    throw new AppointmentError('Los domingos Sweety Puppies permanece cerrado', 400, 'SUNDAY_CLOSED');
  }
}

async function buildAppointmentAvailability(dependencies, clientContext, rawPayload) {
  const payload = dependencies.rules.normalizeAppointmentPayload(rawPayload);

  if (!payload.fecha) {
    throw new AppointmentError('Debes seleccionar una fecha', 400, 'VALIDATION_ERROR');
  }

  await validateBookableDate(dependencies, payload.fecha);

  const quote = await buildAppointmentQuote(dependencies, clientContext, payload);
  const horario = await dependencies.appointmentRepository.getBusinessScheduleForDate(payload.fecha);
  const dayName = dependencies.rules.getDayName(payload.fecha);

  if (dayName === 'domingo') {
    return {
      fecha: payload.fecha,
      slots: [],
      message: 'Los domingos Sweety Puppies permanece cerrado'
    };
  }

  if (!horario || !horario.abierto) {
    return {
      fecha: payload.fecha,
      slots: [],
      message: 'No atendemos ese dia'
    };
  }

  const bloqueos = await dependencies.appointmentRepository.listAgendaBlocks(payload.fecha);
  if (bloqueos.some((bloqueo) => !bloqueo.hora_inicio && !bloqueo.hora_fin)) {
    return {
      fecha: payload.fecha,
      slots: [],
      message: 'La agenda esta bloqueada para esa fecha'
    };
  }

  const citasOcupadas = await dependencies.appointmentRepository.listBlockingAppointments(payload.fecha, payload.appointmentId);
  const slots = dependencies.rules.buildTimeSlots({
    fecha: payload.fecha,
    duracionMinutos: quote.duracionMinutos || Number(horario.duracion_base_minutos) || 0,
    horario,
    bloqueos,
    citasOcupadas
  });

  return {
    fecha: payload.fecha,
    slots,
    message: slots.length ? null : 'No quedan horarios disponibles para esa fecha'
  };
}

module.exports = {
  buildAppointmentQuote,
  buildAppointmentAvailability,
  getEffectiveBookableStartDate,
  validateBookableDate
};
