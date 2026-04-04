<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type AdminHomeResponse = {
  success: boolean
  profile: {
    administradorId: string
    nombre: string
    apellido: string
    telefono: string | null
    email: string
  }
  about: {
    title: string
    description: string
    note: string
  }
  summary: {
    citasHoy: number
    citasPendientes: number
    mascotasRegistradas: number
    clientesRegistrados: number
    serviciosMes: number
    bloqueosProximos: {
      total: number
      items: Array<{
        id: string
        fecha: string
        horaInicio: string | null
        horaFin: string | null
        motivo: string | null
      }>
    }
    agendaHoy: Array<{
      id: string
      fecha: string
      horaInicio: string | null
      estado: string
      clienteNombre: string | null
      mascotaNombre: string | null
      servicioNombre: string | null
    }>
  }
}

const loading = ref(true)
const error = ref('')
const payload = ref<AdminHomeResponse | null>(null)
const currentPath = window.location.pathname.toLowerCase()

const greeting = computed(() => {
  if (!payload.value) {
    return 'Panel administrativo de Sweety Puppies'
  }

  return `Bienvenida, ${payload.value.profile.nombre}`
})

const summaryCards = computed(() => {
  const summary = payload.value?.summary

  return [
    {
      label: 'Citas de hoy',
      value: String(summary?.citasHoy ?? 0),
      helper: 'Solicitudes y atenciones activas del dia',
    },
    {
      label: 'Citas pendientes',
      value: String(summary?.citasPendientes ?? 0),
      helper: 'Pendientes de revision administrativa',
    },
    {
      label: 'Mascotas registradas',
      value: String(summary?.mascotasRegistradas ?? 0),
      helper: 'Peluditos vinculados al sistema',
    },
    {
      label: 'Clientes registrados',
      value: String(summary?.clientesRegistrados ?? 0),
      helper: 'Familias activas en el portal',
    },
    {
      label: 'Servicios del mes',
      value: String(summary?.serviciosMes ?? 0),
      helper: 'Atenciones ya completadas este mes',
    },
  ]
})

const quickActions = [
  { title: 'Ver agenda de hoy', href: '/admin/agenda', tone: 'pink' },
  { title: 'Revisar citas pendientes', href: '/admin/agenda', tone: 'blue' },
  { title: 'Gestionar tarifas', href: '/admin/tarifas', tone: 'pink' },
  { title: 'Ver historial reciente', href: '/admin/historial', tone: 'blue' },
]

const moduleCards = [
  {
    title: 'Agenda de citas',
    description: 'Revisa solicitudes pendientes, citas confirmadas y atenciones del dia.',
    href: '/admin/agenda',
    badge: 'Agenda',
  },
  {
    title: 'Clientes',
    description: 'Consulta la base de familias, contactos y datos relevantes del negocio.',
    href: '/admin/clientes',
    badge: 'Clientes',
  },
  {
    title: 'Mascotas',
    description: 'Accede al perfil peludito, estados de salud y datos de cuidado.',
    href: '/admin/mascotas',
    badge: 'Mascotas',
  },
  {
    title: 'Historial de servicios',
    description: 'Consulta servicios finalizados, recomendaciones y seguimiento operativo.',
    href: '/admin/historial',
    badge: 'Historial',
  },
  {
    title: 'Servicios',
    description: 'Organiza los servicios principales que ofrece Sweety Puppies.',
    href: '/admin/servicios',
    badge: 'Servicios',
  },
  {
    title: 'Servicios adicionales',
    description: 'Prepara la gestion de extras y complementos del cuidado peludito.',
    href: '/admin/adicionales',
    badge: 'Adicionales',
  },
  {
    title: 'Tarifas',
    description: 'Configura valores base y ajustes del negocio segun tamano o pelaje.',
    href: '/admin/tarifas',
    badge: 'Tarifas',
  },
  {
    title: 'Bloqueos de agenda',
    description: 'Controla fechas no disponibles y ventanas operativas especiales.',
    href: '/admin/bloqueos',
    badge: 'Bloqueos',
  },
  {
    title: 'Contenido del portal',
    description: 'Aqui Sara podra publicar imagenes, anuncios y contenido que sera visible en el inicio de los clientes.',
    href: '/admin/contenido',
    badge: 'Contenido',
  },
  {
    title: 'Reportes',
    description: 'Aqui se concentrara la rentabilidad del negocio, ventas por dia y analisis operativo de Sweety Puppies.',
    href: '/admin/reportes',
    badge: 'Reportes',
  },
]

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  try {
    payload.value = await apiGet<AdminHomeResponse>('/api/auth/me/admin-home')
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el panel administrativo'
  } finally {
    loading.value = false
  }
})

