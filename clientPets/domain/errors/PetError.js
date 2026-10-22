class PetError extends Error {
  constructor(message, status = 400, code = 'PET_ERROR') {
    super(message);
    this.name = 'PetError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { PetError };
