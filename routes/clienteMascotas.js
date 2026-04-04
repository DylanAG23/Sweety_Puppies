const express = require('express');
const multer = require('multer');
const client = require('../baseDatos');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadBufferToSupabase, deleteByPublicUrl } = require('../services/supabaseStorage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten imagenes'), false);
      return;
    }

    cb(null, true);
  }
});

const tamanoAllowedValues = new Map([
  ['miniatura', 'miniatura'],
  ['pequeño', 'pequeño'],
  ['pequeno', 'pequeño'],
  ['mediano', 'mediano'],
  ['grande', 'grande'],
  ['extra grande', 'extra grande'],
  ['extra-grande', 'extra grande'],
  ['extra_grande', 'extra grande']
]);

const tipoPelajeAllowedValues = new Map([
  ['corto', 'corto'],
  ['largo', 'largo']
]);

const comportamientoAllowedValues = new Map([
  ['normal', 'normal'],
  ['sensible', 'sensible'],
  ['agresivo', 'agresivo']
]);

const sexoAllowedValues = new Map([
  ['macho', 'macho'],
  ['hembra', 'hembra']
]);

router.use(authenticateToken, authorizeRoles('cliente'));

router.get('/', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);

    const result = await client.query(
      `
        SELECT
          id,
          cliente_id,
          nombre,
          raza,
          tamano::text AS tamano,
          sexo::text AS sexo,
          edad,
          tipo_pelaje::text AS tipo_pelaje,
          comportamiento_habitual::text AS comportamiento_habitual,
          alergias,
          enfermedades,
          cosas_no_le_gustan,
          fecha_ultimo_bano,
          vacunacion_al_dia,
          desparasitacion_interna_al_dia,
          desparasitacion_externa_al_dia,
          foto_mascota_url,
          foto_carnet_vacunacion_url,
          observaciones,
          activo,
          created_at,
          updated_at
        FROM mascotas
        WHERE cliente_id = ANY($1::uuid[])
        ORDER BY activo DESC, created_at DESC
      `,
      [clientContext.clienteIds]
    );

    res.json({
      success: true,
      mascotas: result.rows
    });
  } catch (error) {
    handleError(res, error, 'Error al listar las mascotas del cliente');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const mascota = await findOwnedPet(req.params.id, clientContext.clienteIds, false);

    if (!mascota) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    res.json({
      success: true,
      mascota
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener el detalle de la mascota');
  }
});

router.post(
  '/',
  upload.fields([
    { name: 'fotoMascota', maxCount: 1 },
    { name: 'fotoCarnet', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const clientContext = await getClientContext(req.user);
      const payload = normalizePetPayload(req.body);
      const validationError = validatePetPayload(payload);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError
        });
      }

      const files = req.files || {};
      const fotoMascota = files.fotoMascota?.[0];
      const fotoCarnet = files.fotoCarnet?.[0];
      const uploadWarnings = [];

      const fotoMascotaData = fotoMascota
        ? await uploadOptionalAsset(
            {
              buffer: fotoMascota.buffer,
              originalName: fotoMascota.originalname,
              mimeType: fotoMascota.mimetype,
              folder: `clientes/${clientContext.clienteId}/mascotas/perfil`
            },
            'la foto de perfil de la mascota',
            uploadWarnings
          )
        : null;

      const fotoCarnetData = fotoCarnet
        ? await uploadOptionalAsset(
            {
              buffer: fotoCarnet.buffer,
              originalName: fotoCarnet.originalname,
              mimeType: fotoCarnet.mimetype,
              folder: `clientes/${clientContext.clienteId}/mascotas/carnets`
            },
            'la foto del carnet de vacunacion',
            uploadWarnings
          )
        : null;

      const result = await client.query(
        `
          INSERT INTO mascotas (
            cliente_id,
            nombre,
            raza,
            tamano,
            sexo,
            edad,
            tipo_pelaje,
            comportamiento_habitual,
            alergias,
            enfermedades,
            cosas_no_le_gustan,
            fecha_ultimo_bano,
            vacunacion_al_dia,
            desparasitacion_interna_al_dia,
            desparasitacion_externa_al_dia,
            foto_mascota_url,
            foto_carnet_vacunacion_url,
            observaciones,
            activo
          )
          SELECT
            $1::uuid,
            $2::varchar,
            $3::varchar,
            $4,
            $5,
            $6::integer,
            $7,
            $8,
            $9::text,
            $10::text,
            $11::text,
            $12::date,
            $13::boolean,
            $14::boolean,
            $15::boolean,
            $16::text,
            $17::text,
            $18::text,
            true
          RETURNING id
        `,
        [
          clientContext.clienteId,
          payload.nombre,
          payload.raza,
          payload.tamano,
          payload.sexo,
          payload.edad,
          payload.tipoPelaje,
          payload.comportamientoHabitual,
          payload.alergias,
          payload.enfermedades,
          payload.cosasNoLeGustan,
          payload.fechaUltimoBano,
          payload.vacunacionAlDia,
          payload.desparasitacionInternaAlDia,
          payload.desparasitacionExternaAlDia,
          fotoMascotaData?.publicUrl || null,
          fotoCarnetData?.publicUrl || null,
          payload.observaciones
        ]
      );

      const mascota = await findOwnedPet(result.rows[0].id, clientContext.clienteIds);

      res.status(201).json({
        success: true,
        message: uploadWarnings.length
          ? `Mascota registrada correctamente. ${uploadWarnings.join(' ')}`
          : 'Mascota registrada correctamente',
        mascota,
        warnings: uploadWarnings
      });
    } catch (error) {
      handleError(res, error, 'Error al registrar la mascota');
    }
  }
);

