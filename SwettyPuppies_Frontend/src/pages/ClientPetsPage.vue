<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { apiDelete, apiForm, apiGet, apiPatch } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import ClientSiteHeader from '@/components/ClientSiteHeader.vue'

type Pet = {
  id: string
  cliente_id: string
  nombre: string
  raza: string | null
  tamano: string
  sexo: string | null
  edad: number
  tipo_pelaje: string
  comportamiento_habitual: string
  alergias: string | null
  enfermedades: string | null
  cosas_no_le_gustan: string | null
  fecha_ultimo_bano: string | null
  vacunacion_al_dia: boolean
  desparasitacion_interna_al_dia: boolean
  desparasitacion_externa_al_dia: boolean
  foto_mascota_url: string | null
  foto_carnet_vacunacion_url: string | null
  observaciones: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

type PetsResponse = {
  success: boolean
  mascotas: Pet[]
}

type PetResponse = {
  success: boolean
  message?: string
  mascota: Pet
}

const fallbackPetImage = '/img/mascota1.png'
const currentPath = window.location.pathname.toLowerCase()
const todayDate = new Date().toISOString().split('T')[0]

const tamanoOptions = [
  { value: 'miniatura', label: 'Miniatura' },
  { value: 'pequeño', label: 'Pequeño' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande', label: 'Grande' },
  { value: 'extra grande', label: 'Extra grande' },
]

const pelajeOptions = [
  { value: 'corto', label: 'Corto' },
  { value: 'largo', label: 'Largo' },
]

const comportamientoOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'sensible', label: 'Sensible' },
  { value: 'agresivo', label: 'Agresivo' },
]

const sexoOptions = [
  { value: '', label: 'Prefiero no indicar' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
]

const yesNoOptions = [
  { value: 'true', label: 'Si' },
  { value: 'false', label: 'No' },
]

const loading = ref(true)
const saving = ref(false)
const removingId = ref('')
const deletingId = ref('')
const error = ref('')
const toast = ref('')
const modalMode = ref<'create' | 'edit'>('create')
const isCreateFormExpanded = ref(false)
const isEditFormOpen = ref(false)
const isDetailOpen = ref(false)
const isConfirmDialogOpen = ref(false)
const mascotas = ref<Pet[]>([])
const selectedPet = ref<Pet | null>(null)
const previewMascotaUrl = ref('')
const previewCarnetUrl = ref('')
const confirmDialog = reactive({
  mode: 'status' as 'status' | 'delete',
  petId: '',
  petName: '',
  title: '',
  message: '',
  confirmLabel: '',
  tone: 'soft' as 'soft' | 'danger',
  nextActiveState: false,
})

const form = reactive({
  id: '',
  nombre: '',
  raza: '',
  tamano: '',
  sexo: '',
  edad: '',
  tipo_pelaje: '',
  comportamiento_habitual: '',
  tiene_alergias: 'false',
  alergias: '',
  tiene_enfermedades: 'false',
  enfermedades: '',
  cosas_no_le_gustan: '',
  fecha_ultimo_bano: '',
  vacunacion_al_dia: 'false',
  desparasitacion_interna_al_dia: 'false',
  desparasitacion_externa_al_dia: 'false',
  observaciones: '',
  fotoMascota: null as File | null,
  fotoCarnet: null as File | null,
})

const activePetsCount = computed(() => mascotas.value.filter((pet) => pet.activo).length)

const pageTitle = computed(() =>
  activePetsCount.value
    ? 'Tus mascotas siempre visibles, ordenadas y listas para sus cuidados'
    : 'Todavia no hay peluditos registrados en tu portal'
)

const modalTitle = computed(() =>
  modalMode.value === 'create' ? 'Registrar nueva mascota' : 'Editar informacion de tu mascota'
)

const modalSubmitText = computed(() =>
  saving.value ? 'Guardando...' : modalMode.value === 'create' ? 'Registrar mascota' : 'Guardar cambios'
)

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('cliente')
  if (!session) {
    loading.value = false
    return
  }

  await loadPets()

  if (window.location.pathname.toLowerCase() === '/cliente/mascotas/nueva') {
    openCreateSection()
  }
})

async function loadPets() {
  loading.value = true
  error.value = ''

  try {
    const data = await apiGet<PetsResponse>('/api/cliente/mascotas')
    mascotas.value = data.mascotas
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar tus mascotas'
  } finally {
    loading.value = false
  }
}

function openCreateSection() {
  resetForm()
  modalMode.value = 'create'
  isCreateFormExpanded.value = true
}

function closeCreateSection() {
  isCreateFormExpanded.value = false
}

