// Mismo mensaje exista o no la cuenta, para no revelar que correos estan registrados.
const RECOVERY_MESSAGE =
  'Si el correo esta registrado, te enviamos un codigo de recuperacion para continuar con el cambio de contrasena.';

async function requestPasswordRecovery(dependencies, payload) {
  const { authRepository, notificationService, verificationCodeService, validation } = dependencies;
  const { email } = validation.validateRecoveryInput(payload);

  const userExists = await authRepository.userExistsByEmail(email);
  if (!userExists) {
    return {
      message: RECOVERY_MESSAGE,
      email,
      developmentCode: null
    };
  }

  const codigo = verificationCodeService.generateCode();
  const expiracion = verificationCodeService.buildExpirationDate();

  await authRepository.invalidatePendingRecoveryCodes(email);
  await authRepository.createRecoveryCode({ email, codigo, expiracion });

  const emailResult = await notificationService.sendVerificationCode({
    email,
    codigo,
    tipo: 'recuperacion'
  });

  return {
    message: RECOVERY_MESSAGE,
    email,
    developmentCode: emailResult.previewCode || null
  };
}

module.exports = { requestPasswordRecovery };