router.patch(
  '/:id',
  upload.fields([
    { name: 'fotoMascota', maxCount: 1 },
    { name: 'fotoCarnet', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const clientContext = await getClientContext(req.user);
      const existingPet = await findOwnedPet(req.params.id, clientContext.clienteIds, false);

      if (!existingPet) {
        return res.status(404).json({
          success: false,
          message: 'Mascota no encontrada'
        });
      }

      const payload = normalizePetPayload(req.body, existingPet);
      const validationError = validatePetPayload(payload);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError
        });
      }

      const files = req.files || {};
      const fotoMascota = files.fotoMascota?.[0];
      const fotoCarnet = files.fotoCarnet?.[0];
      const uploadWarnings = [];

      let fotoMascotaUrl = existingPet.foto_mascota_url;
      let fotoCarnetUrl = existingPet.foto_carnet_vacunacion_url;

      if (fotoMascota) {
        const uploadedPhoto = await uploadOptionalAsset(
          {
            buffer: fotoMascota.buffer,
            originalName: fotoMascota.originalname,
            mimeType: fotoMascota.mimetype,
            folder: `clientes/${clientContext.clienteId}/mascotas/perfil`
          },
          'la foto de perfil de la mascota',
          uploadWarnings
        );

        if (uploadedPhoto) {
          fotoMascotaUrl = uploadedPhoto.publicUrl;
          safeDeletePublicUrl(existingPet.foto_mascota_url);
        }
      }

      if (fotoCarnet) {
        const uploadedCard = await uploadOptionalAsset(
          {
            buffer: fotoCarnet.buffer,
            originalName: fotoCarnet.originalname,
            mimeType: fotoCarnet.mimetype,
            folder: `clientes/${clientContext.clienteId}/mascotas/carnets`
          },
          'la foto del carnet de vacunacion',
          uploadWarnings
        );

        if (uploadedCard) {
          fotoCarnetUrl = uploadedCard.publicUrl;
          safeDeletePublicUrl(existingPet.foto_carnet_vacunacion_url);
        }
      }

      await client.query(
        `
          UPDATE mascotas
          SET
            nombre = $3::varchar,
            raza = $4::varchar,
            tamano = $5,
            sexo = $6,
            edad = $7::integer,
            tipo_pelaje = $8,
            comportamiento_habitual = $9,
            alergias = $10::text,
            enfermedades = $11::text,
            cosas_no_le_gustan = $12::text,
            fecha_ultimo_bano = $13::date,
            vacunacion_al_dia = $14::boolean,
            desparasitacion_interna_al_dia = $15::boolean,
            desparasitacion_externa_al_dia = $16::boolean,
            foto_mascota_url = $17::text,
            foto_carnet_vacunacion_url = $18::text,
            observaciones = $19::text,
            updated_at = NOW()
          WHERE id = $1
            AND cliente_id = $2::uuid
        `,
        [
          req.params.id,
          existingPet.cliente_id,
          payload.nombre,
          payload.raza,
          payload.tamano,
          payload.sexo,
          payload.edad,
          payload.tipoPelaje,
          payload.comportamientoHabitual,
          payload.alergias,
          payload.enfermedades,
          payload.cosasNoLeGustan,
          payload.fechaUltimoBano,
          payload.vacunacionAlDia,
          payload.desparasitacionInternaAlDia,
          payload.desparasitacionExternaAlDia,
          fotoMascotaUrl,
          fotoCarnetUrl,
          payload.observaciones
        ]
      );

      const mascota = await findOwnedPet(req.params.id, clientContext.clienteIds);

      res.json({
        success: true,
        message: uploadWarnings.length
          ? `Mascota actualizada correctamente. ${uploadWarnings.join(' ')}`
          : 'Mascota actualizada correctamente',
        mascota,
        warnings: uploadWarnings
      });
    } catch (error) {
      handleError(res, error, 'Error al actualizar la mascota');
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const existingPet = await findOwnedPet(req.params.id, clientContext.clienteIds, false);

    if (!existingPet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    await client.query(
      `
        DELETE FROM mascotas
        WHERE id = $1
          AND cliente_id = $2
      `,
      [req.params.id, existingPet.cliente_id]
    );

    safeDeletePublicUrl(existingPet.foto_mascota_url);
    safeDeletePublicUrl(existingPet.foto_carnet_vacunacion_url);

    res.json({
      success: true,
      message: 'Mascota eliminada correctamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar la mascota');
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const clientContext = await getClientContext(req.user);
    const existingPet = await findOwnedPet(req.params.id, clientContext.clienteIds, false);

    if (!existingPet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    const nextActiveState = normalizeBooleanValue(req.body?.activo);

    await client.query(
      `
        UPDATE mascotas
        SET activo = $3, updated_at = NOW()
        WHERE id = $1
          AND cliente_id = $2
      `,
      [req.params.id, existingPet.cliente_id, nextActiveState]
    );

    const mascota = await findOwnedPet(req.params.id, clientContext.clienteIds, false);

    res.json({
      success: true,
      message: nextActiveState ? 'Mascota activada correctamente' : 'Mascota desactivada correctamente',
      mascota
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar el estado de la mascota');
  }
});

function normalizePetPayload(body, fallback = null) {
  const getValue = (keys, fallbackKeys = keys, defaultValue = '') => {
    const bodyKeys = Array.isArray(keys) ? keys : [keys];
    const fallbackKeyList = Array.isArray(fallbackKeys) ? fallbackKeys : [fallbackKeys];

    for (const key of bodyKeys) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        return body[key];
      }
    }

    if (fallback) {
      for (const key of fallbackKeyList) {
        if (Object.prototype.hasOwnProperty.call(fallback, key)) {
          return fallback[key];
        }
      }
    }

    return defaultValue;
  };

  return {
    nombre: String(getValue('nombre')).trim(),
    raza: normalizeOptionalText(getValue('raza', 'raza', null)),
    tamano: normalizeDatabasePetSize(normalizeEnumValue(getValue('tamano'), tamanoAllowedValues)),
    sexo: normalizeEnumValue(getValue('sexo', 'sexo', null), sexoAllowedValues),
    edad: Number(getValue('edad')),
    tipoPelaje: normalizeEnumValue(getValue(['tipo_pelaje', 'tipoPelaje'], 'tipo_pelaje'), tipoPelajeAllowedValues),
    comportamientoHabitual: normalizeEnumValue(
      getValue(['comportamiento_habitual', 'comportamientoHabitual'], 'comportamiento_habitual'),
      comportamientoAllowedValues
    ),
    alergias: normalizeOptionalText(getValue('alergias', 'alergias', null)),
    enfermedades: normalizeOptionalText(getValue('enfermedades', 'enfermedades', null)),
    cosasNoLeGustan: normalizeOptionalText(getValue(['cosas_no_le_gustan', 'cosasNoLeGustan'], 'cosas_no_le_gustan', null)),
    fechaUltimoBano: normalizeOptionalDate(getValue(['fecha_ultimo_bano', 'fechaUltimoBano'], 'fecha_ultimo_bano', null)),
    vacunacionAlDia: normalizeBooleanValue(getValue(['vacunacion_al_dia', 'vacunacionAlDia'], 'vacunacion_al_dia', false)),
    desparasitacionInternaAlDia: normalizeBooleanValue(
      getValue(['desparasitacion_interna_al_dia', 'desparasitacionInternaAlDia'], 'desparasitacion_interna_al_dia', false)
    ),
    desparasitacionExternaAlDia: normalizeBooleanValue(
      getValue(['desparasitacion_externa_al_dia', 'desparasitacionExternaAlDia'], 'desparasitacion_externa_al_dia', false)
    ),
    observaciones: normalizeOptionalText(getValue('observaciones', 'observaciones', null))
  };
}

function validatePetPayload(payload) {
  if (!payload.nombre) {
    return 'El nombre de la mascota es obligatorio';
  }

  if (!payload.tamano) {
    return 'Debes seleccionar el tamano de la mascota';
  }

  if (!Number.isInteger(payload.edad) || payload.edad < 0) {
    return 'La edad debe ser un numero entero mayor o igual a cero';
  }

  if (!payload.tipoPelaje) {
    return 'Debes seleccionar el tipo de pelaje';
  }

  if (!payload.comportamientoHabitual) {
    return 'Debes seleccionar el comportamiento habitual';
  }

  if (payload.fechaUltimoBano) {
    const selectedDate = new Date(`${payload.fechaUltimoBano}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      return 'La fecha del ultimo baño no puede ser posterior a hoy';
    }
  }

  return null;
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeOptionalDate(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'si', 'sí', 'yes'].includes(normalized);
}

function normalizeEnumValue(value, allowedValues) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  return allowedValues.get(normalized) || null;
}

function normalizeDatabasePetSize(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (normalized === 'pequeno') {
    return 'pequeno';
  }

  return normalized;
}

async function getClientContext(user) {
  const result = await client.query(
    `
      SELECT id
      FROM clientes
      WHERE usuario_id = $1
        AND activo = true
      ORDER BY
        CASE
          WHEN $2::uuid IS NOT NULL AND id = $2::uuid THEN 0
          ELSE 1
        END,
        created_at ASC,
        id ASC
    `,
    [user.sub, user.clienteId || null]
  );

  if (result.rowCount > 0) {
    return {
      clienteId: result.rows[0].id,
      clienteIds: result.rows.map((row) => row.id)
    };
  }

  if (result.rowCount === 0) {
    const error = new Error('Cliente autenticado no encontrado');
    error.status = 404;
    throw error;
  }
}

async function findOwnedPet(petId, clienteIds, onlyActive = true) {
  const result = await client.query(
    `
      SELECT
        id,
        cliente_id,
        nombre,
        raza,
        tamano::text AS tamano,
        sexo::text AS sexo,
        edad,
        tipo_pelaje::text AS tipo_pelaje,
        comportamiento_habitual::text AS comportamiento_habitual,
        alergias,
        enfermedades,
        cosas_no_le_gustan,
        fecha_ultimo_bano,
        vacunacion_al_dia,
        desparasitacion_interna_al_dia,
        desparasitacion_externa_al_dia,
        foto_mascota_url,
        foto_carnet_vacunacion_url,
        observaciones,
        activo,
        created_at,
        updated_at
      FROM mascotas
      WHERE id = $1
        AND cliente_id = ANY($2::uuid[])
        AND ($3::boolean = false OR activo = true)
      LIMIT 1
    `,
    [petId, clienteIds, onlyActive]
  );

  return result.rows[0] || null;
}

async function uploadOptionalAsset(config, label, warnings = []) {
  try {
    return await uploadBufferToSupabase(config);
  } catch (error) {
    console.error(`No se pudo subir ${label}:`, error);
    warnings.push(`No se pudo subir ${label} por un problema temporal de conexion.`);
    return null;
  }
}

async function safeDeletePublicUrl(publicUrl) {
  if (!publicUrl) {
    return;
  }

  try {
    await deleteByPublicUrl(publicUrl);
  } catch (error) {
    console.error('No se pudo eliminar el archivo anterior de Supabase Storage:', error.message);
  }
}

function handleError(res, error, defaultMessage) {
  console.error(defaultMessage, error);

  if (
    error.code === '22P02' ||
    /invalid input value for enum/i.test(error.message || '') ||
    /does not exist/i.test(error.message || '')
  ) {
    res.status(400).json({
      success: false,
      message: 'Uno de los valores seleccionados no es compatible con la configuracion actual de mascotas'
    });
    return;
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || defaultMessage
  });
}

module.exports = router;
