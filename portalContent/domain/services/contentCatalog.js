const { PortalContentError } = require('../errors/PortalContentError');

const CONTENT_CATEGORIES = ['peluditos del mes', 'galeria destacada', 'promocion', 'mensaje visual'];

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
    throw new PortalContentError(`Debes indicar ${fieldName}`, 400, 'REQUIRED_FIELD');
  }

  return normalized;
}

function normalizeBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
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

  if (value === undefined || value === null) {
    return false;
  }

  throw new PortalContentError(`Debes indicar un valor valido para ${fieldName}`, 400, 'INVALID_BOOLEAN');
}

function normalizeOrder(value) {
  const normalized = Number(value ?? 0);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new PortalContentError('El orden de visualizacion debe ser un numero igual o mayor a 0', 400, 'INVALID_ORDER');
  }

  return Math.round(normalized);
}

function normalizeCategory(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return 'galeria destacada';
  }

  return normalized;
}

function normalizeSearchTerm(query) {
  return normalizeOptionalText(query?.search || query?.q || query?.texto || '') || '';
}

function normalizeCreatePayload(payload) {
  return {
    titulo: normalizeRequiredText(payload?.titulo, 'el titulo de la publicacion'),
    descripcion: normalizeOptionalText(payload?.descripcion),
    categoria: normalizeCategory(payload?.categoria),
    orden: normalizeOrder(payload?.orden),
    activo: payload?.activo === undefined ? true : normalizeBoolean(payload?.activo, 'el estado de la publicacion')
  };
}

function normalizeUpdatePayload(payload, currentContent) {
  if (!currentContent) {
    throw new PortalContentError('No encontramos la publicacion solicitada', 404, 'CONTENT_NOT_FOUND');
  }

  return {
    titulo: payload?.titulo !== undefined ? normalizeRequiredText(payload?.titulo, 'el titulo de la publicacion') : currentContent.titulo,
    descripcion: payload?.descripcion !== undefined ? normalizeOptionalText(payload?.descripcion) : currentContent.descripcion,
    categoria: payload?.categoria !== undefined ? normalizeCategory(payload?.categoria) : currentContent.categoria,
    orden: payload?.orden !== undefined ? normalizeOrder(payload?.orden) : Number(currentContent.orden) || 0,
    activo: payload?.activo !== undefined ? normalizeBoolean(payload?.activo, 'el estado de la publicacion') : Boolean(currentContent.activo),
    ruta: currentContent.ruta
  };
}

function normalizeStatusPayload(payload) {
  return {
    activo: normalizeBoolean(payload?.activo, 'el estado de la publicacion')
  };
}

function normalizeReorderPayload(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (!items.length) {
    throw new PortalContentError('Debes enviar al menos un elemento para reordenar', 400, 'MISSING_REORDER_ITEMS');
  }

  return items.map((item) => ({
    id: normalizeRequiredText(item?.id, 'el identificador del contenido'),
    orden: normalizeOrder(item?.orden)
  }));
}

module.exports = {
  CONTENT_CATEGORIES,
  normalizeSearchTerm,
  normalizeCreatePayload,
  normalizeUpdatePayload,
  normalizeStatusPayload,
  normalizeReorderPayload
};
