<script setup lang="ts">
import { vDialogFocus } from '@/lib/dialogFocus';
import { computed, onMounted, ref } from 'vue';
import StoreLayout from '@/components/StoreLayout.vue';
import SimulatedCardPayment from '@/components/SimulatedCardPayment.vue';
import { apiGet, apiPost } from '@/lib/api';
import { money, dateTime, states, query, type Order, type OrderLine } from '@/lib/store';
const actionLabels: Record<string, string> = {
  pagar: 'Pago simulado',
  cancelar: 'Cancelación',
  metodo: 'Cambio de método',
  listo: 'Listo para recoger',
  entregar: 'Entrega',
  cobrar_efectivo: 'Cobro en efectivo y entrega'
};
const props = defineProps<{ area?: string }>(),
  admin = computed(() => props.area === 'admin');
const base = computed(() => '/api/tienda/' + (admin.value ? 'admin/' : '') + 'pedidos');
const orders = ref<Order[]>([]),
  selected = ref<Order | null>(null),
  items = ref<OrderLine[]>([]),
  page = ref(1),
  total = ref(0),
  state = ref(''),
  busy = ref(false),
  loading = ref(false),
  error = ref(''),
  notice = ref(''),
  method = ref('tarjeta'),
  reason = ref('');
const canCancel = computed(
  () =>
    selected.value?.estado === 'en_espera_pago' &&
    Date.now() - new Date(selected.value.created_at).getTime() <= 15 * 60 * 1000
);
let attempt = crypto.randomUUID(),
  attemptSignature = '';
