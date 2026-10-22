class CartError extends Error {
  constructor(message, status = 400, code = 'CART_ERROR') {
    super(message);
    this.name = 'CartError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { CartError };
