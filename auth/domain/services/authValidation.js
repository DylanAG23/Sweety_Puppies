const { AuthError } = require('../errors/AuthError');

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function sanitizeText(value = '') {
  return String(value).trim();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegistrationInput(data) {
  const nombre = sanitizeText(data.nombre);
  const apellido = sanitizeText(data.apellido);
  const cedula = sanitizeText(data.cedula);
  const telefono = sanitizeText(data.telefono);
  const email = normalizeEmail(data.email);
  const password = String(data.password || '');
  const confirmPassword = String(data.confirmPassword || '');

  if (!nombre || !apellido || !cedula || !telefono || !email || !password || !confirmPassword) {
    throw new AuthError('Todos los campos son obligatorios', 400);
  }

  if (!validateEmail(email)) {
    throw new AuthError('El correo electrónico no es válido', 400);
  }

  if (password.length < 8) {
    throw new AuthError('La contraseña debe tener al menos 8 caracteres', 400);
  }

  if (password !== confirmPassword) {
    throw new AuthError('Las contraseñas no coinciden', 400);
  }

  return { nombre, apellido, cedula, telefono, email, password };
}

function validateLoginInput({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const rawPassword = String(password || '');

  if (!normalizedEmail || !rawPassword) {
    throw new AuthError('Correo y contraseña son obligatorios', 400);
  }

  return { email: normalizedEmail, password: rawPassword };
}

function validateVerificationInput({ email, codigo }) {
  const normalizedEmail = normalizeEmail(email);
  const cleanCode = sanitizeText(codigo);

  if (!normalizedEmail || !cleanCode) {
    throw new AuthError('El correo y el código son obligatorios', 400);
  }

  return { email: normalizedEmail, codigo: cleanCode };
}

function validateRecoveryInput({ email }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !validateEmail(normalizedEmail)) {
    throw new AuthError('Debes indicar un correo válido', 400);
  }

  return { email: normalizedEmail };
}

function validatePasswordResetInput({ email, codigo, password, confirmPassword }) {
  const normalizedEmail = normalizeEmail(email);
  const cleanCode = sanitizeText(codigo);
  const rawPassword = String(password || '');
  const rawConfirmPassword = String(confirmPassword || '');

  if (!normalizedEmail || !validateEmail(normalizedEmail)) {
    throw new AuthError('Debes indicar un correo valido', 400);
  }

  if (!cleanCode) {
    throw new AuthError('Debes escribir el codigo de recuperacion', 400);
  }

  if (!rawPassword || !rawConfirmPassword) {
    throw new AuthError('Debes escribir y confirmar la nueva contrasena', 400);
  }

  if (rawPassword.length < 8) {
    throw new AuthError('La contrasena debe tener al menos 8 caracteres', 400);
  }

  if (rawPassword !== rawConfirmPassword) {
    throw new AuthError('Las contrasenas no coinciden', 400);
  }

  return {
    email: normalizedEmail,
    codigo: cleanCode,
    password: rawPassword
  };
}

module.exports = {
  normalizeEmail,
  validateRegistrationInput,
  validateLoginInput,
  validateVerificationInput,
  validateRecoveryInput,
  validatePasswordResetInput
};
