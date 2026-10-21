import type { Directive } from 'vue'

// Directiva `v-dialog="cerrar"` para los modales existentes:
// - agrega role="dialog" y aria-modal, y lo nombra con su primer titulo
// - mueve el foco al dialogo y lo mantiene dentro mientras esta abierto (Tab)
// - cierra con Escape llamando a la funcion recibida
// - al cerrarse devuelve el foco al elemento que lo abrio

type DialogElement = HTMLElement & {
  __spDialog?: {
    onKeydown: (event: KeyboardEvent) => void
    previousFocus: Element | null
    close?: () => void
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let dialogCounter = 0

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  )
}

export const vDialog: Directive<DialogElement, (() => void) | undefined> = {
  mounted(element, binding) {
    const state: NonNullable<DialogElement['__spDialog']> = {
      previousFocus: document.activeElement,
      close: binding.value,
      onKeydown: (event: KeyboardEvent) => {
        if (event.key === 'Escape' && state.close) {
          event.stopPropagation()
          state.close()
          return
        }

        if (event.key !== 'Tab') {
          return
        }

        const items = focusableElements(element)
        if (!items.length) {
          event.preventDefault()
          return
        }

        const first = items[0]
        const last = items[items.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      },
    }

    element.__spDialog = state
    element.setAttribute('role', 'dialog')
    element.setAttribute('aria-modal', 'true')

    const heading = element.querySelector<HTMLElement>('h1, h2, h3')
    if (heading) {
      dialogCounter += 1
      heading.id ||= `sp-dialog-title-${dialogCounter}`
      element.setAttribute('aria-labelledby', heading.id)
    }

    element.addEventListener('keydown', state.onKeydown)
    document.body.style.overflow = 'hidden'

    // Foco inicial: el primer control que no sea el boton de cerrar.
    requestAnimationFrame(() => {
      const items = focusableElements(element)
      const target = items.find((item) => !item.classList.contains('modal-close')) || items[0]
      if (target) {
        target.focus({ preventScroll: true })
      } else {
        element.setAttribute('tabindex', '-1')
        element.focus({ preventScroll: true })
      }
    })
  },

  updated(element, binding) {
    if (element.__spDialog) {
      element.__spDialog.close = binding.value
    }
  },

  unmounted(element) {
    const state = element.__spDialog
    if (!state) {
      return
    }

    element.removeEventListener('keydown', state.onKeydown)
    if (!document.querySelector('[aria-modal="true"]')) {
      document.body.style.overflow = ''
    }

    if (state.previousFocus instanceof HTMLElement && document.contains(state.previousFocus)) {
      state.previousFocus.focus({ preventScroll: true })
    }
  },
}
