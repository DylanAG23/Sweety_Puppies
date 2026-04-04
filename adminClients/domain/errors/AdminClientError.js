class AdminClientError extends Error {
  constructor(message, status = 400, code = 'ADMIN_CLIENT_ERROR') {
    super(message);
    this.name = 'AdminClientError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AdminClientError };
