<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { apiPost } from '@/lib/api'
import { getSession, setSession } from '@/lib/session'

type AuthView = 'landing' | 'login' | 'register' | 'verify' | 'recovery-request' | 'recovery-verify' | 'recovery-reset'
type ToastTone = 'info' | 'success' | 'error'

type LoginResponse = {
  success: boolean
  message: string
  token: string
  redirectTo: string
  user: {
    id: string
    email: string
    rol: string
    nombre?: string
    apellido?: string
    clienteId?: string | null
    administradorId?: string | null
  }
}

type InitiateRegistrationResponse = {
  success: boolean
  message: string
  email: string
  expiresAt: string
  developmentCode: string | null
  emailDeliveryMode: 'sent' | 'fallback'
}

type VerifyRegistrationResponse = {
  success: boolean
  message: string
}

type PasswordRecoveryResponse = {
  success: boolean
  message: string
  email?: string
  developmentCode?: string | null
}

const currentView = ref<AuthView>('landing')
const toastMessage = ref('')
const toastTone = ref<ToastTone>('info')
const loginLoading = ref(false)
const registerLoading = ref(false)
const verifyLoading = ref(false)
const resendLoading = ref(false)
const recoveryRequestLoading = ref(false)
const recoveryVerifyLoading = ref(false)
const recoveryResetLoading = ref(false)
const pendingEmail = ref('')
const developmentCode = ref<string | null>(null)

const loginForm = reactive({
  email: '',
  password: '',
})

