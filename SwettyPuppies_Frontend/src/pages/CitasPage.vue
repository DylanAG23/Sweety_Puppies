<script setup lang="ts">
import LegacyPageView from '@/components/LegacyPageView.vue'
import rawHtml from '../../citas.html?raw'
</script>

<template>
  <LegacyPageView :raw-html="rawHtml" :scripts="['/js/session.js', '/js/citas_front.js']" :requires-auth="true" />
</template>
