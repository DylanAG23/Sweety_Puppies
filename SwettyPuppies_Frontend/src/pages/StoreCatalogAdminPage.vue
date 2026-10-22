<script setup lang="ts">
import { vDialogFocus } from '@/lib/dialogFocus';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import StoreLayout from '@/components/StoreLayout.vue';
import { apiGet, apiPost, apiPatch, apiDelete, apiForm } from '@/lib/api';
import { money, query, type Product, type Category } from '@/lib/store';
const props = defineProps<{ mode?: string }>(),
  categoryMode = computed(() => props.mode === 'categorias');
const categories = ref<Category[]>([]),
  products = ref<Product[]>([]),
  total = ref(0),
  page = ref(1),
  search = ref(''),
  error = ref(''),
  notice = ref(''),
  busy = ref(false),
  loading = ref(false),
  editing = ref(false),
  editingId = ref(''),
  images = ref<Product['imagenes']>([]);
const pendingImages = ref<{ file: File; preview: string }[]>([]);
function clearPendingImages() {
  pendingImages.value.forEach(image => URL.revokeObjectURL(image.preview));
  pendingImages.value = [];
}
function removePendingImage(index: number) {
  const image = pendingImages.value[index];
  if (image) URL.revokeObjectURL(image.preview);
  pendingImages.value.splice(index, 1);
}
async function uploadPendingImages() {
  while (pendingImages.value.length) {
    const image = pendingImages.value[0]!;
    const data = new FormData();
    data.append('imagen', image.file);
    const response = await apiForm<{ imagen: Product['imagenes'][number] }>(
      '/api/tienda/admin/productos/' + editingId.value + '/imagenes', 'POST', data
    );
    images.value.push(response.imagen);
    removePendingImage(0);
  }
}
const form = reactive({
  nombre: '',
  descripcion: '',
  orden: 0,
  activo: true,
  categoria_id: '',
  referencia: '',
  descripcion_corta: '',
  precio: 1
});
async function load() {
  loading.value = true;
  try {
    const [c, p] = await Promise.all([
      apiGet<{ categorias: Category[] }>('/api/tienda/admin/categorias'),
      apiGet<{ productos: Product[]; total: number }>(
        '/api/tienda/admin/productos?' + query({ q: search.value, page: page.value, limit: 20 })
      )
    ]);
    categories.value = c.categorias;
    products.value = p.productos;
    total.value = p.total;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
function edit(item?: Product | Category) {
  clearPendingImages();
  error.value = '';
  editingId.value = item?.id || '';
  Object.assign(
    form,
    {
      nombre: '',
      descripcion: '',
      orden: 0,
      activo: true,
      categoria_id: categories.value[0]?.id || '',
      referencia: '',
      descripcion_corta: '',
      precio: 1
    },
    item || {}
  );
  images.value = item && 'imagenes' in item ? item.imagenes : [];
  editing.value = true;
}
async function save() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  let detailsSaved = false;
  try {
    const url = '/api/tienda/admin/' + (categoryMode.value ? 'categorias' : 'productos');
    if (editingId.value) await apiPatch(url + '/' + editingId.value, form);
    else {
      const result = await apiPost<{ producto?: Product }>(url, form);
      if (!categoryMode.value) editingId.value = result.producto!.id;
    }
    detailsSaved = true;
    if (!categoryMode.value) await uploadPendingImages();
    editing.value = false;
    notice.value = 'Cambios guardados.';
    await load();
  } catch (e) {
    error.value = (detailsSaved && pendingImages.value.length ? 'El producto se guardó, pero quedan fotos pendientes. Pulsa Guardar para reintentar. ' : '') + (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function remove(item: Product | Category) {
  if (!window.confirm(`¿Eliminar ${item.nombre}? Si tiene historial, deberás desactivarlo.`))
    return;
  busy.value = true;
  error.value = '';
  try {
    const r = await apiDelete<{ warning?: string }>(
      '/api/tienda/admin/' + (categoryMode.value ? 'categorias' : 'productos') + '/' + item.id
    );
    notice.value = r.warning || 'Registro eliminado.';
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function refreshImages() {
  images.value =
    (await apiGet<{ productos: Product[] }>('/api/tienda/admin/productos?id=' + editingId.value))
      .productos[0]?.imagenes || [];
  await load();
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  if (!files.length) return;
  error.value = '';
  if (files.length + images.value.length + pendingImages.value.length > 4) {
    error.value = 'Puedes agregar hasta cuatro fotografías por producto.';
    return;
  }
  if (files.some(file => !['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
    error.value = 'Cada fotografía debe ser JPG o PNG y pesar hasta 2 MB.';
    return;
  }
  pendingImages.value.push(...files.map(file => ({file, preview: URL.createObjectURL(file)})));
  if (!editingId.value) return;
  busy.value = true;
  try {
    await uploadPendingImages();
    await refreshImages();
  } catch (e) {
    error.value = 'No se completó la carga de fotos: ' + (e as Error).message + ' Las pendientes se conservan; pulsa Guardar para reintentar.';
  } finally {
    busy.value = false;
  }
}
async function imageAction(id: string, remove = false) {
  busy.value = true;
  error.value = '';
  try {
    const url = '/api/tienda/admin/productos/' + editingId.value + '/imagenes';
    if (remove) {
      const r = await apiDelete<{ warning?: string }>(url + '/' + id);
      if (r.warning) error.value = r.warning;
    } else {
      const ids = images.value.map((i) => i.id);
      const n = ids.indexOf(id);
      if (n > 0) [ids[n - 1], ids[n]] = [ids[n]!, ids[n - 1]!];
      await apiPatch(url, { ids });
    }
    await refreshImages();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
onMounted(load);
onUnmounted(clearPendingImages);
</script>
<template>
  <StoreLayout
    admin
    :title="categoryMode ? 'Categorías' : 'Productos'"
    :subtitle="
      categoryMode
        ? 'Organiza el catálogo y controla qué categorías están visibles.'
        : 'Administra precios, descripciones y fotografías. Las existencias se gestionan desde Inventario.'
    "
  >
    <p v-if="error && !editing" class="store-notice store-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="store-notice" role="status">{{ notice }}</p>
    <form
      class="store-card store-filters"
      @submit.prevent="
        page = 1;
        load();
      "
    >
      <label v-if="!categoryMode"
        >Buscar<input v-model="search" placeholder="Nombre o referencia" /></label
      ><button v-if="!categoryMode" :disabled="loading">Buscar</button
      ><button type="button" :disabled="busy" @click="edit()">
        {{ categoryMode ? 'Nueva categoría' : 'Nuevo producto' }}</button
      ><a href="/admin/inventario">Gestionar inventario</a>
    </form>
    <p v-if="loading" role="status">Cargando…</p>
    <section v-else class="store-card store-table-wrap">
      <table v-if="categoryMode">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Orden</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id">
            <td>{{ c.nombre }}</td>
            <td>{{ c.orden }}</td>
            <td>{{ c.activo ? 'Activa' : 'Inactiva' }}</td>
            <td>
              <div class="store-actions">
                <button class="secondary" @click="edit(c)">Editar</button
                ><button class="danger" :disabled="busy" @click="remove(c)">Eliminar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <table v-else>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td><img v-if="p.imagenes[0]" :src="p.imagenes[0].url" :alt="p.nombre" loading="lazy" /><span v-else class="store-muted">Sin foto</span></td>
            <td>
              <strong>{{ p.nombre }}</strong
              ><br /><small>{{ p.referencia }}</small>
            </td>
            <td>{{ p.categoria_nombre }}</td>
            <td>{{ money(p.precio) }}</td>
            <td>{{ p.stock_actual }}</td>
            <td>{{ p.activo ? 'Activo' : 'Inactivo' }}</td>
            <td>
              <div class="store-actions">
                <button class="secondary" @click="edit(p)">Editar</button
                ><button class="danger" :disabled="busy" @click="remove(p)">Eliminar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="categoryMode ? !categories.length : !products.length" class="store-empty">
        No hay registros para mostrar.
      </p>
      <div v-if="!categoryMode && total > 20" class="store-pagination">
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
    <div
      v-if="editing"
      v-dialog-focus
      class="store-modal"
      @keydown.esc="!busy && (editing = false)"
    >
      <section
        class="store-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
      >
        <header class="store-modal-heading">
          <h2 id="edit-title">
            {{ editingId ? 'Editar' : 'Crear' }} {{ categoryMode ? 'categoría' : 'producto' }}
          </h2>
          <button class="secondary" :disabled="busy" @click="editing = false">Cerrar</button>
        </header>
        <p v-if="error" role="alert" class="store-notice store-error">{{ error }}</p>
        <form id="catalog-edit-form" class="store-form" @submit.prevent="save">
          <label
            >Nombre<input
              v-model="form.nombre"
              required
              :maxlength="categoryMode ? 100 : 150" /></label
          ><label class="store-check"
            ><input v-model="form.activo" type="checkbox" />{{
              categoryMode ? 'Categoría activa' : 'Producto activo'
            }}</label
          ><label v-if="categoryMode"
            >Orden<input
              v-model.number="form.orden"
              type="number"
              min="0"
              step="1"
              required /></label
          ><template v-else
            ><label>Referencia<input v-model="form.referencia" required maxlength="50" /></label
            ><label
              >Categoría<select v-model="form.categoria_id" required>
                <option value="" disabled>Selecciona</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">
                  {{ c.nombre }}{{ c.activo ? '' : ' (inactiva)' }}
                </option>
              </select></label
            ><label
              >Precio COP<input
                v-model.number="form.precio"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                required /></label
            ><label
              >Descripción corta<input
                v-model="form.descripcion_corta"
                maxlength="255" /></label></template
          ><label class="wide"
            >Descripción<textarea
              v-model="form.descripcion"
              :maxlength="categoryMode ? 2000 : 10000"
            ></textarea>
          </label>

        </form>
        <section v-if="!categoryMode" class="product-photo-section">
          <h3>Fotografías · {{ images.length + pendingImages.length }}/4</h3>
          <p class="store-muted">
            JPG o PNG, hasta 2 MB cada una. La primera es la portada.
            {{ editingId ? 'Las fotos cargadas se guardan al instante.' : 'Selecciona las fotos ahora; se subirán al guardar el producto.' }}
          </p>
          <div class="store-thumbnails">
            <figure v-for="(im, n) in images" :key="im.id">
              <img :src="im.url" :alt="'Foto ' + (n + 1)" />
              <figcaption>
                <span v-if="n === 0" class="store-badge">Portada</span>
                <button v-if="n > 0" class="secondary" :disabled="busy" @click="imageAction(im.id)">
                  ← Mover</button
                ><button class="danger" :disabled="busy" @click="imageAction(im.id, true)">
                  Quitar
                </button>
              </figcaption>
            </figure>
          </div>
          <div v-if="pendingImages.length" class="store-thumbnails">
            <figure v-for="(image,index) in pendingImages" :key="image.preview">
              <img :src="image.preview" :alt="image.file.name" />
              <figcaption><span class="store-badge">Pendiente de guardar</span><button type="button" class="secondary" :disabled="busy" @click="removePendingImage(index)">Quitar selección</button></figcaption>
            </figure>
          </div>
          <p v-if="!images.length && !pendingImages.length" class="store-muted">Todavía no has seleccionado fotografías.</p>
          <label v-if="images.length + pendingImages.length < 4"
            >Seleccionar fotografías<input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              :disabled="busy"
              @change="upload"
          /></label>
        </section>
        <div class="store-actions product-save-actions">
          <button type="submit" form="catalog-edit-form" :disabled="busy">{{ busy ? 'Guardando…' : 'Guardar' }}</button>
          <button type="button" class="secondary" :disabled="busy" @click="editing = false">Cerrar</button>
        </div>
      </section>
    </div>
  </StoreLayout>
</template>

<style scoped>
.product-photo-section{margin-top:24px;padding-top:20px;border-top:1px solid #eadfe7}.product-save-actions{margin-top:24px}.store-thumbnails figure{margin:8px 0;max-width:160px}.store-thumbnails figcaption{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
</style>
