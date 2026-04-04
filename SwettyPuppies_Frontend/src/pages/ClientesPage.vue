<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet } from '@/lib/api'
import { logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type ClientListItem = {
  id: string
  usuario_id: string
  nombre: string
  apellido: string
  cedula: string | null
  telefono: string | null
  telefono_secundario: string | null
  direccion: string | null
  activo: boolean
  created_at: string
  updated_at: string
  email: string | null
  mascotas_registradas: number
  citas_activas: number
  servicios_realizados: number
  ultima_atencion: string | null
}

type ClientPet = {
  id: string
  nombre: string
  raza: string | null
  tamano: string | null
  tipo_pelaje: string | null
  comportamiento_habitual: string | null
  activo: boolean
  foto_mascota_url: string | null
}

type ClientRecentAppointment = {
  id: string
  fecha: string
  hora_inicio: string | null
  estado: string
}

type ClientDetail = ClientListItem & {
  mascotas: ClientPet[]
  resumen: {
    mascotasRegistradas: number
    citasActivas: number
    serviciosRealizados: number
    ultimaAtencion: string | null
  }
  citasRecientes: ClientRecentAppointment[]
}

type ClientListResponse = {
  success: boolean
  clientes: ClientListItem[]
  search: string
}

type ClientDetailResponse = {
  success: boolean
  cliente: ClientDetail
}

const currentPath = window.location.pathname.toLowerCase()
const loading = ref(true)
const detailLoading = ref(false)
const error = ref('')
const toast = ref('')
const searchTerm = ref('')
const appliedSearch = ref('')
const clients = ref<ClientListItem[]>([])
const selectedClient = ref<ClientDetail | null>(null)
const isDetailOpen = ref(false)
const fallbackPetImage = '/img/mascota1.png'

const summaryCards = computed(() => {
  const total = clients.value.length
  const active = clients.value.filter((item) => item.activo).length
  const pets = clients.value.reduce((sum, item) => sum + Number(item.mascotas_registradas || 0), 0)
  const activeAppointments = clients.value.reduce((sum, item) => sum + Number(item.citas_activas || 0), 0)

  return [
    { label: 'Clientes visibles', value: String(total), tone: 'pink' },
    { label: 'Activos', value: String(active), tone: 'mint' },
    { label: 'Mascotas registradas', value: String(pets), tone: 'lavender' },
    { label: 'Citas activas', value: String(activeAppointments), tone: 'sky' },
  ]
})

const emptyStateTitle = computed(() =>
  appliedSearch.value
    ? 'No encontramos clientes con esa busqueda'
    : 'Aun no hay clientes registrados en el portal'
)

const emptyStateMessage = computed(() =>
  appliedSearch.value
    ? 'Prueba buscando por nombre, apellido, cedula, telefono o correo.'
    : 'Cuando empiecen a registrarse, aqui apareceran sus fichas con mascotas, citas y actividad reciente.'
)

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  await loadClients()
})

async function loadClients(search = appliedSearch.value) {
  loading.value = true
  error.value = ''

  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    const data = await apiGet<ClientListResponse>(`/api/clientes${query}`)
    clients.value = data.clientes
    appliedSearch.value = data.search || search
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar los clientes'
  } finally {
    loading.value = false
  }
}

async function applySearch() {
  await loadClients(searchTerm.value.trim())
}

async function clearSearch() {
  searchTerm.value = ''
  await loadClients('')
}

