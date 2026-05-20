<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet, apiPatch } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type AppointmentStatus = 'pendiente' | 'confirmada' | 'en_atencion' | 'completada' | 'cancelada' | 'reprogramada'
type TabKey = 'citas' | 'servicios'

type AppointmentListItem = {
  id: string
  fecha: string
  horaInicio: string | null
  horaFinEstimada: string | null
  estado: AppointmentStatus
  precioMostrado: number
  clienteNombre: string | null
  clienteTelefono: string | null
  clienteEmail: string | null
  mascotaNombre: string | null
  mascotaRaza: string | null
  mascotaFotoUrl: string | null
  servicioNombre: string | null
}

type AppointmentDetail = {
  id: string
  fecha: string
  horaInicio: string | null
  horaFinEstimada: string | null
  estado: AppointmentStatus
  estadoPelajeReportado: string | null
  comportamientoReportado: string | null
  fotoEstadoActualUrl: string | null
  observacionesCliente: string | null
  precioBase: number | null
  precioCalculado: number | null
  precioFinal: number | null
  cliente: { id: string; nombre: string | null; cedula: string | null; telefono: string | null; email: string | null }
  mascota: { id: string; nombre: string; raza: string | null; tamano: string | null; tipoPelaje: string | null; fotoUrl: string | null }
  servicioPrincipal: { id: string; nombre: string }
  serviciosAdicionales: Array<{ id: string; nombre: string; precio: number | null }>
  catalogoAdicionales: Array<{ id: string; nombre: string; descripcion: string | null; precio: number | null; selected: boolean }>
  atencion: {
    estadoPelajeReal: string | null
    comportamientoObservado: string | null
    observacionesDuranteServicio: string | null
    precioCalculadoActualizado: number | null
    precioFinalProvisional: number | null
    servicioAdicionalIds: string[]
    observacionesFinales: string | null
    recomendaciones: string | null
  }
}

type CompletedService = {
  id: string
  fechaServicio: string
  clienteNombreCompleto: string | null
  mascotaNombre: string
  mascotaRaza: string | null
  servicioPrincipalNombre: string
  serviciosAdicionalesResumen: string | null
  precioFinal: number | null
}

