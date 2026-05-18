const { PetError } = require('../errors/PetError');
const { resolveDogBreed } = require('../../../shared/pets/dogBreedCatalog');

const PET_SIZE_MAP = new Map([
  ['miniatura', 'miniatura'],
  ['pequeno', 'pequeno'],
  ['pequeño', 'pequeno'],
  ['mediano', 'mediano'],
  ['grande', 'grande'],
  ['extra grande', 'extra grande'],
  ['extragrande', 'extra grande']
]);

const COAT_TYPES = new Set(['corto', 'largo']);
const BEHAVIOR_TYPES = new Set(['normal', 'sensible', 'agresivo']);
const SEX_TYPES = new Set(['macho', 'hembra']);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeOptionalText(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = normalizeText(value);
  return ['true', '1', 'si', 'sí', 'yes', 'on'].includes(normalized);
}

function normalizeOptionalDate(value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return null;
  }

  const dateValue = rawValue.includes('T') ? rawValue.slice(0, 10) : rawValue;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : rawValue;
}

function normalizeEnumValue(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeDatabasePetSize(value) {
  const normalized = normalizeEnumValue(value);
  return PET_SIZE_MAP.get(normalized) || normalized;
}

function normalizePetPayload(payload) {
  const ageValue = String(payload.edad ?? '').trim();

  return {
    nombre: String(payload.nombre || '').trim(),
    raza: resolveDogBreed(payload.raza),
    raza_input: normalizeOptionalText(payload.raza),
    tamano: normalizeDatabasePetSize(payload.tamano),
    sexo: normalizeEnumValue(payload.sexo),
    edad: ageValue ? Number.parseInt(ageValue, 10) : Number.NaN,
    tipo_pelaje: normalizeEnumValue(payload.tipo_pelaje),
    comportamiento_habitual: normalizeEnumValue(payload.comportamiento_habitual),
    alergias: normalizeOptionalText(payload.alergias),
    enfermedades: normalizeOptionalText(payload.enfermedades),
    cosas_no_le_gustan: normalizeOptionalText(payload.cosas_no_le_gustan),
    fecha_ultimo_bano: normalizeOptionalDate(payload.fecha_ultimo_bano),
    vacunacion_al_dia: normalizeBooleanValue(payload.vacunacion_al_dia),
    desparasitacion_interna_al_dia: normalizeBooleanValue(payload.desparasitacion_interna_al_dia),
    desparasitacion_externa_al_dia: normalizeBooleanValue(payload.desparasitacion_externa_al_dia),
    observaciones: normalizeOptionalText(payload.observaciones)
  };
}

function validatePetPayload(payload) {
  if (!payload.nombre) {
    throw new PetError('El nombre de la mascota es obligatorio', 400, 'VALIDATION_ERROR');
  }

  if (!payload.tamano) {
    throw new PetError('Debes seleccionar el tamano de la mascota', 400, 'VALIDATION_ERROR');
  }

  if (payload.raza_input && !payload.raza) {
    throw new PetError('Debes seleccionar una raza valida del catalogo', 400, 'VALIDATION_ERROR');
  }

  if (!PET_SIZE_MAP.has(payload.tamano) && !Array.from(PET_SIZE_MAP.values()).includes(payload.tamano)) {
    throw new PetError('Debes seleccionar el tamano de la mascota', 400, 'VALIDATION_ERROR');
  }

  if (!Number.isInteger(payload.edad) || payload.edad < 0) {
    throw new PetError('La edad debe ser un numero entero mayor o igual a cero', 400, 'VALIDATION_ERROR');
  }

  if (!COAT_TYPES.has(payload.tipo_pelaje)) {
    throw new PetError('Debes seleccionar el tipo de pelaje', 400, 'VALIDATION_ERROR');
  }

  if (!BEHAVIOR_TYPES.has(payload.comportamiento_habitual)) {
    throw new PetError('Debes seleccionar el comportamiento habitual', 400, 'VALIDATION_ERROR');
  }

  if (payload.sexo && !SEX_TYPES.has(payload.sexo)) {
    throw new PetError('El sexo seleccionado no es valido', 400, 'VALIDATION_ERROR');
  }

  if (payload.fecha_ultimo_bano) {
    const parsedDate = new Date(`${payload.fecha_ultimo_bano}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new PetError('La fecha del ultimo bano no es valida', 400, 'VALIDATION_ERROR');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedDate > today) {
      throw new PetError('La fecha del ultimo bano no puede ser posterior a hoy', 400, 'VALIDATION_ERROR');
    }
  }

  return payload;
}

module.exports = {
  normalizePetPayload,
  validatePetPayload
};
