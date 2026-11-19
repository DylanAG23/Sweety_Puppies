const multer = require('multer');

// Ultimo middleware: atrapa errores que no manejaron los controladores
// (JSON mal formado, archivos invalidos, fallos inesperados) y responde
// sin exponer detalles internos.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamano maximo permitido'
        : 'No se pudieron procesar los archivos enviados';
    return res.status(400).json({ success: false, message });
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'El cuerpo de la solicitud no es un JSON valido' });
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'La solicitud es demasiado grande' });
  }

  if (error?.expose && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ success: false, message: error.message });
  }

  console.error('Error no controlado:', error);
  return res.status(500).json({ success: false, message: 'Ocurrio un error inesperado' });
}

module.exports = { errorHandler };