type CompletedServiceDetail = {
  id: string
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

const props = withDefaults(defineProps<{ initialTab?: TabKey }>(), { initialTab: 'citas' })

const currentPath = window.location.pathname.toLowerCase()
const fallbackPetImage = '/img/mascota1.png'
const loading = ref(true)
const detailLoading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const toast = ref('')
const currentTab = ref<TabKey>(props.initialTab)
const appointments = ref<AppointmentListItem[]>([])
const completedServices = ref<CompletedService[]>([])
const selectedAppointment = ref<AppointmentDetail | null>(null)
const selectedCompletedService = ref<CompletedServiceDetail | null>(null)
const isAppointmentModalOpen = ref(false)
const isCompletedServiceModalOpen = ref(false)
const isCancelConfirmOpen = ref(false)
const showFinalizePanel = ref(false)
const cancelReason = ref('')
const cancelMessage = ref('')
const appointmentFilters = ref({ estado: 'todas', q: '' })
const serviceFilters = ref({ q: '', cliente: '', mascota: '', servicio: '', fechaDesde: '', fechaHasta: '' })
const attentionForm = ref({
  estadoPelajeReal: 'normal',
  comportamientoObservado: 'normal',
  observacionesDuranteServicio: '',
  servicioAdicionalIds: [] as string[],
  precioFinalProvisional: ''
})
const finalizeForm = ref({ observacionesFinales: '', recomendaciones: '' })

const appointmentSummary = computed(() => ({
  total: appointments.value.length,
  pendientes: appointments.value.filter((item) => item.estado === 'pendiente').length,
  enAtencion: appointments.value.filter((item) => item.estado === 'en_atencion').length,
  completadas: appointments.value.filter((item) => item.estado === 'completada').length
}))

const serviceSummary = computed(() => ({
  total: completedServices.value.length,
  mascotas: new Set(completedServices.value.map((item) => item.mascotaNombre)).size,
  facturacion: completedServices.value.reduce((total, item) => total + (Number(item.precioFinal) || 0), 0)
}))

const canConfirmAppointment = computed(() => selectedAppointment.value?.estado === 'pendiente')
const canCancelAppointment = computed(() => ['pendiente', 'confirmada'].includes(selectedAppointment.value?.estado || ''))
const canStartAppointment = computed(() => {
  if (selectedAppointment.value?.estado !== 'confirmada') {
    return false
  }

  return isStartWindowAvailable(selectedAppointment.value.fecha, selectedAppointment.value.horaInicio)
})
const canEditAttention = computed(() => selectedAppointment.value?.estado === 'en_atencion')

onMounted(async () => {
  document.body.className = 'cliente-portal-body'
  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  try {
    await Promise.all([loadAppointments(), loadCompletedServices()])
  } finally {
    loading.value = false
  }
})

async function loadAppointments() {
  const query = new URLSearchParams()
  if (appointmentFilters.value.estado !== 'todas') query.set('estado', appointmentFilters.value.estado)
  if (appointmentFilters.value.q.trim()) query.set('q', appointmentFilters.value.q.trim())
  const data = await apiGet<{ citas: AppointmentListItem[] }>(`/api/admin/gestion/citas${query.toString() ? `?${query.toString()}` : ''}`)
  appointments.value = data.citas
}

async function loadCompletedServices() {
  const query = new URLSearchParams()
  Object.entries(serviceFilters.value).forEach(([key, value]) => {
    if (value.trim()) query.set(key, value.trim())
  })
  const data = await apiGet<{ servicios: CompletedService[] }>(`/api/admin/gestion/servicios${query.toString() ? `?${query.toString()}` : ''}`)
  completedServices.value = data.servicios
}

function syncForms(appointment: AppointmentDetail) {
  attentionForm.value = {
    estadoPelajeReal: appointment.atencion.estadoPelajeReal || appointment.estadoPelajeReportado || 'normal',
    comportamientoObservado: appointment.atencion.comportamientoObservado || appointment.comportamientoReportado || 'normal',
    observacionesDuranteServicio: appointment.atencion.observacionesDuranteServicio || '',
    servicioAdicionalIds: appointment.atencion.servicioAdicionalIds?.length
      ? [...appointment.atencion.servicioAdicionalIds]
      : appointment.serviciosAdicionales.map((item) => item.id),
    precioFinalProvisional:
      appointment.atencion.precioFinalProvisional != null
        ? String(appointment.atencion.precioFinalProvisional)
        : String(appointment.precioFinal ?? appointment.precioCalculado ?? '')
  }
  finalizeForm.value = {
    observacionesFinales: appointment.atencion.observacionesFinales || '',
    recomendaciones: appointment.atencion.recomendaciones || ''
  }
}

async function openAppointmentDetail(id: string) {
  detailLoading.value = true
  isAppointmentModalOpen.value = true
  selectedAppointment.value = null
  showFinalizePanel.value = false
  try {
    const data = await apiGet<{ cita: AppointmentDetail }>(`/api/admin/gestion/citas/${id}`)
    selectedAppointment.value = data.cita
    syncForms(data.cita)
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle de la cita'
    closeAppointmentModal()
  } finally {
    detailLoading.value = false
  }
}

async function openCompletedServiceDetail(id: string) {
  detailLoading.value = true
  isCompletedServiceModalOpen.value = true
  selectedCompletedService.value = null
  try {
    const data = await apiGet<{ servicio: CompletedServiceDetail }>(`/api/admin/gestion/servicios/${id}`)
    selectedCompletedService.value = data.servicio
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle de la cita realizada'
    closeCompletedServiceModal()
  } finally {
    detailLoading.value = false
  }
}

async function runAppointmentAction(url: string, payload: Record<string, unknown>, fallbackMessage: string, closeOnSuccess = false) {
  if (!selectedAppointment.value) return
  actionLoading.value = true
  error.value = ''
  try {
    const data = await apiPatch<{ message: string; cita: AppointmentDetail }>(url, payload)
    toast.value = data.message || fallbackMessage
    selectedAppointment.value = data.cita
    syncForms(data.cita)
    await Promise.all([loadAppointments(), loadCompletedServices()])
    if (closeOnSuccess) closeAppointmentModal()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : fallbackMessage
  } finally {
    actionLoading.value = false
  }
}

function confirmAppointment() {
  if (!selectedAppointment.value) return
  return runAppointmentAction(`/api/admin/gestion/citas/${selectedAppointment.value.id}/confirm`, {}, 'La cita fue confirmada')
}

function cancelAppointment() {
  if (!selectedAppointment.value) return
  return runAppointmentAction(
    `/api/admin/gestion/citas/${selectedAppointment.value.id}/cancel`,
    { motivoCancelacion: cancelReason.value },
    'La cita fue cancelada'
  )
}

function requestCancelAppointment() {
  if (!selectedAppointment.value) return
  cancelReason.value = ''
  cancelMessage.value = `Indica el motivo de cancelacion para la cita de ${selectedAppointment.value.mascota.nombre}.`
  isCancelConfirmOpen.value = true
}

function closeCancelConfirm() {
  isCancelConfirmOpen.value = false
  cancelReason.value = ''
}

async function confirmCancelAppointment() {
  if (!cancelReason.value.trim()) {
    error.value = 'Debes indicar el motivo de cancelación'
    return
  }

  try {
    await cancelAppointment()
    closeCancelConfirm()
  } catch (error) {
    // runAppointmentAction already manages the visible error state
  }
}

function startAppointment() {
  if (!selectedAppointment.value) return
  return runAppointmentAction(`/api/admin/gestion/citas/${selectedAppointment.value.id}/start`, {}, 'La cita ya esta en atencion')
}

function saveAttention() {
  if (!selectedAppointment.value) return
  return runAppointmentAction(
    `/api/admin/gestion/citas/${selectedAppointment.value.id}/attention`,
    {
      estadoPelajeReal: attentionForm.value.estadoPelajeReal,
      comportamientoObservado: attentionForm.value.comportamientoObservado,
      observacionesDuranteServicio: attentionForm.value.observacionesDuranteServicio,
      servicioAdicionalIds: attentionForm.value.servicioAdicionalIds,
      precioFinalProvisional: attentionForm.value.precioFinalProvisional
    },
    'La atencion fue actualizada'
  )
}

function finalizeAppointment() {
  if (!selectedAppointment.value) return
  return runAppointmentAction(
    `/api/admin/gestion/citas/${selectedAppointment.value.id}/finalize`,
    {
      observacionesFinales: finalizeForm.value.observacionesFinales,
      recomendaciones: finalizeForm.value.recomendaciones
    },
    'La cita fue finalizada',
    true
  )
}

function toggleAdditionalService(additionalId: string) {
  const current = new Set(attentionForm.value.servicioAdicionalIds)
  current.has(additionalId) ? current.delete(additionalId) : current.add(additionalId)
  attentionForm.value.servicioAdicionalIds = [...current]
}

function switchTab(tab: TabKey) {
  currentTab.value = tab
  navigateTo(tab === 'citas' ? '/admin/gestion/citas' : '/admin/gestion/servicios')
}

function clearAppointmentFilters() {
  appointmentFilters.value = { estado: 'todas', q: '' }
  loadAppointments()
}

function clearServiceFilters() {
  serviceFilters.value = { q: '', cliente: '', mascota: '', servicio: '', fechaDesde: '', fechaHasta: '' }
  loadCompletedServices()
}

function closeAppointmentModal() {
  isAppointmentModalOpen.value = false
  selectedAppointment.value = null
  showFinalizePanel.value = false
  closeCancelConfirm()
}

function closeCompletedServiceModal() {
  isCompletedServiceModalOpen.value = false
  selectedCompletedService.value = null
}

function goTo(path: string) {
  navigateTo(path)
}

function petImage(url: string | null) {
  return url || fallbackPetImage
}

function formatLabel(value: string | null) {
  if (!value) return 'Sin dato'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatDate(value: string | null) {
  if (!value) return 'Por confirmar'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Por confirmar'
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function formatTime(value: string | null) {
  if (!value) return 'Por confirmar'
  return String(value).slice(0, 5)
}

function statusClass(status: string) {
  return status.replace(/_/g, '-')
}

function normalizeDatePortion(value: string | null) {
  if (!value) return null
  const trimmed = String(value).trim()
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  return formatter.format(date)
}

function normalizeTimePortion(value: string | null) {
  if (!value) return null
  const match = String(value).trim().match(/^(\d{2}:\d{2})/)
  return match ? match[1] : null
}

function getBogotaNow() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(new Date())
  const byType = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))

  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    time: `${byType.hour}:${byType.minute}`
  }
}

