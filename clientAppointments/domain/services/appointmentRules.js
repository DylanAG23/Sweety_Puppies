const { AppointmentError } = require('../errors/AppointmentError');

const NUDO_SURCHARGE_BY_SIZE = {
  miniatura: 15000,
  pequeno: 15000,
  mediano: 15000,
  grande: 25000,
  'extra grande': 25000
};

const DEFAULT_SERVICE_PRICES = {
  'corte de unas': 10000,
  'corte de uñas': 10000
};

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeBasicValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function dedupeIds(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeBehaviorValue(value) {
  const normalized = normalizeBasicValue(value);

  if (!['normal', 'sensible', 'agresivo'].includes(normalized)) {
    throw new AppointmentError('Debes seleccionar un comportamiento reportado valido', 400, 'VALIDATION_ERROR');
  }

  return normalized;
}

function normalizeReportedCoatState(value) {
  const normalized = normalizeBasicValue(value).replace(/\s+/g, '_');

  if (!['normal', 'con_nudos', 'muy_enredado'].includes(normalized)) {
    throw new AppointmentError('Debes seleccionar un estado de pelaje reportado valido', 400, 'VALIDATION_ERROR');
  }

  return normalized;
}

function normalizeAppointmentPayload(body) {
  const rawAdditionalIds = body?.servicioAdicionalIds ?? body?.servicio_adicional_ids ?? [];
  let servicioAdicionalIds = rawAdditionalIds;

  if (typeof rawAdditionalIds === 'string') {
    try {
      servicioAdicionalIds = JSON.parse(rawAdditionalIds);
    } catch (error) {
      servicioAdicionalIds = rawAdditionalIds
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return {
    mascotaId: body?.mascotaId || body?.mascota_id || '',
    servicioId: body?.servicioId || body?.servicio_id || '',
    servicioAdicionalIds: Array.isArray(servicioAdicionalIds) ? servicioAdicionalIds : [],
    estadoPelajeReportado: body?.estadoPelajeReportado || body?.estado_pelaje_reportado || 'normal',
    comportamientoReportado: body?.comportamientoReportado || body?.comportamiento_reportado || 'normal',
    observacionesCliente: normalizeOptionalText(body?.observacionesCliente || body?.observaciones_cliente || null),
    appointmentId: body?.appointmentId || body?.appointment_id || '',
    fecha: body?.fecha || '',
    horaInicio: body?.horaInicio || body?.hora_inicio || ''
  };
}

function resolveKnotSurcharge(servicio, mascota, estadoPelajeReportado) {
  if (!servicio.aplica_recargo_nudos) {
    return 0;
  }

  if (!['con_nudos', 'muy_enredado'].includes(estadoPelajeReportado)) {
    return 0;
  }

  return NUDO_SURCHARGE_BY_SIZE[mascota.tamano] || 0;
}

function resolveBehaviorSurcharge(servicio, comportamientoReportado) {
  if (!servicio.aplica_recargo_comportamiento) {
    return 0;
  }

  if (!['sensible', 'agresivo'].includes(comportamientoReportado)) {
    return 0;
  }

  return 5000;
}

function resolveDefaultServicePrice(servicioNombre) {
  return DEFAULT_SERVICE_PRICES[normalizeBasicValue(servicioNombre)] || 0;
}

function getBusinessNow() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    totalMinutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDayName(fecha) {
  const date = new Date(`${fecha}T00:00:00`);
  return DAY_NAMES[date.getDay()];
}

function formatShortHumanDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function buildTimeSlots({ fecha, duracionMinutos, horario, bloqueos, citasOcupadas }) {
  const slots = [];
  const startMinutes = timeToMinutes(horario.hora_apertura);
  const closeMinutes = timeToMinutes(horario.hora_cierre);
  const lastAppointmentMinutes = timeToMinutes(horario.ultima_cita);
  const stepMinutes = 30;
  const now = new Date();
  const isToday = fecha === now.toISOString().split('T')[0];

  for (let start = startMinutes; start <= lastAppointmentMinutes; start += stepMinutes) {
    const end = start + duracionMinutos;

    if (end > closeMinutes) {
      continue;
    }

    if (isToday && start <= now.getHours() * 60 + now.getMinutes()) {
      continue;
    }

    const overlapsAppointment = citasOcupadas.some((cita) =>
      rangesOverlap(start, end, timeToMinutes(cita.hora_inicio), timeToMinutes(cita.hora_fin_estimada))
    );

    if (overlapsAppointment) {
      continue;
    }

    const overlapsBlock = bloqueos.some((bloqueo) => {
      if (!bloqueo.hora_inicio && !bloqueo.hora_fin) {
        return true;
      }

      const blockStart = bloqueo.hora_inicio ? timeToMinutes(bloqueo.hora_inicio) : 0;
      const blockEnd = bloqueo.hora_fin ? timeToMinutes(bloqueo.hora_fin) : 24 * 60;
      return rangesOverlap(start, end, blockStart, blockEnd);
    });

    if (overlapsBlock) {
      continue;
    }

    slots.push({
      horaInicio: minutesToTime(start),
      horaFinEstimada: minutesToTime(end),
      label: `${minutesToTime(start).slice(0, 5)} - ${minutesToTime(end).slice(0, 5)}`
    });
  }

  return slots;
}

function formatDateLabel(dateValue) {
  const value = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(value.getTime())) {
    return String(dateValue);
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full'
  }).format(value);
}

function formatStatusLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function buildAppointmentEmailViewModel(appointment, options = {}) {
  const previousDateValue = options.previousDate ? formatDateLabel(options.previousDate) : null;
  const previousTimeValue =
    options.previousTimeStart && options.previousTimeEnd
      ? `${String(options.previousTimeStart).slice(0, 5)} - ${String(options.previousTimeEnd).slice(0, 5)}`
      : null;

  return {
    clientName: appointment.clientName,
    petName: appointment.petName,
    serviceName: appointment.serviceName,
    dateLabel: formatDateLabel(appointment.fecha),
    timeLabel: `${String(appointment.horaInicio).slice(0, 5)} - ${String(appointment.horaFinEstimada).slice(0, 5)}`,
    reportedCoatState: formatStatusLabel(appointment.estadoPelajeReportado),
    reportedBehavior: formatStatusLabel(appointment.comportamientoReportado),
    clientNotes: appointment.observacionesCliente,
    totalPrice: appointment.precioFinal || appointment.precioCalculado,
    additionalServices: appointment.additionalServices,
    previousDateLabel: previousDateValue,
    previousTimeLabel: previousTimeValue
  };
}

module.exports = {
  DAY_NAMES,
  normalizeOptionalText,
  normalizeBasicValue,
  dedupeIds,
  normalizeBehaviorValue,
  normalizeReportedCoatState,
  normalizeAppointmentPayload,
  resolveKnotSurcharge,
  resolveBehaviorSurcharge,
  resolveDefaultServicePrice,
  getBusinessNow,
  addDays,
  getDayName,
  formatShortHumanDate,
  timeToMinutes,
  minutesToTime,
  rangesOverlap,
  buildTimeSlots,
  formatDateLabel,
  formatStatusLabel,
  formatCurrency,
  buildAppointmentEmailViewModel
};
