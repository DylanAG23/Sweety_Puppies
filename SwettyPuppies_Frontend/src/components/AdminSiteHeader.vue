<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { logoutToLogin } from '@/lib/session'
import { navigateTo } from '@/lib/navigation'

const props = defineProps<{
  currentPath: string
}>()

const STORAGE_KEY = 'sweety-admin-sidebar-collapsed'
const mobileBreakpoint = 980

const navItems = [
  { label: 'Inicio', href: '/admin', icon: 'IN' },
  { label: 'Agenda', href: '/admin/agenda', icon: 'AG' },
  { label: 'Clientes', href: '/admin/clientes', icon: 'CL' },
  { label: 'Mascotas', href: '/admin/mascotas', icon: 'MS' },
  { label: 'Gestión de citas', href: '/admin/gestion', icon: 'GC' },
  { label: 'Servicios', href: '/admin/servicios', icon: 'SV' },
  { label: 'Contenido', href: '/admin/contenido', icon: 'CT' },
  { label: 'Reportes', href: '/admin/reportes', icon: 'RP' },
]

const collapsed = ref(false)
const mobileOpen = ref(false)
const isMobile = ref(false)

const activeItem = computed(() => navItems.find((item) => isActive(item.href)) ?? navItems[0])
const todayLabel = computed(() =>
  new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date()),
)

function syncViewport() {
  isMobile.value = window.innerWidth <= mobileBreakpoint
  applyBodyState()
}

function applyBodyState() {
  document.body.classList.add('platform-shell-active', 'platform-shell-admin')
  document.body.classList.remove('platform-shell-client')
  document.body.classList.toggle('platform-shell-collapsed', !isMobile.value && collapsed.value)

  const sidebarWidth = !isMobile.value && collapsed.value ? '104px' : '272px'
  document.documentElement.style.setProperty('--platform-sidebar-width', sidebarWidth)
}

function clearBodyState() {
  document.body.classList.remove('platform-shell-active', 'platform-shell-admin', 'platform-shell-collapsed')
  document.documentElement.style.removeProperty('--platform-sidebar-width')
}

function toggleSidebar() {
  if (isMobile.value) {
    mobileOpen.value = !mobileOpen.value
    return
  }

  collapsed.value = !collapsed.value
  window.localStorage.setItem(STORAGE_KEY, collapsed.value ? '1' : '0')
}

function isActive(href: string) {
  if (href === '/admin') {
    return props.currentPath === '/admin'
  }

  if (href === '/admin/gestion') {
    return (
      props.currentPath === '/admin/gestion' ||
      props.currentPath === '/admin/historial' ||
      props.currentPath.startsWith('/admin/gestion/')
    )
  }

  if (href === '/admin/servicios') {
    return props.currentPath === '/admin/servicios' || props.currentPath === '/admin/adicionales'
  }

  return props.currentPath === href || props.currentPath.startsWith(`${href}/`)
}

function handleNavigate(event: Event, href: string) {
  event.preventDefault()
  mobileOpen.value = false
  navigateTo(href)
}

watch(collapsed, () => {
  applyBodyState()
})

watch(isMobile, () => {
  if (!isMobile.value) {
    mobileOpen.value = false
  }
  applyBodyState()
})

onMounted(() => {
  collapsed.value = window.localStorage.getItem(STORAGE_KEY) === '1'
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewport)
  clearBodyState()
})
</script>

<template>
  <div v-if="mobileOpen" class="platform-overlay" @click="mobileOpen = false"></div>

  <aside
    class="platform-sidebar admin-sidebar"
    :class="{
      collapsed: collapsed && !isMobile,
      'mobile-open': mobileOpen,
    }"
  >
    <a href="/admin" class="sidebar-brand" @click="handleNavigate($event, '/admin')">
      <div class="sidebar-brand-logo">
        <img src="/img/logo.png" alt="Logo de Sweety Puppies" class="sidebar-logo">
      </div>
      <div v-if="!collapsed || isMobile" class="sidebar-brand-copy">
        <strong>Sweety Puppies</strong>
        <small>Centro administrativo</small>
      </div>
    </a>

    <div class="sidebar-group">
      <span v-if="!collapsed || isMobile" class="sidebar-group-label">Principal</span>
      <nav class="sidebar-nav">
        <a
          v-for="item in navItems"
          :key="item.href"
          :href="item.href"
          class="sidebar-link"
          :class="{ active: isActive(item.href) }"
          :title="collapsed && !isMobile ? item.label : ''"
          @click="handleNavigate($event, item.href)"
        >
          <span class="sidebar-link-icon" aria-hidden="true">{{ item.icon }}</span>
          <span v-if="!collapsed || isMobile" class="sidebar-link-label">{{ item.label }}</span>
        </a>
      </nav>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <span class="sidebar-user-avatar">A</span>
        <div v-if="!collapsed || isMobile" class="sidebar-user-copy">
          <strong>Administrador</strong>
          <small>Panel operativo</small>
        </div>
      </div>
      <button v-if="!collapsed || isMobile" type="button" class="sidebar-logout" @click="logoutToLogin">
        <span class="sidebar-logout-label">Cerrar sesión</span>
      </button>
    </div>
  </aside>

  <header class="platform-topbar admin-topbar" :class="{ collapsed: collapsed && !isMobile }">
    <div class="topbar-left">
      <button
        type="button"
        class="sidebar-toggle"
        :aria-label="collapsed ? 'Expandir menu' : 'Contraer menu'"
        @click="toggleSidebar"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="topbar-breadcrumb">
        <span class="topbar-brand">Sweety Puppies</span>
        <span>/</span>
        <strong>{{ activeItem.label }}</strong>
      </div>
    </div>

    <div class="topbar-right">
      <span class="topbar-date">{{ todayLabel }}</span>
      <div class="topbar-profile">
        <span class="topbar-profile-avatar">A</span>
        <div class="topbar-profile-copy">
          <strong>Administrador</strong>
          <small>Administración</small>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.platform-overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 16, 37, 0.34);
  backdrop-filter: blur(4px);
  z-index: 48;
}

