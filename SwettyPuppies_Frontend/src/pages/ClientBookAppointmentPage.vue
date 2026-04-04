<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { apiForm, apiGet, apiPost } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { requireRole } from '@/lib/session'
import ClientSiteHeader from '@/components/ClientSiteHeader.vue'

type PetOption = {
  id: string
  nombre: string
  raza: string | null
  tamano: string
  tipo_pelaje: string
  comportamiento_habitual: string
  foto_mascota_url: string | null
}

type ServiceOption = {
  id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  requiere_tamano: boolean
  requiere_tipo_pelaje: boolean
  aplica_recargo_nudos: boolean
  aplica_recargo_comportamiento: boolean
}

type AdditionalOption = {
  id: string
  nombre: string
  descripcion: string | null
}

type QuoteResponse = {
  success: boolean
  quote: {
    mascota: PetOption
    servicio: ServiceOption
    adicionales: Array<{
      id: string
      nombre: string
      descripcion: string | null
      precio: number
    }>
    precioBase: number
    recargoNudos: number
    recargoComportamiento: number
    totalAdicionales: number
    totalEstimado: number
    duracionMinutos: number
    estadoPelajeReportado: string
    comportamientoReportado: string
  }
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

type FormOptionsResponse = {
  success: boolean
  mascotas: PetOption[]
  servicios: ServiceOption[]
  serviciosAdicionales: AdditionalOption[]
}

type CreateAppointmentResponse = {
  success: boolean
  message: string
  cita: {
    id: string
    fecha: string
    hora_inicio: string
    hora_fin_estimada: string
    estado: string
    mascotaNombre: string
    servicioNombre: string
    precioCalculado: number
    fotoEstadoActualUrl: string | null
    adicionales: Array<{ id: string; nombre: string; precio: number }>
  }
}

const currentPath = window.location.pathname.toLowerCase()
const todayDate = new Date().toISOString().split('T')[0]
const fallbackPetImage = '/img/mascota1.png'

const pelajeStateOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'con_nudos', label: 'Con nudos' },
  { value: 'muy_enredado', label: 'Muy enredado' },
]

const comportamientoOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'sensible', label: 'Sensible' },
  { value: 'agresivo', label: 'Agresivo' },
]

const loading = ref(true)
const quoteLoading = ref(false)
const availabilityLoading = ref(false)
const saving = ref(false)
const error = ref('')
const toast = ref('')
const availabilityMessage = ref('')
const previewEstadoActualUrl = ref('')
const mascotaOptions = ref<PetOption[]>([])
const serviceOptions = ref<ServiceOption[]>([])
const additionalOptions = ref<AdditionalOption[]>([])
const quote = ref<QuoteResponse['quote'] | null>(null)
const slots = ref<AvailabilityResponse['slots']>([])
const createdAppointment = ref<CreateAppointmentResponse['cita'] | null>(null)

const form = reactive({
  mascotaId: '',
  servicioId: '',
  servicioAdicionalIds: [] as string[],
  estadoPelajeReportado: 'normal',
  comportamientoReportado: 'normal',
  observacionesCliente: '',
  fecha: '',
  horaInicio: '',
  fotoEstadoActual: null as File | null,
})

const selectedPet = computed(() => mascotaOptions.value.find((pet) => pet.id === form.mascotaId) ?? null)
const selectedService = computed(() => serviceOptions.value.find((service) => service.id === form.servicioId) ?? null)
const hasPets = computed(() => mascotaOptions.value.length > 0)
const canQuote = computed(() => Boolean(form.mascotaId && form.servicioId))
const summaryItems = computed(() => {
  if (!quote.value) {
    return []
  }

  return [
    { label: 'Precio base', value: formatCurrency(quote.value.precioBase) },
    { label: 'Recargo por nudos', value: quote.value.recargoNudos ? formatCurrency(quote.value.recargoNudos) : 'No aplica' },
    {
      label: 'Recargo por comportamiento',
      value: quote.value.recargoComportamiento ? formatCurrency(quote.value.recargoComportamiento) : 'No aplica',
    },
    { label: 'Adicionales', value: quote.value.totalAdicionales ? formatCurrency(quote.value.totalAdicionales) : 'Sin adicionales' },
    { label: 'Duracion estimada', value: `${quote.value.duracionMinutos} min` },
  ]
})

