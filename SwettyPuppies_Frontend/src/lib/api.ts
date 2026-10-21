import { getSession, logoutToLogin } from './session'

// Cliente HTTP unico del frontend. Toda llamada a la API pasa por aqui:
// el frontend nunca consulta Supabase directamente.

const NETWORK_ERROR_MESSAGE = 'No pudimos conectar con el servidor. Revisa tu conexion e intenta de nuevo.'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  json?: unknown
  formData?: FormData
}

function buildHeaders(options: RequestOptions) {
  const session = getSession()
  const headers: Record<string, string> = {}

  if (session) {
    headers.Authorization = `Bearer ${session.token}`
  }

  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  return { headers, hadSession: Boolean(session) }
}

async function send(url: string, options: RequestOptions) {
  const { headers, hadSession } = buildHeaders(options)

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.formData ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
    })

    return { response, hadSession }
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE)
  }
}

// Solo se cierra la sesion si la peticion iba autenticada: un 401/403 en el
// login (por ejemplo, usuario inactivo) debe mostrarse como mensaje normal.
function handleExpiredSession(response: Response, hadSession: boolean, message?: string) {
  if (hadSession && (response.status === 401 || response.status === 403)) {
    logoutToLogin()
    throw new Error(message || 'Tu sesion expiro. Inicia sesion de nuevo.')
  }
}

async function request<T>(url: string, options: RequestOptions, fallbackMessage: string): Promise<T> {
  const { response, hadSession } = await send(url, options)
  const data = await response.json().catch(() => ({}))

  handleExpiredSession(response, hadSession, data.message)

  if (response.status === 429) {
    throw new Error(data.message || 'Demasiados intentos. Espera unos minutos.')
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || fallbackMessage)
  }

  return data as T
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET' }, 'Error al cargar la informacion')
}

export function apiPost<T>(url: string, payload: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', json: payload }, 'Error al enviar la informacion')
}

export function apiPatch<T>(url: string, payload: unknown): Promise<T> {
  return request<T>(url, { method: 'PATCH', json: payload }, 'Error al guardar la informacion')
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' }, 'Error al eliminar la informacion')
}

export function apiForm<T>(url: string, method: 'POST' | 'PATCH', formData: FormData): Promise<T> {
  return request<T>(url, { method, formData }, 'Error al enviar la informacion')
}

// Descarga un archivo (por ejemplo, un PDF) autenticado y lo guarda con el nombre indicado.
export async function apiDownload(url: string, fileName: string, fallbackMessage = 'No se pudo descargar el archivo') {
  const { response, hadSession } = await send(url, { method: 'GET' })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    handleExpiredSession(response, hadSession, data.message)
    throw new Error(data.message || fallbackMessage)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
