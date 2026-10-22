<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import StoreLayout from '@/components/StoreLayout.vue';
import { apiGet } from '@/lib/api';
import { money, query } from '@/lib/store';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const filters = reactive({ desde: today.slice(0, 7) + '-01', hasta: today }),
  error = ref(''),
  busy = ref(false);
const report = ref<{
  productos: number;
  servicios: number;
  consolidado: number;
  pedidos: number;
  serviciosCompletados: number;
  metodos: { metodo_pago: string; ingresos: number; pedidos: number }[];
} | null>(null);
async function load() {
  busy.value = true;
  error.value = '';
  try {
    report.value = (
      await apiGet<{ reporte: NonNullable<typeof report.value> }>(
        '/api/tienda/admin/reporte?' + query(filters)
      )
    ).reporte;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <StoreLayout
    admin
    title="Ingresos del negocio"
    subtitle="Productos y servicios por separado, con un total consolidado. Fechas en horario de Bogotá."
    ><p v-if="error" role="alert" class="store-notice store-error">{{ error }}</p>
    <form class="store-card store-filters" @submit.prevent="load">
      <label>Desde<input v-model="filters.desde" type="date" required /></label
      ><label>Hasta<input v-model="filters.hasta" type="date" required /></label
      ><button :disabled="busy">Consultar</button
      ><a href="/admin/reportes">Ver reportes de servicios</a>
    </form>
    <template v-if="report"
      ><div class="store-metrics">
        <div class="store-card">
          Productos<strong>{{ money(report.productos) }}</strong>
          <p>{{ report.pedidos }} pedidos pagados</p>
        </div>
        <div class="store-card">
          Servicios<strong>{{ money(report.servicios) }}</strong>
          <p>{{ report.serviciosCompletados }} servicios completados</p>
        </div>
        <div class="store-card">
          Consolidado<strong>{{ money(report.consolidado) }}</strong>
        </div>
      </div>
      <section class="store-card">
        <h2>Productos por método de pago</h2>
        <p class="store-muted">
          Tarjeta y Nequi corresponden a pagos simulados. Efectivo se registra al entregar. No se
          incluyen pedidos sin pagar ni cancelados.
        </p>
        <table>
          <thead>
            <tr>
              <th>Método</th>
              <th>Pedidos</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in report.metodos" :key="m.metodo_pago">
              <td>{{ m.metodo_pago }}</td>
              <td>{{ m.pedidos }}</td>
              <td>{{ money(m.ingresos) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!report.metodos.length">No hay pagos registrados en este período.</p>
      </section></template
    ></StoreLayout
  >
</template>