let quoteRequestId = 0
let availabilityRequestId = 0

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('cliente')
  if (!session) {
    loading.value = false
    return
  }

  try {
    const options = await apiGet<FormOptionsResponse>('/api/cliente/citas/form-options')
    mascotaOptions.value = options.mascotas
    serviceOptions.value = options.servicios
    additionalOptions.value = options.serviciosAdicionales
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el modulo de citas'
  } finally {
    loading.value = false
  }
})

watch(
  () => [form.mascotaId, form.servicioId, form.estadoPelajeReportado, form.comportamientoReportado, form.servicioAdicionalIds.join('|')],
  async () => {
    form.horaInicio = ''
    slots.value = []
    availabilityMessage.value = ''

    if (!canQuote.value) {
      quote.value = null
      return
    }

    await refreshQuote()

    if (form.fecha && quote.value) {
      await refreshAvailability()
    }
  }
)

watch(
  () => form.fecha,
  async () => {
    form.horaInicio = ''
    slots.value = []
    availabilityMessage.value = ''

    if (!form.fecha || !quote.value) {
      return
    }

    await refreshAvailability()
  }
)

function toggleAdditional(id: string) {
  if (form.servicioAdicionalIds.includes(id)) {
    form.servicioAdicionalIds = form.servicioAdicionalIds.filter((value) => value !== id)
    return
  }

  form.servicioAdicionalIds = [...form.servicioAdicionalIds, id]
}

function onEstadoActualChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  form.fotoEstadoActual = file
  previewEstadoActualUrl.value = file ? URL.createObjectURL(file) : ''
}

async function refreshQuote() {
  quoteLoading.value = true
  const currentRequestId = ++quoteRequestId

  try {
    const data = await apiPost<QuoteResponse>('/api/cliente/citas/quote', {
      mascotaId: form.mascotaId,
      servicioId: form.servicioId,
      servicioAdicionalIds: form.servicioAdicionalIds,
      estadoPelajeReportado: form.estadoPelajeReportado,
      comportamientoReportado: form.comportamientoReportado,
    })

    if (currentRequestId !== quoteRequestId) {
      return
    }

    quote.value = data.quote
  } catch (caughtError) {
    if (currentRequestId !== quoteRequestId) {
      return
    }

    quote.value = null
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo calcular el precio'
  } finally {
    if (currentRequestId === quoteRequestId) {
      quoteLoading.value = false
    }
  }
}

async function refreshAvailability() {
  availabilityLoading.value = true
  const currentRequestId = ++availabilityRequestId

  try {
    const query = new URLSearchParams({
      mascotaId: form.mascotaId,
      servicioId: form.servicioId,
      fecha: form.fecha,
      estadoPelajeReportado: form.estadoPelajeReportado,
      comportamientoReportado: form.comportamientoReportado,
    })

    for (const adicionalId of form.servicioAdicionalIds) {
      query.append('servicioAdicionalIds', adicionalId)
    }

    const data = await apiGet<AvailabilityResponse>(`/api/cliente/citas/availability?${query.toString()}`)

    if (currentRequestId !== availabilityRequestId) {
      return
    }

    slots.value = data.slots
    availabilityMessage.value = data.message || ''
  } catch (caughtError) {
    if (currentRequestId !== availabilityRequestId) {
      return
    }

    slots.value = []
    availabilityMessage.value = ''
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo consultar la disponibilidad'
  } finally {
    if (currentRequestId === availabilityRequestId) {
      availabilityLoading.value = false
    }
  }
}

