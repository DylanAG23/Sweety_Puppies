// Variables globales
let galeriaImagenes = []; // Almacena todas las imágenes cargadas
const API_URL = 'http://localhost:3000/api'; // URL base de la API

// Elementos DOM principales
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const galeriaContainer = document.getElementById('galeria-imagenes');
const sinImagenes = document.getElementById('sin-imagenes');
const buscarForm = document.getElementById('buscarForm');
const resultadosBusqueda = document.getElementById('resultados-busqueda');
const imagenForm = document.getElementById('imagenForm');
const archivoInput = document.getElementById('archivo');
const imagenPreview = document.getElementById('imagen-preview');
const editarForm = document.getElementById('editarForm');
const editarArchivoInput = document.getElementById('editar-archivo');
const editarImagenPreview = document.getElementById('editar-imagen-preview');
const toastElement = document.getElementById('toast');
const toastMensaje = document.getElementById('toast-mensaje');

// Modales
const modalVerImagen = document.getElementById('modal-ver-imagen');
const modalEliminar = document.getElementById('modal-eliminar');
const modalEditar = document.getElementById('modal-editar');

// Cursor personalizado
const cursorDot = document.getElementById('cursor-dot');
const cursorOutline = document.getElementById('cursor-outline');

// ==========================================
// INICIALIZACIÓN Y EVENTOS PRINCIPALES
// ==========================================


// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  // Configurar eventos para las pestañas
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => cambiarTab(btn.dataset.tab));
  });
  
  // Configurar eventos para los formularios
  buscarForm.addEventListener('submit', buscarImagenes);
  imagenForm.addEventListener('submit', subirImagen);
  editarForm.addEventListener('submit', actualizarImagen);
  
  // Eventos para la vista previa de imágenes
  archivoInput.addEventListener('change', mostrarVistaPrevia);
  editarArchivoInput.addEventListener('change', mostrarVistaEditarPrevia);
  
  // Configurar eventos para los modales
  document.querySelectorAll('.cerrar-modal').forEach(btn => {
    btn.addEventListener('click', () => cerrarTodosModales());
  });
  
  document.querySelectorAll('.cerrar-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => cerrarTodosModales());
  });
  
  // Botón de confirmación para eliminar
  document.getElementById('confirmar-eliminar').addEventListener('click', eliminarImagenConfirmada);
  
  // Cargar imágenes iniciales
  cargarImagenes();
  
  // Mostrar mensaje de bienvenida
  mostrarToast('¡Bienvenido a la galería de Sweety Puppies!', 'success');
});

// ==========================================
// GESTIÓN DE PESTAÑAS
// ==========================================

/**
 * Cambia la pestaña activa
 * @param {string} tabId - ID de la pestaña a activar
 */
function cambiarTab(tabId) {
  // Desactivar todas las pestañas
  tabBtns.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  // Activar la pestaña seleccionada
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`${tabId}-tab`).classList.add('active');
  
  // Si es la pestaña de listado, recargar imágenes
  if (tabId === 'listado') {
    cargarImagenes();
  }
}

// ==========================================
// OPERACIONES CRUD DE IMÁGENES CON API EXPRESS
// ==========================================

/**
 * Carga todas las imágenes desde la API
 */
