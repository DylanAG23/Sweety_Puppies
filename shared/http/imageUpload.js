const path = require('path');
const multer = require('multer');

const DEFAULT_MAX_FILE_SIZE = 6 * 1024 * 1024;

// Tipos permitidos y su extension. SVG queda fuera porque puede contener scripts.
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

// Identifica el tipo real por la firma binaria; el mimetype lo envia el cliente.
function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  const header = buffer.toString('ascii', 0, 6);
  if (header === 'GIF87a' || header === 'GIF89a') {
    return 'image/gif';
  }

  return null;
}

class ImageUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

function validateUploadedFiles(files) {
  for (const fileList of Object.values(files || {})) {
    for (const file of fileList) {
      const detectedType = detectImageType(file.buffer);

      if (!detectedType) {
        throw new ImageUploadError('El archivo no es una imagen valida. Usa JPG, PNG, WebP o GIF.');
      }

      const baseName = path.basename(file.originalname || 'imagen', path.extname(file.originalname || ''));
      file.mimetype = detectedType;
      file.originalname = `${baseName || 'imagen'}${ALLOWED_IMAGE_TYPES[detectedType]}`;
    }
  }
}

// Middleware para campos de imagen (multipart). Responde 400 en JSON ante
// cualquier problema, en lugar de dejar el error al manejador por defecto.
function createImageUpload(fields, { maxFileSize = DEFAULT_MAX_FILE_SIZE } = {}) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize, files: fields.length },
    fileFilter: (req, file, callback) => {
      if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
        callback(new ImageUploadError('Solo se permiten imagenes JPG, PNG, WebP o GIF'));
        return;
      }

      callback(null, true);
    }
  }).fields(fields);

  return function imageUpload(req, res, next) {
    upload(req, res, (error) => {
      try {
        if (error) {
          throw error;
        }

        validateUploadedFiles(req.files);
        return next();
      } catch (uploadError) {
        const maxLabel =
          maxFileSize >= 1024 * 1024
            ? `${Math.round(maxFileSize / (1024 * 1024))} MB`
            : `${Math.round(maxFileSize / 1024)} KB`;
        const message =
          uploadError instanceof ImageUploadError
            ? uploadError.message
            : uploadError?.code === 'LIMIT_FILE_SIZE'
              ? `La imagen supera el tamano maximo de ${maxLabel}`
              : 'No se pudieron procesar los archivos enviados';

        return res.status(400).json({ success: false, message });
      }
    });
  };
}

module.exports = { createImageUpload, detectImageType, ALLOWED_IMAGE_TYPES };
