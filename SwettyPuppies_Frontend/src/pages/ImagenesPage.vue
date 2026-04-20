<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { apiForm, apiGet, apiPatch, apiPost } from '@/lib/api'
import { logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type ContentItem = {
  id: string
  titulo: string
  descripcion: string | null
  ruta: string
  categoria: string | null
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

type ContentListResponse = {
  success: boolean
  publicaciones: ContentItem[]
  search: string
}

type ContentDetailResponse = {
  success: boolean
  publicacion: ContentItem
}

type ContentMutationResponse = {
  success: boolean
  message: string
  publicacion: ContentItem
}

type ContentReorderResponse = {
  success: boolean
  message: string
  publicaciones: ContentItem[]
}

type ContentFormState = {
  titulo: string
  descripcion: string
  categoria: string
  orden: number
  activo: boolean
  imagen: File | null
}

const CATEGORY_OPTIONS = ['peluditos del mes', 'galeria destacada', 'promocion', 'mensaje visual']

const currentPath = window.location.pathname.toLowerCase()
const loading = ref(true)
const detailLoading = ref(false)
const saving = ref(false)
const reordering = ref(false)
const error = ref('')
const toast = ref('')
const searchTerm = ref('')
const appliedSearch = ref('')
const publicaciones = ref<ContentItem[]>([])
const selectedContent = ref<ContentItem | null>(null)
const isDetailOpen = ref(false)
const isFormOpen = ref(false)
const isEditing = ref(false)
const form = ref(createEmptyForm())
const previewUrl = ref('')
const orderDrafts = ref<Record<string, number>>({})

const summaryCards = computed(() => {
  const total = publicaciones.value.length
  const active = publicaciones.value.filter((item) => item.activo).length
  const categories = new Set(publicaciones.value.map((item) => item.categoria || 'Sin categoria')).size
  const featured = publicaciones.value.find((item) => item.activo) || null

  return [
    { label: 'Publicaciones visibles', value: String(total), tone: 'pink' },
    { label: 'Activas', value: String(active), tone: 'mint' },
    { label: 'Categorias', value: String(categories), tone: 'lavender' },
    { label: 'Primera en lobby', value: featured?.titulo || 'Aún sin destacada', tone: 'sky' },
  ]
})

const emptyStateTitle = computed(() =>
  appliedSearch.value
    ? 'No encontramos publicaciones con esa busqueda'
    : 'Aún no hay contenido publicado en el lobby'
)

const emptyStateMessage = computed(() =>
  appliedSearch.value
    ? 'Prueba con titulo, categoria o palabras clave de la descripcion.'
    : 'Aqui podras destacar peluditos del mes, promociones y mensajes visuales para la bienvenida del cliente.'
)

const currentPreview = computed(() => previewUrl.value || selectedContent.value?.ruta || '')

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  await loadContent()
})

onUnmounted(() => {
  revokePreviewUrl()
})

function createEmptyForm(): ContentFormState {
  return {
    titulo: '',
    descripcion: '',
    categoria: 'galeria destacada',
    orden: 0,
    activo: true,
    imagen: null,
  }
}

async function loadContent(search = appliedSearch.value) {
  loading.value = true
  error.value = ''

  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    const data = await apiGet<ContentListResponse>(`/api/contenido${query}`)
    publicaciones.value = data.publicaciones
    appliedSearch.value = data.search || search
    syncOrderDrafts()
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el contenido del portal'
  } finally {
    loading.value = false
  }
}

function syncOrderDrafts() {
  orderDrafts.value = Object.fromEntries(
    publicaciones.value.map((item) => [item.id, Number(item.orden) || 0])
  )
}

async function applySearch() {
  await loadContent(searchTerm.value.trim())
}

async function clearSearch() {
  searchTerm.value = ''
  await loadContent('')
}

