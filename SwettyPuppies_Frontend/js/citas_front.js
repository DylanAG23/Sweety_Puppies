// Variables globales
let citas = [];
let servicios = [];
let mascotas = [];
let citaActual = null;
const API_URL = 'http://localhost:3000/api';

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar cursor personalizado
  const cursorDot = document.getElementById('cursor-dot');
  const cursorOutline = document.getElementById('cursor-outline');

  // Efecto del cursor personalizado
  document.addEventListener('mousemove', function(e) {
    const posX = e.clientX;
    const posY = e.clientY;

    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;
    
    cursorOutline.animate({
      left: `${posX}px`,
      top: `${posY}px`
    }, { duration: 500, fill: 'forwards' });
  });

  // Cargar citas al iniciar
  cargarCitas();

  // Cargar servicios y mascotas para los selectores
  cargarServicios();
  cargarMascotas();

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
      
      // Si es el tab de listado, cargar la lista de citas
      if (tabId === 'listado') {
        cargarTablaCitas();
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
  
  // Inicializar formulario de creación de cita
  const citaForm = document.getElementById('citaForm');
  if (citaForm) {
    citaForm.addEventListener('submit', handleNuevaCita);
  }
  
  // Inicializar formulario de búsqueda
  const buscarForm = document.getElementById('buscarForm');
  if (buscarForm) {
    buscarForm.addEventListener('submit', handleBuscarCita);
  }
  
  // Inicializar formulario de edición
  const editarForm = document.getElementById('editarForm');
  if (editarForm) {
    editarForm.addEventListener('submit', handleEditarCita);
  }
  
  // Inicializar filtro de fecha
  const aplicarFiltro = document.getElementById('aplicar-filtro');
  if (aplicarFiltro) {
    aplicarFiltro.addEventListener('click', () => {
      const fecha = document.getElementById('filtro-fecha').value;
      if (fecha) {
        filtrarCitasPorFecha(fecha);
      }
    });
  }
  
  // Limpiar filtro
  const limpiarFiltro = document.getElementById('limpiar-filtro');
  if (limpiarFiltro) {
    limpiarFiltro.addEventListener('click', () => {
      document.getElementById('filtro-fecha').value = '';
      cargarTablaCitas();
    });
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
      if (citaActual) {
        eliminarCita(citaActual);
        cerrarModal('modal-eliminar');
      }
    });
  }
  
  // Cargar la tabla de citas si estamos en la pestaña de listado
  if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
    cargarTablaCitas();
  }
});

// Función para cargar citas desde la API
async function cargarCitas() {
  try {
    const response = await fetch(`${API_URL}/citas`);
    
    if (!response.ok) {
      throw new Error('Error al cargar las citas');
    }
    
    citas = await response.json();
    
    // Si estamos en la pestaña de listado, actualizar la tabla
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaCitas();
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar las citas', 'error');
  }
}

// Cargar servicios para los selectores
async function cargarServicios() {
  try {
    const response = await fetch(`${API_URL}/servicios`);
    
    if (!response.ok) {
      throw new Error('Error al cargar los servicios');
    }
    
    servicios = await response.json();
    
    // Llenar los selectores de servicios
    const selectorServicio = document.getElementById('id_servicio');
    const selectorEditarServicio = document.getElementById('editar-servicio');
    
    // Limpiar opciones existentes
    if (selectorServicio) {
      let options = '<option value="" disabled selected>Selecciona un servicio</option>';
      
      servicios.forEach(servicio => {
        options += `<option value="${servicio.id_servicio}">${servicio.nombre} - $${servicio.precio}</option>`;
      });
      
      selectorServicio.innerHTML = options;
    }
    
    if (selectorEditarServicio) {
      let options = '<option value="" disabled selected>Selecciona un servicio</option>';
      
      servicios.forEach(servicio => {
        options += `<option value="${servicio.id_servicio}">${servicio.nombre} - $${servicio.precio}</option>`;
      });
      
      selectorEditarServicio.innerHTML = options;
    }
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar los servicios', 'error');
  }
}

