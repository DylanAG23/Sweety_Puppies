import { getSession, logoutToLogin } from './session'

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}))

  if (response.status === 401 || response.status === 403) {
    logoutToLogin()
    throw new Error(data.message || 'Tu sesion expiro')
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || fallbackMessage)
  }

  return data as T
}

export async function apiGet<T>(url: string): Promise<T> {
  const session = getSession()

  const response = await fetch(url, {
    headers: session
      ? {
          Authorization: `Bearer ${session.token}`,
        }
      : {},
  })

  return parseApiResponse<T>(response, 'Error al cargar la informacion')
}

export async function apiPatch<T>(url: string, payload: unknown): Promise<T> {
  const session = getSession()

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(session
        ? {
            Authorization: `Bearer ${session.token}`,
          }
        : {}),
    },
    body: JSON.stringify(payload),
  })

  return parseApiResponse<T>(response, 'Error al guardar la informacion')
}

export async function apiDelete<T>(url: string): Promise<T> {
  const session = getSession()

  const response = await fetch(url, {
    method: 'DELETE',
    headers: session
      ? {
          Authorization: `Bearer ${session.token}`,
        }
      : {},
  })

  return parseApiResponse<T>(response, 'Error al eliminar la informacion')
}

export async function apiForm<T>(url: string, method: 'POST' | 'PATCH', formData: FormData): Promise<T> {
  const session = getSession()

  const response = await fetch(url, {
    method,
    headers: session
      ? {
          Authorization: `Bearer ${session.token}`,
        }
      : {},
    body: formData,
  })

  return parseApiResponse<T>(response, 'Error al enviar la informacion')
}
