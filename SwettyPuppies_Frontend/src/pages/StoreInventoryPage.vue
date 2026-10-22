<script setup lang="ts">
import { vDialogFocus } from '@/lib/dialogFocus';
import { onMounted, reactive, ref } from 'vue';
import StoreLayout from '@/components/StoreLayout.vue';
import { apiGet, apiPatch, apiPost, apiDownload } from '@/lib/api';
import { dateTime, query } from '@/lib/store';
interface Stock {
  productoId: string;
  nombre: string;
  referencia: string;
  stockActual: number;
  stockMinimo: number;
  nivel: string;
}
interface Movement {
  id: string;
  fecha: string;
  productoNombre: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  motivo: string;
  observacion: string;
  usuarioNombre: string;
  origen: string;
}
const products = ref<Stock[]>([]),
  movements = ref<Movement[]>([]),
  alert = ref(''),
  error = ref(''),
  notice = ref(''),
  busy = ref(false),
  selected = ref<Stock | null>(null),
  minimum = ref(0),
  pages = ref(1),
  summary = ref({
    unidadesEnStock: 0,
    productosStockBajo: 0,
    productosAgotados: 0,
    movimientosHoy: 0
  });
const filters = reactive({ search: '', nivel: 'todos' }),
  history = reactive({ desde: '', hasta: '', tipo: 'todos', productoId: '', page: 1 }),
  form = reactive({ tipo: 'entrada', cantidad: 1, motivo: 'Compra a proveedor', observacion: '' });
