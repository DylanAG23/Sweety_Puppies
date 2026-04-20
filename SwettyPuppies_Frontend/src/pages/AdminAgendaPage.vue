<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type AgendaAppointment = {
  id: string
  fecha: string
  horaInicio: string | null
  horaFinEstimada: string | null
  estado: 'pendiente' | 'confirmada' | 'en_atencion' | 'completada' | 'cancelada' | 'reprogramada'
  precioBase: number | null
  precioCalculado: number | null
  precioFinal: number | null
  precioMostrado: number
  clienteNombre: string | null
  clienteTelefono: string | null
  mascotaNombre: string | null
  mascotaRaza: string | null
  mascotaFotoUrl: string | null
  servicioNombre: string | null
  bloqueaDisponibilidad: boolean
}

type AgendaBlock = {
  id: string
  fecha: string
  horaInicio: string | null
  horaFin: string | null
  motivo: string | null
  activo: boolean
  esDiaCompleto: boolean
  createdAt: string
}

type AgendaResponse = {
  success: boolean
  vista: 'hoy' | 'semana' | 'mes'
  fecha: string
  fechaMinimaBloqueo: string
  dia: string
  cerrado: boolean
  cierreMotivo: string | null
  horario: {
    horaApertura: string
    horaCierre: string
    ultimaCita: string
    duracionBaseMinutos: number
    abierto: boolean
  } | null
  resumen: {
    total: number
    pendientes: number
    confirmadas: number
    enAtencion: number
    completadas: number
    canceladas: number
    reprogramadas: number
    bloqueos: number
  }
  citas: AgendaAppointment[]
  bloqueos: AgendaBlock[]
  bloqueosProximos: AgendaBlock[]
  rango: {
    vista: 'hoy' | 'semana' | 'mes'
    inicio: string
    fin: string
    etiqueta: string
    dias: Array<{
      fecha: string
      dia: string
      cerrado: boolean
      resumen: {
        total: number
        pendientes: number
        confirmadas: number
        enAtencion: number
        completadas: number
        canceladas: number
        reprogramadas: number
        bloqueos: number
      }
    }>
  }
}

