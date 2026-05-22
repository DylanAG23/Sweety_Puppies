<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type ServiceCategory = 'principales' | 'adicionales'

type PrimaryTariff = {
  tamano: string
  tipo_pelaje: string
  precio_base: number | string
}

type AdditionalTariff = {
  tamano: string
  precio: number | string
}

type PrimaryServiceItem = {
  id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  requiere_tamano: boolean
  requiere_tipo_pelaje: boolean
  aplica_recargo_nudos: boolean
  aplica_recargo_comportamiento: boolean
  activo: boolean
  created_at: string
  updated_at: string
  precio_desde: number
  precio_hasta: number
}

type AdditionalServiceItem = {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
  precio_desde: number
  precio_hasta: number
}

type PrimaryServiceDetail = PrimaryServiceItem & { tarifas: PrimaryTariff[] }
type AdditionalServiceDetail = AdditionalServiceItem & { tarifas: AdditionalTariff[] }

type ServiceListResponse = {
  success: boolean
  servicios: Array<PrimaryServiceItem | AdditionalServiceItem>
  search: string
  categoria: ServiceCategory
}

type ServiceDetailResponse = {
  success: boolean
  servicio: PrimaryServiceDetail | AdditionalServiceDetail
  categoria: ServiceCategory
}

type ServiceMutationResponse = {
  success: boolean
  message: string
  servicio: PrimaryServiceDetail | AdditionalServiceDetail
  categoria: ServiceCategory
}

type PrimaryForm = {
  nombre: string
  descripcion: string
  duracion_minutos: number
  requiere_tamano: boolean
  requiere_tipo_pelaje: boolean
  aplica_recargo_nudos: boolean
  aplica_recargo_comportamiento: boolean
  activo: boolean
  tarifas: PrimaryTariff[]
}

type AdditionalForm = {
  nombre: string
  descripcion: string
  activo: boolean
  tarifas: AdditionalTariff[]
}

const props = withDefaults(
  defineProps<{
    initialCategory?: ServiceCategory
  }>(),
  {
    initialCategory: 'principales',
  }
)

const SERVICE_SIZES = ['miniatura', 'pequeno', 'mediano', 'grande', 'extra grande']
const COAT_TYPES = ['corto', 'largo']

const currentPath = window.location.pathname.toLowerCase()
const loading = ref(true)
const detailLoading = ref(false)
const saving = ref(false)
const error = ref('')
const toast = ref('')
const searchTerm = ref('')
const appliedSearch = ref('')
const currentCategory = ref<ServiceCategory>(props.initialCategory)
const services = ref<Array<PrimaryServiceItem | AdditionalServiceItem>>([])
const selectedService = ref<PrimaryServiceDetail | AdditionalServiceDetail | null>(null)
const selectedServiceCategory = ref<ServiceCategory>(props.initialCategory)
const isDetailOpen = ref(false)
const isEditing = ref(false)
const isCreateOpen = ref(false)
const createCategory = ref<ServiceCategory>(props.initialCategory)
const primaryForm = ref(createPrimaryForm())
const additionalForm = ref(createAdditionalForm())

const summaryCards = computed(() => {
  if (currentCategory.value === 'principales') {
    const primaryItems = services.value as PrimaryServiceItem[]
    const maxPrice = primaryItems.reduce((highest, item) => Math.max(highest, Number(item.precio_hasta) || 0), 0)

    return [
      { label: 'Servicios fijos visibles', value: String(primaryItems.length), tone: 'pink' },
      { label: 'Activos', value: String(primaryItems.filter((item) => item.activo).length), tone: 'mint' },
      { label: 'Requieren tamano', value: String(primaryItems.filter((item) => item.requiere_tamano).length), tone: 'lavender' },
      { label: 'Tarifa mas alta', value: formatCurrency(maxPrice), tone: 'sky' },
    ]
  }

  const additionalItems = services.value as AdditionalServiceItem[]
  const configured = additionalItems.filter((item) => Number(item.precio_hasta) > 0).length
  const maxPrice = additionalItems.reduce((highest, item) => Math.max(highest, Number(item.precio_hasta) || 0), 0)

  return [
    { label: 'Adicionales visibles', value: String(additionalItems.length), tone: 'pink' },
    { label: 'Activos', value: String(additionalItems.filter((item) => item.activo).length), tone: 'mint' },
    { label: 'Con tarifa configurada', value: String(configured), tone: 'lavender' },
    { label: 'Tarifa mas alta', value: formatCurrency(maxPrice), tone: 'sky' },
  ]
})

const emptyStateTitle = computed(() =>
  appliedSearch.value
    ? currentCategory.value === 'principales'
      ? 'No encontramos servicios fijos con esa busqueda'
      : 'No encontramos servicios adicionales con esa busqueda'
    : currentCategory.value === 'principales'
      ? 'Aún no hay servicios fijos registrados'
      : 'Aún no hay servicios adicionales registrados'
)

const emptyStateMessage = computed(() =>
  appliedSearch.value
    ? 'Prueba por nombre, descripcion o palabras clave del catalogo.'
    : currentCategory.value === 'principales'
      ? 'Aqui apareceran los servicios base como bano completo, corte de unas y cualquier otro servicio principal que ofrezca Sweety Puppies.'
      : 'Aqui apareceran los adicionales como hidratacion, bano antipulgas o cualquier extra configurable para una cita.'
)

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  await loadServices(props.initialCategory, '')
})

