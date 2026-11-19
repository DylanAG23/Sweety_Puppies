class OrderError extends Error {
  constructor(message, status = 400, code = 'ORDER_ERROR') {
    super(message);
    this.name = 'OrderError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { OrderError };
