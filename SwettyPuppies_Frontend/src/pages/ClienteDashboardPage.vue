<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import ClientSiteHeader from '@/components/ClientSiteHeader.vue'

type ClientHomeResponse = {
  success: boolean
  profile: {
    clienteId: string
    nombre: string
    apellido: string
    telefono: string
    direccion: string | null
    cedula: string
    email: string
  }
  about: {
    title: string
    description: string
    location: string
    note: string
  }
  images: Array<{
    id: string
    titulo: string
    descripcion: string | null
    ruta: string
    categoria: string | null
    orden: number
  }>
  summary: {
    mascotasCount: number
    nextAppointment: null | {
      id: string
      fecha: string
      hora_inicio: string
      servicio_nombre: string | null
      mascota_nombre: string | null
      estado: string
    }
    lastService: null | {
      fecha_servicio: string
      servicio_principal_nombre: string
      mascota_nombre: string
      precio_final: number
    }
  }
  quickLinks: Array<{
    title: string
    href: string
    description: string
  }>
}

const loading = ref(true)
const error = ref('')
const payload = ref<ClientHomeResponse | null>(null)
const currentImageIndex = ref(0)
const currentPath = window.location.pathname.toLowerCase()
const businessMapsUrl =
  'https://www.google.com/maps/place/Sweety+puppies/@5.0243655,-74.0038038,17z/data=!4m15!1m8!3m7!1s0x8e407128692e2f17:0x80a709b539972cc2!2sSweety+puppies!8m2!3d5.0243417!4d-74.0037652!10e1!16s%2Fg%2F11z0hhgd47!3m5!1s0x8e407128692e2f17:0x80a709b539972cc2!8m2!3d5.0243417!4d-74.0037652!16s%2Fg%2F11z0hhgd47?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D'
const businessLocationLabel = 'Sweety Puppies · Calle 3 # 1-49, Facatativa, Cundinamarca'

const greeting = computed(() => {
  if (!payload.value) {
    return 'Bienvenido/a a Sweety Puppies'
  }

  return `Hola, ${payload.value.profile.nombre}`
})

const heroSubtitle = computed(() => {
  const email = payload.value?.profile.email
  if (!email) {
    return 'Tu portal privado esta listo para consentir a tu peludito.'
  }

  return `Tu portal privado esta listo para consentir a tu peludito. Te acompanamos desde ${email}.`
})

const currentImage = computed(() => {
  if (!payload.value?.images.length) {
    return null
  }

  return payload.value.images[currentImageIndex.value % payload.value.images.length]
})

const summaryCards = computed(() => {
  const summary = payload.value?.summary
  return [
    {
      label: 'Mascotas registradas',
      value: String(summary?.mascotasCount ?? 0),
      helper: 'Tu familia peluda dentro del portal',
    },
    {
      label: 'Proxima cita',
      value: summary?.nextAppointment
        ? `${formatDate(summary.nextAppointment.fecha)} · ${formatTime(summary.nextAppointment.hora_inicio)}`
        : 'Sin citas por ahora',
      helper: summary?.nextAppointment
        ? `${summary.nextAppointment.mascota_nombre ?? 'Tu mascota'} · ${summary.nextAppointment.servicio_nombre ?? 'Servicio pendiente'}`
        : 'Cuando agendas una, la veras aqui',
    },
    {
      label: 'Ultimo servicio',
      value: summary?.lastService
        ? summary.lastService.servicio_principal_nombre
        : 'Aun sin historial',
      helper: summary?.lastService
        ? `${summary.lastService.mascota_nombre} · ${formatDateTime(summary.lastService.fecha_servicio)}`
        : 'Aqui apareceran sus ultimos cuidados',
    },
  ]
})

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('cliente')
  if (!session) {
    loading.value = false
    return
  }

  try {
    payload.value = await apiGet<ClientHomeResponse>('/api/auth/me/client-home')
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar tu portal'
  } finally {
    loading.value = false
  }
})

function nextImage() {
  if (!payload.value?.images.length) {
    return
  }

  currentImageIndex.value = (currentImageIndex.value + 1) % payload.value.images.length
}

