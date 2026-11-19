/// <reference types="vite/client" />

declare module 'vue' {
  interface GlobalDirectives {
    vDialog: typeof import('./src/lib/dialog').vDialog
  }
}

declare global {
  interface ImportMetaEnv {
    // "true" muestra las opciones de la tienda (Fase 2) en los menus.
    readonly VITE_ENABLE_STORE?: string
  }
}

export {}
