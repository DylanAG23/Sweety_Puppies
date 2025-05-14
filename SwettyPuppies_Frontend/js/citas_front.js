// Variables globales
let citas = [];
let citaActual = null;
let servicios = [];
let mascotas = [];
const API_URL_CITAS = 'http://localhost:3000/api/citas';
const API_URL_SERVICIOS = 'http://localhost:3000/api/servicios';
const API_URL_MASCOTAS = 'http://localhost:3000/api/mascotas';
const API_URL_CLIENTES = 'http://localhost:3000/api/clientes';

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar cursor personalizado
  initCustomCursor();
  
  // Cargar datos iniciales
  cargarCitas();
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
  
  // Inicializar modales
  const modales = document.querySelectorAll('.modal');
  const cerrarModales = document.querySelectorAll('.cerrar-modal, .cerrar-modal-btn');
  
  cerrarModales.forEach(btn => {
    btn.addEventListener('click', () => {
      modales.forEach(modal => {
        modal.classList.remove('show');
      });
    });
  });
  
  // Inicializar confirmación de eliminación
  const confirmarEliminar = document.getElementById('confirmarEliminar');
  if (confirmarEliminar) {
    confirmarEliminar.addEventListener('click', () => {
      const idCita = document.getElementById('eliminar_id_cita').value;
      if (idCita) {
        eliminarCita(idCita);
      }
    });
  }
  
  // Inicializar filtro de fecha
  const aplicarFiltro = document.getElementById('aplicar-filtro');
  if (aplicarFiltro) {
    aplicarFiltro.addEventListener('click', filtrarCitasPorFecha);
  }
  
  const limpiarFiltro = document.getElementById('limpiar-filtro');
  if (limpiarFiltro) {
    limpiarFiltro.addEventListener('click', () => {
      document.getElementById('filtro-fecha').value = '';
      cargarTablaCitas();
    });
  }
  
  // Cargar la tabla de citas si estamos en la pestaña de listado
  if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
    cargarTablaCitas();
  }
});

// Inicializar cursor personalizado
function initCustomCursor() {
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorOutline = document.querySelector('.cursor-outline');
  
  if (cursorDot && cursorOutline) {
    document.addEventListener('mousemove', (e) => {
      // Actualizar posición del cursor
      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
      
      // Efecto de seguimiento suave para el contorno
      setTimeout(() => {
        cursorOutline.style.left = `${e.clientX}px`;
        cursorOutline.style.top = `${e.clientY}px`;
      }, 50);
    });
  }
}

