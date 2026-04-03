export type SessionUser = {
  id: string
  email: string
  rol: string
  nombre?: string
  apellido?: string
  clienteId?: string | null
  administradorId?: string | null
}

type SessionData = {
  token: string
  userData: SessionUser
  timestamp: number
}

const SESSION_KEY = 'sweetyPuppiesSession'
const EXPIRATION_TIME = 24 * 60 * 60 * 1000

export function getSession(): SessionData | null {
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as SessionData
    if (Date.now() - parsed.timestamp > EXPIRATION_TIME) {
      clearSession()
      return null
    }

    return parsed
  } catch (error) {
    console.error('No se pudo leer la sesión:', error)
    clearSession()
    return null
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY)
}

export function logoutToLogin() {
  clearSession()
  window.location.href = '/login'
}

export function requireRole(role: string) {
  const session = getSession()
  if (!session) {
    window.location.href = '/login'
    return null
  }

  if (session.userData.rol !== role) {
    window.location.href = session.userData.rol === 'administrador' ? '/admin' : '/cliente'
    return null
  }

  return session
}
