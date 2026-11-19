const { AuthError } = require('../../domain/errors/AuthError');
const { policy } = require('../../../shared/legal/consent');

async function verifyRegistrationCode(dependencies, payload) {
  const { authRepository, validation } = dependencies;
  const { email, codigo } = validation.validateVerificationInput(payload);

  return authRepository.transaction(async (transaction) => {
    // El código y su autorización se verifican dentro de la misma transacción
    // que crea la cuenta, para no usar un código invalidado por un reenvío.
    const verification = await transaction.lockRegistrationCode({ email, codigo });

    if (!verification) {
      throw new AuthError('El código es inválido o ya expiró', 400);
    }

    const pendingData = verification.payload || {};
    if (pendingData.consentimiento_datos?.aceptado !== true ||
        pendingData.consentimiento_datos.version !== policy.version ||
        pendingData.consentimiento_datos.sha256 !== policy.sha256) {
      throw new AuthError('Vuelve al registro y acepta la política de datos vigente para solicitar otro código', 400);
    }

    await transaction.ensureNoDuplicateUser({
      email,
      cedula: pendingData.cedula,
      excludeVerificationId: verification.id
    });

    const usuario = await transaction.createUser({
      email,
      passwordHash: pendingData.passwordHash,
      rol: 'cliente'
    });

    const cliente = await transaction.createClient({
      usuarioId: usuario.id,
      nombre: pendingData.nombre,
      apellido: pendingData.apellido,
      cedula: pendingData.cedula,
      telefono: pendingData.telefono
    });

    await transaction.markVerificationCodeAsUsed(verification.id, usuario.id);

    return {
      message: 'Tu correo fue verificado correctamente. Ya puedes iniciar sesión.',
      usuario,
      cliente
    };
  });
}

module.exports = { verifyRegistrationCode };
