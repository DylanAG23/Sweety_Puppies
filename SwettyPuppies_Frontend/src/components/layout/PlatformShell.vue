<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { logoutToLogin } from '@/lib/session'
import { isNavItemActive, navigateTo, type NavGroup } from '@/lib/navigation'

// Armazon comun del portal del cliente y del panel administrativo:
// menu lateral morado (272 px / 104 px contraido) + barra superior.
const props = defineProps<{
  variant: 'admin' | 'client'
  currentPath: string
  groups: NavGroup[]
  homeHref: string
  subtitle: string
  userName: string
  userTagline: string
  topbarCaption: string
  showDate?: boolean
}>()

const MOBILE_BREAKPOINT = 980
const storageKey = computed(() => `sweety-${props.variant}-sidebar-collapsed`)

const collapsed = ref(false)
const mobileOpen = ref(false)
const isMobile = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLButtonElement | null>(null)

const allItems = computed(() => props.groups.flatMap((group) => group.items))
const activeItem = computed(
  () => allItems.value.find((item) => isActive(item.href)) ?? allItems.value[0],
)
const showLabels = computed(() => !collapsed.value || isMobile.value)
const userInitial = computed(() => props.userName.trim().charAt(0).toUpperCase() || 'S')
const todayLabel = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).format(
  new Date(),
)

function isActive(href: string) {
  const item = allItems.value.find((candidate) => candidate.href === href)
  return item ? isNavItemActive(item, props.currentPath, props.homeHref) : false
}

function readCollapsedPreference() {
  try {
    return window.localStorage.getItem(storageKey.value) === '1'
  } catch {
    return false
  }
}

function saveCollapsedPreference() {
  try {
    window.localStorage.setItem(storageKey.value, collapsed.value ? '1' : '0')
  } catch {
    // Sin almacenamiento disponible: la preferencia solo dura esta visita.
  }
}

function applyBodyState() {
  const shellClass = props.variant === 'admin' ? 'platform-shell-admin' : 'platform-shell-client'
  const otherClass = props.variant === 'admin' ? 'platform-shell-client' : 'platform-shell-admin'

  document.body.classList.add('platform-shell-active', shellClass)
  document.body.classList.remove(otherClass)
  document.body.classList.toggle('platform-shell-collapsed', !isMobile.value && collapsed.value)
  document.body.classList.toggle('platform-menu-open', isMobile.value && mobileOpen.value)
}

function clearBodyState() {
  document.body.classList.remove(
    'platform-shell-active',
    'platform-shell-admin',
    'platform-shell-client',
    'platform-shell-collapsed',
    'platform-menu-open',
  )
}

function syncViewport() {
  isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT
  applyBodyState()
}

function toggleSidebar() {
  if (isMobile.value) {
    mobileOpen.value = !mobileOpen.value
    return
  }

  collapsed.value = !collapsed.value
  saveCollapsedPreference()
}

function closeMobileMenu(returnFocus = false) {
  if (!mobileOpen.value) {
    return
  }

  mobileOpen.value = false
  if (returnFocus) {
    toggleRef.value?.focus()
  }
}

function handleNavigate(event: MouseEvent, href: string) {
  // Ctrl/Cmd + clic abre en otra pestana como un enlace normal.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
    return
  }

  event.preventDefault()
  mobileOpen.value = false
  navigateTo(href)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMobileMenu(true)
  }
}

function skipToContent() {
  const main = document.querySelector<HTMLElement>('main')
  if (main) {
    main.setAttribute('tabindex', '-1')
    main.focus()
  }
}

watch([collapsed, isMobile, mobileOpen], applyBodyState)

// Cuando cambia el ancho util (montaje, menu contraido, celular/escritorio),
// los componentes que miden su ancho al montarse (graficas de ApexCharts)
// solo se recalculan con un evento resize de la ventana.
function notifyLayoutChange() {
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  // Segundo aviso al terminar la transicion del menu (300 ms).
  window.setTimeout(() => window.dispatchEvent(new Event('resize')), 340)
}

watch([collapsed, isMobile], notifyLayoutChange)

watch(isMobile, (mobile) => {
  if (!mobile) {
    mobileOpen.value = false
  }
})

watch(mobileOpen, async (open) => {
  if (open) {
    await nextTick()
    sidebarRef.value?.querySelector<HTMLElement>('a, button')?.focus()
  }
})

