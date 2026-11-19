class AdminServiceError extends Error {
  constructor(message, status = 400, code = 'ADMIN_SERVICE_ERROR') {
    super(message);
    this.name = 'AdminServiceError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AdminServiceError };
