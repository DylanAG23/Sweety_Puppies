import { readonly, ref } from 'vue'

type Theme = 'light' | 'dark'
const currentTheme = ref<Theme>(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
export const theme = readonly(currentTheme)
export function setTheme(value: Theme) {
  currentTheme.value = value
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'dark' ? '#15131e' : '#8f176e')
  try { localStorage.setItem('sweety-theme', value) } catch { /* Preference remains active for this tab. */ }
}
export function toggleTheme() { setTheme(currentTheme.value === 'dark' ? 'light' : 'dark') }
