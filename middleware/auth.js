const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'sweetypuppies_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para acceder a este recurso'
    });
  }

  next();
};

module.exports = { authenticateToken, authorizeRoles };
