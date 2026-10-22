<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import StoreLayout from '@/components/StoreLayout.vue';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { money, type Cart, type Order } from '@/lib/store';
const cart = ref<Cart>({ items: [], total: 0, cantidad: 0 }),
  busy = ref(false),
  loading = ref(true),
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
  try {
    cart.value = await apiGet<Cart>('/api/tienda/carrito');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
async function update(id: string, qty: number) {
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
  busy.value = true;
  error.value = '';
  try {
    const r = await apiPost<{ orden: Order }>('/api/tienda/checkout', {
      requestId,
      metodo_pago: method.value,
      total_esperado: cart.value.total,
      consentimiento: consent.value
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
                  <strong>{{ i.nombre }}</strong>
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
                      :disabled="busy || i.cantidad >= i.stock_actual"
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
          >Método de pago<select v-model="method" @change="resetRequest">
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
        <label class="store-check"
          ><input v-model="consent" type="checkbox" required />Acepto las condiciones de esta compra
          y el tratamiento de mis datos para gestionar el pedido.</label
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
          <button :disabled="busy || invalid || !consent">
            {{ busy ? 'Procesando…' : 'Confirmar pedido' }}
          </button>
        </p>
        <a href="/cliente/tienda">Seguir comprando</a>
      </form>
    </div>
  </StoreLayout>
</template>
