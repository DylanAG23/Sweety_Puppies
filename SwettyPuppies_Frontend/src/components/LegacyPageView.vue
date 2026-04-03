<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted } from 'vue'
import { extractLegacyPage, initializeLegacyPage, resetLegacyPage } from '@/lib/legacyPage'

const props = withDefaults(defineProps<{
  rawHtml: string
  scripts?: string[]
  requiresAuth?: boolean
}>(), {
  scripts: () => [],
  requiresAuth: false,
})

const page = computed(() => extractLegacyPage(props.rawHtml))

onMounted(async () => {
  await nextTick()
  await initializeLegacyPage({
    bodyClass: page.value.bodyClass,
    scripts: props.scripts,
    requiresAuth: props.requiresAuth,
  })
})

onUnmounted(() => {
  resetLegacyPage()
})
</script>

<template>
  <div v-html="page.content" />
</template>
