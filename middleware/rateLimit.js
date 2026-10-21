// Limitador de intentos en memoria (ventana fija). Suficiente para una sola
// instancia del servidor; con varias instancias habria que moverlo a un
// almacenamiento compartido.

function createRateLimiter({ windowMs, max, keyGenerator, message, name = 'limite' }) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  function limiter(req, res, next) {
    const rawKey = keyGenerator(req);

    if (!rawKey) {
      return next();
    }

    const key = `${name}:${rawKey}`;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ success: false, message });
    }

    return next();
  }

  limiter.reset = () => hits.clear();
  return limiter;
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'desconocido';
}

function normalizedEmail(req) {
  const email = req.body?.email;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY_MESSAGE = 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';

// Limites de autenticacion: por IP (frena barridos) y por correo (frena la
// fuerza bruta de contrasenas y de codigos de 6 digitos sobre una cuenta).
const authRateLimits = {
  loginByIp: createRateLimiter({
    name: 'login-ip', windowMs: FIFTEEN_MINUTES, max: 50, keyGenerator: clientIp, message: TOO_MANY_MESSAGE
  }),
  loginByEmail: createRateLimiter({
    name: 'login-email', windowMs: FIFTEEN_MINUTES, max: 10, keyGenerator: normalizedEmail, message: TOO_MANY_MESSAGE
  }),
  codeRequestByIp: createRateLimiter({
    name: 'code-request-ip', windowMs: FIFTEEN_MINUTES, max: 20, keyGenerator: clientIp, message: TOO_MANY_MESSAGE
  }),
  codeRequestByEmail: createRateLimiter({
    name: 'code-request-email', windowMs: FIFTEEN_MINUTES, max: 5, keyGenerator: normalizedEmail, message: TOO_MANY_MESSAGE
  }),
  codeCheckByIp: createRateLimiter({
    name: 'code-check-ip', windowMs: FIFTEEN_MINUTES, max: 50, keyGenerator: clientIp, message: TOO_MANY_MESSAGE
  }),
  codeCheckByEmail: createRateLimiter({
    name: 'code-check-email', windowMs: FIFTEEN_MINUTES, max: 10, keyGenerator: normalizedEmail, message: TOO_MANY_MESSAGE
  })
};

function resetAuthRateLimits() {
  Object.values(authRateLimits).forEach((limiter) => limiter.reset());
}

module.exports = { createRateLimiter, authRateLimits, resetAuthRateLimits };
