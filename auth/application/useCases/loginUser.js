const { AuthError } = require('../../domain/errors/AuthError');

function buildUserProfile(userRow) {
  return {
    id: userRow.id,
    email: userRow.email,
    rol: userRow.rol,
    nombre: userRow.nombre || '',
    apellido: userRow.apellido || '',
    clienteId: userRow.cliente_id || null,
    administradorId: userRow.administrador_id || null
  };
}

async function loginUser(dependencies, payload) {
  const { authRepository, hashService, tokenService, validation } = dependencies;
  const { email, password } = validation.validateLoginInput(payload);

  const userRow = await authRepository.findUserForLogin(email);

  if (!userRow) {
    throw new AuthError('Correo o contraseña incorrectos', 401);
  }

  if (!userRow.activo) {
    throw new AuthError('Tu usuario está inactivo', 403);
  }

  const passwordMatches = await hashService.compare(password, userRow.password_hash);
  if (!passwordMatches) {
    throw new AuthError('Correo o contraseña incorrectos', 401);
  }

  const user = buildUserProfile(userRow);
  const redirectTo = user.rol === 'administrador' ? '/admin' : '/cliente';
  const token = tokenService.sign(user);

  return {
    message: 'Inicio de sesión exitoso',
    token,
    user,
    redirectTo
  };
}

module.exports = { loginUser };