// Cargar mascotas para los selectores
async function cargarMascotas() {
  try {
    const response = await fetch(`${API_URL}/mascotas`);
    
    if (!response.ok) {
      throw new Error('Error al cargar las mascotas');
    }
    
    mascotas = await response.json();
    
    // Llenar los selectores de mascotas
    const selectorMascota = document.getElementById('id_mascota');
    const selectorEditarMascota = document.getElementById('editar-mascota');
    
    // Cargar datos de los clientes para mostrar el nombre junto con la mascota
    const responseClientes = await fetch(`${API_URL}/clientes`);
    const clientes = await responseClientes.json();
    
    // Crear un mapa para buscar clientes rápidamente
    const clientesMap = {};
    clientes.forEach(cliente => {
      clientesMap[cliente.cedula] = cliente.nombre;
    });
    
    // Limpiar opciones existentes
    if (selectorMascota) {
      let options = '<option value="" disabled selected>Selecciona una mascota</option>';
      
      mascotas.forEach(mascota => {
        const nombreCliente = clientesMap[mascota.id_cliente] || 'Cliente desconocido';
        options += `<option value="${mascota.id_mascota}">${mascota.nombre} (${nombreCliente})</option>`;
      });
      
      selectorMascota.innerHTML = options;
    }
    
    if (selectorEditarMascota) {
      let options = '<option value="" disabled selected>Selecciona una mascota</option>';
      
      mascotas.forEach(mascota => {
        const nombreCliente = clientesMap[mascota.id_cliente] || 'Cliente desconocido';
        options += `<option value="${mascota.id_mascota}">${mascota.nombre} (${nombreCliente})</option>`;
      });
      
      selectorEditarMascota.innerHTML = options;
    }
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar las mascotas', 'error');
  }
}

