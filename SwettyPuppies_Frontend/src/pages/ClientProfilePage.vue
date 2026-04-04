<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { apiGet, apiPatch } from '@/lib/api'
import { navigateTo } from '@/lib/navigation'
import { logoutToLogin, requireRole } from '@/lib/session'
import ClientSiteHeader from '@/components/ClientSiteHeader.vue'

type ProfileResponse = {
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
}

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const successMessage = ref('')
const profile = ref<ProfileResponse['profile'] | null>(null)
const currentPath = window.location.pathname.toLowerCase()

const form = reactive({
  telefono: '',
  direccion: '',
})

const displayName = computed(() => {
  if (!profile.value) {
    return 'Mi perfil'
  }

  return `${profile.value.nombre} ${profile.value.apellido}`
})

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('cliente')
  if (!session) {
    loading.value = false
    return
  }

  try {
    const data = await apiGet<ProfileResponse>('/api/auth/me/profile')
    profile.value = data.profile
    form.telefono = data.profile.telefono || ''
    form.direccion = data.profile.direccion || ''
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar tu perfil'
  } finally {
    loading.value = false
  }
})

async function saveProfile() {
  if (saving.value) {
    return
  }

  error.value = ''
  successMessage.value = ''
  saving.value = true

  try {
    const data = await apiPatch<ProfileResponse & { message: string }>('/api/auth/me/profile', {
      telefono: form.telefono,
      direccion: form.direccion,
    })

    profile.value = data.profile
    form.telefono = data.profile.telefono || ''
    form.direccion = data.profile.direccion || ''
    successMessage.value = data.message
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el perfil'
  } finally {
    saving.value = false
  }
}

function goTo(path: string) {
  navigateTo(path)
}
</script>

<template>
  <main class="profile-page">
    <section v-if="loading" class="profile-shell profile-state">
      <h1>Cargando tu perfil bonito...</h1>
      <p>Estamos preparando tus datos para que los edites con tranquilidad.</p>
    </section>

    <section v-else-if="error && !profile" class="profile-shell profile-state">
      <h1>No pudimos abrir tu perfil</h1>
      <p>{{ error }}</p>
      <div class="profile-actions">
        <a href="/cliente" class="btn-secundario" @click.prevent="goTo('/cliente')">Ir a inicio</a>
        <button type="button" class="btn-enviar" @click="logoutToLogin">Cerrar sesion</button>
      </div>
    </section>

    <template v-else-if="profile">
      <ClientSiteHeader :current-path="currentPath" />

      <section class="profile-shell profile-hero">
        <span class="profile-pill">Mi perfil</span>
        <h1>{{ displayName }}</h1>
        <p>
          Aqui puedes mantener actualizados tus datos de contacto para que Sweety Puppies
          tenga siempre la informacion correcta cuando necesitemos comunicarnos contigo.
        </p>
      </section>

      <section class="profile-grid">
        <article class="profile-shell profile-info-card">
          <span class="profile-pill subtle">Datos registrados</span>
          <div class="readonly-grid">
            <div>
              <strong>Nombre</strong>
              <span>{{ profile.nombre }}</span>
            </div>
            <div>
              <strong>Apellido</strong>
              <span>{{ profile.apellido }}</span>
            </div>
            <div>
              <strong>Correo</strong>
              <span>{{ profile.email }}</span>
            </div>
            <div>
              <strong>Cedula</strong>
              <span>{{ profile.cedula }}</span>
            </div>
          </div>
          <p class="profile-note">
            Nombre, apellido, correo y cedula se mantienen bloqueados por ahora para conservar
            la consistencia de tu registro. En esta etapa puedes actualizar telefono y direccion.
          </p>
        </article>

        <article class="profile-shell profile-form-card">
          <span class="profile-pill">Editar contacto</span>
          <h2>Actualiza tu telefono y direccion</h2>

          <form class="profile-form" @submit.prevent="saveProfile">
            <label class="field-block">
              <span>Telefono</span>
              <input
                v-model.trim="form.telefono"
                type="text"
                name="telefono"
                placeholder="Escribe tu telefono"
                maxlength="20"
              >
            </label>

            <label class="field-block">
              <span>Direccion</span>
              <textarea
                v-model.trim="form.direccion"
                name="direccion"
                rows="4"
                placeholder="Agrega tu direccion para futuras visitas o contacto"
                maxlength="180"
              />
            </label>

            <p v-if="error" class="feedback error">{{ error }}</p>
            <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>

            <div class="profile-actions">
              <a href="/cliente" class="btn-secundario" @click.prevent="goTo('/cliente')">Inicio</a>
              <button type="submit" class="btn-enviar" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.profile-page {
  width: min(1220px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.profile-shell {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.profile-state {
  padding: 40px;
  text-align: center;
}

.profile-hero {
  padding: 32px;
}

.profile-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff1f9 0%, #eefafe 100%);
  color: #9c0076;
  font-weight: 700;
  font-size: 0.86rem;
  box-shadow: inset 0 0 0 1px rgba(156, 0, 118, 0.09);
}

.profile-pill.subtle {
  margin-bottom: 16px;
}

.profile-hero h1,
.profile-form-card h2 {
  margin: 14px 0 12px;
  color: #8f176e;
}

.profile-hero p,
.profile-note,
.feedback {
  color: #6e5064;
  line-height: 1.8;
}

.profile-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  gap: 22px;
}

.profile-info-card,
.profile-form-card {
  padding: 30px;
}

.readonly-grid {
  display: grid;
  gap: 12px;
}

.readonly-grid div {
  padding: 16px 18px;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.92) 52%, rgba(238, 250, 255, 0.95) 100%);
  border: 1px solid rgba(243, 209, 230, 0.92);
}

.readonly-grid strong {
  display: block;
  margin-bottom: 6px;
  color: #9c0076;
}

.readonly-grid span {
  color: #6f6170;
}

.profile-note {
  margin-top: 18px;
}

.profile-form {
  margin-top: 18px;
}

.field-block {
  display: block;
  margin-bottom: 18px;
}

.field-block span {
  display: block;
  margin-bottom: 8px;
  color: #8f176e;
  font-weight: 700;
}

.field-block input,
.field-block textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 15px 16px;
  border-radius: 18px;
  border: 1px solid rgba(243, 181, 221, 0.95);
  background: rgba(255, 255, 255, 0.96);
  color: #5d4354;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.98rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-block input:focus,
.field-block textarea:focus {
  border-color: #d85ac7;
  box-shadow: 0 0 0 4px rgba(232, 120, 206, 0.14);
}

.feedback {
  margin: 4px 0 14px;
  font-weight: 600;
}

.feedback.error {
  color: #cc3f84;
}

.feedback.success {
  color: #0b9f93;
}

.profile-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

@media (max-width: 920px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .profile-hero,
  .profile-info-card,
  .profile-form-card,
  .profile-state {
    padding: 22px;
    border-radius: 24px;
  }

  .profile-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
