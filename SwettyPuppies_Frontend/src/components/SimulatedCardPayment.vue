<script setup lang="ts">
import { computed, ref } from 'vue'
import { money } from '@/lib/store'
defineProps<{ busy: boolean; total: number }>()
const emit = defineEmits<{ pay: [result: string] }>()
const holder = ref(''), number = ref(''), expiry = ref(''), cvv = ref(''), error = ref('')
const digits = computed(() => number.value.replace(/\s/g, ''))
function demo(rejected = false) {
  holder.value = 'CLIENTE DE PRUEBA'
  number.value = rejected ? '4000 0000 0000 0002' : '4242 4242 4242 4242'
  expiry.value = `12/${String(new Date().getFullYear() + 1).slice(-2)}`
  cvv.value = '123'
  error.value = ''
}
function submit() {
  error.value = ''
  if (!['4242424242424242', '4000000000000002'].includes(digits.value)) {
    error.value = 'Usa una de las tarjetas de prueba indicadas. No se aceptan tarjetas reales.'
    return
  }
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry.value)
  if (!match || new Date(2000 + Number(match[2]), Number(match[1]), 1) <= new Date()) {
    error.value = 'Escribe una fecha vigente con formato MM/AA.'
    return
  }
  if (holder.value.trim().length < 3 || !/^\d{3}$/.test(cvv.value)) {
    error.value = 'Completa el titular de prueba y el código de tres dígitos.'
    return
  }
  const result = digits.value === '4242424242424242' ? 'aprobado' : 'rechazado'
  cvv.value = ''
  emit('pay', result)
}
</script>

<template>
  <form class="card-payment" autocomplete="off" @submit.prevent="submit">
    <div class="demo-card" aria-hidden="true">
      <div class="card-heading"><span>SWEETY PAY</span><span>DEMO</span></div>
      <span class="card-chip">▦</span>
      <strong class="card-number">•••• •••• •••• {{ digits.slice(-4) || '••••' }}</strong>
      <div class="card-heading"><span>{{ holder || 'TITULAR DE PRUEBA' }}</span><span>{{ expiry || 'MM/AA' }}</span></div>
    </div>
    <p class="store-notice">Entorno de prueba · Sin cobros. Usa únicamente las tarjetas de demostración. Los datos del formulario no se envían ni se guardan.</p>
    <div class="store-actions">
      <button type="button" class="secondary" :disabled="busy" @click="demo()">Cargar tarjeta aprobada</button>
      <button type="button" class="secondary" :disabled="busy" @click="demo(true)">Cargar tarjeta rechazada</button>
    </div>
    <fieldset :disabled="busy">
      <label>Titular de prueba<input v-model="holder" required minlength="3" maxlength="60" placeholder="CLIENTE DE PRUEBA" /></label>
      <label>Número de tarjeta de prueba<input v-model="number" required inputmode="numeric" maxlength="19" placeholder="4242 4242 4242 4242" /></label>
      <div class="card-fields">
        <label>Vencimiento<input v-model="expiry" required inputmode="numeric" maxlength="5" placeholder="MM/AA" /></label>
        <label>CVV de prueba<input v-model="cvv" required type="password" inputmode="numeric" maxlength="3" placeholder="123" /></label>
      </div>
      <p v-if="error" role="alert" class="store-error">{{ error }}</p>
      <button class="pay-submit" :disabled="busy">{{ busy ? 'Procesando pago…' : `Pagar ${money(total)} · simulación` }}</button>
    </fieldset>
    <button type="button" class="secondary" :disabled="busy" @click="emit('pay', 'cancelado')">Cancelar simulación</button>
  </form>
</template>

<style scoped>
.card-payment { display: grid; gap: 16px; margin-top: 20px; }
.demo-card { padding: 24px; border-radius: 22px; background: radial-gradient(ellipse at top right, #a23594, transparent 75%), linear-gradient(130deg, #271532, #57215c); color: #fff; box-shadow: 0 16px 32px #170c2426; display: grid; gap: 22px; }
.card-heading { display: flex; justify-content: space-between; gap: 12px; font-size: .75rem; letter-spacing: .1em; overflow-wrap: anywhere; }
.card-chip { color: #ffe1a1; font-size: 2rem; line-height: 1; }
.card-number { font-size: clamp(1rem, 4vw, 1.5rem); letter-spacing: .12em; }
fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 16px; min-width: 0; }
.card-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card-fields label { min-width: 0; }
.pay-submit { width: 100%; min-height: 48px; }
</style>
