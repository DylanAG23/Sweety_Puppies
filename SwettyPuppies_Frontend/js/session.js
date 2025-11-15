// Sistema de gestión de sesiones usando localStorage

class SessionManager {
    constructor() {
        this.sessionKey = 'sweetyPuppiesSession';
    }

    // Establecer sesión después del login exitoso
    setSession(token, userData) {
        const sessionData = {
            token: token,
            userData: userData,
            timestamp: Date.now()
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }

    // Verificar si hay una sesión activa
    isLoggedIn() {
        const sessionData = localStorage.getItem(this.sessionKey);
        if (!sessionData) {
            return false;
        }

        try {
            const session = JSON.parse(sessionData);
            // Verificar si la sesión no ha expirado (opcional, por ejemplo 24 horas)
            const expirationTime = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
            if (Date.now() - session.timestamp > expirationTime) {
                this.clearSession();
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            this.clearSession();
            return false;
        }
    }

    // Obtener datos de la sesión
    getSessionData() {
        const sessionData = localStorage.getItem(this.sessionKey);
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch (error) {
                console.error('Error al obtener datos de sesión:', error);
                return null;
            }
        }
        return null;
    }

    // Limpiar sesión (logout)
    clearSession() {
        localStorage.removeItem(this.sessionKey);
    }

    // Redirigir a login si no hay sesión
    checkAndRedirect() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
        }
    }

    // Logout y redirigir
    logout() {
        this.clearSession();
        window.location.href = 'login.html';
    }
}

// Instancia global del session manager
const sessionManager = new SessionManager();

// Función para verificar sesión en páginas protegidas
function checkSession() {
    sessionManager.checkAndRedirect();
}

// Función para hacer logout
function logout() {
    sessionManager.logout();
}