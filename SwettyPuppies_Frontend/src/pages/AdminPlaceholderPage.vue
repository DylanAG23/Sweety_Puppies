<script setup lang="ts">
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import { onMounted, ref } from 'vue'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

defineProps<{
  title: string
  description: string
}>()

const loading = ref(true)
const currentPath = window.location.pathname.toLowerCase()

onMounted(() => {
  document.body.className = 'cliente-portal-body'
  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  loading.value = false
})

function goTo(path: string) {
  navigateTo(path)
}
</script>

<template>
  <main class="admin-placeholder-page">
    <section v-if="loading" class="placeholder-shell state-card">
      <h1>Preparando este modulo...</h1>
      <p>Estamos organizando una vista linda y funcional para el equipo administrativo.</p>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="placeholder-shell hero-card">
        <span class="admin-pill">Modulo en preparacion</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <div class="placeholder-actions">
          <a href="/admin" class="btn-enviar" @click.prevent="goTo('/admin')">Volver al inicio</a>
          <button type="button" class="btn-secundario" @click="logoutToLogin">Cerrar sesion</button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.admin-placeholder-page {
  width: min(1220px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.placeholder-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.state-card,
.hero-card {
  padding: 34px;
}

.admin-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
}

.hero-card h1 {
  margin: 14px 0 12px;
  color: #8f176e;
}

.hero-card p,
.state-card p {
  color: #6e5064;
  line-height: 1.8;
}

.placeholder-actions {
  margin-top: 22px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .admin-placeholder-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .state-card,
  .hero-card {
    padding: 22px;
    border-radius: 24px;
  }

  .placeholder-actions {
    flex-direction: column;
  }
}
</style>
