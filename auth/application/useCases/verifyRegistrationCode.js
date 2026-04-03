const { AuthError } = require('../../domain/errors/AuthError');

async function verifyRegistrationCode(dependencies, payload) {
  const { authRepository, validation } = dependencies;
  const { email, codigo } = validation.validateVerificationInput(payload);

  const verification = await authRepository.findValidVerificationCode({
    email,
    codigo,
    tipo: 'registro'
  });

  if (!verification) {
    throw new AuthError('El código es inválido o ya expiró', 400);
  }

  const pendingData = verification.payload || {};

  await authRepository.ensureNoDuplicateUser({
    email,
    cedula: pendingData.cedula,
    excludeVerificationId: verification.id
  });

  return authRepository.transaction(async (transaction) => {
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

    await transaction.markVerificationCodeAsUsed(verification.id);

    return {
      message: 'Tu correo fue verificado correctamente. Ya puedes iniciar sesión.',
      usuario,
      cliente
    };
  });
}

module.exports = { verifyRegistrationCode };
