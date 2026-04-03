<script setup lang="ts">
import LegacyPageView from '@/components/LegacyPageView.vue'
import rawHtml from '../../login.html?raw'
</script>

<template>
  <LegacyPageView :raw-html="rawHtml" :scripts="['/js/session.js', '/js/login_front.js']" />
</template>
