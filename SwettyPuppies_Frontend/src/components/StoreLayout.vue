<script setup lang="ts">
import { onBeforeMount } from 'vue';
import AdminSiteHeader from './AdminSiteHeader.vue';
import ClientSiteHeader from './ClientSiteHeader.vue';
import '../styles/store.css';
defineProps<{ title: string; subtitle?: string; admin?: boolean }>();
const path = window.location.pathname;
onBeforeMount(() => {
  document.body.className = 'cliente-portal-body';
});
</script>
<template>
  <AdminSiteHeader v-if="admin" :current-path="path" /><ClientSiteHeader
    v-else
    :current-path="path"
  />
  <main class="store-page">
    <header class="store-hero">
      <div>
        <span class="store-eyebrow"
          >SWEETY PUPPIES · {{ admin ? 'ADMINISTRACIÓN' : 'TIENDA' }}</span
        >
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <nav v-if="!admin" aria-label="Compras">
        <a href="/cliente/tienda">Catálogo</a><a href="/cliente/carrito">Mi carrito</a
        ><a href="/cliente/pedidos">Mis pedidos</a>
      </nav>
    </header>
    <slot />
  </main>
</template>
