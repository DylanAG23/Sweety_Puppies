const client = require('../../../baseDatos');
const { PortalContentError } = require('../../domain/errors/PortalContentError');

class PostgresPortalContentRepository {
  async resolveAdminContext(sessionUser) {
    const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;
    const preferredAdminId = sessionUser?.administradorId || sessionUser?.administrador_id || null;

    if (!userId) {
      throw new PortalContentError('No se encontro una sesion valida para consultar contenido', 401, 'AUTH_REQUIRED');
    }

    const result = await client.query(
      `
        SELECT id
        FROM administradores
        WHERE usuario_id = $1::uuid
          AND activo = true
        ORDER BY
          CASE
            WHEN $2::uuid IS NOT NULL AND id = $2::uuid THEN 0
            ELSE 1
          END,
          created_at ASC,
          id ASC
        LIMIT 1
      `,
      [userId, preferredAdminId]
    );

    if (!result.rowCount) {
      throw new PortalContentError(
        'No encontramos un perfil administrativo activo para esta sesion',
        404,
        'ADMIN_NOT_FOUND'
      );
    }

    return result.rows[0];
  }

  async listContent(search) {
    const result = await client.query(
      `
        SELECT
          id,
          titulo,
          descripcion,
          ruta,
          categoria,
          orden,
          activo,
          created_at,
          updated_at
        FROM imagenes
        WHERE (
          $1::text = ''
          OR titulo ILIKE '%' || $1 || '%'
          OR COALESCE(descripcion, '') ILIKE '%' || $1 || '%'
          OR COALESCE(categoria, '') ILIKE '%' || $1 || '%'
        )
        ORDER BY activo DESC, orden ASC, created_at DESC
      `,
      [search]
    );

    return result.rows;
  }

  async findContentById(identifier) {
    const result = await client.query(
      `
        SELECT
          id,
          titulo,
          descripcion,
          ruta,
          categoria,
          orden,
          activo,
          created_at,
          updated_at
        FROM imagenes
        WHERE id::text = $1::text
        LIMIT 1
      `,
      [String(identifier)]
    );

    return result.rows[0] || null;
  }

  async ensureTitleAvailable(titulo, excludeId = null) {
    const result = await client.query(
      `
        SELECT id
        FROM imagenes
        WHERE lower(titulo) = lower($1)
          AND ($2::uuid IS NULL OR id <> $2::uuid)
        LIMIT 1
      `,
      [titulo, excludeId]
    );

    if (result.rowCount) {
      throw new PortalContentError('Ya existe una publicacion registrada con ese titulo', 409, 'DUPLICATED_TITLE');
    }
  }

  async createContent(payload) {
    const result = await client.query(
      `
        INSERT INTO imagenes (titulo, descripcion, ruta, categoria, orden, activo, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `,
      [payload.titulo, payload.descripcion, payload.ruta, payload.categoria, payload.orden, payload.activo]
    );

    return this.findContentById(result.rows[0].id);
  }

  async updateContent(contentId, payload) {
    await client.query(
      `
        UPDATE imagenes
        SET
          titulo = $2,
          descripcion = $3,
          ruta = $4,
          categoria = $5,
          orden = $6,
          activo = $7,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [contentId, payload.titulo, payload.descripcion, payload.ruta, payload.categoria, payload.orden, payload.activo]
    );

    return this.findContentById(contentId);
  }

  async updateContentStatus(contentId, activo) {
    await client.query(
      `
        UPDATE imagenes
        SET
          activo = $2,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [contentId, activo]
    );

    return this.findContentById(contentId);
  }

  async reorderContent(items) {
    await client.query('BEGIN');

    try {
      for (const item of items) {
        await client.query(
          `
            UPDATE imagenes
            SET orden = $2, updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [item.id, item.orden]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  async listActiveContent() {
    const result = await client.query(
      `
        SELECT
          id,
          titulo,
          descripcion,
          ruta,
          categoria,
          orden,
          activo,
          created_at,
          updated_at
        FROM imagenes
        WHERE activo = true
        ORDER BY orden ASC, created_at DESC
      `
    );

    return result.rows;
  }
}

module.exports = { PostgresPortalContentRepository };
