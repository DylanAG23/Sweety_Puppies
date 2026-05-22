<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet, apiPatch } from '@/lib/api'
import { logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'
import PetBreedSelect from '@/components/PetBreedSelect.vue'

type PetListItem = {
  id: string
  nombre: string
  raza: string | null
  tamano: string | null
  sexo: string | null
  edad: number | null
  tipo_pelaje: string | null
  comportamiento_habitual: string | null
  foto_mascota_url: string | null
  activo: boolean
  cliente_nombre: string | null
  cliente_apellido: string | null
  cliente_cedula: string | null
  cliente_email: string | null
  servicios_realizados: number
  citas_activas: number
  ultimo_servicio: string | null
}

type PetDetail = PetListItem & {
  cliente_id: string
  alergias: string | null
  enfermedades: string | null
  cosas_no_le_gustan: string | null
  fecha_ultimo_bano: string | null
  vacunacion_al_dia: boolean | null
  desparasitacion_interna_al_dia: boolean | null
  desparasitacion_externa_al_dia: boolean | null
  foto_carnet_vacunacion_url: string | null
  observaciones: string | null
  cliente_telefono: string | null
  cliente_telefono_secundario: string | null
  cliente_direccion: string | null
  cliente_activo: boolean
}

type PetHistoryItem = {
  id: string
  fecha_servicio: string
  servicio_principal_nombre: string | null
  servicios_adicionales_resumen: string | null
  resumen_servicio_realizado: string | null
  observaciones_finales: string | null
  recomendaciones: string | null
  precio_base: number | null
  precio_calculado: number | null
  precio_final: number | null
}

type PetsListResponse = { success: boolean; mascotas: PetListItem[]; search: string }
type PetDetailResponse = { success: boolean; mascota: PetDetail }
type PetHistoryResponse = { success: boolean; mascotaId: string; historial: PetHistoryItem[] }
type PetUpdateResponse = { success: boolean; message: string; mascota: PetDetail }
type BreedOption = { value: string; label: string; aliases?: string[] }
type BreedCatalogResponse = { success: boolean; razas: BreedOption[] }

const currentPath = window.location.pathname.toLowerCase()
const loading = ref(true)
const detailLoading = ref(false)
const historyLoading = ref(false)
const savingPet = ref(false)
const isEditingPet = ref(false)
const error = ref('')
const toast = ref('')
const searchTerm = ref('')
const appliedSearch = ref('')
const pets = ref<PetListItem[]>([])
const selectedPet = ref<PetDetail | null>(null)
const selectedHistory = ref<PetHistoryItem | null>(null)
const petHistory = ref<PetHistoryItem[]>([])
const isDetailOpen = ref(false)
const fallbackPetImage = '/img/mascota1.png'
const breedOptions = ref<BreedOption[]>([])
const petForm = ref({
  nombre: '',
  raza: '',
  tamano: '',
  sexo: '',
  edad: '',
  tipo_pelaje: '',
  comportamiento_habitual: '',
  alergias: '',
  enfermedades: '',
  cosas_no_le_gustan: '',
  fecha_ultimo_bano: '',
  vacunacion_al_dia: false,
  desparasitacion_interna_al_dia: false,
  desparasitacion_externa_al_dia: false,
  observaciones: '',
  activo: true,
})

const summaryCards = computed(() => [
  { label: 'Mascotas visibles', value: String(pets.value.length) },
  { label: 'Activas', value: String(pets.value.filter((item) => item.activo).length) },
  { label: 'Con citas realizadas', value: String(pets.value.filter((item) => Number(item.servicios_realizados || 0) > 0).length) },
  { label: 'Citas activas', value: String(pets.value.reduce((sum, item) => sum + Number(item.citas_activas || 0), 0)) },
])

onMounted(async () => {
  document.body.className = 'cliente-portal-body'
  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }
  await Promise.allSettled([loadBreedOptions(), loadPets()])
})

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function resolveBreedValue(value: string | null | undefined) {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue) return ''

  const option = breedOptions.value.find((breed) => {
    if (normalizeText(breed.value) === normalizedValue) return true
    if (normalizeText(breed.label) === normalizedValue) return true
    return (breed.aliases || []).some((alias) => normalizeText(alias) === normalizedValue)
  })

  return option?.value || String(value || '')
}

