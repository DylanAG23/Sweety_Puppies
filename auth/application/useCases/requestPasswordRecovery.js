async function requestPasswordRecovery(dependencies, payload) {
  const { authRepository, notificationService, verificationCodeService, validation } = dependencies;
  const { email } = validation.validateRecoveryInput(payload);

  const userExists = await authRepository.userExistsByEmail(email);
  if (!userExists) {
    return {
      message:
        'Si el correo existe, enviaremos un código de recuperación. El restablecimiento final quedará para el siguiente paso.'
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
    message:
      'Solicitud de recuperación registrada. El cambio de contraseña final queda preparado para implementarse en el siguiente paso.',
    developmentCode: emailResult.previewCode || null
  };
}

module.exports = { requestPasswordRecovery };