async function load() {
  try {
    const r = await apiGet<{ productos: Stock[]; alerta: string; resumen: typeof summary.value }>(
      '/api/admin/inventario?' + query(filters)
    );
    products.value = r.productos;
    alert.value = r.alerta;
    summary.value = r.resumen;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function loadHistory() {
  try {
    const r = await apiGet<{ movimientos: Movement[]; paginacion: { totalPaginas: number } }>(
      '/api/admin/inventario/movimientos?' + query(history)
    );
    movements.value = r.movimientos;
    pages.value = r.paginacion.totalPaginas;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function edit(p: Stock) {
  selected.value = p;
  minimum.value = p.stockMinimo;
  Object.assign(form, {
    tipo: 'entrada',
    cantidad: 1,
    motivo: 'Compra a proveedor',
    observacion: ''
  });
  error.value = '';
}
async function save(min = false) {
  if (!selected.value) return;
  busy.value = true;
  error.value = '';
  try {
    if (min)
      await apiPatch('/api/admin/inventario/productos/' + selected.value.productoId + '/minimo', {
        stockMinimo: minimum.value
      });
    else
      await apiPost('/api/admin/inventario/movimientos', {
        ...form,
        productoId: selected.value.productoId
      });
    selected.value = null;
    notice.value = min ? 'Mínimo actualizado.' : 'Movimiento registrado en el historial.';
    await Promise.all([load(), loadHistory()]);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function download() {
  busy.value = true;
  error.value = '';
  try {
    await apiDownload(
      '/api/admin/inventario/movimientos/exportar?' + query(history),
      'movimientos-inventario.csv'
    );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
onMounted(() => Promise.all([load(), loadHistory()]));
</script>
<template>
  <StoreLayout
    admin
    title="Control de inventario"
    subtitle="Existencias, mínimos y trazabilidad de cada movimiento. Los ajustes quedan registrados de forma permanente."
  >
    <p v-if="error && !selected" class="store-notice store-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="store-notice" role="status">{{ notice }}</p>
    <p v-if="alert" class="store-notice">{{ alert }}</p>
    <div class="store-metrics">
      <div class="store-card">
        Unidades en stock<strong>{{ summary.unidadesEnStock }}</strong>
      </div>
      <div class="store-card">
        Stock bajo<strong>{{ summary.productosStockBajo }}</strong>
      </div>
      <div class="store-card">
        Agotados<strong>{{ summary.productosAgotados }}</strong>
      </div>
      <div class="store-card">
        Movimientos hoy<strong>{{ summary.movimientosHoy }}</strong>
      </div>
    </div>
    <form class="store-card store-filters" @submit.prevent="load">
      <label>Buscar<input v-model="filters.search" placeholder="Nombre o referencia" /></label
      ><label
        >Nivel<select v-model="filters.nivel">
          <option value="todos">Todos</option>
          <option value="alerta">Requieren atención</option>
          <option value="normal">Normal</option>
          <option value="bajo">Bajo</option>
          <option value="agotado">Agotado</option>
        </select></label
      ><button>Consultar</button>
    </form>
    <section class="store-card store-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Referencia</th>
            <th>Actual</th>
            <th>Mínimo</th>
            <th>Nivel</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.productoId">
            <td>{{ p.nombre }}</td>
            <td>{{ p.referencia }}</td>
            <td>{{ p.stockActual }}</td>
            <td>{{ p.stockMinimo }}</td>
            <td>
              <span class="store-badge">{{ p.nivel }}</span>
            </td>
            <td><button class="secondary" @click="edit(p)">Gestionar</button></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!products.length" class="store-empty">No hay productos con estos filtros.</p>
    </section>
    <section class="store-card">
      <h2>Historial de movimientos</h2>
      <form
        class="store-filters"
        @submit.prevent="
          history.page = 1;
          loadHistory();
        "
      >
        <label>Desde<input v-model="history.desde" type="date" /></label
        ><label>Hasta<input v-model="history.hasta" type="date" /></label
        ><label
          >Tipo<select v-model="history.tipo">
            <option value="todos">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste</option>
          </select></label
        ><label
          >Producto<select v-model="history.productoId">
            <option value="">Todos</option>
            <option v-for="p in products" :key="p.productoId" :value="p.productoId">
              {{ p.nombre }}
            </option>
          </select></label
        ><button>Filtrar</button
        ><button type="button" class="secondary" :disabled="busy" @click="download">
          Exportar CSV
        </button>
      </form>
      <div class="store-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo / cantidad</th>
              <th>Stock</th>
              <th>Motivo</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in movements" :key="m.id">
              <td>{{ dateTime(m.fecha) }}</td>
              <td>{{ m.productoNombre }}</td>
              <td>{{ m.tipo }} / {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}</td>
              <td>{{ m.stockAnterior }} → {{ m.stockResultante }}</td>
              <td>
                {{ m.motivo }}<br /><small>{{ m.observacion }}</small>
              </td>
              <td>
                {{ m.usuarioNombre }}<br /><small>{{ m.origen }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!movements.length" class="store-empty">Sin movimientos en este período.</p>
      <div v-if="pages > 1" class="store-pagination">
        <button
          :disabled="history.page === 1"
          @click="
            history.page--;
            loadHistory();
          "
        >
          Anterior</button
        ><span>{{ history.page }} / {{ pages }}</span
        ><button
          :disabled="history.page >= pages"
          @click="
            history.page++;
            loadHistory();
          "
        >
          Siguiente
        </button>
      </div>
    </section>
    <div
      v-if="selected"
      v-dialog-focus
      class="store-modal"
      @keydown.esc="!busy && (selected = null)"
    >
      <section
        class="store-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-title"
      >
        <header class="store-modal-heading">
          <h2 id="inventory-title">{{ selected.nombre }}</h2>
          <button class="secondary" :disabled="busy" @click="selected = null">Cerrar</button>
        </header>
        <p v-if="error" role="alert" class="store-notice store-error">{{ error }}</p>
        <p>
          Stock actual: <strong>{{ selected.stockActual }}</strong>
        </p>
        <form class="store-filters" @submit.prevent="save(true)">
          <label
            >Stock mínimo<input
              v-model.number="minimum"
              type="number"
              min="0"
              max="100000"
              step="1"
              required /></label
          ><button :disabled="busy">Actualizar mínimo</button>
        </form>
        <hr />
        <h3>Registrar movimiento</h3>
        <form class="store-form" @submit.prevent="save()">
          <label
            >Tipo<select v-model="form.tipo">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste por conteo</option>
            </select></label
          ><label
            >{{ form.tipo === 'ajuste' ? 'Stock contado (total final)' : 'Unidades'
            }}<input
              v-model.number="form.cantidad"
              type="number"
              :min="form.tipo === 'ajuste' ? 0 : 1"
              max="100000"
              step="1"
              required /></label
          ><label class="wide">Motivo<input v-model="form.motivo" maxlength="100" required /></label
          ><label class="wide"
            >Observación<textarea v-model="form.observacion" maxlength="500"></textarea>
          </label>
          <p class="wide store-muted">
            El historial es inmutable. Para corregir un error registra un nuevo movimiento con su
            motivo.
          </p>
          <button :disabled="busy">Registrar movimiento</button>
        </form>
      </section>
    </div>
  </StoreLayout>
</template>
