<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getSession, hydrateSessionFromLiveTab } from './lib/session'
import AuthPage from './pages/AuthPage.vue'
import AdminHomePage from './pages/AdminHomePage.vue'
import AdminAgendaPage from './pages/AdminAgendaPage.vue'
import AdminManagementPage from './pages/AdminManagementPage.vue'
import AdminPlaceholderPage from './pages/AdminPlaceholderPage.vue'
import ClientesPage from './pages/ClientesPage.vue'
import MascotasPage from './pages/MascotasPage.vue'
import ServiciosPage from './pages/ServiciosPage.vue'
import CitasPage from './pages/CitasPage.vue'
import ImagenesPage from './pages/ImagenesPage.vue'
import ReportesPage from './pages/ReportesPage.vue'
import ClienteDashboardPage from './pages/ClienteDashboardPage.vue'
import ClientProfilePage from './pages/ClientProfilePage.vue'
import ClientPetsPage from './pages/ClientPetsPage.vue'
import ClientBookAppointmentPage from './pages/ClientBookAppointmentPage.vue'
import ClientHistoryPage from './pages/ClientHistoryPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'

const currentPath = ref(window.location.pathname.toLowerCase())
const sessionReady = ref(false)
const publicRoutes = new Set(['/', '/login', '/login.html'])
const adminRoutes = new Set([
  '/admin',
  '/index.html',
  '/admin/agenda',
  '/admin/clientes',
  '/admin/mascotas',
  '/admin/historial',
  '/admin/gestion',
  '/admin/gestion/citas',
  '/admin/gestion/servicios',
  '/admin/servicios',
  '/admin/adicionales',
  '/admin/bloqueos',
  '/admin/contenido',
  '/admin/galeria',
  '/admin/reportes',
  '/admin/dashboard',
  '/clientes',
  '/clientes.html',
  '/mascotas',
  '/mascotas.html',
  '/servicios',
  '/servicios.html',
  '/citas',
  '/citas.html',
  '/imagenes',
  '/imagenes.html',
  '/reportes',
  '/reportes.html',
])

const routes = new Map<
  string,
  { component: unknown; props?: Record<string, string> }
>([
  ['/', { component: AuthPage }],
  ['/login', { component: AuthPage }],
  ['/login.html', { component: AuthPage }],
  ['/admin', { component: AdminHomePage }],
  ['/index.html', { component: AdminHomePage }],
  ['/admin/agenda', { component: AdminAgendaPage }],
  ['/admin/clientes', { component: ClientesPage }],
  ['/admin/mascotas', { component: MascotasPage }],
  ['/admin/gestion', { component: AdminManagementPage }],
  ['/admin/gestion/citas', { component: AdminManagementPage, props: { initialTab: 'citas' } }],
  ['/admin/gestion/servicios', { component: AdminManagementPage, props: { initialTab: 'servicios' } }],
  ['/admin/servicios', { component: ServiciosPage, props: { initialCategory: 'principales' } }],
  ['/admin/contenido', { component: ImagenesPage }],
  ['/admin/galeria', { component: ImagenesPage }],
  ['/admin/reportes', { component: ReportesPage }],
  [
    '/admin/historial',
    {
      component: AdminManagementPage,
      props: {
        initialTab: 'servicios',
      },
    },
  ],
  [
    '/admin/adicionales',
    { component: ServiciosPage, props: { initialCategory: 'adicionales' } },
  ],
  ['/admin/bloqueos', { component: AdminAgendaPage, props: { initialSection: 'blocks' } }],
  [
    '/admin/dashboard',
    {
      component: AdminPlaceholderPage,
      props: {
        title: 'Dashboard',
        description: 'Aqui se consolidaran las metricas principales, indicadores y decisiones del ERP de Sweety Puppies.',
      },
    },
  ],
  ['/clientes', { component: ClientesPage }],
  ['/clientes.html', { component: ClientesPage }],
  ['/mascotas', { component: MascotasPage }],
  ['/mascotas.html', { component: MascotasPage }],
  ['/servicios', { component: ServiciosPage, props: { initialCategory: 'principales' } }],
  ['/servicios.html', { component: ServiciosPage, props: { initialCategory: 'principales' } }],
  ['/citas', { component: CitasPage }],
  ['/citas.html', { component: CitasPage }],
  ['/imagenes', { component: ImagenesPage }],
  ['/imagenes.html', { component: ImagenesPage }],
  ['/reportes', { component: ReportesPage }],
  ['/reportes.html', { component: ReportesPage }],
  ['/cliente', { component: ClienteDashboardPage }],
  ['/cliente-dashboard.html', { component: ClienteDashboardPage }],
  [
    '/cliente/mascotas',
    {
      component: ClientPetsPage,
    },
  ],
  ['/cliente/mascotas/nueva', { component: ClientPetsPage }],
  [
    '/cliente/citas/nueva',
    {
      component: ClientBookAppointmentPage,
    },
  ],
  [
    '/cliente/historial',
    {
      component: ClientHistoryPage,
    },
  ],
  [
    '/cliente/perfil',
    {
      component: ClientProfilePage,
    },
  ],
])

