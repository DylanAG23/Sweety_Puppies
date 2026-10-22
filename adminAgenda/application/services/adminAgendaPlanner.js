const { AdminAgendaError } = require('../../domain/errors/AdminAgendaError');

async function getEffectiveOperationalStartDate(dependencies) {
  const now = dependencies.presentation.getBusinessNow();
  const todaySchedule = await dependencies.agendaRepository.getBusinessScheduleForDate(
    dependencies.presentation.getDayName(now.date)
  );

  const shouldMoveToNextDay =
    !todaySchedule ||
    !todaySchedule.abierto ||
    dependencies.presentation.getDayName(now.date) === 'domingo' ||
    now.totalMinutes >= dependencies.presentation.timeToMinutes(todaySchedule.hora_cierre);

  return findNextOperationalDate(
    dependencies,
    shouldMoveToNextDay ? dependencies.presentation.addDays(now.date, 1) : now.date
  );
}

async function findNextOperationalDate(dependencies, startDate) {
  let candidate = startDate;

  for (let index = 0; index < 15; index += 1) {
    const horario = await dependencies.agendaRepository.getBusinessScheduleForDate(
      dependencies.presentation.getDayName(candidate)
    );

    if (horario?.abierto && dependencies.presentation.getDayName(candidate) !== 'domingo') {
      return candidate;
    }

    candidate = dependencies.presentation.addDays(candidate, 1);
  }

  return startDate;
}

async function buildRangeSummary(dependencies, fecha, vista) {
  const range = dependencies.presentation.resolveDateRange(fecha, vista);
  const dias = [];

  for (const dateValue of range.dates) {
    const [horario, bloqueosRows, citasRows] = await Promise.all([
      dependencies.agendaRepository.getBusinessScheduleForDate(dependencies.presentation.getDayName(dateValue)),
      dependencies.agendaRepository.listActiveBlocksForDate(dateValue),
      dependencies.agendaRepository.listAppointmentsByDate(
        dateValue,
        dependencies.presentation.APPOINTMENT_STATES
      )
    ]);

    const bloqueos = bloqueosRows.map(dependencies.presentation.mapBlockRow);
    const citas = citasRows.map((row) => mapAppointmentRow(dependencies, row));
    const dayName = dependencies.presentation.getDayName(dateValue);
    const cerradoPorDomingo = dayName === 'domingo';
    const cerrado = cerradoPorDomingo || !horario || !horario.abierto;

    dias.push({
      fecha: dateValue,
      dia: dependencies.presentation.formatDayLabel(dayName),
      cerrado,
      resumen: summarizeAppointments(dependencies, citas, bloqueos)
    });
  }

  return {
    vista,
    inicio: range.start,
    fin: range.end,
    etiqueta: range.label,
    dias
  };
}

function summarizeAppointments(dependencies, citas, bloqueos) {
  return {
    total: citas.length,
    pendientes: dependencies.presentation.countByState(citas, 'pendiente'),
    confirmadas: dependencies.presentation.countByState(citas, 'confirmada'),
    enAtencion: dependencies.presentation.countByState(citas, 'en_atencion'),
    completadas: dependencies.presentation.countByState(citas, 'completada'),
    canceladas: dependencies.presentation.countByState(citas, 'cancelada'),
    reprogramadas: dependencies.presentation.countByState(citas, 'reprogramada'),
    bloqueos: bloqueos.length
  };
}

function mapAppointmentRow(dependencies, row) {
  return {
    id: row.id,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    horaFinEstimada: row.hora_fin_estimada,
    estado: row.estado,
    precioBase: row.precio_base,
    precioCalculado: row.precio_calculado,
    precioFinal: row.precio_final,
    precioMostrado: row.precio_final || row.precio_calculado || row.precio_base || 0,
    clienteNombre: row.cliente_nombre,
    clienteTelefono: row.cliente_telefono,
    mascotaNombre: row.mascota_nombre,
    mascotaRaza: row.mascota_raza,
    mascotaFotoUrl: row.mascota_foto_url,
    servicioNombre: row.servicio_nombre,
    bloqueaDisponibilidad: dependencies.presentation.BLOCKING_STATES.includes(row.estado)
  };
}

