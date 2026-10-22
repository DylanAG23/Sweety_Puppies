document.addEventListener('DOMContentLoaded', () => {
  const session = typeof sessionManager !== 'undefined' ? sessionManager.getSessionData() : null;
  const user = session?.userData || {};

  if (user.rol !== 'cliente') {
    window.location.href = '/login';
    return;
  }

  document.getElementById('clienteNombre').textContent = user.nombre || user.email || 'cliente';
  document.getElementById('clienteEmail').textContent = user.email || '-';
  document.getElementById('clienteRol').textContent = user.rol || 'cliente';

  const logoutButton = document.getElementById('logout-btn');
  logoutButton.addEventListener('click', () => logout());
});
