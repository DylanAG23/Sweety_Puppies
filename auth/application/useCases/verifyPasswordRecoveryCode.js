const { AuthError } = require('../../domain/errors/AuthError');

async function verifyPasswordRecoveryCode(dependencies, payload) {
  const { authRepository, validation } = dependencies;
  const { email, codigo } = validation.validateVerificationInput(payload);

  const verification = await authRepository.findValidVerificationCode({
    email,
    codigo,
    tipo: 'recuperacion'
  });

  if (!verification) {
    throw new AuthError('El codigo es invalido o ya expiro', 400);
  }

  return {
    message: 'Codigo verificado correctamente. Ya puedes crear una nueva contrasena.'
  };
}

module.exports = { verifyPasswordRecoveryCode };