function createPrimaryTariffs(): PrimaryTariff[] {
  return SERVICE_SIZES.flatMap((tamano) =>
    COAT_TYPES.map((tipo_pelaje) => ({
      tamano,
      tipo_pelaje,
      precio_base: '',
    }))
  )
}

function createAdditionalTariffs(): AdditionalTariff[] {
  return SERVICE_SIZES.map((tamano) => ({
    tamano,
    precio: '',
  }))
}

function createPrimaryForm(): PrimaryForm {
  return {
    nombre: '',
    descripcion: '',
    duracion_minutos: 60,
    requiere_tamano: false,
    requiere_tipo_pelaje: false,
    aplica_recargo_nudos: false,
    aplica_recargo_comportamiento: false,
    activo: true,
    tarifas: createPrimaryTariffs(),
  }
}

function createAdditionalForm(): AdditionalForm {
  return {
    nombre: '',
    descripcion: '',
    activo: true,
    tarifas: createAdditionalTariffs(),
  }
}

function mapPrimaryTariffs(values: PrimaryTariff[] | undefined): PrimaryTariff[] {
  const lookup = new Map((values || []).map((item) => [`${item.tamano}-${item.tipo_pelaje}`, item]))
  return createPrimaryTariffs().map((template) => {
    const existing = lookup.get(`${template.tamano}-${template.tipo_pelaje}`)
    return {
      ...template,
      precio_base: existing?.precio_base ?? '',
    }
  })
}

function mapAdditionalTariffs(values: AdditionalTariff[] | undefined): AdditionalTariff[] {
  const lookup = new Map((values || []).map((item) => [item.tamano, item]))
  return createAdditionalTariffs().map((template) => {
    const existing = lookup.get(template.tamano)
    return {
      ...template,
      precio: existing?.precio ?? '',
    }
  })
}

function fillPrimaryForm(service: PrimaryServiceDetail) {
  primaryForm.value = {
    nombre: service.nombre || '',
    descripcion: service.descripcion || '',
    duracion_minutos: Number(service.duracion_minutos) || 60,
    requiere_tamano: Boolean(service.requiere_tamano),
    requiere_tipo_pelaje: Boolean(service.requiere_tipo_pelaje),
    aplica_recargo_nudos: Boolean(service.aplica_recargo_nudos),
    aplica_recargo_comportamiento: Boolean(service.aplica_recargo_comportamiento),
    activo: Boolean(service.activo),
    tarifas: mapPrimaryTariffs(service.tarifas),
  }
}

function fillAdditionalForm(service: AdditionalServiceDetail) {
  additionalForm.value = {
    nombre: service.nombre || '',
    descripcion: service.descripcion || '',
    activo: Boolean(service.activo),
    tarifas: mapAdditionalTariffs(service.tarifas),
  }
}

function resetForm(category: ServiceCategory) {
  if (category === 'principales') {
    primaryForm.value = createPrimaryForm()
    return
  }

  additionalForm.value = createAdditionalForm()
}

async function loadServices(category = currentCategory.value, search = appliedSearch.value) {
  loading.value = true
  error.value = ''

  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    const endpoint = category === 'principales' ? '/api/servicios/principales' : '/api/servicios/adicionales'
    const data = await apiGet<ServiceListResponse>(`${endpoint}${query}`)
    services.value = data.servicios
    appliedSearch.value = data.search || search
    currentCategory.value = data.categoria || category
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar los servicios'
  } finally {
    loading.value = false
  }
}

async function applySearch() {
  await loadServices(currentCategory.value, searchTerm.value.trim())
}

async function clearSearch() {
  searchTerm.value = ''
  await loadServices(currentCategory.value, '')
}

async function switchCategory(category: ServiceCategory) {
  if (currentCategory.value === category && services.value.length) {
    return
  }

  currentCategory.value = category
  searchTerm.value = ''
  appliedSearch.value = ''
  services.value = []
  error.value = ''
  selectedService.value = null
  isDetailOpen.value = false
  await loadServices(category, '')
}

async function openServiceDetail(serviceId: string, category = currentCategory.value) {
  detailLoading.value = true
  selectedService.value = null
  selectedServiceCategory.value = category
  isDetailOpen.value = true
  isEditing.value = false
  error.value = ''

  try {
    const endpoint =
      category === 'principales' ? `/api/servicios/principales/${serviceId}` : `/api/servicios/adicionales/${serviceId}`
    const data = await apiGet<ServiceDetailResponse>(endpoint)
    selectedService.value = data.servicio
    selectedServiceCategory.value = data.categoria || category

    if (selectedServiceCategory.value === 'principales') {
      fillPrimaryForm(data.servicio as PrimaryServiceDetail)
    } else {
      fillAdditionalForm(data.servicio as AdditionalServiceDetail)
    }
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle del servicio'
    closeDetail()
  } finally {
    detailLoading.value = false
  }
}

async function openServiceForEditing(serviceId: string, category = currentCategory.value) {
  await openServiceDetail(serviceId, category)
  if (selectedService.value) {
    isEditing.value = true
  }
}

