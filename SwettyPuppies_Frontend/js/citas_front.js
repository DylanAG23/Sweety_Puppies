// Variables globales
let citas = [];
let citaActual = null;
let servicios = [];
let mascotas = [];
const API_URL_CITAS = 'http://localhost:3000/api/citas';
const API_URL_SERVICIOS = 'http://localhost:3000/api/servicios';
const API_URL_MASCOTAS = 'http://localhost:3000/api/mascotas';
const API_URL_CLIENTES = 'http://localhost:3000/api/clientes';

// Función principal de inicialización
function inicializarAplicacion() {
  
  
  // Cargar datos iniciales - cambiamos el orden para que servicios y mascotas se carguen primero
  cargarServicios();
  cargarMascotas();
  cargarCitas();
  
  // Inicializar eventos de tabs
  inicializarTabs();
  
  // Inicializar formularios y comportamiento de campos
  inicializarFormularios();
  
  // Inicializar modales
  inicializarModales();
  
  // Inicializar filtros
  inicializarFiltros();
  
  // Inicializar botones adicionales
  inicializarBotonesAdicionales();
  
  // Cargar la tabla de citas si estamos en la pestaña de listado
  if (document.querySelector('.tab-btn[data-tab="listado"]')?.classList.contains('active')) {
    cargarTablaCitas();
  }
}

// Inicializar tabs
function inicializarTabs() {
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
}

// Inicializar formularios
function inicializarFormularios() {
  // Comportamiento de campos de formulario
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
}

// Inicializar modales
function inicializarModales() {
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
}

// Inicializar filtros
function inicializarFiltros() {
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
}

// Inicializar botones adicionales
function inicializarBotonesAdicionales() {
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
      const fechaInput = document.getElementById('fecha');
      const horaInput = document.getElementById('hora');
      
      if (fechaInput && horaInput) {
        fechaInput.value = sugerencia.fecha;
        horaInput.value = sugerencia.hora;
        
        // Actualizar clases de los campos
        fechaInput.parentElement.classList.add('has-value');
        horaInput.parentElement.classList.add('has-value');
        
        mostrarToast('Se ha sugerido el próximo horario disponible', 'info');
      }
    });
  }
}


// Funciones para cargar datos
async function cargarCitas() {
  try {
    const response = await fetch(API_URL_CITAS);
    
    if (!response.ok) {
      // Manejo de error mejorado
      console.warn('El servidor devolvió un error al cargar las citas. Trabajando con datos locales.');
      // No lanzamos error, simplemente seguimos con un array vacío
      citas = [];
      return;
    }
    
    citas = await response.json();
    
    // Si estamos en la pestaña de listado, actualizar la tabla
    const tabListado = document.querySelector('.tab-btn[data-tab="listado"]');
    if (tabListado && tabListado.classList.contains('active')) {
      cargarTablaCitas();
    }
  } catch (error) {
    console.error('Error al cargar citas:', error);
    // Notificar al usuario, pero no bloquear la interfaz
    mostrarToast('No se pudieron cargar las citas desde el servidor', 'warning');
    // Inicializamos con array vacío para que la app pueda seguir funcionando
    citas = [];
  }
}

async function cargarServicios() {
  try {
    const response = await fetch(API_URL_SERVICIOS);
    
    if (!response.ok) {
      console.warn('El servidor devolvió un error al cargar los servicios. Trabajando con datos de ejemplo.');
      // Datos de ejemplo para poder continuar
      actualizarSelectServicios();
      return;
    }
    
    servicios = await response.json();
    actualizarSelectServicios();
    
  } catch (error) {
    console.error('Error al cargar servicios:', error);
    // Datos de ejemplo para poder continuar
    
    actualizarSelectServicios();
    mostrarToast('No se pudieron cargar los servicios desde el servidor', 'warning');
  }
}

