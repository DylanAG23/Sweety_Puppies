<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { apiGet, apiPatch } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import ClientSiteHeader from '@/components/ClientSiteHeader.vue'

type PetOption = {
  id: string
  nombre: string
  raza: string | null
}

type CurrentAppointment = {
  id: string
  mascotaId: string
  mascotaNombre: string
  mascotaRaza: string | null
  mascotaTamano: string | null
  mascotaTipoPelaje: string | null
  mascotaFotoUrl: string | null
  servicioNombre: string
  fecha: string
  horaInicio: string | null
  horaFinEstimada: string | null
  estado: 'pendiente' | 'confirmada' | 'en_atencion'
  precioBase: number | null
  precioCalculado: number | null
  precioFinal: number | null
  precioMostrado: number | null
}

type CurrentAppointmentDetail = {
  id: string
  fecha: string
  horaInicio: string | null
  horaFinEstimada: string | null
  estado: 'pendiente' | 'confirmada' | 'en_atencion'
  estadoPelajeReportado: string | null
  comportamientoReportado: string | null
  fotoEstadoActualUrl: string | null
  observacionesCliente: string | null
  precioBase: number | null
  precioCalculado: number | null
  precioFinal: number | null
  mensajeEstado: string
  mascota: {
    id: string
    nombre: string
    raza: string | null
    tamano: string | null
    tipoPelaje: string | null
    fotoUrl: string | null
  }
  servicioPrincipal: {
    id: string
    nombre: string
  }
  serviciosAdicionales: Array<{
    id: string
    nombre: string
    precio: number | null
  }>
}

type CompletedService = {
  id: string
  citaId: string | null
  mascotaId: string | null
  fechaServicio: string
  mascotaNombre: string
  mascotaRaza: string | null
  mascotaTamano: string | null
  mascotaTipoPelaje: string | null
  servicioPrincipalNombre: string
  serviciosAdicionalesResumen: string | null
  resumenServicioRealizado: string | null
  observacionesFinales: string | null
  recomendaciones: string | null
  precioBase: number | null
  precioCalculado: number | null
  precioFinal: number | null
}

type CompletedServiceDetail = {
  id: string
  citaId: string | null
  fechaServicio: string
  clienteNombreCompleto: string | null
  clienteEmail: string | null
  clienteTelefono: string | null
  mascotaNombre: string
  mascotaRaza: string | null
  mascotaTamano: string | null
  mascotaTipoPelaje: string | null
  servicioPrincipalNombre: string
  serviciosAdicionalesResumen: string | null
  resumenServicioRealizado: string | null
  estadoPelajeReal: string | null
  comportamientoObservado: string | null
  observacionesFinales: string | null
  recomendaciones: string | null
  precioBase: number | null
  precioCalculado: number | null
  precioFinal: number | null
}

type HistoryResponse = {
  success: boolean
  citasActuales: CurrentAppointment[]
  serviciosRealizados: CompletedService[]
  mascotas: PetOption[]
}

type AppointmentDetailResponse = {
  success: boolean
  cita: CurrentAppointmentDetail
}

type CompletedServiceDetailResponse = {
  success: boolean
  servicio: CompletedServiceDetail
}

type AvailabilityResponse = {
  success: boolean
  fecha: string
  message: string | null
  slots: Array<{
    horaInicio: string
    horaFinEstimada: string
    label: string
  }>
}

type AppointmentActionResponse = {
  success: boolean
  message: string
  cita?: {
    id: string
    fecha: string
    hora_inicio: string
    hora_fin_estimada: string
    estado: string
  }
}

const fallbackPetImage = '/img/mascota1.png'
const currentPath = window.location.pathname.toLowerCase()
const todayDate = new Date().toISOString().split('T')[0]
const currentTab = ref<'citas' | 'servicios'>('citas')
const loading = ref(true)
const detailLoading = ref(false)
const actionLoading = ref(false)
const reprogramAvailabilityLoading = ref(false)
const error = ref('')
const toast = ref('')
const filterPetId = ref('')
const filterText = ref('')
const citasActuales = ref<CurrentAppointment[]>([])
const serviciosRealizados = ref<CompletedService[]>([])
const mascotas = ref<PetOption[]>([])
const selectedAppointment = ref<CurrentAppointmentDetail | null>(null)
const selectedCompletedService = ref<CompletedServiceDetail | null>(null)
const isAppointmentDetailOpen = ref(false)
const isCompletedDetailOpen = ref(false)
const isCancelConfirmOpen = ref(false)
const isReprogramPanelOpen = ref(false)
const reprogramDate = ref('')
const reprogramTime = ref('')
const reprogramMessage = ref('')
const reprogramSlots = ref<AvailabilityResponse['slots']>([])
const cancellationReason = ref('')
const cancelDialog = reactive({
  title: 'Cancelar cita',
  message: '',
  confirmLabel: 'Sí, cancelar',
})

