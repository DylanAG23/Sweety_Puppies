const { deleteByPublicUrl } = require('../../../services/supabaseStorage');

class SupabaseAdminPetAssetStorageService {
  async safeDeleteByPublicUrl(publicUrl) {
    if (!publicUrl) {
      return;
    }

    try {
      await deleteByPublicUrl(publicUrl);
    } catch (error) {
      console.warn('No se pudo eliminar un archivo de la mascota eliminada:', error.message);
    }
  }
}

module.exports = { SupabaseAdminPetAssetStorageService };
