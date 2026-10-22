const { deleteByPublicUrl, uploadBufferToSupabase } = require('../../../services/supabaseStorage');

class SupabasePortalContentStorageService {
  async uploadPublicationImage(file) {
    return uploadBufferToSupabase({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: 'contenido'
    });
  }

  async safeDeleteByPublicUrl(publicUrl) {
    if (!publicUrl) {
      return;
    }

    try {
      await deleteByPublicUrl(publicUrl);
    } catch (error) {
      console.warn('No se pudo eliminar un archivo anterior del contenido:', error.message);
    }
  }
}

module.exports = { SupabasePortalContentStorageService };