const filteredCurrentAppointments = computed(() =>
  citasActuales.value.filter((appointment) => {
    const matchesPet = !filterPetId.value || appointment.mascotaId === filterPetId.value
    const query = normalizeText(filterText.value)
    const matchesText =
      !query ||
      normalizeText(appointment.mascotaNombre).includes(query) ||
      normalizeText(appointment.servicioNombre).includes(query) ||
      normalizeText(appointment.estado).includes(query)

    return matchesPet && matchesText
  })
)

const filteredCompletedServices = computed(() =>
  serviciosRealizados.value.filter((service) => {
    const matchesPet = !filterPetId.value || service.mascotaId === filterPetId.value
    const query = normalizeText(filterText.value)
    const matchesText =
      !query ||
      normalizeText(service.mascotaNombre).includes(query) ||
      normalizeText(service.servicioPrincipalNombre).includes(query) ||
      normalizeText(service.serviciosAdicionalesResumen).includes(query)

    return matchesPet && matchesText
  })
)

const canManageSelectedAppointment = computed(() =>
  Boolean(selectedAppointment.value && ['pendiente', 'confirmada'].includes(selectedAppointment.value.estado))
)

watch(reprogramDate, async () => {
  reprogramTime.value = ''
  reprogramSlots.value = []
  reprogramMessage.value = ''

  if (!isReprogramPanelOpen.value || !reprogramDate.value || !selectedAppointment.value) {
    return
  }

  await loadReprogramAvailability()
})

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('cliente')
  if (!session) {
    loading.value = false
    return
  }

  await loadHistory()
})

async function loadHistory() {
  loading.value = true
  error.value = ''

  try {
    const data = await apiGet<HistoryResponse>('/api/cliente/historial')
    citasActuales.value = data.citasActuales
    serviciosRealizados.value = data.serviciosRealizados
    mascotas.value = data.mascotas
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar tu historial'
  } finally {
    loading.value = false
  }
}

async function openAppointmentDetail(appointmentId: string) {
  detailLoading.value = true
  selectedAppointment.value = null
  isAppointmentDetailOpen.value = true
  isReprogramPanelOpen.value = false
  reprogramDate.value = ''
  reprogramTime.value = ''
  reprogramSlots.value = []
  reprogramMessage.value = ''

  try {
    const data = await apiGet<AppointmentDetailResponse>(`/api/cliente/historial/citas/${appointmentId}`)
    selectedAppointment.value = data.cita
    reprogramDate.value = extractDatePart(data.cita.fecha)
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle de la cita'
    closeAppointmentDetail()
  } finally {
    detailLoading.value = false
  }
}

async function openCompletedServiceDetail(serviceId: string) {
  detailLoading.value = true
  selectedCompletedService.value = null
  isCompletedDetailOpen.value = true

  try {
    const data = await apiGet<CompletedServiceDetailResponse>(`/api/cliente/historial/servicios/${serviceId}`)
    selectedCompletedService.value = data.servicio
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle de la cita realizada'
    closeCompletedDetail()
  } finally {
    detailLoading.value = false
  }
}

function closeAppointmentDetail() {
  isAppointmentDetailOpen.value = false
  selectedAppointment.value = null
  isReprogramPanelOpen.value = false
  reprogramDate.value = ''
  reprogramTime.value = ''
  reprogramSlots.value = []
  reprogramMessage.value = ''
}

function closeCompletedDetail() {
  isCompletedDetailOpen.value = false
  selectedCompletedService.value = null
}

async function loadReprogramAvailability() {
  if (!selectedAppointment.value || !reprogramDate.value) {
    return
  }

  reprogramAvailabilityLoading.value = true

  try {
    const query = new URLSearchParams({
      appointmentId: selectedAppointment.value.id,
      mascotaId: selectedAppointment.value.mascota.id,
      servicioId: selectedAppointment.value.servicioPrincipal.id,
      estadoPelajeReportado: selectedAppointment.value.estadoPelajeReportado || 'normal',
      comportamientoReportado: selectedAppointment.value.comportamientoReportado || 'normal',
      fecha: reprogramDate.value,
    })

    for (const additional of selectedAppointment.value.serviciosAdicionales) {
      query.append('servicioAdicionalIds', additional.id)
    }

    const data = await apiGet<AvailabilityResponse>(`/api/cliente/citas/availability?${query.toString()}`)
    reprogramSlots.value = data.slots
    reprogramMessage.value = data.message || ''
  } catch (caughtError) {
    reprogramSlots.value = []
    reprogramMessage.value = ''
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo consultar la disponibilidad para reprogramar'
  } finally {
    reprogramAvailabilityLoading.value = false
  }
}