async function openDetail(contentId: string) {
  detailLoading.value = true
  selectedContent.value = null
  isDetailOpen.value = true
  error.value = ''

  try {
    const data = await apiGet<ContentDetailResponse>(`/api/contenido/${contentId}`)
    selectedContent.value = data.publicacion
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el detalle de la publicacion'
    closeDetail()
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  isDetailOpen.value = false
  selectedContent.value = null
}

function openCreateForm() {
  isDetailOpen.value = false
  isEditing.value = false
  form.value = createEmptyForm()
  selectedContent.value = null
  isFormOpen.value = true
  revokePreviewUrl()
}

async function openEditForm(contentId: string) {
  saving.value = false
  error.value = ''
  isDetailOpen.value = false
  isEditing.value = true
  isFormOpen.value = true
  revokePreviewUrl()

  try {
    const data = await apiGet<ContentDetailResponse>(`/api/contenido/${contentId}`)
    selectedContent.value = data.publicacion
    form.value = {
      titulo: data.publicacion.titulo || '',
      descripcion: data.publicacion.descripcion || '',
      categoria: data.publicacion.categoria || 'galeria destacada',
      orden: Number(data.publicacion.orden) || 0,
      activo: Boolean(data.publicacion.activo),
      imagen: null,
    }
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error ? caughtError.message : 'No se pudo preparar la edicion de la publicacion'
    isFormOpen.value = false
  }
}

function closeForm() {
  isFormOpen.value = false
  isEditing.value = false
  form.value = createEmptyForm()
  revokePreviewUrl()
}

function revokePreviewUrl() {
  if (previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  form.value.imagen = file
  revokePreviewUrl()

  if (file) {
    previewUrl.value = URL.createObjectURL(file)
  }
}

function buildFormData() {
  const payload = new FormData()
  payload.append('titulo', form.value.titulo)
  payload.append('descripcion', form.value.descripcion)
  payload.append('categoria', form.value.categoria)
  payload.append('orden', String(form.value.orden))
  payload.append('activo', String(form.value.activo))

  if (form.value.imagen) {
    payload.append('imagen', form.value.imagen)
  }

  return payload
}

function syncContentItem(updated: ContentItem) {
  const existingIndex = publicaciones.value.findIndex((item) => item.id === updated.id)

  if (existingIndex === -1) {
    publicaciones.value = [updated, ...publicaciones.value].sort(sortByOrder)
  } else {
    publicaciones.value = publicaciones.value
      .map((item) => (item.id === updated.id ? updated : item))
      .sort(sortByOrder)
  }

  orderDrafts.value = {
    ...orderDrafts.value,
    [updated.id]: Number(updated.orden) || 0,
  }
}

function sortByOrder(a: ContentItem, b: ContentItem) {
  if (Number(a.orden) !== Number(b.orden)) {
    return Number(a.orden) - Number(b.orden)
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

async function saveContent() {
  saving.value = true
  error.value = ''

  try {
    const payload = buildFormData()
    const data = isEditing.value && selectedContent.value
      ? await apiForm<ContentMutationResponse>(`/api/contenido/${selectedContent.value.id}`, 'PATCH', payload)
      : await apiForm<ContentMutationResponse>('/api/contenido', 'POST', payload)

    selectedContent.value = data.publicacion
    syncContentItem(data.publicacion)
    closeForm()
    showToast(data.message || 'Contenido guardado correctamente')
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error ? caughtError.message : 'No se pudo guardar la publicacion'
  } finally {
    saving.value = false
  }
}

async function toggleStatus(item: ContentItem) {
  try {
    const data = await apiPatch<ContentMutationResponse>(`/api/contenido/${item.id}/status`, {
      activo: !item.activo,
    })
    syncContentItem(data.publicacion)

    if (selectedContent.value?.id === data.publicacion.id) {
      selectedContent.value = data.publicacion
    }

    showToast(data.message || 'Estado actualizado correctamente')
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error ? caughtError.message : 'No se pudo cambiar el estado de la publicacion'
  }
}

async function saveVisualOrder() {
  reordering.value = true
  error.value = ''

  try {
    const items = publicaciones.value.map((item) => ({
      id: item.id,
      orden: Number(orderDrafts.value[item.id] ?? item.orden ?? 0),
    }))

    const data = await apiPost<ContentReorderResponse>('/api/contenido/reordenar', { items })
    publicaciones.value = data.publicaciones.sort(sortByOrder)
    syncOrderDrafts()
    showToast(data.message || 'Orden visual actualizado correctamente')
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el orden visual'
  } finally {
    reordering.value = false
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
    return 'Sin registro'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Sin registro'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
</script>

<template>
  <main class="admin-content-page">
    <section v-if="loading" class="admin-shell state-card">
      <h1>Cargando el contenido del portal...</h1>
      <p>Estamos preparando las publicaciones visuales del lobby cliente.</p>
    </section>

    <section v-else-if="error && !publicaciones.length && !isFormOpen" class="admin-shell state-card">
      <h1>No pudimos abrir el modulo de contenido</h1>
      <p>{{ error }}</p>
      <div class="card-actions">
        <a href="/login" class="btn-secundario">Volver al acceso</a>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="admin-shell hero-card">
        <div class="hero-copy">
          <span class="hero-kicker">Contenido del portal</span>
          <h1>Lobby visual para enamorar a cada familia peluda</h1>
          <p>
            Aquí Sara podrá publicar peluditos del mes, promociones e imágenes destacadas
            que se veran en el inicio del cliente autenticado.
          </p>

          <div class="hero-note-card">
            <strong>Lobby activo</strong>
            <p>
              Las publicaciones activas se muestran en el home cliente ordenadas segun el
              campo de visualización que configures aquí.
            </p>
          </div>
        </div>

        <div class="hero-actions">
          <label class="search-panel">
            <span>Buscar publicacion</span>
            <input
              v-model="searchTerm"
              type="search"
              placeholder="Titulo, categoria o descripcion..."
              @keydown.enter.prevent="applySearch"
            >
          </label>

          <div class="hero-buttons">
            <button type="button" class="btn-primary" @click="applySearch">Buscar</button>
            <button type="button" class="btn-secondary" @click="clearSearch">Limpiar</button>
          </div>

          <button type="button" class="btn-primary wide" @click="openCreateForm">
            Nueva publicacion visual
          </button>
        </div>
      </section>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="summary-card" :class="card.tone">
          <strong>{{ card.label }}</strong>
          <span>{{ card.value }}</span>
        </article>
      </section>

      <section class="admin-shell section-card">
        <div class="section-header">
          <div>
            <span class="section-kicker">Listado principal</span>
            <h2>Publicaciones del lobby cliente</h2>
          </div>
          <div class="section-actions">
            <span>{{ publicaciones.length }} publicaciones visibles</span>
            <button type="button" class="btn-secondary" :disabled="reordering || !publicaciones.length" @click="saveVisualOrder">
              {{ reordering ? 'Guardando orden...' : 'Guardar orden visual' }}
            </button>
          </div>
        </div>

        <p v-if="toast" class="toast-message">{{ toast }}</p>
        <p v-if="error && publicaciones.length" class="inline-error">{{ error }}</p>

        <div v-if="publicaciones.length" class="content-grid">
          <article v-for="item in publicaciones" :key="item.id" class="content-card" :class="{ inactive: !item.activo }">
            <div class="content-thumb-shell">
              <img :src="item.ruta" :alt="item.titulo" class="content-thumb">
              <span class="status-badge" :class="item.activo ? 'active' : 'inactive'">
                {{ item.activo ? 'Activa' : 'Inactiva' }}
              </span>
            </div>

            <div class="content-copy">
              <div class="content-meta">
                <span class="category-pill">{{ item.categoria || 'Galeria destacada' }}</span>
                <small>Orden {{ item.orden }}</small>
              </div>
              <h3>{{ item.titulo }}</h3>
              <p>{{ item.descripcion || 'Sin descripcion por ahora.' }}</p>
            </div>

            <div class="order-editor">
              <label>
                <span>Orden visual</span>
                <input v-model.number="orderDrafts[item.id]" type="number" min="0">
              </label>
              <small>Visible en el cliente desde {{ formatDate(item.created_at) }}</small>
            </div>

            <div class="content-actions">
              <button type="button" class="btn-secondary" @click="openDetail(item.id)">Ver detalle</button>
              <button type="button" class="btn-primary" @click="openEditForm(item.id)">Editar</button>
              <button type="button" class="btn-ghost" @click="toggleStatus(item)">
                {{ item.activo ? 'Desactivar' : 'Activar' }}
              </button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <h3>{{ emptyStateTitle }}</h3>
          <p>{{ emptyStateMessage }}</p>
          <button type="button" class="btn-primary" @click="openCreateForm">
            Crear primera publicacion
          </button>
        </div>
      </section>

      <section v-if="isDetailOpen" class="modal-backdrop" @click.self="closeDetail">
        <article class="modal-card detail-modal">
          <button type="button" class="modal-close" @click="closeDetail">×</button>

          <template v-if="detailLoading">
            <h2>Cargando detalle...</h2>
            <p>Estamos preparando la ficha de esta publicacion.</p>
          </template>

          <template v-else-if="selectedContent">
            <div class="detail-hero">
              <img :src="selectedContent.ruta" :alt="selectedContent.titulo" class="detail-image">
              <div class="detail-copy">
                <span class="category-pill">{{ selectedContent.categoria || 'Galeria destacada' }}</span>
                <h2>{{ selectedContent.titulo }}</h2>
                <p>{{ selectedContent.descripcion || 'Sin descripcion registrada.' }}</p>
                <div class="detail-grid">
                  <article class="mini-card">
                    <strong>Estado</strong>
                    <span>{{ selectedContent.activo ? 'Activa' : 'Inactiva' }}</span>
                  </article>
                  <article class="mini-card">
                    <strong>Orden visual</strong>
                    <span>{{ selectedContent.orden }}</span>
                  </article>
                  <article class="mini-card">
                    <strong>Creada</strong>
                    <span>{{ formatDate(selectedContent.created_at) }}</span>
                  </article>
                  <article class="mini-card">
                    <strong>Actualizada</strong>
                    <span>{{ formatDate(selectedContent.updated_at) }}</span>
                  </article>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-primary" @click="openEditForm(selectedContent.id)">Editar publicacion</button>
              <button type="button" class="btn-ghost" @click="toggleStatus(selectedContent)">
                {{ selectedContent.activo ? 'Desactivar' : 'Activar' }}
              </button>
              <button type="button" class="btn-secondary" @click="closeDetail">Cerrar</button>
            </div>
          </template>
        </article>
      </section>

      <section v-if="isFormOpen" class="modal-backdrop" @click.self="closeForm">
        <article class="modal-card form-modal">
          <button type="button" class="modal-close" @click="closeForm">×</button>
          <span class="section-kicker">{{ isEditing ? 'Editar publicacion' : 'Nueva publicacion' }}</span>
          <h2>{{ isEditing ? 'Actualiza este contenido visual' : 'Crea una publicacion para el lobby cliente' }}</h2>

          <p v-if="error" class="inline-error">{{ error }}</p>

          <div class="form-grid">
            <div class="image-uploader">
              <div class="image-preview-shell">
                <img v-if="currentPreview" :src="currentPreview" :alt="form.titulo || 'Vista previa'" class="image-preview">
                <div v-else class="image-placeholder">
                  <strong>Vista previa</strong>
                  <span>Sube una imagen linda para el lobby</span>
                </div>
              </div>

              <label class="file-field">
                <span>Imagen principal</span>
                <input type="file" accept="image/*" @change="handleFileChange">
              </label>
            </div>

            <div class="form-fields">
              <label class="field-group">
                <span>Titulo</span>
                <input v-model="form.titulo" type="text" placeholder="Ejemplo: Peluditos del mes">
              </label>

              <label class="field-group">
                <span>Categoria</span>
                <select v-model="form.categoria">
                  <option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">{{ option }}</option>
                </select>
              </label>

              <label class="field-group">
                <span>Orden visual</span>
                <input v-model.number="form.orden" type="number" min="0">
              </label>

              <label class="field-group span-2">
                <span>Descripcion</span>
                <textarea
                  v-model="form.descripcion"
                  rows="5"
                  placeholder="Cuenta brevemente que vera la familia peluda en esta publicacion..."
                ></textarea>
              </label>

              <label class="toggle-card span-2">
                <input v-model="form.activo" type="checkbox">
                <span>Mostrar esta publicacion en el inicio del cliente apenas se guarde</span>
              </label>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-primary" :disabled="saving" @click="saveContent">
              {{ saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear publicacion' }}
            </button>
            <button type="button" class="btn-secondary" :disabled="saving" @click="closeForm">Cancelar</button>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.admin-content-page {
  width: min(1440px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 24px 0 56px;
}

.admin-shell,
.summary-card,
.modal-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.state-card,
.hero-card,
.section-card {
  padding: 30px 32px;
}

.card-actions,
.hero-buttons,
.content-actions,
.modal-actions,
.section-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.8fr);
  gap: 28px;
}

.hero-kicker,
.section-kicker {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff3fa 0%, #eef9ff 100%);
  color: #9c0076;
  font-size: 0.86rem;
  font-weight: 700;
}

.hero-copy h1 {
  margin: 18px 0 12px;
  color: #94186f;
  font-size: clamp(2.2rem, 3vw, 3rem);
}

.hero-copy p {
  margin: 0;
  color: #5f4760;
  line-height: 1.7;
}

.hero-note-card {
  margin-top: 22px;
  border-radius: 24px;
  border: 1px solid rgba(255, 205, 230, 0.95);
  background: linear-gradient(135deg, rgba(255, 248, 252, 0.96), rgba(239, 249, 255, 0.96));
  padding: 20px;
}

.hero-note-card strong {
  display: block;
  margin-bottom: 8px;
  color: #a0137b;
}

.hero-actions {
  display: grid;
  align-content: start;
  gap: 16px;
}

.search-panel {
  display: grid;
  gap: 8px;
  color: #9c0076;
  font-weight: 700;
}

.search-panel input,
.field-group input,
.field-group select,
.field-group textarea,
.order-editor input,
.file-field input {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(241, 181, 213, 0.95);
  background: rgba(255, 255, 255, 0.96);
  padding: 14px 16px;
  font: inherit;
  color: #4d2d47;
}

.search-panel input:focus,
.field-group input:focus,
.field-group select:focus,
.field-group textarea:focus,
.order-editor input:focus {
  outline: none;
  border-color: rgba(219, 67, 175, 0.9);
  box-shadow: 0 0 0 4px rgba(233, 90, 219, 0.16);
}

.btn-primary,
.btn-secondary,
.btn-ghost,
.btn-enviar,
.btn-secundario {
  border: none;
  border-radius: 999px;
  padding: 14px 22px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.btn-primary,
.btn-enviar {
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  color: #fff;
  box-shadow: 0 18px 28px var(--sp-primary-shadow);
}

.btn-secondary,
.btn-secundario {
  background: #fff;
  color: #9c0076;
  border: 1px solid rgba(241, 181, 213, 0.95);
}

.btn-ghost {
  background: linear-gradient(135deg, rgba(255, 243, 248, 0.96), rgba(239, 249, 255, 0.96));
  color: #a0137b;
}

.btn-primary:hover,
.btn-secondary:hover,
.btn-ghost:hover,
.btn-enviar:hover,
.btn-secundario:hover {
  transform: translateY(-1px);
}

.btn-primary.wide {
  justify-content: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.summary-card {
  padding: 22px;
}

.summary-card strong {
  display: block;
  color: #8f176e;
  font-size: 0.95rem;
}

.summary-card span {
  display: block;
  margin-top: 12px;
  font-size: 2rem;
  font-weight: 800;
  color: #51304c;
}

.summary-card.pink { background: linear-gradient(135deg, rgba(255,245,251,0.96), rgba(255,255,255,0.96)); }
.summary-card.mint { background: linear-gradient(135deg, rgba(235,255,251,0.96), rgba(255,255,255,0.96)); }
.summary-card.lavender { background: linear-gradient(135deg, rgba(247,242,255,0.96), rgba(255,255,255,0.96)); }
.summary-card.sky { background: linear-gradient(135deg, rgba(238,249,255,0.96), rgba(255,255,255,0.96)); }

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 10px 0 0;
  color: #94186f;
  font-size: 2rem;
}

.section-actions {
  align-items: center;
  justify-content: flex-end;
  color: #6f5069;
}

.toast-message,
.inline-error {
  margin: 0 0 18px;
  border-radius: 18px;
  padding: 14px 16px;
  font-weight: 600;
}

.toast-message {
  background: rgba(232, 255, 248, 0.96);
  color: #188b78;
  border: 1px solid rgba(126, 227, 197, 0.8);
}

.inline-error {
  background: rgba(255, 241, 244, 0.96);
  color: #c33b74;
  border: 1px solid rgba(255, 201, 215, 0.9);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.content-card {
  border-radius: 28px;
  border: 1px solid rgba(245, 209, 230, 0.95);
  background: linear-gradient(135deg, rgba(255, 249, 252, 0.98), rgba(238, 249, 255, 0.98));
  padding: 18px;
  display: grid;
  gap: 14px;
}

.content-card.inactive {
  opacity: 0.9;
}

.content-thumb-shell {
  position: relative;
}

.content-thumb,
.detail-image,
.image-preview {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 22px;
  display: block;
}

.status-badge,
.category-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.84rem;
  font-weight: 700;
}

.status-badge {
  position: absolute;
  top: 14px;
  right: 14px;
}

.status-badge.active {
  background: #ebfbf5;
  color: #0a9b87;
}

.status-badge.inactive {
  background: #fff1f4;
  color: #c33b74;
}

.category-pill {
  background: linear-gradient(135deg, #fff3fa 0%, #eef9ff 100%);
  color: #9c0076;
}

.content-copy h3 {
  margin: 10px 0 8px;
  color: #94186f;
  font-size: 1.3rem;
}

.content-copy p {
  margin: 0;
  color: #665166;
  line-height: 1.6;
}

.content-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: #7f6278;
}

.order-editor {
  display: grid;
  gap: 8px;
}

.order-editor label {
  display: grid;
  gap: 8px;
  color: #8f176e;
  font-weight: 700;
}

.order-editor small {
  color: #786174;
}

.empty-state {
  text-align: center;
  padding: 36px 20px 10px;
}

.empty-state h3 {
  color: #94186f;
  font-size: 1.6rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(88, 39, 80, 0.28);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 40;
}

.modal-card {
  width: min(1040px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 28px;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 14px;
  background: rgba(255, 242, 249, 0.95);
  color: #9c0076;
  font-size: 1.5rem;
  cursor: pointer;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.detail-copy h2 {
  margin: 14px 0 10px;
  color: #94186f;
  font-size: 2rem;
}

.detail-copy p {
  margin: 0;
  color: #62505f;
  line-height: 1.7;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.mini-card {
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(255, 248, 252, 0.96), rgba(238, 249, 255, 0.96));
  border: 1px solid rgba(245, 209, 230, 0.92);
}

.mini-card strong {
  display: block;
  margin-bottom: 8px;
  color: #8f176e;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.7fr) minmax(0, 1fr);
  gap: 22px;
  margin-top: 18px;
}

.image-uploader {
  display: grid;
  gap: 14px;
}

.image-preview-shell {
  min-height: 320px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255, 248, 252, 0.98), rgba(238, 249, 255, 0.98));
  border: 1px dashed rgba(222, 141, 199, 0.65);
  overflow: hidden;
}

.image-preview {
  height: 320px;
}

.image-placeholder {
  min-height: 320px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #7a6075;
  padding: 18px;
}

.file-field,
.field-group {
  display: grid;
  gap: 8px;
  color: #8f176e;
  font-weight: 700;
}

.form-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.span-2 {
  grid-column: 1 / -1;
}

.toggle-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(240, 196, 222, 0.9);
  background: linear-gradient(135deg, rgba(255, 248, 252, 0.98), rgba(238, 249, 255, 0.98));
  color: #684f67;
}

.toggle-card input {
  width: 20px;
  height: 20px;
}

@media (max-width: 1080px) {
  .hero-card,
  .detail-hero,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid,
  .content-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .admin-content-page {
    width: min(100vw - 24px, 100%);
    padding-top: 12px;
  }

  .hero-card,
  .section-card,
  .state-card,
  .modal-card {
    padding: 22px 20px;
    border-radius: 24px;
  }

  .summary-grid,
  .content-grid,
  .detail-grid,
  .form-fields {
    grid-template-columns: 1fr;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .content-thumb,
  .detail-image,
  .image-preview {
    height: 200px;
  }
}
</style>