async function load() {
  loading.value = true;
  try {
    const r = await apiGet<{ ordenes: Order[]; total: number }>(
      base.value + '?' + query({ page: page.value, estado: state.value })
    );
    orders.value = r.ordenes;
    total.value = r.total;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
async function detail(id: string) {
  error.value = '';
  try {
    const r = await apiGet<{ orden: Order; items: OrderLine[] }>(base.value + '/' + id);
    selected.value = r.orden;
    items.value = r.items;
    method.value = r.orden.metodo_pago;
    window.history.replaceState({}, '', window.location.pathname + '?id=' + id);
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function action(accion: string, resultado?: string) {
  if (!selected.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  const signature = [selected.value.id, accion, resultado, method.value].join(':');
  if (signature !== attemptSignature) {
    attempt = crypto.randomUUID();
    attemptSignature = signature;
  }
  try {
    const r = await apiPost<{ orden: Order; resultado?: string }>(
      base.value + '/' + selected.value.id + '/acciones',
      { accion, resultado, metodo_pago: method.value, motivo: reason.value, requestId: attempt }
    );
    selected.value = r.orden;
    notice.value =
      accion === 'pagar'
        ? r.resultado === 'aprobado'
          ? 'Pago simulado aprobado. Tu pedido quedó registrado.'
          : r.resultado === 'rechazado'
            ? 'Pago rechazado. Puedes intentar de nuevo o cambiar el método.'
            : 'Simulación cancelada. El pedido sigue sin pagar.'
        : 'Pedido actualizado.';
    attemptSignature = '';
    await load();
    if (!admin.value) window.dispatchEvent(new Event('store-cart-changed'));
    if (accion === 'pagar' && r.resultado === 'cancelado') window.location.assign('/cliente/carrito');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function close() {
  selected.value = null;
  notice.value = '';
  window.history.replaceState({}, '', window.location.pathname);
}
onMounted(async () => {
  await load();
  const id = new URLSearchParams(window.location.search).get('id');
  if (id) await detail(id);
});
</script>
<template>
  <StoreLayout
    :admin="admin"
    :title="admin ? 'Gestión de pedidos' : 'Mis pedidos'"
    subtitle="Consulta el estado, el detalle de compra y el historial de cada pedido."
  >
    <p v-if="error && !selected" class="store-notice store-error" role="alert">{{ error }}</p>
    <form
      class="store-card store-filters"
      @submit.prevent="
        page = 1;
        load();
      "
    >
      <label
        >Estado<select v-model="state">
          <option value="">Todos</option>
          <option v-for="(label, key) in states" :key="key" :value="key">{{ label }}</option>
        </select></label
      ><button :disabled="loading">Consultar</button>
    </form>
    <p v-if="loading" role="status">Cargando pedidos…</p>
    <section v-else class="store-card">
      <div v-if="orders.length" class="store-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th v-if="admin">Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id">
              <td>{{ o.codigo }}</td>
              <td v-if="admin">{{ o.cliente_nombre }}</td>
              <td>{{ dateTime(o.created_at) }}</td>
              <td>
                <span class="store-badge">{{ states[o.estado] }}</span>
              </td>
              <td>{{ money(o.total) }}</td>
              <td><button class="secondary" @click="detail(o.id)">Ver pedido</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="store-empty">
        <h2>No hay pedidos</h2>
        <p>
          {{ state ? 'No se encontraron pedidos en este estado.' : 'Tus pedidos aparecerán aquí.' }}
        </p>
      </div>
      <div v-if="total > 20" class="store-pagination">
        <button
          :disabled="page === 1"
          @click="
            page--;
            load();
          "
        >
          Anterior</button
        ><span>{{ page }} / {{ Math.ceil(total / 20) }}</span
        ><button
          :disabled="page * 20 >= total"
          @click="
            page++;
            load();
          "
        >
          Siguiente
        </button>
      </div>
    </section>
    <div v-if="selected" v-dialog-focus class="store-modal" @keydown.esc="!busy && close()">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-title"
        class="store-modal-card"
      >
        <header class="store-modal-heading">
          <div>
            <span class="store-eyebrow">PEDIDO</span>
            <h2 id="order-title">{{ selected.codigo }}</h2>
          </div>
          <button class="secondary" :disabled="busy" @click="close">Cerrar</button>
        </header>
        <p v-if="error" class="store-notice store-error" role="alert">{{ error }}</p>
        <p v-if="notice" class="store-notice" role="status">{{ notice }}</p>
        <p>
          <span class="store-badge">{{ states[selected.estado] }}</span> ·
          {{ dateTime(selected.created_at) }}
        </p>
        <p>
          Recogida en Sweety Puppies ·
          {{
            selected.metodo_pago === 'efectivo' ? 'Efectivo' : selected.metodo_pago + ' (simulado)'
          }}
        </p>
        <div class="store-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in items" :key="i.id">
                <td>{{ i.producto_nombre }}</td>
                <td>{{ i.cantidad }}</td>
                <td>{{ money(i.precio_unitario) }}</td>
                <td>{{ money(i.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="store-price">Total {{ money(selected.total) }}</p>
        <section v-if="!admin && selected.estado === 'en_espera_pago'" class="store-card">
          <h3>Completar el pago</h3>
          <label
            >Método<select v-model="method" :disabled="busy">
              <option value="tarjeta">Tarjeta simulada</option>
              <option value="nequi">Nequi simulado</option>
              <option value="efectivo">Efectivo al recoger</option>
            </select></label
          >
          <p v-if="method === 'efectivo'">
            El personal registrará el pago cuando recojas tu pedido. Sujeto a stock disponible.
          </p>
          <p v-else-if="method === 'nequi'" class="store-notice">
            SIMULADOR · No se realiza ningún cobro. Elige un resultado para probar el proceso; no
            necesitamos datos bancarios.
          </p>
          <SimulatedCardPayment v-if="method === 'tarjeta'" :key="selected.id" :busy="busy" :total="selected.total" @pay="action('pagar', $event)" />
          <div v-if="method !== 'tarjeta'" class="store-actions">
            <button v-if="method === 'efectivo'"
              :disabled="busy || selected.metodo_pago === 'efectivo'"
              @click="action('metodo')"
            >
              Elegir efectivo</button
            ><template v-else
              ><button :disabled="busy" @click="action('pagar', 'aprobado')">
                Simular aprobación</button
              ><button class="secondary" :disabled="busy" @click="action('pagar', 'rechazado')">
                Simular rechazo</button
              ><button class="secondary" :disabled="busy" @click="action('pagar', 'cancelado')">
                Cancelar simulación
              </button></template
            >
          </div>
          <hr />
          <template v-if="canCancel"
            ><label
              >Motivo de cancelación<input v-model="reason" maxlength="1000" placeholder="Opcional"
            /></label>
            <p>
              <button class="danger" :disabled="busy" @click="action('cancelar')">
                Cancelar pedido sin pagar
              </button>
            </p></template
          >
          <p v-else class="store-muted">
            El plazo de 15 minutos para cancelar este pedido terminó.
          </p>
        </section>
        <section v-if="admin" class="store-actions">
          <button v-if="selected.estado === 'pagado'" :disabled="busy" @click="action('listo')">
            Marcar listo para recoger</button
          ><button
            v-if="selected.estado === 'pendiente_recoger'"
            :disabled="busy"
            @click="action('entregar')"
          >
            Confirmar entrega</button
          ><button
            v-if="selected.estado === 'en_espera_pago' && selected.metodo_pago === 'efectivo'"
            :disabled="busy"
            @click="action('cobrar_efectivo')"
          >
            Confirmar efectivo recibido y entrega
          </button>
        </section>
        <p v-if="selected.motivo_cancelacion">Motivo: {{ selected.motivo_cancelacion }}</p>
        <h3>Historial</h3>
        <ul class="store-timeline">
          <li>Pedido creado · {{ dateTime(selected.created_at) }}</li>
          <li v-for="e in selected.eventos" :key="e.id">
            {{ actionLabels[e.accion] }} · {{ e.resultado }}<br /><small
              >{{ dateTime(e.fecha) }} · {{ e.metodo }}</small
            >
          </li>
        </ul>
      </section>
    </div>
  </StoreLayout>
</template>
