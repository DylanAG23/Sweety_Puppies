class CatalogError extends Error {
  constructor(message, status = 400, code = 'CATALOG_ERROR') {
    super(message);
    this.name = 'CatalogError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { CatalogError };