function openEditModal(pet: Pet) {
  resetForm()
  modalMode.value = 'edit'
  form.id = pet.id
  form.nombre = pet.nombre
  form.raza = pet.raza || ''
  form.tamano = pet.tamano
  form.sexo = pet.sexo || ''
  form.edad = String(pet.edad)
  form.tipo_pelaje = pet.tipo_pelaje
  form.comportamiento_habitual = pet.comportamiento_habitual
  form.tiene_alergias = pet.alergias ? 'true' : 'false'
  form.alergias = pet.alergias || ''
  form.tiene_enfermedades = pet.enfermedades ? 'true' : 'false'
  form.enfermedades = pet.enfermedades || ''
  form.cosas_no_le_gustan = pet.cosas_no_le_gustan || ''
  form.fecha_ultimo_bano = pet.fecha_ultimo_bano || ''
  form.vacunacion_al_dia = String(pet.vacunacion_al_dia)
  form.desparasitacion_interna_al_dia = String(pet.desparasitacion_interna_al_dia)
  form.desparasitacion_externa_al_dia = String(pet.desparasitacion_externa_al_dia)
  form.observaciones = pet.observaciones || ''
  previewMascotaUrl.value = pet.foto_mascota_url || ''
  previewCarnetUrl.value = pet.foto_carnet_vacunacion_url || ''
  isEditFormOpen.value = true
}

async function openDetailModal(pet: Pet) {
  selectedPet.value = pet
  isDetailOpen.value = true

  try {
    const data = await apiGet<PetResponse>(`/api/cliente/mascotas/${pet.id}`)
    selectedPet.value = data.mascota
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo refrescar el detalle'
  }
}

function closeEditModal() {
  isEditFormOpen.value = false
}

function closeDetailModal() {
  isDetailOpen.value = false
  selectedPet.value = null
}

function resetForm() {
  form.id = ''
  form.nombre = ''
  form.raza = ''
  form.tamano = ''
  form.sexo = ''
  form.edad = ''
  form.tipo_pelaje = ''
  form.comportamiento_habitual = ''
  form.tiene_alergias = 'false'
  form.alergias = ''
  form.tiene_enfermedades = 'false'
  form.enfermedades = ''
  form.cosas_no_le_gustan = ''
  form.fecha_ultimo_bano = ''
  form.vacunacion_al_dia = 'false'
  form.desparasitacion_interna_al_dia = 'false'
  form.desparasitacion_externa_al_dia = 'false'
  form.observaciones = ''
  form.fotoMascota = null
  form.fotoCarnet = null
  previewMascotaUrl.value = ''
  previewCarnetUrl.value = ''
  error.value = ''
  toast.value = ''
}

function onFileChange(event: Event, target: 'fotoMascota' | 'fotoCarnet') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null

  if (target === 'fotoMascota') {
    form.fotoMascota = file
    previewMascotaUrl.value = file ? URL.createObjectURL(file) : previewMascotaUrl.value
  } else {
    form.fotoCarnet = file
    previewCarnetUrl.value = file ? URL.createObjectURL(file) : previewCarnetUrl.value
  }
}

function sanitizeAgeInput(event: Event) {
  const input = event.target as HTMLInputElement
  const sanitizedValue = input.value.replace(/[^\d]/g, '')
  form.edad = sanitizedValue
}

function validateForm() {
  if (!form.nombre.trim()) {
    return 'El nombre de la mascota es obligatorio'
  }

  if (!form.tamano) {
    return 'Debes seleccionar el tamaño'
  }

  if (!form.edad.trim() || Number(form.edad) < 0) {
    return 'La edad debe ser un numero mayor o igual a cero'
  }

  if (!form.tipo_pelaje) {
    return 'Debes seleccionar el tipo de pelaje'
  }

  if (!form.comportamiento_habitual) {
    return 'Debes seleccionar el comportamiento habitual'
  }

  if (form.tiene_alergias === 'true' && !form.alergias.trim()) {
    return 'Debes especificar cuales alergias tiene tu mascota'
  }

  if (form.tiene_enfermedades === 'true' && !form.enfermedades.trim()) {
    return 'Debes especificar cuales enfermedades tiene tu mascota'
  }

  if (form.fecha_ultimo_bano && form.fecha_ultimo_bano > todayDate) {
    return 'La fecha del ultimo baño no puede ser posterior a hoy'
  }

  return ''
}

