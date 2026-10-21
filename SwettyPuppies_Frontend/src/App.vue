<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch, type Component } from 'vue'
import { getSession, hydrateSessionFromLiveTab } from './lib/session'
import { isStoreEnabled } from './lib/navigation'
import AuthPage from './pages/AuthPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'
import PageLoadingState from './components/ui/PageLoadingState.vue'
import PageLoadError from './components/ui/PageLoadError.vue'

// Cada pagina se descarga cuando se visita (code splitting): el login no
// carga ApexCharts ni las pantallas administrativas.
function lazyPage(loader: () => Promise<{ default: Component }>) {
  return defineAsyncComponent({
    loader,
    loadingComponent: PageLoadingState,
    errorComponent: PageLoadError,
    delay: 150,
  })
}

const AdminHomePage = lazyPage(() => import('./pages/AdminHomePage.vue'))
const AdminAgendaPage = lazyPage(() => import('./pages/AdminAgendaPage.vue'))
const AdminManagementPage = lazyPage(() => import('./pages/AdminManagementPage.vue'))
const AdminPlaceholderPage = lazyPage(() => import('./pages/AdminPlaceholderPage.vue'))
const ClientPlaceholderPage = lazyPage(() => import('./pages/ClientPlaceholderPage.vue'))
const ClientesPage = lazyPage(() => import('./pages/ClientesPage.vue'))
const MascotasPage = lazyPage(() => import('./pages/MascotasPage.vue'))
const ServiciosPage = lazyPage(() => import('./pages/ServiciosPage.vue'))
const ImagenesPage = lazyPage(() => import('./pages/ImagenesPage.vue'))
const ReportesPage = lazyPage(() => import('./pages/ReportesPage.vue'))
const ClienteDashboardPage = lazyPage(() => import('./pages/ClienteDashboardPage.vue'))
const ClientProfilePage = lazyPage(() => import('./pages/ClientProfilePage.vue'))
const ClientPetsPage = lazyPage(() => import('./pages/ClientPetsPage.vue'))
const ClientBookAppointmentPage = lazyPage(() => import('./pages/ClientBookAppointmentPage.vue'))
const ClientHistoryPage = lazyPage(() => import('./pages/ClientHistoryPage.vue'))

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
        description: 'Aquí verás las métricas principales y los indicadores del negocio.',
      },
    },
  ],
  ['/clientes', { component: ClientesPage }],
  ['/clientes.html', { component: ClientesPage }],
  ['/mascotas', { component: MascotasPage }],
  ['/mascotas.html', { component: MascotasPage }],
  ['/servicios', { component: ServiciosPage, props: { initialCategory: 'principales' } }],
  ['/servicios.html', { component: ServiciosPage, props: { initialCategory: 'principales' } }],
  ['/citas', { component: AdminManagementPage, props: { initialTab: 'citas' } }],
  ['/citas.html', { component: AdminManagementPage, props: { initialTab: 'citas' } }],
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

// Fase 2 (tienda e inventario): rutas reservadas que muestran "Modulo en
// preparacion". Solo existen con VITE_ENABLE_STORE=true.
const storePlaceholders: Array<[string, 'cliente' | 'admin', string, string]> = [
  ['/cliente/tienda', 'cliente', 'Tienda', 'Aqui podras explorar y comprar productos para tu peludito.'],
  ['/cliente/carrito', 'cliente', 'Tu carrito', 'Aqui veras los productos que agregues antes de pagar.'],
  ['/cliente/pedidos', 'cliente', 'Mis pedidos', 'Aqui podras seguir el estado de tus compras.'],
  ['/admin/productos', 'admin', 'Productos', 'Aqui se administrara el catalogo de la tienda.'],
  ['/admin/categorias', 'admin', 'Categorias', 'Aqui se organizaran las categorias de la tienda.'],
  ['/admin/inventario', 'admin', 'Inventario', 'Aqui se controlaran existencias, entradas, salidas y ajustes.'],
  ['/admin/pedidos', 'admin', 'Pedidos', 'Aqui se atenderan los pedidos de la tienda.'],
]

if (isStoreEnabled) {
  for (const [path, area, title, description] of storePlaceholders) {
    routes.set(path, {
      component: area === 'admin' ? AdminPlaceholderPage : ClientPlaceholderPage,
      props: { title, description },
    })
  }
}

// Resuelve a que ruta debe ir el usuario segun su sesion y rol (sin efectos).
function resolveTargetPath(path: string) {
  if (path === '/admin/tarifas') {
    return '/admin/servicios'
  }

  const session = getSession()

  if (!session) {
    return publicRoutes.has(path) ? path : '/login'
  }

  const homePath = session.userData.rol === 'administrador' ? '/admin' : '/cliente'

  if (publicRoutes.has(path)) {
    return homePath
  }

  if ((adminRoutes.has(path) || path.startsWith('/admin/')) && session.userData.rol !== 'administrador') {
    return '/cliente'
  }

  if (path.startsWith('/cliente') && session.userData.rol !== 'cliente') {
    return '/admin'
  }

  return path
}

const targetPath = computed(() => (sessionReady.value ? resolveTargetPath(currentPath.value) : currentPath.value))

const currentRoute = computed(() => {
  if (!sessionReady.value) {
    return { component: NotFoundPage }
  }

  return routes.get(targetPath.value) ?? { component: NotFoundPage }
})

// Las redirecciones se aplican aqui, fuera del computed.
watch(targetPath, (target) => {
  if (target !== currentPath.value) {
    window.history.replaceState({}, '', target)
    currentPath.value = target
  }
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
  <component v-else :is="currentRoute.component" :key="targetPath" v-bind="currentRoute.props" />
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
  color: var(--sp-primary);
}

.app-loading-card p {
  margin: 0;
  color: var(--sp-muted);
  line-height: 1.7;
}
</style>
