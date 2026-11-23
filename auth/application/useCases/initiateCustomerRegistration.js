const { consentEvidence } = require('../../../shared/legal/consent');
async function initiateCustomerRegistration(dependencies, payload) {
  const { authRepository, hashService, verificationCodeService, notificationService, validation } = dependencies;

  const validated = validation.validateRegistrationInput(payload);
  await authRepository.ensureNoDuplicateUser({ email: validated.email, cedula: validated.cedula, allowPendingEmail: true });

  const passwordHash = await hashService.hash(validated.password);
  const codigo = verificationCodeService.generateCode();
  const expiracion = verificationCodeService.buildExpirationDate();

  await authRepository.invalidatePendingRegistrationCodes(validated.email);
  await authRepository.createPendingRegistration({
    email: validated.email,
    codigo,
    expiracion,
    payload: {
      nombre: validated.nombre,
      apellido: validated.apellido,
      cedula: validated.cedula,
      telefono: validated.telefono,
      passwordHash,
      consentimiento_datos: consentEvidence()
    }
  });

  const emailResult = await notificationService.sendVerificationCode({
    email: validated.email,
    codigo,
    tipo: 'registro'
  });

  return {
    message:
      emailResult.mode === 'local'
        ? 'Codigo generado en modo local para pruebas'
        : emailResult.mode === 'disabled'
          ? 'El registro por correo no esta disponible temporalmente.'
        : 'Te enviamos un código de verificación a tu correo',
    email: validated.email,
    expiresAt: expiracion.toISOString(),
    developmentCode: emailResult.previewCode || null,
    emailDeliveryMode: emailResult.delivered ? 'sent' : 'fallback'
  };
}

module.exports = { initiateCustomerRegistration };
