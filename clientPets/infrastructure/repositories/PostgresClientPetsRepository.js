const client = require('../../../baseDatos');
const { PetError } = require('../../domain/errors/PetError');

class PostgresClientPetsRepository {
  async resolveClientContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredClientId = sessionUser?.clienteId || sessionUser?.cliente_id || null;

    if (!userId) {
      throw new PetError('No se encontro una sesion valida para consultar mascotas', 401, 'AUTH_REQUIRED');
    }

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
      [userId, preferredClientId]
    );

    if (!result.rowCount) {
      throw new PetError('No se encontro un perfil de cliente activo para esta sesion', 404, 'CLIENT_NOT_FOUND');
    }

    return {
      primaryClientId: result.rows[0].id,
      clientIds: result.rows.map((row) => row.id)
    };
  }

  async listByClientIds(clientIds) {
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
        ORDER BY activo DESC, created_at DESC, nombre ASC
      `,
      [clientIds]
    );

    return result.rows;
  }

  async findOwnedPetById(petId, clientIds) {
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
        LIMIT 1
      `,
      [petId, clientIds]
    );

    if (!result.rowCount) {
      throw new PetError('Mascota no encontrada', 404, 'PET_NOT_FOUND');
    }

    return result.rows[0];
  }

  async create(payload) {
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
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, true
        )
        RETURNING
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
      `,
      [
        payload.clienteId,
        payload.nombre,
        payload.raza,
        payload.tamano,
        payload.sexo,
        payload.edad,
        payload.tipo_pelaje,
        payload.comportamiento_habitual,
        payload.alergias,
        payload.enfermedades,
        payload.cosas_no_le_gustan,
        payload.fecha_ultimo_bano,
        payload.vacunacion_al_dia,
        payload.desparasitacion_interna_al_dia,
        payload.desparasitacion_externa_al_dia,
        payload.foto_mascota_url,
        payload.foto_carnet_vacunacion_url,
        payload.observaciones
      ]
    );

    return result.rows[0];
  }

  async update(petId, payload) {
    const result = await client.query(
      `
        UPDATE mascotas
        SET
          nombre = $2,
          raza = $3,
          tamano = $4,
          sexo = $5,
          edad = $6,
          tipo_pelaje = $7,
          comportamiento_habitual = $8,
          alergias = $9,
          enfermedades = $10,
          cosas_no_le_gustan = $11,
          fecha_ultimo_bano = $12,
          vacunacion_al_dia = $13,
          desparasitacion_interna_al_dia = $14,
          desparasitacion_externa_al_dia = $15,
          foto_mascota_url = $16,
          foto_carnet_vacunacion_url = $17,
          observaciones = $18,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
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
      `,
      [
        petId,
        payload.nombre,
        payload.raza,
        payload.tamano,
        payload.sexo,
        payload.edad,
        payload.tipo_pelaje,
        payload.comportamiento_habitual,
        payload.alergias,
        payload.enfermedades,
        payload.cosas_no_le_gustan,
        payload.fecha_ultimo_bano,
        payload.vacunacion_al_dia,
        payload.desparasitacion_interna_al_dia,
        payload.desparasitacion_externa_al_dia,
        payload.foto_mascota_url,
        payload.foto_carnet_vacunacion_url,
        payload.observaciones
      ]
    );

    return result.rows[0];
  }

  async updateStatus(petId, activo) {
    const result = await client.query(
      `
        UPDATE mascotas
        SET
          activo = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
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
      `,
      [petId, activo]
    );

    return result.rows[0];
  }

  async delete(petId) {
    await client.query(
      `
        UPDATE mascotas
        SET
          activo = false,
          updated_at = NOW()
        WHERE id = $1
      `,
      [petId]
    );
  }
}

module.exports = { PostgresClientPetsRepository };