onMounted(() => {
  collapsed.value = readCollapsedPreference()
  syncViewport()
  window.addEventListener('resize', syncViewport)
  window.addEventListener('keydown', handleKeydown)
  notifyLayoutChange()
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewport)
  window.removeEventListener('keydown', handleKeydown)
  clearBodyState()
})
</script>

<template>
  <button type="button" class="skip-link" @click="skipToContent">Saltar al contenido</button>

  <Transition name="platform-fade">
    <div v-if="mobileOpen" class="platform-overlay" aria-hidden="true" @click="closeMobileMenu()"></div>
  </Transition>

  <aside
    id="platform-sidebar"
    ref="sidebarRef"
    class="platform-sidebar"
    :class="[
      `${variant}-sidebar`,
      {
        collapsed: collapsed && !isMobile,
        'mobile-open': mobileOpen,
      },
    ]"
    :inert="isMobile && !mobileOpen"
    :aria-label="variant === 'admin' ? 'Menu del panel administrativo' : 'Menu del portal del cliente'"
  >
    <a :href="homeHref" class="sidebar-brand" @click="handleNavigate($event, homeHref)">
      <div class="sidebar-brand-logo">
        <img src="/img/logo.png" alt="Sweety Puppies, ir al inicio" class="sidebar-logo">
      </div>
      <div v-if="showLabels" class="sidebar-brand-copy">
        <strong>Sweety Puppies</strong>
        <small>{{ subtitle }}</small>
      </div>
    </a>

    <div class="sidebar-group">
      <nav v-for="group in groups" :key="group.label" class="sidebar-section" :aria-label="group.label">
        <span v-if="showLabels" class="sidebar-group-label">{{ group.label }}</span>
        <div class="sidebar-nav">
          <a
            v-for="item in group.items"
            :key="item.href"
            :href="item.href"
            class="sidebar-link"
            :class="{ active: isActive(item.href) }"
            :aria-current="isActive(item.href) ? 'page' : undefined"
            :aria-label="showLabels ? undefined : item.label"
            :title="showLabels ? undefined : item.label"
            @click="handleNavigate($event, item.href)"
          >
            <span class="sidebar-link-icon" aria-hidden="true">{{ item.icon }}</span>
            <span v-if="showLabels" class="sidebar-link-label">{{ item.label }}</span>
            <span v-if="showLabels && item.badge" class="sidebar-link-badge">{{ item.badge }}</span>
          </a>
        </div>
      </nav>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <span class="sidebar-user-avatar" aria-hidden="true">{{ userInitial }}</span>
        <div v-if="showLabels" class="sidebar-user-copy">
          <strong>{{ userName }}</strong>
          <small>{{ userTagline }}</small>
        </div>
      </div>
      <button
        type="button"
        class="sidebar-logout"
        :aria-label="showLabels ? undefined : 'Cerrar sesión'"
        :title="showLabels ? undefined : 'Cerrar sesión'"
        @click="logoutToLogin"
      >
        <span v-if="showLabels" class="sidebar-logout-label">Cerrar sesión</span>
        <span v-else class="sidebar-link-icon" aria-hidden="true">
          <i class="fa-solid fa-right-from-bracket"></i>
        </span>
      </button>
    </div>
  </aside>

  <header class="platform-topbar" :class="[`${variant}-topbar`, { collapsed: collapsed && !isMobile }]">
    <div class="topbar-left">
      <button
        ref="toggleRef"
        type="button"
        class="sidebar-toggle"
        aria-controls="platform-sidebar"
        :aria-expanded="isMobile ? mobileOpen : !collapsed"
        :aria-label="isMobile ? (mobileOpen ? 'Cerrar menú' : 'Abrir menú') : collapsed ? 'Expandir menú' : 'Contraer menú'"
        @click="toggleSidebar"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav class="topbar-breadcrumb" aria-label="Ubicación">
        <span class="topbar-brand">Sweety Puppies</span>
        <span aria-hidden="true">/</span>
        <strong aria-current="page">{{ activeItem?.label }}</strong>
      </nav>
    </div>

    <div class="topbar-right">
      <slot name="topbar-actions" />
      <span v-if="showDate" class="topbar-date">{{ todayLabel }}</span>
      <div class="topbar-profile">
        <span class="topbar-profile-avatar" aria-hidden="true">{{ userInitial }}</span>
        <div class="topbar-profile-copy">
          <strong>{{ userName }}</strong>
          <small>{{ topbarCaption }}</small>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.skip-link {
  position: fixed;
  top: var(--sp-space-3);
  left: var(--sp-space-3);
  z-index: calc(var(--sp-z-sidebar) + 10);
  padding: var(--sp-space-3) var(--sp-space-4);
  border: none;
  border-radius: var(--sp-radius-sm);
  background: var(--sp-dark);
  color: #ffffff;
  font-weight: var(--sp-weight-bold);
  cursor: pointer;
  transform: translateY(-200%);
  transition: transform var(--sp-duration) var(--sp-ease);
}

