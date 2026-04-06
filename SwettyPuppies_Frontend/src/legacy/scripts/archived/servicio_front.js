// Variables globales
let servicios = [];
let servicioActual = null;
const API_URL = 'http://localhost:3000/api/servicios';

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
  // Cargar servicios al iniciar
  cargarServicios();

  // Inicializar eventos de tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Manejo de pestañas
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Quitar clase active de todos los botones y contenidos
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Activar el botón actual
      btn.classList.add('active');
      
      // Activar el contenido correspondiente
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
      
      // Si es el tab de listado, cargar la lista de servicios
      if (tabId === 'listado') {
        cargarServicios(); // Forzar recarga al cambiar a esta pestaña
      }
    });
  });
  
  // Inicializar comportamiento de formularios
  const formInputs = document.querySelectorAll('.form-group input, .form-group textarea, .form-group select');
  formInputs.forEach(input => {
    // Comportamiento de enfoque
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
      // Validar si tiene valor
      if (input.value.trim() !== '') {
        input.parentElement.classList.add('has-value');
      } else {
        input.parentElement.classList.remove('has-value');
      }
    });
    
    // Inicializar el estado para campos con valor
    if (input.value.trim() !== '') {
      input.parentElement.classList.add('has-value');
    }
  });
  
  // Inicializar formulario de creación de servicio
  const servicioForm = document.getElementById('servicioForm');
  if (servicioForm) {
    servicioForm.addEventListener('submit', handleNuevoServicio);
  }
  
  // Inicializar formulario de búsqueda
  const buscarServicioForm = document.getElementById('buscarServicioForm');
  if (buscarServicioForm) {
    buscarServicioForm.addEventListener('submit', handleBuscarServicio);
  }
  
  // Inicializar formulario de edición
  const editarForm = document.getElementById('editarForm');
  if (editarForm) {
    editarForm.addEventListener('submit', handleEditarServicio);
  }
  
  // Inicializar modales
  const modales = document.querySelectorAll('.modal');
  const cerrarBtns = document.querySelectorAll('.cerrar-modal, .cerrar-modal-btn');
  
  cerrarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modales.forEach(modal => {
        modal.classList.remove('show');
      });
    });
  });
  
  // Inicializar confirmación de eliminación
  const confirmarEliminar = document.getElementById('confirmar-eliminar');
  if (confirmarEliminar) {
    confirmarEliminar.addEventListener('click', () => {
      if (servicioActual) {
        eliminarServicio(servicioActual);
        cerrarModal('modal-eliminar');
      }
    });
  }
  
  // Cargar la tabla de servicios si estamos en la pestaña de listado al inicio
  if (document.querySelector('.tab-btn[data-tab="listado"].active')) {
    cargarTablaServicios();
  }

  // Debug: agregar visualización de carga inicial
  console.log('DOM cargado, inicialización completada');
});

// Función para cargar servicios desde la API
async function cargarServicios() {
  try {
    console.log('Iniciando carga de servicios desde API...');
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`Error al cargar los servicios: ${response.status}`);
    }
    
    servicios = await response.json();
    console.log(`Servicios cargados: ${servicios.length}`);
    
    // Actualizar la tabla de servicios
    cargarTablaServicios();
    
    return servicios;
  } catch (error) {
    console.error('Error al cargar servicios:', error);
    mostrarToast('Error al cargar los servicios: ' + error.message, 'error');
    return [];
  }
}

// Funciones para la gestión de servicios
async function handleNuevoServicio(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('servicioForm')) {
    return;
  }
  
  // Obtener datos del formulario
  const nuevoServicio = {
    id_servicio: document.getElementById('id_servicio').value.trim(),
    nombre: document.getElementById('nombre').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    precio: parseFloat(document.getElementById('precio').value.trim()),
    duracion: parseInt(document.getElementById('duracion').value.trim())
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#servicioForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar servicio a la API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevoServicio)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      // Verificar si es un error de ID duplicado
      if (responseData.error && responseData.error.includes('duplicate key')) {
        mostrarError('id_servicio', 'Este ID ya está registrado');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error(responseData.message || 'Error al crear el servicio');
    }
    
    // Limpiar formulario
    document.getElementById('servicioForm').reset();
    const formGroups = document.querySelectorAll('#servicioForm .form-group');
    formGroups.forEach(group => {
      group.classList.remove('has-value', 'focused', 'error');
    });
    
    // Mostrar notificación
    mostrarToast('Servicio agregado correctamente', 'success');
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Servicio Agregado!';
    submitBtn.classList.add('sent');
    
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
    }, 2000);
    
    // Recargar la lista de servicios para asegurarnos de tener datos actualizados
    cargarServicios();
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al agregar el servicio: ' + error.message, 'error');
  }
}

