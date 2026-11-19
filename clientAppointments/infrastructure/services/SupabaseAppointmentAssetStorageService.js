const { uploadBufferToSupabase } = require('../../../services/supabaseStorage');

class SupabaseAppointmentAssetStorageService {
  async uploadCurrentStatePhoto(file, clientId) {
    if (!file) {
      return null;
    }

    return uploadBufferToSupabase({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `clientes/${clientId}/citas/estado-actual`
    });
  }
}

module.exports = { SupabaseAppointmentAssetStorageService };
