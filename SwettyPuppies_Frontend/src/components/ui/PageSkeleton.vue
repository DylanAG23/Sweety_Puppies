<script setup lang="ts">
// Esqueleto de carga con la forma de la plataforma (menu lateral + tarjetas).
// El texto queda disponible para lectores de pantalla mediante role="status".
withDefaults(
  defineProps<{
    title?: string
    description?: string
    cards?: number
  }>(),
  {
    title: 'Cargando...',
    description: '',
    cards: 3,
  },
)
</script>

<template>
  <div class="page-skeleton" role="status" aria-live="polite" aria-busy="true">
    <span class="sp-visually-hidden">{{ title }} {{ description }}</span>

    <aside class="page-skeleton-sidebar" aria-hidden="true">
      <span class="page-skeleton-logo"></span>
      <span v-for="item in 6" :key="item" class="page-skeleton-nav"></span>
    </aside>

    <div class="page-skeleton-main" aria-hidden="true">
      <div class="page-skeleton-topbar">
        <span class="sp-skeleton page-skeleton-toggle"></span>
        <span class="sp-skeleton sp-skeleton--text page-skeleton-breadcrumb"></span>
      </div>

      <section class="page-skeleton-hero">
        <p class="page-skeleton-caption">{{ title }}</p>
        <span class="sp-skeleton sp-skeleton--title"></span>
        <span class="sp-skeleton sp-skeleton--text" style="width: 85%"></span>
        <span class="sp-skeleton sp-skeleton--text" style="width: 55%"></span>
      </section>

      <div class="page-skeleton-grid">
        <section v-for="card in cards" :key="card" class="page-skeleton-card">
          <span class="sp-skeleton sp-skeleton--text" style="width: 40%"></span>
          <span class="sp-skeleton page-skeleton-block"></span>
          <span class="sp-skeleton sp-skeleton--text" style="width: 70%"></span>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ocupa toda la ventana mientras carga, sin importar el contenedor de la pagina. */
.page-skeleton {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: var(--platform-sidebar-width) 1fr;
  overflow: hidden;
  background: var(--sp-gradient-page);
}

.page-skeleton-sidebar {
  display: grid;
  align-content: start;
  gap: var(--sp-space-3);
  padding: var(--sp-space-6) var(--sp-space-4);
  background: var(--sp-gradient-sidebar);
}

.page-skeleton-logo {
  width: 76px;
  height: 76px;
  margin-bottom: var(--sp-space-4);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.14);
}

.page-skeleton-nav {
  height: 44px;
  border-radius: var(--sp-radius-sm);
  background: rgba(255, 255, 255, 0.1);
}

.page-skeleton-main {
  display: grid;
  align-content: start;
  gap: var(--sp-space-6);
  min-width: 0;
}

.page-skeleton-topbar {
  display: flex;
  align-items: center;
  gap: var(--sp-space-4);
  min-height: 74px;
  padding: 0 var(--sp-space-6);
  border-bottom: 1px solid var(--sp-line);
  background: rgba(255, 255, 255, 0.96);
}

.page-skeleton-toggle {
  width: 44px;
  height: 44px;
}

.page-skeleton-breadcrumb {
  width: 200px;
}

.page-skeleton-hero,
.page-skeleton-card {
  display: grid;
  gap: var(--sp-space-3);
  padding: var(--sp-space-6);
  border: 1px solid var(--sp-pink-border);
  border-radius: var(--sp-radius-xl);
  background: var(--sp-surface);
  box-shadow: var(--sp-shadow-card-sm);
}

.page-skeleton-hero {
  margin: 0 var(--platform-page-padding);
}

.page-skeleton-caption {
  margin: 0;
  color: var(--sp-primary);
  font-weight: var(--sp-weight-extrabold);
}

.page-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sp-space-6);
  padding: 0 var(--platform-page-padding) var(--sp-space-8);
}

.page-skeleton-card {
  border-radius: var(--sp-radius-card);
}

.page-skeleton-block {
  height: 96px;
}

@media (max-width: 980px) {
  .page-skeleton {
    grid-template-columns: 1fr;
  }

  .page-skeleton-sidebar {
    display: none;
  }
}
</style>