function handleBuscarServicio(e) {
  e.preventDefault();
  
  const idServicio = document.getElementById('buscarIdServicio').value.trim();
  const nombreServicio = document.getElementById('buscarNombreServicio').value.trim();
  
  if (idServicio === '' && nombreServicio === '') {
    mostrarError('buscarIdServicio', 'Ingresa al menos un criterio de búsqueda');
    return;
  } else {
    // Eliminar error si existe
    ocultarError('buscarIdServicio');
  }
  
  console.log(`Buscando servicios - ID: ${idServicio}, Nombre: ${nombreServicio}`);
  
  // Realizar búsqueda local
  buscarServiciosLocal(idServicio, nombreServicio);
}

function buscarServiciosLocal(idServicio, nombreServicio) {
  console.log(`Ejecutando búsqueda en ${servicios.length} servicios`);
  const nombreLower = nombreServicio.toLowerCase();
  
  // Buscar servicios que coincidan con los criterios
  const resultados = servicios.filter(servicio => {
    const coincideId = idServicio === '' || 
      (servicio.id_servicio && servicio.id_servicio.toString() === idServicio);
    const coincideNombre = nombreServicio === '' || 
      (servicio.nombre && servicio.nombre.toLowerCase().includes(nombreLower));
    return coincideId && coincideNombre;
  });
  
  console.log(`Resultados encontrados: ${resultados.length}`);
  mostrarResultadosBusqueda(resultados);
}

function mostrarResultadosBusqueda(resultados) {
  const contenedor = document.getElementById('resultados-busqueda');
  
  if (!resultados || resultados.length === 0) {
    contenedor.innerHTML = '<p class="sin-resultados">No se encontraron servicios con esos criterios</p>';
    return;
  }
  
  let html = `
    <table class="tabla-servicios">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Precio ($)</th>
          <th>Duración (min)</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  resultados.forEach(servicio => {
    html += `
      <tr>
        <td>${servicio.id_servicio || ''}</td>
        <td>${servicio.nombre || ''}</td>
        <td>${servicio.descripcion || ''}</td>
        <td>${servicio.precio ? parseFloat(servicio.precio).toFixed(2) : '0.00'}</td>
        <td>${servicio.duracion || '0'}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar('${servicio.id_servicio}')">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar('${servicio.id_servicio}')">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  contenedor.innerHTML = html;
}

function cargarTablaServicios() {
  const tbody = document.getElementById('tbody-servicios');
  const sinServicios = document.getElementById('sin-servicios');
  
  console.log(`Cargando tabla de servicios con ${servicios.length} servicios`);
  
  // Verificar si hay servicios
  if (!servicios || servicios.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (sinServicios) sinServicios.style.display = 'block';
    return;
  }
  
  // Ocultar mensaje de no hay servicios
  if (sinServicios) sinServicios.style.display = 'none';
  
  // Generar filas de la tabla
  let html = '';
  servicios.forEach(servicio => {
    html += `
      <tr>
        <td>${servicio.id_servicio || ''}</td>
        <td>${servicio.nombre || ''}</td>
        <td>${servicio.descripcion || ''}</td>
        <td>${servicio.precio ? parseFloat(servicio.precio).toFixed(2) : '0.00'}</td>
        <td>${servicio.duracion || '0'}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${servicio.id_servicio})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${servicio.id_servicio})">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  if (tbody) {
    tbody.innerHTML = html;
    console.log('Tabla de servicios actualizada');
  } else {
    console.error('No se encontró el elemento tbody-servicios');
  }
}

async function abrirModalEditar(id) {
  id = id.toString(); // Asegurar que el ID es una cadena para comparaciones consistentes
  servicioActual = id;
  
  console.log(`Abriendo modal para editar servicio ID: ${id}`);
  
  try {
    // Obtener datos actualizados del servicio de la API
    const response = await fetch(`${API_URL}/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Servicio no encontrado');
    }
    
    const servicio = await response.json();
    console.log('Datos del servicio obtenidos:', servicio);
    
    // Llenar formulario con datos del servicio
    document.getElementById('editar-id').value = servicio.id_servicio || '';
    document.getElementById('editar-nombre').value = servicio.nombre || '';
    document.getElementById('editar-descripcion').value = servicio.descripcion || '';
    document.getElementById('editar-precio').value = servicio.precio || '0';
    document.getElementById('editar-duracion').value = servicio.duracion || '0';
    
    // Activar clase has-value en todos los campos del formulario
    const formGroups = document.querySelectorAll('#editarForm .form-group');
    formGroups.forEach(group => {
      group.classList.add('has-value');
    });
    
    // Mostrar modal
    abrirModal('modal-editar');
    
  } catch (error) {
    console.error('Error al abrir modal de edición:', error);
    mostrarToast('Error al cargar datos del servicio: ' + error.message, 'error');
  }
}