.skip-link:focus-visible {
  transform: translateY(0);
}

.platform-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--sp-z-overlay);
  background: rgba(23, 16, 37, 0.34);
  backdrop-filter: blur(4px);
}

.platform-fade-enter-active,
.platform-fade-leave-active {
  transition: opacity var(--sp-duration-slow) var(--sp-ease);
}

.platform-fade-enter-from,
.platform-fade-leave-to {
  opacity: 0;
}

.platform-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: var(--sp-z-sidebar);
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: var(--platform-sidebar-width);
  min-width: var(--platform-sidebar-width);
  max-width: var(--platform-sidebar-width);
  padding: 18px 16px 16px;
  overflow: hidden;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(118, 241, 216, 0.12), transparent 28%),
    var(--sp-gradient-sidebar);
  box-shadow:
    18px 0 46px rgba(127, 31, 107, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.07);
  transition:
    width var(--sp-duration-slow) var(--sp-ease),
    min-width var(--sp-duration-slow) var(--sp-ease),
    max-width var(--sp-duration-slow) var(--sp-ease),
    transform var(--sp-duration-slow) var(--sp-ease);
}

.platform-sidebar.collapsed {
  width: var(--platform-sidebar-collapsed-width);
  min-width: var(--platform-sidebar-collapsed-width);
  max-width: var(--platform-sidebar-collapsed-width);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 12px;
  border-radius: var(--sp-radius-md);
  color: #ffffff;
  text-decoration: none;
}

.sidebar-brand-logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--sp-radius-md);
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(52, 7, 41, 0.22);
}

.sidebar-logo {
  width: 44px;
  height: auto;
}

.sidebar-brand-copy strong,
.sidebar-brand-copy small {
  display: block;
}

.sidebar-brand-copy strong {
  font-size: 1.08rem;
  font-weight: var(--sp-weight-extrabold);
}

.sidebar-brand-copy small {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.78);
}

.sidebar-group {
  display: grid;
  flex: 1;
  align-content: start;
  gap: var(--sp-space-4);
  min-height: 0;
  padding-right: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
  scrollbar-width: thin;
}

.sidebar-group::-webkit-scrollbar {
  width: 8px;
}

.sidebar-group::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
}

.sidebar-group-label {
  display: block;
  margin: 0 10px 8px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.72rem;
  font-weight: var(--sp-weight-bold);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.sidebar-nav {
  display: grid;
  gap: 4px;
}

.sidebar-link,
.sidebar-logout {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: var(--sp-radius-sm);
  color: rgba(255, 255, 255, 0.86);
  text-decoration: none;
  transition:
    background var(--sp-duration) var(--sp-ease),
    transform var(--sp-duration) var(--sp-ease),
    color var(--sp-duration) var(--sp-ease);
}

.sidebar-link:hover,
.sidebar-link.active,
.sidebar-logout:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(126, 239, 214, 0.14) 100%);
  color: #ffffff;
  transform: translateX(2px);
}

.admin-sidebar .sidebar-link:hover,
.admin-sidebar .sidebar-link.active,
.admin-sidebar .sidebar-logout:hover {
  background: linear-gradient(135deg, rgba(235, 94, 220, 0.24) 0%, rgba(115, 232, 205, 0.12) 100%);
}

.sidebar-link.active {
  box-shadow: inset 3px 0 0 var(--sp-mint);
}

.sidebar-link-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--sp-radius-xs);
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.68rem;
  font-weight: var(--sp-weight-extrabold);
  letter-spacing: 0.08em;
}

.sidebar-link.active .sidebar-link-icon {
  background: rgba(255, 255, 255, 0.24);
}

.sidebar-link-label {
  flex: 1;
  font-weight: var(--sp-weight-semibold);
}

