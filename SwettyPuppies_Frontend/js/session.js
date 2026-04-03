class SessionManager {
  constructor() {
    this.sessionKey = 'sweetyPuppiesSession';
    this.adminRoutes = new Set([
      '/admin',
      '/index.html',
      '/clientes',
      '/clientes.html',
      '/mascotas',
      '/mascotas.html',
      '/servicios',
      '/servicios.html',
      '/citas',
      '/citas.html',
      '/imagenes',
      '/imagenes.html',
      '/reportes',
      '/reportes.html'
    ]);
  }

  setSession(token, userData) {
    const sessionData = {
      token,
      userData,
      timestamp: Date.now()
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
  }

  getSessionData() {
    const sessionData = localStorage.getItem(this.sessionKey);
    if (!sessionData) {
      return null;
    }

    try {
      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Error al leer la sesión:', error);
      this.clearSession();
      return null;
    }
  }

  isLoggedIn() {
    const session = this.getSessionData();
    if (!session) {
      return false;
    }

    const expirationTime = 24 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > expirationTime) {
      this.clearSession();
      return false;
    }

    return true;
  }

  clearSession() {
    localStorage.removeItem(this.sessionKey);
  }

  getHomeByRole(role) {
    return role === 'administrador' ? '/admin' : '/cliente';
  }

  enforcePageAccess() {
    const path = window.location.pathname.toLowerCase();
    const session = this.getSessionData();
    const user = session?.userData;

    if (!user) {
      return true;
    }

    if (path === '/' || path.includes('/login')) {
      window.location.href = this.getHomeByRole(user.rol);
      return false;
    }

    if (this.adminRoutes.has(path) && user.rol !== 'administrador') {
      window.location.href = '/cliente';
      return false;
    }

    if ((path.includes('/cliente') || path.includes('cliente-dashboard')) && user.rol !== 'cliente') {
      window.location.href = '/admin';
      return false;
    }

    return true;
  }

  checkAndRedirect() {
    const path = window.location.pathname.toLowerCase();
    const isPublicAuth = path === '/' || path.includes('/login');

    if (!this.isLoggedIn()) {
      if (!isPublicAuth) {
        window.location.href = '/login';
        return false;
      }

      return true;
    }

    return this.enforcePageAccess();
  }

  logout() {
    this.clearSession();
    window.location.href = '/login';
  }
}

const sessionManager = new SessionManager();

function checkSession() {
  return sessionManager.checkAndRedirect();
}

function logout() {
  sessionManager.logout();
}
