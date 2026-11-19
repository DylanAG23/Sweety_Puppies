const { AuthError } = require('../../domain/errors/AuthError');

async function resetPasswordWithRecoveryCode(dependencies, payload) {
  const { authRepository, hashService, validation } = dependencies;
  const { email, codigo, password } = validation.validatePasswordResetInput(payload);

  const verification = await authRepository.findValidVerificationCode({
    email,
    codigo,
    tipo: 'recuperacion'
  });

  if (!verification) {
    throw new AuthError('El codigo es invalido o ya expiro', 400);
  }

  const passwordHash = await hashService.hash(password);
  const updated = await authRepository.updateUserPasswordByEmail(email, passwordHash);

  if (!updated) {
    throw new AuthError('No encontramos una cuenta activa para actualizar la contrasena', 404);
  }

  await authRepository.markVerificationCodeAsUsed(verification.id);

  return {
    message: 'Tu contrasena fue actualizada correctamente. Ya puedes iniciar sesion.'
  };
}

module.exports = { resetPasswordWithRecoveryCode };