function closeDetail() {
  isDetailOpen.value = false
  selectedService.value = null
  isEditing.value = false
}

function openCreateModal(category = currentCategory.value) {
  createCategory.value = category
  resetForm(category)
  isCreateOpen.value = true
  error.value = ''
}

function closeCreateModal() {
  isCreateOpen.value = false
  resetForm(createCategory.value)
}

function startEditing() {
  if (!selectedService.value) return
  if (selectedServiceCategory.value === 'principales') {
    fillPrimaryForm(selectedService.value as PrimaryServiceDetail)
  } else {
    fillAdditionalForm(selectedService.value as AdditionalServiceDetail)
  }
  isEditing.value = true
}

function cancelEditing() {
  if (!selectedService.value) return
  if (selectedServiceCategory.value === 'principales') {
    fillPrimaryForm(selectedService.value as PrimaryServiceDetail)
  } else {
    fillAdditionalForm(selectedService.value as AdditionalServiceDetail)
  }
  isEditing.value = false
}

function buildPrimaryPayload() {
  const selectedDuration =
    selectedService.value && selectedServiceCategory.value === 'principales'
      ? Number(primaryDetail(selectedService.value).duracion_minutos)
      : NaN
  const typedDuration = Number(primaryForm.value.duracion_minutos)
  const safeDuration =
    Number.isFinite(typedDuration) && typedDuration > 0
      ? typedDuration
      : Number.isFinite(selectedDuration) && selectedDuration > 0
        ? selectedDuration
        : 60

  return {
    nombre: primaryForm.value.nombre,
    descripcion: primaryForm.value.descripcion,
    duracion_minutos: safeDuration,
    requiere_tamano: primaryForm.value.requiere_tamano,
    requiere_tipo_pelaje: primaryForm.value.requiere_tipo_pelaje,
    aplica_recargo_nudos: primaryForm.value.aplica_recargo_nudos,
    aplica_recargo_comportamiento: primaryForm.value.aplica_recargo_comportamiento,
    activo: primaryForm.value.activo,
    tarifas: primaryForm.value.tarifas
      .map((item) => ({
        tamano: item.tamano,
        tipo_pelaje: item.tipo_pelaje,
        precio_base: Number(item.precio_base),
      }))
      .filter((item) => Number.isFinite(item.precio_base) && item.precio_base > 0),
  }
}

function buildAdditionalPayload() {
  return {
    nombre: additionalForm.value.nombre,
    descripcion: additionalForm.value.descripcion,
    activo: additionalForm.value.activo,
    tarifas: additionalForm.value.tarifas
      .map((item) => ({
        tamano: item.tamano,
        precio: Number(item.precio),
      }))
      .filter((item) => Number.isFinite(item.precio) && item.precio > 0),
  }
}

async function createService() {
  saving.value = true
  error.value = ''

  try {
    const category = createCategory.value
    const endpoint = category === 'principales' ? '/api/servicios/principales' : '/api/servicios/adicionales'
    const payload = category === 'principales' ? buildPrimaryPayload() : buildAdditionalPayload()
    const data = await apiPost<ServiceMutationResponse>(endpoint, payload)
    showToast(data.message || 'Servicio creado correctamente')
    closeCreateModal()
    await loadServices(category, appliedSearch.value)
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo crear el servicio'
  } finally {
    saving.value = false
  }
}

async function saveService() {
  if (!selectedService.value) return

  saving.value = true
  error.value = ''

  try {
    const category = selectedServiceCategory.value
    const endpoint =
      category === 'principales'
        ? `/api/servicios/principales/${selectedService.value.id}`
        : `/api/servicios/adicionales/${selectedService.value.id}`
    const payload = category === 'principales' ? buildPrimaryPayload() : buildAdditionalPayload()
    const data = await apiPatch<ServiceMutationResponse>(endpoint, payload)
    selectedService.value = data.servicio
    if (category === 'principales') {
      fillPrimaryForm(data.servicio as PrimaryServiceDetail)
    } else {
      fillAdditionalForm(data.servicio as AdditionalServiceDetail)
    }
    isEditing.value = false
    showToast(data.message || 'Servicio actualizado correctamente')
    await loadServices(category, appliedSearch.value)
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el servicio'
  } finally {
    saving.value = false
  }
}