function isStartWindowAvailable(fecha: string | null, horaInicio: string | null) {
  const appointmentDate = normalizeDatePortion(fecha)
  const appointmentTime = normalizeTimePortion(horaInicio) || '00:00'

  if (!appointmentDate) {
    return false
  }

  const now = getBogotaNow()
  if (now.date !== appointmentDate) {
    return false
  }

  return now.time >= appointmentTime
}
</script>

<template>
  <main class="management-page">
    <section v-if="loading" class="management-shell state-card">
      <h1>Cargando gestion de citas y citas realizadas...</h1>
      <p>Estamos preparando la operacion del negocio.</p>
    </section>

    <section v-else-if="error && !appointments.length && !completedServices.length" class="management-shell state-card">
      <h1>No pudimos abrir este modulo</h1>
      <p>{{ error }}</p>
      <div class="row-actions">
        <button type="button" class="btn-secundario" @click="goTo('/admin')">Volver al inicio</button>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="management-shell hero-card">
        <div>
          <span class="soft-pill">Gestión de citas</span>
          <h1>El corazon operativo de Sweety Puppies</h1>
          <p>Aquí administras la operación de citas y consultas el historial real de citas ya realizadas.</p>
          <div class="hero-note">
            <strong>Operacion central</strong>
            <span>Confirma, inicia, atiende y finaliza citas; luego revisa la cita ya completada desde su propio historial.</span>
          </div>
        </div>

        <div class="tab-grid">
          <button type="button" class="tab-button" :class="{ active: currentTab === 'citas' }" @click="switchTab('citas')">
            Citas
            <span>{{ appointments.length }}</span>
          </button>
          <button type="button" class="tab-button" :class="{ active: currentTab === 'servicios' }" @click="switchTab('servicios')">
            Citas realizadas
            <span>{{ completedServices.length }}</span>
          </button>
        </div>
      </section>

      <p v-if="toast" class="feedback success">{{ toast }}</p>
      <p v-if="error && (appointments.length || completedServices.length)" class="feedback error">{{ error }}</p>

      <template v-if="currentTab === 'citas'">
        <section class="management-shell filter-card">
          <div class="form-grid short">
            <label class="field-block">
              <span>Estado</span>
              <select v-model="appointmentFilters.estado">
                <option value="todas">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="confirmada">Confirmadas</option>
                <option value="en_atencion">En atencion</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
                <option value="reprogramada">Reprogramadas</option>
              </select>
            </label>
            <label class="field-block">
              <span>Buscar cita</span>
              <input v-model.trim="appointmentFilters.q" type="text" placeholder="Cliente, mascota, servicio, correo o teléfono...">
            </label>
          </div>
          <div class="row-actions">
            <button type="button" class="btn-enviar" @click="loadAppointments">Buscar</button>
            <button type="button" class="btn-secundario" @click="clearAppointmentFilters">Limpiar</button>
          </div>
        </section>

        <section class="summary-grid">
          <article class="management-shell summary-card"><strong>Citas visibles</strong><span class="summary-value">{{ appointmentSummary.total }}</span></article>
          <article class="management-shell summary-card gold"><strong>Pendientes</strong><span class="summary-value">{{ appointmentSummary.pendientes }}</span></article>
          <article class="management-shell summary-card sky"><strong>En atencion</strong><span class="summary-value">{{ appointmentSummary.enAtencion }}</span></article>
          <article class="management-shell summary-card mint"><strong>Completadas</strong><span class="summary-value">{{ appointmentSummary.completadas }}</span></article>
        </section>

        <section class="cards-grid">
          <article v-for="appointment in appointments" :key="appointment.id" class="management-shell item-card">
            <div class="item-top">
              <div class="pet-mini">
                <img :src="petImage(appointment.mascotaFotoUrl)" :alt="appointment.mascotaNombre || 'Mascota'" class="pet-thumb">
                <div>
                  <h2>{{ appointment.mascotaNombre || 'Mascota por revisar' }}</h2>
                  <p>{{ appointment.clienteNombre || 'Cliente por revisar' }}</p>
                </div>
              </div>
              <span class="status-badge" :class="statusClass(appointment.estado)">{{ formatLabel(appointment.estado) }}</span>
            </div>
            <div class="mini-grid">
              <div><strong>Fecha</strong><span>{{ formatDate(appointment.fecha) }}</span></div>
              <div><strong>Hora</strong><span>{{ formatTime(appointment.horaInicio) }}</span></div>
              <div><strong>Servicio solicitado</strong><span>{{ appointment.servicioNombre || 'Por confirmar' }}</span></div>
              <div><strong>Valor</strong><span>{{ formatCurrency(appointment.precioMostrado) }}</span></div>
            </div>
            <div class="row-actions right">
              <button type="button" class="btn-enviar" @click="openAppointmentDetail(appointment.id)">Ver detalle</button>
            </div>
          </article>
          <article v-if="!appointments.length" class="management-shell empty-card">
            <span class="soft-pill subtle">Citas</span>
            <h2>No hay citas para mostrar</h2>
            <p>Prueba otro filtro o vuelve a la agenda diaria para revisar el calendario.</p>
          </article>
        </section>
      </template>

      <template v-else>
        <section class="management-shell filter-card">
          <div class="form-grid">
            <label class="field-block"><span>Busqueda general</span><input v-model.trim="serviceFilters.q" type="text" placeholder="Cliente, mascota, servicio, correo..."></label>
            <label class="field-block"><span>Cliente</span><input v-model.trim="serviceFilters.cliente" type="text" placeholder="Nombre del cliente"></label>
            <label class="field-block"><span>Mascota</span><input v-model.trim="serviceFilters.mascota" type="text" placeholder="Nombre de la mascota"></label>
            <label class="field-block"><span>Servicio</span><input v-model.trim="serviceFilters.servicio" type="text" placeholder="Servicio principal"></label>
            <label class="field-block"><span>Desde</span><input v-model="serviceFilters.fechaDesde" type="date"></label>
            <label class="field-block"><span>Hasta</span><input v-model="serviceFilters.fechaHasta" type="date"></label>
          </div>
          <div class="row-actions">
            <button type="button" class="btn-enviar" @click="loadCompletedServices">Buscar</button>
            <button type="button" class="btn-secundario" @click="clearServiceFilters">Limpiar</button>
          </div>
        </section>

        <section class="summary-grid services">
          <article class="management-shell summary-card"><strong>Citas realizadas visibles</strong><span class="summary-value">{{ serviceSummary.total }}</span></article>
          <article class="management-shell summary-card mint"><strong>Mascotas atendidas</strong><span class="summary-value">{{ serviceSummary.mascotas }}</span></article>
          <article class="management-shell summary-card wide"><strong>Facturacion visible</strong><span class="summary-value">{{ formatCurrency(serviceSummary.facturacion) }}</span></article>
        </section>

        <section class="cards-grid">
          <article v-for="service in completedServices" :key="service.id" class="management-shell item-card">
            <div class="item-top">
              <div>
                <h2>{{ service.mascotaNombre }}</h2>
                <p>{{ service.clienteNombreCompleto || 'Cliente no registrado' }}</p>
              </div>
              <span class="detail-chip">{{ service.servicioPrincipalNombre }}</span>
            </div>
            <div class="mini-grid">
              <div><strong>Fecha</strong><span>{{ formatDate(service.fechaServicio) }}</span></div>
              <div><strong>Raza</strong><span>{{ service.mascotaRaza || 'Raza por confirmar' }}</span></div>
              <div><strong>Adicionales</strong><span>{{ service.serviciosAdicionalesResumen || 'Sin adicionales' }}</span></div>
              <div><strong>Precio final</strong><span>{{ formatCurrency(service.precioFinal) }}</span></div>
            </div>
            <div class="row-actions right">
              <button type="button" class="btn-enviar" @click="openCompletedServiceDetail(service.id)">Ver detalle</button>
            </div>
          </article>
          <article v-if="!completedServices.length" class="management-shell empty-card">
            <span class="soft-pill subtle">Citas realizadas</span>
            <h2>Aún no hay citas finalizadas</h2>
            <p>Cuando completes las primeras citas, aquí aparecerá el historial operativo real del negocio.</p>
          </article>
        </section>
      </template>
      <div v-if="isAppointmentModalOpen" class="modal-overlay" @click.self="closeAppointmentModal">
        <section class="management-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="soft-pill subtle">Detalle de cita</span>
              <h2>{{ selectedAppointment?.mascota.nombre || 'Cargando cita...' }}</h2>
              <p class="modal-copy">Desde aquí se opera la cita de principio a fin.</p>
            </div>
            <button type="button" class="modal-close" @click="closeAppointmentModal">×</button>
          </div>
          <div v-if="detailLoading" class="empty-card compact"><p>Cargando detalle...</p></div>
          <template v-else-if="selectedAppointment">
            <div class="detail-grid">
              <article class="detail-card">
                <strong>Cliente</strong>
                <span>{{ selectedAppointment.cliente.nombre || 'Cliente por revisar' }}</span>
                <div class="detail-meta">
                  <small><b>Cédula:</b> {{ selectedAppointment.cliente.cedula || 'Por confirmar' }}</small>
                  <small><b>Teléfono:</b> {{ selectedAppointment.cliente.telefono || 'Por confirmar' }}</small>
                  <small><b>Correo:</b> {{ selectedAppointment.cliente.email || 'Por confirmar' }}</small>
                </div>
              </article>
              <article class="detail-card">
                <strong>Mascota</strong>
                <span>{{ selectedAppointment.mascota.nombre }}</span>
                <div class="detail-meta">
                  <small><b>Raza:</b> {{ selectedAppointment.mascota.raza || 'Por confirmar' }}</small>
                  <small><b>Tamaño:</b> {{ formatLabel(selectedAppointment.mascota.tamano) }}</small>
                  <small><b>Pelaje:</b> {{ formatLabel(selectedAppointment.mascota.tipoPelaje) }}</small>
                </div>
              </article>
              <article class="detail-card">
                <strong>Servicio solicitado</strong>
                <span>{{ selectedAppointment.servicioPrincipal.nombre }}</span>
                <div class="detail-meta">
                  <small><b>Fecha:</b> {{ formatDate(selectedAppointment.fecha) }}</small>
                  <small><b>Horario:</b> {{ formatTime(selectedAppointment.horaInicio) }} - {{ formatTime(selectedAppointment.horaFinEstimada) }}</small>
                </div>
              </article>
              <article class="detail-card"><strong>Estado</strong><span class="status-badge inline" :class="statusClass(selectedAppointment.estado)">{{ formatLabel(selectedAppointment.estado) }}</span><small>{{ formatLabel(selectedAppointment.estadoPelajeReportado) }} · {{ formatLabel(selectedAppointment.comportamientoReportado) }}</small></article>
              <article class="detail-card"><strong>Precio base</strong><span>{{ formatCurrency(selectedAppointment.precioBase) }}</span></article>
              <article class="detail-card"><strong>Calculado</strong><span>{{ formatCurrency(selectedAppointment.precioCalculado) }}</span></article>
              <article class="detail-card"><strong>Final</strong><span>{{ formatCurrency(selectedAppointment.precioFinal ?? selectedAppointment.precioCalculado) }}</span></article>
              <article class="detail-card wide"><strong>Observaciones del cliente</strong><p>{{ selectedAppointment.observacionesCliente || 'Sin observaciones registradas.' }}</p></article>
            </div>

            <div v-if="canConfirmAppointment || canCancelAppointment || canStartAppointment" class="detail-panel">
              <div class="row-actions">
                <button
                  v-if="canConfirmAppointment"
                  type="button"
                  class="btn-enviar"
                  :disabled="actionLoading"
                  @click="confirmAppointment"
                >
                  Confirmar cita
                </button>
                <button
                  v-if="canCancelAppointment"
                  type="button"
                  class="btn-soft-cancel"
                  :disabled="actionLoading"
                  @click="requestCancelAppointment"
                >
                  Cancelar cita
                </button>
                <button
                  v-if="canStartAppointment"
                  type="button"
                  class="btn-secundario"
                  :disabled="actionLoading"
                  @click="startAppointment"
                >
                  Iniciar cita
                </button>
              </div>
            </div>

            <section v-if="canEditAttention" class="detail-panel">
              <span class="soft-pill subtle">Panel de atencion</span>
              <div class="form-grid">
                <label class="field-block"><span>Estado real del pelaje</span><select v-model="attentionForm.estadoPelajeReal"><option value="normal">Normal</option><option value="con_nudos">Con nudos</option><option value="muy_enredado">Muy enredado</option></select></label>
                <label class="field-block"><span>Comportamiento observado</span><select v-model="attentionForm.comportamientoObservado"><option value="normal">Normal</option><option value="sensible">Sensible</option><option value="agresivo">Agresivo</option></select></label>
                <label class="field-block"><span>Precio final provisional</span><input v-model="attentionForm.precioFinalProvisional" type="number" min="0" step="1000"></label>
              </div>
              <label class="field-block"><span>Observaciones durante el servicio</span><textarea v-model="attentionForm.observacionesDuranteServicio" rows="4" placeholder="Anota aquí lo que vas observando durante la atención..." /></label>
              <div class="catalog-grid">
                <button v-for="additional in selectedAppointment.catalogoAdicionales" :key="additional.id" type="button" class="catalog-card" :class="{ active: attentionForm.servicioAdicionalIds.includes(additional.id) }" @click="toggleAdditionalService(additional.id)">
                  <strong>{{ additional.nombre }}</strong>
                  <span>{{ additional.descripcion || 'Servicio adicional disponible para esta talla' }}</span>
                  <small>{{ formatCurrency(additional.precio) }}</small>
                </button>
              </div>
              <div class="row-actions">
                <button type="button" class="btn-enviar" :disabled="actionLoading" @click="saveAttention">Guardar atencion</button>
                <button type="button" class="btn-secundario" @click="showFinalizePanel = !showFinalizePanel">{{ showFinalizePanel ? 'Ocultar finalizacion' : 'Finalizar cita' }}</button>
              </div>
              <div v-if="showFinalizePanel" class="finalize-card">
                <p v-if="error" class="feedback error modal-feedback">{{ error }}</p>
                <label class="field-block"><span>Observaciones finales</span><textarea v-model="finalizeForm.observacionesFinales" rows="3" placeholder="Resultado final de la cita..." /></label>
                <label class="field-block"><span>Recomendaciones</span><textarea v-model="finalizeForm.recomendaciones" rows="3" placeholder="Cuidados sugeridos para la familia..." /></label>
                <div class="row-actions">
                  <button type="button" class="btn-enviar" :disabled="actionLoading" @click="finalizeAppointment">Confirmar finalizacion</button>
                </div>
              </div>
            </section>

            <div class="row-actions right"><button type="button" class="btn-secundario" @click="closeAppointmentModal">Cerrar</button></div>
          </template>
        </section>
      </div>

      <div v-if="isCancelConfirmOpen" class="modal-overlay" @click.self="closeCancelConfirm">
        <section class="management-shell modal-card cancel-confirm-card">
          <div class="modal-head">
            <div>
              <span class="soft-pill subtle">Confirmación</span>
              <h2>Cancelar cita</h2>
            </div>
            <button type="button" class="modal-close" @click="closeCancelConfirm">×</button>
          </div>
          <p class="cancel-confirm-copy">{{ cancelMessage }}</p>
          <label class="field-block">
            <span>Motivo de cancelación</span>
            <textarea
              v-model="cancelReason"
              rows="4"
              placeholder="Escribe aquí el motivo de cancelación para enviarlo por correo..."
            />
          </label>
          <div class="row-actions right">
            <button type="button" class="btn-secundario" :disabled="actionLoading" @click="closeCancelConfirm">Cerrar</button>
            <button type="button" class="btn-soft-cancel" :disabled="actionLoading" @click="confirmCancelAppointment">
              {{ actionLoading ? 'Procesando...' : 'Sí, cancelar' }}
            </button>
          </div>
        </section>
      </div>

      <div v-if="isCompletedServiceModalOpen" class="modal-overlay" @click.self="closeCompletedServiceModal">
        <section class="management-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="soft-pill subtle">Cita realizada</span>
              <h2>{{ selectedCompletedService?.mascotaNombre || 'Cargando cita realizada...' }}</h2>
            </div>
            <button type="button" class="modal-close" @click="closeCompletedServiceModal">×</button>
          </div>
          <div v-if="detailLoading" class="empty-card compact"><p>Cargando detalle...</p></div>
          <template v-else-if="selectedCompletedService">
            <div class="detail-grid">
              <article class="detail-card">
                <strong>Cliente</strong>
                <span>{{ selectedCompletedService.clienteNombreCompleto || 'No registrado' }}</span>
                <div class="detail-meta">
                  <small><b>Correo:</b> {{ selectedCompletedService.clienteEmail || 'No registrado' }}</small>
                  <small><b>Teléfono:</b> {{ selectedCompletedService.clienteTelefono || 'No registrado' }}</small>
                </div>
              </article>
              <article class="detail-card"><strong>Mascota</strong><span>{{ selectedCompletedService.mascotaNombre }}</span><small>{{ selectedCompletedService.mascotaRaza || 'Raza no registrada' }}</small><small>{{ formatLabel(selectedCompletedService.mascotaTamano) }} · {{ formatLabel(selectedCompletedService.mascotaTipoPelaje) }}</small></article>
              <article class="detail-card"><strong>Fecha de la cita realizada</strong><span>{{ formatDate(selectedCompletedService.fechaServicio) }}</span></article>
              <article class="detail-card"><strong>Servicio principal</strong><span>{{ selectedCompletedService.servicioPrincipalNombre }}</span><small>{{ selectedCompletedService.serviciosAdicionalesResumen || 'Sin adicionales' }}</small></article>
              <article class="detail-card"><strong>Pelaje real</strong><span>{{ formatLabel(selectedCompletedService.estadoPelajeReal) }}</span></article>
              <article class="detail-card"><strong>Comportamiento</strong><span>{{ formatLabel(selectedCompletedService.comportamientoObservado) }}</span></article>
              <article class="detail-card"><strong>Precio base</strong><span>{{ formatCurrency(selectedCompletedService.precioBase) }}</span></article>
              <article class="detail-card"><strong>Calculado</strong><span>{{ formatCurrency(selectedCompletedService.precioCalculado) }}</span></article>
              <article class="detail-card"><strong>Final</strong><span>{{ formatCurrency(selectedCompletedService.precioFinal) }}</span></article>
              <article class="detail-card wide"><strong>Resumen de la cita realizada</strong><p>{{ selectedCompletedService.resumenServicioRealizado || 'No se registro un resumen final.' }}</p></article>
              <article class="detail-card wide"><strong>Observaciones finales</strong><p>{{ selectedCompletedService.observacionesFinales || 'Sin observaciones finales.' }}</p></article>
              <article class="detail-card wide"><strong>Recomendaciones</strong><p>{{ selectedCompletedService.recomendaciones || 'Sin recomendaciones registradas.' }}</p></article>
            </div>
            <div class="row-actions right"><button type="button" class="btn-secundario" @click="closeCompletedServiceModal">Cerrar</button></div>
          </template>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.management-page { width: min(1440px, calc(100vw - 42px)); margin: 0 auto; padding: 28px 0 56px; }