// Funciones para la gestión de citas
async function handleNuevaCita(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('citaForm')) {
    return;
  }
  
  // Obtener datos del formulario
  const nuevaCita = {
    id_cita: document.getElementById('id_cita').value.trim(),
    fecha: document.getElementById('fecha').value.trim(),
    hora: document.getElementById('hora').value.trim(),
    id_servicio: document.getElementById('id_servicio').value.trim(),
    id_mascota: document.getElementById('id_mascota').value.trim()
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#citaForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar cita a la API
    const response = await fetch(`${API_URL}/citas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevaCita)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Verificar si es un error de ID duplicado
      if (errorData.error && errorData.error.includes('duplicate key')) {
        mostrarError('id_cita', 'Este ID de cita ya está registrado');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error('Error al crear la cita');
    }
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Cita Agendada!';
    submitBtn.classList.add('sent');
    
    // Limpiar formulario
    document.getElementById('citaForm').reset();
    const formGroups = document.querySelectorAll('#citaForm .form-group');
    formGroups.forEach(group => {
      group.classList.remove('has-value', 'focused', 'error');
    });
    
    // Mostrar notificación
    mostrarToast('Cita agendada correctamente', 'success');
    
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
    }, 2000);
    
    // Recargar la lista de citas para asegurarnos de tener datos actualizados
    cargarCitas();
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al agendar la cita', 'error');
  }
}

function handleBuscarCita(e) {
  e.preventDefault();
  
  const termino = document.getElementById('buscarTermino').value.trim();
  
  if (termino === '') {
    mostrarError('buscarTermino', 'Ingresa un término de búsqueda');
    return;
  }
  
  // Verificar si el término es una fecha
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (fechaRegex.test(termino)) {
    // Utilizar el endpoint específico para búsqueda por fecha
    buscarCitasPorFecha(termino);
  } else {
    // Intentar buscar por ID o realizar búsqueda local
    buscarCitasPorId(termino);
  }
}

async function buscarCitasPorFecha(fecha) {
  try {
    // Usar el nuevo endpoint específico para búsqueda por fecha
    const response = await fetch(`${API_URL}/citas/fecha/${fecha}`);
    
    if (!response.ok) {
      throw new Error('Error al buscar citas por fecha');
    }
    
    const citasEncontradas = await response.json();
    mostrarResultadosBusqueda(citasEncontradas);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al buscar citas por fecha', 'error');
    // Fallback a búsqueda local si hay error
    buscarCitasLocal(fecha);
  }
}

async function buscarCitasPorId(id) {
  try {
    // Usar el endpoint para obtener una cita por ID
    const response = await fetch(`${API_URL}/citas/${id}`);
    
    if (response.status === 404) {
      // Mostrar que no se encontró la cita
      mostrarResultadosBusqueda([]);
      return;
    }
    
    if (!response.ok) {
      throw new Error('Error al buscar cita por ID');
    }
    
    const cita = await response.json();
    mostrarResultadosBusqueda([cita]);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al buscar cita por ID', 'error');
    // Fallback a búsqueda local si hay error
    buscarCitasLocal(id);
  }
}

function buscarCitasLocal(termino) {
  // Intentar interpretar si es un ID o una fecha
  let resultados = [];
  
  // Verificar si es un ID
  const citaPorId = citas.find(cita => cita.id_cita == termino);
  if (citaPorId) {
    resultados.push(citaPorId);
  } else {
    // Verificar si es una fecha (YYYY-MM-DD)
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (fechaRegex.test(termino)) {
      resultados = citas.filter(cita => cita.fecha === termino);
    }
  }
  
  mostrarResultadosBusqueda(resultados);
}

function mostrarResultadosBusqueda(resultados) {
  const contenedor = document.getElementById('resultados-busqueda');
  
  if (resultados.length === 0) {
    contenedor.innerHTML = '<p class="sin-resultados">No se encontraron citas con esos criterios</p>';
    return;
  }
  
  let html = `
    <table class="tabla-citas">
      <thead>
        <tr>
          <th>ID</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Servicio</th>
          <th>Mascota</th>
          <th>Cliente</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  resultados.forEach(cita => {
    // Utilizar directamente los datos del nuevo endpoint que ya incluyen nombres
    const nombreServicio = cita.nombre_servicio || 'Servicio desconocido';
    const nombreMascota = cita.nombre_mascota || 'Sin mascota asignada';
    const nombreCliente = cita.nombre_cliente || 'Cliente no identificado';
    
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${formatearFecha(cita.fecha)}</td>
        <td>${formatearHora(cita.hora)}</td>
        <td>${nombreServicio}</td>
        <td>${nombreMascota}</td>
        <td>${nombreCliente}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${cita.id_cita})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${cita.id_cita})">🗑️</button>
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

async function cargarTablaCitas() {
  const tbody = document.getElementById('tbody-citas');
  const sinCitas = document.getElementById('sin-citas');
  
  // Verificar si hay citas
  if (citas.length === 0) {
    tbody.innerHTML = '';
    sinCitas.style.display = 'block';
    return;
  }
  
  // Ocultar mensaje de no hay citas
  sinCitas.style.display = 'none';
  
  // Generar filas de la tabla usando los nombres ya incluidos en los datos
  let html = '';
  citas.forEach(cita => {
    // Usar los datos del nuevo endpoint que ya incluyen toda la información
    const nombreServicio = cita.nombre_servicio || 'Servicio desconocido';
    const nombreMascota = cita.nombre_mascota || 'Sin mascota asignada';
    const nombreCliente = cita.nombre_cliente || 'Cliente no identificado';
    
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${formatearFecha(cita.fecha)}</td>
        <td>${formatearHora(cita.hora)}</td>
        <td>${nombreServicio}</td>
        <td>${nombreMascota}</td>
        <td>${nombreCliente}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${cita.id_cita})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${cita.id_cita})">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

async function filtrarCitasPorFecha(fecha) {
  try {
    // Usar el endpoint específico para filtrar por fecha
    const response = await fetch(`${API_URL}/citas/fecha/${fecha}`);
    
    if (!response.ok) {
      throw new Error('Error al filtrar citas por fecha');
    }
    
    const citasFiltradas = await response.json();
    
    const tbody = document.getElementById('tbody-citas');
    const sinCitas = document.getElementById('sin-citas');
    
    // Verificar si hay citas para la fecha
    if (citasFiltradas.length === 0) {
      tbody.innerHTML = '';
      sinCitas.textContent = `No hay citas registradas para el ${formatearFecha(fecha)}`;
      sinCitas.style.display = 'block';
      return;
    }
    
    // Ocultar mensaje de no hay citas
    sinCitas.style.display = 'none';
    
    // Mostrar las citas filtradas
    mostrarCitasEnTabla(citasFiltradas);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al filtrar citas por fecha', 'error');
    
    // Fallback a filtrado local si hay error
    const citasFiltradas = citas.filter(cita => cita.fecha === fecha);
    mostrarCitasEnTabla(citasFiltradas);
  }
}

function mostrarCitasEnTabla(citasAMostrar) {
  const tbody = document.getElementById('tbody-citas');
  
  // Generar filas de la tabla
  let html = '';
  citasAMostrar.forEach(cita => {
    // Usar los datos del nuevo endpoint que ya incluyen toda la información
    const nombreServicio = cita.nombre_servicio || 'Servicio desconocido';
    const nombreMascota = cita.nombre_mascota || 'Sin mascota asignada';
    const nombreCliente = cita.nombre_cliente || 'Cliente no identificado';
    
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${formatearFecha(cita.fecha)}</td>
        <td>${formatearHora(cita.hora)}</td>
        <td>${nombreServicio}</td>
        <td>${nombreMascota}</td>
        <td>${nombreCliente}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${cita.id_cita})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${cita.id_cita})">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

async function abrirModalEditar(id) {
  citaActual = id;
  
  try {
    // Obtener datos actualizados de la cita de la API usando el endpoint específico
    const response = await fetch(`${API_URL}/citas/${id}`);
    
    if (!response.ok) {
      throw new Error('Cita no encontrada');
    }
    
    const cita = await response.json();
    
    // Llenar formulario con datos de la cita
    document.getElementById('editar-id').value = cita.id_cita;
    document.getElementById('editar-fecha').value = cita.fecha;
    document.getElementById('editar-hora').value = cita.hora;
    
    // Seleccionar el servicio correcto
    const selectorServicio = document.getElementById('editar-servicio');
    const optionsServicio = selectorServicio.options;
    for (let i = 0; i < optionsServicio.length; i++) {
      if (optionsServicio[i].value == cita.id_servicio) {
        selectorServicio.selectedIndex = i;
        break;
      }
    }
    
    // Seleccionar la mascota correcta
    const selectorMascota = document.getElementById('editar-mascota');
    const optionsMascota = selectorMascota.options;
    for (let i = 0; i < optionsMascota.length; i++) {
      if (optionsMascota[i].value == cita.id_mascota) {
        selectorMascota.selectedIndex = i;
        break;
      }
    }
    
    // Activar clase has-value en todos los campos del formulario
    const formGroups = document.querySelectorAll('#editarForm .form-group');
    formGroups.forEach(group => {
      group.classList.add('has-value');
    });
    
    // Mostrar modal
    abrirModal('modal-editar');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar datos de la cita', 'error');
  }
}

function abrirModalEliminar(id) {
  citaActual = id;
  
  // Buscar la cita en los datos cargados
  const cita = citas.find(c => c.id_cita == id);
  
  if (!cita) {
    mostrarToast('Cita no encontrada', 'error');
    return;
  }
  
  // Mostrar fecha y hora de la cita a eliminar
  document.getElementById('fecha-a-eliminar').textContent = formatearFecha(cita.fecha);
  document.getElementById('hora-a-eliminar').textContent = formatearHora(cita.hora);
  
  // Mostrar modal
  abrirModal('modal-eliminar');
}

async function handleEditarCita(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('editarForm')) {
    return;
  }
  
  const id = document.getElementById('editar-id').value.trim();
  
  // Recopilar datos de la cita
  const citaActualizada = {
    fecha: document.getElementById('editar-fecha').value.trim(),
    hora: document.getElementById('editar-hora').value.trim(),
    id_servicio: document.getElementById('editar-servicio').value.trim(),
    id_mascota: document.getElementById('editar-mascota').value.trim()
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#editarForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Actualizando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar actualización a la API
    const response = await fetch(`${API_URL}/citas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(citaActualizada)
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar la cita');
    }
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Cita Actualizada!';
    submitBtn.classList.add('sent');
    
    // Cerrar modal y mostrar notificación
    setTimeout(() => {
      cerrarModal('modal-editar');
      mostrarToast('Cita actualizada correctamente', 'success');
      
      // Recargar todas las citas para obtener datos actualizados
      cargarCitas();
      
      // Restaurar botón después de 2 segundos
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('sent');
      }, 2000);
    }, 1000);
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al actualizar la cita', 'error');
  }
}

async function eliminarCita(id) {
  try {
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL}/citas/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Error al eliminar la cita');
    }
    
    // Mostrar notificación
    mostrarToast('Cita eliminada correctamente', 'success');
    
    // Recargar la lista de citas
    cargarCitas();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al eliminar la cita', 'error');
  }
}

// Funciones auxiliares
function validarFormulario(formId) {
  const form = document.getElementById(formId);
  let isValid = true;
  
  // Validar todos los campos requeridos
  const camposRequeridos = form.querySelectorAll('[required]');
  camposRequeridos.forEach(campo => {
    campo.parentElement.classList.remove('error');
    
    if (campo.value.trim() === '') {
      mostrarError(campo.id, 'Este campo es obligatorio');
      isValid = false;
    }
  });
  
  return isValid;
}

function mostrarError(campoId, mensaje) {
  const campo = document.getElementById(campoId);
  const errorSpan = campo.parentElement.querySelector('.form-error');
  
  campo.parentElement.classList.add('error');
  errorSpan.textContent = mensaje;
}

function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

function mostrarToast(mensaje, tipo = 'info') {
  const toast = document.getElementById('toast');
  const toastMensaje = document.getElementById('toast-mensaje');
  
  // Establecer mensaje y tipo
  toastMensaje.textContent = mensaje;
  toast.className = 'toast';
  toast.classList.add(`toast-${tipo}`);
  
  // Mostrar toast
  toast.classList.add('show');
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Fecha no disponible';
  
  try {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return fechaStr;
  }
}

function formatearHora(horaStr) {
  if (!horaStr) return 'Hora no disponible';
  
  try {
    // Formato de hora simple HH:MM
    if (horaStr.length >= 5) {
      const partesHora = horaStr.split(':');
      return `${partesHora[0]}:${partesHora[1]}`;
    }
    return horaStr;
  } catch (error) {
    console.error('Error al formatear hora:', error);
    return horaStr;
  }
}

// Hacer funciones accesibles globalmente
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;
window.eliminarCita = eliminarCita;