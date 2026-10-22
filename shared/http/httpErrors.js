// Respuestas para errores que no son de dominio. Nunca se envia al cliente
// el mensaje interno (SQL, nombres de tablas, trazas); se registra en el servidor.

const POSTGRES_ERROR_RESPONSES = {
  // invalid_text_representation (por ejemplo, un UUID mal formado)
  '22P02': { status: 400, message: 'Uno de los valores enviados no tiene un formato valido' },
  // invalid_datetime_format / datetime_field_overflow
  '22007': { status: 400, message: 'La fecha u hora enviada no es valida' },
  '22008': { status: 400, message: 'La fecha u hora enviada no es valida' },
  // unique_violation
  '23505': { status: 409, message: 'Ya existe un registro con esos datos' },
  // foreign_key_violation
  '23503': { status: 409, message: 'La operacion hace referencia a datos que no existen o estan en uso' }
};

function sendUnexpectedError(res, error, defaultMessage) {
  const known = POSTGRES_ERROR_RESPONSES[error?.code];

  if (known) {
    return res.status(known.status).json({ success: false, message: known.message });
  }

  console.error(defaultMessage, error);
  return res.status(500).json({ success: false, message: defaultMessage });
}

module.exports = { sendUnexpectedError, POSTGRES_ERROR_RESPONSES };