// Funciones para cargar datos
async function cargarCitas() {
  try {
    const response = await fetch(API_URL_CITAS);
    
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

async function cargarServicios() {
  try {
    const response = await fetch(API_URL_SERVICIOS);
    
    if (!response.ok) {
      throw new Error('Error al cargar los servicios');
    }
    
    servicios = await response.json();
    actualizarSelectServicios();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar los servicios', 'error');
  }
}

async function cargarMascotas() {
  try {
    const response = await fetch(API_URL_MASCOTAS);
    
    if (!response.ok) {
      throw new Error('Error al cargar las mascotas');
    }
    
    mascotas = await response.json();
    actualizarSelectMascotas();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar las mascotas', 'error');
  }
}

// Actualizar select de servicios en todos los formularios
function actualizarSelectServicios() {
  // Select en el formulario de nueva cita
  const selectServicio = document.getElementById('id_servicio');
  // Select en el formulario de edición
  const selectServicioEditar = document.getElementById('editar_id_servicio');
  
  if (selectServicio) {
    // Mantener la opción por defecto
    selectServicio.innerHTML = '<option value="" disabled selected>Selecciona un servicio</option>';
    
    // Agregar opciones de servicios
    servicios.forEach(servicio => {
      const option = document.createElement('option');
      option.value = servicio.id_servicio;
      option.textContent = `${servicio.nombre} - $${servicio.precio}`;
      selectServicio.appendChild(option);
    });
  }
  
  if (selectServicioEditar) {
    // Mantener la opción por defecto
    selectServicioEditar.innerHTML = '<option value="" disabled selected>Selecciona un servicio</option>';
    
    // Agregar opciones de servicios
    servicios.forEach(servicio => {
      const option = document.createElement('option');
      option.value = servicio.id_servicio;
      option.textContent = `${servicio.nombre} - $${servicio.precio}`;
      selectServicioEditar.appendChild(option);
    });
  }
}

// Actualizar select de mascotas en todos los formularios
function actualizarSelectMascotas() {
  // Select en el formulario de nueva cita
  const selectMascota = document.getElementById('id_mascota');
  // Select en el formulario de edición
  const selectMascotaEditar = document.getElementById('editar_id_mascota');
  
  if (selectMascota) {
    // Mantener la opción por defecto
    selectMascota.innerHTML = '<option value="" disabled selected>Selecciona una mascota</option>';
    
    // Agregar opciones de mascotas
    mascotas.forEach(mascota => {
      const option = document.createElement('option');
      option.value = mascota.id_mascota;
      option.textContent = `${mascota.nombre} (${mascota.especie}) - Cliente: ${mascota.id_cliente}`;
      selectMascota.appendChild(option);
    });
  }
  
  if (selectMascotaEditar) {
    // Mantener la opción por defecto
    selectMascotaEditar.innerHTML = '<option value="" disabled selected>Selecciona una mascota</option>';
    
    // Agregar opciones de mascotas
    mascotas.forEach(mascota => {
      const option = document.createElement('option');
      option.value = mascota.id_mascota;
      option.textContent = `${mascota.nombre} (${mascota.especie}) - Cliente: ${mascota.id_cliente}`;
      selectMascotaEditar.appendChild(option);
    });
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
    id_cita: parseInt(document.getElementById('id_cita').value.trim()),
    fecha: document.getElementById('fecha').value.trim(),
    hora: document.getElementById('hora').value.trim(),
    id_servicio: parseInt(document.getElementById('id_servicio').value.trim()),
    id_mascota: parseInt(document.getElementById('id_mascota').value.trim())
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#citaForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar cita a la API
    const response = await fetch(API_URL_CITAS, {
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
    
    // Añadir la cita a la lista local
    citas.push(nuevaCita);
    
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
  
  // Realizar búsqueda local
  buscarCitasLocal(termino);
}

function buscarCitasLocal(termino) {
  // Verificar si es una búsqueda por fecha
  if (termino.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Filtrar por fecha exacta
    const resultados = citas.filter(cita => cita.fecha === termino);
    mostrarResultadosBusqueda(resultados);
    return;
  }
  
  // Si es un número, buscar por ID
  if (!isNaN(termino)) {
    const resultados = citas.filter(cita => cita.id_cita === parseInt(termino));
    mostrarResultadosBusqueda(resultados);
    return;
  }
  
  // Si no hay resultados en búsqueda exacta, mostrar mensaje
  mostrarResultadosBusqueda([]);
}

function mostrarResultadosBusqueda(resultados) {
  const contenedor = document.getElementById('resultados-busqueda');
  
  if (resultados.length === 0) {
    contenedor.innerHTML = '<p class="sin-resultados">No se encontraron citas con esos criterios</p>';
    return;
  }
  
  // Preparar la tabla de resultados
  let html = `
    <table class="tabla-citas">
      <thead>
        <tr>
          <th>ID</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Servicio</th>
          <th>Mascota</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Función para encontrar nombres de servicio y mascota
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? servicio.nombre : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? mascota.nombre : 'Desconocida';
  };
  
  // Generar filas con los resultados
  resultados.forEach(cita => {
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
        <td>${obtenerNombreServicio(cita.id_servicio)}</td>
        <td>${obtenerNombreMascota(cita.id_mascota)}</td>
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

function cargarTablaCitas() {
  const tbody = document.getElementById('tbody-citas');
  const sinCitas = document.getElementById('sin-citas');
  
  // Verificar si hay citas
  if (!citas || citas.length === 0) {
    tbody.innerHTML = '';
    sinCitas.style.display = 'block';
    return;
  }
  
  // Ocultar mensaje de no hay citas
  sinCitas.style.display = 'none';
  
  // Función para encontrar nombres de servicio y mascota
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? servicio.nombre : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? mascota.nombre : 'Desconocida';
  };
  
  const obtenerNombreCliente = (idMascota) => {
    const mascota = mascotas.find(m => m.id_mascota === idMascota);
    if (!mascota) return 'Desconocido';
    
    return mascota.id_cliente; // Idealmente aquí buscarías el nombre del cliente, pero usamos el ID por ahora
  };
  
  // Generar filas de la tabla
  let html = '';
  citas.forEach(cita => {
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
        <td>${obtenerNombreServicio(cita.id_servicio)}</td>
        <td>${obtenerNombreMascota(cita.id_mascota)}</td>
        <td>${obtenerNombreCliente(cita.id_mascota)}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${cita.id_cita})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${cita.id_cita})">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

function filtrarCitasPorFecha() {
  const fechaFiltro = document.getElementById('filtro-fecha').value;
  
  if (fechaFiltro === '') {
    mostrarToast('Selecciona una fecha para filtrar', 'info');
    return;
  }
  
  // Filtrar citas por la fecha seleccionada
  const citasFiltradas = citas.filter(cita => cita.fecha === fechaFiltro);
  
  // Obtener tbody para actualizar
  const tbody = document.getElementById('tbody-citas');
  const sinCitas = document.getElementById('sin-citas');
  
  // Verificar si hay citas en la fecha seleccionada
  if (citasFiltradas.length === 0) {
    tbody.innerHTML = '';
    sinCitas.textContent = `No hay citas para la fecha ${fechaFiltro}`;
    sinCitas.style.display = 'block';
    return;
  }
  
  sinCitas.style.display = 'none';
  
  // Función para encontrar nombres de servicio y mascota
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? servicio.nombre : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? mascota.nombre : 'Desconocida';
  };
  
  const obtenerNombreCliente = (idMascota) => {
    const mascota = mascotas.find(m => m.id_mascota === idMascota);
    if (!mascota) return 'Desconocido';
    
    return mascota.id_cliente; // Idealmente aquí buscarías el nombre del cliente, pero usamos el ID por ahora
  };
  
  // Generar filas de la tabla con las citas filtradas
  let html = '';
  citasFiltradas.forEach(cita => {
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
        <td>${obtenerNombreServicio(cita.id_servicio)}</td>
        <td>${obtenerNombreMascota(cita.id_mascota)}</td>
        <td>${obtenerNombreCliente(cita.id_mascota)}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${cita.id_cita})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${cita.id_cita})">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

function abrirModalEditar(idCita) {
  // Buscar la cita en la lista local
  const cita = citas.find(c => c.id_cita === idCita);
  
  if (!cita) {
    mostrarToast('Cita no encontrada', 'error');
    return;
  }
  
  // Llenar formulario con datos de la cita
  document.getElementById('editar_id_cita').value = cita.id_cita;
  document.getElementById('editar_fecha').value = cita.fecha;
  document.getElementById('editar_hora').value = cita.hora;
  
  // Seleccionar servicio y mascota correctos
  const selectServicio = document.getElementById('editar_id_servicio');
  const selectMascota = document.getElementById('editar_id_mascota');
  
  // Buscar y seleccionar el servicio correspondiente
  for (let i = 0; i < selectServicio.options.length; i++) {
    if (parseInt(selectServicio.options[i].value) === cita.id_servicio) {
      selectServicio.selectedIndex = i;
      break;
    }
  }
  
  // Buscar y seleccionar la mascota correspondiente
  for (let i = 0; i < selectMascota.options.length; i++) {
    if (parseInt(selectMascota.options[i].value) === cita.id_mascota) {
      selectMascota.selectedIndex = i;
      break;
    }
  }
  
  // Activar clase has-value en todos los campos del formulario
  const formGroups = document.querySelectorAll('#editarForm .form-group');
  formGroups.forEach(group => {
    group.classList.add('has-value');
  });
  
  // Mostrar modal de edición
  document.getElementById('editarModal').classList.add('show');
}

function abrirModalEliminar(idCita) {
  // Guardar el ID de la cita a eliminar
  document.getElementById('eliminar_id_cita').value = idCita;
  
  // Mostrar modal de confirmación
  document.getElementById('eliminarModal').classList.add('show');
}

async function handleEditarCita(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('editarForm')) {
    return;
  }
  
  const idCita = document.getElementById('editar_id_cita').value;
  
  // Recopilar datos de la cita
  const citaActualizada = {
    fecha: document.getElementById('editar_fecha').value,
    hora: document.getElementById('editar_hora').value,
    id_servicio: parseInt(document.getElementById('editar_id_servicio').value),
    id_mascota: parseInt(document.getElementById('editar_id_mascota').value)
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#editarForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Actualizando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar actualización a la API
    const response = await fetch(`${API_URL_CITAS}/${idCita}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(citaActualizada)
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar la cita');
    }
    
    // Actualizar en la lista local con los nuevos datos
    const citaIndex = citas.findIndex(c => c.id_cita === parseInt(idCita));
    if (citaIndex !== -1) {
      citas[citaIndex] = {
        id_cita: parseInt(idCita),
        ...citaActualizada
      };
    }
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Cita Actualizada!';
    submitBtn.classList.add('sent');
    
    // Cerrar modal y mostrar notificación
    setTimeout(() => {
      document.getElementById('editarModal').classList.remove('show');
      mostrarToast('Cita actualizada correctamente', 'success');
      
      // Actualizar tabla si estamos en la pestaña de listado
      if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
        cargarTablaCitas();
      }
      
      // Actualizar resultados de búsqueda si hay un término de búsqueda activo
      const terminoBusqueda = document.getElementById('buscarTermino').value.trim();
      if (terminoBusqueda !== '' && document.querySelector('.tab-btn[data-tab="buscar"]').classList.contains('active')) {
        buscarCitasLocal(terminoBusqueda);
      }
      
      // Restaurar botón
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
    }, 1500);
    
    // Recargar la lista de citas para asegurarnos de tener datos actualizados
    cargarCitas();
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al actualizar la cita', 'error');
  }
}

async function eliminarCita(idCita) {
  try {
    // Mostrar indicador de carga
    mostrarToast('Eliminando cita...', 'info');
    
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL_CITAS}/${idCita}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Error al eliminar la cita');
    }
    
    // Eliminar cita de la lista local
    citas = citas.filter(c => c.id_cita !== parseInt(idCita));
    
    // Cerrar el modal
    document.getElementById('eliminarModal').classList.remove('show');
    
    // Mostrar notificación
    mostrarToast('Cita eliminada correctamente', 'success');
    
    // Actualizar tabla si estamos en la pestaña de listado
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaCitas();
    }
    
    // Actualizar resultados de búsqueda si hay un término de búsqueda activo
    const terminoBusqueda = document.getElementById('buscarTermino').value.trim();
    if (terminoBusqueda !== '' && document.querySelector('.tab-btn[data-tab="buscar"]').classList.contains('active')) {
      buscarCitasLocal(terminoBusqueda);
    }
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al eliminar la cita', 'error');
  }
}

