const { sendVerificationEmail } = require('../../../services/emailService');

class EmailNotificationService {
  async sendVerificationCode({ email, codigo, tipo }) {
    return sendVerificationEmail({ email, codigo, tipo });
  }
}

module.exports = { EmailNotificationService };
