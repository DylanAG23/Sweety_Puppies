const { initiateCustomerRegistration } = require('./application/useCases/initiateCustomerRegistration');
const { verifyRegistrationCode } = require('./application/useCases/verifyRegistrationCode');
const { loginUser } = require('./application/useCases/loginUser');
const { requestPasswordRecovery } = require('./application/useCases/requestPasswordRecovery');
const { getClientHome } = require('./application/useCases/getClientHome');
const { getAdminHome } = require('./application/useCases/getAdminHome');
const { getClientProfile } = require('./application/useCases/getClientProfile');
const { updateClientProfile } = require('./application/useCases/updateClientProfile');
const { createAuthController } = require('./infrastructure/http/authController');
const { PostgresAuthRepository } = require('./infrastructure/repositories/PostgresAuthRepository');
const { BcryptHashService } = require('./infrastructure/services/BcryptHashService');
const { JwtTokenService } = require('./infrastructure/services/JwtTokenService');
const { VerificationCodeService } = require('./infrastructure/services/VerificationCodeService');
const { EmailNotificationService } = require('./infrastructure/services/EmailNotificationService');
const validation = require('./domain/services/authValidation');

function createAuthModule() {
  const dependencies = {
    authRepository: new PostgresAuthRepository(),
    hashService: new BcryptHashService(10),
    tokenService: new JwtTokenService(process.env.JWT_SECRET || 'sweetypuppies_secret_key'),
    verificationCodeService: new VerificationCodeService(15),
    notificationService: new EmailNotificationService(),
    validation
  };

  const useCases = {
    initiateCustomerRegistration: (payload) => initiateCustomerRegistration(dependencies, payload),
    verifyRegistrationCode: (payload) => verifyRegistrationCode(dependencies, payload),
    loginUser: (payload) => loginUser(dependencies, payload),
    requestPasswordRecovery: (payload) => requestPasswordRecovery(dependencies, payload),
    getClientHome: (sessionUser) => getClientHome(dependencies, sessionUser),
    getAdminHome: (sessionUser) => getAdminHome(dependencies, sessionUser),
    getClientProfile: (sessionUser) => getClientProfile(dependencies, sessionUser),
    updateClientProfile: (sessionUser, payload) => updateClientProfile(dependencies, sessionUser, payload)
  };

  return {
    useCases,
    controller: createAuthController(useCases)
  };
}

module.exports = { createAuthModule };
