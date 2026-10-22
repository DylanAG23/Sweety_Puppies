type LegacyPageData = {
  bodyClass: string
  content: string
}

type LegacyPageOptions = {
  bodyClass: string
  scripts: string[]
  requiresAuth?: boolean
}

declare global {
  interface Window {
    __legacyScriptPromises?: Record<string, Promise<void>>
    checkSession?: () => boolean
    logout?: () => void
  }
}

const routeMap: Record<string, string> = {
  'login.html': '/login',
  'index.html': '/admin',
  'clientes.html': '/clientes',
  'mascotas.html': '/mascotas',
  'servicios.html': '/servicios',
  'citas.html': '/citas',
  'imagenes.html': '/imagenes',
  'reportes.html': '/reportes',
  'cliente-dashboard.html': '/cliente',
}

export function extractLegacyPage(rawHtml: string): LegacyPageData {
  const bodyMatch = rawHtml.match(/<body([^>]*)>([\s\S]*?)<\/body>/i)
  const bodyAttributes = bodyMatch?.[1] ?? ''
  const bodyClassMatch = bodyAttributes.match(/class=["']([^"']+)["']/i)
  const content = (bodyMatch?.[2] ?? rawHtml).replace(/<script[\s\S]*?<\/script>/gi, '')

  return {
    bodyClass: bodyClassMatch?.[1] ?? '',
    content,
  }
}

export async function initializeLegacyPage(options: LegacyPageOptions) {
  document.body.className = options.bodyClass || ''
  window.scrollTo({ top: 0, behavior: 'auto' })

  for (const scriptPath of options.scripts) {
    await loadLegacyScript(scriptPath)
  }

  document.dispatchEvent(new Event('DOMContentLoaded'))

  if (options.requiresAuth) {
    window.checkSession?.()
    const logoutButton = document.getElementById('logout-btn')
    if (logoutButton && window.logout) {
      logoutButton.addEventListener('click', () => window.logout?.(), { once: true })
    }
  }

  rewriteInternalLinks()
}

export function resetLegacyPage() {
  document.body.className = ''
}

async function loadLegacyScript(scriptPath: string) {
  window.__legacyScriptPromises ??= {}

  if (!window.__legacyScriptPromises[scriptPath]) {
    window.__legacyScriptPromises[scriptPath] = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[data-legacy-script="${scriptPath}"]`) as HTMLScriptElement | null
      if (existing) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = scriptPath
      script.async = false
      script.dataset.legacyScript = scriptPath
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`No se pudo cargar ${scriptPath}`))
      document.body.appendChild(script)
    })
  }

  return window.__legacyScriptPromises[scriptPath]
}

function rewriteInternalLinks() {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))

  anchors.forEach((anchor) => {
    const href = anchor.getAttribute('href')
    if (!href) {
      return
    }

    const normalized = routeMap[href]
    if (normalized) {
      anchor.setAttribute('href', normalized)
    }
  })
}
