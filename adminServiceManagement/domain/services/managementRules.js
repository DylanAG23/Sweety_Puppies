const { AdminServiceManagementError } = require('../errors/AdminServiceManagementError');

const APPOINTMENT_STATES = ['pendiente', 'confirmada', 'en_atencion', 'completada', 'cancelada', 'reprogramada'];
const COAT_STATES = ['normal', 'con_nudos', 'muy_enredado'];
const BEHAVIOR_STATES = ['normal', 'sensible', 'agresivo'];

const NUDO_SURCHARGE_BY_SIZE = {
  miniatura: 15000,
  pequeno: 15000,
  mediano: 15000,
  grande: 25000,
  'extra grande': 25000
};

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
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

function normalizeStateFilter(value) {
  const normalized = normalizeBasicValue(value).replace(/\s+/g, '_') || 'todas';
  if (normalized === 'todas') {
    return 'todas';
  }

  if (!APPOINTMENT_STATES.includes(normalized)) {
    throw new AdminServiceManagementError('Debes seleccionar un estado de cita valido', 400, 'INVALID_APPOINTMENT_STATE');
  }

  return normalized;
}

function normalizeReportedCoatState(value, fieldName = 'pelaje') {
  const normalized = normalizeBasicValue(value).replace(/\s+/g, '_') || 'normal';
  if (!COAT_STATES.includes(normalized)) {
    throw new AdminServiceManagementError(`Debes indicar un estado de ${fieldName} valido`, 400, 'INVALID_COAT_STATE');
  }

  return normalized;
}

function normalizeBehaviorState(value, fieldName = 'comportamiento') {
  const normalized = normalizeBasicValue(value) || 'normal';
  if (!BEHAVIOR_STATES.includes(normalized)) {
    throw new AdminServiceManagementError(`Debes indicar un ${fieldName} valido`, 400, 'INVALID_BEHAVIOR_STATE');
  }

  return normalized;
}

function normalizeAppointmentFilters(query) {
  return {
    estado: normalizeStateFilter(query?.estado),
    search: normalizeOptionalText(query?.q || query?.search || query?.texto || ''),
    fecha: normalizeOptionalText(query?.fecha || '')
  };
}

function normalizeCompletedServiceFilters(query) {
  return {
    fechaDesde: normalizeOptionalText(query?.fechaDesde || query?.fecha_desde || ''),
    fechaHasta: normalizeOptionalText(query?.fechaHasta || query?.fecha_hasta || ''),
    cliente: normalizeOptionalText(query?.cliente || ''),
    mascota: normalizeOptionalText(query?.mascota || ''),
    servicio: normalizeOptionalText(query?.servicio || ''),
    search: normalizeOptionalText(query?.q || query?.search || query?.texto || '')
  };
}

function normalizeAttentionPayload(body) {
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
    estadoPelajeReal: normalizeReportedCoatState(body?.estadoPelajeReal || body?.estado_pelaje_real || 'normal', 'pelaje real'),
    comportamientoObservado: normalizeBehaviorState(body?.comportamientoObservado || body?.comportamiento_observado || 'normal', 'comportamiento observado'),
    observacionesDuranteServicio: normalizeOptionalText(
      body?.observacionesDuranteServicio || body?.observaciones_durante_servicio || body?.observacionesAdmin || null
    ),
    servicioAdicionalIds: dedupeIds(Array.isArray(servicioAdicionalIds) ? servicioAdicionalIds : []),
    precioFinalProvisional:
      body?.precioFinalProvisional === undefined || body?.precioFinalProvisional === null || body?.precioFinalProvisional === ''
        ? null
        : Number(body.precioFinalProvisional)
  };
}

function normalizeFinalizePayload(body) {
  return {
    observacionesFinales: normalizeOptionalText(body?.observacionesFinales || body?.observaciones_finales || null),
    recomendaciones: normalizeOptionalText(body?.recomendaciones || null)
  };
}

function parseOperationalNotes(serializedValue) {
  if (!serializedValue) {
    return {
      estadoPelajeReal: null,
      comportamientoObservado: null,
      observacionesDuranteServicio: null,
      precioCalculadoActualizado: null,
      precioFinalProvisional: null,
      servicioAdicionalIds: [],
      observacionesFinales: null,
      recomendaciones: null,
      resumenServicioRealizado: null
    };
  }

  try {
    const parsed = JSON.parse(serializedValue);
    return {
      estadoPelajeReal: parsed.estadoPelajeReal || null,
      comportamientoObservado: parsed.comportamientoObservado || null,
      observacionesDuranteServicio: parsed.observacionesDuranteServicio || null,
      precioCalculadoActualizado: parsed.precioCalculadoActualizado ?? null,
      precioFinalProvisional: parsed.precioFinalProvisional ?? null,
      servicioAdicionalIds: Array.isArray(parsed.servicioAdicionalIds) ? parsed.servicioAdicionalIds : [],
      observacionesFinales: parsed.observacionesFinales || null,
      recomendaciones: parsed.recomendaciones || null,
      resumenServicioRealizado: parsed.resumenServicioRealizado || null
    };
  } catch (error) {
    return {
      estadoPelajeReal: null,
      comportamientoObservado: null,
      observacionesDuranteServicio: serializedValue,
      precioCalculadoActualizado: null,
      precioFinalProvisional: null,
      servicioAdicionalIds: [],
      observacionesFinales: null,
      recomendaciones: null,
      resumenServicioRealizado: null
    };
  }
}