.management-shell { background: rgba(255,255,255,.92); border-radius: 32px; border: 1px solid rgba(255,214,235,.95); box-shadow: 0 28px 70px rgba(204,115,174,.12); }
.state-card,.hero-card,.filter-card,.summary-card,.item-card,.modal-card,.detail-panel,.empty-card { padding: 24px; }
.hero-card { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr); gap:22px; }
.soft-pill,.detail-chip { display:inline-flex; padding:8px 14px; border-radius:999px; background:linear-gradient(135deg,#fff1f9 0%,#eefafe 100%); color:#9c0076; font-weight:700; font-size:.86rem; }
.soft-pill.subtle { margin-bottom:12px; }
.hero-card h1,.item-card h2,.empty-card h2,.modal-head h2 { margin:12px 0; color:#8f176e; }
.hero-card p,.hero-note span,.item-card p,.mini-grid span,.detail-card p,.detail-card small,.detail-card span,.modal-copy,.feedback { color:#6e5064; line-height:1.7; }
.hero-note,.summary-card,.item-card,.detail-card,.catalog-card,.finalize-card { background:linear-gradient(145deg,rgba(255,244,250,.96) 0%,rgba(255,255,255,.92) 52%,rgba(238,250,255,.95) 100%); border:1px solid rgba(243,209,230,.92); }
.hero-note,.detail-card,.catalog-card,.finalize-card { border-radius:24px; }
.hero-note { margin-top:18px; padding:18px 20px; }
.hero-note strong,.mini-grid strong,.detail-card strong { display:block; color:#9c0076; margin-bottom:6px; }
.detail-meta { display:grid; gap:6px; margin-top:10px; }
.detail-meta small { margin:0; display:block; word-break:break-word; }
.detail-meta b { color:#8f176e; font-weight:700; }
.tab-grid,.row-actions,.item-top,.pet-mini,.modal-head { display:flex; gap:12px; }
.item-top,.modal-head { justify-content:space-between; align-items:flex-start; }
.pet-mini { align-items:center; }
.tab-grid { flex-direction:column; }
.tab-button,.btn-enviar,.btn-secundario,.btn-soft-cancel { border:none; border-radius:999px; padding:14px 18px; font-family:'Montserrat',sans-serif; font-weight:700; cursor:pointer; }
.tab-button,.btn-secundario { background:linear-gradient(135deg,#fff4fb 0%,#ffffff 100%); color:#8f176e; border:1px solid rgba(243,203,228,.9); box-shadow:0 10px 22px rgba(219,126,183,.1); display:flex; justify-content:space-between; align-items:center; }
.tab-button span { min-width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.92); display:inline-flex; align-items:center; justify-content:center; }
.tab-button.active,.btn-enviar { background:linear-gradient(135deg,var(--sp-primary-purple) 0%,var(--sp-primary-purple-deep) 100%); color:#fff; box-shadow:0 16px 30px var(--sp-primary-shadow); }
.btn-soft-cancel { background:linear-gradient(135deg,#fff0f6 0%,#ffdcea 100%); color:#c23c7b; }
.filter-card,.detail-panel,.finalize-card { margin-top:24px; display:grid; gap:16px; }
.form-grid,.summary-grid,.mini-grid,.detail-grid,.catalog-grid { display:grid; gap:12px; }
.form-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
.form-grid.short { grid-template-columns:280px minmax(0,1fr); }
.summary-grid { margin-top:24px; grid-template-columns:repeat(4,minmax(0,1fr)); }
.summary-grid.services { grid-template-columns:repeat(3,minmax(0,1fr)); }
.summary-card.wide { grid-column:span 2; }
.summary-value { display:block; margin-top:10px; font-size:1.9rem; font-weight:800; color:#4d2d47; }
.summary-card.gold .summary-value { color:#ad7100; }
.summary-card.sky .summary-value { color:#2f67c8; }
.summary-card.mint .summary-value { color:#0b9f93; }
.cards-grid { margin-top:24px; display:grid; gap:18px; }
.item-card { display:grid; gap:18px; }
.pet-thumb { width:92px; height:92px; object-fit:cover; border-radius:24px; }
.mini-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
.mini-grid div,.detail-card { padding:16px; border-radius:22px; }
.detail-grid { margin-top:18px; grid-template-columns:repeat(3,minmax(0,1fr)); }
.detail-card.wide { grid-column:span 2; }
.status-badge { display:inline-flex; align-items:center; justify-content:center; border-radius:999px; padding:9px 14px; font-size:.84rem; font-weight:700; }
.status-badge.pendiente { background:#fff3d8; color:#a16000; }
.status-badge.confirmada { background:#e9fbf7; color:#0b9f93; }
.status-badge.en-atencion { background:#eef5ff; color:#3967ca; }
.status-badge.completada { background:#eefaf0; color:#2c8d51; }
.status-badge.cancelada { background:#fff1f4; color:#c33b74; }
.status-badge.reprogramada { background:#f1ecff; color:#6d56b8; }
.status-badge.inline { justify-self:start; }
.field-block span { display:block; margin-bottom:8px; color:#9c0076; font-weight:700; }
.field-block input,.field-block select,.field-block textarea { width:100%; box-sizing:border-box; padding:14px 16px; border-radius:18px; border:1px solid rgba(243,181,221,.95); background:rgba(255,255,255,.96); color:#5d4354; font-family:'Montserrat',sans-serif; font-size:.96rem; outline:none; }
.catalog-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
.catalog-card { padding:16px; text-align:left; cursor:pointer; display:grid; gap:8px; transition:transform .2s ease, box-shadow .2s ease; }
.catalog-card.active { transform:translateY(-2px); box-shadow:0 18px 28px rgba(233,90,219,.18); border-color:rgba(225,118,198,.9); }
.catalog-card small { color:#8f176e; font-weight:700; }
.modal-overlay { position:fixed; inset:0; z-index:80; background:rgba(77,45,71,.26); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:24px; }
.modal-card { width:min(1180px,100%); max-height:min(92vh,980px); overflow-y:auto; }
.modal-close { width:46px; height:46px; border-radius:50%; border:none; cursor:pointer; font-size:1.6rem; background:linear-gradient(135deg,#fff4fb 0%,#eefafe 100%); color:#8f176e; }
.cancel-confirm-card { width:min(560px,100%); }
.cancel-confirm-copy { margin:12px 0 0; color:#6e5064; line-height:1.7; }
.feedback { margin-top:16px; padding:16px 18px; border-radius:20px; font-weight:600; }
.feedback.success { background:rgba(233,251,247,.94); border:1px solid rgba(115,214,177,.9); color:#0b8a77; }
.feedback.error { background:rgba(255,240,245,.96); border:1px solid rgba(255,176,214,.96); color:#b33c70; }
.modal-feedback { margin-top:0; }
.right { justify-content:flex-end; }
@media (max-width: 1180px) { .hero-card,.form-grid,.form-grid.short,.summary-grid,.summary-grid.services,.mini-grid,.detail-grid,.catalog-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width: 760px) { .management-page { width:min(100vw - 20px,100%); padding-top:12px; } .state-card,.hero-card,.filter-card,.summary-card,.item-card,.modal-card,.detail-panel,.empty-card { padding:22px; border-radius:24px; } .hero-card,.form-grid,.form-grid.short,.summary-grid,.summary-grid.services,.mini-grid,.detail-grid,.catalog-grid { grid-template-columns:1fr; } .tab-grid,.row-actions,.item-top,.pet-mini,.modal-head { flex-direction:column; align-items:stretch; } }
</style>