async function submitPet() {
  const validationMessage = validateForm()

  if (validationMessage) {
    error.value = validationMessage
    return
  }

  saving.value = true
  error.value = ''
  toast.value = ''

  try {
    const payload = new FormData()
    payload.append('nombre', form.nombre.trim())
    payload.append('raza', form.raza.trim())
    payload.append('tamano', form.tamano)
    payload.append('sexo', form.sexo)
    payload.append('edad', String(Number(form.edad)))
    payload.append('tipo_pelaje', form.tipo_pelaje)
    payload.append('comportamiento_habitual', form.comportamiento_habitual)
    payload.append('alergias', form.tiene_alergias === 'true' ? form.alergias.trim() : '')
    payload.append('enfermedades', form.tiene_enfermedades === 'true' ? form.enfermedades.trim() : '')
    payload.append('cosas_no_le_gustan', form.cosas_no_le_gustan.trim())
    payload.append('fecha_ultimo_bano', form.fecha_ultimo_bano)
    payload.append('vacunacion_al_dia', form.vacunacion_al_dia)
    payload.append('desparasitacion_interna_al_dia', form.desparasitacion_interna_al_dia)
    payload.append('desparasitacion_externa_al_dia', form.desparasitacion_externa_al_dia)
    payload.append('observaciones', form.observaciones.trim())

    if (form.fotoMascota) {
      payload.append('fotoMascota', form.fotoMascota)
    }

    if (form.fotoCarnet) {
      payload.append('fotoCarnet', form.fotoCarnet)
    }

    const data =
      modalMode.value === 'create'
        ? await apiForm<PetResponse>('/api/cliente/mascotas', 'POST', payload)
        : await apiForm<PetResponse>(`/api/cliente/mascotas/${form.id}`, 'PATCH', payload)

    toast.value = data.message || (modalMode.value === 'create' ? 'Mascota registrada' : 'Mascota actualizada')

    if (modalMode.value === 'create') {
      mascotas.value = [data.mascota, ...mascotas.value.filter((pet) => pet.id !== data.mascota.id)]
    } else {
      mascotas.value = mascotas.value.map((pet) => (pet.id === data.mascota.id ? data.mascota : pet))
    }

    if (modalMode.value === 'create') {
      closeCreateSection()
    } else {
      closeEditModal()
    }

    try {
      await loadPets()
    } catch {
      // Si la mascota ya fue creada/actualizada, mantenemos el estado local para no romper la experiencia.
    }
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo guardar la mascota'
  } finally {
    saving.value = false
  }
}

async function deactivatePet(pet: Pet) {
  if (!window.confirm(`¿Quieres desactivar a ${pet.nombre}?`)) {
    return
  }

  removingId.value = pet.id
  error.value = ''

  try {
    const data = await apiDelete<{ success: boolean; message: string }>(`/api/cliente/mascotas/${pet.id}`)
    toast.value = data.message
    await loadPets()
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo desactivar la mascota'
  } finally {
    removingId.value = ''
  }
}

function petImage(url: string | null) {
  return url || fallbackPetImage
}

async function togglePetStatus(pet: Pet) {
  const nextActiveState = !pet.activo
  const actionText = nextActiveState ? 'activar' : 'desactivar'

  if (!window.confirm(`Deseas ${actionText} a ${pet.nombre}?`)) {
    return
  }

  removingId.value = pet.id
  error.value = ''

  try {
    const data = await apiPatch<PetResponse>(`/api/cliente/mascotas/${pet.id}/status`, {
      activo: nextActiveState,
    })
    toast.value = data.message || (nextActiveState ? 'Mascota activada correctamente' : 'Mascota desactivada correctamente')
    mascotas.value = mascotas.value.map((item) => (item.id === data.mascota.id ? data.mascota : item))
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el estado de la mascota'
  } finally {
    removingId.value = ''
  }
}

async function deletePet(pet: Pet) {
  if (!window.confirm(`Estas segura de eliminar a ${pet.nombre}? Esta accion no se puede deshacer.`)) {
    return
  }

  deletingId.value = pet.id
  error.value = ''

  try {
    const data = await apiDelete<{ success: boolean; message: string }>(`/api/cliente/mascotas/${pet.id}`)
    toast.value = data.message || 'Mascota eliminada correctamente'
    mascotas.value = mascotas.value.filter((item) => item.id !== pet.id)

    if (selectedPet.value?.id === pet.id) {
      closeDetailModal()
    }

    if (isEditFormOpen.value && form.id === pet.id) {
      closeEditModal()
    }
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar la mascota'
  } finally {
    deletingId.value = ''
  }
}

function requestTogglePetStatus(pet: Pet) {
  const nextActiveState = !pet.activo
  confirmDialog.mode = 'status'
  confirmDialog.petId = pet.id
  confirmDialog.petName = pet.nombre
  confirmDialog.title = nextActiveState ? 'Activar mascota' : 'Desactivar mascota'
  confirmDialog.message = nextActiveState
    ? `¿Deseas volver a activar a ${pet.nombre} para que aparezca disponible en tu portal?`
    : `¿Deseas desactivar a ${pet.nombre}? Seguirá guardada, pero quedará inactiva hasta que la vuelvas a activar.`
  confirmDialog.confirmLabel = nextActiveState ? 'Sí, activar' : 'Sí, desactivar'
  confirmDialog.tone = 'soft'
  confirmDialog.nextActiveState = nextActiveState
  isConfirmDialogOpen.value = true
}

function requestDeletePet(pet: Pet) {
  confirmDialog.mode = 'delete'
  confirmDialog.petId = pet.id
  confirmDialog.petName = pet.nombre
  confirmDialog.title = 'Eliminar mascota'
  confirmDialog.message = `¿Estas segura de eliminar a ${pet.nombre}? Esta accion no se puede deshacer.`
  confirmDialog.confirmLabel = 'Sí, eliminar'
  confirmDialog.tone = 'danger'
  confirmDialog.nextActiveState = false
  isConfirmDialogOpen.value = true
}

function closeConfirmDialog() {
  isConfirmDialogOpen.value = false
}

