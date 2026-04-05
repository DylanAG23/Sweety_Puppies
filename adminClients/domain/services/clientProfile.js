const { AdminClientError } = require('../errors/AdminClientError');

function normalizeOptionalText(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  return ['true', '1', 'si', 'sí', 'yes', 'on'].includes(normalized);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeAdminClientPayload(payload) {
  return {
    nombre: String(payload.nombre || '').trim(),
    apellido: String(payload.apellido || '').trim(),
    telefono: normalizeOptionalText(payload.telefono),
    telefono_secundario: normalizeOptionalText(payload.telefono_secundario),
    direccion: normalizeOptionalText(payload.direccion),
    email: normalizeEmail(payload.email),
    activo: normalizeBoolean(payload.activo)
  };
}

function validateAdminClientPayload(payload) {
  if (!payload.nombre) {
    throw new AdminClientError('El nombre del cliente es obligatorio', 400, 'VALIDATION_ERROR');
  }

  if (!payload.apellido) {
    throw new AdminClientError('El apellido del cliente es obligatorio', 400, 'VALIDATION_ERROR');
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new AdminClientError('Debes ingresar un correo valido para el cliente', 400, 'VALIDATION_ERROR');
  }

  return payload;
}

module.exports = {
  normalizeAdminClientPayload,
  validateAdminClientPayload
};
