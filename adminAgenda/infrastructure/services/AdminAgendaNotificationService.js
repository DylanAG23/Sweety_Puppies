const { sendAppointmentStatusEmail } = require('../../../services/emailService');

class AdminAgendaNotificationService {
  async notifyAppointmentConfirmed({ email, appointment, flowType }) {
    return sendAppointmentStatusEmail({
      email,
      status: 'confirmada',
      appointment,
      flowType
    });
  }
}

module.exports = { AdminAgendaNotificationService };
