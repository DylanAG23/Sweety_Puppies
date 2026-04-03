const jwt = require('jsonwebtoken');

class JwtTokenService {
  constructor(secret) {
    this.secret = secret;
  }

  sign(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        rol: user.rol,
        clienteId: user.clienteId,
        administradorId: user.administradorId
      },
      this.secret,
      { expiresIn: '24h' }
    );
  }
}

module.exports = { JwtTokenService };
