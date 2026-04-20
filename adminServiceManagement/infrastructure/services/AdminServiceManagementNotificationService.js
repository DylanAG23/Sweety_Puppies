const {
  sendAppointmentStatusEmail,
  sendAppointmentCancellationEmail
} = require('../../../services/emailService');

function extractEmailFromMailFrom(mailFrom) {
  const match = String(mailFrom || '').match(/<([^>]+)>/);
  return match ? match[1] : mailFrom || null;
}

class AdminServiceManagementNotificationService {
  getAdministrativeEmail() {
    return process.env.MAIL_USER || extractEmailFromMailFrom(process.env.MAIL_FROM) || 'sweetypuppies01@gmail.com';
  }

  async notifyAppointmentConfirmed({ email, appointment, flowType }) {
    return sendAppointmentStatusEmail({
      email,
      status: 'confirmada',
      appointment,
      flowType
    });
  }

  async notifyAppointmentCancelled({ email, appointment, flowType, cancellationReason, cancelledBy = 'administracion' }) {
    const tasks = [];
    const businessEmail = this.getAdministrativeEmail();

    if (email) {
      tasks.push(
        sendAppointmentCancellationEmail({
          email,
          appointment,
          flowType,
          cancellationReason,
          cancelledBy,
          recipientRole: 'cliente'
        })
      );
    }

    if (businessEmail) {
      tasks.push(
        sendAppointmentCancellationEmail({
          email: businessEmail,
          appointment,
          flowType,
          cancellationReason,
          cancelledBy,
          recipientRole: 'negocio'
        })
      );
    }

    return Promise.allSettled(tasks);
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