type AppointmentDetail = {
  id: string
  fecha: string
  horaInicio: string | null
  horaFinEstimada: string | null
  estado: 'pendiente' | 'confirmada' | 'en_atencion' | 'completada' | 'cancelada' | 'reprogramada'
  estadoPelajeReportado: string | null
  comportamientoReportado: string | null
  fotoEstadoActualUrl: string | null
  observacionesCliente: string | null
  observacionesAdmin: string | null
  precioBase: number | null
  precioCalculado: number | null
  precioFinal: number | null
  cliente: {
    nombre: string | null
    telefono: string | null
    email: string | null
  }
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

type AgendaDetailResponse = {
  success: boolean
  cita: AppointmentDetail
}

type AgendaActionResponse = {
  success: boolean
  message: string
  cita?: AppointmentDetail
}

type BlockListResponse = {
  success: boolean
  fecha: string
  bloqueos: AgendaBlock[]
}

const props = withDefaults(
  defineProps<{
    initialSection?: 'agenda' | 'blocks'
  }>(),
  {
    initialSection: 'agenda',
  }
)

const currentPath = window.location.pathname.toLowerCase()
const fallbackPetImage = '/img/mascota1.png'
const viewMode = ref<'hoy' | 'semana' | 'mes'>('hoy')
const selectedDate = ref(getTodayDateString())
const loading = ref(true)
const error = ref('')
const toast = ref('')
const detailLoading = ref(false)
const actionLoading = ref(false)
const blockSubmitting = ref(false)
const deactivatingBlockId = ref('')
const agenda = ref<AgendaResponse | null>(null)
const upcomingBlocks = ref<AgendaBlock[]>([])
const selectedAppointment = ref<AppointmentDetail | null>(null)
const isDetailOpen = ref(false)
const blocksSectionRef = ref<HTMLElement | null>(null)
const blockForm = ref({
  fecha: getTodayDateString(),
  horaInicio: '',
  horaFin: '',
  motivo: '',
})

const summaryCards = computed(() => {
  const summary =
    viewMode.value === 'hoy'
      ? agenda.value?.resumen
      : (agenda.value?.rango.dias ?? []).reduce(
          (accumulator, day) => ({
            total: accumulator.total + day.resumen.total,
            pendientes: accumulator.pendientes + day.resumen.pendientes,
            confirmadas: accumulator.confirmadas + day.resumen.confirmadas,
            enAtencion: accumulator.enAtencion + day.resumen.enAtencion,
            completadas: accumulator.completadas + day.resumen.completadas,
            canceladas: accumulator.canceladas + day.resumen.canceladas,
            reprogramadas: accumulator.reprogramadas + day.resumen.reprogramadas,
            bloqueos: accumulator.bloqueos + day.resumen.bloqueos,
          }),
          {
            total: 0,
            pendientes: 0,
            confirmadas: 0,
            enAtencion: 0,
            completadas: 0,
            canceladas: 0,
            reprogramadas: 0,
            bloqueos: 0,
          }
        )

  const firstLabel =
    viewMode.value === 'mes'
      ? 'Citas del mes'
      : viewMode.value === 'semana'
        ? 'Citas de la semana'
        : 'Citas del dia'

  return [
    { label: firstLabel, value: String(summary?.total ?? 0), tone: 'pink' },
    { label: 'Pendientes', value: String(summary?.pendientes ?? 0), tone: 'gold' },
    { label: 'Confirmadas', value: String(summary?.confirmadas ?? 0), tone: 'mint' },
    { label: 'En atencion', value: String(summary?.enAtencion ?? 0), tone: 'sky' },
    { label: 'Bloqueos', value: String(summary?.bloqueos ?? 0), tone: 'lavender' },
  ]
})

const minBlockDate = computed(() => agenda.value?.fechaMinimaBloqueo ?? getTodayDateString())

const blockDateHint = computed(() => {
  const minDateLabel = formatShortDate(minBlockDate.value)
  return minBlockDate.value === getTodayDateString()
    ? 'Puedes crear bloqueos desde hoy en adelante. Los domingos ya aparecen cerrados por defecto.'
    : `La jornada de hoy ya cerro. Los nuevos bloqueos solo pueden crearse desde ${minDateLabel}.`
})

const rangeDays = computed(() => agenda.value?.rango.dias ?? [])

const dayStatusMessage = computed(() => {
  if (!agenda.value) {
    return ''
  }

  if (agenda.value.cerrado) {
    return agenda.value.cierreMotivo || 'Este dia aparece cerrado en la agenda.'
  }

  return `Horario del negocio: ${formatTime(agenda.value.horario?.horaApertura ?? null)} a ${formatTime(agenda.value.horario?.horaCierre ?? null)}. Ultima cita sugerida: ${formatTime(agenda.value.horario?.ultimaCita ?? null)}.`
})

const fullDayBlocks = computed(() => agenda.value?.bloqueos.filter((block) => block.esDiaCompleto) ?? [])

const timeRows = computed(() => {
  if (!agenda.value?.horario || agenda.value.cerrado) {
    return []
  }

  const rows = []
  const startMinutes = timeToMinutes(agenda.value.horario.horaApertura)
  const closeMinutes = timeToMinutes(agenda.value.horario.horaCierre)
  const fullDayBlock = (agenda.value?.bloqueos ?? []).find((item) => item.esDiaCompleto)

  for (let minutes = startMinutes; minutes < closeMinutes; minutes += 30) {
    const slotStart = minutesToTime(minutes)
    const slotEnd = minutesToTime(minutes + 30)
    const appointmentsStarting = (agenda.value?.citas ?? []).filter(
      (appointment) => normalizeTime(appointment.horaInicio) === slotStart
    )
    const ongoingAppointments = (agenda.value?.citas ?? []).filter(
      (appointment) =>
        normalizeTime(appointment.horaInicio) !== slotStart &&
        rangesOverlap(
          minutes,
          minutes + 30,
          timeToMinutes(appointment.horaInicio),
          timeToMinutes(appointment.horaFinEstimada)
        )
    )
    const block =
      fullDayBlock ||
      (agenda.value?.bloqueos ?? []).find(
        (item) =>
          !item.esDiaCompleto &&
          rangesOverlap(
            minutes,
            minutes + 30,
            timeToMinutes(item.horaInicio),
            timeToMinutes(item.horaFin)
          )
      )

    rows.push({
      label: slotStart.slice(0, 5),
      slotStart,
      slotEnd,
      appointmentsStarting,
      ongoingAppointments,
      block,
      available: !appointmentsStarting.length && !ongoingAppointments.length && !block,
    })
  }

  return rows
})

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  blockForm.value.fecha = selectedDate.value
  await loadAgenda()

  if (props.initialSection === 'blocks') {
    await nextTick()
    blocksSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

async function loadAgenda() {
  loading.value = true
  error.value = ''

  try {
    const data = await apiGet<AgendaResponse>(`/api/admin/agenda?fecha=${encodeURIComponent(selectedDate.value)}&vista=${encodeURIComponent(viewMode.value)}`)
    agenda.value = data
    viewMode.value = data.vista
    blockForm.value.fecha =
      blockForm.value.fecha && blockForm.value.fecha >= data.fechaMinimaBloqueo
        ? blockForm.value.fecha
        : data.fechaMinimaBloqueo
    await loadBlocksList()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la agenda del negocio'
  } finally {
    loading.value = false
  }
}

async function loadBlocksList() {
  try {
    const data = await apiGet<BlockListResponse>(`/api/admin/agenda/bloqueos?fecha=${encodeURIComponent(selectedDate.value)}`)
    upcomingBlocks.value = data.bloqueos
  } catch (caughtError) {
    console.error('No se pudo cargar la lista de bloqueos', caughtError)
  }
}

function goTo(path: string) {
  navigateTo(path)
}

function goToToday() {
  viewMode.value = 'hoy'
  selectedDate.value = getTodayDateString()
  loadAgenda()
}

async function handleDateChange() {
  blockForm.value.fecha = selectedDate.value
  await loadAgenda()
}

async function setViewMode(mode: 'hoy' | 'semana' | 'mes') {
  viewMode.value = mode
  await loadAgenda()
}

async function jumpToRangeDate(dateValue: string) {
  selectedDate.value = dateValue
  await loadAgenda()
}

async function openAppointmentDetail(appointmentId: string) {
  detailLoading.value = true
  selectedAppointment.value = null
  isDetailOpen.value = true

  try {
    const data = await apiGet<AgendaDetailResponse>(`/api/admin/agenda/citas/${appointmentId}`)
    selectedAppointment.value = data.cita
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle de la cita'
    closeAppointmentDetail()
  } finally {
    detailLoading.value = false
  }
}

function closeAppointmentDetail() {
  isDetailOpen.value = false
  selectedAppointment.value = null
}

async function confirmSelectedAppointment() {
  if (!selectedAppointment.value) {
    return
  }

  actionLoading.value = true

  try {
    const data = await apiPatch<AgendaActionResponse>(
      `/api/admin/agenda/citas/${selectedAppointment.value.id}/confirm`,
      {}
    )

    showToast(data.message || 'La cita fue confirmada correctamente')
    await loadAgenda()

    if (selectedAppointment.value) {
      const refreshed = await apiGet<AgendaDetailResponse>(`/api/admin/agenda/citas/${selectedAppointment.value.id}`)
      selectedAppointment.value = refreshed.cita
    }
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo confirmar la cita'
  } finally {
    actionLoading.value = false
  }
}

async function createBlock() {
  if (blockForm.value.fecha < minBlockDate.value) {
    error.value =
      minBlockDate.value === getTodayDateString()
        ? 'Solo puedes crear bloqueos desde hoy en adelante.'
        : `La jornada de hoy ya cerro. Los nuevos bloqueos deben crearse desde ${formatShortDate(minBlockDate.value)}.`
    return
  }

  blockSubmitting.value = true

  try {
    const data = await apiPost<{ success: boolean; message: string }>('/api/admin/agenda/bloqueos', {
      fecha: blockForm.value.fecha,
      horaInicio: blockForm.value.horaInicio || null,
      horaFin: blockForm.value.horaFin || null,
      motivo: blockForm.value.motivo || null,
    })

    showToast(data.message || 'El bloqueo fue creado correctamente')
    blockForm.value.horaInicio = ''
    blockForm.value.horaFin = ''
    blockForm.value.motivo = ''
    selectedDate.value = blockForm.value.fecha
    await loadAgenda()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo crear el bloqueo'
  } finally {
    blockSubmitting.value = false
  }
}

async function deactivateBlock(blockId: string) {
  deactivatingBlockId.value = blockId

  try {
    const data = await apiPatch<{ success: boolean; message: string }>(
      `/api/admin/agenda/bloqueos/${blockId}/deactivate`,
      {}
    )

    showToast(data.message || 'El bloqueo fue desactivado correctamente')
    await loadAgenda()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo desactivar el bloqueo'
  } finally {
    deactivatingBlockId.value = ''
  }
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
    return 'Por confirmar'
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return 'Por confirmar'
  }

  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function formatShortDate(value: string | null) {
  if (!value) {
    return 'Hoy'
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return String(value)
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

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatLabel(value: string | null) {
  if (!value) {
    return 'Sin dato'
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusClass(value: string) {
  return value.replace(/_/g, '-')
}

function normalizeTime(value: string | null) {
  return String(value || '').slice(0, 8)
}

function timeToMinutes(value: string | null) {
  const normalized = String(value || '')
  const [hours, minutes] = normalized.split(':').map((part) => Number(part))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0
  }

  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB
}

function getTodayDateString() {
  const now = new Date()
  return formatDateInput(now)
}

function formatDateInput(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<template>
  <main class="admin-agenda-page">
    <section v-if="loading" class="agenda-shell state-card">
      <h1>Cargando la agenda del negocio...</h1>
      <p>Estamos preparando citas, bloqueos y horarios del dia seleccionado.</p>
    </section>

    <section v-else-if="error && !agenda" class="agenda-shell state-card">
      <h1>No pudimos abrir la agenda</h1>
      <p>{{ error }}</p>
      <div class="state-actions">
        <button type="button" class="btn-secundario" @click="goTo('/admin')">Volver al panel</button>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else-if="agenda">
      <AdminSiteHeader :current-path="currentPath" />

      <section class="agenda-shell hero-card">
        <div class="hero-copy">
          <span class="agenda-pill">Agenda del negocio</span>
          <h1>Centro operativo de citas y disponibilidad</h1>
          <p>
            Revisa solicitudes, confirma citas pendientes y administra bloqueos del calendario sin salir de
            Sweety Puppies.
          </p>
          <div class="hero-note">
            <strong>{{ formatDate(agenda.fecha) }}</strong>
            <span>{{ dayStatusMessage }}</span>
          </div>
        </div>

        <aside class="hero-controls">
          <span class="agenda-pill subtle">Vista de agenda</span>
          <div class="view-mode-controls">
            <button type="button" class="date-nav" :class="{ active: viewMode === 'hoy' }" @click="setViewMode('hoy')">Hoy</button>
            <button type="button" class="date-nav" :class="{ active: viewMode === 'semana' }" @click="setViewMode('semana')">Semana</button>
            <button type="button" class="date-nav" :class="{ active: viewMode === 'mes' }" @click="setViewMode('mes')">Mes</button>
          </div>

          <label class="field-group compact">
            <span>Selecciona una fecha</span>
            <input v-model="selectedDate" type="date" @change="handleDateChange">
          </label>
          <button type="button" class="btn-secundario jump-today" @click="goToToday">Volver a hoy</button>
        </aside>
      </section>

      <p v-if="toast" class="toast-banner">{{ toast }}</p>
      <p v-if="error" class="error-banner">{{ error }}</p>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="agenda-shell summary-card" :class="card.tone">
          <strong>{{ card.label }}</strong>
          <span class="summary-value">{{ card.value }}</span>
        </article>
      </section>

      <section class="agenda-shell range-card">
        <div class="section-head">
          <div>
            <span class="agenda-pill subtle">Vista {{ viewMode }}</span>
            <h2>{{ agenda.rango.etiqueta }}</h2>
          </div>
          <span class="range-helper">Selecciona cualquier dia para abrir su detalle operativo.</span>
        </div>

        <div class="range-grid" :class="viewMode">
          <button
            v-for="day in rangeDays"
            :key="day.fecha"
            type="button"
            class="range-day-card"
            :class="{ active: day.fecha === selectedDate, closed: day.cerrado }"
            @click="jumpToRangeDate(day.fecha)"
          >
            <div class="range-day-top">
              <strong>{{ formatDate(day.fecha) }}</strong>
              <span class="status-badge" :class="day.cerrado ? 'cancelada' : day.resumen.pendientes ? 'pendiente' : day.resumen.confirmadas ? 'confirmada' : 'completada'">
                {{ day.cerrado ? 'Cerrado' : `${day.resumen.total} citas` }}
              </span>
            </div>
            <div class="range-mini-grid">
              <span>Pendientes: {{ day.resumen.pendientes }}</span>
              <span>Confirmadas: {{ day.resumen.confirmadas }}</span>
              <span>En atencion: {{ day.resumen.enAtencion }}</span>
              <span>Bloqueos: {{ day.resumen.bloqueos }}</span>
            </div>
          </button>
        </div>
      </section>

      <section class="agenda-grid">
        <article class="agenda-shell timeline-card">
          <div class="section-head">
            <div>
              <span class="agenda-pill subtle">Vista del dia</span>
              <h2>{{ agenda.dia }}</h2>
            </div>
            <span class="day-chip" :class="agenda.cerrado ? 'closed' : 'open'">
              {{ agenda.cerrado ? 'Dia cerrado' : 'Dia operativo' }}
            </span>
          </div>

          <div v-if="fullDayBlocks.length" class="full-day-blocks">
            <div v-for="block in fullDayBlocks" :key="block.id" class="full-day-block">
              <strong>Dia bloqueado</strong>
              <span>{{ block.motivo || 'Bloqueo administrativo sin motivo especifico' }}</span>
            </div>
          </div>

          <div v-if="agenda.cerrado" class="empty-state">
            <h3>Domingo o jornada cerrada</h3>
            <p>{{ agenda.cierreMotivo }}</p>
          </div>

          <div v-else-if="timeRows.length" class="timeline-list">
            <div v-for="row in timeRows" :key="row.slotStart" class="timeline-row">
              <div class="timeline-time">
                <strong>{{ row.label }}</strong>
                <small>{{ row.slotEnd.slice(0, 5) }}</small>
              </div>

              <div class="timeline-content">
                <div v-if="row.block" class="block-card">
                  <strong>Franja bloqueada</strong>
                  <span>{{ row.block.motivo || 'Bloqueo operativo' }}</span>
                  <small>{{ formatTime(row.block.horaInicio) }} - {{ formatTime(row.block.horaFin) }}</small>
                </div>

                <div
                  v-for="appointment in row.appointmentsStarting"
                  :key="appointment.id"
                  class="appointment-card"
                  :class="statusClass(appointment.estado)"
                  @click="openAppointmentDetail(appointment.id)"
                >
                  <div class="appointment-main">
                    <div>
                      <strong>{{ appointment.mascotaNombre || 'Mascota por revisar' }}</strong>
                      <span>{{ appointment.clienteNombre || 'Cliente por revisar' }}</span>
                    </div>
                    <span class="status-badge" :class="statusClass(appointment.estado)">
                      {{ formatLabel(appointment.estado) }}
                    </span>
                  </div>
                  <div class="appointment-meta">
                    <span>{{ appointment.servicioNombre || 'Servicio por revisar' }}</span>
                    <span>{{ formatTime(appointment.horaInicio) }} - {{ formatTime(appointment.horaFinEstimada) }}</span>
                    <span>{{ formatCurrency(appointment.precioMostrado) }}</span>
                  </div>
                </div>

                <div v-for="appointment in row.ongoingAppointments" :key="`${appointment.id}-ongoing`" class="ongoing-chip">
                  Continua {{ appointment.mascotaNombre || 'la cita' }} - {{ formatLabel(appointment.estado) }}
                </div>

                <div v-if="row.available && !row.block" class="available-chip">Disponible</div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <h3>Aún no hay movimientos para esta fecha</h3>
            <p>La agenda esta despejada. Puedes aprovechar para revisar bloqueos o confirmar nuevas solicitudes.</p>
          </div>

          <div v-if="agenda.citas.length" class="daily-appointments">
            <div class="section-head compact">
              <div>
                <span class="agenda-pill subtle">Citas del dia</span>
                <h3>Resumen operativo</h3>
              </div>
            </div>

            <div class="daily-cards">
              <button
                v-for="appointment in agenda.citas"
                :key="appointment.id"
                type="button"
                class="daily-card"
                :class="statusClass(appointment.estado)"
                @click="openAppointmentDetail(appointment.id)"
              >
                <div>
                  <strong>{{ formatTime(appointment.horaInicio) }}</strong>
                  <span>{{ appointment.servicioNombre }}</span>
                </div>
                <div>
                  <strong>{{ appointment.mascotaNombre }}</strong>
                  <span>{{ appointment.clienteNombre }}</span>
                </div>
                <span class="status-badge" :class="statusClass(appointment.estado)">
                  {{ formatLabel(appointment.estado) }}
                </span>
              </button>
            </div>
          </div>
        </article>

        <aside ref="blocksSectionRef" class="side-column">
          <article class="agenda-shell create-block-card">
            <span class="agenda-pill subtle">Bloquear agenda</span>
            <h2>Configura descansos y cierres</h2>
            <p>
              Si dejas las horas vacias, el bloqueo se crea para el dia completo. Si diligencias ambas,
              quedara guardado como franja.
            </p>

            <div class="form-grid">
              <label class="field-group">
                <span>Fecha</span>
                <input v-model="blockForm.fecha" type="date" :min="minBlockDate">
                <small class="field-help">{{ blockDateHint }}</small>
              </label>

              <label class="field-group">
                <span>Hora inicio</span>
                <input v-model="blockForm.horaInicio" type="time">
              </label>

              <label class="field-group">
                <span>Hora fin</span>
                <input v-model="blockForm.horaFin" type="time">
              </label>
            </div>

            <label class="field-group">
              <span>Motivo</span>
              <textarea
                v-model="blockForm.motivo"
                rows="3"
                placeholder="Ejemplo: mantenimiento del local, pausa operativa o ausencia programada"
              />
            </label>

            <button type="button" class="btn-enviar" :disabled="blockSubmitting" @click="createBlock">
              {{ blockSubmitting ? 'Guardando bloqueo...' : 'Crear bloqueo' }}
            </button>
          </article>

          <article class="agenda-shell blocks-list-card">
            <div class="section-head">
              <div>
                <span class="agenda-pill subtle">Bloqueos activos</span>
                <h2>Lo proximo en agenda</h2>
              </div>
            </div>

            <div v-if="upcomingBlocks.length" class="blocks-list">
              <div v-for="block in upcomingBlocks" :key="block.id" class="listed-block">
                <div>
                  <strong>{{ formatDate(block.fecha) }}</strong>
                  <span>
                    {{
                      block.esDiaCompleto
                        ? 'Dia completo'
                        : `${formatTime(block.horaInicio)} - ${formatTime(block.horaFin)}`
                    }}
                  </span>
                  <small>{{ block.motivo || 'Bloqueo administrativo' }}</small>
                </div>
                <button
                  type="button"
                  class="text-action"
                  :disabled="deactivatingBlockId === block.id"
                  @click="deactivateBlock(block.id)"
                >
                  {{ deactivatingBlockId === block.id ? 'Desactivando...' : 'Desactivar' }}
                </button>
              </div>
            </div>
            <div v-else class="empty-state compact">
              <p>No hay bloqueos activos proximos en la agenda.</p>
            </div>
          </article>
        </aside>
      </section>

      <div v-if="isDetailOpen" class="modal-overlay" @click.self="closeAppointmentDetail">
        <section class="agenda-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="agenda-pill subtle">Detalle de cita</span>
              <h2>{{ selectedAppointment?.mascota.nombre || 'Cargando cita...' }}</h2>
              <p class="modal-copy">
                Revisa el contexto completo de la solicitud, el estado del peludito y las acciones disponibles.
              </p>
            </div>
            <button type="button" class="modal-close" @click="closeAppointmentDetail">x</button>
          </div>

          <div v-if="detailLoading" class="empty-state compact">
            <p>Estamos cargando la cita seleccionada...</p>
          </div>

          <template v-else-if="selectedAppointment">
            <div class="detail-grid">
              <article class="detail-card profile-card">
                <img
                  :src="selectedAppointment.mascota.fotoUrl || fallbackPetImage"
                  :alt="selectedAppointment.mascota.nombre"
                  class="pet-photo"
                >
                <div>
                  <strong>{{ selectedAppointment.mascota.nombre }}</strong>
                  <span>{{ selectedAppointment.mascota.raza || 'Raza por confirmar' }}</span>
                  <small>{{ formatLabel(selectedAppointment.mascota.tamano) }} - {{ formatLabel(selectedAppointment.mascota.tipoPelaje) }}</small>
                </div>
              </article>

              <article class="detail-card">
                <strong>Cliente</strong>
                <span>{{ selectedAppointment.cliente.nombre || 'Cliente por revisar' }}</span>
                <small>{{ selectedAppointment.cliente.telefono || 'Teléfono por confirmar' }}</small>
                <small>{{ selectedAppointment.cliente.email || 'Correo por confirmar' }}</small>
              </article>

              <article class="detail-card">
                <strong>Servicio principal</strong>
                <span>{{ selectedAppointment.servicioPrincipal.nombre }}</span>
                <small>{{ formatDate(selectedAppointment.fecha) }}</small>
                <small>{{ formatTime(selectedAppointment.horaInicio) }} - {{ formatTime(selectedAppointment.horaFinEstimada) }}</small>
              </article>

              <article class="detail-card">
                <strong>Estado</strong>
                <span class="status-badge inline" :class="statusClass(selectedAppointment.estado)">
                  {{ formatLabel(selectedAppointment.estado) }}
                </span>
                <small>{{ formatLabel(selectedAppointment.estadoPelajeReportado) }} - {{ formatLabel(selectedAppointment.comportamientoReportado) }}</small>
              </article>
            </div>

            <div class="detail-grid secondary">
              <article class="detail-card wide">
                <strong>Observaciones del cliente</strong>
                <p>{{ selectedAppointment.observacionesCliente || 'Sin observaciones registradas por el cliente.' }}</p>
              </article>

              <article class="detail-card wide">
                <strong>Servicios adicionales</strong>
                <div class="chips-row">
                  <span
                    v-for="service in selectedAppointment.serviciosAdicionales"
                    :key="service.id"
                    class="soft-chip"
                  >
                    {{ service.nombre }} - {{ formatCurrency(service.precio) }}
                  </span>
                  <span v-if="!selectedAppointment.serviciosAdicionales.length" class="soft-chip">
                    Sin adicionales
                  </span>
                </div>
              </article>

              <article class="detail-card">
                <strong>Precio base</strong>
                <span>{{ formatCurrency(selectedAppointment.precioBase) }}</span>
                <small>Antes de recargos y extras</small>
              </article>

              <article class="detail-card">
                <strong>Precio calculado</strong>
                <span>{{ formatCurrency(selectedAppointment.precioCalculado) }}</span>
                <small>Total estimado de la cita</small>
              </article>

              <article class="detail-card">
                <strong>Precio final</strong>
                <span>{{ formatCurrency(selectedAppointment.precioFinal || selectedAppointment.precioCalculado) }}</span>
                <small>Valor visible para la administracion</small>
              </article>

              <article class="detail-card photo-card">
                <strong>Foto del estado actual</strong>
                <img
                  v-if="selectedAppointment.fotoEstadoActualUrl"
                  :src="selectedAppointment.fotoEstadoActualUrl"
                  alt="Estado actual de la mascota"
                  class="state-photo"
                >
                <p v-else>El cliente no adjunto una foto en esta solicitud.</p>
              </article>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="btn-enviar"
                :disabled="selectedAppointment.estado !== 'pendiente' || actionLoading"
                @click="confirmSelectedAppointment"
              >
                {{
                  actionLoading
                    ? 'Confirmando cita...'
                    : selectedAppointment.estado === 'pendiente'
                      ? 'Confirmar cita'
                      : 'Cita ya confirmada'
                }}
              </button>
              <button type="button" class="btn-secundario disabled" disabled>Reprogramar</button>
              <button type="button" class="btn-secundario disabled" disabled>Cancelar</button>
              <button type="button" class="btn-secundario disabled" disabled>Iniciar atencion</button>
            </div>
          </template>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.admin-agenda-page {
  width: min(1440px, calc(100vw - 42px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.agenda-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.state-card,
.hero-card,
.summary-card,
.timeline-card,
.create-block-card,
.blocks-list-card,
.modal-card {
  padding: 28px;
}

.agenda-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
}

.agenda-pill.subtle {
  margin-bottom: 12px;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
  gap: 20px;
}

.hero-card h1,
.section-head h2,
.section-head h3,
.modal-head h2,
.create-block-card h2,
.blocks-list-card h2 {
  margin: 12px 0;
  color: #8f176e;
}

.hero-copy p,
.hero-note span,
.state-card p,
.create-block-card p,
.modal-copy,
.empty-state p,
.listed-block span,
.listed-block small,
.detail-card p,
.detail-card small,
.timeline-time small,
.appointment-meta span {
  color: #6e5064;
  line-height: 1.7;
}

.hero-note,
.summary-card,
.appointment-card,
.block-card,
.listed-block,
.detail-card,
.profile-card,
.full-day-block {
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.hero-note,
.detail-card,
.listed-block,
.full-day-block {
  border-radius: 24px;
}

.hero-note {
  margin-top: 18px;
  padding: 18px 20px;
}

.hero-note strong,
.summary-card strong,
.appointment-card strong,
.block-card strong,
.listed-block strong,
.detail-card strong,
.timeline-time strong {
  display: block;
  color: #9c0076;
  margin-bottom: 6px;
}

.hero-controls {
  display: grid;
  gap: 14px;
  align-content: start;
}

.view-mode-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.jump-today {
  width: 100%;
}

.date-nav,
.btn-enviar,
.btn-secundario,
.text-action {
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
}

.date-nav,
.btn-secundario {
  background: linear-gradient(135deg, #fff4fb 0%, #ffffff 100%);
  color: #8f176e;
  border: 1px solid rgba(243, 203, 228, 0.9);
  box-shadow: 0 10px 22px rgba(219, 126, 183, 0.1);
}

.date-nav.active,
.btn-enviar {
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  color: #fff;
  box-shadow: 0 16px 30px var(--sp-primary-shadow);
}

.btn-secundario.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.range-card {
  margin-top: 24px;
  padding: 24px 28px 28px;
}

.range-helper {
  color: #6e5064;
  font-weight: 600;
}

.range-grid {
  display: grid;
  gap: 12px;
  margin-top: 8px;
}

.range-grid.hoy {
  grid-template-columns: 1fr;
}

.range-grid.semana {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.range-grid.mes {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.range-day-card {
  border: 1px solid rgba(243, 209, 230, 0.92);
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  padding: 18px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.range-day-card:hover,
.range-day-card.active {
  transform: translateY(-2px);
  box-shadow: 0 18px 30px rgba(233, 90, 219, 0.14);
  border-color: rgba(225, 118, 198, 0.88);
}

.range-day-card.closed {
  background: linear-gradient(145deg, rgba(255, 247, 251, 0.96) 0%, rgba(248, 244, 248, 0.92) 52%, rgba(240, 244, 247, 0.95) 100%);
}

.range-day-top {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}

.range-day-top strong {
  color: #8f176e;
}

.range-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  color: #6e5064;
  font-size: 0.92rem;
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

.summary-card.gold .summary-value {
  color: #ad7100;
}

.summary-card.mint .summary-value {
  color: #0b9f93;
}

.summary-card.sky .summary-value {
  color: #2f67c8;
}

.summary-card.lavender .summary-value {
  color: #6d56b8;
}

.agenda-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 18px;
}

.timeline-card,
.create-block-card,
.blocks-list-card {
  display: grid;
  gap: 18px;
}

.side-column {
  display: grid;
  gap: 18px;
  align-content: start;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.section-head.compact {
  margin-top: 6px;
}

.day-chip,
.status-badge,
.soft-chip,
.available-chip,
.ongoing-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.84rem;
}

.day-chip.open,
.status-badge.confirmada {
  background: #e9fbf7;
  color: #0b9f93;
}

.day-chip.closed,
.status-badge.cancelada {
  background: #fff1f4;
  color: #c33b74;
}

.status-badge.pendiente {
  background: #fff3d8;
  color: #a16000;
}

.status-badge.en-atencion {
  background: #eef5ff;
  color: #3967ca;
}

.status-badge.completada {
  background: #eefaf0;
  color: #2c8d51;
}

.status-badge.reprogramada {
  background: #f1ecff;
  color: #6d56b8;
}

.full-day-blocks,
.timeline-list,
.daily-cards,
.blocks-list {
  display: grid;
  gap: 12px;
}

.full-day-block,
.block-card {
  padding: 18px 20px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.timeline-time {
  padding-top: 8px;
}

.timeline-content {
  display: grid;
  gap: 10px;
  padding: 10px 0 10px 18px;
  border-left: 2px dashed rgba(243, 203, 228, 0.85);
}

.appointment-card,
.daily-card {
  border-radius: 24px;
  padding: 16px 18px;
  text-align: left;
}

.appointment-card {
  cursor: pointer;
}

.appointment-main,
.appointment-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.appointment-meta {
  flex-wrap: wrap;
  margin-top: 10px;
}

.appointment-card.pendiente,
.daily-card.pendiente {
  box-shadow: inset 4px 0 0 #f0b341;
}

.appointment-card.confirmada,
.daily-card.confirmada {
  box-shadow: inset 4px 0 0 #0b9f93;
}

.appointment-card.en-atencion,
.daily-card.en-atencion {
  box-shadow: inset 4px 0 0 #3d6ad1;
}

.appointment-card.completada,
.daily-card.completada {
  box-shadow: inset 4px 0 0 #38a164;
}

.appointment-card.cancelada,
.daily-card.cancelada {
  box-shadow: inset 4px 0 0 #cc5e8d;
}

.appointment-card.reprogramada,
.daily-card.reprogramada {
  box-shadow: inset 4px 0 0 #7a5bd1;
}

.available-chip {
  background: linear-gradient(135deg, #f9fff8 0%, #eefafe 100%);
  color: #3a9465;
  justify-self: start;
}

.ongoing-chip,
.soft-chip {
  background: #fff4fb;
  color: #8f176e;
  justify-self: start;
}

.daily-card {
  border: none;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  display: grid;
  grid-template-columns: 0.7fr 1fr auto;
  gap: 12px;
  align-items: center;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.field-group {
  display: grid;
  gap: 8px;
}

.field-group.compact {
  margin-top: 4px;
}

.field-group span {
  color: #8f176e;
  font-weight: 700;
}

.field-help {
  color: #7a5f70;
  line-height: 1.55;
}

.field-group input,
.field-group textarea {
  border-radius: 18px;
  border: 1px solid rgba(243, 203, 228, 0.9);
  padding: 14px 16px;
  font: inherit;
  background: rgba(255, 255, 255, 0.95);
  color: #5b4256;
}

.listed-block {
  padding: 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.text-action {
  background: linear-gradient(135deg, #eefafe 0%, #ffffff 100%);
  color: #188ca3;
  box-shadow: 0 10px 22px rgba(96, 215, 223, 0.16);
  min-width: 122px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.detail-grid.secondary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.detail-card {
  padding: 18px;
}

.detail-card.wide {
  grid-column: span 2;
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-badge.inline {
  justify-self: start;
}

.profile-card {
  display: flex;
  gap: 16px;
  align-items: center;
}

.pet-photo,
.state-photo {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 24px;
  border: 1px solid rgba(243, 203, 228, 0.9);
}

.photo-card {
  display: grid;
  gap: 12px;
}

.state-photo {
  width: 100%;
  max-height: 240px;
  height: auto;
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
  width: min(1200px, 100%);
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

.modal-actions,
.state-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 22px;
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

@media (max-width: 1260px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .detail-grid,
  .detail-grid.secondary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .range-grid.mes {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .hero-card,
  .agenda-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-agenda-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .state-card,
  .hero-card,
  .summary-card,
  .timeline-card,
  .create-block-card,
  .blocks-list-card,
  .modal-card {
    padding: 22px;
    border-radius: 24px;
  }

  .summary-grid,
  .form-grid,
  .detail-grid,
  .detail-grid.secondary,
  .daily-card {
    grid-template-columns: 1fr;
  }

  .view-mode-controls,
  .timeline-row,
  .appointment-main,
  .appointment-meta,
  .listed-block,
  .modal-head,
  .modal-actions,
  .state-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .timeline-content {
    padding-left: 14px;
  }

  .profile-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .range-grid.semana,
  .range-grid.mes,
  .range-mini-grid {
    grid-template-columns: 1fr;
  }
}
</style>
