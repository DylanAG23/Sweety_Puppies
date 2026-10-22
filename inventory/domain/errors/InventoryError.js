class InventoryError extends Error {
  constructor(message, status = 400, code = 'INVENTORY_ERROR') {
    super(message);
    this.name = 'InventoryError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { InventoryError };
