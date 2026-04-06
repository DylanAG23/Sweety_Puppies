async function requestPasswordRecovery(dependencies, payload) {
  const { authRepository, notificationService, verificationCodeService, validation } = dependencies;
  const { email } = validation.validateRecoveryInput(payload);

  const userExists = await authRepository.userExistsByEmail(email);
  if (!userExists) {
    return {
      message: 'Si el correo existe, enviaremos un codigo de recuperacion para continuar el proceso.',
      email
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
    message: 'Te enviamos un codigo de recuperacion para continuar con el cambio de contrasena.',
    email,
    developmentCode: emailResult.previewCode || null
  };
}

module.exports = { requestPasswordRecovery };
