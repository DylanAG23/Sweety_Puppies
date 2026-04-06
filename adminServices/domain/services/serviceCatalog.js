const { AdminServiceError } = require('../errors/AdminServiceError');

const SERVICE_SIZES = ['miniatura', 'pequeno', 'mediano', 'grande', 'extra grande'];
const COAT_TYPES = ['corto', 'largo'];

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeRequiredText(value, fieldName) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new AdminServiceError(`Debes indicar ${fieldName}`, 400, 'REQUIRED_FIELD');
  }

  return normalized;
}

function normalizeBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'si', 'sí'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (value === undefined || value === null) {
    return false;
  }

  throw new AdminServiceError(`Debes indicar un valor valido para ${fieldName}`, 400, 'INVALID_BOOLEAN');
}

function normalizeDuration(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new AdminServiceError('La duracion en minutos debe ser mayor a 0', 400, 'INVALID_DURATION');
  }

  return Math.round(numericValue);
}

function normalizeSearchTerm(query) {
  return normalizeOptionalText(query?.search || query?.q || query?.texto || '') || '';
}

function normalizeServicePayload(payload) {
  return {
    nombre: normalizeRequiredText(payload?.nombre, 'el nombre del servicio'),
    descripcion: normalizeOptionalText(payload?.descripcion),
    duracion_minutos: normalizeDuration(payload?.duracion_minutos ?? payload?.duracionMinutos ?? payload?.duracion),
    requiere_tamano: normalizeBoolean(payload?.requiere_tamano ?? payload?.requiereTamano, 'si requiere tamano'),
    requiere_tipo_pelaje: normalizeBoolean(
      payload?.requiere_tipo_pelaje ?? payload?.requiereTipoPelaje,
      'si requiere tipo de pelaje'
    ),
    aplica_recargo_nudos: normalizeBoolean(
      payload?.aplica_recargo_nudos ?? payload?.aplicaRecargoNudos,
      'si aplica recargo por nudos'
    ),
    aplica_recargo_comportamiento: normalizeBoolean(
      payload?.aplica_recargo_comportamiento ?? payload?.aplicaRecargoComportamiento,
      'si aplica recargo por comportamiento'
    ),
    activo: payload?.activo === undefined ? true : normalizeBoolean(payload.activo, 'el estado del servicio')
  };
}

function normalizeStatusPayload(payload) {
  return {
    activo: normalizeBoolean(payload?.activo, 'el estado del servicio')
  };
}

function normalizeCategory(value) {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (!normalized || ['principales', 'principal', 'fijos', 'fijo'].includes(normalized)) {
    return 'principales';
  }

  if (['adicionales', 'adicional', 'extras', 'extra'].includes(normalized)) {
    return 'adicionales';
  }

  throw new AdminServiceError('Debes indicar una categoria valida de servicio', 400, 'INVALID_SERVICE_CATEGORY');
}

function parseTariffsInput(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      throw new AdminServiceError('No pudimos interpretar la configuracion de tarifas', 400, 'INVALID_TARIFFS_PAYLOAD');
    }
  }

  return [];
}

function normalizePrimaryTariffs(values) {
  const tariffs = parseTariffsInput(values).map((item) => ({
    tamano: normalizeRequiredText(item?.tamano, 'el tamano de la tarifa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
    tipo_pelaje: normalizeRequiredText(item?.tipo_pelaje ?? item?.tipoPelaje, 'el tipo de pelaje de la tarifa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
    precio_base: normalizeDuration(item?.precio_base ?? item?.precioBase ?? item?.precio)
  }));

  if (!tariffs.length) {
    throw new AdminServiceError('Debes configurar al menos una tarifa para el servicio principal', 400, 'MISSING_PRIMARY_TARIFFS');
  }

  const seen = new Set();
  for (const tariff of tariffs) {
    if (!SERVICE_SIZES.includes(tariff.tamano)) {
      throw new AdminServiceError('Debes usar un tamano valido en las tarifas del servicio', 400, 'INVALID_SERVICE_SIZE');
    }

    if (!COAT_TYPES.includes(tariff.tipo_pelaje)) {
      throw new AdminServiceError('Debes usar un tipo de pelaje valido en las tarifas del servicio', 400, 'INVALID_COAT_TYPE');
    }

    const key = `${tariff.tamano}:${tariff.tipo_pelaje}`;
    if (seen.has(key)) {
      throw new AdminServiceError('No puedes repetir combinaciones de tamano y pelaje en las tarifas', 400, 'DUPLICATED_PRIMARY_TARIFF');
    }
    seen.add(key);
  }

  return tariffs;
}

function normalizeAdditionalTariffs(values) {
  const tariffs = parseTariffsInput(values).map((item) => ({
    tamano: normalizeRequiredText(item?.tamano, 'el tamano de la tarifa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
    precio: normalizeDuration(item?.precio ?? item?.precio_base ?? item?.precioBase)
  }));

  if (!tariffs.length) {
    throw new AdminServiceError(
      'Debes configurar al menos una tarifa para el servicio adicional',
      400,
      'MISSING_ADDITIONAL_TARIFFS'
    );
  }

  const seen = new Set();
  for (const tariff of tariffs) {
    if (!SERVICE_SIZES.includes(tariff.tamano)) {
      throw new AdminServiceError('Debes usar un tamano valido en las tarifas del adicional', 400, 'INVALID_SERVICE_SIZE');
    }

    if (seen.has(tariff.tamano)) {
      throw new AdminServiceError('No puedes repetir tamanos en las tarifas del adicional', 400, 'DUPLICATED_ADDITIONAL_TARIFF');
    }
    seen.add(tariff.tamano);
  }

  return tariffs;
}

function normalizePrimaryServicePayload(payload) {
  return {
    ...normalizeServicePayload(payload),
    tarifas: normalizePrimaryTariffs(payload?.tarifas)
  };
}

function normalizeAdditionalServicePayload(payload) {
  return {
    nombre: normalizeRequiredText(payload?.nombre, 'el nombre del servicio adicional'),
    descripcion: normalizeOptionalText(payload?.descripcion),
    activo: payload?.activo === undefined ? true : normalizeBoolean(payload.activo, 'el estado del servicio adicional'),
    tarifas: normalizeAdditionalTariffs(payload?.tarifas)
  };
}

module.exports = {
  SERVICE_SIZES,
  COAT_TYPES,
  normalizeOptionalText,
  normalizeSearchTerm,
  normalizeServicePayload,
  normalizeStatusPayload,
  normalizeCategory,
  normalizePrimaryServicePayload,
  normalizeAdditionalServicePayload
};