function abrirModalEliminar(id) {
  id = id.toString(); // Asegurar que el ID es una cadena para comparaciones consistentes
  servicioActual = id;
  
  console.log(`Abriendo modal para eliminar servicio ID: ${id}`);
  
  // Buscar servicio en la lista local
  const servicio = servicios.find(s => s.id_servicio && s.id_servicio.toString() === id);
  
  if (!servicio) {
    mostrarToast('Servicio no encontrado', 'error');
    return;
  }
  
  // Mostrar nombre del servicio a eliminar
  const nombreElement = document.getElementById('servicio-a-eliminar');
  if (nombreElement) {
    nombreElement.textContent = servicio.nombre || 'desconocido';
  }
  
  // Mostrar modal
  abrirModal('modal-eliminar');
}

async function handleEditarServicio(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('editarForm')) {
    return;
  }
  
  const id = document.getElementById('editar-id').value;
  console.log(`Guardando cambios para servicio ID: ${id}`);
  
  // Recopilar datos del servicio
  const servicioActualizado = {
    nombre: document.getElementById('editar-nombre').value.trim(),
    descripcion: document.getElementById('editar-descripcion').value.trim(),
    precio: parseFloat(document.getElementById('editar-precio').value.trim()),
    duracion: parseInt(document.getElementById('editar-duracion').value.trim())
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#editarForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Actualizando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar actualización a la API
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(servicioActualizado)
    });
    
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al actualizar el servicio');
    }
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Servicio Actualizado!';
    submitBtn.classList.add('sent');
    
    // Cerrar modal y mostrar notificación
    setTimeout(() => {
      cerrarModal('modal-editar');
      mostrarToast('Servicio actualizado correctamente', 'success');
      
      // Restaurar botón
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
      
      // Recargar servicios para actualizar UI
      cargarServicios();
    }, 1500);
    
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al actualizar el servicio: ' + error.message, 'error');
  }
}

async function eliminarServicio(id) {
  console.log(`Eliminando servicio ID: ${id}`);
  
  try {
    // Mostrar indicador de carga
    mostrarToast('Eliminando servicio...', 'info');
    
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al eliminar el servicio');
    }
    
    // Mostrar notificación
    mostrarToast('Servicio eliminado correctamente', 'success');
    
    // Recargar servicios para actualizar UI
    cargarServicios();
    
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    mostrarToast('Error al eliminar el servicio: ' + error.message, 'error');
  }
}

// Funciones auxiliares
function validarFormulario(formId) {
  const form = document.getElementById(formId);
  let formValido = true;
  
  if (!form) {
    console.error(`Formulario con ID '${formId}' no encontrado`);
    return false;
  }
  
  // Validar campos requeridos
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  inputs.forEach(input => {
    if (input.value.trim() === '') {
      mostrarError(input.id, 'Este campo es requerido');
      formValido = false;
    } else {
      ocultarError(input.id);
    }
  });
  
  // Validar campos numéricos
  const precioInput = form.querySelector('input[name="precio"], input[name="editar-precio"]');
  if (precioInput && precioInput.value.trim() !== '') {
    const precio = parseFloat(precioInput.value.trim());
    if (isNaN(precio) || precio < 0) {
      mostrarError(precioInput.id, 'Ingresa un precio válido');
      formValido = false;
    }
  }
  
  const duracionInput = form.querySelector('input[name="duracion"], input[name="editar-duracion"]');
  if (duracionInput && duracionInput.value.trim() !== '') {
    const duracion = parseInt(duracionInput.value.trim());
    if (isNaN(duracion) || duracion < 0) {
      mostrarError(duracionInput.id, 'Ingresa una duración válida');
      formValido = false;
    }
  }
  
  return formValido;
}

function mostrarError(inputId, mensaje) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const formGroup = input.parentElement;
  const errorSpan = formGroup.querySelector('.form-error');
  
  formGroup.classList.add('error');
  if (errorSpan) {
    errorSpan.textContent = mensaje;
  }
}

function ocultarError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const formGroup = input.parentElement;
  
  formGroup.classList.remove('error');
}

function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  } else {
    console.error(`Modal con ID '${modalId}' no encontrado`);
  }
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  } else {
    console.error(`Modal con ID '${modalId}' no encontrado`);
  }
}

function mostrarToast(mensaje, tipo = 'info') {
  const toast = document.getElementById('toast');
  const mensajeElement = document.getElementById('toast-mensaje');
  
  if (!toast || !mensajeElement) {
    console.error('Elementos de toast no encontrados');
    return;
  }
  
  // Establecer mensaje y tipo
  mensajeElement.textContent = mensaje;
  
  // Quitar clases previas
  toast.classList.remove('success', 'error', 'info');
  
  // Añadir clase según tipo
  toast.classList.add(tipo);
  
  // Mostrar toast
  toast.classList.add('show');
  
  // Ocultar automáticamente después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Exponer funciones al ámbito global para los botones en HTML
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;
window.handleBuscarServicio = handleBuscarServicio;