class AdminPetError extends Error {
  constructor(message, status = 400, code = 'ADMIN_PET_ERROR') {
    super(message);
    this.name = 'AdminPetError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AdminPetError };