// Funciones auxiliares
function validarFormulario(formId) {
  const form = document.getElementById(formId);
  let formValido = true;
  
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
  
  return formValido;
}

function mostrarError(inputId, mensaje) {
  const input = document.getElementById(inputId);
  const formGroup = input.parentElement;
  const errorSpan = formGroup.querySelector('.form-error');
  
  // Añadir clase de error al grupo del formulario
  formGroup.classList.add('error');
  
  // Actualizar mensaje de error si se proporciona
  if (mensaje && errorSpan) {
    errorSpan.textContent = mensaje;
  }
  
  // Dar foco al input con error
  input.focus();
}

function ocultarError(inputId) {
  const input = document.getElementById(inputId);
  const formGroup = input.parentElement;
  
  // Quitar clase de error
  formGroup.classList.remove('error');
}

function mostrarToast(mensaje, tipo = 'success') {
  const toast = document.getElementById('toast');
  
  // Eliminar clases previas
  toast.classList.remove('success', 'error', 'info');
  
  // Añadir clase según el tipo
  toast.classList.add(tipo);
  
  // Actualizar mensaje
  toast.textContent = mensaje;
  
  // Mostrar toast
  toast.classList.add('show');
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Funciones para exponer al ámbito global (window)
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // La inicialización ya está en el código original
});

