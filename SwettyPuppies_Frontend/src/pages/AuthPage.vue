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
    showToast('Correo y contrasena son obligatorios', 'error')
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
    showToast(error instanceof Error ? error.message : 'No se pudo iniciar sesion', 'error')
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
    showToast('Las contrasenas no coinciden', 'error')
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
    showToast('Debes escribir el codigo de verificacion', 'error')
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
    showToast(error instanceof Error ? error.message : 'No se pudo verificar el codigo', 'error')
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
    showToast('Conserva los datos del registro para regenerar el codigo', 'error')
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
    showToast(error instanceof Error ? error.message : 'No se pudo regenerar el codigo', 'error')
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
    showToast(error instanceof Error ? error.message : 'No se pudo enviar el codigo de recuperacion', 'error')
  } finally {
    recoveryRequestLoading.value = false
  }
}

async function submitRecoveryVerify() {
  if (!recoveryForm.email || !recoveryForm.codigo) {
    showToast('Debes escribir el correo y el codigo de recuperacion', 'error')
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
    showToast(error instanceof Error ? error.message : 'No se pudo verificar el codigo', 'error')
  } finally {
    recoveryVerifyLoading.value = false
  }
}

async function submitRecoveryReset() {
  if (!recoveryForm.email || !recoveryForm.codigo || !recoveryForm.password || !recoveryForm.confirmPassword) {
    showToast('Completa todos los campos para actualizar la contrasena', 'error')
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
    showToast(error instanceof Error ? error.message : 'No se pudo cambiar la contrasena', 'error')
  } finally {
    recoveryResetLoading.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <section class="auth-hero">
      <div class="auth-hero-copy">
        <img src="/img/logo.png" alt="Logo Sweety Puppies" class="auth-logo">
        <p class="auth-kicker">Sweety Puppies</p>
        <h1>Bienvenido a Sweety Puppies</h1>
        <p class="auth-subtitle">
          Un rincon tierno para consentir a tu peludito con amor, estilo y confianza.
        </p>
        <div class="auth-actions">
          <button type="button" class="auth-primary-button bounce-effect" @click="switchView('login')">
            Iniciar sesion
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

    <section class="auth-card">
      <div v-if="currentView === 'landing'" class="auth-panel">
        <span class="panel-badge">Hola</span>
        <h2>Tu proxima cita empieza aqui</h2>
        <p>
          Ingresa a tu cuenta o crea una nueva para gestionar el perfil de tu mascota con una
          experiencia dulce y segura.
        </p>
      </div>

      <div v-else-if="currentView === 'login'" class="auth-panel">
        <button type="button" class="auth-link auth-back-link" @click="switchView('landing')">Volver</button>
        <div class="auth-title">
          <h2>Iniciar sesion</h2>
        </div>
        <form class="auth-form" @submit.prevent="submitLogin">
          <div class="auth-field">
            <input id="loginEmail" v-model.trim="loginForm.email" class="auth-input" type="email" placeholder=" " required>
            <label for="loginEmail" class="auth-field-label">Correo electronico</label>
          </div>
          <div class="auth-field">
            <input id="loginPassword" v-model="loginForm.password" class="auth-input" type="password" placeholder=" " required>
            <label for="loginPassword" class="auth-field-label">Contrasena</label>
          </div>
          <div class="auth-button-stack">
            <button type="submit" class="auth-primary-button bounce-effect" :disabled="loginLoading">
              {{ loginLoading ? 'Ingresando...' : 'Entrar' }}
            </button>
          </div>
        </form>
        <p class="auth-helper">
          Todavia no tienes cuenta?
          <button type="button" class="auth-link auth-inline-link" @click="switchView('register')">
            Registrate
          </button>
        </p>
        <p class="auth-helper auth-helper-secondary">
          <button type="button" class="auth-link auth-inline-link" @click="switchView('recovery-request')">
            Olvidaste tu contrasena?
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
            <label for="cedula" class="auth-field-label">Cedula</label>
          </div>
          <div class="auth-field">
            <input id="telefono" v-model.trim="registerForm.telefono" class="auth-input" type="text" placeholder=" " required>
            <label for="telefono" class="auth-field-label">Telefono</label>
          </div>
          <div class="auth-field auth-full-width">
            <input id="registerEmail" v-model.trim="registerForm.email" class="auth-input" type="email" placeholder=" " required>
            <label for="registerEmail" class="auth-field-label">Correo electronico</label>
          </div>
          <div class="auth-field">
            <input id="registerPassword" v-model="registerForm.password" class="auth-input" type="password" placeholder=" " required>
            <label for="registerPassword" class="auth-field-label">Contrasena</label>
          </div>
          <div class="auth-field">
            <input id="confirmPassword" v-model="registerForm.confirmPassword" class="auth-input" type="password" placeholder=" " required>
            <label for="confirmPassword" class="auth-field-label">Confirmar contrasena</label>
          </div>
          <div class="auth-button-stack auth-full-width">
            <button type="submit" class="auth-primary-button bounce-effect" :disabled="registerLoading">
              {{ registerLoading ? 'Generando codigo...' : 'Generar codigo' }}
            </button>
          </div>
        </form>
      </div>

      <div v-else-if="currentView === 'verify'" class="auth-panel">
        <button type="button" class="auth-link auth-back-link" @click="switchView('register')">Editar datos</button>
        <span class="panel-badge">Verificacion</span>
        <h2>Verifica tu registro</h2>
        <p>
          Te enviamos un codigo al correo de <strong>{{ pendingEmail || verifyForm.email || 'tu correo' }}</strong>.
          Escribelo aqui para completar el registro.
        </p>

        <div v-if="showLocalCodeBox" class="local-code-box">
          <span class="local-code-label">Codigo disponible en modo local</span>
          <strong class="local-code-value">{{ developmentCode }}</strong>
          <p class="local-code-help">Este bloque aparece solo cuando el correo real entra en modo de pruebas.</p>
        </div>

        <form class="auth-form" @submit.prevent="submitVerify">
          <input v-model="verifyForm.email" type="hidden">
          <div class="auth-field">
            <input id="codigo" v-model.trim="verifyForm.codigo" class="auth-input" type="text" placeholder=" " required>
            <label for="codigo" class="auth-field-label">Codigo de verificacion</label>
          </div>
          <div class="auth-button-stack">
            <button type="submit" class="auth-primary-button bounce-effect" :disabled="verifyLoading">
              {{ verifyLoading ? 'Verificando...' : 'Verificar codigo' }}
            </button>
            <button type="button" class="auth-secondary-button" :disabled="resendLoading" @click="resendCode">
              {{ resendLoading ? 'Regenerando...' : 'Regenerar codigo' }}
            </button>
          </div>
        </form>
      </div>

      <div v-else-if="currentView === 'recovery-request'" class="auth-panel">
        <button type="button" class="auth-link auth-back-link" @click="switchView('login')">Volver</button>
        <div class="auth-title">
          <h2>Recuperar contrasena</h2>
        </div>
        <p>Escribe tu correo y te enviaremos un codigo para cambiar tu contrasena.</p>
        <form class="auth-form" @submit.prevent="submitRecoveryRequest">
          <div class="auth-field">
            <input id="recoveryEmail" v-model.trim="recoveryForm.email" class="auth-input" type="email" placeholder=" " required>
            <label for="recoveryEmail" class="auth-field-label">Correo electronico</label>
          </div>
          <div class="auth-button-stack">
            <button type="submit" class="auth-primary-button bounce-effect" :disabled="recoveryRequestLoading">
              {{ recoveryRequestLoading ? 'Enviando codigo...' : 'Enviar codigo' }}
            </button>
          </div>
        </form>
      </div>

      <div v-else-if="currentView === 'recovery-verify'" class="auth-panel">
        <button type="button" class="auth-link auth-back-link" @click="switchView('recovery-request')">Volver</button>
        <span class="panel-badge">Recuperacion</span>
        <h2>Verifica el codigo</h2>
        <p>
          Te enviamos un codigo al correo de
          <strong>{{ pendingEmail || recoveryForm.email || 'tu correo' }}</strong>.
        </p>

        <div v-if="showLocalCodeBox" class="local-code-box">
          <span class="local-code-label">Codigo disponible en modo local</span>
          <strong class="local-code-value">{{ developmentCode }}</strong>
          <p class="local-code-help">Este bloque aparece solo cuando el correo real entra en modo de pruebas.</p>
        </div>

        <form class="auth-form" @submit.prevent="submitRecoveryVerify">
          <div class="auth-field">
            <input id="recoveryCode" v-model.trim="recoveryForm.codigo" class="auth-input" type="text" placeholder=" " required>
            <label for="recoveryCode" class="auth-field-label">Codigo de recuperacion</label>
          </div>
          <div class="auth-button-stack">
            <button type="submit" class="auth-primary-button bounce-effect" :disabled="recoveryVerifyLoading">
              {{ recoveryVerifyLoading ? 'Verificando...' : 'Verificar codigo' }}
            </button>
          </div>
        </form>
      </div>

      <div v-else class="auth-panel">
        <button type="button" class="auth-link auth-back-link" @click="switchView('recovery-verify')">Volver</button>
        <span class="panel-badge">Nueva contrasena</span>
        <h2>Cambia tu contrasena</h2>
        <p>Ya puedes crear una nueva contrasena para volver a ingresar a tu cuenta.</p>
        <form class="auth-form" @submit.prevent="submitRecoveryReset">
          <div class="auth-field">
            <input id="newRecoveryPassword" v-model="recoveryForm.password" class="auth-input" type="password" placeholder=" " required>
            <label for="newRecoveryPassword" class="auth-field-label">Nueva contrasena</label>
          </div>
          <div class="auth-field">
            <input id="confirmRecoveryPassword" v-model="recoveryForm.confirmPassword" class="auth-input" type="password" placeholder=" " required>
            <label for="confirmRecoveryPassword" class="auth-field-label">Confirmar contrasena</label>
          </div>
          <div class="auth-button-stack">
            <button type="submit" class="auth-primary-button bounce-effect" :disabled="recoveryResetLoading">
              {{ recoveryResetLoading ? 'Actualizando...' : 'Actualizar contrasena' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>

  <div class="auth-toast" :class="[toastTone, { show: toastMessage }]">
    <div class="auth-toast-content">
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
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
  background: linear-gradient(to right, #9c0076, #e95adb);
  color: white;
  box-shadow: 0 14px 30px rgba(233, 90, 219, 0.18);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.auth-primary-button:hover {
  background: linear-gradient(to right, #cc0099, #ff6ed8);
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
  .auth-card {
    z-index: 10;
  }

  .auth-grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>
