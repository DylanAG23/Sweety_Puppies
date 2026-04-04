class AppointmentError extends Error {
  constructor(message, status = 400, code = 'APPOINTMENT_ERROR') {
    super(message);
    this.name = 'AppointmentError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AppointmentError };
