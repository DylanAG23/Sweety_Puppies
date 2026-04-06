class SessionManager {
  constructor() {
    this.sessionKey = 'sweetyPuppiesSession';
    this.sessionRequestKey = 'sweetyPuppiesSessionRequest';
    this.sessionResponseKey = 'sweetyPuppiesSessionResponse';
    this.sessionStorageRef = window.sessionStorage;
    this.legacyStorageRef = window.localStorage;
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

    window.addEventListener('storage', (event) => {
      if (event.key !== this.sessionRequestKey || !event.newValue) {
        return;
      }

      const session = this.getSessionSnapshot();
      if (!session) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue);
        if (!payload?.requestId) {
          return;
        }

        this.legacyStorageRef.setItem(
          this.sessionResponseKey,
          JSON.stringify({
            requestId: payload.requestId,
            sessionData: session
          })
        );
      } catch (error) {
        console.error('No se pudo compartir la sesion entre pestanas:', error);
      }
    });
  }

  setSession(token, userData) {
    const sessionData = {
      token,
      userData,
      timestamp: Date.now()
    };

    this.sessionStorageRef.setItem(this.sessionKey, JSON.stringify(sessionData));
    this.legacyStorageRef.removeItem(this.sessionKey);
  }

  getSessionData() {
    const sessionData = this.sessionStorageRef.getItem(this.sessionKey);
    if (!sessionData) {
      this.legacyStorageRef.removeItem(this.sessionKey);
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

  getSessionSnapshot() {
    const sessionData = this.sessionStorageRef.getItem(this.sessionKey);
    if (!sessionData) {
      return null;
    }

    try {
      const parsed = JSON.parse(sessionData);
      const expirationTime = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > expirationTime) {
        this.clearSession();
        return null;
      }

      return parsed;
    } catch (error) {
      this.clearSession();
      return null;
    }
  }

  clearSession() {
    this.sessionStorageRef.removeItem(this.sessionKey);
    this.legacyStorageRef.removeItem(this.sessionKey);
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
