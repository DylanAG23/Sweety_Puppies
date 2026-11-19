<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import StoreLayout from '@/components/StoreLayout.vue';
import PrivacyConsent from '@/components/PrivacyConsent.vue';
const privacyAccepted = ref(false), privacyVersion = ref('');
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { money, type Cart, type Order } from '@/lib/store';
const cart = ref<Cart>({ items: [], total: 0, cantidad: 0 }),
  busy = ref(false),
  loading = ref(true),
  loaded = ref(false),
  failedImages = ref<string[]>([]),
  error = ref(''),
  method = ref('tarjeta'),
  consent = ref(false);
let requestId = crypto.randomUUID();
function resetRequest() {
  requestId = crypto.randomUUID();
}
const invalid = computed(() =>
  cart.value.items.some((i) => !i.activo || !i.categoria_activa || i.cantidad > i.stock_actual)
);
async function load() {
  loading.value = true;
  loaded.value = false;
  try {
    cart.value = await apiGet<Cart>('/api/tienda/carrito');
    loaded.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
async function update(id: string, qty: number) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    cart.value =
      qty === 0
        ? await apiDelete<Cart>('/api/tienda/carrito/' + id)
        : await apiPatch<Cart>('/api/tienda/carrito', { producto_id: id, cantidad: qty });
    requestId = crypto.randomUUID();
    window.dispatchEvent(new Event('store-cart-changed'));
  } catch (e) {
    error.value = (e as Error).message;
    await load();
  } finally {
    busy.value = false;
  }
}
async function checkout() {
  if (busy.value || invalid.value || !cart.value.items.length || !consent.value || !privacyAccepted.value) return;
  busy.value = true;
  error.value = '';
  try {
    const r = await apiPost<{ orden: Order }>('/api/tienda/checkout', {
      requestId,
      metodo_pago: method.value,
      total_esperado: cart.value.total,
      consentimiento: consent.value,
      consentimiento_datos: privacyAccepted.value,
      politica_version: privacyVersion.value
    });
    window.location.assign('/cliente/pedidos?id=' + r.orden.id);
  } catch (e) {
    error.value = (e as Error).message;
    await load();
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <StoreLayout
    title="Tu carrito"
    subtitle="Revisa los productos y confirma tu pedido para recoger en el local."
  >
    <p v-if="error" role="alert" class="store-notice store-error">{{ error }}</p>
    <p v-if="loading" role="status">Cargando carrito…</p>
    <section v-else-if="!loaded" class="store-card store-empty">
      <h2>No pudimos cargar tu carrito</h2>
      <p>Tus productos no se han eliminado. Intenta consultar de nuevo.</p>
      <button @click="error = ''; load()">Reintentar</button>
    </section>
    <section v-else-if="!cart.items.length" class="store-card store-empty">
      <h2>Tu carrito está vacío</h2>
      <p>Agrega algo especial para tu mascota.</p>
      <a href="/cliente/tienda">Explorar productos</a>
    </section>
    <div v-else class="store-split">
      <section class="store-card">
        <h2>{{ cart.cantidad }} {{ cart.cantidad === 1 ? 'unidad' : 'unidades' }}</h2>
        <div class="store-table-wrap">
          <table class="store-cart-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in cart.items" :key="i.id">
                <td>
                  <div class="cart-product">
                    <img v-if="i.imagen && !failedImages.includes(i.imagen)" :src="i.imagen" :alt="i.nombre" loading="lazy" @error="failedImages.push(i.imagen)" />
                    <span v-else class="cart-product-placeholder" aria-hidden="true">Sin foto</span>
                    <strong>{{ i.nombre }}</strong>
                  </div>
                  <p>{{ money(i.precio) }} / unidad</p>
                  <span
                    v-if="!i.activo || !i.categoria_activa || i.cantidad > i.stock_actual"
                    class="store-error"
                    >Revisa disponibilidad ({{ i.stock_actual }} en stock)</span
                  >
                </td>
                <td>
                  <div class="store-actions">
                    <button
                      class="secondary"
                      :aria-label="'Reducir ' + i.nombre"
                      :disabled="busy || i.cantidad <= 1"
                      @click="update(i.producto_id, i.cantidad - 1)"
                    >
                      −</button
                    ><span>{{ i.cantidad }}</span
                    ><button
                      class="secondary"
                      :aria-label="'Aumentar ' + i.nombre"
                      :disabled="busy || !i.activo || !i.categoria_activa || i.cantidad >= i.stock_actual"
                      @click="update(i.producto_id, i.cantidad + 1)"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td>{{ money(i.precio * i.cantidad) }}</td>
                <td>
                  <button class="secondary" :disabled="busy" @click="update(i.producto_id, 0)">
                    Quitar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <form class="store-card" @submit.prevent="checkout">
        <h2>Resumen del pedido</h2>
        <p>Recogida en Sweety Puppies</p>
        <p class="store-price">{{ money(cart.total) }}</p>
        <p class="store-muted">Total en COP. Sin envío ni cargos adicionales.</p>
        <label
          >Método de pago<select v-model="method" :disabled="busy" @change="resetRequest">
            <option value="tarjeta">Tarjeta · simulación</option>
            <option value="nequi">Nequi · simulación</option>
            <option value="efectivo">Efectivo al recoger</option>
          </select></label
        >
        <p class="store-notice">
          {{
            method === 'efectivo'
              ? 'Pagarás al recoger. Las existencias se confirman en ese momento.'
              : 'Este entorno simula el pago. No ingreses datos bancarios reales ni se realizará ningún cobro.'
          }}
        </p>
        <PrivacyConsent v-model="privacyAccepted" :disabled="busy" @version="privacyVersion = $event" />
        <label class="store-check"
          ><input v-model="consent" type="checkbox" required />Acepto las condiciones de esta compra.</label
        >
        <details>
          <summary>Condiciones de compra</summary>
          <p>
            Solo recogida en el local. El inventario se confirma al aprobar el pago o cobrar en
            efectivo. Puedes cancelar un pedido sin pagar durante los primeros 15 minutos. Un pedido
            pagado no admite cancelación en este módulo. Usamos los datos de tu cuenta y el detalle
            de compra para tramitar y registrar el pedido.
          </p>
        </details>
        <p>
          <button :disabled="busy || invalid || !consent || !privacyAccepted">
            {{ busy ? 'Procesando…' : 'Confirmar pedido' }}
          </button>
        </p>
        <a href="/cliente/tienda">Seguir comprando</a>
      </form>
    </div>
  </StoreLayout>
</template>
<style scoped>
.cart-product { display: flex; align-items: center; gap: 12px; min-width: 170px; }
.cart-product img, .cart-product-placeholder { flex: 0 0 64px; width: 64px; height: 64px; border-radius: 12px; object-fit: contain; background: #fff; }
.cart-product-placeholder { display: grid; place-items: center; color: #67586a; font-size: .7rem; }
</style>