function goTo(path: string) {
  navigateTo(path)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Por confirmar'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Por confirmar'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function formatTime(value: string | null) {
  if (!value) {
    return 'Por confirmar'
  }

  return String(value).slice(0, 5)
}

function formatLabel(value: string | null) {
  if (!value) {
    return 'Sin dato'
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
</script>

<template>
  <main class="admin-home-page">
    <section v-if="loading" class="admin-shell state-card">
      <h1>Cargando el centro de control...</h1>
      <p>Estamos preparando tu panel administrativo con la informacion del negocio.</p>
    </section>

    <section v-else-if="error" class="admin-shell state-card">
      <h1>No pudimos abrir el panel administrativo</h1>
      <p>{{ error }}</p>
      <div class="card-actions">
        <a href="/login" class="btn-secundario" @click.prevent="goTo('/login')">Volver al acceso</a>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesion</button>
      </div>
    </section>

    <template v-else-if="payload">
      <AdminSiteHeader :current-path="currentPath" />

      <section class="admin-shell hero-card">
        <div class="hero-main">
          <span class="admin-pill">Panel principal</span>
          <h1>{{ greeting }}</h1>
          <p>{{ payload.about.description }}</p>

          <div class="hero-note-card">
            <strong>{{ payload.about.title }}</strong>
            <span>{{ payload.about.note }}</span>
          </div>
        </div>

        <aside class="hero-side">
          <div class="profile-card">
            <span class="admin-pill subtle">Perfil administrativo</span>
            <h2>{{ payload.profile.nombre }} {{ payload.profile.apellido }}</h2>
            <div class="profile-grid">
              <div>
                <strong>Correo</strong>
                <span>{{ payload.profile.email }}</span>
              </div>
              <div>
                <strong>Telefono</strong>
                <span>{{ payload.profile.telefono || 'Pendiente por actualizar' }}</span>
              </div>
              <div>
                <strong>Rol</strong>
                <span>Administradora</span>
              </div>
              <div>
                <strong>Ambiente</strong>
                <span>Centro operativo Sweety Puppies</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="admin-shell summary-card">
          <strong>{{ card.label }}</strong>
          <span class="summary-value">{{ card.value }}</span>
          <small>{{ card.helper }}</small>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="admin-shell agenda-card">
          <div class="section-head">
            <div>
              <span class="admin-pill subtle">Agenda de hoy</span>
              <h2>Lo que necesita tu atencion hoy</h2>
            </div>
            <a href="/admin/agenda" class="section-link" @click.prevent="goTo('/admin/agenda')">Ir a agenda</a>
          </div>

          <div v-if="payload.summary.agendaHoy.length" class="agenda-list">
            <div v-for="appointment in payload.summary.agendaHoy" :key="appointment.id" class="agenda-item">
              <div>
                <strong>{{ formatTime(appointment.horaInicio) }}</strong>
                <span>{{ appointment.servicioNombre || 'Servicio por revisar' }}</span>
              </div>
              <div>
                <strong>{{ appointment.mascotaNombre || 'Mascota por revisar' }}</strong>
                <span>{{ appointment.clienteNombre || 'Cliente por confirmar' }}</span>
              </div>
              <span class="status-badge" :class="formatLabel(appointment.estado).toLowerCase().replace(/\s+/g, '-')">
                {{ formatLabel(appointment.estado) }}
              </span>
            </div>
          </div>
          <div v-else class="empty-block">
            <p>No hay citas activas para hoy. Puedes aprovechar para revisar tarifas, galeria o bloqueos.</p>
          </div>
        </article>

        <div class="side-column">
          <article class="admin-shell quick-actions-card">
            <span class="admin-pill subtle">Accesos rapidos</span>
            <h2>Movimientos frecuentes</h2>
            <div class="quick-actions-grid">
              <button
                v-for="action in quickActions"
                :key="action.title"
                type="button"
                class="quick-action-button"
                :class="action.tone"
                @click="goTo(action.href)"
              >
                {{ action.title }}
              </button>
            </div>
          </article>

          <article class="admin-shell blocks-card">
            <div class="section-head">
              <div>
                <span class="admin-pill subtle">Bloqueos proximos</span>
                <h2>Ventanas importantes de agenda</h2>
              </div>
              <a href="/admin/bloqueos" class="section-link" @click.prevent="goTo('/admin/bloqueos')">Gestionar</a>
            </div>

            <div v-if="payload.summary.bloqueosProximos.items.length" class="blocks-list">
              <div v-for="block in payload.summary.bloqueosProximos.items" :key="block.id" class="block-item">
                <strong>{{ formatDate(block.fecha) }}</strong>
                <span>
                  {{ block.horaInicio ? formatTime(block.horaInicio) : 'Dia completo' }}
                  <template v-if="block.horaFin"> · {{ formatTime(block.horaFin) }}</template>
                </span>
                <small>{{ block.motivo || 'Bloqueo administrativo' }}</small>
              </div>
            </div>
            <div v-else class="empty-block">
              <p>No hay bloqueos proximos registrados en la agenda.</p>
            </div>
          </article>
        </div>
      </section>

      <section class="modules-section">
        <div class="section-head section-head-wide">
          <div>
            <span class="admin-pill">Modulos principales</span>
            <h2>Explora el ERP de Sweety Puppies</h2>
          </div>
        </div>

        <div class="modules-grid">
          <article v-for="moduleCard in moduleCards" :key="moduleCard.title" class="admin-shell module-card">
            <span class="module-badge">{{ moduleCard.badge }}</span>
            <h3>{{ moduleCard.title }}</h3>
            <p>{{ moduleCard.description }}</p>
            <button type="button" class="btn-enviar module-button" @click="goTo(moduleCard.href)">Abrir modulo</button>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.admin-home-page {
  width: min(1400px, calc(100vw - 42px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.admin-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.state-card,
.hero-card,
.summary-card,
.agenda-card,
.quick-actions-card,
.blocks-card,
.module-card {
  padding: 28px;
}

.admin-pill,
.module-badge {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
}

.admin-pill.subtle {
  margin-bottom: 12px;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 22px;
}

.hero-card h1,
.profile-card h2,
.section-head h2,
.modules-section h2 {
  margin: 14px 0 12px;
  color: #8f176e;
}

.hero-card p,
.profile-grid span,
.summary-card small,
.agenda-item span,
.block-item span,
.block-item small,
.module-card p,
.empty-block p,
.state-card p {
  color: #6e5064;
  line-height: 1.75;
}

.hero-note-card,
.profile-card,
.summary-card,
.agenda-item,
.block-item,
.module-card {
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.hero-note-card {
  margin-top: 22px;
  padding: 20px;
  border-radius: 24px;
}

.hero-note-card strong,
.profile-grid strong,
.summary-card strong,
.agenda-item strong,
.block-item strong {
  display: block;
  margin-bottom: 6px;
  color: #9c0076;
}

.profile-card {
  border-radius: 26px;
  padding: 22px;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile-grid div {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.75);
}

.summary-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  border-radius: 26px;
}

.summary-value {
  display: block;
  margin: 10px 0 8px;
  font-size: 1.8rem;
  font-weight: 800;
  color: #4d2d47;
}

.dashboard-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
  gap: 18px;
}

.side-column {
  display: grid;
  gap: 18px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.section-head-wide {
  margin-bottom: 18px;
}

.section-link {
  color: #0b9f93;
  font-weight: 700;
  text-decoration: none;
}

.agenda-list,
.blocks-list,
.quick-actions-grid,
.modules-grid {
  display: grid;
  gap: 12px;
}

.agenda-item,
.block-item {
  border-radius: 22px;
  padding: 18px;
  display: grid;
  grid-template-columns: 1fr 1.2fr auto;
  gap: 14px;
  align-items: center;
}

.block-item {
  grid-template-columns: 1fr;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
}

.status-badge.pendiente {
  background: #fff3d8;
  color: #a16000;
}

.status-badge.confirmada {
  background: #e9fbf7;
  color: #0b9f93;
}

.status-badge.en-atencion {
  background: #eef5ff;
  color: #3967ca;
}

.quick-actions-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.quick-action-button {
  border: none;
  border-radius: 22px;
  padding: 18px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
  color: #8f176e;
  background: linear-gradient(135deg, #fff1f9 0%, #ffffff 100%);
  box-shadow: 0 10px 22px rgba(219, 126, 183, 0.1);
}

.quick-action-button.blue {
  background: linear-gradient(135deg, #eefafe 0%, #ffffff 100%);
}

.modules-section {
  margin-top: 24px;
}

.modules-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.module-card {
  border-radius: 26px;
  display: grid;
  gap: 12px;
}

.module-card h3 {
  margin: 2px 0 0;
  color: #8f176e;
}

.module-button {
  margin-top: auto;
}

.card-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

@media (max-width: 1240px) {
  .summary-grid,
  .modules-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .hero-card,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-home-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .state-card,
  .hero-card,
  .summary-card,
  .agenda-card,
  .quick-actions-card,
  .blocks-card,
  .module-card {
    padding: 22px;
    border-radius: 24px;
  }

  .summary-grid,
  .quick-actions-grid,
  .modules-grid,
  .profile-grid,
  .agenda-item {
    grid-template-columns: 1fr;
  }

  .section-head,
  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