const registerForm = reactive({
  nombre: '',
  apellido: '',
  cedula: '',
  telefono: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const verifyForm = reactive({
  email: '',
  codigo: '',
})

const recoveryForm = reactive({
  email: '',
  codigo: '',
  password: '',
  confirmPassword: '',
})

const showLocalCodeBox = computed(() => Boolean(developmentCode.value))

onMounted(() => {
  document.body.className = 'auth-body'
  const session = getSession()
  if (session) {
    window.location.href = session.userData.rol === 'administrador' ? '/admin' : '/cliente'
  }
})

onUnmounted(() => {
  document.body.className = ''
})

function switchView(view: AuthView) {
  currentView.value = view
}

function showToast(message: string, tone: ToastTone = 'info') {
  toastMessage.value = message
  toastTone.value = tone

  window.setTimeout(() => {
    if (toastMessage.value === message) {
      toastMessage.value = ''
    }
  }, 3600)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function clearRegisterState() {
  pendingEmail.value = ''
  developmentCode.value = null
  verifyForm.email = ''
  verifyForm.codigo = ''
}

function clearRecoveryState() {
  pendingEmail.value = ''
  developmentCode.value = null
  recoveryForm.email = ''
  recoveryForm.codigo = ''
  recoveryForm.password = ''
  recoveryForm.confirmPassword = ''
}

async function submitLogin() {
  if (!loginForm.email || !loginForm.password) {
    showToast('Correo y contraseña son obligatorios', 'error')
    return
  }

  loginLoading.value = true

  try {
    const data = await apiPost<LoginResponse>('/api/auth/login', loginForm)
    setSession(data.token, data.user)
    showToast(data.message, 'success')

    window.setTimeout(() => {
      window.location.href = data.redirectTo || (data.user.rol === 'administrador' ? '/admin' : '/cliente')
    }, 650)
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo iniciar sesión', 'error')
  } finally {
    loginLoading.value = false
  }
}

async function submitRegister() {
  if (
    !registerForm.nombre ||
    !registerForm.apellido ||
    !registerForm.cedula ||
    !registerForm.telefono ||
    !registerForm.email ||
    !registerForm.password ||
    !registerForm.confirmPassword
  ) {
    showToast('Completa todos los campos del registro', 'error')
    return
  }

  if (!isValidEmail(registerForm.email)) {
    showToast('Escribe un correo valido', 'error')
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error')
    return
  }

  registerLoading.value = true

  try {
    const data = await apiPost<InitiateRegistrationResponse>('/api/auth/register/initiate', registerForm)
    pendingEmail.value = data.email
    developmentCode.value = data.developmentCode
    verifyForm.email = data.email
    verifyForm.codigo = ''
    switchView('verify')
    showToast(data.message, 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo iniciar el registro', 'error')
  } finally {
    registerLoading.value = false
  }
}

async function submitVerify() {
  if (!verifyForm.email || !verifyForm.codigo) {
    showToast('Debes escribir el código de verificación', 'error')
    return
  }

  verifyLoading.value = true

  try {
    const data = await apiPost<VerifyRegistrationResponse>('/api/auth/register/verify', verifyForm)
    loginForm.email = verifyForm.email
    loginForm.password = ''
    clearRegisterState()
    switchView('login')
    showToast(data.message, 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo verificar el código', 'error')
  } finally {
    verifyLoading.value = false
  }
}

async function resendCode() {
  if (
    !registerForm.nombre ||
    !registerForm.apellido ||
    !registerForm.cedula ||
    !registerForm.telefono ||
    !registerForm.email ||
    !registerForm.password ||
    !registerForm.confirmPassword
  ) {
    switchView('register')
    showToast('Conserva los datos del registro para regenerar el código', 'error')
    return
  }

  resendLoading.value = true

  try {
    const data = await apiPost<InitiateRegistrationResponse>('/api/auth/register/initiate', registerForm)
    pendingEmail.value = data.email
    developmentCode.value = data.developmentCode
    verifyForm.email = data.email
    verifyForm.codigo = ''
    switchView('verify')
    showToast(data.message, 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo regenerar el código', 'error')
  } finally {
    resendLoading.value = false
  }
}

async function submitRecoveryRequest() {
  if (!recoveryForm.email || !isValidEmail(recoveryForm.email)) {
    showToast('Debes escribir un correo valido', 'error')
    return
  }

  recoveryRequestLoading.value = true

  try {
    const data = await apiPost<PasswordRecoveryResponse>('/api/auth/password-recovery/request', {
      email: recoveryForm.email,
    })
    pendingEmail.value = data.email || recoveryForm.email
    recoveryForm.email = data.email || recoveryForm.email
    recoveryForm.codigo = ''
    developmentCode.value = data.developmentCode || null
    currentView.value = 'recovery-verify'
    showToast(data.message, 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo enviar el código de recuperación', 'error')
  } finally {
    recoveryRequestLoading.value = false
  }
}

async function submitRecoveryVerify() {
  if (!recoveryForm.email || !recoveryForm.codigo) {
    showToast('Debes escribir el correo y el código de recuperación', 'error')
    return
  }

  recoveryVerifyLoading.value = true

  try {
    const data = await apiPost<PasswordRecoveryResponse>('/api/auth/password-recovery/verify', {
      email: recoveryForm.email,
      codigo: recoveryForm.codigo,
    })
    currentView.value = 'recovery-reset'
    showToast(data.message, 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo verificar el código', 'error')
  } finally {
    recoveryVerifyLoading.value = false
  }
}

async function submitRecoveryReset() {
  if (!recoveryForm.email || !recoveryForm.codigo || !recoveryForm.password || !recoveryForm.confirmPassword) {
    showToast('Completa todos los campos para actualizar la contraseña', 'error')
    return
  }

  recoveryResetLoading.value = true

  try {
    const data = await apiPost<PasswordRecoveryResponse>('/api/auth/password-recovery/reset', {
      email: recoveryForm.email,
      codigo: recoveryForm.codigo,
      password: recoveryForm.password,
      confirmPassword: recoveryForm.confirmPassword,
    })
    loginForm.email = recoveryForm.email
    loginForm.password = ''
    clearRecoveryState()
    currentView.value = 'login'
    showToast(data.message, 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña', 'error')
  } finally {
    recoveryResetLoading.value = false
  }
}
</script>

<template>
  <div class="auth-shell" :class="{ 'auth-shell-split': currentView !== 'landing' }">
    <section class="auth-hero">
      <div class="auth-hero-copy">
        <img src="/img/logo.png" alt="Logo Sweety Puppies" class="auth-logo">
        <h1>Bienvenido a Sweety Puppies</h1>
        <p class="auth-subtitle">
          Un rincón tierno para consentir a tu peludito con amor, estilo y confianza.
        </p>
        <div class="auth-hero-points">
          <div class="auth-hero-point">
            <strong>Clientes</strong>
            <span>Perfil, mascotas, citas e historial en un solo lugar.</span>
          </div>
          <div class="auth-hero-point">
            <strong>Administración</strong>
            <span>Agenda, contenido, reportes y operación diaria del negocio.</span>
          </div>
        </div>
        <div class="auth-actions">
          <button type="button" class="auth-primary-button" @click="switchView('login')">
            Iniciar Sesión
          </button>
          <button type="button" class="auth-secondary-button" @click="switchView('register')">
            Registrarse
          </button>
        </div>
      </div>
      <div class="auth-decoration">
        <div class="paw paw-one"></div>
        <div class="paw paw-two"></div>
        <div class="paw paw-three"></div>
      </div>
    </section>

    <Transition name="auth-panel-slide">
      <section v-if="currentView !== 'landing'" class="auth-card">
        <div v-if="currentView === 'login'" class="auth-panel">
          <button type="button" class="auth-link auth-back-link" @click="switchView('landing')">Volver</button>
          <div class="auth-title">
            <h2>Iniciar sesión</h2>
          </div>
          <form class="auth-form" @submit.prevent="submitLogin">
            <div class="auth-field">
              <input id="loginEmail" v-model.trim="loginForm.email" class="auth-input" type="email" placeholder=" " required>
              <label for="loginEmail" class="auth-field-label">Correo electronico</label>
            </div>
            <div class="auth-field">
              <input id="loginPassword" v-model="loginForm.password" class="auth-input" type="password" placeholder=" " required>
              <label for="loginPassword" class="auth-field-label">Contraseña</label>
            </div>
            <div class="auth-button-stack">
              <button type="submit" class="auth-primary-button" :disabled="loginLoading">
                {{ loginLoading ? 'Ingresando...' : 'Entrar' }}
              </button>
            </div>
          </form>
          <p class="auth-helper">
            Todavía no tienes cuenta?
            <button type="button" class="auth-link auth-inline-link" @click="switchView('register')">
              Regístrate
            </button>
          </p>
          <p class="auth-helper auth-helper-secondary">
            <button type="button" class="auth-link auth-inline-link" @click="switchView('recovery-request')">
            Olvidaste tu contraseña?
            </button>
          </p>
        </div>

        <div v-else-if="currentView === 'register'" class="auth-panel">
          <button type="button" class="auth-link auth-back-link" @click="switchView('landing')">Volver</button>
          <div class="auth-title">
            <h2>Registro de cliente</h2>
          </div>
          <form class="auth-form auth-grid-layout" @submit.prevent="submitRegister">
            <div class="auth-field">
              <input id="nombre" v-model.trim="registerForm.nombre" class="auth-input" type="text" placeholder=" " required>
              <label for="nombre" class="auth-field-label">Nombre</label>
            </div>
            <div class="auth-field">
              <input id="apellido" v-model.trim="registerForm.apellido" class="auth-input" type="text" placeholder=" " required>
              <label for="apellido" class="auth-field-label">Apellido</label>
            </div>
            <div class="auth-field">
              <input id="cedula" v-model.trim="registerForm.cedula" class="auth-input" type="text" placeholder=" " required>
            <label for="cedula" class="auth-field-label">Cédula</label>
            </div>
            <div class="auth-field">
              <input id="telefono" v-model.trim="registerForm.telefono" class="auth-input" type="text" placeholder=" " required>
            <label for="telefono" class="auth-field-label">Teléfono</label>
            </div>
            <div class="auth-field auth-full-width">
              <input id="registerEmail" v-model.trim="registerForm.email" class="auth-input" type="email" placeholder=" " required>
              <label for="registerEmail" class="auth-field-label">Correo electronico</label>
            </div>
            <div class="auth-field">
              <input id="registerPassword" v-model="registerForm.password" class="auth-input" type="password" placeholder=" " required>
              <label for="registerPassword" class="auth-field-label">Contraseña</label>
            </div>
            <div class="auth-field">
              <input id="confirmPassword" v-model="registerForm.confirmPassword" class="auth-input" type="password" placeholder=" " required>
              <label for="confirmPassword" class="auth-field-label">Confirmar contraseña</label>
            </div>
            <div class="auth-button-stack auth-full-width">
              <button type="submit" class="auth-primary-button" :disabled="registerLoading">
                {{ registerLoading ? 'Generando código...' : 'Generar código' }}
              </button>
            </div>
          </form>
        </div>

        <div v-else-if="currentView === 'verify'" class="auth-panel">
          <button type="button" class="auth-link auth-back-link" @click="switchView('register')">Editar datos</button>
          <span class="panel-badge">Verificación</span>
          <h2>Verifica tu registro</h2>
          <p>
            Te enviamos un código al correo de <strong>{{ pendingEmail || verifyForm.email || 'tu correo' }}</strong>.
            Escríbelo aquí para completar el registro.
          </p>

          <div v-if="showLocalCodeBox" class="local-code-box">
            <span class="local-code-label">Código disponible en modo local</span>
            <strong class="local-code-value">{{ developmentCode }}</strong>
            <p class="local-code-help">Este bloque aparece solo cuando el correo real entra en modo de pruebas.</p>
          </div>

          <form class="auth-form" @submit.prevent="submitVerify">
            <input v-model="verifyForm.email" type="hidden">
            <div class="auth-field">
              <input id="codigo" v-model.trim="verifyForm.codigo" class="auth-input" type="text" placeholder=" " required>
              <label for="codigo" class="auth-field-label">Código de verificación</label>
            </div>
            <div class="auth-button-stack">
              <button type="submit" class="auth-primary-button" :disabled="verifyLoading">
                {{ verifyLoading ? 'Verificando...' : 'Verificar código' }}
              </button>
              <button type="button" class="auth-secondary-button" :disabled="resendLoading" @click="resendCode">
                {{ resendLoading ? 'Regenerando...' : 'Regenerar código' }}
              </button>
            </div>
          </form>
        </div>

        <div v-else-if="currentView === 'recovery-request'" class="auth-panel">
          <button type="button" class="auth-link auth-back-link" @click="switchView('login')">Volver</button>
          <div class="auth-title">
            <h2>Recuperar contraseña</h2>
          </div>
          <p>Escribe tu correo y te enviaremos un código para cambiar tu contraseña.</p>
          <form class="auth-form" @submit.prevent="submitRecoveryRequest">
            <div class="auth-field">
              <input id="recoveryEmail" v-model.trim="recoveryForm.email" class="auth-input" type="email" placeholder=" " required>
              <label for="recoveryEmail" class="auth-field-label">Correo electronico</label>
            </div>
            <div class="auth-button-stack">
              <button type="submit" class="auth-primary-button" :disabled="recoveryRequestLoading">
                {{ recoveryRequestLoading ? 'Enviando código...' : 'Enviar código' }}
              </button>
            </div>
          </form>
        </div>

        <div v-else-if="currentView === 'recovery-verify'" class="auth-panel">
          <button type="button" class="auth-link auth-back-link" @click="switchView('recovery-request')">Volver</button>
          <span class="panel-badge">Recuperación</span>
          <h2>Verifica el código</h2>
          <p>
            Te enviamos un código al correo de
            <strong>{{ pendingEmail || recoveryForm.email || 'tu correo' }}</strong>.
          </p>

          <div v-if="showLocalCodeBox" class="local-code-box">
            <span class="local-code-label">Código disponible en modo local</span>
            <strong class="local-code-value">{{ developmentCode }}</strong>
            <p class="local-code-help">Este bloque aparece solo cuando el correo real entra en modo de pruebas.</p>
          </div>

          <form class="auth-form" @submit.prevent="submitRecoveryVerify">
            <div class="auth-field">
              <input id="recoveryCode" v-model.trim="recoveryForm.codigo" class="auth-input" type="text" placeholder=" " required>
              <label for="recoveryCode" class="auth-field-label">Código de recuperación</label>
            </div>
            <div class="auth-button-stack">
              <button type="submit" class="auth-primary-button" :disabled="recoveryVerifyLoading">
                {{ recoveryVerifyLoading ? 'Verificando...' : 'Verificar código' }}
              </button>
            </div>
          </form>
        </div>

        <div v-else class="auth-panel">
          <button type="button" class="auth-link auth-back-link" @click="switchView('recovery-verify')">Volver</button>
          <span class="panel-badge">Nueva contraseña</span>
          <h2>Cambia tu contraseña</h2>
          <p>Ya puedes crear una nueva contraseña para volver a ingresar a tu cuenta.</p>
          <form class="auth-form" @submit.prevent="submitRecoveryReset">
            <div class="auth-field">
              <input id="newRecoveryPassword" v-model="recoveryForm.password" class="auth-input" type="password" placeholder=" " required>
              <label for="newRecoveryPassword" class="auth-field-label">Nueva contraseña</label>
            </div>
            <div class="auth-field">
              <input id="confirmRecoveryPassword" v-model="recoveryForm.confirmPassword" class="auth-input" type="password" placeholder=" " required>
              <label for="confirmRecoveryPassword" class="auth-field-label">Confirmar contraseña</label>
            </div>
            <div class="auth-button-stack">
              <button type="submit" class="auth-primary-button" :disabled="recoveryResetLoading">
                {{ recoveryResetLoading ? 'Actualizando...' : 'Actualizar contraseña' }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </Transition>
  </div>

  <div class="auth-toast" :class="[toastTone, { show: toastMessage }]">
    <div class="auth-toast-content">
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
  display: block;
  background:
    radial-gradient(circle at top center, rgba(116, 245, 220, 0.08), transparent 18%),
    radial-gradient(circle at bottom right, rgba(255, 184, 224, 0.12), transparent 20%),
    linear-gradient(180deg, #b852a5 0%, #ab4a9b 100%);
}

.auth-shell.auth-shell-split {
  display: grid;
  grid-template-columns: minmax(460px, 1.1fr) minmax(420px, 0.9fr);
}

.auth-hero,
.auth-card {
  overflow: hidden;
}

.auth-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px 48px;
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
  color: #fff;
}

.auth-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: none;
  pointer-events: none;
}

.auth-hero-copy {
  position: relative;
  z-index: 2;
  max-width: 820px;
  text-align: center;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.auth-logo {
  width: min(420px, 90%);
  height: auto;
  margin: 0 auto 2px;
  filter: drop-shadow(0 22px 34px rgba(0, 0, 0, 0.18));
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.auth-hero h1,
.auth-panel h2 {
  margin: 0;
}

.auth-hero h1 {
  font-size: clamp(2.95rem, 4.35vw, 4.7rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: #fff;
  max-width: 780px;
}

.auth-subtitle {
  margin: 0 auto;
  max-width: 560px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 1rem;
  line-height: 1.65;
}

.auth-hero-points {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 8px auto 0;
  max-width: 660px;
}

.auth-hero-point {
  padding: 14px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.auth-hero-point strong,
.auth-hero-point span {
  display: block;
}

.auth-hero-point strong {
  margin-bottom: 8px;
  font-size: 0.98rem;
}

.auth-hero-point span {
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
  font-size: 0.94rem;
}

.auth-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: 2px;
}

.auth-actions .auth-primary-button,
.auth-actions .auth-secondary-button {
  min-width: 210px;
  background: rgba(255, 246, 251, 0.96);
  color: #9c0076;
  box-shadow: 0 16px 28px rgba(120, 38, 105, 0.12);
}

.auth-actions .auth-primary-button:hover,
.auth-actions .auth-secondary-button:hover {
  background: #fff;
  color: #8d006d;
  transform: translateY(-1px);
}

.auth-card {
  position: relative;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44px 38px;
  background: rgba(255, 255, 255, 0.96);
  border-left: 2px solid rgba(156, 0, 118, 0.34);
  box-shadow: -12px 0 32px rgba(97, 33, 93, 0.08);
}

:global(body.auth-body) {
  margin: 0;
  background:
    radial-gradient(circle at top center, rgba(116, 245, 220, 0.08), transparent 18%),
    radial-gradient(circle at bottom right, rgba(255, 184, 224, 0.12), transparent 20%),
    linear-gradient(180deg, #b852a5 0%, #ab4a9b 100%);
}

.auth-card,
.auth-panel,
.auth-form,
.auth-field,
.auth-button-stack,
.auth-helper,
.auth-actions,
.auth-title,
.auth-toast {
  position: relative;
}

.auth-card {
  isolation: isolate;
  z-index: 2;
}

.auth-panel {
  width: 100%;
  max-width: 460px;
  z-index: 3;
}

.auth-shell-split .auth-hero {
  justify-content: flex-start;
}

.auth-shell-split .auth-hero-copy {
  max-width: 720px;
  text-align: left;
  margin: 0;
  align-items: flex-start;
}

.auth-shell-split .auth-logo {
  width: min(270px, 58%);
  margin: 0 0 14px;
}

.auth-shell-split .auth-subtitle {
  margin-left: 0;
  margin-right: 0;
}

.auth-shell-split .auth-hero-points {
  margin-left: 0;
  margin-right: 0;
}

.auth-shell-split .auth-actions {
  justify-content: flex-start;
}

.auth-panel-slide-enter-active,
.auth-panel-slide-leave-active {
  transition: opacity 0.34s ease, transform 0.34s ease;
}

.auth-panel-slide-enter-from,
.auth-panel-slide-leave-to {
  opacity: 0;
  transform: translateX(48px) scale(0.98);
}

.auth-title {
  text-align: center;
  margin-bottom: 30px;
}

.auth-title h2 {
  color: #9c0076;
  position: relative;
  display: inline-block;
  margin: 0;
}

.auth-title h2::after {
  content: '';
  display: block;
  width: 100%;
  height: 2px;
  background-color: #000;
  margin-top: 5px;
}

.auth-form {
  max-width: 500px;
  margin: 0 auto;
  z-index: 4;
}

.auth-grid-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.auth-full-width {
  grid-column: 1 / -1;
}

.auth-field {
  position: relative;
  margin-bottom: 25px;
  z-index: 5;
}

.auth-input {
  width: 100%;
  padding: 16px 18px;
  border: 2px solid #f1b1dc;
  border-radius: 14px;
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  background-color: rgba(255, 255, 255, 0.92);
  transition: all 0.3s ease;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}

.auth-input:focus {
  outline: none;
  border-color: #9c0076;
  box-shadow: 0 0 0 4px rgba(233, 90, 219, 0.12);
}

.auth-field-label {
  position: absolute;
  top: 16px;
  left: 18px;
  color: #9c0076;
  font-size: 16px;
  transition: all 0.3s ease;
  pointer-events: none;
  background-color: transparent;
  padding: 0 4px;
  z-index: 3;
}

.auth-input:focus + .auth-field-label,
.auth-input:not(:placeholder-shown) + .auth-field-label {
  top: -10px;
  left: 12px;
  font-size: 12px;
  background-color: #fff7fc;
}

.auth-input::placeholder {
  color: transparent;
}

.auth-button-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  z-index: 5;
}

.auth-primary-button,
.auth-secondary-button,
.auth-link {
  font-family: 'Montserrat', sans-serif;
  cursor: pointer;
}

.auth-primary-button,
.auth-secondary-button {
  width: 100%;
  min-height: 56px;
  border: none;
  border-radius: 999px;
  padding: 15px 24px;
  font-size: 16px;
  font-weight: 700;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.auth-primary-button {
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  color: white;
  box-shadow: 0 14px 30px var(--sp-primary-shadow);
}

.auth-primary-button:hover {
  background: linear-gradient(135deg, var(--sp-primary-purple-hover) 0%, var(--sp-primary-purple-hover-deep) 100%);
  transform: translateY(-1px);
}

.auth-secondary-button {
  background: #fff0f8;
  color: #9c0076;
  box-shadow: inset 0 0 0 1px rgba(156, 0, 118, 0.16);
}

.auth-actions .auth-primary-button,
.auth-actions .auth-secondary-button {
  width: auto;
}

.auth-link {
  border: none;
  background: none;
  color: #9c0076;
  padding: 0;
  font-weight: 600;
  text-decoration: none;
}

.auth-back-link {
  margin-bottom: 20px;
}

.auth-helper {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: #69465f;
  font-size: 1rem;
}

.auth-helper-secondary {
  margin-top: 8px;
}

.auth-inline-link {
  display: inline-flex;
  align-items: center;
}

.auth-decoration,
.paw {
  z-index: 0;
}

.auth-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.paw {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 184, 224, 0.38) 0%, rgba(255, 184, 224, 0.12) 58%, transparent 72%);
  filter: blur(2px);
}

.paw-one {
  top: -30px;
  right: 32px;
}

.paw-two {
  bottom: 52px;
  right: -24px;
}

.paw-three {
  bottom: -36px;
  left: 38%;
}

.auth-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%) translateY(120px);
  background: linear-gradient(to right, #9c0076, #e95adb);
  color: #fff;
  padding: 14px 22px;
  border-radius: 999px;
  box-shadow: 0 18px 30px rgba(156, 0, 118, 0.2);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 1000;
  max-width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}

.auth-toast.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.auth-toast.error {
  background: linear-gradient(to right, #da3d8b, #f26c9e);
}

.auth-toast.success {
  background: linear-gradient(to right, #00bfa6, #53d9b8);
}

.auth-toast-content {
  text-align: center;
  font-weight: 600;
  line-height: 1.4;
}

@media (max-width: 960px) {
  .auth-shell {
    padding: 0;
  }

  .auth-shell.auth-shell-split {
    display: block;
  }

  .auth-hero {
    min-height: auto;
    padding: 30px 24px 250px;
  }

  .auth-logo {
    width: min(280px, 80%);
  }

  .auth-hero-points {
    grid-template-columns: 1fr;
  }

  .auth-card {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 16px;
    padding: 34px 24px;
    border-radius: 28px;
    border-left: none;
    border-top: 2px solid rgba(156, 0, 118, 0.18);
    box-shadow: 0 24px 60px rgba(151, 70, 136, 0.16);
  }

  .auth-card {
    z-index: 10;
  }

  .auth-grid-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .auth-hero h1 {
    font-size: 2.25rem;
  }

  .auth-hero-copy {
    text-align: left;
  }

  .auth-logo,
  .auth-subtitle,
  .auth-hero-points {
    margin-left: 0;
    margin-right: 0;
  }

  .auth-actions {
    justify-content: flex-start;
  }

  .auth-actions .auth-primary-button,
  .auth-actions .auth-secondary-button {
    width: 100%;
    min-width: 0;
  }
}
</style>
