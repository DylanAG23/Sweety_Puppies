const crypto = require('crypto');

class VerificationCodeService {
  constructor(expirationMinutes = 15) {
    this.expirationMinutes = expirationMinutes;
  }

  generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  buildExpirationDate() {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + this.expirationMinutes);
    return expiration;
  }
}

module.exports = { VerificationCodeService };