// Función para generar ID único para citas
function generarIdUnico() {
  // Generar un ID aleatorio entre 1000 y 9999
  return Math.floor(Math.random() * 9000) + 1000;
}

// Función para formatear fecha en formato legible
function formatearFecha(fecha) {
  if (!fecha) return '';
  
  const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

// Función para obtener fecha actual en formato YYYY-MM-DD
function obtenerFechaActual() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Función para verificar si una fecha es anterior a hoy
function esFechaAnterior(fecha) {
  const fechaSeleccionada = new Date(fecha);
  fechaSeleccionada.setHours(0, 0, 0, 0);
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  return fechaSeleccionada < hoy;
}

// Función para verificar disponibilidad de horario
function verificarDisponibilidad(fecha, hora, idCitaExcluir = null) {
  // Filtrar citas para la fecha y hora especificadas
  const citasCoincidentes = citas.filter(cita => 
    cita.fecha === fecha && 
    cita.hora === hora && 
    (idCitaExcluir === null || cita.id_cita !== parseInt(idCitaExcluir))
  );
  
  // Si hay citas coincidentes, el horario no está disponible
  return citasCoincidentes.length === 0;
}

// Función para ordenar citas por fecha y hora
function ordenarCitas(citasArray) {
  return citasArray.sort((a, b) => {
    // Primero ordenar por fecha
    const fechaA = new Date(a.fecha);
    const fechaB = new Date(b.fecha);
    
    if (fechaA < fechaB) return -1;
    if (fechaA > fechaB) return 1;
    
    // Si las fechas son iguales, ordenar por hora
    return a.hora.localeCompare(b.hora);
  });
}

// Función para exportar citas a CSV
function exportarCitasCSV() {
  // Verificar si hay citas para exportar
  if (!citas || citas.length === 0) {
    mostrarToast('No hay citas para exportar', 'info');
    return;
  }
  
  // Encabezados del CSV
  let csvContent = 'ID,Fecha,Hora,Servicio,Mascota,Cliente\n';
  
  // Función para encontrar nombres de servicio y mascota
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? servicio.nombre : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? mascota.nombre : 'Desconocida';
  };
  
  const obtenerNombreCliente = (idMascota) => {
    const mascota = mascotas.find(m => m.id_mascota === idMascota);
    if (!mascota) return 'Desconocido';
    
    return mascota.id_cliente; // Idealmente aquí buscarías el nombre del cliente
  };
  
  // Generar filas del CSV
  citas.forEach(cita => {
    csvContent += `${cita.id_cita},${cita.fecha},${cita.hora},${obtenerNombreServicio(cita.id_servicio)},${obtenerNombreMascota(cita.id_mascota)},${obtenerNombreCliente(cita.id_mascota)}\n`;
  });
  
  // Crear objeto Blob para descargar
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Crear enlace de descarga y simular clic
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `citas_sweety_puppies_${obtenerFechaActual()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarToast('Citas exportadas correctamente', 'success');
}

// Función para validar formato de hora (HH:MM)
function esHoraValida(hora) {
  const patron = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return patron.test(hora);
}

// Función para validar formato de fecha (YYYY-MM-DD)
function esFechaValida(fecha) {
  const patron = /^\d{4}-\d{2}-\d{2}$/;
  return patron.test(fecha);
}

// Función para verificar si el horario está dentro del horario de atención
function enHorarioAtencion(hora) {
  // Suponiendo horario de atención de 9:00 a 18:00
  const horaNum = parseInt(hora.split(':')[0]);
  const minutos = parseInt(hora.split(':')[1]);
  
  // Convertir a minutos desde medianoche para comparación fácil
  const tiempoEnMinutos = horaNum * 60 + minutos;
  
  // Horario de atención: 9:00 (540 min) a 18:00 (1080 min)
  return tiempoEnMinutos >= 540 && tiempoEnMinutos <= 1080;
}

// Función para validar formulario completo con todas las reglas de negocio
function validarFormularioCompleto(formId) {
  const form = document.getElementById(formId);
  let formValido = true;
  
  // Validar campos requeridos (ya implementado en validarFormulario)
  if (!validarFormulario(formId)) {
    formValido = false;
  }
  
  // Validar fecha y hora según reglas adicionales
  const esFormularioEdicion = formId === 'editarForm';
  
  const fechaInput = document.getElementById(esFormularioEdicion ? 'editar_fecha' : 'fecha');
  const horaInput = document.getElementById(esFormularioEdicion ? 'editar_hora' : 'hora');
  const idCitaInput = document.getElementById(esFormularioEdicion ? 'editar_id_cita' : 'id_cita');
  
  // Validar que la fecha no sea en el pasado
  if (esFechaAnterior(fechaInput.value)) {
    mostrarError(fechaInput.id, 'La fecha no puede ser anterior a hoy');
    formValido = false;
  }
  
  // Validar formato de hora
  if (!esHoraValida(horaInput.value)) {
    mostrarError(horaInput.id, 'Formato de hora inválido');
    formValido = false;
  }
  
  // Validar que la hora esté dentro del horario de atención
  if (!enHorarioAtencion(horaInput.value)) {
    mostrarError(horaInput.id, 'La hora debe estar entre 9:00 y 18:00');
    formValido = false;
  }
  
  // Validar disponibilidad de horario
  const idCitaExcluir = esFormularioEdicion ? idCitaInput.value : null;
  if (!verificarDisponibilidad(fechaInput.value, horaInput.value, idCitaExcluir)) {
    mostrarError(horaInput.id, 'Este horario ya está ocupado');
    formValido = false;
  }
  
  return formValido;
}

// Función para limpiar formularios
function limpiarFormulario(formId) {
  const form = document.getElementById(formId);
  form.reset();
  
  // Quitar clases de los grupos de formulario
  const formGroups = form.querySelectorAll('.form-group');
  formGroups.forEach(group => {
    group.classList.remove('has-value', 'focused', 'error');
  });
}

// Función para sugerir próxima cita disponible
function sugerirProximaCita() {
  const hoy = new Date();
  let fechaSugerida = new Date(hoy);
  
  // Empezar desde el día actual
  fechaSugerida.setHours(9, 0, 0); // Empezar a las 9 AM
  
  // Si ya es tarde en el día actual, sugerir para mañana
  if (hoy.getHours() >= 17) {
    fechaSugerida.setDate(fechaSugerida.getDate() + 1);
  }
  
  // Formatear fecha para el campo de fecha
  const fechaStr = fechaSugerida.toISOString().split('T')[0];
  
  // Encontrar una hora disponible entre las 9:00 y las 18:00
  let horaEncontrada = false;
  let horaSugerida = '09:00';
  
  // Incrementar en intervalos de 30 minutos
  for (let hora = 9; hora < 18 && !horaEncontrada; hora++) {
    for (let minutos = 0; minutos < 60 && !horaEncontrada; minutos += 30) {
      const horaStr = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
      
      if (verificarDisponibilidad(fechaStr, horaStr)) {
        horaSugerida = horaStr;
        horaEncontrada = true;
        break;
      }
    }
  }
  
  // Si no encontramos horario disponible hoy, buscar mañana
  if (!horaEncontrada) {
    fechaSugerida.setDate(fechaSugerida.getDate() + 1);
    fechaSugerida.setHours(9, 0, 0);
    horaSugerida = '09:00';
    // Aquí podríamos implementar una búsqueda más exhaustiva para el día siguiente
  }
  
  return {
    fecha: fechaSugerida.toISOString().split('T')[0],
    hora: horaSugerida
  };
}

// Función para notificar al cliente por correo (simulada)
function notificarCliente(idCita) {
  const cita = citas.find(c => c.id_cita === parseInt(idCita));
  
  if (!cita) {
    console.error('Cita no encontrada para notificación');
    return false;
  }
  
  console.log(`Simulando envío de notificación para la cita ${idCita}`);
  mostrarToast('Recordatorio enviado al cliente', 'info');
  return true;
}

// Inicializar cualquier característica adicional cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
  // Ya hay un eventListener de DOMContentLoaded en el código original.
  // Para evitar conflictos, agrego estas funcionalidades aquí pero en la implementación
  // real deberían consolidarse en un solo bloque.
  
  // Inicializar botón de exportar CSV si existe
  const exportarBtn = document.getElementById('exportar-csv');
  if (exportarBtn) {
    exportarBtn.addEventListener('click', exportarCitasCSV);
  }
  
  // Inicializar sugerencia de cita si existe el botón
  const sugerirBtn = document.getElementById('sugerir-cita');
  if (sugerirBtn) {
    sugerirBtn.addEventListener('click', () => {
      const sugerencia = sugerirProximaCita();
      
      // Rellenar formulario con la sugerencia
      document.getElementById('fecha').value = sugerencia.fecha;
      document.getElementById('hora').value = sugerencia.hora;
      
      // Actualizar clases de los campos
      document.getElementById('fecha').parentElement.classList.add('has-value');
      document.getElementById('hora').parentElement.classList.add('has-value');
      
      mostrarToast('Se ha sugerido el próximo horario disponible', 'info');
    });
  }
});