const currentRoute = computed(() => {
  if (!sessionReady.value) {
    return { component: NotFoundPage }
  }

  const session = getSession()
  const path = currentPath.value

  if (path === '/admin/tarifas') {
    window.history.replaceState({}, '', '/admin/servicios')
    currentPath.value = '/admin/servicios'
    return routes.get('/admin/servicios') ?? { component: NotFoundPage }
  }

  if (!session) {
    if (!publicRoutes.has(path)) {
      if (window.location.pathname.toLowerCase() !== '/login') {
        window.history.replaceState({}, '', '/login')
        currentPath.value = '/login'
      }

      return { component: AuthPage }
    }

    return routes.get(path) ?? { component: NotFoundPage }
  }

  if (publicRoutes.has(path)) {
    const homePath = session.userData.rol === 'administrador' ? '/admin' : '/cliente'
    if (window.location.pathname.toLowerCase() !== homePath) {
      window.history.replaceState({}, '', homePath)
      currentPath.value = homePath
    }

    return routes.get(homePath) ?? { component: NotFoundPage }
  }

  if ((adminRoutes.has(path) || path.startsWith('/admin/')) && session.userData.rol !== 'administrador') {
    if (window.location.pathname.toLowerCase() !== '/cliente') {
      window.history.replaceState({}, '', '/cliente')
      currentPath.value = '/cliente'
    }

    return routes.get('/cliente') ?? { component: NotFoundPage }
  }

  if (path.startsWith('/cliente') && session.userData.rol !== 'cliente') {
    if (window.location.pathname.toLowerCase() !== '/admin') {
      window.history.replaceState({}, '', '/admin')
      currentPath.value = '/admin'
    }

    return routes.get('/admin') ?? { component: NotFoundPage }
  }

  return routes.get(path) ?? { component: NotFoundPage }
})

function updatePath() {
  currentPath.value = window.location.pathname.toLowerCase()
}

onMounted(() => {
  hydrateSessionFromLiveTab().finally(() => {
    sessionReady.value = true
  })

  window.addEventListener('popstate', updatePath)
})

onUnmounted(() => {
  window.removeEventListener('popstate', updatePath)
})
</script>

<template>
  <main v-if="!sessionReady" class="app-loading-state">
    <section class="app-loading-card">
      <h1>Preparando Sweety Puppies...</h1>
      <p>Estamos verificando tu acceso para abrir el portal correcto.</p>
    </section>
  </main>
  <component v-else :is="currentRoute.component" :key="currentPath" v-bind="currentRoute.props" />
</template>

<style scoped>
.app-loading-state {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.app-loading-card {
  max-width: 620px;
  padding: 36px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 26px 60px rgba(204, 115, 174, 0.12);
  text-align: center;
}

.app-loading-card h1 {
  margin: 0 0 12px;
  color: #8f176e;
}

.app-loading-card p {
  margin: 0;
  color: #6e5064;
  line-height: 1.7;
}
</style>