async function confirmDialogAction() {
  const pet = mascotas.value.find((item) => item.id === confirmDialog.petId) || selectedPet.value
  if (!pet) {
    closeConfirmDialog()
    return
  }

  if (confirmDialog.mode === 'delete') {
    const originalConfirm = window.confirm
    window.confirm = () => true
    try {
      await deletePet(pet)
    } finally {
      window.confirm = originalConfirm
    }
  } else {
    const originalConfirm = window.confirm
    window.confirm = () => true
    try {
      await togglePetStatus(pet)
      if (selectedPet.value?.id === pet.id) {
        const updatedPet = mascotas.value.find((item) => item.id === pet.id)
        if (updatedPet) {
          selectedPet.value = updatedPet
        }
      }
    } finally {
      window.confirm = originalConfirm
    }
  }

  closeConfirmDialog()
}

function formatLabel(value: string | null) {
  if (!value) {
    return 'No registrado'
  }

  if (value === 'pequeno') {
    return 'Pequeño'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatBoolean(value: boolean) {
  return value ? 'Si' : 'No'
}

function statusLabel(active: boolean) {
  return active ? 'Activa' : 'Desactivada'
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No registrada'
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return 'No registrada'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'No registrada'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'No registrada'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function goTo(path: string) {
  navigateTo(path)
}
</script>

<template>
  <main class="pets-page">
    <section v-if="loading" class="pets-shell pets-state-card">
      <h1>Cargando tus peluditos...</h1>
      <p>Estamos preparando sus fichas con mucho carino.</p>
    </section>

    <section v-else-if="error && !mascotas.length" class="pets-shell pets-state-card">
      <h1>No pudimos abrir Mis Mascotas</h1>
      <p>{{ error }}</p>
      <div class="pets-actions-row">
        <a href="/cliente" class="btn-secundario" @click.prevent="goTo('/cliente')">Ir a inicio</a>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else>
      <ClientSiteHeader :current-path="currentPath" />

      <section class="pets-shell pets-hero">
        <span class="pets-pill">Mis mascotas</span>
        <h1>{{ pageTitle }}</h1>
        <p>
          En este espacio podras registrar, ver y editar la informacion importante de cada mascota
          con una experiencia linda, clara y pensada para su bienestar.
        </p>
        <div class="hero-inline-actions">
          <button
            type="button"
            class="btn-enviar hero-register-button"
            @click="isCreateFormExpanded ? closeCreateSection() : openCreateSection()"
          >
            {{ isCreateFormExpanded ? 'Ocultar formulario' : 'Registrar nueva mascota' }}
          </button>
        </div>
      </section>

      <p v-if="toast" class="pets-feedback success">{{ toast }}</p>
      <p v-if="error && mascotas.length" class="pets-feedback error">{{ error }}</p>

      <section v-if="isCreateFormExpanded" class="pets-shell create-form-panel">
        <div class="create-panel-head">
          <div>
            <span class="pets-pill">Nueva mascota</span>
            <h2>Registra a tu peludito</h2>
          </div>
          <button type="button" class="btn-secundario" @click="closeCreateSection">Cerrar formulario</button>
        </div>

        <form class="pets-form" @submit.prevent="submitPet">
          <div class="field-grid">
            <label class="field-block">
              <span>Nombre *</span>
              <input v-model.trim="form.nombre" type="text" maxlength="80" placeholder="Ejemplo: Lulu">
            </label>

            <label class="field-block">
              <span>Raza</span>
              <input v-model.trim="form.raza" type="text" maxlength="80" placeholder="Ejemplo: Shih Tzu">
            </label>

            <label class="field-block">
              <span>Tamaño *</span>
              <select v-model="form.tamano">
                <option value="">Selecciona</option>
                <option v-for="option in tamanoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Sexo</span>
              <select v-model="form.sexo">
                <option v-for="option in sexoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Edad (años) *</span>
              <input
                v-model="form.edad"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                placeholder="0"
                @input="sanitizeAgeInput"
              >
            </label>

            <label class="field-block">
              <span>Tipo de pelaje *</span>
              <select v-model="form.tipo_pelaje">
                <option value="">Selecciona</option>
                <option v-for="option in pelajeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Comportamiento habitual *</span>
              <select v-model="form.comportamiento_habitual">
                <option value="">Selecciona</option>
                <option v-for="option in comportamientoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Fecha del ultimo baño</span>
              <input v-model="form.fecha_ultimo_bano" type="date" :max="todayDate">
            </label>

            <label class="field-block">
              <span>Vacunacion al dia</span>
              <select v-model="form.vacunacion_al_dia">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Desparasitacion interna al dia</span>
              <select v-model="form.desparasitacion_interna_al_dia">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Desparasitacion externa al dia</span>
              <select v-model="form.desparasitacion_externa_al_dia">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="field-grid">
            <label class="field-block">
              <span>¿Tiene alergias?</span>
              <select v-model="form.tiene_alergias">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>¿Tiene enfermedades?</span>
              <select v-model="form.tiene_enfermedades">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Especifica las alergias</span>
              <textarea
                v-model.trim="form.alergias"
                rows="3"
                maxlength="240"
                :disabled="form.tiene_alergias !== 'true'"
                :placeholder="form.tiene_alergias === 'true' ? 'Describe las alergias' : 'Selecciona Sí para habilitar este campo'"
              />
            </label>

            <label class="field-block">
              <span>Especifica las enfermedades</span>
              <textarea
                v-model.trim="form.enfermedades"
                rows="3"
                maxlength="240"
                :disabled="form.tiene_enfermedades !== 'true'"
                :placeholder="form.tiene_enfermedades === 'true' ? 'Describe las enfermedades' : 'Selecciona Sí para habilitar este campo'"
              />
            </label>

            <label class="field-block">
              <span>Cosas que no le gustan</span>
              <textarea v-model.trim="form.cosas_no_le_gustan" rows="3" maxlength="240" />
            </label>

            <label class="field-block">
              <span>Observaciones</span>
              <textarea v-model.trim="form.observaciones" rows="3" maxlength="300" />
            </label>
          </div>

          <div class="upload-grid">
            <label class="upload-card">
              <span>Foto de la mascota</span>
              <input type="file" accept="image/*" @change="onFileChange($event, 'fotoMascota')">
              <img :src="previewMascotaUrl || fallbackPetImage" alt="Vista previa mascota" class="upload-preview">
            </label>

            <label class="upload-card">
              <span>Foto del carnet de vacunacion</span>
              <input type="file" accept="image/*" @change="onFileChange($event, 'fotoCarnet')">
              <div v-if="previewCarnetUrl" class="carnet-preview-wrap">
                <img :src="previewCarnetUrl" alt="Vista previa carnet" class="upload-preview">
              </div>
              <div v-else class="carnet-empty">Opcional</div>
            </label>
          </div>

          <p v-if="error" class="pets-feedback error">{{ error }}</p>

          <div class="pets-actions-row modal-actions">
            <button type="button" class="btn-secundario" @click="closeCreateSection">Cancelar</button>
            <button type="submit" class="btn-enviar" :disabled="saving">{{ modalSubmitText }}</button>
          </div>
        </form>
      </section>

      <section v-else class="pets-grid">
        <article v-for="pet in mascotas" :key="pet.id" class="pets-shell pet-card" :class="{ inactive: !pet.activo }">
          <div class="pet-photo-wrap">
            <img :src="petImage(pet.foto_mascota_url)" :alt="pet.nombre" class="pet-photo">
          </div>

          <div class="pet-card-copy">
            <div class="pet-card-head">
              <div>
                <h2>{{ pet.nombre }}</h2>
                <p>{{ pet.raza || 'Raza por confirmar' }}</p>
              </div>
              <div class="pet-card-badges">
                <span class="pet-chip pet-status-chip" :class="{ inactive: !pet.activo }">{{ statusLabel(pet.activo) }}</span>
                <span class="pet-chip">{{ formatLabel(pet.tamano) }}</span>
              </div>
            </div>

            <div class="pet-mini-grid">
              <div>
                <strong>Pelaje</strong>
                <span>{{ formatLabel(pet.tipo_pelaje) }}</span>
              </div>
              <div>
                <strong>Comportamiento</strong>
                <span>{{ formatLabel(pet.comportamiento_habitual) }}</span>
              </div>
              <div>
                <strong>Edad</strong>
                <span>{{ pet.edad }} años</span>
              </div>
              <div>
                <strong>Vacunacion</strong>
                <span>{{ formatBoolean(pet.vacunacion_al_dia) }}</span>
              </div>
            </div>

            <div class="pets-actions-row card-actions">
              <button type="button" class="btn-secundario" @click.stop="openDetailModal(pet)">Ver detalle</button>
              <button type="button" class="btn-enviar" @click.stop="openEditModal(pet)">Editar</button>
              <button
                type="button"
                class="status-switch"
                :class="{ inactive: !pet.activo, busy: removingId === pet.id }"
                :disabled="removingId === pet.id"
                role="switch"
                :aria-checked="pet.activo"
                @click.stop="requestTogglePetStatus(pet)"
              >
                <span class="status-switch-track">
                  <span class="status-switch-thumb"></span>
                </span>
                <span class="status-switch-text">{{ removingId === pet.id ? 'Guardando...' : pet.activo ? 'Activa' : 'Desactivada' }}</span>
              </button>
              <button
                type="button"
                class="btn-delete"
                :disabled="deletingId === pet.id"
                @click.stop="requestDeletePet(pet)"
              >
                {{ deletingId === pet.id ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </article>
      </section>
    </template>

    <div v-if="isEditFormOpen" class="modal-overlay" @click.self="closeEditModal">
      <section class="pets-shell modal-card form-modal">
        <div class="modal-head">
          <div>
            <span class="pets-pill">{{ modalMode === 'create' ? 'Nueva mascota' : 'Edicion' }}</span>
            <h2>{{ modalTitle }}</h2>
          </div>
          <button type="button" class="modal-close" @click="closeEditModal">×</button>
        </div>

        <form class="pets-form" @submit.prevent="submitPet">
          <div class="field-grid">
            <label class="field-block">
              <span>Nombre *</span>
              <input v-model.trim="form.nombre" type="text" maxlength="80" placeholder="Ejemplo: Lulu">
            </label>

            <label class="field-block">
              <span>Raza</span>
              <input v-model.trim="form.raza" type="text" maxlength="80" placeholder="Ejemplo: Shih Tzu">
            </label>

            <label class="field-block">
              <span>Tamaño *</span>
              <select v-model="form.tamano">
                <option value="">Selecciona</option>
                <option v-for="option in tamanoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Sexo</span>
              <select v-model="form.sexo">
                <option v-for="option in sexoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Edad (años) *</span>
              <input
                v-model="form.edad"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                placeholder="0"
                @input="sanitizeAgeInput"
              >
            </label>

            <label class="field-block">
              <span>Tipo de pelaje *</span>
              <select v-model="form.tipo_pelaje">
                <option value="">Selecciona</option>
                <option v-for="option in pelajeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Comportamiento habitual *</span>
              <select v-model="form.comportamiento_habitual">
                <option value="">Selecciona</option>
                <option v-for="option in comportamientoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Fecha del ultimo baño</span>
              <input v-model="form.fecha_ultimo_bano" type="date" :max="todayDate">
            </label>

            <label class="field-block">
              <span>Vacunacion al dia</span>
              <select v-model="form.vacunacion_al_dia">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Desparasitacion interna al dia</span>
              <select v-model="form.desparasitacion_interna_al_dia">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Desparasitacion externa al dia</span>
              <select v-model="form.desparasitacion_externa_al_dia">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="field-grid">
            <label class="field-block">
              <span>¿Tiene alergias?</span>
              <select v-model="form.tiene_alergias">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>¿Tiene enfermedades?</span>
              <select v-model="form.tiene_enfermedades">
                <option v-for="option in yesNoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field-block">
              <span>Especifica las alergias</span>
              <textarea
                v-model.trim="form.alergias"
                rows="3"
                maxlength="240"
                :disabled="form.tiene_alergias !== 'true'"
                :placeholder="form.tiene_alergias === 'true' ? 'Describe las alergias' : 'Selecciona Sí para habilitar este campo'"
              />
            </label>

            <label class="field-block">
              <span>Especifica las enfermedades</span>
              <textarea
                v-model.trim="form.enfermedades"
                rows="3"
                maxlength="240"
                :disabled="form.tiene_enfermedades !== 'true'"
                :placeholder="form.tiene_enfermedades === 'true' ? 'Describe las enfermedades' : 'Selecciona Sí para habilitar este campo'"
              />
            </label>

            <label class="field-block">
              <span>Cosas que no le gustan</span>
              <textarea v-model.trim="form.cosas_no_le_gustan" rows="3" maxlength="240" />
            </label>

            <label class="field-block">
              <span>Observaciones</span>
              <textarea v-model.trim="form.observaciones" rows="3" maxlength="300" />
            </label>
          </div>

          <div class="upload-grid">
            <label class="upload-card">
              <span>Foto de la mascota</span>
              <input type="file" accept="image/*" @change="onFileChange($event, 'fotoMascota')">
              <img :src="previewMascotaUrl || fallbackPetImage" alt="Vista previa mascota" class="upload-preview">
            </label>

            <label class="upload-card">
              <span>Foto del carnet de vacunacion</span>
              <input type="file" accept="image/*" @change="onFileChange($event, 'fotoCarnet')">
              <div v-if="previewCarnetUrl" class="carnet-preview-wrap">
                <img :src="previewCarnetUrl" alt="Vista previa carnet" class="upload-preview">
              </div>
              <div v-else class="carnet-empty">Opcional</div>
            </label>
          </div>

          <p v-if="error" class="pets-feedback error">{{ error }}</p>

          <div class="pets-actions-row modal-actions">
            <button type="button" class="btn-secundario" @click="closeEditModal">Cancelar</button>
            <button type="submit" class="btn-enviar" :disabled="saving">{{ modalSubmitText }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isDetailOpen && selectedPet" class="modal-overlay" @click.self="closeDetailModal">
      <section class="pets-shell modal-card detail-modal">
        <div class="modal-head">
          <div>
            <span class="pets-pill">Hoja de vida peludita</span>
            <h2>{{ selectedPet.nombre }}</h2>
            <p class="detail-subtitle">Toda la informacion registrada para su cuidado, bienestar y futuras visitas.</p>
          </div>
          <button type="button" class="modal-close" @click="closeDetailModal">×</button>
        </div>

        <div class="detail-layout">
          <div class="detail-main-photo-card">
            <div class="detail-main-photo">
              <img :src="petImage(selectedPet.foto_mascota_url)" :alt="selectedPet.nombre">
            </div>
            <div class="detail-summary">
              <span class="pet-chip pet-status-chip" :class="{ inactive: !selectedPet.activo }">{{ statusLabel(selectedPet.activo) }}</span>
              <span class="pet-chip">{{ formatLabel(selectedPet.tamano) }}</span>
              <span class="pet-chip">{{ formatLabel(selectedPet.tipo_pelaje) }}</span>
            </div>
          </div>

          <div class="detail-info-grid">
            <div><strong>Raza</strong><span>{{ selectedPet.raza || 'No registrada' }}</span></div>
            <div><strong>Tamaño</strong><span>{{ formatLabel(selectedPet.tamano) }}</span></div>
            <div><strong>Edad</strong><span>{{ selectedPet.edad }} años</span></div>
            <div><strong>Sexo</strong><span>{{ formatLabel(selectedPet.sexo) }}</span></div>
            <div><strong>Pelaje</strong><span>{{ formatLabel(selectedPet.tipo_pelaje) }}</span></div>
            <div><strong>Comportamiento</strong><span>{{ formatLabel(selectedPet.comportamiento_habitual) }}</span></div>
            <div><strong>Vacunacion</strong><span>{{ formatBoolean(selectedPet.vacunacion_al_dia) }}</span></div>
            <div><strong>Desparas. interna</strong><span>{{ formatBoolean(selectedPet.desparasitacion_interna_al_dia) }}</span></div>
            <div><strong>Desparas. externa</strong><span>{{ formatBoolean(selectedPet.desparasitacion_externa_al_dia) }}</span></div>
            <div><strong>Ultimo baño</strong><span>{{ formatDate(selectedPet.fecha_ultimo_bano) }}</span></div>
            <div><strong>Alergias</strong><span>{{ selectedPet.alergias || 'No registradas' }}</span></div>
            <div><strong>Enfermedades</strong><span>{{ selectedPet.enfermedades || 'No registradas' }}</span></div>
            <div><strong>No le gusta</strong><span>{{ selectedPet.cosas_no_le_gustan || 'No registrado' }}</span></div>
            <div><strong>Observaciones</strong><span>{{ selectedPet.observaciones || 'No registradas' }}</span></div>
            <div><strong>Registrada</strong><span>{{ formatDateTime(selectedPet.created_at) }}</span></div>
            <div><strong>Ultima actualizacion</strong><span>{{ formatDateTime(selectedPet.updated_at) }}</span></div>
          </div>
        </div>

        <div v-if="selectedPet.foto_carnet_vacunacion_url" class="detail-carnet">
          <span class="pets-pill subtle">Carnet de vacunacion</span>
          <img :src="selectedPet.foto_carnet_vacunacion_url" alt="Carnet de vacunacion">
        </div>

        <div class="pets-actions-row modal-actions">
          <button
            type="button"
            class="btn-delete"
            :disabled="deletingId === selectedPet.id"
            @click="requestDeletePet(selectedPet)"
          >
            {{ deletingId === selectedPet.id ? 'Eliminando...' : 'Eliminar mascota' }}
          </button>
          <button type="button" class="btn-secundario" @click="closeDetailModal">Cerrar</button>
          <button
            type="button"
            class="btn-enviar"
            @click="closeDetailModal(); openEditModal(selectedPet)"
          >
            Editar mascota
          </button>
        </div>
      </section>
    </div>

    <div v-if="isConfirmDialogOpen" class="modal-overlay confirm-overlay" @click.self="closeConfirmDialog">
      <section class="pets-shell confirm-card">
        <div class="confirm-icon" :class="confirmDialog.tone">
          {{ confirmDialog.mode === 'delete' ? '!' : '?' }}
        </div>
        <span class="pets-pill">{{ confirmDialog.mode === 'delete' ? 'Confirmacion delicada' : 'Confirmacion' }}</span>
        <h2>{{ confirmDialog.title }}</h2>
        <p>{{ confirmDialog.message }}</p>
        <div class="pets-actions-row confirm-actions">
          <button type="button" class="btn-secundario" @click="closeConfirmDialog">Cancelar</button>
          <button
            type="button"
            :class="confirmDialog.tone === 'danger' ? 'btn-delete' : 'btn-enviar'"
            :disabled="removingId === confirmDialog.petId || deletingId === confirmDialog.petId"
            @click="confirmDialogAction"
          >
            {{
              removingId === confirmDialog.petId || deletingId === confirmDialog.petId
                ? 'Guardando...'
                : confirmDialog.confirmLabel
            }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.pets-page {
  width: min(1360px, calc(100vw - 42px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.pets-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.pets-state-card {
  padding: 40px;
  text-align: center;
}

.pets-actions-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.pets-hero {
  padding: 32px;
}

.pets-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
  box-shadow: inset 0 0 0 1px rgba(156, 0, 118, 0.09);
}

.pets-hero h1,
.pets-empty-card h2,
.pet-card-copy h2,
.modal-head h2 {
  margin: 14px 0 12px;
  color: #8f176e;
}

.pets-hero p,
.empty-copy p,
.pet-card-copy p,
.pets-feedback,
.field-block span,
.detail-info-grid span,
.carnet-empty {
  color: #6e5064;
  line-height: 1.75;
}

.hero-inline-actions {
  margin-top: 22px;
}

.hero-register-button {
  min-width: 230px;
}

.pets-feedback {
  margin: 16px 0 0;
  font-weight: 600;
}

.pets-feedback.error {
  color: #cb3b81;
}

.pets-feedback.success {
  color: #0b9f93;
}

.create-form-panel {
  margin-top: 24px;
  padding: 30px;
}

.create-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.pets-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}

.pet-card {
  padding: 18px;
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr);
  gap: 16px;
}

.pet-card.inactive {
  opacity: 0.82;
}

.pet-photo-wrap {
  width: 126px;
  height: 126px;
  border-radius: 26px;
  overflow: hidden;
  background: linear-gradient(145deg, #fff0f8 0%, #eefafe 100%);
}

.pet-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pet-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.pet-card-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pet-card-head p {
  margin: 0;
}

.pet-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: #fff2fa;
  color: #9c0076;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.pet-status-chip {
  background: #ecfbf7;
  color: #0b9f93;
}

.pet-status-chip.inactive {
  background: #fff1f6;
  color: #c23c7b;
}

.pet-mini-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pet-mini-grid div {
  padding: 12px 14px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.pet-mini-grid strong,
.detail-info-grid strong,
.field-block span {
  display: block;
  margin-bottom: 6px;
  color: #9c0076;
}

.card-actions {
  margin-top: 16px;
}

.status-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: none;
  border-radius: 999px;
  background: #eefcf8;
  color: #0b9f93;
  font-weight: 700;
  cursor: pointer;
}

.status-switch.inactive {
  background: #eefcf8;
  color: var(--sp-dark-button);
  box-shadow: none;
}

.status-switch.busy {
  opacity: 0.7;
  cursor: wait;
}

.status-switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.status-switch-track {
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(135deg, #79dfe8 0%, #43c7d9 100%);
  display: inline-flex;
  align-items: center;
  padding: 4px;
  transition: background 0.2s ease;
}

.status-switch.inactive .status-switch-track {
  background: rgba(26, 32, 44, 0.2);
}

.status-switch.inactive .status-switch-thumb {
  background: var(--sp-dark-button);
}

.status-switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
  transform: translateX(20px);
  transition: transform 0.2s ease;
}

.status-switch.inactive .status-switch-thumb {
  transform: translateX(0);
}

.status-switch-text {
  min-width: 86px;
}

.btn-soft-danger {
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  background: #fff1f6;
  color: #c23c7b;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
}

.btn-soft-danger:disabled {
  opacity: 0.65;
  cursor: wait;
}

.btn-delete {
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #ffedf5 0%, #ffdce8 100%);
  color: #c23c7b;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
}

.btn-delete:disabled {
  opacity: 0.65;
  cursor: wait;
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
  z-index: 120;
}

.modal-card {
  width: min(1100px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 24px;
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

.confirm-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  font-size: 2rem;
  font-weight: 800;
  color: #8f176e;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  box-shadow: 0 18px 30px rgba(233, 90, 219, 0.14);
}

.confirm-icon.danger {
  color: #c23c7b;
  background: linear-gradient(135deg, #ffedf5 0%, #ffdce8 100%);
}

.confirm-actions {
  justify-content: center;
  margin-top: 22px;
}

.form-modal {
  width: min(1180px, 100%);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
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

.pets-form {
  display: grid;
  gap: 18px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.field-block {
  display: block;
}

.field-block input,
.field-block select,
.field-block textarea {
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
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-block input:focus,
.field-block select:focus,
.field-block textarea:focus {
  border-color: #d85ac7;
  box-shadow: 0 0 0 4px rgba(232, 120, 206, 0.14);
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.upload-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.upload-card span {
  color: #9c0076;
  font-weight: 700;
}

.upload-preview {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 20px;
}

.carnet-preview-wrap {
  border-radius: 20px;
  overflow: hidden;
}

.carnet-empty {
  min-height: 220px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.74);
}

.detail-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 20px;
}

.detail-subtitle {
  margin: 8px 0 0;
  color: #6e5064;
  line-height: 1.7;
}

.detail-main-photo-card {
  display: grid;
  gap: 14px;
}

.detail-main-photo img,
.detail-carnet img {
  width: 100%;
  border-radius: 24px;
  object-fit: cover;
}

.detail-main-photo img {
  height: 360px;
}

.detail-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-info-grid div {
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.detail-carnet {
  margin-top: 18px;
}

.detail-carnet .pets-pill {
  margin-bottom: 12px;
}

.modal-actions {
  margin-top: 20px;
  justify-content: flex-end;
}

@media (max-width: 1080px) {
  .field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .pets-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .pets-hero,
  .create-form-panel,
  .pets-state-card,
  .pet-card,
  .modal-card {
    padding: 20px;
    border-radius: 24px;
  }

  .pets-actions-row,
  .pet-card {
    flex-direction: column;
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .field-grid,
  .upload-grid,
  .pet-mini-grid,
  .detail-info-grid {
    grid-template-columns: 1fr;
  }

  .pet-photo-wrap {
    width: 100%;
    height: 240px;
  }
}
</style>
