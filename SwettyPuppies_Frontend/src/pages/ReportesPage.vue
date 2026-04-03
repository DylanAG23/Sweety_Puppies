<script setup lang="ts">
import LegacyPageView from '@/components/LegacyPageView.vue'
import rawHtml from '../../reportes.html?raw'
</script>

<template>
  <LegacyPageView :raw-html="rawHtml" :scripts="['/js/session.js', '/js/reportes_front.js']" :requires-auth="true" />
</template>
