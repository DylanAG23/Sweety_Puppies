const jwt = require('jsonwebtoken');

class JwtTokenService {
  // `secretProvider` es una funcion para leer el secreto al firmar
  // (y no al cargar el modulo).
  constructor(secretProvider) {
    this.secretProvider = typeof secretProvider === 'function' ? secretProvider : () => secretProvider;
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
      this.secretProvider(),
      { expiresIn: '24h', algorithm: 'HS256' }
    );
  }
}

module.exports = { JwtTokenService };
