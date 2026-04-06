class AdminReportError extends Error {
  constructor(message, status = 400, code = 'ADMIN_REPORT_ERROR') {
    super(message);
    this.name = 'AdminReportError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AdminReportError };