async function toggleReprogramPanel() {
  if (!canManageSelectedAppointment.value) {
    return
  }

  isReprogramPanelOpen.value = !isReprogramPanelOpen.value

  if (isReprogramPanelOpen.value && reprogramDate.value) {
    await loadReprogramAvailability()
  }
}

async function cancelAppointment() {
  if (!selectedAppointment.value || !canManageSelectedAppointment.value) {
    return
  }

  actionLoading.value = true
  error.value = ''

  try {
    const data = await apiPatch<AppointmentActionResponse>(`/api/cliente/citas/${selectedAppointment.value.id}/cancel`, {
      motivoCancelacion: cancellationReason.value,
    })
    toast.value = data.message
    closeAppointmentDetail()
    await loadHistory()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cancelar la cita'
  } finally {
    actionLoading.value = false
  }
}

function requestCancelAppointment() {
  if (!selectedAppointment.value || !canManageSelectedAppointment.value) {
    return
  }

  cancelDialog.title = 'Cancelar cita'
  cancelDialog.message = `¿Deseas cancelar la cita de ${selectedAppointment.value.mascota.nombre}? Esta acción retirará la solicitud de tus citas actuales.`
  cancelDialog.confirmLabel = 'Sí, cancelar'
  cancellationReason.value = ''
  isCancelConfirmOpen.value = true
}

function closeCancelConfirm() {
  isCancelConfirmOpen.value = false
  cancellationReason.value = ''
}

async function confirmCancelAppointment() {
  if (!cancellationReason.value.trim()) {
    error.value = 'Debes escribir el motivo de cancelación'
    return
  }

  try {
    await cancelAppointment()
  } finally {
    closeCancelConfirm()
  }
}

async function submitReprogramAppointment() {
  if (!selectedAppointment.value || !canManageSelectedAppointment.value) {
    return
  }

  if (!reprogramDate.value) {
    error.value = 'Debes seleccionar una nueva fecha'
    return
  }

  if (!reprogramTime.value) {
    error.value = 'Debes elegir una hora disponible para reprogramar'
    return
  }

  actionLoading.value = true
  error.value = ''

  try {
    const data = await apiPatch<AppointmentActionResponse>(`/api/cliente/citas/${selectedAppointment.value.id}/reprogram`, {
      fecha: reprogramDate.value,
      horaInicio: reprogramTime.value,
    })

    toast.value = data.message
    closeAppointmentDetail()
    await loadHistory()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo reprogramar la cita'
  } finally {
    actionLoading.value = false
  }
}

function goTo(path: string) {
  navigateTo(path)
}

function petImage(url: string | null) {
  return url || fallbackPetImage
}

function normalizeText(value: string | null | undefined) {
  return (value || '').toLowerCase()
}