function previousImage() {
  if (!payload.value?.images.length) {
    return
  }

  currentImageIndex.value =
    (currentImageIndex.value - 1 + payload.value.images.length) % payload.value.images.length
}

function formatDate(value: string) {
  const normalized = value.includes('T') ? value : `${value}T00:00:00`
  const parsedDate = new Date(normalized)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha por confirmar'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
  }).format(parsedDate)
}

function formatTime(value: string) {
  return value.slice(0, 5)
}

function formatDateTime(value: string) {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha por confirmar'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

function goTo(path: string) {
  navigateTo(path)
}
</script>

<template>
  <main class="cliente-portal">
    <section v-if="loading" class="cliente-state-card">
      <h1>Cargando tu espacio lindo...</h1>
      <p>Estamos preparando la bienvenida y la informacion de tu portal.</p>
    </section>

    <section v-else-if="error" class="cliente-state-card">
      <h1>No pudimos abrir tu portal</h1>
      <p>{{ error }}</p>
      <div class="state-actions">
        <a href="/login" class="btn-secundario">Volver al acceso</a>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesion</button>
      </div>
    </section>

    <template v-else-if="payload">
      <ClientSiteHeader :current-path="currentPath" />

      <section class="cliente-hero-card">
        <div class="hero-glow hero-glow-pink"></div>
        <div class="hero-glow hero-glow-blue"></div>

        <div class="hero-main">
          <span class="cliente-pill">Bienvenida especial</span>
          <h1>{{ greeting }}</h1>
          <p class="hero-subtitle">{{ heroSubtitle }}</p>

          <div class="hero-business-card">
            <div>
              <span class="hero-section-title">Sobre la peluqueria</span>
              <h2>{{ payload.about.title }}</h2>
            </div>
            <p>{{ payload.about.description }}</p>
            <div class="hero-business-meta">
              <div>
                <strong>Ubicacion</strong>
                <span class="business-location-copy">{{ businessLocationLabel }}</span>
                <a
                  :href="businessMapsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="location-link"
                >
                  Ver en Google Maps
                </a>
              </div>
              <div>
                <strong>Mensaje</strong>
                <span>{{ payload.about.note }}</span>
              </div>
            </div>
          </div>
        </div>

        <aside class="hero-side">
          <div class="profile-card">
            <a href="/cliente/perfil" class="profile-edit-button" aria-label="Editar tus datos" @click.prevent="goTo('/cliente/perfil')">
              <span aria-hidden="true">✎</span>
            </a>
            <div class="profile-card-head">
              <div class="cliente-logo-shell">
                <img src="/img/logo.png" alt="Logo de Sweety Puppies" class="cliente-logo">
              </div>
              <div>
                <span class="profile-kicker">Tus datos</span>
                <h2>{{ payload.profile.nombre }} {{ payload.profile.apellido }}</h2>
              </div>
            </div>

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
                <strong>Cedula</strong>
                <span>{{ payload.profile.cedula }}</span>
              </div>
              <div>
                <strong>Direccion</strong>
                <span>{{ payload.profile.direccion || 'Aun no registrada' }}</span>
              </div>
            </div>
          </div>

          <div class="summary-strip">
            <div v-for="card in summaryCards" :key="card.label" class="summary-pill-card">
              <strong>{{ card.label }}</strong>
              <span class="summary-pill-value">{{ card.value }}</span>
              <small>{{ card.helper }}</small>
            </div>
          </div>
        </aside>
      </section>

      <section class="gallery-dashboard-card">
        <div class="gallery-dashboard-copy">
          <span class="cliente-section-kicker">Galeria destacada</span>
          <h2>Fotos y anuncios bonitos para nuestras familias peluditas</h2>
          <p>
            Aqui la duena podra mostrar perritos felices, promociones y novedades del negocio
            dentro de un espacio visual limpio y tierno.
          </p>

          <div class="gallery-actions" v-if="payload.images.length > 1">
            <button type="button" class="gallery-button" @click="previousImage">Anterior</button>
            <button type="button" class="gallery-button" @click="nextImage">Siguiente</button>
          </div>
        </div>

        <div v-if="currentImage" class="gallery-stage">
          <img :src="currentImage.ruta" :alt="currentImage.titulo" class="gallery-image">
          <div class="gallery-overlay-card">
            <span class="gallery-tag">{{ currentImage.categoria || 'Destacado' }}</span>
            <h3>{{ currentImage.titulo }}</h3>
            <p>{{ currentImage.descripcion || 'Una muestra del carino, cuidado y ternura que vive en cada visita.' }}</p>
          </div>
        </div>

        <div v-else class="gallery-empty">
          <p>Muy pronto veras aqui las fotos mas lindas de nuestros peluditos felices.</p>
        </div>

        <div v-if="payload.images.length" class="gallery-thumbs">
          <button
            v-for="(image, index) in payload.images.slice(0, 6)"
            :key="image.id"
            type="button"
            class="thumb-card"
            :class="{ active: index === currentImageIndex }"
            @click="currentImageIndex = index"
          >
            <img :src="image.ruta" :alt="image.titulo">
            <span>{{ image.titulo }}</span>
          </button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.cliente-portal-body {
  background:
    radial-gradient(circle at top right, rgba(255, 183, 221, 0.92), transparent 20%),
    radial-gradient(circle at 12% 18%, rgba(159, 226, 243, 0.55), transparent 18%),
    radial-gradient(circle at bottom left, rgba(167, 238, 227, 0.65), transparent 20%),
    linear-gradient(180deg, #fff8fc 0%, #ffeef7 42%, #eefafe 100%);
}

.cliente-portal {
  width: min(1440px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 24px 0 56px;
}

.cliente-state-card,
.cliente-hero-card,
.gallery-dashboard-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.cliente-state-card {
  padding: 40px;
  text-align: center;
}

.state-actions {
  margin-top: 18px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.cliente-hero-card {
  position: relative;
  overflow: hidden;
  padding: 34px;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 24px;
  align-items: start;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(6px);
  opacity: 0.7;
  pointer-events: none;
}

.hero-glow-pink {
  width: 260px;
  height: 260px;
  top: -60px;
  right: -20px;
  background: radial-gradient(circle, rgba(255, 190, 225, 0.88) 0%, rgba(255, 190, 225, 0.18) 62%, transparent 76%);
}

.hero-glow-blue {
  width: 220px;
  height: 220px;
  bottom: -72px;
  left: -48px;
  background: radial-gradient(circle, rgba(163, 228, 247, 0.78) 0%, rgba(163, 228, 247, 0.2) 58%, transparent 74%);
}

.hero-main,
.hero-side {
  position: relative;
  z-index: 1;
}

.cliente-pill,
.cliente-section-kicker,
.profile-kicker,
.gallery-tag {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: inset 0 0 0 1px rgba(156, 0, 118, 0.09);
}

.hero-main h1,
.hero-business-card h2,
.profile-card h2,
.gallery-dashboard-copy h2 {
  margin: 0 0 12px;
  color: #8f176e;
}

.hero-main h1 {
  font-size: clamp(2.4rem, 5vw, 4.2rem);
  line-height: 1;
  margin-top: 14px;
}

.hero-subtitle,
.hero-business-card p,
.gallery-dashboard-copy p,
.gallery-overlay-card p,
.gallery-empty p {
  color: #6e5064;
  line-height: 1.8;
}

.hero-business-card,
.profile-card,
.summary-pill-card,
.gallery-overlay-card {
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
  box-shadow: 0 18px 34px rgba(219, 126, 183, 0.09);
}

.hero-business-card {
  margin-top: 28px;
  padding: 26px;
  border-radius: 28px;
}

.hero-section-title {
  display: block;
  margin-bottom: 8px;
  color: #9c0076;
  font-weight: 700;
}

.hero-business-meta {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.hero-business-meta div,
.profile-grid div {
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.74);
}

.hero-business-meta strong,
.profile-grid strong,
.summary-pill-card strong {
  display: block;
  margin-bottom: 6px;
  color: #9c0076;
}

.hero-business-meta span,
.profile-grid span,
.summary-pill-card small {
  color: #6f6170;
}

.business-location-copy {
  display: block;
}

.location-link {
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  color: #0b9f93;
  font-weight: 700;
  text-decoration: none;
}

.location-link:hover {
  color: #0a8c82;
  text-decoration: underline;
}

.hero-side {
  display: grid;
  gap: 16px;
}

.profile-card {
  position: relative;
  border-radius: 28px;
  padding: 24px;
}

.profile-edit-button {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  text-decoration: none;
  background: linear-gradient(135deg, #9c0076 0%, #c94ac3 100%);
  color: #fff;
  box-shadow: 0 14px 26px rgba(156, 0, 118, 0.22);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.profile-edit-button span {
  font-size: 1.1rem;
  line-height: 1;
}

.profile-edit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 30px rgba(156, 0, 118, 0.28);
  filter: brightness(1.04);
}

.profile-card-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.cliente-logo-shell {
  width: 78px;
  height: 78px;
  border-radius: 28px;
  background: linear-gradient(145deg, rgba(255, 234, 244, 0.95) 0%, rgba(231, 248, 255, 0.95) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cliente-logo {
  width: 54px;
  height: auto;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-strip {
  display: grid;
  gap: 12px;
}

.summary-pill-card {
  border-radius: 24px;
  padding: 18px 20px;
}

.summary-pill-value {
  display: block;
  margin: 6px 0;
  font-size: 1.14rem;
  color: #4d2d47;
  font-weight: 700;
}

.gallery-dashboard-card {
  margin-top: 24px;
  padding: 30px;
}

.gallery-dashboard-copy {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.gallery-dashboard-copy > div {
  max-width: 720px;
}

.gallery-stage {
  position: relative;
  min-height: 520px;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 24px 40px rgba(214, 124, 180, 0.14);
}

.gallery-image {
  width: 100%;
  height: 520px;
  object-fit: cover;
  display: block;
}

.gallery-overlay-card {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  max-width: 520px;
  padding: 22px 24px;
  border-radius: 28px;
  backdrop-filter: blur(12px);
}

.gallery-overlay-card h3 {
  margin: 12px 0 10px;
  color: #8f176e;
  font-size: 1.5rem;
}

.gallery-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.gallery-button {
  border: none;
  background: linear-gradient(135deg, #fff2fa 0%, #edfaff 100%);
  color: #9c0076;
  border-radius: 999px;
  padding: 12px 18px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(196, 82, 154, 0.1);
}

.gallery-empty {
  padding: 28px;
  border-radius: 24px;
  background: #fff5fb;
}

.gallery-thumbs {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.thumb-card {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.thumb-card img {
  width: 100%;
  height: 112px;
  object-fit: cover;
  border-radius: 18px;
  border: 3px solid transparent;
  box-shadow: 0 10px 24px rgba(204, 115, 174, 0.14);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.thumb-card span {
  display: block;
  margin-top: 8px;
  font-size: 0.88rem;
  color: #6e5064;
}

.thumb-card.active img {
  border-color: #e95adb;
}

.thumb-card:hover img {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 16px 28px rgba(204, 115, 174, 0.18);
}

@media (max-width: 1180px) {
  .cliente-hero-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .cliente-portal {
    width: min(100vw - 24px, 100%);
    padding-top: 12px;
  }

  .gallery-dashboard-copy {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-grid,
  .hero-business-meta,
  .gallery-thumbs {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .cliente-topbar,
  .cliente-hero-card,
  .gallery-dashboard-card,
  .cliente-state-card {
    padding: 20px;
    border-radius: 24px;
  }

  .state-actions {
    flex-direction: column;
  }

  .profile-grid,
  .hero-business-meta,
  .gallery-thumbs {
    grid-template-columns: 1fr;
  }

  .gallery-stage,
  .gallery-image {
    min-height: 320px;
    height: 320px;
  }

  .gallery-overlay-card {
    left: 14px;
    right: 14px;
    bottom: 14px;
  }
}
</style>
