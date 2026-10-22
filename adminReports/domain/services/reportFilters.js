const { AdminReportError } = require('../errors/AdminReportError');

const REPORT_TYPES = ['ganancias', 'adicionales', 'citas', 'resumen', 'dashboard'];
const PERIOD_TYPES = ['day', 'week', 'month', 'range'];
const BOGOTA_TIME_ZONE = 'America/Bogota';
const APPOINTMENT_STATES = [
  'todas',
  'pendiente',
  'confirmada',
  'en_atencion',
  'completada',
  'cancelada',
  'reprogramada'
];
const APPOINTMENT_STATE_ALIASES = {
  all: 'todas',
  todas: 'todas',
  todos: 'todas',
  pendiente: 'pendiente',
  pendientes: 'pendiente',
  confirmada: 'confirmada',
  confirmadas: 'confirmada',
  'en_atencion': 'en_atencion',
  'en-atencion': 'en_atencion',
  atencion: 'en_atencion',
  atencion_en_curso: 'en_atencion',
  completada: 'completada',
  completadas: 'completada',
  finalizada: 'completada',
  finalizadas: 'completada',
  realizada: 'completada',
  realizadas: 'completada',
  pagada: 'completada',
  pagadas: 'completada',
  cancelada: 'cancelada',
  canceladas: 'cancelada',
  reprogramada: 'reprogramada',
  reprogramadas: 'reprogramada'
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatBogotaToday() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function parseDate(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AdminReportError(`Debes indicar ${fieldName} con formato YYYY-MM-DD`, 400, 'INVALID_DATE');
  }

  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

function startOfWeek(date) {
  const dayIndex = (date.getUTCDay() + 6) % 7;
  return addDays(date, -dayIndex);
}

function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function humanizeDateRangeLabel(periodo, fechaInicio, fechaFin, fechaReferencia) {
  if (periodo === 'day') {
    return `Dia ${fechaReferencia}`;
  }

  if (periodo === 'week') {
    return `Semana ${fechaInicio} a ${fechaFin}`;
  }

  if (periodo === 'month') {
    return `Mes ${fechaInicio.slice(0, 7)}`;
  }

  return `Rango ${fechaInicio} a ${fechaFin}`;
}

function normalizeReportType(value) {
  const normalized = String(value || 'ganancias').trim().toLowerCase();

  if (!REPORT_TYPES.includes(normalized)) {
    throw new AdminReportError('Debes indicar un tipo de reporte valido', 400, 'INVALID_REPORT_TYPE');
  }

  return normalized;
}

function normalizePeriod(value) {
  const normalized = String(value || 'month').trim().toLowerCase();

  if (!PERIOD_TYPES.includes(normalized)) {
    throw new AdminReportError('Debes indicar un periodo valido', 400, 'INVALID_REPORT_PERIOD');
  }

  return normalized;
}

function normalizeUuid(value, fieldName) {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw new AdminReportError(`Debes indicar un ${fieldName} valido`, 400, 'INVALID_FILTER_UUID');
  }

  return normalized;
}

function normalizeAppointmentState(value) {
  const normalized = String(value || 'todas').trim().toLowerCase();
  const resolved = APPOINTMENT_STATE_ALIASES[normalized];

  if (!resolved || !APPOINTMENT_STATES.includes(resolved)) {
    throw new AdminReportError('Debes indicar un estado de cita valido para filtrar', 400, 'INVALID_APPOINTMENT_STATE');
  }

  return resolved;
}

function normalizeDashboardFilters(query) {
  const baseFilters = normalizeReportFilters(query);

  return {
    ...baseFilters,
    servicioId: normalizeUuid(query?.servicioId || query?.servicio_id, 'servicio principal'),
    servicioAdicionalId: normalizeUuid(
      query?.servicioAdicionalId || query?.servicio_adicional_id,
      'servicio adicional'
    ),
    clienteId: normalizeUuid(query?.clienteId || query?.cliente_id, 'cliente'),
    mascotaId: normalizeUuid(query?.mascotaId || query?.mascota_id, 'mascota'),
    estadoCita: normalizeAppointmentState(query?.estadoCita || query?.estado || 'todas')
  };
}

function normalizeReportFilters(query) {
  const periodo = normalizePeriod(query?.periodo || query?.period);

  if (periodo === 'range') {
    const fechaInicio = formatDate(parseDate(query?.fechaInicio, 'la fecha inicial'));
    const fechaFin = formatDate(parseDate(query?.fechaFin, 'la fecha final'));

    if (fechaInicio > fechaFin) {
      throw new AdminReportError('La fecha inicial no puede ser mayor a la fecha final', 400, 'INVALID_RANGE');
    }

    return {
      periodo,
      fechaReferencia: null,
      fechaInicio,
      fechaFin,
      label: humanizeDateRangeLabel(periodo, fechaInicio, fechaFin, fechaInicio)
    };
  }

  const fechaReferencia = formatDate(parseDate(query?.fecha || formatBogotaToday(), 'la fecha de referencia'));
  const referenceDate = parseDate(fechaReferencia, 'la fecha de referencia');

  if (periodo === 'day') {
    return {
      periodo,
      fechaReferencia,
      fechaInicio: fechaReferencia,
      fechaFin: fechaReferencia,
      label: humanizeDateRangeLabel(periodo, fechaReferencia, fechaReferencia, fechaReferencia)
    };
  }

  if (periodo === 'week') {
    const fechaInicio = formatDate(startOfWeek(referenceDate));
    const fechaFin = formatDate(endOfWeek(referenceDate));
    return {
      periodo,
      fechaReferencia,
      fechaInicio,
      fechaFin,
      label: humanizeDateRangeLabel(periodo, fechaInicio, fechaFin, fechaReferencia)
    };
  }

  const fechaInicio = formatDate(startOfMonth(referenceDate));
  const fechaFin = formatDate(endOfMonth(referenceDate));

  return {
    periodo,
    fechaReferencia,
    fechaInicio,
    fechaFin,
    label: humanizeDateRangeLabel(periodo, fechaInicio, fechaFin, fechaReferencia)
  };
}

module.exports = {
  normalizeReportType,
  normalizeReportFilters,
  normalizeDashboardFilters,
  normalizeAppointmentState
};
