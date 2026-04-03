<script setup lang="ts">
import LegacyPageView from '@/components/LegacyPageView.vue'
import rawHtml from '@/legacy/admin-home.html?raw'
</script>

<template>
  <LegacyPageView
    :raw-html="rawHtml"
    :scripts="['/js/session.js', '/js/mejoras.js', '/js/servicios-dinamicos.js', '/js/carrusel-dinamico.js']"
    :requires-auth="true"
  />
</template>
