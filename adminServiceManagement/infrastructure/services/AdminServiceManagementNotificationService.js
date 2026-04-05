const { sendAppointmentStatusEmail } = require('../../../services/emailService');

class AdminServiceManagementNotificationService {
  async notifyAppointmentConfirmed({ email, appointment, flowType }) {
    return sendAppointmentStatusEmail({
      email,
      status: 'confirmada',
      appointment,
      flowType
    });
  }

  async notifyAppointmentCancelled({ email, appointment, flowType }) {
    return sendAppointmentStatusEmail({
      email,
      status: 'cancelada',
      appointment,
      flowType
    });
  }

  async notifyAppointmentStarted({ email, appointment }) {
    return sendAppointmentStatusEmail({
      email,
      status: 'en_atencion',
      appointment,
      flowType: 'nueva'
    });
  }

  async notifyAppointmentCompleted({ email, appointment }) {
    return sendAppointmentStatusEmail({
      email,
      status: 'completada',
      appointment,
      flowType: 'nueva'
    });
  }
}

module.exports = { AdminServiceManagementNotificationService };