async function loadBreedOptions() {
  try {
    const data = await apiGet<BreedCatalogResponse>('/api/mascotas/catalogs/breeds')
    breedOptions.value = data.razas
  } catch (caughtError) {
    console.warn('No se pudo cargar el catalogo de razas:', caughtError)
  }
}

async function loadPets(search = appliedSearch.value) {
  loading.value = true
  error.value = ''
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    const data = await apiGet<PetsListResponse>(`/api/mascotas${query}`)
    pets.value = data.mascotas
    appliedSearch.value = data.search || search
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar las mascotas'
  } finally {
    loading.value = false
  }
}

async function applySearch() {
  await loadPets(searchTerm.value.trim())
}

async function clearSearch() {
  searchTerm.value = ''
  await loadPets('')
}

async function openPetDetail(petId: string) {
  detailLoading.value = true
  historyLoading.value = true
  error.value = ''
  selectedPet.value = null
  selectedHistory.value = null
  petHistory.value = []
  isDetailOpen.value = true
  isEditingPet.value = false
  try {
    const [detailData, historyData] = await Promise.all([
      apiGet<PetDetailResponse>(`/api/mascotas/${petId}`),
      apiGet<PetHistoryResponse>(`/api/mascotas/${petId}/historial`),
    ])
    selectedPet.value = detailData.mascota
    fillPetForm(detailData.mascota)
    petHistory.value = historyData.historial
    selectedHistory.value = historyData.historial[0] || null
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle de la mascota'
    closeDetail()
  } finally {
    detailLoading.value = false
    historyLoading.value = false
  }
}

function closeDetail() {
  isDetailOpen.value = false
  selectedPet.value = null
  selectedHistory.value = null
  petHistory.value = []
  isEditingPet.value = false
}

function selectHistoryEntry(entry: PetHistoryItem) {
  selectedHistory.value = entry
}

function fillPetForm(pet: PetDetail) {
  petForm.value = {
    nombre: pet.nombre || '',
    raza: resolveBreedValue(pet.raza),
    tamano: pet.tamano || '',
    sexo: pet.sexo || '',
    edad: pet.edad === null || pet.edad === undefined ? '' : String(pet.edad),
    tipo_pelaje: pet.tipo_pelaje || '',
    comportamiento_habitual: pet.comportamiento_habitual || '',
    alergias: pet.alergias || '',
    enfermedades: pet.enfermedades || '',
    cosas_no_le_gustan: pet.cosas_no_le_gustan || '',
    fecha_ultimo_bano: pet.fecha_ultimo_bano || '',
    vacunacion_al_dia: Boolean(pet.vacunacion_al_dia),
    desparasitacion_interna_al_dia: Boolean(pet.desparasitacion_interna_al_dia),
    desparasitacion_externa_al_dia: Boolean(pet.desparasitacion_externa_al_dia),
    observaciones: pet.observaciones || '',
    activo: pet.activo,
  }
}

function startPetEditing() {
  if (!selectedPet.value) {
    return
  }

  fillPetForm(selectedPet.value)
  isEditingPet.value = true
}

function cancelPetEditing() {
  if (selectedPet.value) {
    fillPetForm(selectedPet.value)
  }
  isEditingPet.value = false
}

function syncPetInList(updatedPet: PetDetail) {
  pets.value = pets.value.map((item) =>
    item.id === updatedPet.id
      ? {
          ...item,
          ...updatedPet,
        }
      : item
  )
}

