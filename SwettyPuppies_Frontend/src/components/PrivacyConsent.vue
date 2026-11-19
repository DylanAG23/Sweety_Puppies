<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet } from '@/lib/api'
import { vDialogFocus } from '@/lib/dialogFocus'
defineProps<{ modelValue: boolean; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; version: [value: string] }>()
const policy = ref<{ title: string; version: string; paragraphs: string[] } | null>(null)
const open = ref(false), error = ref(''), loading = ref(false)
async function load() {
  loading.value = true
  error.value = ''
  try {
    policy.value = await apiGet('/api/politica-datos')
    emit('version', policy.value!.version)
  } catch {
    error.value = 'No pudimos cargar la política. Reintenta para continuar.'
  } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="privacy-consent">
    <div class="privacy-heading"><strong>Tu información personal</strong>
      <button v-if="policy" type="button" class="privacy-link" @click="open = true">Leer política de datos ↗</button>
    </div>
    <p class="privacy-caption">Usamos tus datos para gestionar tu cuenta, tus citas y tus compras. Esta autorización no incluye publicidad.</p>
    <p v-if="loading" role="status">Cargando política…</p>
    <div v-if="error" role="alert">{{ error }} <button type="button" class="privacy-link" @click="load">Reintentar</button></div>
    <label class="privacy-check">
      <input type="checkbox" required :checked="modelValue" :disabled="disabled || !policy || loading" @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
      <span>He leído la política y autorizo el tratamiento de mis datos personales para gestionar mi cuenta, citas y compras.</span>
    </label>
    <Teleport to="body">
      <div v-if="open && policy" v-dialog-focus class="privacy-overlay" @keydown.esc.stop="open = false" @click.self="open = false">
        <section role="dialog" aria-modal="true" aria-labelledby="privacy-title" class="privacy-dialog">
          <header><h2 id="privacy-title">{{ policy.title }}</h2><button type="button" class="privacy-close" @click="open = false">Cerrar</button></header>
          <div class="privacy-document" tabindex="0" aria-label="Contenido completo de la política">
            <template v-for="(paragraph, i) in policy.paragraphs" :key="i">
              <h3 v-if="/^\d+\. /.test(paragraph)">{{ paragraph }}</h3>
              <p v-else>{{ paragraph }}</p>
            </template>
          </div>
          <footer>Vigente desde el 18 de noviembre de 2026. Puedes cerrar esta ventana y marcar la casilla para aceptar.</footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.privacy-consent { grid-column: 1 / -1; border: 1px solid var(--sp-line, #dccddd); border-radius: 16px; padding: 18px; background: var(--sp-bg, #faf7fb); color: var(--sp-ink, #292133); }
.privacy-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.privacy-link { padding: 6px 0; border: 0; background: transparent; color: var(--sp-link-text, #811366); text-decoration: underline; font: inherit; cursor: pointer; }
.privacy-caption { margin: 10px 0 16px; font-size: .88rem; line-height: 1.6; }
.privacy-check { display: flex; align-items: flex-start; gap: 12px; line-height: 1.6; font-size: .9rem; cursor: pointer; }
.privacy-check input { flex: 0 0 20px; width: 20px; height: 20px; margin: 3px 0 0; accent-color: var(--sp-primary, #811366); }
.privacy-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 16px; background: #100a20b3; }
.privacy-dialog { width: min(760px, 100%); max-height: 90dvh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--sp-line, #dccddd); border-radius: 20px; background: var(--sp-surface, #fff); color: var(--sp-ink, #292133); box-shadow: 0 24px 70px #0005; }
.privacy-dialog header { display: flex; align-items: flex-start; gap: 16px; padding: 22px; border-bottom: 1px solid var(--sp-line, #dccddd); }
.privacy-dialog h2 { margin: 0; flex: 1; font-size: 1.15rem; line-height: 1.5; }
.privacy-close { border: 1px solid var(--sp-line, #dccddd); border-radius: 10px; padding: 10px 14px; background: var(--sp-bg, #faf7fb); color: inherit; cursor: pointer; }
.privacy-document { padding: 0 24px 20px; overflow-y: auto; overscroll-behavior: contain; line-height: 1.75; }
.privacy-document h3 { font-size: 1rem; margin-top: 24px; }
.privacy-dialog footer { padding: 14px 22px; font-size: .8rem; border-top: 1px solid var(--sp-line, #dccddd); }
.privacy-link:focus-visible, .privacy-close:focus-visible, .privacy-check input:focus-visible { outline: 3px solid var(--sp-mint, #37bea7); outline-offset: 3px; }
</style>
