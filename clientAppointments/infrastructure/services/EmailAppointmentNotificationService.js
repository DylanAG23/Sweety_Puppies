const jwt = require('jsonwebtoken');
const {
  sendAppointmentRequestEmail,
  sendAppointmentStatusEmail
} = require('../../../services/emailService');
const {
  buildAppointmentEmailViewModel
} = require('../../domain/services/appointmentRules');
const { AppointmentError } = require('../../domain/errors/AppointmentError');

function extractEmailFromMailFrom(mailFrom) {
  const match = String(mailFrom || '').match(/<([^>]+)>/);
  return match ? match[1] : mailFrom || null;
}

class EmailAppointmentNotificationService {
  constructor() {
    this.appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    this.appointmentActionSecret =
      process.env.APPOINTMENT_ACTION_SECRET || process.env.JWT_SECRET || 'sweetypuppies_secret_key';
  }

  getAdministrativeEmail() {
    return process.env.MAIL_USER || extractEmailFromMailFrom(process.env.MAIL_FROM) || 'sweetypuppies01@gmail.com';
  }

  createActionToken(appointmentId, flowType = 'nueva') {
    return jwt.sign(
      {
        citaId: appointmentId,
        scope: 'appointment-review',
        flowType
      },
      this.appointmentActionSecret,
      { expiresIn: '72h' }
    );
  }

  verifyActionToken(token) {
    if (!token) {
      throw new AppointmentError('El enlace de revision esta incompleto', 400, 'INVALID_REVIEW_TOKEN');
    }

    try {
      const payload = jwt.verify(token, this.appointmentActionSecret);

      if (!payload?.citaId || payload.scope !== 'appointment-review') {
        throw new Error('INVALID_SCOPE');
      }

      return {
        ...payload,
        flowType: payload.flowType || 'nueva'
      };
    } catch (error) {
      throw new AppointmentError('El enlace de revision ya no es valido o vencio', 400, 'INVALID_REVIEW_TOKEN');
    }
  }

  async sendAppointmentRequest(appointment, flowType = 'nueva', previousValues = null) {
    const actionToken = this.createActionToken(appointment.id, flowType);
    const reviewUrl = `${this.appBaseUrl}/api/cliente/citas/admin-review?token=${encodeURIComponent(actionToken)}`;
    const confirmUrl = `${this.appBaseUrl}/api/cliente/citas/admin-review/action?token=${encodeURIComponent(actionToken)}&decision=confirmada`;
    const cancelUrl = `${this.appBaseUrl}/api/cliente/citas/admin-review/action?token=${encodeURIComponent(actionToken)}&decision=cancelada`;

    return sendAppointmentRequestEmail({
      email: this.getAdministrativeEmail(),
      reviewUrl,
      confirmUrl,
      cancelUrl,
      appointment: buildAppointmentEmailViewModel(appointment, previousValues || {}),
      flowType
    });
  }

  async sendAppointmentStatusChange(appointment, status, flowType = 'nueva') {
    return sendAppointmentStatusEmail({
      email: appointment.clientEmail,
      status,
      appointment: buildAppointmentEmailViewModel(appointment),
      flowType
    });
  }
}

module.exports = { EmailAppointmentNotificationService };
