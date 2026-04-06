class PortalContentError extends Error {
  constructor(message, status = 400, code = 'PORTAL_CONTENT_ERROR') {
    super(message);
    this.name = 'PortalContentError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { PortalContentError };
