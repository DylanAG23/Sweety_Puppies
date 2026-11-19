require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { loginUser } = require('../auth/application/useCases/loginUser');
const { AuthError } = require('../auth/domain/errors/AuthError');
const validation = require('../auth/domain/services/authValidation');
const { BcryptHashService } = require('../auth/infrastructure/services/BcryptHashService');
const { JwtTokenService } = require('../auth/infrastructure/services/JwtTokenService');

const SECRET = 'secreto-de-la-prueba';
const hashService = new BcryptHashService(4);

async function buildDependencies(userRow) {
  return {
    authRepository: {
      findUserForLogin: async (email) => (userRow && userRow.email === email ? userRow : null)
    },
    hashService,
    tokenService: new JwtTokenService(() => SECRET),
    validation
  };
}

async function userWith(overrides = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'laura@example.com',
    rol: 'cliente',
    activo: true,
    nombre: 'Laura',
    apellido: 'Gomez',
    cliente_id: '22222222-2222-2222-2222-222222222222',
    administrador_id: null,
    password_hash: await hashService.hash('MiClave123'),
    ...overrides
  };
}

test('login correcto devuelve un JWT valido y redirige segun el rol', async () => {
  const dependencies = await buildDependencies(await userWith());
  const result = await loginUser(dependencies, { email: 'laura@example.com', password: 'MiClave123' });

  assert.equal(result.redirectTo, '/cliente');
  assert.equal(result.user.clienteId, '22222222-2222-2222-2222-222222222222');

  const payload = jwt.verify(result.token, SECRET);
  assert.equal(payload.rol, 'cliente');
  assert.equal(payload.sub, '11111111-1111-1111-1111-111111111111');
});

test('una administradora es redirigida al panel administrativo', async () => {
  const dependencies = await buildDependencies(await userWith({ rol: 'administrador', administrador_id: 'adm-1' }));
  const result = await loginUser(dependencies, { email: 'laura@example.com', password: 'MiClave123' });
  assert.equal(result.redirectTo, '/admin');
});

test('contrasena incorrecta responde 401 sin revelar que el correo existe', async () => {
  const dependencies = await buildDependencies(await userWith());
  await assert.rejects(
    loginUser(dependencies, { email: 'laura@example.com', password: 'otra-clave' }),
    (error) => error instanceof AuthError && error.status === 401 && /incorrectos/.test(error.message)
  );
});

test('correo inexistente responde el mismo 401', async () => {
  const dependencies = await buildDependencies(await userWith());
  await assert.rejects(
    loginUser(dependencies, { email: 'nadie@example.com', password: 'MiClave123' }),
    (error) => error instanceof AuthError && error.status === 401 && /incorrectos/.test(error.message)
  );
});

test('un usuario inactivo no puede iniciar sesion', async () => {
  const dependencies = await buildDependencies(await userWith({ activo: false }));
  await assert.rejects(
    loginUser(dependencies, { email: 'laura@example.com', password: 'MiClave123' }),
    (error) => error instanceof AuthError && error.status === 403
  );
});

test('datos incompletos se rechazan antes de consultar el repositorio', async () => {
  let consulted = false;
  const dependencies = await buildDependencies(null);
  dependencies.authRepository.findUserForLogin = async () => {
    consulted = true;
    return null;
  };

  await assert.rejects(loginUser(dependencies, { email: '', password: '' }), AuthError);
  assert.equal(consulted, false);
});
