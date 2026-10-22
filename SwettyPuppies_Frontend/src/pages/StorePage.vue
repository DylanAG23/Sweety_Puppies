<script setup lang="ts">
import { vDialogFocus } from '@/lib/dialogFocus';
import { onMounted, reactive, ref } from 'vue';
import StoreLayout from '@/components/StoreLayout.vue';
import { apiGet, apiPost } from '@/lib/api';
import { money, query, type Product, type Category } from '@/lib/store';
const products = ref<Product[]>([]),
  categories = ref<Category[]>([]),
  selected = ref<Product | null>(null);
const loading = ref(false),
  busy = ref(false),
  error = ref(''),
  notice = ref(''),
  total = ref(0),
  page = ref(1),
  quantity = ref(1);
const filters = reactive({
  q: '',
  categoria: '',
  min: '',
  max: '',
  disponibilidad: '',
  orden: 'recientes'
});
async function load(reset = false) {
  if (reset) page.value = 1;
  loading.value = true;
  error.value = '';
  try {
    const r = await apiGet<{ productos: Product[]; total: number }>(
      '/api/tienda/productos?' + query({ ...filters, page: page.value })
    );
    products.value = r.productos;
    total.value = r.total;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
async function add(p: Product, amount = 1) {
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await apiPost('/api/tienda/carrito', { producto_id: p.id, cantidad: amount });
    notice.value = `${p.nombre} se agregó al carrito.`;
    window.dispatchEvent(new Event('store-cart-changed'));
    selected.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
onMounted(async () => {
  await load();
  try {
    categories.value = (
      await apiGet<{ categorias: Category[] }>('/api/tienda/categorias')
    ).categorias;
  } catch (e) {
    error.value = (e as Error).message;
  }
});
</script>
<template>
  <StoreLayout
    title="Todo para consentirlo"
    subtitle="Encuentra sus favoritos y recoge tu pedido en Sweety Puppies. Precios en pesos colombianos."
  >
    <p v-if="error" class="store-notice store-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="store-notice" role="status">
      {{ notice }} <a href="/cliente/carrito">Ver carrito</a>
    </p>
    <form class="store-card store-filters" @submit.prevent="load(true)">
      <label
        >Buscar<input v-model="filters.q" placeholder="Nombre o referencia" maxlength="100"
      /></label>
      <label
        >Categoría<select v-model="filters.categoria">
          <option value="">Todas</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select></label
      >
      <label>Desde COP<input v-model="filters.min" type="number" min="0" /></label
      ><label>Hasta COP<input v-model="filters.max" type="number" min="0" /></label>
      <label
        >Disponibilidad<select v-model="filters.disponibilidad">
          <option value="">Todos</option>
          <option value="disponible">Con stock</option>
          <option value="agotado">Agotados</option>
        </select></label
      >
      <label
        >Orden<select v-model="filters.orden">
          <option value="recientes">Más recientes</option>
          <option value="nombre">Nombre A–Z</option>
          <option value="precio_asc">Menor precio</option>
          <option value="precio_desc">Mayor precio</option>
        </select></label
      ><button :disabled="loading">Aplicar</button>
    </form>
    <p v-if="loading" role="status">Cargando catálogo…</p>
    <section v-else-if="!products.length" class="store-card store-empty">
      <h2>No hay productos para mostrar</h2>
      <p>Prueba con otros filtros o vuelve pronto.</p>
    </section>
    <section v-else class="store-grid" aria-label="Productos">
      <article v-for="p in products" :key="p.id" class="store-card store-product">
        <img v-if="p.imagenes[0]" :src="p.imagenes[0].url" :alt="p.nombre" loading="lazy" />
        <div v-else class="store-placeholder" aria-label="Sin imagen">♧</div>
        <div class="store-product-content">
          <span class="store-muted">{{ p.categoria_nombre }}</span>
          <h2>{{ p.nombre }}</h2>
          <p>{{ p.descripcion_corta }}</p>
          <strong class="store-price">{{ money(p.precio) }}</strong
          ><span class="store-muted">{{
            p.stock_actual ? `${p.stock_actual} disponibles` : 'Agotado'
          }}</span>
          <div class="store-actions">
            <button
              class="secondary"
              @click="
                selected = p;
                quantity = 1;
              "
            >
              Ver detalle</button
            ><button :disabled="busy || !p.stock_actual" @click="add(p)">Agregar</button>
          </div>
        </div>
      </article>
    </section>
    <div v-if="total > 24" class="store-pagination">
      <button
        :disabled="page === 1 || loading"
        @click="
          page--;
          load();
        "
      >
        Anterior</button
      ><span>{{ page }} / {{ Math.ceil(total / 24) }}</span
      ><button
        :disabled="page * 24 >= total || loading"
        @click="
          page++;
          load();
        "
      >
        Siguiente
      </button>
    </div>
    <div
      v-if="selected"
      v-dialog-focus
      class="store-modal"
      @click.self="selected = null"
      @keydown.esc="selected = null"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
        class="store-modal-card"
      >
        <header class="store-modal-heading">
          <h2 id="product-title">{{ selected.nombre }}</h2>
          <button class="secondary" @click="selected = null">Cerrar</button>
        </header>
        <p v-if="error" role="alert" class="store-notice store-error">{{ error }}</p>
        <div class="store-thumbnails">
          <a
            v-for="im in selected.imagenes"
            :key="im.id"
            :href="im.url"
            target="_blank"
            rel="noopener"
            ><img :src="im.url" :alt="selected.nombre"
          /></a>
        </div>
        <p class="store-muted">{{ selected.referencia }} · {{ selected.categoria_nombre }}</p>
        <p style="white-space: pre-line">
          {{ selected.descripcion || selected.descripcion_corta }}
        </p>
        <p class="store-price">{{ money(selected.precio) }}</p>
        <form class="store-actions" @submit.prevent="add(selected, quantity)">
          <label
            >Cantidad<input
              v-model.number="quantity"
              type="number"
              min="1"
              :max="selected.stock_actual"
              required /></label
          ><button :disabled="busy || !selected.stock_actual">Agregar al carrito</button>
        </form>
        <p class="store-muted">Recogida en el local. El stock se confirma al pagar.</p>
      </section>
    </div>
  </StoreLayout>
</template>