.sidebar-link-badge {
  padding: 3px 8px;
  border-radius: var(--sp-radius-pill);
  background: var(--sp-mint);
  color: var(--sp-on-teal);
  font-size: 0.68rem;
  font-weight: var(--sp-weight-extrabold);
}

.platform-sidebar.collapsed .sidebar-link,
.platform-sidebar.collapsed .sidebar-logout {
  justify-content: center;
  padding: 0;
}

.sidebar-footer {
  display: grid;
  flex-shrink: 0;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: var(--sp-radius-md);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.platform-sidebar.collapsed .sidebar-user {
  justify-content: center;
}

.sidebar-user-avatar,
.topbar-profile-avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--sp-gradient-avatar);
  color: #7b1d72;
  font-weight: var(--sp-weight-extrabold);
}

.sidebar-user-avatar {
  border-radius: var(--sp-radius-sm);
}

.topbar-profile-avatar {
  border-radius: 50%;
}

.sidebar-user-copy {
  min-width: 0;
}

.sidebar-user-copy strong,
.sidebar-user-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-user-copy small {
  color: rgba(255, 255, 255, 0.78);
}

.sidebar-logout {
  width: 100%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  font-family: inherit;
  font-size: 1rem;
  cursor: pointer;
}

.sidebar-logout-label {
  font-weight: var(--sp-weight-extrabold);
}

.sidebar-logout:active,
.sidebar-link:active {
  transform: translateX(1px) scale(0.99);
}

/* ---- Barra superior ---- */

.platform-topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: var(--platform-sidebar-width);
  z-index: var(--sp-z-topbar);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 74px;
  padding: 0 24px 0 34px;
  border-bottom: 1px solid rgba(224, 229, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(1.4) blur(10px);
  transition: left var(--sp-duration-slow) var(--sp-ease);
}

.platform-topbar.collapsed {
  left: var(--platform-sidebar-collapsed-width);
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.topbar-right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sidebar-toggle {
  display: inline-flex;
  flex-direction: column;
  flex-shrink: 0;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  padding: 0 11px;
  border: 1px solid var(--sp-line);
  border-radius: var(--sp-radius-sm);
  background: #ffffff;
  cursor: pointer;
  transition: background var(--sp-duration) var(--sp-ease), border-color var(--sp-duration) var(--sp-ease);
}

.sidebar-toggle:hover {
  border-color: var(--sp-pink-border);
  background: var(--sp-primary-soft);
}

.sidebar-toggle span {
  display: block;
  height: 2px;
  border-radius: 999px;
  background: var(--sp-primary);
}

.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--sp-text-subtle);
  font-size: 0.96rem;
}

.topbar-brand,
.topbar-breadcrumb strong {
  color: var(--sp-primary);
  font-weight: var(--sp-weight-extrabold);
}

.topbar-breadcrumb strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-date {
  padding: 8px 12px;
  border-radius: var(--sp-radius-pill);
  background: var(--sp-bg);
  color: var(--sp-text-subtle);
  font-size: 0.86rem;
  font-weight: var(--sp-weight-bold);
}

.topbar-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border: 1px solid var(--sp-line);
  border-radius: var(--sp-radius-pill);
  background: #ffffff;
}

.topbar-profile-copy strong,
.topbar-profile-copy small {
  display: block;
}

.topbar-profile-copy strong {
  color: var(--sp-ink);
  font-size: 0.95rem;
}

.topbar-profile-copy small {
  color: var(--sp-text-subtle);
  font-size: 0.76rem;
}

@media (max-width: 980px) {
  .platform-sidebar {
    box-shadow: none;
    transform: translateX(-100%);
  }

  .platform-sidebar.mobile-open {
    box-shadow: 18px 0 46px rgba(23, 16, 37, 0.28);
    transform: translateX(0);
  }

  .platform-topbar,
  .platform-topbar.collapsed {
    left: 0;
  }
}

@media (max-width: 720px) {
  .platform-sidebar {
    width: min(320px, 86vw);
    min-width: 0;
    max-width: none;
  }

  .platform-topbar {
    box-sizing: border-box;
    min-height: var(--platform-topbar-height);
    padding: 0 16px;
  }

  .topbar-brand,
  .topbar-breadcrumb > span[aria-hidden='true'],
  .topbar-date,
  .topbar-profile-copy {
    display: none;
  }

  .topbar-profile {
    padding: 4px;
  }
}
</style>
