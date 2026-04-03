<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AuthPage from './pages/AuthPage.vue'
import AdminHomePage from './pages/AdminHomePage.vue'
import ClientesPage from './pages/ClientesPage.vue'
import MascotasPage from './pages/MascotasPage.vue'
import ServiciosPage from './pages/ServiciosPage.vue'
import CitasPage from './pages/CitasPage.vue'
import ImagenesPage from './pages/ImagenesPage.vue'
import ReportesPage from './pages/ReportesPage.vue'
import ClienteDashboardPage from './pages/ClienteDashboardPage.vue'
import ClientProfilePage from './pages/ClientProfilePage.vue'
import ClientPetsPage from './pages/ClientPetsPage.vue'
import ClientPlaceholderPage from './pages/ClientPlaceholderPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'

const currentPath = ref(window.location.pathname.toLowerCase())

const routes = new Map<
  string,
  { component: unknown; props?: Record<string, string> }
>([
  ['/', { component: AuthPage }],
  ['/login', { component: AuthPage }],
  ['/admin', { component: AdminHomePage }],
  ['/index.html', { component: AdminHomePage }],
  ['/clientes', { component: ClientesPage }],
  ['/clientes.html', { component: ClientesPage }],
  ['/mascotas', { component: MascotasPage }],
  ['/mascotas.html', { component: MascotasPage }],
  ['/servicios', { component: ServiciosPage }],
  ['/servicios.html', { component: ServiciosPage }],
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
      component: ClientPlaceholderPage,
      props: {
        title: 'Agendar cita',
        description: 'Este acceso quedo listo para conectar el flujo de reserva del cliente autenticado.',
      },
    },
  ],
  [
    '/cliente/historial',
    {
      component: ClientPlaceholderPage,
      props: {
        title: 'Historial de servicios',
        description: 'Aqui podras consultar servicios anteriores, recomendaciones y seguimiento de visitas.',
      },
    },
  ],
  [
    '/cliente/perfil',
    {
      component: ClientProfilePage,
    },
  ],
])

const currentRoute = computed(() => routes.get(currentPath.value) ?? { component: NotFoundPage })

function updatePath() {
  currentPath.value = window.location.pathname.toLowerCase()
}

onMounted(() => {
  window.addEventListener('popstate', updatePath)
})

onUnmounted(() => {
  window.removeEventListener('popstate', updatePath)
})
</script>

<template>
  <component :is="currentRoute.component" v-bind="currentRoute.props" />
</template>