async function cargarMascotas() {
  try {
    const response = await fetch(API_URL_MASCOTAS);
    
    if (!response.ok) {
      console.warn('El servidor devolvió un error al cargar las mascotas. Trabajando con datos de ejemplo.');
      // Datos de ejemplo para poder continuar
      
      actualizarSelectMascotas();
      return;
    }
    
    mascotas = await response.json();
    actualizarSelectMascotas();
    
  } catch (error) {
    console.error('Error al cargar mascotas:', error);
    // Datos de ejemplo para poder continuar
    
    actualizarSelectMascotas();
    mostrarToast('No se pudieron cargar las mascotas desde el servidor', 'warning');
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
      // Verificar que nombre y precio existan
      const nombreServicio = servicio.nombre || 'Sin nombre';
      const precioServicio = servicio.precio || 0;
      option.textContent = `${nombreServicio} - $${precioServicio}`;
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
      // Verificar que nombre y precio existan
      const tipoServicio = servicio.tipo || 'Sin nombre';
      const precioServicio = servicio.precio || 0;
      option.textContent = `${nombreServicio} - $${precioServicio}`;
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
      // Verificar que los valores existan
      const nombreMascota = mascota.nombre || 'Sin nombre';
      const idCliente = mascota.nombre_cliente || 'Desconocido';
      const cedulaMascota = mascota.cedula_cliente || 'Desconocido';

      option.textContent = `${nombreMascota} - Cliente: ${idCliente} ${cedulaMascota}`;
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
      // Verificar que los valores existan
      const nombreMascota = mascota.nombre || 'Sin nombre';
      const especieMascota = mascota.especie || 'Desconocida';
      const idCliente = mascota.id_cliente || 'Desconocido';
      option.textContent = `${nombreMascota} (${especieMascota}) - Cliente: ${idCliente}`;
      selectMascotaEditar.appendChild(option);
    });
  }
}

// Funciones para la gestión de citas
async function handleNuevaCita(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormularioCompleto('citaForm')) {
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
      const responseText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }
      
      // Verificar si es un error de ID duplicado
      if (errorData.error && errorData.error.includes('duplicate key')) {
        mostrarError('id_cita', 'Este ID de cita ya está registrado');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error('Error al crear la cita: ' + (errorData.error || response.statusText));
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
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al agendar la cita: ' + error.message, 'error');
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
  
  if (!contenedor) {
    console.error('El contenedor de resultados no existe');
    return;
  }
  
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
  
  // Función para encontrar nombres de servicio y mascota - mejoradas con valores predeterminados
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? (servicio.nombre || 'Sin nombre') : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? (mascota.nombre || 'Sin nombre') : 'Desconocida';
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
  
  if (!tbody || !sinCitas) {
    console.error('Elementos no encontrados para cargar tabla de citas');
    return;
  }
  
  // Verificar si hay citas
  if (!citas || citas.length === 0) {
    tbody.innerHTML = '';
    sinCitas.style.display = 'block';
    return;
  }
  
  // Ocultar mensaje de no hay citas
  sinCitas.style.display = 'none';
  
  // Función para encontrar nombres de servicio y mascota - mejoradas con valores predeterminados
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? (servicio.nombre || 'Sin nombre') : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? (mascota.nombre || 'Sin nombre') : 'Desconocida';
  };
  
  const obtenerNombreCliente = (idMascota) => {
    const mascota = mascotas.find(m => m.id_mascota === idMascota);
    if (!mascota) return 'Desconocido';
    
    return mascota.id_cliente || 'Desconocido';
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
  
  if (!tbody || !sinCitas) {
    console.error('Elementos no encontrados para filtrar tabla');
    return;
  }
  
  // Verificar si hay citas en la fecha seleccionada
  if (citasFiltradas.length === 0) {
    tbody.innerHTML = '';
    sinCitas.textContent = `No hay citas para la fecha ${fechaFiltro}`;
    sinCitas.style.display = 'block';
    return;
  }
  
  sinCitas.style.display = 'none';
  
  // Función para encontrar nombres de servicio y mascota - mejoradas con valores predeterminados
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? (servicio.nombre || 'Sin nombre') : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? (mascota.nombre || 'Sin nombre') : 'Desconocida';
  };
  
  const obtenerNombreCliente = (idMascota) => {
    const mascota = mascotas.find(m => m.id_mascota === idMascota);
    if (!mascota) return 'Desconocido';
    
    return mascota.id_cliente || 'Desconocido';
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

// Función para abrir modal de edición
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
  
  if (selectServicio && selectMascota) {
    // Buscar y seleccionar el servicio correspondiente
for (let i = 0; i < selectServicio.options.length; i++) {
  if (parseInt(selectServicio.options[i].value) === cita.id_servicio) {
    selectServicio.selectedIndex = i;
    selectServicio.parentElement.classList.add('has-value');
    break;
  }
}

// Buscar y seleccionar la mascota correspondiente
for (let i = 0; i < selectMascota.options.length; i++) {
  if (parseInt(selectMascota.options[i].value) === cita.id_mascota) {
    selectMascota.selectedIndex = i;
    selectMascota.parentElement.classList.add('has-value');
    break;
  }
}
}

// Actualizar clases de los campos para mostrar que tienen valores
document.getElementById('editar_fecha').parentElement.classList.add('has-value');
document.getElementById('editar_hora').parentElement.classList.add('has-value');

// Guardar la cita actual siendo editada
citaActual = cita;

// Mostrar el modal
document.getElementById('modalEditar').classList.add('show');
}