function serializeOperationalNotes(payload) {
  return JSON.stringify({
    estadoPelajeReal: payload.estadoPelajeReal || null,
    comportamientoObservado: payload.comportamientoObservado || null,
    observacionesDuranteServicio: payload.observacionesDuranteServicio || null,
    precioCalculadoActualizado: payload.precioCalculadoActualizado ?? null,
    precioFinalProvisional: payload.precioFinalProvisional ?? null,
    servicioAdicionalIds: Array.isArray(payload.servicioAdicionalIds) ? payload.servicioAdicionalIds : [],
    observacionesFinales: payload.observacionesFinales || null,
    recomendaciones: payload.recomendaciones || null,
    resumenServicioRealizado: payload.resumenServicioRealizado || null
  });
}

function buildAdditionalServices(additionalServices, pricingRows) {
  const pricingById = new Map((pricingRows || []).map((row) => [row.servicio_adicional_id, Number(row.precio) || 0]));

  return additionalServices.map((service) => ({
    id: service.id,
    nombre: service.nombre,
    descripcion: service.descripcion || null,
    precio: pricingById.get(service.id) || 0
  }));
}

function resolveKnotSurcharge(aplicaRecargoNudos, tamano, estadoPelajeReal) {
  if (!aplicaRecargoNudos) {
    return 0;
  }

  if (!['con_nudos', 'muy_enredado'].includes(estadoPelajeReal)) {
    return 0;
  }

  return NUDO_SURCHARGE_BY_SIZE[tamano] || 0;
}

function resolveBehaviorSurcharge(aplicaRecargoComportamiento, comportamientoObservado) {
  if (!aplicaRecargoComportamiento) {
    return 0;
  }

  if (!['sensible', 'agresivo'].includes(comportamientoObservado)) {
    return 0;
  }

  return 5000;
}

function calculateOperationalPricing({ precioBase, serviceConfig, petSize, coatState, behaviorState, additionalServices }) {
  const recargoNudos = resolveKnotSurcharge(serviceConfig?.aplicaRecargoNudos, petSize, coatState);
  const recargoComportamiento = resolveBehaviorSurcharge(
    serviceConfig?.aplicaRecargoComportamiento,
    behaviorState
  );
  const adicionales = (additionalServices || []).reduce((total, item) => total + (Number(item.precio) || 0), 0);
  const precioCalculadoActualizado = (Number(precioBase) || 0) + recargoNudos + recargoComportamiento + adicionales;

  return {
    recargoNudos,
    recargoComportamiento,
    totalAdicionales: adicionales,
    precioCalculadoActualizado
  };
}

function buildAdditionalSummary(additionalServices) {
  if (!additionalServices?.length) {
    return null;
  }

  return additionalServices.map((service) => service.nombre).join(', ');
}

function normalizeDatePortion(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveTimePortion(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{2}:\d{2})(?::\d{2})?/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function getBogotaNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const byType = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    time: `${byType.hour}:${byType.minute}`
  };
}

function canStartAppointmentNow({ fecha, horaInicio }) {
  const appointmentDate = normalizeDatePortion(fecha);
  const appointmentTime = resolveTimePortion(horaInicio) || '00:00';

  if (!appointmentDate) {
    return {
      allowed: false,
      reason: 'No pudimos interpretar la fecha de la cita'
    };
  }

  const current = getBogotaNow();

  if (current.date !== appointmentDate) {
    return {
      allowed: false,
      reason: 'Solo puedes iniciar la cita el mismo dia en que fue agendada'
    };
  }

  if (current.time < appointmentTime) {
    return {
      allowed: false,
      reason: `Solo puedes iniciar la cita desde las ${appointmentTime}`
    };
  }

  return { allowed: true, reason: null };
}

module.exports = {
  APPOINTMENT_STATES,
  normalizeOptionalText,
  normalizeBasicValue,
  normalizeStateFilter,
  normalizeAppointmentFilters,
  normalizeCompletedServiceFilters,
  normalizeAttentionPayload,
  normalizeFinalizePayload,
  parseOperationalNotes,
  serializeOperationalNotes,
  buildAdditionalServices,
  calculateOperationalPricing,
  buildAdditionalSummary,
  normalizeDatePortion,
  canStartAppointmentNow
};