async function buildAdminAgenda(dependencies, fecha, vista) {
  const fechaMinimaBloqueo = await getEffectiveOperationalStartDate(dependencies);
  const [horario, bloqueosRows, citasRows, bloqueosProximosRows, rango] = await Promise.all([
    dependencies.agendaRepository.getBusinessScheduleForDate(dependencies.presentation.getDayName(fecha)),
    dependencies.agendaRepository.listActiveBlocksForDate(fecha),
    dependencies.agendaRepository.listAppointmentsByDate(fecha, dependencies.presentation.APPOINTMENT_STATES),
    dependencies.agendaRepository.listUpcomingBlocks(fecha, 12),
    buildRangeSummary(dependencies, fecha, vista)
  ]);

  const bloqueos = bloqueosRows.map(dependencies.presentation.mapBlockRow);
  const citas = citasRows.map((row) => mapAppointmentRow(dependencies, row));
  const bloqueosProximos = bloqueosProximosRows.map(dependencies.presentation.mapBlockRow);
  const dayName = dependencies.presentation.getDayName(fecha);
  const cerradoPorDomingo = dayName === 'domingo';
  const cerrado = cerradoPorDomingo || !horario || !horario.abierto;

  return {
    vista,
    fecha,
    fechaMinimaBloqueo,
    dia: dependencies.presentation.formatDayLabel(dayName),
    cerrado,
    cierreMotivo: cerrado
      ? cerradoPorDomingo
        ? 'Los domingos Sweety Puppies siempre permanece cerrado.'
        : 'No hay horario operativo configurado para esta fecha.'
      : null,
    horario: horario
      ? {
          horaApertura: horario.hora_apertura,
          horaCierre: horario.hora_cierre,
          ultimaCita: horario.ultima_cita,
          duracionBaseMinutos: horario.duracion_base_minutos,
          abierto: horario.abierto
        }
      : null,
    resumen: summarizeAppointments(dependencies, citas, bloqueos),
    citas,
    bloqueos,
    bloqueosProximos,
    rango
  };
}

async function validateBlockCreation(dependencies, payload) {
  const fecha = dependencies.presentation.normalizeDateParam(payload.fecha);

  if (!fecha) {
    throw new AdminAgendaError('Debes seleccionar una fecha valida para el bloqueo', 400, 'INVALID_DATE');
  }

  const fechaMinimaBloqueo = await getEffectiveOperationalStartDate(dependencies);

  if (fecha < fechaMinimaBloqueo) {
    throw new AdminAgendaError(
      fechaMinimaBloqueo === dependencies.presentation.getBusinessNow().date
        ? 'Solo puedes crear bloqueos desde hoy en adelante'
        : `La jornada de hoy ya cerro. Los nuevos bloqueos deben crearse desde ${dependencies.presentation.formatShortHumanDate(fechaMinimaBloqueo)}`,
      400,
      'DATE_BEFORE_ALLOWED_RANGE'
    );
  }

  const dayName = dependencies.presentation.getDayName(fecha);

  if (dayName === 'domingo') {
    throw new AdminAgendaError('Los domingos ya aparecen cerrados por defecto en la agenda', 400, 'SUNDAY_CLOSED');
  }

  const horario = await dependencies.agendaRepository.getBusinessScheduleForDate(dayName);

  if (!horario || !horario.abierto) {
    throw new AdminAgendaError('La fecha seleccionada no tiene horario operativo disponible', 400, 'DAY_CLOSED');
  }

  if ((payload.horaInicio && !payload.horaFin) || (!payload.horaInicio && payload.horaFin)) {
    throw new AdminAgendaError('Debes diligenciar ambas horas para crear un bloqueo por franja', 400, 'INCOMPLETE_TIME_RANGE');
  }

  if (payload.horaInicio && payload.horaFin) {
    if (dependencies.presentation.timeToMinutes(payload.horaFin) <= dependencies.presentation.timeToMinutes(payload.horaInicio)) {
      throw new AdminAgendaError('La hora final debe ser mayor a la hora inicial', 400, 'INVALID_TIME_RANGE');
    }

    if (
      dependencies.presentation.timeToMinutes(payload.horaInicio) < dependencies.presentation.timeToMinutes(horario.hora_apertura) ||
      dependencies.presentation.timeToMinutes(payload.horaFin) > dependencies.presentation.timeToMinutes(horario.hora_cierre)
    ) {
      throw new AdminAgendaError('La franja debe estar dentro del horario del negocio', 400, 'TIME_OUT_OF_BUSINESS_RANGE');
    }
  }

  const hasOverlap = await dependencies.agendaRepository.hasOverlappingBlock({
    fecha,
    horaInicio: payload.horaInicio,
    horaFin: payload.horaFin
  });

  if (hasOverlap) {
    throw new AdminAgendaError('Ya existe un bloqueo activo que se cruza con esa fecha o franja', 400, 'OVERLAPPING_BLOCK');
  }

  return { fecha };
}

module.exports = {
  getEffectiveOperationalStartDate,
  buildAdminAgenda,
  validateBlockCreation,
  mapAppointmentRow
};
