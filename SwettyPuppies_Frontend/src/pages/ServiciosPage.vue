<script setup lang="ts">
import LegacyPageView from '@/components/LegacyPageView.vue'
import rawHtml from '../../servicios.html?raw'
</script>

<template>
  <LegacyPageView :raw-html="rawHtml" :scripts="['/js/session.js', '/js/servicio_front.js']" :requires-auth="true" />
</template>