async function toggleServiceStatus(service: PrimaryServiceItem | AdditionalServiceItem, category = currentCategory.value) {
  saving.value = true
  error.value = ''

  try {
    const endpoint =
      category === 'principales'
        ? `/api/servicios/principales/${service.id}/status`
        : `/api/servicios/adicionales/${service.id}/status`
    const data = await apiPatch<ServiceMutationResponse>(endpoint, { activo: !service.activo })
    if (selectedService.value?.id === service.id) {
      selectedService.value = data.servicio
      if (category === 'principales') {
        fillPrimaryForm(data.servicio as PrimaryServiceDetail)
      } else {
        fillAdditionalForm(data.servicio as AdditionalServiceDetail)
      }
    }
    showToast(data.message || 'Estado actualizado correctamente')
    await loadServices(category, appliedSearch.value)
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cambiar el estado del servicio'
  } finally {
    saving.value = false
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

function formatDateTime(value: string | null) {
  if (!value) return 'Sin registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin registro'

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatLabel(value: string | null) {
  if (!value) return 'Sin dato'

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatSize(value: string) {
  if (value === 'pequeno') return 'Pequeño'
  if (value === 'extra grande') return 'Extra grande'
  return formatLabel(value)
}

function formatBoolean(value: boolean) {
  return value ? 'Si' : 'No'
}

function formatCurrency(value: number | string | null) {
  const normalized = Number(value || 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(normalized)
}

function formatPriceRange(item: PrimaryServiceItem | AdditionalServiceItem) {
  const min = Number(item.precio_desde || 0)
  const max = Number(item.precio_hasta || 0)

  if (!max) {
    return 'Tarifa por configurar'
  }

  if (min === max) {
    return formatCurrency(max)
  }

  return `${formatCurrency(min)} - ${formatCurrency(max)}`
}

function primaryItem(item: PrimaryServiceItem | AdditionalServiceItem) {
  return item as PrimaryServiceItem
}

function primaryDetail(item: PrimaryServiceDetail | AdditionalServiceDetail) {
  return item as PrimaryServiceDetail
}

function additionalDetail(item: PrimaryServiceDetail | AdditionalServiceDetail) {
  return item as AdditionalServiceDetail
}
</script>

<template>
  <main class="admin-services-page">
    <section v-if="loading" class="services-shell state-card">
      <h1>Cargando el modulo de servicios...</h1>
      <p>Estamos preparando el catalogo fijo, los adicionales y la configuracion de tarifas.</p>
    </section>

    <section v-else-if="error && !services.length" class="services-shell state-card">
      <h1>No pudimos abrir Servicios</h1>
      <p>{{ error }}</p>
      <div class="state-actions">
        <button type="button" class="btn-secundario" @click="loadServices()">Intentar de nuevo</button>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="services-shell hero-card">
        <div class="hero-copy">
          <span class="services-pill">Catalogo y tarifas</span>
          <h1>Servicios que ofrece la peluquería</h1>
          <p>
            Aqui administras los servicios fijos y los adicionales de Sweety Puppies. Las citas ya completadas se
            gestionan por aparte como citas realizadas, asi que este espacio queda solo para lo que el negocio ofrece.
          </p>
          <div class="hero-note">
            <strong>Logica comercial</strong>
            <span>
              Cada servicio puede quedar listo con su configuracion base, su duracion y las tarifas que dependen de
              tamano, tipo de pelaje o talla, segun corresponda.
            </span>
          </div>
        </div>

        <aside class="hero-search">
          <div class="category-toggle">
            <button
              type="button"
              class="category-button"
              :class="{ active: currentCategory === 'principales' }"
              @click="switchCategory('principales')"
            >
              Servicios fijos
            </button>
            <button
              type="button"
              class="category-button"
              :class="{ active: currentCategory === 'adicionales' }"
              @click="switchCategory('adicionales')"
            >
              Servicios adicionales
            </button>
          </div>

          <label class="field-group">
            <span>{{ currentCategory === 'principales' ? 'Buscar servicio fijo' : 'Buscar servicio adicional' }}</span>
            <input
              v-model="searchTerm"
              type="search"
              :placeholder="
                currentCategory === 'principales'
                  ? 'Ejemplo: Bano completo, corte de unas...'
                  : 'Ejemplo: Hidratacion, antipulgas, deslanado...'
              "
              @keyup.enter="applySearch"
            >
          </label>

          <div class="search-actions">
            <button type="button" class="btn-enviar" @click="applySearch">Buscar</button>
            <button type="button" class="btn-secundario" @click="clearSearch">Limpiar</button>
            <button type="button" class="btn-secundario accent" @click="openCreateModal()">
              {{ currentCategory === 'principales' ? 'Nuevo servicio fijo' : 'Nuevo adicional' }}
            </button>
          </div>
        </aside>
      </section>

      <p v-if="toast" class="toast-banner">{{ toast }}</p>
      <p v-if="error" class="error-banner">{{ error }}</p>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="services-shell summary-card" :class="card.tone">
          <strong>{{ card.label }}</strong>
          <span class="summary-value">{{ card.value }}</span>
        </article>
      </section>

      <section class="services-shell list-card">
        <div class="section-head">
          <div>
            <span class="services-pill subtle">
              {{ currentCategory === 'principales' ? 'Servicios fijos' : 'Servicios adicionales' }}
            </span>
            <h2>
              {{
                appliedSearch
                  ? `Resultados para "${appliedSearch}"`
                  : currentCategory === 'principales'
                    ? 'Catalogo principal del negocio'
                    : 'Catalogo de adicionales del negocio'
              }}
            </h2>
          </div>
          <span class="section-copy">
            {{ services.length }} {{ services.length === 1 ? 'registro visible' : 'registros visibles' }}
          </span>
        </div>

        <div v-if="services.length" class="services-grid">
          <article v-for="item in services" :key="item.id" class="service-card">
            <div class="service-head">
              <div>
                <strong>{{ item.nombre }}</strong>
                <span>{{ item.descripcion || 'Sin descripcion registrada todavia.' }}</span>
              </div>
              <span class="status-badge" :class="item.activo ? 'activo' : 'inactivo'">
                {{ item.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <div v-if="currentCategory === 'principales'" class="service-data-grid">
              <div>
                <small>Duracion</small>
                <span>{{ primaryItem(item).duracion_minutos }} min</span>
              </div>
              <div>
                <small>Tarifas</small>
                <span>{{ formatPriceRange(item) }}</span>
              </div>
              <div>
                <small>Requiere tamano</small>
                <span>{{ formatBoolean(primaryItem(item).requiere_tamano) }}</span>
              </div>
              <div>
                <small>Requiere pelaje</small>
                <span>{{ formatBoolean(primaryItem(item).requiere_tipo_pelaje) }}</span>
              </div>
            </div>

            <div v-else class="service-data-grid">
              <div>
                <small>Categoria</small>
                <span>Servicio adicional</span>
              </div>
              <div>
                <small>Tarifas por talla</small>
                <span>{{ formatPriceRange(item) }}</span>
              </div>
              <div>
                <small>Configuracion</small>
                <span>Precio segun tamano</span>
              </div>
              <div>
                <small>Ultima actualizacion</small>
                <span>{{ formatDateTime(item.updated_at || item.created_at) }}</span>
              </div>
            </div>

            <div class="soft-chip-group">
              <template v-if="currentCategory === 'principales'">
                <span class="soft-chip">
                  Recargo por nudos: {{ formatBoolean(primaryItem(item).aplica_recargo_nudos) }}
                </span>
                <span class="soft-chip">
                  Recargo por comportamiento:
                  {{ formatBoolean(primaryItem(item).aplica_recargo_comportamiento) }}
                </span>
              </template>
              <span class="soft-chip">Actualizado: {{ formatDateTime(item.updated_at || item.created_at) }}</span>
            </div>

            <div class="service-footer">
              <button type="button" class="btn-secundario compact" @click="toggleServiceStatus(item, currentCategory)">
                {{ item.activo ? 'Desactivar' : 'Activar' }}
              </button>
              <button type="button" class="btn-secundario compact" @click="openServiceForEditing(item.id, currentCategory)">
                Editar
              </button>
              <button type="button" class="btn-enviar compact" @click="openServiceDetail(item.id, currentCategory)">
                Ver detalle
              </button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <h3>{{ emptyStateTitle }}</h3>
          <p>{{ emptyStateMessage }}</p>
        </div>
      </section>

      <div v-if="isCreateOpen" class="modal-overlay" @click.self="closeCreateModal">
        <section class="services-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="services-pill subtle">{{ createCategory === 'principales' ? 'Nuevo servicio fijo' : 'Nuevo servicio adicional' }}</span>
              <h2>{{ createCategory === 'principales' ? 'Crear servicio fijo' : 'Crear servicio adicional' }}</h2>
              <p class="modal-copy">
                {{
                  createCategory === 'principales'
                    ? 'Define la base del servicio y deja sus tarifas listas segun tamano y pelaje.'
                    : 'Configura el adicional y su precio segun la talla de la mascota.'
                }}
              </p>
            </div>
            <button type="button" class="modal-close" @click="closeCreateModal">x</button>
          </div>

          <article class="detail-card wide edit-card">
            <template v-if="createCategory === 'principales'">
              <div class="edit-grid">
                <label class="field-group"><span>Nombre</span><input v-model="primaryForm.nombre" type="text"></label>
                <label class="field-group"><span>Duracion en minutos</span><input v-model.number="primaryForm.duracion_minutos" type="number" min="1"></label>
                <label class="field-group full"><span>Descripcion</span><textarea v-model="primaryForm.descripcion" rows="3"></textarea></label>
              </div>

              <div class="toggle-grid">
                <label class="toggle-card"><input v-model="primaryForm.requiere_tamano" type="checkbox"> <span>Requiere tamano</span></label>
                <label class="toggle-card"><input v-model="primaryForm.requiere_tipo_pelaje" type="checkbox"> <span>Requiere tipo de pelaje</span></label>
                <label class="toggle-card"><input v-model="primaryForm.aplica_recargo_nudos" type="checkbox"> <span>Aplica recargo por nudos</span></label>
                <label class="toggle-card"><input v-model="primaryForm.aplica_recargo_comportamiento" type="checkbox"> <span>Aplica recargo por comportamiento</span></label>
                <label class="toggle-card"><input v-model="primaryForm.activo" type="checkbox"> <span>Servicio activo</span></label>
              </div>

              <div class="detail-section-head">
                <div>
                  <strong>Tarifas por tamano y pelaje</strong>
                  <small>Si un servicio no cambia por alguna condicion, puedes repetir el mismo precio en varias combinaciones.</small>
                </div>
              </div>
              <div class="tariff-grid">
                <label v-for="tariff in primaryForm.tarifas" :key="`${tariff.tamano}-${tariff.tipo_pelaje}`" class="field-group tariff-field">
                  <span>{{ formatSize(tariff.tamano) }} · {{ formatLabel(tariff.tipo_pelaje) }}</span>
                  <input v-model.number="tariff.precio_base" type="number" min="0" step="1000">
                </label>
              </div>
            </template>

            <template v-else>
              <div class="edit-grid">
                <label class="field-group"><span>Nombre</span><input v-model="additionalForm.nombre" type="text"></label>
                <label class="field-group"><span>Estado</span><select v-model="additionalForm.activo"><option :value="true">Activo</option><option :value="false">Inactivo</option></select></label>
                <label class="field-group full"><span>Descripcion</span><textarea v-model="additionalForm.descripcion" rows="3"></textarea></label>
              </div>

              <div class="detail-section-head">
                <div>
                  <strong>Tarifas por tamano</strong>
                  <small>Configura el valor del adicional segun la talla de la mascota.</small>
                </div>
              </div>
              <div class="tariff-grid compact-tariffs">
                <label v-for="tariff in additionalForm.tarifas" :key="tariff.tamano" class="field-group tariff-field">
                  <span>{{ formatSize(tariff.tamano) }}</span>
                  <input v-model.number="tariff.precio" type="number" min="0" step="1000">
                </label>
              </div>
            </template>
          </article>

          <div class="modal-actions">
            <button type="button" class="btn-enviar" :disabled="saving" @click="createService">
              {{ saving ? 'Guardando servicio...' : 'Crear registro' }}
            </button>
            <button type="button" class="btn-secundario" :disabled="saving" @click="closeCreateModal">Cancelar</button>
          </div>
        </section>
      </div>

      <div v-if="isDetailOpen" class="modal-overlay" @click.self="closeDetail">
        <section class="services-shell modal-card">
          <div class="modal-head">
            <div>
              <span class="services-pill subtle">{{ selectedServiceCategory === 'principales' ? 'Detalle de servicio fijo' : 'Detalle de servicio adicional' }}</span>
              <h2>{{ selectedService ? selectedService.nombre : 'Cargando servicio...' }}</h2>
              <p class="modal-copy">
                {{
                  selectedServiceCategory === 'principales'
                    ? 'Aqui administras la definicion base y las tarifas del servicio principal.'
                    : 'Aqui administras el adicional y su configuracion de precios por talla.'
                }}
              </p>
            </div>
            <button type="button" class="modal-close" @click="closeDetail">x</button>
          </div>

          <div v-if="detailLoading" class="empty-state compact"><p>Estamos cargando el detalle del servicio...</p></div>

          <template v-else-if="selectedService">
            <div class="detail-grid">
              <article class="detail-card"><strong>Nombre</strong><span>{{ selectedService.nombre }}</span><small>{{ selectedService.activo ? 'Registro activo' : 'Registro inactivo' }}</small></article>
              <article class="detail-card"><strong>Tarifas visibles</strong><span>{{ formatPriceRange(selectedService) }}</span><small>Ultima actualizacion: {{ formatDateTime(selectedService.updated_at || selectedService.created_at) }}</small></article>
              <article v-if="selectedServiceCategory === 'principales'" class="detail-card"><strong>Duracion</strong><span>{{ primaryDetail(selectedService).duracion_minutos }} minutos</span><small>Servicio principal configurable</small></article>
              <article class="detail-card wide"><strong>Descripcion</strong><span>{{ selectedService.descripcion || 'Sin descripcion registrada todavia.' }}</span></article>
            </div>

            <div v-if="selectedServiceCategory === 'principales'" class="summary-strip">
              <article class="mini-summary"><strong>{{ formatBoolean(primaryDetail(selectedService).requiere_tamano) }}</strong><span>Requiere tamano</span></article>
              <article class="mini-summary"><strong>{{ formatBoolean(primaryDetail(selectedService).requiere_tipo_pelaje) }}</strong><span>Requiere pelaje</span></article>
              <article class="mini-summary"><strong>{{ formatBoolean(primaryDetail(selectedService).aplica_recargo_nudos) }}</strong><span>Recargo por nudos</span></article>
              <article class="mini-summary"><strong>{{ formatBoolean(primaryDetail(selectedService).aplica_recargo_comportamiento) }}</strong><span>Recargo por comportamiento</span></article>
            </div>

            <article class="detail-card wide">
              <div class="detail-section-head">
                <div>
                  <strong>{{ selectedServiceCategory === 'principales' ? 'Tarifas por tamano y pelaje' : 'Tarifas por tamano' }}</strong>
                  <small>{{ selectedServiceCategory === 'principales' ? 'Configuracion base del servicio fijo.' : 'Configuracion base del adicional.' }}</small>
                </div>
              </div>
              <div v-if="selectedServiceCategory === 'principales'" class="tariff-grid">
                <div v-for="tariff in primaryDetail(selectedService).tarifas" :key="`${tariff.tamano}-${tariff.tipo_pelaje}`" class="tariff-preview">
                  <strong>{{ formatSize(tariff.tamano) }} · {{ formatLabel(tariff.tipo_pelaje) }}</strong>
                  <span>{{ formatCurrency(tariff.precio_base) }}</span>
                </div>
              </div>
              <div v-else class="tariff-grid compact-tariffs">
                <div v-for="tariff in additionalDetail(selectedService).tarifas" :key="tariff.tamano" class="tariff-preview">
                  <strong>{{ formatSize(tariff.tamano) }}</strong>
                  <span>{{ formatCurrency(tariff.precio) }}</span>
                </div>
              </div>
            </article>

            <article v-if="isEditing" class="detail-card wide edit-card">
              <div class="detail-section-head">
                <div>
                  <strong>Editar servicio</strong>
                  <small>Actualiza el catalogo y su logica tarifaria sin afectar el historial ya registrado.</small>
                </div>
              </div>

              <template v-if="selectedServiceCategory === 'principales'">
                <div class="edit-grid">
                  <label class="field-group"><span>Nombre</span><input v-model="primaryForm.nombre" type="text"></label>
                  <label class="field-group"><span>Duracion en minutos</span><input v-model.number="primaryForm.duracion_minutos" type="number" min="1"></label>
                  <label class="field-group full"><span>Descripcion</span><textarea v-model="primaryForm.descripcion" rows="3"></textarea></label>
                </div>
                <div class="toggle-grid">
                  <label class="toggle-card"><input v-model="primaryForm.requiere_tamano" type="checkbox"> <span>Requiere tamano</span></label>
                  <label class="toggle-card"><input v-model="primaryForm.requiere_tipo_pelaje" type="checkbox"> <span>Requiere tipo de pelaje</span></label>
                  <label class="toggle-card"><input v-model="primaryForm.aplica_recargo_nudos" type="checkbox"> <span>Aplica recargo por nudos</span></label>
                  <label class="toggle-card"><input v-model="primaryForm.aplica_recargo_comportamiento" type="checkbox"> <span>Aplica recargo por comportamiento</span></label>
                  <label class="toggle-card"><input v-model="primaryForm.activo" type="checkbox"> <span>Servicio activo</span></label>
                </div>
                <div class="tariff-grid">
                  <label v-for="tariff in primaryForm.tarifas" :key="`${tariff.tamano}-${tariff.tipo_pelaje}`" class="field-group tariff-field">
                    <span>{{ formatSize(tariff.tamano) }} · {{ formatLabel(tariff.tipo_pelaje) }}</span>
                    <input v-model.number="tariff.precio_base" type="number" min="0" step="1000">
                  </label>
                </div>
              </template>

              <template v-else>
                <div class="edit-grid">
                  <label class="field-group"><span>Nombre</span><input v-model="additionalForm.nombre" type="text"></label>
                  <label class="field-group"><span>Estado</span><select v-model="additionalForm.activo"><option :value="true">Activo</option><option :value="false">Inactivo</option></select></label>
                  <label class="field-group full"><span>Descripcion</span><textarea v-model="additionalForm.descripcion" rows="3"></textarea></label>
                </div>
                <div class="tariff-grid compact-tariffs">
                  <label v-for="tariff in additionalForm.tarifas" :key="tariff.tamano" class="field-group tariff-field">
                    <span>{{ formatSize(tariff.tamano) }}</span>
                    <input v-model.number="tariff.precio" type="number" min="0" step="1000">
                  </label>
                </div>
              </template>
            </article>

            <div class="modal-actions">
              <button v-if="!isEditing" type="button" class="btn-enviar" @click="startEditing">Editar servicio</button>
              <button v-if="isEditing" type="button" class="btn-enviar" :disabled="saving" @click="saveService">{{ saving ? 'Guardando cambios...' : 'Guardar cambios' }}</button>
              <button v-if="isEditing" type="button" class="btn-secundario" :disabled="saving" @click="cancelEditing">Cancelar edicion</button>
              <button type="button" class="btn-secundario" :disabled="saving" @click="toggleServiceStatus(selectedService, selectedServiceCategory)">
                {{ selectedService.activo ? 'Desactivar servicio' : 'Activar servicio' }}
              </button>
            </div>
          </template>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.admin-services-page { width: min(1440px, calc(100vw - 42px)); margin: 0 auto; padding: 28px 0 56px; }
.services-shell { background: rgba(255,255,255,.92); border-radius: 32px; border: 1px solid rgba(255,214,235,.95); box-shadow: 0 28px 70px rgba(204,115,174,.12); }
.state-card,.hero-card,.summary-card,.list-card,.modal-card { padding: 28px; }
.services-pill { display:inline-flex; padding:8px 14px; border-radius:999px; background:linear-gradient(135deg,#fff1f9 0%,#eefafe 100%); color:#9c0076; font-weight:700; font-size:.86rem; }
.services-pill.subtle { margin-bottom: 12px; }
.hero-card { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(380px,.9fr); gap:22px; }
.hero-card h1,.section-head h2,.modal-head h2 { margin:12px 0; color:#8f176e; }
.hero-copy p,.hero-note span,.state-card p,.empty-state p,.modal-copy,.service-data-grid small,.service-data-grid span,.detail-card span,.detail-card small,.mini-summary span,.tariff-preview span,.detail-section-head small { color:#6e5064; line-height:1.7; }
.hero-note,.summary-card,.service-card,.detail-card,.mini-summary,.toggle-card,.tariff-preview { background:linear-gradient(145deg,rgba(255,244,250,.96) 0%,rgba(255,255,255,.92) 52%,rgba(238,250,255,.95) 100%); border:1px solid rgba(243,209,230,.92); }
.hero-note,.detail-card,.toggle-card,.tariff-preview { border-radius:24px; }
.hero-note { margin-top:18px; padding:18px 20px; }
.hero-note strong,.summary-card strong,.service-card strong,.detail-card strong,.mini-summary strong,.tariff-preview strong { display:block; color:#9c0076; margin-bottom:6px; }
.hero-search { display:grid; gap:14px; align-content:start; }
.category-toggle { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.category-button,.btn-enviar,.btn-secundario { border:none; border-radius:999px; padding:14px 18px; font-family:'Montserrat',sans-serif; font-weight:700; cursor:pointer; }
.category-button,.btn-secundario { background:linear-gradient(135deg,#fff4fb 0%,#ffffff 100%); color:#8f176e; border:1px solid rgba(243,203,228,.9); box-shadow:0 10px 22px rgba(219,126,183,.1); }
.category-button.active,.btn-enviar { background:linear-gradient(135deg,var(--sp-primary-purple) 0%,var(--sp-primary-purple-deep) 100%); color:#fff; box-shadow:0 16px 30px var(--sp-primary-shadow); }
.btn-secundario.accent { background:linear-gradient(135deg,#eefafe 0%,#ffffff 100%); }
.btn-enviar.compact,.btn-secundario.compact { padding-inline:16px; }
.field-group { display:grid; gap:8px; }
.field-group span { color:#8f176e; font-weight:700; }
.field-group input,.field-group textarea,.field-group select { border-radius:18px; border:1px solid rgba(243,203,228,.9); padding:14px 16px; font:inherit; background:rgba(255,255,255,.95); color:#5b4256; }
.search-actions,.state-actions,.modal-actions,.service-head,.service-footer,.modal-head,.section-head { display:flex; gap:12px; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; }
.summary-grid { margin-top:24px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
.summary-card { border-radius:26px; }
.summary-value { display:block; margin-top:10px; font-size:1.85rem; font-weight:800; color:#4d2d47; }
.summary-card.mint .summary-value { color:#0b9f93; }
.summary-card.lavender .summary-value { color:#6d56b8; }
.summary-card.sky .summary-value { color:#2f67c8; }
.list-card { margin-top:24px; display:grid; gap:18px; }
.section-copy { color:#6e5064; font-weight:600; }
.services-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.service-card { border-radius:28px; padding:22px; display:grid; gap:16px; }
.status-badge,.soft-chip { display:inline-flex; align-items:center; justify-content:center; padding:9px 14px; border-radius:999px; font-weight:700; font-size:.84rem; }
.status-badge.activo { background:#e9fbf7; color:#0b9f93; }
.status-badge.inactivo { background:#fff1f4; color:#c33b74; }
.soft-chip-group { display:flex; flex-wrap:wrap; gap:8px; }
.soft-chip { background:#fff4fb; color:#8f176e; }
.service-data-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 16px; }
.service-data-grid small,.service-data-grid span { display:block; }
.service-data-grid small { color:#9c0076; font-weight:700; margin-bottom:2px; }
.empty-state { padding:28px; border-radius:24px; background:linear-gradient(145deg,rgba(255,247,251,.94) 0%,rgba(238,250,255,.92) 100%); border:1px solid rgba(243,209,230,.9); text-align:center; }
.empty-state.compact { padding:18px; }
.modal-overlay { position:fixed; inset:0; z-index:72; background:rgba(77,45,71,.26); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:24px; }
.modal-card { width:min(1220px,100%); max-height:min(90vh,960px); overflow-y:auto; }
.modal-close { width:48px; height:48px; border-radius:50%; border:none; cursor:pointer; font-size:1.8rem; line-height:1; background:linear-gradient(135deg,#fff4fb 0%,#eefafe 100%); color:#8f176e; }
.detail-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:18px; }
.detail-card { padding:18px; }
.detail-card.wide { grid-column:1 / -1; }
.summary-strip { margin-top:18px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
.mini-summary { border-radius:22px; padding:16px 18px; }
.edit-card { margin-top:18px; display:grid; gap:16px; }
.edit-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.edit-grid .full { grid-column:1 / -1; }
.toggle-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.toggle-card { padding:16px 18px; display:flex; gap:12px; align-items:center; color:#6e5064; font-weight:600; }
.toggle-card input { width:18px; height:18px; accent-color:#c1008f; }
.tariff-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.tariff-grid.compact-tariffs { grid-template-columns:repeat(2,minmax(0,1fr)); }
.tariff-field,.tariff-preview { padding:14px 16px; }
.toast-banner,.error-banner { margin:16px 0 0; padding:16px 18px; border-radius:20px; font-weight:600; }
.toast-banner { background:rgba(233,251,247,.94); border:1px solid rgba(115,214,177,.9); color:#0b8a77; }
.error-banner { background:rgba(255,240,245,.96); border:1px solid rgba(255,176,214,.96); color:#b33c70; }
@media (max-width:1260px) { .summary-grid,.summary-strip,.detail-grid,.tariff-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:1080px) { .hero-card,.services-grid,.toggle-grid,.category-toggle { grid-template-columns:1fr; } }
@media (max-width:760px) { .admin-services-page { width:min(100vw - 20px,100%); padding-top:12px; } .state-card,.hero-card,.summary-card,.list-card,.modal-card { padding:22px; border-radius:24px; } .summary-grid,.summary-strip,.detail-grid,.service-data-grid,.edit-grid,.tariff-grid,.tariff-grid.compact-tariffs { grid-template-columns:1fr; } .search-actions,.state-actions,.modal-actions,.service-head,.service-footer,.modal-head,.section-head { flex-direction:column; align-items:stretch; } }
</style>