.platform-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 272px;
  min-width: 272px;
  max-width: 272px;
  padding: 22px 16px 18px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow: hidden;
  transition: width 0.24s ease, transform 0.24s ease;
}

.admin-sidebar {
  border-radius: 0;
  background:
    radial-gradient(circle at top right, rgba(118, 241, 216, 0.13), transparent 28%),
    linear-gradient(180deg, #95267c 0%, #7f1f6b 100%);
  box-shadow:
    18px 0 46px rgba(127, 31, 107, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.admin-sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: none;
  pointer-events: none;
}

.platform-sidebar.collapsed {
  width: 104px;
  min-width: 104px;
  max-width: 104px;
}

.sidebar-brand,
.sidebar-link,
.sidebar-user,
.sidebar-logout {
  position: relative;
  z-index: 1;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #fff;
  padding: 8px 8px 18px;
}

.sidebar-brand-logo {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.sidebar-logo {
  width: 64px;
  height: auto;
}

.sidebar-brand-copy strong,
.sidebar-brand-copy small {
  display: block;
}

.sidebar-brand-copy strong {
  font-size: 1.08rem;
}

.sidebar-brand-copy small {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.72);
}

.sidebar-group {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
}

.sidebar-group-label {
  display: block;
  margin: 0 10px 14px;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.44);
}

.sidebar-nav {
  display: grid;
  gap: 8px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 0 14px;
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.82);
  text-decoration: none;
  transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.sidebar-link:hover,
.sidebar-link.active {
  background: linear-gradient(135deg, rgba(235, 94, 220, 0.24) 0%, rgba(115, 232, 205, 0.12) 100%);
  color: #fff;
  transform: translateX(2px);
}

.sidebar-link-icon {
  width: 30px;
  min-width: 30px;
  height: 30px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.sidebar-link-label {
  font-weight: 600;
}

.sidebar-footer {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 12px;
}

.sidebar-group::-webkit-scrollbar {
  width: 8px;
}

.sidebar-group::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.24);
  border-radius: 999px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.sidebar-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f7d8ef 0%, #bff3ea 100%);
  color: #7b1d72;
  font-weight: 800;
}

.sidebar-user-copy strong,
.sidebar-user-copy small {
  display: block;
}

.sidebar-user-copy small {
  color: rgba(255, 255, 255, 0.72);
}

.sidebar-logout {
  min-height: 52px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.82);
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.sidebar-logout:hover,
.sidebar-logout:focus-visible {
  background: linear-gradient(135deg, rgba(235, 94, 220, 0.24) 0%, rgba(115, 232, 205, 0.12) 100%);
  color: #fff;
  transform: translateX(2px);
  outline: none;
}

.sidebar-logout:active {
  transform: translateX(1px) scale(0.99);
}

.sidebar-logout-label {
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.01em;
}

.platform-topbar {
  position: fixed;
  top: 0;
  left: var(--platform-sidebar-width, 272px);
  right: 0;
  min-height: 74px;
  padding: 0 24px 0 34px;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid rgba(224, 229, 240, 0.95);
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  transition: left 0.24s ease;
}

.platform-topbar.collapsed {
  left: var(--platform-sidebar-collapsed-width, 104px);
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.topbar-right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sidebar-toggle {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(224, 229, 240, 0.98);
  border-radius: 14px;
  background: #fff;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  cursor: pointer;
}

.sidebar-toggle span {
  display: block;
  height: 2px;
  border-radius: 999px;
  background: #8f176e;
}

.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #7f8ba0;
  font-size: 0.96rem;
}

.topbar-brand,
.topbar-breadcrumb strong {
  color: #8f176e;
  font-weight: 800;
}

.topbar-date {
  color: #8190a3;
  font-size: 0.9rem;
}

.topbar-status {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(115, 222, 176, 0.14);
  color: #178464;
  font-weight: 700;
  font-size: 0.84rem;
}

.topbar-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 8px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(224, 229, 240, 0.98);
}

.topbar-profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f7d8ef 0%, #bff3ea 100%);
  color: #7b1d72;
  font-weight: 800;
}

.topbar-profile-copy strong,
.topbar-profile-copy small {
  display: block;
}

.topbar-profile-copy strong {
  color: #22354b;
  font-size: 0.95rem;
}

.topbar-profile-copy small {
  color: #8a97a8;
  font-size: 0.76rem;
}

@media (max-width: 980px) {
  .platform-sidebar {
    transform: translateX(-100%);
  }

  .platform-sidebar.mobile-open {
    transform: translateX(0);
  }

  .platform-topbar,
  .platform-topbar.collapsed {
    left: 0;
    right: 0;
  }
}

@media (max-width: 720px) {
  .platform-topbar {
    min-height: auto;
    padding: 14px 16px;
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-left,
  .topbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .topbar-breadcrumb {
    flex-wrap: wrap;
  }
}
</style>
