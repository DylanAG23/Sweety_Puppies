const { deleteByPublicUrl, uploadBufferToSupabase } = require('../../../services/supabaseStorage');

class SupabasePetAssetStorageService {
  async uploadPetPhoto(file) {
    return uploadBufferToSupabase({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: 'mascotas/fotos'
    });
  }

  async uploadVaccinationCard(file) {
    return uploadBufferToSupabase({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: 'mascotas/carnets'
    });
  }

  async safeDeleteByPublicUrl(publicUrl) {
    if (!publicUrl) {
      return;
    }

    try {
      await deleteByPublicUrl(publicUrl);
    } catch (error) {
      console.warn('No se pudo eliminar un archivo anterior de mascotas:', error.message);
    }
  }
}

module.exports = { SupabasePetAssetStorageService };
