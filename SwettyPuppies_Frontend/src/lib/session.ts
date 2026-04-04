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
const SESSION_REQUEST_KEY = 'sweetyPuppiesSessionRequest'
const SESSION_RESPONSE_KEY = 'sweetyPuppiesSessionResponse'
const sessionStorageRef = window.sessionStorage
const legacyStorageRef = window.localStorage
let sessionSyncInitialized = false

function readStoredSession() {
  return sessionStorageRef.getItem(SESSION_KEY)
}

function removeLegacySession() {
  legacyStorageRef.removeItem(SESSION_KEY)
}

export function getSession(): SessionData | null {
  ensureSessionSync()
  const raw = readStoredSession()
  if (!raw) {
    removeLegacySession()
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
  sessionStorageRef.removeItem(SESSION_KEY)
  removeLegacySession()
}

export function setSession(token: string, userData: SessionUser) {
  ensureSessionSync()
  const sessionData: SessionData = {
    token,
    userData,
    timestamp: Date.now(),
  }

  sessionStorageRef.setItem(SESSION_KEY, JSON.stringify(sessionData))
  removeLegacySession()
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

export async function hydrateSessionFromLiveTab(timeoutMs = 400) {
  ensureSessionSync()

  if (getSession()) {
    return
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('storage', handleStorage)
      resolve()
    }, timeoutMs)

    function handleStorage(event: StorageEvent) {
      if (event.key !== SESSION_RESPONSE_KEY || !event.newValue) {
        return
      }

      try {
        const payload = JSON.parse(event.newValue) as {
          requestId: string
          sessionData: SessionData
        }

        if (payload.requestId !== requestId || !payload.sessionData) {
          return
        }

        sessionStorageRef.setItem(SESSION_KEY, JSON.stringify(payload.sessionData))
        legacyStorageRef.removeItem(SESSION_RESPONSE_KEY)
      } catch (error) {
        console.error('No se pudo sincronizar la sesion entre pestanas:', error)
      } finally {
        window.clearTimeout(timeout)
        window.removeEventListener('storage', handleStorage)
        resolve()
      }
    }

    window.addEventListener('storage', handleStorage)
    legacyStorageRef.setItem(
      SESSION_REQUEST_KEY,
      JSON.stringify({
        requestId,
        timestamp: Date.now(),
      })
    )
    legacyStorageRef.removeItem(SESSION_REQUEST_KEY)
  })
}

function ensureSessionSync() {
  if (sessionSyncInitialized) {
    return
  }

  sessionSyncInitialized = true

  window.addEventListener('storage', (event) => {
    if (event.key !== SESSION_REQUEST_KEY || !event.newValue) {
      return
    }

    const session = getSessionSnapshot()
    if (!session) {
      return
    }

    try {
      const payload = JSON.parse(event.newValue) as { requestId: string }
      if (!payload?.requestId) {
        return
      }

      legacyStorageRef.setItem(
        SESSION_RESPONSE_KEY,
        JSON.stringify({
          requestId: payload.requestId,
          sessionData: session,
        })
      )
    } catch (error) {
      console.error('No se pudo responder la sesion compartida:', error)
    }
  })
}

function getSessionSnapshot(): SessionData | null {
  const raw = readStoredSession()
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
    clearSession()
    return null
  }
}