async function cargarImagenes() {
  try {
    const response = await fetch(`${API_URL}/imagenes`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    galeriaImagenes = data || [];
    
    renderizarGaleria(galeriaImagenes, galeriaContainer);
    actualizarEstadoSinImagenes();
  } catch (error) {
    console.error('Error al cargar imágenes:', error);
    mostrarToast('No se pudieron cargar las imágenes', 'error');
    // Si hay error al cargar, intentar con datos de ejemplo
    setTimeout(() => {
      if (galeriaImagenes.length === 0) {
        cargarDatosEjemplo();
      }
    }, 1000);
  }
}

/**
 * Busca imágenes por título, descripción o categoría
 * @param {Event} event - Evento del formulario
 */
async function buscarImagenes(event) {
  event.preventDefault();
  
  const termino = document.getElementById('buscarTermino').value.trim().toLowerCase();
  
  if (!termino) {
    mostrarToast('Ingresa un término de búsqueda', 'error');
    return;
  }
  
  try {
    // Si la búsqueda parece ser una categoría, buscar por categoría
    if (['mascotas', 'servicios', 'instalaciones', 'eventos'].includes(termino)) {
      const response = await fetch(`${API_URL}/imagenes/categoria/${termino}`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      mostrarResultadosBusqueda(data || [], termino);
    } else {
      // Para búsquedas generales, cargamos todas las imágenes y filtramos en el cliente
      // Idealmente, esto se implementaría en el backend para mayor eficiencia
      const response = await fetch(`${API_URL}/imagenes`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      
      // Filtrar en el cliente
      const resultados = data.filter(img => 
        img.nombre?.toLowerCase().includes(termino) || 
        img.descripcion?.toLowerCase().includes(termino)
      );
      
      mostrarResultadosBusqueda(resultados, termino);
    }
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    mostrarToast('Error al realizar la búsqueda', 'error');
  }
}

/**
 * Muestra los resultados de la búsqueda
 * @param {Array} resultados - Array de imágenes encontradas
 * @param {string} termino - Término buscado
 */
function mostrarResultadosBusqueda(resultados, termino) {
  if (resultados.length === 0) {
    resultadosBusqueda.innerHTML = `<p class="sin-resultados">No se encontraron imágenes para "${termino}"</p>`;
    return;
  }
  
  renderizarGaleria(resultados, resultadosBusqueda);
  mostrarToast(`Se encontraron ${resultados.length} imágenes`, 'success');
}

/**
 * Sube una nueva imagen a través de la API
 * @param {Event} event - Evento del formulario
 */
async function subirImagen(event) {
  event.preventDefault();
  
  const titulo = document.getElementById('titulo').value.trim();
  const categoria = document.getElementById('categoria').value;
  const descripcion = document.getElementById('descripcion').value.trim();
  const archivo = document.getElementById('archivo').files[0];
  
  if (!titulo || !categoria || !descripcion || !archivo) {
    mostrarToast('Todos los campos son obligatorios', 'error');
    return;
  }
  
  // Validar tamaño máximo (5MB)
  if (archivo.size > 5 * 1024 * 1024) {
    mostrarToast('El archivo es demasiado grande. Máximo 5MB permitido.', 'error');
    return;
  }
  
  // Validar tipo de archivo
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!tiposPermitidos.includes(archivo.type)) {
    mostrarToast('Solo se permiten imágenes JPG, PNG, GIF y WebP', 'error');
    return;
  }
  
  try {
    mostrarToast('Subiendo imagen...', 'info');
    
    // Mostrar indicador de carga
    const submitBtn = document.querySelector('#imagenForm button[type="submit"]');
    const btnTextoOriginal = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-small"></span> Subiendo...';
    
    // Crear un objeto FormData para enviar datos multipart/form-data
    const formData = new FormData();
    formData.append('nombre', titulo);
    formData.append('categoria', categoria);
    formData.append('descripcion', descripcion);
    formData.append('imagen', archivo); // 'imagen' debe coincidir con el nombre esperado por multer en el backend
    
    // Enviar datos a la API
    const response = await fetch(`${API_URL}/imagenes/upload`, {
      method: 'POST',
      body: formData
      // No se necesita Content-Type ya que FormData lo establece automáticamente con boundary
    });
    
    // Restaurar botón
    submitBtn.disabled = false;
    submitBtn.innerHTML = btnTextoOriginal;
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Limpiar formulario
    imagenForm.reset();
    imagenPreview.innerHTML = '<p>Vista previa de la imagen</p>';
    
    // Mostrar notificación y cambiar a la pestaña de listado
    mostrarToast('Imagen subida correctamente a Supabase Storage', 'success');
    cambiarTab('listado');
  } catch (error) {
    console.error('Error al subir imagen:', error);
    mostrarToast(`Error al subir la imagen: ${error.message}`, 'error');
  }
}

/**
 * Abre el modal para eliminar una imagen
 * @param {number} id - ID de la imagen a eliminar
 */
function confirmarEliminarImagen(id) {
  const imagen = galeriaImagenes.find(img => img.id == id);
  if (!imagen) return;
  
  document.getElementById('imagen-a-eliminar').textContent = imagen.nombre;
  document.getElementById('eliminar-preview-img').src = imagen.ruta;
  document.getElementById('eliminar-preview-img').onerror = function() {
    this.src = 'img/placeholder.jpg';
    this.onerror = null;
  };
  document.getElementById('confirmar-eliminar').dataset.imagenId = id;
  
  abrirModal(modalEliminar);
}

/**
 * Elimina una imagen a través de la API
 */
async function eliminarImagenConfirmada() {
  const id = document.getElementById('confirmar-eliminar').dataset.imagenId;
  
  try {
    const response = await fetch(`${API_URL}/imagenes/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error HTTP: ${response.status}`);
    }
    
    // Eliminar de la lista local
    galeriaImagenes = galeriaImagenes.filter(img => img.id != id);
    
    cerrarTodosModales();
    mostrarToast('Imagen eliminada correctamente', 'success');
    
    // Actualizar galería
    renderizarGaleria(galeriaImagenes, galeriaContainer);
    actualizarEstadoSinImagenes();
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    mostrarToast(`Error al eliminar la imagen: ${error.message}`, 'error');
  }
}

/**
 * Abre el modal para editar una imagen
 * @param {number} id - ID de la imagen a editar
 */
function abrirEditarImagen(id) {
  const imagen = galeriaImagenes.find(img => img.id == id);
  if (!imagen) return;
  
  // Rellenar formulario con datos de la imagen
  document.getElementById('editar-id').value = imagen.id;
  document.getElementById('editar-titulo').value = imagen.nombre;
  document.getElementById('editar-categoria').value = imagen.categoria;
  document.getElementById('editar-descripcion').value = imagen.descripcion;
  document.getElementById('editar-preview-img').src = imagen.ruta;
  document.getElementById('editar-preview-img').onerror = function() {
    this.src = 'img/placeholder.jpg';
    this.onerror = null;
  };
  document.querySelector('#modal-editar .file-name').textContent = 'Mantener imagen actual';
  
  abrirModal(modalEditar);
}

/**
 * Actualiza la información de una imagen a través de la API
 * @param {Event} event - Evento del formulario
 */
async function actualizarImagen(event) {
  event.preventDefault();
  
  const id = document.getElementById('editar-id').value;
  const titulo = document.getElementById('editar-titulo').value.trim();
  const categoria = document.getElementById('editar-categoria').value;
  const descripcion = document.getElementById('editar-descripcion').value.trim();
  const archivo = document.getElementById('editar-archivo').files[0];
  
  if (!titulo || !categoria || !descripcion) {
    mostrarToast('Título, categoría y descripción son obligatorios', 'error');
    return;
  }
  
  try {
    let response;
    
    // Si hay un archivo nuevo, usar el endpoint update con multipart/form-data
    if (archivo) {
      const formData = new FormData();
      formData.append('nombre', titulo);
      formData.append('categoria', categoria);
      formData.append('descripcion', descripcion);
      formData.append('imagen', archivo);
      
      response = await fetch(`${API_URL}/imagenes/update/${id}`, {
        method: 'PUT',
        body: formData
      });
    } else {
      // Si no hay archivo nuevo, usar el endpoint regular con JSON
      response = await fetch(`${API_URL}/imagenes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: titulo,
          categoria: categoria,
          descripcion: descripcion
        })
      });
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Actualizar en la lista local
    const index = galeriaImagenes.findIndex(img => img.id == id);
    if (index !== -1 && data.imagen) {
      galeriaImagenes[index] = data.imagen;
    }
    
    cerrarTodosModales();
    mostrarToast('Imagen actualizada correctamente', 'success');
    
    // Cargar imágenes actualizadas
    cargarImagenes();
  } catch (error) {
    console.error('Error al actualizar imagen:', error);
    mostrarToast(`Error al actualizar la imagen: ${error.message}`, 'error');
  }
}

/**
 * Abre el modal para ver una imagen en detalle
 * @param {number} id - ID de la imagen a ver
 */
function verImagen(id) {
  const imagen = galeriaImagenes.find(img => img.id == id);
  if (!imagen) return;

  document.getElementById('modal-imagen-titulo').textContent = imagen.nombre;
  document.getElementById('modal-imagen').src = imagen.ruta;
  document.getElementById('modal-imagen').alt = imagen.nombre;
  document.getElementById('modal-imagen').onerror = function() {
    this.src = 'img/placeholder.jpg';
    this.onerror = null;
  };
  document.getElementById('modal-imagen-descripcion').textContent = imagen.descripcion;
  document.getElementById('modal-imagen-categoria').textContent = `Categoría: ${imagen.categoria}`;

  // Formatear fecha
  const fecha = new Date(imagen.fecha_creacion);
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  document.getElementById('modal-imagen-fecha').textContent = `Fecha: ${fechaFormateada}`;

  abrirModal(modalVerImagen);
}


// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Renderiza la galería de imágenes
 * @param {Array} imagenes - Array de imágenes a mostrar
 * @param {HTMLElement} contenedor - Contenedor donde mostrar las imágenes
 */
function renderizarGaleria(imagenes, contenedor) {
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (imagenes.length === 0) {
    contenedor.innerHTML = '<div class="sin-imagenes-mensaje">No hay imágenes disponibles</div>';
    return;
  }

  imagenes.forEach(imagen => {
    // Manejar URL de imagen con fallback
    const imagenUrl = imagen.ruta || 'img/placeholder.jpg';
    
    const itemHTML = `
      <div class="imagen-item" data-id="${imagen.id}">
        <div class="imagen-thumbnail-container">
          <img 
            src="${imagenUrl}" 
            alt="${imagen.nombre}" 
            class="imagen-thumbnail"
            onerror="this.src='img/placeholder.jpg'; this.onerror=null;"
            loading="lazy"
          >
          <div class="imagen-overlay">
            <button class="btn-imagen btn-imagen-ver" onclick="verImagen(${imagen.id})">
              <i class="fas fa-eye">👁️</i>
            </button>
          </div>
        </div>
        <div class="imagen-info">
          <h3 class="imagen-titulo">${imagen.nombre}</h3>
          <span class="imagen-categoria">${imagen.categoria}</span>
          <div class="imagen-acciones">
            <button class="btn-imagen" onclick="abrirEditarImagen(${imagen.id})">
              <i class="fas fa-edit">✏️</i>
            </button>
            <button class="btn-imagen btn-imagen-eliminar" onclick="confirmarEliminarImagen(${imagen.id})">
              <i class="fas fa-trash">🗑️</i>
            </button>
          </div>
        </div>
      </div>
    `;

    contenedor.innerHTML += itemHTML;
  });

  // Aplicar efecto de lazy loading y entrada con animación
  setTimeout(() => {
    document.querySelectorAll('.imagen-item').forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('fade-in');
      }, index * 50);
    });
  }, 100);
}


/**
 * Muestra u oculta el mensaje de "Sin imágenes" según corresponda
 */
function actualizarEstadoSinImagenes() {
  if (!sinImagenes) return;
  
  if (galeriaImagenes.length === 0) {
    sinImagenes.style.display = 'block';
    if (galeriaContainer) galeriaContainer.style.display = 'none';
  } else {
    sinImagenes.style.display = 'none';
    if (galeriaContainer) galeriaContainer.style.display = 'grid';
  }
}

/**
 * Muestra una vista previa de la imagen seleccionada
 * @param {Event} event - Evento change del input file
 */
function mostrarVistaPrevia(event) {
  const archivo = event.target.files[0];
  mostrarArchivo(archivo, imagenPreview);
  
  // Actualizar nombre del archivo en la etiqueta
  const fileName = archivo ? archivo.name : 'Ningún archivo seleccionado';
  event.target.parentElement.querySelector('.file-name').textContent = fileName;
}

/**
 * Muestra una vista previa de la imagen para editar
 * @param {Event} event - Evento change del input file
 */
function mostrarVistaEditarPrevia(event) {
  const archivo = event.target.files[0];
  
  if (archivo) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('editar-preview-img').src = e.target.result;
    };
    reader.readAsDataURL(archivo);
    
    // Actualizar nombre del archivo en la etiqueta
    const fileName = archivo.name;
    event.target.parentElement.querySelector('.file-name').textContent = fileName;
  }
}

/**
 * Muestra una vista previa de un archivo
 * @param {File} archivo - Archivo a mostrar
 * @param {HTMLElement} contenedor - Contenedor donde mostrar la vista previa
 */
function mostrarArchivo(archivo, contenedor) {
  if (!archivo || !contenedor) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    contenedor.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
  };
  reader.readAsDataURL(archivo);
}

/**
 * Muestra un mensaje toast
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de mensaje ('success' o 'error')
 */
function mostrarToast(mensaje, tipo = 'success') {
  if (!toastElement || !toastMensaje) return;
  
  toastMensaje.textContent = mensaje;
  toastElement.className = 'toast';
  toastElement.classList.add(tipo);
  toastElement.classList.add('show');
  
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 3000);
}

/**
 * Abre un modal
 * @param {HTMLElement} modal - Modal a abrir
 */
function abrirModal(modal) {
  if (!modal) return;
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden'; // Evitar scroll
}

/**
 * Cierra todos los modales
 */
function cerrarTodosModales() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('show');
  });
  document.body.style.overflow = ''; // Restaurar scroll
}

// ==========================================
// INICIALIZACIÓN DE DATOS DE EJEMPLO
// ==========================================

/**
 * Carga datos de ejemplo si no hay imágenes
 * Esta función solo se usa para demostración
 */
function cargarDatosEjemplo() {
  // Si ya hay imágenes cargadas, no hacer nada
  if (galeriaImagenes.length > 0) return;
  
  // Imágenes de ejemplo con URLs absolutas
  const ejemplos = [
    {
      id: 1,
      nombre: "Perrito feliz",
      ruta: "img/perrito_feliz.jpg",
      descripcion: "Un perrito muy feliz jugando en el parque",
      categoria: "mascotas",
      activo: true,
      fecha_creacion: "2023-01-15T12:00:00Z",
      fecha_actualizacion: "2023-01-15T12:00:00Z"
    },
    {
      id: 2,
      nombre: "Peluquería canina",
      ruta: "img/peluqueria_canina.jpg",
      descripcion: "Nuestro servicio de peluquería profesional",
      categoria: "servicios",
      activo: true,
      fecha_creacion: "2023-02-20T14:30:00Z",
      fecha_actualizacion: "2023-02-20T14:30:00Z"
    },
    {
      id: 3,
      nombre: "Área de juegos",
      ruta: "img/area_juegos.jpg",
      descripcion: "Área de juegos para mascotas en nuestras instalaciones",
      categoria: "instalaciones",
      activo: true,
      fecha_creacion: "2023-03-10T09:15:00Z",
      fecha_actualizacion: "2023-03-10T09:15:00Z"
    },
    {
      id: 4,
      nombre: "Concurso canino",
      ruta: "img/concurso_canino.jpg",
      descripcion: "Fotos del último concurso canino",
      categoria: "eventos",
      activo: true,
      fecha_creacion: "2023-04-05T16:45:00Z",
      fecha_actualizacion: "2023-04-05T16:45:00Z"
    }
  ];
  
  // Almacenar ejemplos y mostrar
  galeriaImagenes = ejemplos;
  renderizarGaleria(galeriaImagenes, galeriaContainer);
  actualizarEstadoSinImagenes();
}