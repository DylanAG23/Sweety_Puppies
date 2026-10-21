<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { logoutToLogin, requireRole } from '@/lib/session'
import ClientSiteHeader from '@/components/ClientSiteHeader.vue'

const props = defineProps<{
  title: string
  description: string
}>()

const currentPath = window.location.pathname.toLowerCase()

const subtitle = computed(() => `${props.description} Este espacio ya queda preparado para integrar la logica completa despues.`)

onMounted(() => {
  document.body.className = 'cliente-portal-body'
  requireRole('cliente')
})
</script>

<template>
  <main class="placeholder-page">
    <ClientSiteHeader :current-path="currentPath" />

    <section class="placeholder-card">
      <span class="placeholder-pill">Modulo en preparacion</span>
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
      <div class="placeholder-actions">
        <a href="/cliente" class="btn-secundario">Volver al portal</a>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.placeholder-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.placeholder-card {
  max-width: 620px;
  padding: 36px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 26px 60px rgba(204, 115, 174, 0.12);
  border: 1px solid rgba(255, 215, 237, 0.88);
  text-align: center;
}

.placeholder-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff0f8;
  color: var(--sp-primary-strong);
  font-weight: 700;
  font-size: 0.86rem;
  margin-bottom: 14px;
}

.placeholder-card h1 {
  margin: 0 0 12px;
  color: var(--sp-primary);
}

.placeholder-card p {
  color: var(--sp-muted);
  line-height: 1.7;
}

.placeholder-actions {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

@media (max-width: 640px) {
  .placeholder-card {
    padding: 24px;
    border-radius: 24px;
  }

  .placeholder-actions {
    flex-direction: column;
  }
}
</style>