async function submitAppointment() {
  if (!canQuote.value || !quote.value) {
    error.value = 'Selecciona mascota y servicio para calcular la cita'
    return
  }

  if (!form.fecha) {
    error.value = 'Debes seleccionar una fecha'
    return
  }

  if (!form.horaInicio) {
    error.value = 'Debes elegir una hora disponible'
    return
  }

  saving.value = true
  error.value = ''
  toast.value = ''

  try {
    const payload = new FormData()
    payload.append('mascotaId', form.mascotaId)
    payload.append('servicioId', form.servicioId)
    payload.append('servicioAdicionalIds', JSON.stringify(form.servicioAdicionalIds))
    payload.append('estadoPelajeReportado', form.estadoPelajeReportado)
    payload.append('comportamientoReportado', form.comportamientoReportado)
    payload.append('observacionesCliente', form.observacionesCliente.trim())
    payload.append('fecha', form.fecha)
    payload.append('horaInicio', form.horaInicio)

    if (form.fotoEstadoActual) {
      payload.append('fotoEstadoActual', form.fotoEstadoActual)
    }

    const data = await apiForm<CreateAppointmentResponse>('/api/cliente/citas', 'POST', payload)
    createdAppointment.value = data.cita
    toast.value = data.message
    resetForm()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo registrar la cita'
  } finally {
    saving.value = false
  }
}

function resetForm() {
  form.mascotaId = ''
  form.servicioId = ''
  form.servicioAdicionalIds = []
  form.estadoPelajeReportado = 'normal'
  form.comportamientoReportado = 'normal'
  form.observacionesCliente = ''
  form.fecha = ''
  form.horaInicio = ''
  form.fotoEstadoActual = null
  previewEstadoActualUrl.value = ''
  quote.value = null
  slots.value = []
  availabilityMessage.value = ''
}

function clearSuccess() {
  createdAppointment.value = null
  toast.value = ''
}

function goTo(path: string) {
  navigateTo(path)
}

