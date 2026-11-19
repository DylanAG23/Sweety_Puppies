const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const APPOINTMENT_STATES = ['pendiente', 'confirmada', 'en_atencion', 'completada', 'cancelada', 'reprogramada'];
const BLOCKING_STATES = ['confirmada', 'en_atencion'];

function normalizeDateParam(value) {
  const raw = String(value || '').trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : raw;
}

function normalizeViewMode(value) {
  const normalized = String(value || 'hoy').trim().toLowerCase();
  return ['hoy', 'semana', 'mes'].includes(normalized) ? normalized : 'hoy';
}

function normalizeOptionalTime(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  return normalized.length === 5 ? `${normalized}:00` : normalized;
}

function normalizeOptionalText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeBlockPayload(payload) {
  return {
    fecha: payload?.fecha || '',
    horaInicio: normalizeOptionalTime(payload?.horaInicio),
    horaFin: normalizeOptionalTime(payload?.horaFin),
    motivo: normalizeOptionalText(payload?.motivo)
  };
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
  return formatDateOnly(date);
}

function getDayName(fecha) {
  const date = new Date(`${fecha}T00:00:00`);
  return DAY_NAMES[date.getDay()];
}

function formatDateOnly(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateValue) {
  const value = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(value.getTime())) {
    return String(dateValue);
  }

  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(value);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short'
  }).format(value);
}

function formatShortHumanDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function formatDayLabel(value) {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatusLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

function countByState(items, state) {
  return items.filter((item) => item.estado === state).length;
}

function mapBlockRow(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    motivo: row.motivo,
    activo: row.activo,
    esDiaCompleto: !row.hora_inicio && !row.hora_fin,
    createdAt: row.created_at
  };
}

function buildAppointmentEmailViewModel(appointment) {
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
    additionalServices: appointment.additionalServices || []
  };
}

function resolveDateRange(fecha, vista) {
  const base = new Date(`${fecha}T00:00:00`);
  const dates = [];
  let start = new Date(base);
  let end = new Date(base);

  if (vista === 'semana') {
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(base.getDate() + diffToMonday);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (vista === 'mes') {
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(formatDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    start: formatDateOnly(start),
    end: formatDateOnly(end),
    dates,
    label:
      vista === 'mes'
        ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(start)
        : vista === 'semana'
          ? `${formatShortDate(start)} - ${formatShortDate(end)}`
          : formatDateLabel(fecha)
  };
}

module.exports = {
  DAY_NAMES,
  APPOINTMENT_STATES,
  BLOCKING_STATES,
  normalizeDateParam,
  normalizeViewMode,
  normalizeOptionalTime,
  normalizeOptionalText,
  normalizeBlockPayload,
  getBusinessNow,
  addDays,
  getDayName,
  formatDateOnly,
  formatDateLabel,
  formatShortHumanDate,
  formatDayLabel,
  formatStatusLabel,
  timeToMinutes,
  countByState,
  mapBlockRow,
  buildAppointmentEmailViewModel,
  resolveDateRange
};
