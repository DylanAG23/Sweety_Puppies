class AdminAgendaError extends Error {
  constructor(message, status = 400, code = 'ADMIN_AGENDA_ERROR') {
    super(message);
    this.name = 'AdminAgendaError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AdminAgendaError };