function petImage(url: string | null) {
  return url || fallbackPetImage
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatLabel(value: string | null) {
  if (!value) {
    return 'No disponible'
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatTime(value: string | null) {
  if (!value) {
    return 'Sin hora'
  }

  return String(value).slice(0, 5)
}
</script>

<template>
  <main class="booking-page">
    <section v-if="loading" class="booking-shell booking-state-card">
      <h1>Preparando el agendamiento...</h1>
      <p>Estamos conectando tus peluditos, servicios y horarios disponibles.</p>
    </section>

    <section v-else-if="error && !hasPets && !serviceOptions.length" class="booking-shell booking-state-card">
      <h1>No pudimos abrir Agendar cita</h1>
      <p>{{ error }}</p>
    </section>

    <template v-else>
      <ClientSiteHeader :current-path="currentPath" />

      <section v-if="createdAppointment" class="booking-shell success-card">
        <span class="booking-pill">Cita creada</span>
        <h1>Tu solicitud quedo pendiente de confirmacion</h1>
        <p>
          Registramos la cita para <strong>{{ createdAppointment.mascotaNombre }}</strong> con el servicio
          <strong>{{ createdAppointment.servicioNombre }}</strong>.
        </p>
        <div class="success-grid">
          <div>
            <strong>Fecha</strong>
            <span>{{ createdAppointment.fecha }}</span>
          </div>
          <div>
            <strong>Hora</strong>
            <span>{{ formatTime(createdAppointment.hora_inicio) }} - {{ formatTime(createdAppointment.hora_fin_estimada) }}</span>
          </div>
          <div>
            <strong>Estado</strong>
            <span>{{ formatLabel(createdAppointment.estado) }}</span>
          </div>
          <div>
            <strong>Total estimado</strong>
            <span>{{ formatCurrency(createdAppointment.precioCalculado) }}</span>
          </div>
        </div>
        <div class="success-actions">
          <button type="button" class="btn-enviar" @click="clearSuccess">Agendar otra cita</button>
          <a href="/cliente" class="btn-secundario" @click.prevent="goTo('/cliente')">Volver al inicio</a>
        </div>
      </section>

      <section v-else class="booking-layout">
        <section class="booking-shell booking-form-card">
          <div class="booking-head">
            <div>
              <span class="booking-pill">Agenda una visita</span>
              <h1>Reserva una cita para consentir a tu peludito</h1>
              <p>
                Escoge tu mascota, el servicio ideal y la hora disponible. Nosotros calculamos el
                valor estimado segun sus necesidades.
              </p>
            </div>
          </div>

          <div v-if="!hasPets" class="empty-pets-card">
            <h2>Primero registra una mascota</h2>
            <p>Para agendar una cita necesitas tener al menos un peludito registrado en tu portal.</p>
            <a href="/cliente/mascotas" class="btn-enviar" @click.prevent="goTo('/cliente/mascotas')">Ir a Mis mascotas</a>
          </div>

          <form v-else class="booking-form" @submit.prevent="submitAppointment">
            <div class="field-grid">
              <label class="field-block">
                <span>Mascota *</span>
                <select v-model="form.mascotaId">
                  <option value="">Selecciona tu mascota</option>
                  <option v-for="pet in mascotaOptions" :key="pet.id" :value="pet.id">
                    {{ pet.nombre }} · {{ formatLabel(pet.tamano) }} · {{ formatLabel(pet.tipo_pelaje) }}
                  </option>
                </select>
              </label>

              <label class="field-block">
                <span>Servicio principal *</span>
                <select v-model="form.servicioId">
                  <option value="">Selecciona el servicio</option>
                  <option v-for="service in serviceOptions" :key="service.id" :value="service.id">
                    {{ service.nombre }}
                  </option>
                </select>
              </label>

              <label class="field-block">
                <span>Estado del pelaje reportado *</span>
                <select v-model="form.estadoPelajeReportado">
                  <option v-for="option in pelajeStateOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="field-block">
                <span>Comportamiento reportado *</span>
                <select v-model="form.comportamientoReportado">
                  <option v-for="option in comportamientoOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <section v-if="selectedPet" class="pet-context-card">
              <img :src="petImage(selectedPet.foto_mascota_url)" :alt="selectedPet.nombre" class="pet-context-image">
              <div>
                <span class="booking-pill subtle">Tu peludito</span>
                <h2>{{ selectedPet.nombre }}</h2>
                <p>{{ selectedPet.raza || 'Raza por confirmar' }}</p>
              </div>
              <div class="pet-context-meta">
                <span>{{ formatLabel(selectedPet.tamano) }}</span>
                <span>{{ formatLabel(selectedPet.tipo_pelaje) }}</span>
                <span>{{ formatLabel(selectedPet.comportamiento_habitual) }}</span>
              </div>
            </section>

            <section class="additional-card">
              <div class="section-copy">
                <span class="booking-pill subtle">Servicios adicionales</span>
                <h2>Personaliza la visita</h2>
                <p>Agrega extras que sumen bienestar y cuidado especial a tu cita.</p>
              </div>

              <div class="additional-grid">
                <button
                  v-for="additional in additionalOptions"
                  :key="additional.id"
                  type="button"
                  class="additional-item"
                  :class="{ active: form.servicioAdicionalIds.includes(additional.id) }"
                  @click="toggleAdditional(additional.id)"
                >
                  <strong>{{ additional.nombre }}</strong>
                  <span>{{ additional.descripcion || 'Se sumara segun el tamano de tu mascota.' }}</span>
                </button>
              </div>
            </section>

            <div class="field-grid">
              <label class="field-block field-block-large">
                <span>Observaciones del cliente</span>
                <textarea
                  v-model.trim="form.observacionesCliente"
                  rows="4"
                  maxlength="320"
                  placeholder="Cuéntanos detalles importantes para la administradora antes de confirmar la cita."
                />
              </label>

              <label class="upload-card">
                <span>Foto del estado actual</span>
                <input type="file" accept="image/*" @change="onEstadoActualChange">
                <img
                  v-if="previewEstadoActualUrl"
                  :src="previewEstadoActualUrl"
                  alt="Estado actual de la mascota"
                  class="upload-preview"
                >
                <div v-else class="upload-empty">Sube una foto para que la administradora vea el estado actual del pelaje.</div>
              </label>
            </div>

            <section class="date-card">
              <div class="field-grid compact-grid">
                <label class="field-block">
                  <span>Fecha *</span>
                  <input v-model="form.fecha" type="date" :min="todayDate">
                </label>
              </div>

              <div class="slots-area">
                <div class="slots-head">
                  <div>
                    <span class="booking-pill subtle">Horarios disponibles</span>
                    <h2>Elige una hora libre</h2>
                  </div>
                  <span v-if="availabilityLoading" class="loading-text">Buscando disponibilidad...</span>
                </div>

                <p v-if="availabilityMessage" class="availability-message">{{ availabilityMessage }}</p>

                <div v-if="slots.length" class="slots-grid">
                  <button
                    v-for="slot in slots"
                    :key="slot.horaInicio"
                    type="button"
                    class="slot-button"
                    :class="{ active: form.horaInicio === slot.horaInicio }"
                    @click="form.horaInicio = slot.horaInicio"
                  >
                    <strong>{{ formatTime(slot.horaInicio) }}</strong>
                    <span>Hasta {{ formatTime(slot.horaFinEstimada) }}</span>
                  </button>
                </div>
                <p v-else-if="form.fecha && !availabilityLoading" class="availability-empty">
                  Selecciona otra fecha o ajusta el servicio para ver nuevas opciones.
                </p>
              </div>
            </section>

            <p v-if="error" class="booking-feedback error">{{ error }}</p>
            <p v-if="toast" class="booking-feedback success">{{ toast }}</p>

            <div class="form-actions">
              <button type="submit" class="btn-enviar" :disabled="saving || quoteLoading || availabilityLoading">
                {{ saving ? 'Guardando cita...' : 'Confirmar solicitud de cita' }}
              </button>
            </div>
          </form>
        </section>

        <aside class="booking-shell booking-summary-card">
          <span class="booking-pill">Resumen estimado</span>
          <h2>Tu cita en un vistazo</h2>
          <p>El valor final podra confirmarse despues de la revision administrativa, pero aqui ves una base muy cercana.</p>

          <div v-if="selectedService" class="service-card">
            <strong>{{ selectedService.nombre }}</strong>
            <span>{{ selectedService.descripcion }}</span>
          </div>

          <div v-if="quoteLoading" class="summary-loading">
            Calculando precio y condiciones del servicio...
          </div>

          <template v-else-if="quote">
            <div class="summary-grid">
              <div v-for="item in summaryItems" :key="item.label">
                <strong>{{ item.label }}</strong>
                <span>{{ item.value }}</span>
              </div>
            </div>

            <div v-if="quote.adicionales.length" class="additional-summary">
              <strong>Adicionales elegidos</strong>
              <div class="additional-summary-list">
                <span v-for="additional in quote.adicionales" :key="additional.id">
                  {{ additional.nombre }} · {{ formatCurrency(additional.precio) }}
                </span>
              </div>
            </div>

            <div class="total-card">
              <strong>Total estimado</strong>
              <span>{{ formatCurrency(quote.totalEstimado) }}</span>
            </div>
          </template>

          <div v-else class="summary-empty">
            Selecciona una mascota y un servicio para ver el valor estimado en tiempo real.
          </div>
        </aside>
      </section>
    </template>
  </main>
</template>

<style scoped>
.booking-page {
  width: min(1380px, calc(100vw - 42px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.booking-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.booking-state-card,
.success-card {
  padding: 38px;
  text-align: center;
}

.booking-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  gap: 22px;
}

.booking-form-card,
.booking-summary-card {
  padding: 30px;
}

.booking-summary-card {
  position: sticky;
  top: 130px;
  height: fit-content;
}

.booking-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
  box-shadow: inset 0 0 0 1px rgba(156, 0, 118, 0.09);
}

.booking-pill.subtle {
  font-size: 0.8rem;
}

.booking-head h1,
.booking-summary-card h2,
.additional-card h2,
.date-card h2,
.pet-context-card h2,
.success-card h1 {
  margin: 14px 0 12px;
  color: #8f176e;
}

.booking-head p,
.booking-summary-card p,
.section-copy p,
.upload-empty,
.availability-message,
.availability-empty,
.summary-empty,
.service-card span,
.summary-grid span,
.additional-summary-list span,
.success-card p,
.success-grid span {
  color: #6e5064;
  line-height: 1.75;
}

.empty-pets-card,
.additional-card,
.date-card,
.pet-context-card,
.service-card,
.summary-grid div,
.total-card,
.success-grid div {
  margin-top: 22px;
  padding: 22px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.booking-form {
  display: grid;
  gap: 22px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-grid.compact-grid {
  grid-template-columns: minmax(220px, 340px);
}

.field-block {
  display: block;
}

.field-block span,
.upload-card span,
.summary-grid strong,
.success-grid strong,
.total-card strong,
.additional-summary strong {
  display: block;
  margin-bottom: 8px;
  color: #9c0076;
  font-weight: 700;
}

.field-block input,
.field-block select,
.field-block textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(243, 181, 221, 0.95);
  background: rgba(255, 255, 255, 0.98);
  color: #5d4354;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.96rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-block input:focus,
.field-block select:focus,
.field-block textarea:focus {
  border-color: #d85ac7;
  box-shadow: 0 0 0 4px rgba(232, 120, 206, 0.14);
}

.field-block-large {
  min-height: 100%;
}

.pet-context-card {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
}

.pet-context-image {
  width: 110px;
  height: 110px;
  border-radius: 24px;
  object-fit: cover;
}

.pet-context-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pet-context-meta span,
.additional-summary-list span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: #fff3fb;
  color: #8f176e;
  font-weight: 600;
}

.additional-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.additional-item {
  border: 1px solid rgba(243, 203, 228, 0.9);
  border-radius: 22px;
  padding: 18px;
  text-align: left;
  background: #fff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.additional-item strong,
.service-card strong {
  display: block;
  color: #8f176e;
  margin-bottom: 8px;
}

.additional-item span {
  color: #6e5064;
  line-height: 1.6;
}

.additional-item.active {
  transform: translateY(-2px);
  border-color: rgba(193, 0, 143, 0.65);
  box-shadow: 0 18px 28px rgba(233, 90, 219, 0.16);
  background: linear-gradient(135deg, #fff0f9 0%, #eefcff 100%);
}

.upload-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.upload-preview {
  width: 100%;
  min-height: 220px;
  max-height: 260px;
  object-fit: cover;
  border-radius: 20px;
}

.date-card {
  display: grid;
  gap: 18px;
}

.slots-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.loading-text {
  color: #8f176e;
  font-weight: 700;
}

.slots-grid {
  margin-top: 16px;
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
  background: linear-gradient(135deg, #c1008f 0%, #e95adb 100%);
  box-shadow: 0 16px 26px rgba(233, 90, 219, 0.24);
}

.slot-button.active strong,
.slot-button.active span {
  color: #fff;
}

.summary-grid {
  display: grid;
  gap: 12px;
}

.additional-summary,
.total-card {
  margin-top: 18px;
}

.total-card span {
  display: block;
  margin-top: 8px;
  font-size: 1.7rem;
  color: #8f176e;
  font-weight: 800;
}

.success-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.success-actions,
.form-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.booking-feedback {
  margin-top: 4px;
  font-weight: 700;
}

.booking-feedback.error {
  color: #cb3b81;
}

.booking-feedback.success {
  color: #0b9f93;
}

@media (max-width: 1180px) {
  .booking-layout {
    grid-template-columns: 1fr;
  }

  .booking-summary-card {
    position: static;
  }

  .additional-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 840px) {
  .booking-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .booking-form-card,
  .booking-summary-card,
  .booking-state-card,
  .success-card {
    padding: 22px;
    border-radius: 24px;
  }

  .field-grid,
  .success-grid,
  .pet-context-card {
    grid-template-columns: 1fr;
  }

  .field-grid.compact-grid {
    grid-template-columns: 1fr;
  }

  .success-actions,
  .form-actions {
    flex-direction: column;
  }
}
</style>