function formatCurrency(value: number | null) {
  if (value == null) {
    return 'Por confirmar'
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Fecha por confirmar'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Fecha por confirmar'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Por confirmar'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Por confirmar'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTime(value: string | null) {
  if (!value) {
    return 'Por confirmar'
  }

  return String(value).slice(0, 5)
}

function extractDatePart(value: string | null) {
  if (!value) {
    return ''
  }

  if (value.includes('T')) {
    return value.slice(0, 10)
  }

  return value
}

function formatLabel(value: string | null) {
  if (!value) {
    return 'No registrado'
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function currentAppointmentPrice(appointment: CurrentAppointment) {
  return appointment.precioFinal ?? appointment.precioMostrado ?? appointment.precioCalculado ?? appointment.precioBase
}

function statusClass(status: string) {
  if (status === 'confirmada') {
    return 'confirmada'
  }

  if (status === 'en_atencion') {
    return 'en-atencion'
  }

  return 'pendiente'
}
</script>

<template>
  <main class="history-page">
    <section v-if="loading" class="history-shell history-state-card">
      <h1>Cargando tu historial bonito...</h1>
      <p>Estamos reuniendo tus citas actuales y las citas realizadas para ti.</p>
    </section>

    <section v-else-if="error && !citasActuales.length && !serviciosRealizados.length" class="history-shell history-state-card">
      <h1>No pudimos abrir tu historial</h1>
      <p>{{ error }}</p>
      <div class="history-actions">
        <a href="/cliente" class="btn-secundario" @click.prevent="goTo('/cliente')">Ir a inicio</a>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else>
      <ClientSiteHeader :current-path="currentPath" />

      <section class="history-shell history-hero">
        <span class="history-pill">Mi historial</span>
        <h1>Consulta tus citas activas y las citas realizadas de tu peludito</h1>
        <p>
          Aqui puedes revisar el estado actual de tus citas, ver el detalle de cada visita y
          conservar una memoria linda del cuidado que ha recibido tu peludito.
        </p>
      </section>

      <section class="history-filters">
        <div class="history-shell tabs-card">
          <button type="button" class="tab-button" :class="{ active: currentTab === 'citas' }" @click="currentTab = 'citas'">
            Citas actuales
            <span>{{ citasActuales.length }}</span>
          </button>
          <button type="button" class="tab-button" :class="{ active: currentTab === 'servicios' }" @click="currentTab = 'servicios'">
            Citas realizadas
            <span>{{ serviciosRealizados.length }}</span>
          </button>
        </div>

        <div class="history-shell filter-card">
          <label class="field-block">
            <span>Filtrar por mascota</span>
            <select v-model="filterPetId">
              <option value="">Todas tus mascotas</option>
              <option v-for="pet in mascotas" :key="pet.id" :value="pet.id">
                {{ pet.nombre }}{{ pet.raza ? ` · ${pet.raza}` : '' }}
              </option>
            </select>
          </label>

          <label class="field-block">
            <span>Buscar por nombre o servicio</span>
            <input v-model.trim="filterText" type="text" placeholder="Ejemplo: Lulu, baño completo, confirmada...">
          </label>
        </div>
      </section>

      <p v-if="toast" class="history-feedback success">{{ toast }}</p>
      <p v-if="error && (citasActuales.length || serviciosRealizados.length)" class="history-feedback error">{{ error }}</p>

      <section v-if="currentTab === 'citas'" class="history-section">
        <div v-if="!filteredCurrentAppointments.length" class="history-shell empty-card">
          <span class="history-pill subtle">Citas actuales</span>
          <h2>Aún no tienes citas activas</h2>
          <p>
            Cuando agendes una nueva visita, aquí podrás consultar si está pendiente, confirmada o
            en atencion.
          </p>
          <div class="history-actions">
            <a href="/cliente/citas/nueva" class="btn-enviar" @click.prevent="goTo('/cliente/citas/nueva')">Agendar cita</a>
          </div>
        </div>

        <div v-else class="cards-grid">
          <article v-for="appointment in filteredCurrentAppointments" :key="appointment.id" class="history-shell history-card">
            <div class="card-top">
              <div class="card-pet">
                <img :src="petImage(appointment.mascotaFotoUrl)" :alt="appointment.mascotaNombre" class="card-pet-image">
                <div>
                  <h2>{{ appointment.mascotaNombre }}</h2>
                  <p>{{ appointment.mascotaRaza || 'Raza por confirmar' }}</p>
                </div>
              </div>
              <span class="status-badge" :class="statusClass(appointment.estado)">
                {{ formatLabel(appointment.estado) }}
              </span>
            </div>

            <div class="mini-grid">
              <div>
                <strong>Servicio principal</strong>
                <span>{{ appointment.servicioNombre }}</span>
              </div>
              <div>
                <strong>Fecha</strong>
                <span>{{ formatDate(appointment.fecha) }}</span>
              </div>
              <div>
                <strong>Hora</strong>
                <span>{{ formatTime(appointment.horaInicio) }}</span>
              </div>
              <div>
                <strong>Precio estimado</strong>
                <span>{{ formatCurrency(currentAppointmentPrice(appointment)) }}</span>
              </div>
            </div>

            <div class="history-actions card-actions">
              <button type="button" class="btn-enviar" @click="openAppointmentDetail(appointment.id)">Ver detalle</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="history-section">
        <div v-if="!filteredCompletedServices.length" class="history-shell empty-card">
          <span class="history-pill subtle">Citas realizadas</span>
          <h2>Todavia no tienes citas realizadas registradas</h2>
          <p>
            Cuando tu primera cita sea completada, aquí aparecerá el resumen bonito de esa cita
            con recomendaciones y observaciones.
          </p>
          <div class="history-actions">
            <a href="/cliente/citas/nueva" class="btn-enviar" @click.prevent="goTo('/cliente/citas/nueva')">Agendar cita</a>
            <a href="/cliente/mascotas" class="btn-secundario" @click.prevent="goTo('/cliente/mascotas')">Ver mis mascotas</a>
          </div>
        </div>

        <div v-else class="cards-grid">
          <article v-for="service in filteredCompletedServices" :key="service.id" class="history-shell history-card">
            <div class="card-top">
              <div class="card-pet">
                <div class="service-icon">HC</div>
                <div>
                  <h2>{{ service.mascotaNombre }}</h2>
                  <p>{{ service.servicioPrincipalNombre }}</p>
                </div>
              </div>
              <span class="status-badge completada">Realizado</span>
            </div>

            <div class="mini-grid">
              <div>
                <strong>Fecha del servicio</strong>
                <span>{{ formatDate(service.fechaServicio) }}</span>
              </div>
              <div>
                <strong>Precio final</strong>
                <span>{{ formatCurrency(service.precioFinal) }}</span>
              </div>
              <div>
                <strong>Tamano</strong>
                <span>{{ formatLabel(service.mascotaTamano) }}</span>
              </div>
              <div>
                <strong>Adicionales</strong>
                <span>{{ service.serviciosAdicionalesResumen || 'Sin adicionales registrados' }}</span>
              </div>
            </div>

            <div class="history-actions card-actions">
              <button type="button" class="btn-enviar" @click="openCompletedServiceDetail(service.id)">Ver detalle</button>
            </div>
          </article>
        </div>
      </section>

      <div v-if="isAppointmentDetailOpen" class="modal-overlay" @click.self="closeAppointmentDetail">
        <section class="history-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="history-pill">Detalle de cita</span>
              <h2 v-if="selectedAppointment">{{ selectedAppointment.mascota.nombre }}</h2>
              <p v-if="selectedAppointment" class="modal-copy">{{ selectedAppointment.mensajeEstado }}</p>
            </div>
            <button type="button" class="modal-close" @click="closeAppointmentDetail">×</button>
          </div>

          <div v-if="detailLoading" class="detail-loading">Cargando detalle de la cita...</div>

          <template v-else-if="selectedAppointment">
            <div class="detail-layout">
              <div class="detail-visual-card">
                <img :src="petImage(selectedAppointment.mascota.fotoUrl || selectedAppointment.fotoEstadoActualUrl)" :alt="selectedAppointment.mascota.nombre" class="detail-image">
                <div class="detail-badges">
                  <span class="status-badge" :class="statusClass(selectedAppointment.estado)">
                    {{ formatLabel(selectedAppointment.estado) }}
                  </span>
                  <span class="detail-chip">{{ selectedAppointment.servicioPrincipal.nombre }}</span>
                </div>
              </div>

              <div class="detail-info-grid">
                <div><strong>Mascota</strong><span>{{ selectedAppointment.mascota.nombre }}</span></div>
                <div><strong>Raza</strong><span>{{ selectedAppointment.mascota.raza || 'Por confirmar' }}</span></div>
                <div><strong>Tamano</strong><span>{{ formatLabel(selectedAppointment.mascota.tamano) }}</span></div>
                <div><strong>Pelaje</strong><span>{{ formatLabel(selectedAppointment.mascota.tipoPelaje) }}</span></div>
                <div><strong>Fecha</strong><span>{{ formatDate(selectedAppointment.fecha) }}</span></div>
                <div><strong>Hora de inicio</strong><span>{{ formatTime(selectedAppointment.horaInicio) }}</span></div>
                <div><strong>Hora fin estimada</strong><span>{{ formatTime(selectedAppointment.horaFinEstimada) }}</span></div>
                <div><strong>Estado del pelaje</strong><span>{{ formatLabel(selectedAppointment.estadoPelajeReportado) }}</span></div>
                <div><strong>Comportamiento reportado</strong><span>{{ formatLabel(selectedAppointment.comportamientoReportado) }}</span></div>
                <div><strong>Precio base</strong><span>{{ formatCurrency(selectedAppointment.precioBase) }}</span></div>
                <div><strong>Precio calculado</strong><span>{{ formatCurrency(selectedAppointment.precioCalculado) }}</span></div>
                <div><strong>Precio final</strong><span>{{ formatCurrency(selectedAppointment.precioFinal ?? selectedAppointment.precioCalculado) }}</span></div>
                <div class="full-width">
                  <strong>Observaciones del cliente</strong>
                  <span>{{ selectedAppointment.observacionesCliente || 'No registradas' }}</span>
                </div>
              </div>
            </div>

            <div v-if="selectedAppointment.serviciosAdicionales.length" class="detail-panel">
          <span class="history-pill subtle">Servicios adicionales</span>
              <div class="detail-pill-list">
                <span v-for="additional in selectedAppointment.serviciosAdicionales" :key="additional.id">
                  {{ additional.nombre }} · {{ formatCurrency(additional.precio) }}
                </span>
              </div>
            </div>

            <div v-if="selectedAppointment.fotoEstadoActualUrl" class="detail-panel">
              <span class="history-pill subtle">Foto del estado actual</span>
              <img :src="selectedAppointment.fotoEstadoActualUrl" alt="Estado actual de la mascota" class="detail-secondary-image">
            </div>

            <section v-if="canManageSelectedAppointment" class="detail-panel">
              <span class="history-pill subtle">Gestiona tu cita</span>
              <p class="modal-copy">
                Si necesitas cambiar la fecha u hora, puedes reprogramarla. Si ya no la necesitas,
                también puedes cancelarla desde aquí.
              </p>

              <div class="history-actions">
                <button
                  type="button"
                  class="btn-soft-cancel"
                  :disabled="actionLoading"
                  @click="requestCancelAppointment"
                >
                  {{ actionLoading ? 'Procesando...' : 'Cancelar cita' }}
                </button>
                <button
                  type="button"
                  class="btn-enviar"
                  :disabled="actionLoading"
                  @click="toggleReprogramPanel"
                >
                  {{ isReprogramPanelOpen ? 'Ocultar reprogramacion' : 'Reprogramar cita' }}
                </button>
              </div>

              <div v-if="isReprogramPanelOpen" class="reprogram-card">
                <div class="reprogram-grid">
                  <label class="field-block">
                    <span>Nueva fecha</span>
                    <input v-model="reprogramDate" type="date" :min="todayDate">
                  </label>
                </div>

                <p v-if="reprogramMessage" class="modal-copy">{{ reprogramMessage }}</p>
                <p v-if="reprogramAvailabilityLoading" class="detail-loading">Buscando horarios disponibles...</p>

                <div v-if="reprogramSlots.length" class="reprogram-slots">
                  <button
                    v-for="slot in reprogramSlots"
                    :key="slot.horaInicio"
                    type="button"
                    class="slot-button"
                    :class="{ active: reprogramTime === slot.horaInicio }"
                    @click="reprogramTime = slot.horaInicio"
                  >
                    <strong>{{ formatTime(slot.horaInicio) }}</strong>
                    <span>Hasta {{ formatTime(slot.horaFinEstimada) }}</span>
                  </button>
                </div>

                <div class="history-actions modal-actions">
                  <button type="button" class="btn-secundario" @click="isReprogramPanelOpen = false">Cerrar panel</button>
                  <button type="button" class="btn-enviar" :disabled="actionLoading" @click="submitReprogramAppointment">
                    {{ actionLoading ? 'Guardando...' : 'Confirmar nueva fecha' }}
                  </button>
                </div>
              </div>
            </section>

            <div class="history-actions modal-actions">
              <button type="button" class="btn-secundario" @click="closeAppointmentDetail">Cerrar</button>
            </div>
          </template>
        </section>
      </div>

      <div v-if="isCompletedDetailOpen" class="modal-overlay" @click.self="closeCompletedDetail">
        <section class="history-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="history-pill">Cita realizada</span>
              <h2 v-if="selectedCompletedService">{{ selectedCompletedService.mascotaNombre }}</h2>
              <p v-if="selectedCompletedService" class="modal-copy">
                Aqui puedes revisar el resumen final, observaciones y recomendaciones de la cita realizada.
              </p>
            </div>
            <button type="button" class="modal-close" @click="closeCompletedDetail">×</button>
          </div>

          <div v-if="detailLoading" class="detail-loading">Cargando la ficha de la cita realizada...</div>

          <template v-else-if="selectedCompletedService">
            <div class="detail-info-grid large">
              <div><strong>Cliente</strong><span>{{ selectedCompletedService.clienteNombreCompleto || 'No registrado' }}</span></div>
              <div><strong>Correo</strong><span>{{ selectedCompletedService.clienteEmail || 'No registrado' }}</span></div>
              <div><strong>Teléfono</strong><span>{{ selectedCompletedService.clienteTelefono || 'No registrado' }}</span></div>
              <div><strong>Mascota</strong><span>{{ selectedCompletedService.mascotaNombre }}</span></div>
              <div><strong>Raza</strong><span>{{ selectedCompletedService.mascotaRaza || 'No registrada' }}</span></div>
              <div><strong>Tamano</strong><span>{{ formatLabel(selectedCompletedService.mascotaTamano) }}</span></div>
              <div><strong>Tipo de pelaje</strong><span>{{ formatLabel(selectedCompletedService.mascotaTipoPelaje) }}</span></div>
              <div><strong>Fecha del servicio</strong><span>{{ formatDateTime(selectedCompletedService.fechaServicio) }}</span></div>
              <div><strong>Servicio principal</strong><span>{{ selectedCompletedService.servicioPrincipalNombre }}</span></div>
              <div><strong>Adicionales</strong><span>{{ selectedCompletedService.serviciosAdicionalesResumen || 'Sin adicionales registrados' }}</span></div>
              <div><strong>Estado del pelaje real</strong><span>{{ formatLabel(selectedCompletedService.estadoPelajeReal) }}</span></div>
              <div><strong>Comportamiento observado</strong><span>{{ formatLabel(selectedCompletedService.comportamientoObservado) }}</span></div>
              <div><strong>Precio base</strong><span>{{ formatCurrency(selectedCompletedService.precioBase) }}</span></div>
              <div><strong>Precio calculado</strong><span>{{ formatCurrency(selectedCompletedService.precioCalculado) }}</span></div>
              <div><strong>Precio final</strong><span>{{ formatCurrency(selectedCompletedService.precioFinal) }}</span></div>
              <div class="full-width">
                <strong>Resumen de la cita realizada</strong>
                <span>{{ selectedCompletedService.resumenServicioRealizado || 'Aún no se ha registrado un resumen final.' }}</span>
              </div>
              <div class="full-width">
                <strong>Observaciones finales</strong>
                <span>{{ selectedCompletedService.observacionesFinales || 'No hay observaciones finales registradas.' }}</span>
              </div>
              <div class="full-width">
                <strong>Recomendaciones</strong>
                <span>{{ selectedCompletedService.recomendaciones || 'No hay recomendaciones registradas.' }}</span>
              </div>
            </div>

            <div class="history-actions modal-actions">
              <button type="button" class="btn-disabled" disabled>Descargar comprobante (proximamente)</button>
              <button type="button" class="btn-secundario" @click="closeCompletedDetail">Cerrar</button>
            </div>
          </template>
        </section>
      </div>

      <div v-if="isCancelConfirmOpen" class="modal-overlay confirm-overlay" @click.self="closeCancelConfirm">
        <section class="history-shell confirm-card">
          <div class="confirm-icon danger">!</div>
          <span class="history-pill subtle">Confirmación</span>
          <h2>{{ cancelDialog.title }}</h2>
          <p>{{ cancelDialog.message }}</p>
          <label class="field-block confirm-reason-field">
            <span>Motivo de cancelación</span>
            <textarea
              v-model="cancellationReason"
              rows="4"
              placeholder="Cuéntanos por qué deseas cancelar esta cita..."
            />
          </label>
          <div class="history-actions modal-actions confirm-actions">
            <button type="button" class="btn-secundario" @click="closeCancelConfirm">Cerrar</button>
            <button type="button" class="btn-soft-cancel" :disabled="actionLoading" @click="confirmCancelAppointment">
              {{ actionLoading ? 'Procesando...' : cancelDialog.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.history-page {
  width: min(1360px, calc(100vw - 42px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.history-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.history-state-card,
.history-hero,
.tabs-card,
.filter-card,
.empty-card,
.history-card,
.modal-card,
.detail-panel {
  padding: 24px;
}

.history-state-card {
  text-align: center;
}

.history-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
  box-shadow: inset 0 0 0 1px rgba(156, 0, 118, 0.09);
}

.history-pill.subtle {
  margin-bottom: 14px;
}

.history-hero h1,
.empty-card h2,
.history-card h2,
.modal-head h2 {
  margin: 14px 0 12px;
  color: #8f176e;
}

.history-hero p,
.history-feedback,
.empty-card p,
.history-card p,
.mini-grid span,
.modal-copy,
.detail-info-grid span,
.detail-loading {
  color: #6e5064;
  line-height: 1.75;
}

.history-filters {
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(280px, 0.7fr) minmax(0, 1.3fr);
  gap: 18px;
}

.tabs-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tab-button {
  border: 1px solid rgba(243, 203, 228, 0.92);
  border-radius: 22px;
  padding: 16px 18px;
  background: linear-gradient(135deg, #fff5fb 0%, #ffffff 100%);
  color: #8f176e;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.tab-button span {
  min-width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
}

.tab-button.active {
  transform: translateY(-2px);
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  color: #fff;
  box-shadow: 0 18px 28px var(--sp-primary-shadow);
}

.filter-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-block {
  display: block;
}

.field-block span {
  display: block;
  margin-bottom: 8px;
  color: #9c0076;
  font-weight: 700;
}

.field-block input,
.field-block select {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(243, 181, 221, 0.95);
  background: rgba(255, 255, 255, 0.96);
  color: #5d4354;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.96rem;
  outline: none;
}

.history-feedback {
  margin: 16px 0 0;
  font-weight: 600;
}

.history-feedback.error {
  color: #cb3b81;
}

.history-feedback.success {
  color: #0b9f93;
}

.history-section {
  margin-top: 24px;
}

.cards-grid {
  display: grid;
  gap: 18px;
}

.history-card {
  display: grid;
  gap: 18px;
}

.card-top,
.card-pet,
.history-actions,
.modal-head {
  display: flex;
  gap: 16px;
}

.card-top,
.modal-head {
  justify-content: space-between;
  align-items: flex-start;
}

.card-pet {
  align-items: center;
}

.history-actions {
  align-items: center;
  flex-wrap: wrap;
}

.card-actions,
.modal-actions {
  justify-content: flex-end;
}

.card-pet-image,
.detail-image,
.detail-secondary-image {
  object-fit: cover;
  border-radius: 24px;
}

.card-pet-image {
  width: 92px;
  height: 92px;
}

.service-icon {
  width: 92px;
  height: 92px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(255, 234, 244, 0.96) 0%, rgba(231, 248, 255, 0.96) 100%);
  color: #8f176e;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.status-badge,
.detail-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 9px 14px;
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

.status-badge.completada {
  background: #fff1fb;
  color: #b02a8b;
}

.detail-chip {
  background: #fff3fb;
  color: #9c0076;
}

.mini-grid,
.detail-info-grid {
  display: grid;
  gap: 12px;
}

.mini-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.detail-info-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mini-grid div,
.detail-info-grid div {
  padding: 15px 16px;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.mini-grid strong,
.detail-info-grid strong {
  display: block;
  margin-bottom: 6px;
  color: #9c0076;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(117, 72, 107, 0.24);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 140;
}

.modal-card {
  width: min(1160px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
}

.modal-close {
  border: none;
  background: #fff2fa;
  color: #9c0076;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.detail-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 20px;
}

.detail-visual-card {
  display: grid;
  gap: 14px;
}

.detail-image {
  width: 100%;
  height: 360px;
}

.detail-badges,
.detail-pill-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-pill-list span {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: #fff3fb;
  color: #8f176e;
  font-weight: 600;
}

.detail-info-grid .full-width {
  grid-column: 1 / -1;
}

.detail-secondary-image {
  margin-top: 12px;
  width: 100%;
  max-width: 380px;
  max-height: 300px;
}

.reprogram-card {
  margin-top: 18px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.reprogram-grid {
  display: grid;
  grid-template-columns: minmax(220px, 320px);
  gap: 14px;
}

.reprogram-slots {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.slot-button {
  border: 1px solid rgba(243, 203, 228, 0.92);
  border-radius: 20px;
  padding: 14px 16px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.slot-button strong {
  display: block;
  color: #8f176e;
  margin-bottom: 6px;
}

.slot-button span {
  color: #6e5064;
}

.slot-button.active {
  transform: translateY(-2px);
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  box-shadow: 0 16px 26px var(--sp-primary-shadow);
}

.slot-button.active strong,
.slot-button.active span {
  color: #fff;
}

.btn-disabled {
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #eef1f4 0%, #dfe7ef 100%);
  color: #7b8691;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: not-allowed;
}

.btn-soft-cancel {
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #fff0f6 0%, #ffdcea 100%);
  color: #c23c7b;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
}

.btn-soft-cancel:disabled {
  opacity: 0.72;
  cursor: wait;
}

.confirm-overlay {
  z-index: 140;
}

.confirm-card {
  width: min(520px, 100%);
  padding: 32px;
  text-align: center;
}

.confirm-card h2 {
  margin: 16px 0 12px;
  color: #8f176e;
}

.confirm-card p {
  color: #6e5064;
  line-height: 1.75;
}

.confirm-reason-field {
  margin-top: 18px;
  text-align: left;
}

.confirm-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff0f6 0%, #ffdcea 100%);
  color: #c23c7b;
  box-shadow: 0 14px 28px rgba(194, 60, 123, 0.16);
}

.confirm-actions {
  justify-content: center;
}

@media (max-width: 1120px) {
  .history-filters,
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .mini-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .history-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .history-state-card,
  .history-hero,
  .tabs-card,
  .filter-card,
  .empty-card,
  .history-card,
  .modal-card,
  .detail-panel {
    padding: 22px;
    border-radius: 24px;
  }

  .tabs-card,
  .filter-card,
  .mini-grid,
  .detail-info-grid {
    grid-template-columns: 1fr;
  }

  .card-top,
  .card-pet,
  .history-actions,
  .modal-head {
    flex-direction: column;
    align-items: stretch;
  }

  .card-pet-image,
  .service-icon,
  .detail-image {
    width: 100%;
    height: 240px;
  }
}
</style>