async function savePet() {
  if (!selectedPet.value) {
    return
  }

  savingPet.value = true
  error.value = ''

  try {
    const payload = {
      ...petForm.value,
      edad: petForm.value.edad,
    }
    const data = await apiPatch<PetUpdateResponse>(`/api/mascotas/${selectedPet.value.id}`, payload)
    selectedPet.value = data.mascota
    fillPetForm(data.mascota)
    syncPetInList(data.mascota)
    isEditingPet.value = false
    showToast(data.message || 'Mascota actualizada correctamente')
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar la mascota'
  } finally {
    savingPet.value = false
  }
}

function showToast(message: string) {
  toast.value = message
  window.setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, 4200)
}

function formatDate(value: string | null) {
  if (!value) return 'Sin registro'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Sin registro'
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatLabel(value: string | null) {
  if (!value) return 'Sin dato'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatBoolean(value: boolean | null) {
  if (value === null || value === undefined) return 'Sin dato'
  return value ? 'Si' : 'No'
}
</script>

<template>
  <main class="admin-pets-page">
    <section v-if="loading" class="shell state-card">
      <h1>Cargando el modulo de mascotas...</h1>
      <p>Estamos preparando fichas completas, propietarios e historial operativo de cada peludito.</p>
    </section>

    <section v-else-if="error && !pets.length" class="shell state-card">
      <h1>No pudimos abrir Mascotas</h1>
      <p>{{ error }}</p>
      <div class="row-actions">
        <button type="button" class="btn light" @click="loadPets()">Intentar de nuevo</button>
        <button type="button" class="btn main" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="shell hero">
        <div>
          <span class="pill">Mascotas del sistema</span>
          <h1>Perfil completo de cada peludito</h1>
          <p>Consulta datos sanitarios, propietario, citas activas e historial real de citas realizadas desde un solo lugar.</p>
          <div class="hero-note">
            <strong>Busqueda operativa</strong>
            <span>Encuentra por nombre, raza, tamano, tipo de pelaje o por los datos del cliente propietario.</span>
          </div>
        </div>
        <aside class="search-panel">
          <label class="field">
            <span>Buscar mascota</span>
            <input v-model="searchTerm" type="search" placeholder="Lulu, criollo, pequeno, Dylan..." @keyup.enter="applySearch">
          </label>
          <div class="row-actions">
            <button type="button" class="btn main" @click="applySearch">Buscar</button>
            <button type="button" class="btn light" @click="clearSearch">Limpiar</button>
          </div>
        </aside>
      </section>

      <p v-if="toast" class="toast-banner">{{ toast }}</p>
      <p v-if="error" class="error-banner">{{ error }}</p>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="shell summary-card">
          <strong>{{ card.label }}</strong>
          <span class="summary-value">{{ card.value }}</span>
        </article>
      </section>

      <section class="shell list-card">
        <div class="section-head">
          <div>
            <span class="pill subtle">Listado principal</span>
            <h2>{{ appliedSearch ? `Resultados para "${appliedSearch}"` : 'Mascotas registradas' }}</h2>
          </div>
          <span class="section-copy">{{ pets.length }} {{ pets.length === 1 ? 'mascota visible' : 'mascotas visibles' }}</span>
        </div>

        <div v-if="pets.length" class="pet-list">
          <article v-for="item in pets" :key="item.id" class="pet-card">
            <img :src="item.foto_mascota_url || fallbackPetImage" :alt="item.nombre" class="pet-photo">
            <div class="pet-copy">
              <div class="pet-head">
                <div>
                  <strong>{{ item.nombre }}</strong>
                  <span>{{ item.raza || 'Raza por confirmar' }}</span>
                </div>
                <span class="badge" :class="item.activo ? 'ok' : 'off'">{{ item.activo ? 'Activa' : 'Inactiva' }}</span>
              </div>
              <div class="info-grid compact">
                <div><small>Tamano</small><span>{{ formatLabel(item.tamano) }}</span></div>
                <div><small>Pelaje</small><span>{{ formatLabel(item.tipo_pelaje) }}</span></div>
                <div><small>Propietario</small><span>{{ item.cliente_nombre }} {{ item.cliente_apellido }}</span></div>
                <div><small>Cédula</small><span>{{ item.cliente_cedula || 'Sin registro' }}</span></div>
              </div>
              <div class="pet-footer">
                <div class="chip-row">
                  <span class="chip">Citas realizadas: {{ item.servicios_realizados }}</span>
                  <span class="chip">Citas activas: {{ item.citas_activas }}</span>
                  <span class="chip">Ultima cita realizada: {{ formatDate(item.ultimo_servicio) }}</span>
                </div>
                <button type="button" class="btn main compact" @click="openPetDetail(item.id)">Ver detalle</button>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <h3>{{ appliedSearch ? 'No encontramos peluditos con esa búsqueda' : 'Aún no hay mascotas registradas' }}</h3>
          <p>{{ appliedSearch ? 'Prueba por nombre, raza, tamaño o datos del cliente.' : 'Cuando se registren mascotas desde el portal, aquí aparecerán sus fichas completas.' }}</p>
        </div>
      </section>

      <div v-if="isDetailOpen" class="modal-overlay" @click.self="closeDetail">
        <section class="shell modal-card">
          <div class="section-head">
            <div>
              <span class="pill subtle">Detalle de mascota</span>
              <h2>{{ selectedPet ? selectedPet.nombre : 'Cargando mascota...' }}</h2>
              <p class="section-copy">Revisa informacion general, sanitaria, propietario e historial del peludito.</p>
            </div>
            <button type="button" class="close-btn" @click="closeDetail">x</button>
          </div>

          <div v-if="detailLoading" class="empty-state compact-state">
            <p>Estamos cargando la ficha completa de la mascota...</p>
          </div>

          <template v-else-if="selectedPet">
            <div class="detail-top">
              <article class="detail-card profile">
                <img :src="selectedPet.foto_mascota_url || fallbackPetImage" :alt="selectedPet.nombre" class="detail-photo">
                <div>
                  <strong>{{ selectedPet.nombre }}</strong>
                  <span>{{ selectedPet.raza || 'Raza por confirmar' }}</span>
                  <small>{{ formatLabel(selectedPet.tamano) }} - {{ formatLabel(selectedPet.tipo_pelaje) }}</small>
                  <small>{{ formatLabel(selectedPet.comportamiento_habitual) }}</small>
                </div>
              </article>
              <article class="detail-card">
                <strong>Datos generales</strong>
                <span>Sexo: {{ formatLabel(selectedPet.sexo) }}</span>
                <small>Edad: {{ selectedPet.edad ?? 'Sin registro' }} {{ selectedPet.edad === 1 ? 'ano' : 'anos' }}</small>
                <small>Ultimo bano: {{ formatDate(selectedPet.fecha_ultimo_bano) }}</small>
              </article>
              <article class="detail-card">
                <strong>Estado sanitario</strong>
                <span>Vacunacion: {{ formatBoolean(selectedPet.vacunacion_al_dia) }}</span>
                <small>Desparasitacion interna: {{ formatBoolean(selectedPet.desparasitacion_interna_al_dia) }}</small>
                <small>Desparasitacion externa: {{ formatBoolean(selectedPet.desparasitacion_externa_al_dia) }}</small>
              </article>
              <article class="detail-card">
                <strong>Resumen operativo</strong>
                <span>Citas realizadas: {{ selectedPet.servicios_realizados }}</span>
                <small>Citas activas: {{ selectedPet.citas_activas }}</small>
                <small>Ultima cita realizada: {{ formatDate(selectedPet.ultimo_servicio) }}</small>
              </article>
            </div>

            <div class="detail-columns">
              <article class="detail-card">
                <strong>Informacion sanitaria y observaciones</strong>
                <div class="info-grid">
                  <div><small>Alergias</small><span>{{ selectedPet.alergias || 'No reportadas' }}</span></div>
                  <div><small>Enfermedades</small><span>{{ selectedPet.enfermedades || 'No reportadas' }}</span></div>
                  <div><small>No le gusta</small><span>{{ selectedPet.cosas_no_le_gustan || 'Sin observacion' }}</span></div>
                  <div><small>Observaciones</small><span>{{ selectedPet.observaciones || 'Sin observaciones adicionales' }}</span></div>
                </div>
              </article>

              <article class="detail-card">
                <strong>Cliente propietario</strong>
                <div class="info-grid">
                  <div><small>Nombre</small><span>{{ selectedPet.cliente_nombre }} {{ selectedPet.cliente_apellido }}</span></div>
                  <div><small>Cédula</small><span>{{ selectedPet.cliente_cedula || 'Sin registro' }}</span></div>
                  <div><small>Teléfono</small><span>{{ selectedPet.cliente_telefono || 'Sin registro' }}</span></div>
                  <div><small>Secundario</small><span>{{ selectedPet.cliente_telefono_secundario || 'Sin registro' }}</span></div>
                  <div><small>Correo</small><span>{{ selectedPet.cliente_email || 'Sin correo' }}</span></div>
                  <div><small>Dirección</small><span>{{ selectedPet.cliente_direccion || 'Aún no registrada' }}</span></div>
                </div>
              </article>
            </div>

            <div v-if="isEditingPet" class="detail-columns">
              <article class="detail-card">
                <strong>Editar mascota</strong>
                <div class="edit-grid">
                  <label class="field"><span>Nombre</span><input v-model="petForm.nombre" type="text"></label>
                  <PetBreedSelect
                    v-model="petForm.raza"
                    :options="breedOptions"
                    label="Raza"
                    placeholder="Busca una raza o selecciona Criollo"
                  />
                  <label class="field">
                    <span>Tamano</span>
                    <select v-model="petForm.tamano">
                      <option value="miniatura">Miniatura</option>
                      <option value="pequeno">Pequeno</option>
                      <option value="mediano">Mediano</option>
                      <option value="grande">Grande</option>
                      <option value="extra grande">Extra grande</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Sexo</span>
                    <select v-model="petForm.sexo">
                      <option value="macho">Macho</option>
                      <option value="hembra">Hembra</option>
                    </select>
                  </label>
                  <label class="field"><span>Edad</span><input v-model="petForm.edad" type="number" min="0"></label>
                  <label class="field">
                    <span>Tipo de pelaje</span>
                    <select v-model="petForm.tipo_pelaje">
                      <option value="corto">Corto</option>
                      <option value="largo">Largo</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Comportamiento</span>
                    <select v-model="petForm.comportamiento_habitual">
                      <option value="normal">Normal</option>
                      <option value="sensible">Sensible</option>
                      <option value="agresivo">Agresivo</option>
                    </select>
                  </label>
                  <label class="field"><span>Ultimo bano</span><input v-model="petForm.fecha_ultimo_bano" type="date"></label>
                  <label class="field full"><span>Alergias</span><textarea v-model="petForm.alergias" rows="2" /></label>
                  <label class="field full"><span>Enfermedades</span><textarea v-model="petForm.enfermedades" rows="2" /></label>
                  <label class="field full"><span>No le gusta</span><textarea v-model="petForm.cosas_no_le_gustan" rows="2" /></label>
                  <label class="field full"><span>Observaciones</span><textarea v-model="petForm.observaciones" rows="3" /></label>
                  <label class="field">
                    <span>Vacunacion</span>
                    <select v-model="petForm.vacunacion_al_dia">
                      <option :value="true">Si</option>
                      <option :value="false">No</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Desparas. interna</span>
                    <select v-model="petForm.desparasitacion_interna_al_dia">
                      <option :value="true">Si</option>
                      <option :value="false">No</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Desparas. externa</span>
                    <select v-model="petForm.desparasitacion_externa_al_dia">
                      <option :value="true">Si</option>
                      <option :value="false">No</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Estado</span>
                    <select v-model="petForm.activo">
                      <option :value="true">Activa</option>
                      <option :value="false">Inactiva</option>
                    </select>
                  </label>
                </div>
              </article>
            </div>

            <div class="detail-columns">
              <article class="detail-card">
                <strong>Imagenes de soporte</strong>
                <div class="media-grid">
                  <div>
                    <small>Foto principal</small>
                    <img :src="selectedPet.foto_mascota_url || fallbackPetImage" :alt="selectedPet.nombre" class="media-photo">
                  </div>
                  <div>
                    <small>Carnet de vacunacion</small>
                    <img v-if="selectedPet.foto_carnet_vacunacion_url" :src="selectedPet.foto_carnet_vacunacion_url" alt="Carnet" class="media-photo">
                    <div v-else class="empty-state compact-state"><p>Esta mascota no tiene carnet adjunto.</p></div>
                  </div>
                </div>
              </article>
            </div>

            <div class="detail-columns history-layout">
              <article class="detail-card">
                <strong>Historial de citas realizadas</strong>
                <div v-if="historyLoading" class="empty-state compact-state">
                  <p>Estamos consultando el historial de citas realizadas...</p>
                </div>
                <div v-else-if="petHistory.length" class="history-list">
                  <button v-for="entry in petHistory" :key="entry.id" type="button" class="history-item" :class="{ active: selectedHistory?.id === entry.id }" @click="selectHistoryEntry(entry)">
                    <div>
                      <strong>{{ formatDate(entry.fecha_servicio) }}</strong>
                      <span>{{ entry.servicio_principal_nombre || 'Cita por confirmar' }}</span>
                      <small>{{ formatCurrency(entry.precio_final || entry.precio_calculado || entry.precio_base) }}</small>
                    </div>
                    <span class="chip">{{ entry.id.slice(0, 8) }}</span>
                  </button>
                </div>
                <div v-else class="empty-state compact-state">
                  <p>Esta mascota aun no tiene historial de citas realizadas registrado.</p>
                </div>
              </article>

              <article class="detail-card">
                <strong>Detalle de la cita realizada</strong>
                <template v-if="selectedHistory">
                  <div class="info-grid">
                    <div><small>Fecha</small><span>{{ formatDate(selectedHistory.fecha_servicio) }}</span></div>
                    <div><small>Servicio principal</small><span>{{ selectedHistory.servicio_principal_nombre || 'Sin dato' }}</span></div>
                    <div><small>Adicionales</small><span>{{ selectedHistory.servicios_adicionales_resumen || 'Sin adicionales' }}</span></div>
                    <div><small>Resumen</small><span>{{ selectedHistory.resumen_servicio_realizado || 'Sin resumen' }}</span></div>
                    <div><small>Observaciones finales</small><span>{{ selectedHistory.observaciones_finales || 'Sin observaciones' }}</span></div>
                    <div><small>Recomendaciones</small><span>{{ selectedHistory.recomendaciones || 'Sin recomendaciones' }}</span></div>
                  </div>
                  <div class="price-row">
                    <div class="price-box"><small>Base</small><strong>{{ formatCurrency(selectedHistory.precio_base) }}</strong></div>
                    <div class="price-box"><small>Calculado</small><strong>{{ formatCurrency(selectedHistory.precio_calculado) }}</strong></div>
                    <div class="price-box"><small>Final</small><strong>{{ formatCurrency(selectedHistory.precio_final || selectedHistory.precio_calculado || selectedHistory.precio_base) }}</strong></div>
                  </div>
                </template>
                <div v-else class="empty-state compact-state">
                  <p>Selecciona una cita realizada del historial para ver su detalle completo.</p>
                </div>
              </article>
            </div>

            <div class="row-actions">
              <button
                v-if="!isEditingPet"
                type="button"
                class="btn main"
                @click="startPetEditing"
              >
                Editar mascota
              </button>
              <button
                v-if="isEditingPet"
                type="button"
                class="btn main"
                :disabled="savingPet"
                @click="savePet"
              >
                {{ savingPet ? 'Guardando cambios...' : 'Guardar cambios' }}
              </button>
              <button
                v-if="isEditingPet"
                type="button"
                class="btn light"
                :disabled="savingPet"
                @click="cancelPetEditing"
              >
                Cancelar edicion
              </button>
            </div>
          </template>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.admin-pets-page { width: min(1440px, calc(100vw - 42px)); margin: 0 auto; padding: 28px 0 56px; }
.shell { background: rgba(255,255,255,.92); border-radius: 32px; border: 1px solid rgba(255,214,235,.95); box-shadow: 0 28px 70px rgba(204,115,174,.12); }
.state-card,.hero,.summary-card,.list-card,.modal-card { padding: 28px; }
.pill { display:inline-flex; padding:8px 14px; border-radius:999px; background:linear-gradient(135deg,#fff1f9 0%,#eefafe 100%); color:#9c0076; font-weight:700; font-size:.86rem; }
.pill.subtle { margin-bottom: 12px; }
.hero,.detail-columns,.history-layout,.detail-top,.summary-grid,.info-grid,.price-row,.media-grid { display:grid; gap:16px; }
.hero { grid-template-columns: minmax(0,1.1fr) minmax(340px,.9fr); align-items:start; }
.summary-grid { margin-top:24px; grid-template-columns: repeat(4,minmax(0,1fr)); }
.summary-card,.pet-card,.detail-card,.history-item,.price-box,.hero-note { background:linear-gradient(145deg,rgba(255,244,250,.96) 0%,rgba(255,255,255,.92) 52%,rgba(238,250,255,.95) 100%); border:1px solid rgba(243,209,230,.92); border-radius:24px; }
.summary-value { display:block; margin-top:10px; font-size:1.85rem; font-weight:800; color:#4d2d47; }
.row-actions,.chip-row { display:flex; gap:12px; flex-wrap:wrap; }
.search-panel { display:grid; gap:14px; align-content:start; }
.hero-note { margin-top:18px; padding:18px 20px; }
.hero-note strong { display:block; color:#9c0076; margin-bottom:6px; }
.field { display:grid; gap:8px; }
.field span,.info-grid small { color:#8f176e; font-weight:700; }
.field input { border-radius:18px; border:1px solid rgba(243,203,228,.9); padding:14px 16px; font:inherit; background:rgba(255,255,255,.95); color:#5b4256; }
.field select,.field textarea { border-radius:18px; border:1px solid rgba(243,203,228,.9); padding:14px 16px; font:inherit; background:rgba(255,255,255,.95); color:#5b4256; }
.btn { border:none; border-radius:999px; padding:14px 18px; font-family:'Montserrat',sans-serif; font-weight:700; cursor:pointer; }
.btn.light { background:linear-gradient(135deg,#fff4fb 0%,#ffffff 100%); color:#8f176e; border:1px solid rgba(243,203,228,.9); box-shadow:0 10px 22px rgba(219,126,183,.1); }
.btn.main { background:linear-gradient(135deg,var(--sp-primary-purple) 0%,var(--sp-primary-purple-deep) 100%); color:#fff; box-shadow:0 16px 30px var(--sp-primary-shadow); }
.btn.compact { padding-inline:16px; }
.search-panel .row-actions {
  align-items: center;
}
.search-panel .btn {
  min-width: 190px;
  justify-content: center;
}
.hero > * {
  align-self: start;
}
.hero h1,
.hero p {
  margin-bottom: 0;
}
.list-card { margin-top:24px; display:grid; gap:18px; }
.section-head,.pet-head,.pet-footer { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
.section-copy,.hero p,.hero-note span,.pet-copy span,.detail-card span,.detail-card small,.history-item span,.history-item small,.empty-state p { color:#6e5064; line-height:1.7; }
.pet-list,.history-list { display:grid; gap:16px; }
.pet-card { padding:22px; display:grid; grid-template-columns:auto 1fr; gap:18px; }
.pet-copy { display:grid; gap:14px; }
.pet-photo,.detail-photo,.media-photo { object-fit:cover; border-radius:24px; border:1px solid rgba(243,203,228,.9); }
.pet-photo { width:120px; height:120px; }
.detail-photo { width:110px; height:110px; }
.media-photo { width:100%; height:220px; }
.info-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
.info-grid span,.info-grid small { display:block; }
.info-grid.compact { gap:10px 16px; }
.badge,.chip { display:inline-flex; align-items:center; justify-content:center; padding:9px 14px; border-radius:999px; font-weight:700; font-size:.84rem; }
.badge.ok { background:#e9fbf7; color:#0b9f93; }
.badge.off { background:#fff1f4; color:#c33b74; }
.chip { background:#fff4fb; color:#8f176e; }
.empty-state { padding:28px; border-radius:24px; background:linear-gradient(145deg,rgba(255,247,251,.94) 0%,rgba(238,250,255,.92) 100%); border:1px solid rgba(243,209,230,.9); text-align:center; }
.compact-state { padding:18px; }
.modal-overlay { position:fixed; inset:0; z-index:72; background:rgba(77,45,71,.26); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:24px; }
.modal-card { width:min(1280px,100%); max-height:min(90vh,960px); overflow-y:auto; }
.close-btn { width:48px; height:48px; border-radius:50%; border:none; cursor:pointer; font-size:1.8rem; line-height:1; background:linear-gradient(135deg,#fff4fb 0%,#eefafe 100%); color:#8f176e; }
.detail-top { margin-top:18px; grid-template-columns: repeat(4,minmax(0,1fr)); }
.profile { display:flex; gap:16px; align-items:center; }
.detail-card { padding:18px; display:grid; gap:12px; }
.media-grid,.price-row { grid-template-columns: repeat(2,minmax(0,1fr)); }
.history-layout { grid-template-columns: minmax(0,.95fr) minmax(0,1.05fr); }
.edit-grid { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:14px; }
.edit-grid .full { grid-column: 1 / -1; }
.history-item { padding:16px; text-align:left; cursor:pointer; display:flex; justify-content:space-between; gap:14px; align-items:center; }
.history-item.active { box-shadow:0 18px 28px rgba(233,90,219,.18); border-color:rgba(225,118,198,.88); }
.price-box { padding:16px 18px; }
.toast-banner,.error-banner { margin:16px 0 0; padding:16px 18px; border-radius:20px; font-weight:600; }
.toast-banner { background:rgba(233,251,247,.94); border:1px solid rgba(115,214,177,.9); color:#0b8a77; }
.error-banner { background:rgba(255,240,245,.96); border:1px solid rgba(255,176,214,.96); color:#b33c70; }
@media (max-width:1260px){ .summary-grid,.detail-top,.history-layout,.media-grid,.price-row{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:1080px){ .hero,.pet-card,.history-layout{ grid-template-columns:1fr; } }
@media (max-width:760px){
  .admin-pets-page{ width:min(100vw - 20px,100%); padding-top:12px; }
  .state-card,.hero,.summary-card,.list-card,.modal-card{ padding:22px; border-radius:24px; }
  .summary-grid,.detail-top,.info-grid,.media-grid,.price-row,.edit-grid{ grid-template-columns:1fr; }
  .section-head,.pet-head,.pet-footer,.row-actions,.profile,.history-item{ flex-direction:column; align-items:stretch; display:flex; }
  .search-panel .btn {
    width: 100%;
    min-width: 0;
  }
}
</style>
