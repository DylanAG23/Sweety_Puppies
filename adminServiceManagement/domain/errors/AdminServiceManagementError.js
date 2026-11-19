class AdminServiceManagementError extends Error {
  constructor(message, status = 400, code = 'ADMIN_SERVICE_MANAGEMENT_ERROR') {
    super(message);
    this.name = 'AdminServiceManagementError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AdminServiceManagementError };