async function openClientDetail(clientId: string) {
  detailLoading.value = true
  selectedClient.value = null
  isDetailOpen.value = true

  try {
    const data = await apiGet<ClientDetailResponse>(`/api/clientes/${clientId}`)
    selectedClient.value = data.cliente
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle del cliente'
    closeDetail()
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  isDetailOpen.value = false
  selectedClient.value = null
}

function showToast(message: string) {
  toast.value = message
  window.setTimeout(() => {
    if (toast.value === message) {
      toast.value = ''
    }
  }, 4200)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Sin registro'
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return 'Sin registro'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(dateValue: string, timeValue: string | null) {
  const normalizedTime = String(timeValue || '00:00:00')
  const date = new Date(`${dateValue}T${normalizedTime}`)
  if (Number.isNaN(date.getTime())) {
    return `${formatDate(dateValue)} · ${String(timeValue || 'Por confirmar').slice(0, 5)}`
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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
  <main class="admin-clients-page">
    <section v-if="loading" class="clients-shell state-card">
      <h1>Cargando el modulo de clientes...</h1>
      <p>Estamos preparando las fichas, mascotas asociadas y el resumen operativo del portal.</p>
    </section>

    <section v-else-if="error && !clients.length" class="clients-shell state-card">
      <h1>No pudimos abrir Clientes</h1>
      <p>{{ error }}</p>
      <div class="state-actions">
        <button type="button" class="btn-secundario" @click="loadClients()">Intentar de nuevo</button>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesion</button>
      </div>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="clients-shell hero-card">
        <div class="hero-copy">
          <span class="clients-pill">Clientes del portal</span>
          <h1>Relacion cercana con cada familia peluda</h1>
          <p>
            Consulta las fichas de los clientes, sus mascotas registradas y un resumen rapido de su actividad dentro de
            Sweety Puppies.
          </p>
          <div class="hero-note">
            <strong>Busqueda operativa</strong>
            <span>Encuentra por nombre, apellido, cedula, telefono o correo sin salir del panel administrativo.</span>
          </div>
        </div>

        <aside class="hero-search">
          <label class="field-group">
            <span>Buscar cliente</span>
            <input
              v-model="searchTerm"
              type="search"
              placeholder="Ejemplo: Dylan, 1003882041, gmail.com..."
              @keyup.enter="applySearch"
            >
          </label>
          <div class="search-actions">
            <button type="button" class="btn-enviar" @click="applySearch">Buscar</button>
            <button type="button" class="btn-secundario" @click="clearSearch">Limpiar</button>
          </div>
        </aside>
      </section>

      <p v-if="toast" class="toast-banner">{{ toast }}</p>
      <p v-if="error" class="error-banner">{{ error }}</p>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="clients-shell summary-card" :class="card.tone">
          <strong>{{ card.label }}</strong>
          <span class="summary-value">{{ card.value }}</span>
        </article>
      </section>

      <section class="clients-shell list-card">
        <div class="section-head">
          <div>
            <span class="clients-pill subtle">Listado principal</span>
            <h2>{{ appliedSearch ? `Resultados para "${appliedSearch}"` : 'Clientes registrados' }}</h2>
          </div>
          <span class="section-copy">
            {{ clients.length }} {{ clients.length === 1 ? 'cliente visible' : 'clientes visibles' }}
          </span>
        </div>

        <div v-if="clients.length" class="clients-grid">
          <article v-for="item in clients" :key="item.id" class="client-card">
            <div class="client-head">
              <div>
                <strong>{{ item.nombre }} {{ item.apellido }}</strong>
                <span>{{ item.email || 'Correo por confirmar' }}</span>
              </div>
              <span class="status-badge" :class="item.activo ? 'activo' : 'inactivo'">
                {{ item.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <div class="client-data-grid">
              <div>
                <small>Cedula</small>
                <span>{{ item.cedula || 'Sin registro' }}</span>
              </div>
              <div>
                <small>Telefono</small>
                <span>{{ item.telefono || 'Sin registro' }}</span>
              </div>
              <div>
                <small>Mascotas</small>
                <span>{{ item.mascotas_registradas }}</span>
              </div>
              <div>
                <small>Servicios</small>
                <span>{{ item.servicios_realizados }}</span>
              </div>
            </div>

            <div class="client-footer">
              <div class="soft-chip-group">
                <span class="soft-chip">Citas activas: {{ item.citas_activas }}</span>
                <span class="soft-chip">Ultima atencion: {{ formatDate(item.ultima_atencion) }}</span>
              </div>
              <button type="button" class="btn-enviar compact" @click="openClientDetail(item.id)">Ver detalle</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <h3>{{ emptyStateTitle }}</h3>
          <p>{{ emptyStateMessage }}</p>
        </div>
      </section>

      <div v-if="isDetailOpen" class="modal-overlay" @click.self="closeDetail">
        <section class="clients-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="clients-pill subtle">Detalle de cliente</span>
              <h2>{{ selectedClient ? `${selectedClient.nombre} ${selectedClient.apellido}` : 'Cargando cliente...' }}</h2>
              <p class="modal-copy">
                Revisa informacion de contacto, mascotas vinculadas y un resumen rapido de su actividad en el negocio.
              </p>
            </div>
            <button type="button" class="modal-close" @click="closeDetail">x</button>
          </div>

          <div v-if="detailLoading" class="empty-state compact">
            <p>Estamos cargando la ficha completa del cliente...</p>
          </div>

          <template v-else-if="selectedClient">
            <div class="detail-grid">
              <article class="detail-card">
                <strong>Nombre completo</strong>
                <span>{{ selectedClient.nombre }} {{ selectedClient.apellido }}</span>
                <small>Cedula: {{ selectedClient.cedula || 'Sin registro' }}</small>
              </article>

              <article class="detail-card">
                <strong>Contacto principal</strong>
                <span>{{ selectedClient.telefono || 'Sin telefono principal' }}</span>
                <small>{{ selectedClient.telefono_secundario || 'Sin telefono secundario' }}</small>
              </article>

              <article class="detail-card">
                <strong>Correo electronico</strong>
                <span>{{ selectedClient.email || 'Sin correo' }}</span>
                <small>{{ selectedClient.activo ? 'Cliente activo' : 'Cliente inactivo' }}</small>
              </article>

              <article class="detail-card">
                <strong>Direccion</strong>
                <span>{{ selectedClient.direccion || 'Aun no registrada' }}</span>
                <small>Alta en portal: {{ formatDate(selectedClient.created_at) }}</small>
              </article>
            </div>

            <div class="summary-strip">
              <article class="mini-summary">
                <strong>{{ selectedClient.resumen.mascotasRegistradas }}</strong>
                <span>Mascotas registradas</span>
              </article>
              <article class="mini-summary">
                <strong>{{ selectedClient.resumen.citasActivas }}</strong>
                <span>Citas activas</span>
              </article>
              <article class="mini-summary">
                <strong>{{ selectedClient.resumen.serviciosRealizados }}</strong>
                <span>Servicios realizados</span>
              </article>
              <article class="mini-summary">
                <strong>{{ formatDate(selectedClient.resumen.ultimaAtencion) }}</strong>
                <span>Ultima atencion</span>
              </article>
            </div>

            <div class="detail-columns">
              <article class="detail-card wide">
                <div class="detail-section-head">
                  <div>
                    <strong>Mascotas asociadas</strong>
                    <small>{{ selectedClient.mascotas.length }} registradas</small>
                  </div>
                </div>
                <div v-if="selectedClient.mascotas.length" class="pets-grid">
                  <div v-for="pet in selectedClient.mascotas" :key="pet.id" class="pet-card">
                    <img
                      :src="pet.foto_mascota_url || fallbackPetImage"
                      :alt="pet.nombre"
                      class="pet-photo"
                    >
                    <div>
                      <strong>{{ pet.nombre }}</strong>
                      <span>{{ pet.raza || 'Raza por confirmar' }}</span>
                      <small>{{ formatLabel(pet.tamano) }} · {{ formatLabel(pet.tipo_pelaje) }}</small>
                      <small>{{ formatLabel(pet.comportamiento_habitual) }}</small>
                    </div>
                    <span class="status-badge inline" :class="pet.activo ? 'activo' : 'inactivo'">
                      {{ pet.activo ? 'Activa' : 'Inactiva' }}
                    </span>
                  </div>
                </div>
                <div v-else class="empty-state compact">
                  <p>Este cliente aun no tiene mascotas registradas.</p>
                </div>
              </article>

              <article class="detail-card wide">
                <div class="detail-section-head">
                  <div>
                    <strong>Actividad reciente</strong>
                    <small>Citas mas recientes del cliente</small>
                  </div>
                </div>
                <div v-if="selectedClient.citasRecientes.length" class="recent-list">
                  <div v-for="item in selectedClient.citasRecientes" :key="item.id" class="recent-item">
                    <div>
                      <strong>{{ formatDateTime(item.fecha, item.hora_inicio) }}</strong>
                      <small>{{ formatLabel(item.estado) }}</small>
                    </div>
                    <span class="soft-chip">{{ item.id.slice(0, 8) }}</span>
                  </div>
                </div>
                <div v-else class="empty-state compact">
                  <p>Este cliente aun no registra citas en el sistema.</p>
                </div>
              </article>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="btn-secundario"
                @click="showToast('El detalle del cliente ya quedo listo para conectarse con mascotas, citas e historial.')"
              >
                Modulo listo para crecer
              </button>
            </div>
          </template>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.admin-clients-page {
  width: min(1440px, calc(100vw - 42px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.clients-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.state-card,
.hero-card,
.summary-card,
.list-card,
.modal-card {
  padding: 28px;
}

.clients-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
}

.clients-pill.subtle {
  margin-bottom: 12px;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
  gap: 22px;
}

.hero-card h1,
.section-head h2,
.modal-head h2 {
  margin: 12px 0;
  color: #8f176e;
}

.hero-copy p,
.hero-note span,
.state-card p,
.empty-state p,
.modal-copy,
.client-data-grid small,
.client-data-grid span,
.detail-card span,
.detail-card small,
.mini-summary span {
  color: #6e5064;
  line-height: 1.7;
}

.hero-note,
.summary-card,
.client-card,
.detail-card,
.mini-summary,
.pet-card,
.recent-item {
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.hero-note,
.detail-card,
.pet-card,
.recent-item {
  border-radius: 24px;
}

.hero-note {
  margin-top: 18px;
  padding: 18px 20px;
}

.hero-note strong,
.summary-card strong,
.client-card strong,
.detail-card strong,
.mini-summary strong,
.pet-card strong,
.recent-item strong {
  display: block;
  color: #9c0076;
  margin-bottom: 6px;
}

.hero-search {
  display: grid;
  gap: 14px;
  align-content: start;
}

.field-group {
  display: grid;
  gap: 8px;
}

.field-group span {
  color: #8f176e;
  font-weight: 700;
}

.field-group input {
  border-radius: 18px;
  border: 1px solid rgba(243, 203, 228, 0.9);
  padding: 14px 16px;
  font: inherit;
  background: rgba(255, 255, 255, 0.95);
  color: #5b4256;
}

.search-actions,
.state-actions,
.modal-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-enviar,
.btn-secundario {
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
}

.btn-secundario {
  background: linear-gradient(135deg, #fff4fb 0%, #ffffff 100%);
  color: #8f176e;
  border: 1px solid rgba(243, 203, 228, 0.9);
  box-shadow: 0 10px 22px rgba(219, 126, 183, 0.1);
}

.btn-enviar {
  background: linear-gradient(135deg, #c1008f 0%, #e95adb 100%);
  color: #fff;
  box-shadow: 0 16px 30px rgba(233, 90, 219, 0.24);
}

.btn-enviar.compact {
  padding-inline: 16px;
}

.summary-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  border-radius: 26px;
}

.summary-value {
  display: block;
  margin-top: 10px;
  font-size: 1.85rem;
  font-weight: 800;
  color: #4d2d47;
}

.summary-card.mint .summary-value {
  color: #0b9f93;
}

.summary-card.lavender .summary-value {
  color: #6d56b8;
}

.summary-card.sky .summary-value {
  color: #2f67c8;
}

.list-card {
  margin-top: 24px;
  display: grid;
  gap: 18px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}

.section-copy {
  color: #6e5064;
  font-weight: 600;
}

.clients-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.client-card {
  border-radius: 28px;
  padding: 22px;
  display: grid;
  gap: 16px;
}

.client-head,
.client-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.client-head span {
  color: #6e5064;
}

.status-badge,
.soft-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.84rem;
}

.status-badge.activo {
  background: #e9fbf7;
  color: #0b9f93;
}

.status-badge.inactivo {
  background: #fff1f4;
  color: #c33b74;
}

.status-badge.inline {
  justify-self: start;
}

.soft-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.soft-chip {
  background: #fff4fb;
  color: #8f176e;
}

.client-data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.client-data-grid small,
.client-data-grid span {
  display: block;
}

.client-data-grid small {
  color: #9c0076;
  font-weight: 700;
  margin-bottom: 2px;
}

.empty-state {
  padding: 28px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 247, 251, 0.94) 0%, rgba(238, 250, 255, 0.92) 100%);
  border: 1px solid rgba(243, 209, 230, 0.9);
  text-align: center;
}

.empty-state.compact {
  padding: 18px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 72;
  background: rgba(77, 45, 71, 0.26);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-card {
  width: min(1220px, 100%);
  max-height: min(90vh, 960px);
  overflow-y: auto;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.modal-close {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 1.8rem;
  line-height: 1;
  background: linear-gradient(135deg, #fff4fb 0%, #eefafe 100%);
  color: #8f176e;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.detail-card {
  padding: 18px;
}

.summary-strip {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.mini-summary {
  border-radius: 22px;
  padding: 16px 18px;
}

.detail-columns {
  margin-top: 18px;
  display: grid;
  gap: 16px;
}

.detail-card.wide {
  display: grid;
  gap: 14px;
}

.detail-section-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.pets-grid,
.recent-list {
  display: grid;
  gap: 12px;
}

.pet-card,
.recent-item {
  padding: 16px;
}

.pet-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
}

.pet-photo {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 22px;
  border: 1px solid rgba(243, 203, 228, 0.9);
}

.toast-banner,
.error-banner {
  margin: 16px 0 0;
  padding: 16px 18px;
  border-radius: 20px;
  font-weight: 600;
}

.toast-banner {
  background: rgba(233, 251, 247, 0.94);
  border: 1px solid rgba(115, 214, 177, 0.9);
  color: #0b8a77;
}

.error-banner {
  background: rgba(255, 240, 245, 0.96);
  border: 1px solid rgba(255, 176, 214, 0.96);
  color: #b33c70;
}

@media (max-width: 1260px) {
  .summary-grid,
  .summary-strip,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .hero-card,
  .clients-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-clients-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .state-card,
  .hero-card,
  .summary-card,
  .list-card,
  .modal-card {
    padding: 22px;
    border-radius: 24px;
  }

  .summary-grid,
  .summary-strip,
  .detail-grid,
  .client-data-grid {
    grid-template-columns: 1fr;
  }

  .client-head,
  .client-footer,
  .modal-head,
  .search-actions,
  .state-actions,
  .modal-actions,
  .pet-card,
  .recent-item {
    flex-direction: column;
    align-items: stretch;
    display: flex;
  }
}
</style>
