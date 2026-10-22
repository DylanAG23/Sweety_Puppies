<script setup lang="ts">
import { theme, toggleTheme } from '@/lib/theme'
</script>
<template>
  <button type="button" class="theme-toggle" :aria-label="theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'" :title="theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'" @click="toggleTheme">
    <svg v-if="theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/></svg>
    <span>{{ theme === 'dark' ? 'Modo claro' : 'Modo oscuro' }}</span>
  </button>
</template>
<style scoped>
.theme-toggle{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:44px;min-height:44px;padding:8px 12px;border:1px solid var(--sp-field-border);border-radius:12px;background:var(--sp-surface);color:var(--sp-ink);font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}.theme-toggle:hover{background:var(--sp-surface-muted)}@media(max-width:720px){.theme-toggle{padding:8px}.theme-toggle span{display:none}}
</style>
