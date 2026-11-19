const bcrypt = require('bcrypt');

class BcryptHashService {
  constructor(rounds = 10) {
    this.rounds = rounds;
  }

  async hash(value) {
    return bcrypt.hash(value, this.rounds);
  }

  async compare(rawValue, hashedValue) {
    return bcrypt.compare(rawValue, hashedValue);
  }
}

module.exports = { BcryptHashService };
