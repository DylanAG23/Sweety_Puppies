<script setup lang="ts">
import { computed } from 'vue'
import PlatformShell from '@/components/layout/PlatformShell.vue'
import { adminNavGroups } from '@/lib/navigation'
import { getSession } from '@/lib/session'

defineProps<{
  currentPath: string
}>()

const adminName = computed(() => getSession()?.userData.nombre?.trim() || 'Administrador')
</script>

<template>
  <PlatformShell
    variant="admin"
    :current-path="currentPath"
    :groups="adminNavGroups"
    home-href="/admin"
    subtitle="Centro administrativo"
    :user-name="adminName"
    user-tagline="Panel operativo"
    topbar-caption="Administración"
    show-date
  />
</template>