// Función para abrir modal de eliminación
function abrirModalEliminar(idCita) {
  // Guardar ID de la cita a eliminar
  document.getElementById('eliminar_id_cita').value = idCita;
  
  // Buscar la cita para mostrar información
  const cita = citas.find(c => c.id_cita === idCita);
  
  if (!cita) {
    mostrarToast('Cita no encontrada', 'error');
    return;
  }
  
  // Obtener nombre de mascota y servicio para mostrar en confirmación
  const nombreServicio = servicios.find(s => s.id_servicio === cita.id_servicio)?.nombre || 'Desconocido';
  const nombreMascota = mascotas.find(m => m.id_mascota === cita.id_mascota)?.nombre || 'Desconocida';
  
  // Actualizar texto de confirmación
  document.getElementById('confirmar-texto').innerHTML = `
    ¿Estás seguro de eliminar la cita del ${cita.fecha} a las ${cita.hora} para 
    <strong>${nombreMascota}</strong> (Servicio: ${nombreServicio})?
  `;
  
  // Mostrar el modal
  document.getElementById('modalEliminar').classList.add('show');
}

// Función para manejar edición de cita
async function handleEditarCita(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormularioCompleto('editarForm')) {
    return;
  }
  
  // Obtener datos del formulario
  const citaEditada = {
    id_cita: parseInt(document.getElementById('editar_id_cita').value.trim()),
    fecha: document.getElementById('editar_fecha').value.trim(),
    hora: document.getElementById('editar_hora').value.trim(),
    id_servicio: parseInt(document.getElementById('editar_id_servicio').value.trim()),
    id_mascota: parseInt(document.getElementById('editar_id_mascota').value.trim())
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#editarForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Actualizando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar cita actualizada a la API
    const response = await fetch(`${API_URL_CITAS}/${citaEditada.id_cita}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(citaEditada)
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar la cita');
    }
    
    // Actualizar la cita en la lista local
    const index = citas.findIndex(c => c.id_cita === citaEditada.id_cita);
    if (index !== -1) {
      citas[index] = citaEditada;
    }
    
    // Cerrar modal
    document.getElementById('modalEditar').classList.remove('show');
    
    // Actualizar tabla
    cargarTablaCitas();
    
    // Mostrar notificación
    mostrarToast('Cita actualizada correctamente', 'success');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al actualizar la cita: ' + error.message, 'error');
  } finally {
    // Restaurar botón
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Función para eliminar cita
async function eliminarCita(idCita) {
  try {
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL_CITAS}/${idCita}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Error al eliminar la cita');
    }
    
    // Eliminar la cita de la lista local
    citas = citas.filter(c => c.id_cita !== parseInt(idCita));
    
    // Cerrar modal
    document.getElementById('modalEliminar').classList.remove('show');
    
    // Actualizar tabla
    cargarTablaCitas();
    
    // Mostrar notificación
    mostrarToast('Cita eliminada correctamente', 'success');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al eliminar la cita: ' + error.message, 'error');
  }
}

// Función para validar formulario completo
function validarFormularioCompleto(formId) {
  const form = document.getElementById(formId);
  let isValid = true;
  
  // Validar cada campo requerido
  const camposRequeridos = form.querySelectorAll('[required]');
  camposRequeridos.forEach(campo => {
    if (campo.value.trim() === '') {
      mostrarError(campo.id, 'Este campo es obligatorio');
      isValid = false;
    } else {
      // Limpiar error si existía
      limpiarError(campo.id);
    }
  });
  
  // Validaciones específicas adicionales
  const idCita = form.querySelector('[id$="id_cita"]');
  if (idCita && isNaN(parseInt(idCita.value))) {
    mostrarError(idCita.id, 'El ID debe ser un número');
    isValid = false;
  }
  
  // Validar formato de fecha
  const fecha = form.querySelector('[id$="fecha"]');
  if (fecha && fecha.value && !fecha.value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    mostrarError(fecha.id, 'Formato de fecha inválido (YYYY-MM-DD)');
    isValid = false;
  }
  
  // Validar formato de hora
  const hora = form.querySelector('[id$="hora"]');
  if (hora && hora.value && !hora.value.match(/^\d{2}:\d{2}$/)) {
    mostrarError(hora.id, 'Formato de hora inválido (HH:MM)');
    isValid = false;
  }
  
  return isValid;
}

// Función para mostrar error en campo
function mostrarError(campoId, mensaje) {
  const campo = document.getElementById(campoId);
  if (!campo) return;
  
  // Agregar clase de error al grupo
  campo.parentElement.classList.add('error');
  
  // Buscar o crear elemento de mensaje de error
  let mensajeError = campo.parentElement.querySelector('.error-mensaje');
  if (!mensajeError) {
    mensajeError = document.createElement('span');
    mensajeError.className = 'error-mensaje';
    campo.parentElement.appendChild(mensajeError);
  }
  
  mensajeError.textContent = mensaje;
}

// Función para limpiar error en campo
function limpiarError(campoId) {
  const campo = document.getElementById(campoId);
  if (!campo) return;
  
  // Quitar clase de error
  campo.parentElement.classList.remove('error');
  
  // Eliminar mensaje de error si existe
  const mensajeError = campo.parentElement.querySelector('.error-mensaje');
  if (mensajeError) {
    mensajeError.remove();
  }
}

// Función para mostrar toast de notificación
function mostrarToast(mensaje, tipo = 'info') {
  // Crear contenedor de toast si no existe
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Crear elemento toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  
  // Agregar al contenedor
  toastContainer.appendChild(toast);
  
  // Agregar clase para animación de entrada
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Eliminar después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300); // Tiempo para la animación de salida
  }, 3000);
}

// Función para exportar citas a CSV
function exportarCitasCSV() {
  // Verificar si hay citas para exportar
  if (!citas || citas.length === 0) {
    mostrarToast('No hay citas para exportar', 'warning');
    return;
  }
  
  // Función para encontrar nombres de servicio y mascota
  const obtenerNombreServicio = (id) => {
    const servicio = servicios.find(s => s.id_servicio === id);
    return servicio ? (servicio.nombre || 'Sin nombre') : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? (mascota.nombre || 'Sin nombre') : 'Desconocida';
  };
  
  const obtenerNombreCliente = (idMascota) => {
    const mascota = mascotas.find(m => m.id_mascota === idMascota);
    if (!mascota) return 'Desconocido';
    
    return mascota.id_cliente || 'Desconocido';
  };
  
  // Crear encabezados del CSV
  let csvContent = 'ID,Fecha,Hora,Servicio,Mascota,Cliente\n';
  
  // Agregar filas de datos
  citas.forEach(cita => {
    csvContent += `${cita.id_cita},${cita.fecha},${cita.hora},${obtenerNombreServicio(cita.id_servicio)},${obtenerNombreMascota(cita.id_mascota)},${obtenerNombreCliente(cita.id_mascota)}\n`;
  });
  
  // Crear blob y descargar
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Crear enlace de descarga
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `citas_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.display = 'none';
  
  // Añadir al documento, hacer clic y limpiar
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarToast('Archivo CSV exportado correctamente', 'success');
}

// Función para sugerir próxima cita disponible
function sugerirProximaCita() {
  // Obtener fecha actual
  const hoy = new Date();
  let fechaSugerida = new Date(hoy);
  
  // Añadir un día para empezar a sugerir desde mañana
  fechaSugerida.setDate(fechaSugerida.getDate() + 1);
  
  // Si es fin de semana, avanzar al lunes
  const diaSemana = fechaSugerida.getDay(); // 0 (domingo) a 6 (sábado)
  if (diaSemana === 0) { // Domingo
    fechaSugerida.setDate(fechaSugerida.getDate() + 1);
  } else if (diaSemana === 6) { // Sábado
    fechaSugerida.setDate(fechaSugerida.getDate() + 2);
  }
  
  // Convertir a formato YYYY-MM-DD
  const fechaStr = fechaSugerida.toISOString().slice(0, 10);
  
  // Verificar citas existentes en esa fecha para encontrar horarios disponibles
  const citasEnFecha = citas.filter(cita => cita.fecha === fechaStr);
  
  // Horarios de atención (9 AM a 5 PM, cada 30 minutos)
  const horariosDisponibles = [];
  
  for (let hora = 9; hora < 17; hora++) {
    const horaStr = `${hora.toString().padStart(2, '0')}:00`;
    const mediaHoraStr = `${hora.toString().padStart(2, '0')}:30`;
    
    // Verificar si ya hay cita en ese horario
    if (!citasEnFecha.some(cita => cita.hora === horaStr)) {
      horariosDisponibles.push(horaStr);
    }
    
    if (!citasEnFecha.some(cita => cita.hora === mediaHoraStr)) {
      horariosDisponibles.push(mediaHoraStr);
    }
  }
  
  // Seleccionar el primer horario disponible
  let horaSugerida = '09:00';
  if (horariosDisponibles.length > 0) {
    horaSugerida = horariosDisponibles[0];
  }
  
  return {
    fecha: fechaStr,
    hora: horaSugerida
  };
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializarAplicacion);