<script setup lang="ts">
import { computed } from 'vue'
import PlatformShell from '@/components/layout/PlatformShell.vue'
import { clientNavGroups } from '@/lib/navigation'
import { getSession } from '@/lib/session'

defineProps<{
  currentPath: string
}>()

const clientShortName = computed(() => getSession()?.userData.nombre?.trim() || 'Cliente')
</script>

<template>
  <PlatformShell
    variant="client"
    :current-path="currentPath"
    :groups="clientNavGroups"
    home-href="/cliente"
    subtitle="Portal del cliente"
    :user-name="clientShortName"
    user-tagline="Glamour para cada pelaje"
    topbar-caption="Cuenta activa"
  />
</template>
