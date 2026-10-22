<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import PlatformShell from '@/components/layout/PlatformShell.vue'
import { clientNavGroups, isStoreEnabled } from '@/lib/navigation'
import { apiGet } from '@/lib/api'
import { getSession } from '@/lib/session'

defineProps<{
  currentPath: string
}>()

const clientShortName = computed(() => getSession()?.userData.nombre?.trim() || 'Cliente')
const cartCount = ref(0)
const cartBounce = ref(false)
let bounceTimer: ReturnType<typeof setTimeout> | undefined
watch(cartCount, (count, previous) => {
  if (count <= previous) return
  cartBounce.value = true
  clearTimeout(bounceTimer)
  bounceTimer = setTimeout(() => { cartBounce.value = false }, 650)
})
onUnmounted(() => clearTimeout(bounceTimer))
async function refreshCart() {
  if (!isStoreEnabled) return
  try { cartCount.value = (await apiGet<{cantidad:number}>('/api/tienda/carrito')).cantidad } catch { /* La página de carrito muestra los errores de conexión. */ }
}
onMounted(() => { refreshCart(); window.addEventListener('store-cart-changed', refreshCart) })
onUnmounted(() => window.removeEventListener('store-cart-changed', refreshCart))
</script>

<template>
  <PlatformShell
    variant="client"
    :current-path="currentPath"
    :groups="clientNavGroups"
    home-href="/cliente"
    subtitle="Portal del cliente"
    :user-name="clientShortName"
    user-tagline="Glamour para cada pelaje"
    topbar-caption="Cuenta activa"
  >
    <template #topbar-actions>
      <a v-if="isStoreEnabled" href="/cliente/carrito" class="cart-link" :class="{ 'cart-bounce': cartBounce }" :aria-label="'Carrito: ' + cartCount + ' unidades'" title="Ver mi carrito">
        <span class="cart-art" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h4l4 17h14l4-12H9"/><path d="M13 14h11M15 8V3m-3 3 3-3 3 3"/><circle cx="13" cy="27" r="1.8"/><circle cx="24" cy="27" r="1.8"/></svg></span>
        <span class="cart-label">Mi carrito</span>
        <strong class="cart-count" aria-live="polite" aria-atomic="true">{{ cartCount > 99 ? '99+' : cartCount }}</strong>
      </a>
    </template>
  </PlatformShell>
</template>

<style scoped>
.cart-link { display: inline-flex; align-items: center; gap: 9px; min-height: 46px; padding: 6px 12px; border: 1px solid var(--sp-line); border-radius: 16px; background: var(--sp-primary-soft); color: var(--sp-primary); font-weight: 750; text-decoration: none; white-space: nowrap; transition: transform .2s, box-shadow .2s; }
.cart-link:hover { transform: translateY(-2px); box-shadow: 0 7px 20px #a2348126; }
.cart-link:focus-visible { outline: 3px solid var(--sp-mint); outline-offset: 3px; }
.cart-art { display: inline-flex; width: 30px; height: 30px; }
.cart-art svg { width: 100%; height: 100%; }
.cart-count { display: grid; place-items: center; min-width: 25px; height: 25px; padding: 0 5px; border-radius: 9px; background: #811366; color: #fff; font-size: .78rem; }
.cart-bounce .cart-art { animation: cart-hop .6s ease; }
@keyframes cart-hop { 30% { transform: translateY(-5px) rotate(-12deg); } 65% { transform: rotate(9deg); } }
@media (max-width: 720px) { .cart-label { display: none; } .cart-link { padding: 6px 8px; gap: 5px; } }
@media (prefers-reduced-motion: reduce) { .cart-link { transition: none; } .cart-bounce .cart-art { animation: none; } }
</style>