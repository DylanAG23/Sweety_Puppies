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
async function inicializarAplicacion() {
  try {
    // Cargar datos en orden secuencial, esperando que cada operación termine
    await cargarServicios();
    await cargarMascotas();
    await cargarCitas(); // Ahora cargarCitas se ejecuta después de tener servicios y mascotas
    
    // Inicializar componentes UI después de tener todos los datos
    inicializarTabs();
    inicializarFormularios();
    inicializarModales();
    inicializarFiltros();
    inicializarBotonesAdicionales();
    
    // Cargar la tabla de citas si estamos en la pestaña de listado
    if (document.querySelector('.tab-btn[data-tab="listado"]')?.classList.contains('active')) {
      cargarTablaCitas();
    }
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    mostrarToast('Hubo un problema al cargar la aplicación. Intente recargar la página.', 'error');
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
    console.log('Citas cargadas:', citas); // Agregar log para depuración
    
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
      servicios = [];
      actualizarSelectServicios();
      return;
    }
    
    servicios = await response.json();
    console.log('Servicios cargados:', servicios); // Agregar log para depuración
    actualizarSelectServicios();
    
  } catch (error) {
    console.error('Error al cargar servicios:', error);
    // Datos de ejemplo para poder continuar
    servicios = [];
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
      mascotas = [];
      actualizarSelectMascotas();
      return;
    }
    
    mascotas = await response.json();
    console.log('Mascotas cargadas:', mascotas); // Agregar log para depuración
    actualizarSelectMascotas();
    
  } catch (error) {
    console.error('Error al cargar mascotas:', error);
    // Datos de ejemplo para poder continuar
    mascotas = [];
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
      const nombreServicio = servicio.nombre || 'Sin nombre';
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
      const nombreCliente = mascota.nombre_cliente || 'Desconocido';
      const cedulaCliente = mascota.cedula_cliente || 'Desconocido';

      option.textContent = `${nombreMascota} - Cliente: ${nombreCliente} (${cedulaCliente})`;
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
      const nombreCliente = mascota.nombre_cliente || 'Desconocido';
      const cedulaCliente = mascota.cedula_cliente || 'Desconocido';
      option.textContent = `${nombreMascota} - Cliente: ${nombreCliente} (${cedulaCliente})`;
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
    
    await cargarCitas();
    
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
    return servicio ? (servicio.nombre || servicio.nombre_servicio || 'Sin nombre') : 'Desconocido';
  };
  
  const obtenerNombreMascota = (id) => {
    const mascota = mascotas.find(m => m.id_mascota === id);
    return mascota ? (mascota.nombre || mascota.nombre_mascota || 'Sin nombre') : 'Desconocida';
  };
  
  // Generar filas con los resultados
  resultados.forEach(cita => {
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
        <td>${cita.nombre_servicio || obtenerNombreServicio(cita.id_servicio)}</td>
        <td>${cita.nombre_mascota || obtenerNombreMascota(cita.id_mascota)}</td>
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
  
  // Generar filas de la tabla
  let html = '';
  citas.forEach(cita => {
    // Priorizar los nombres que ya vienen del backend con JOIN
    const nombreServicio = cita.nombre_servicio || obtenerNombreServicio(cita.id_servicio);
    const nombreMascota = cita.nombre_mascota || obtenerNombreMascota(cita.id_mascota);
    const nombreCliente = cita.nombre_cliente || obtenerNombreCliente(cita.id_mascota);
    
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
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

// Función para obtener nombre del servicio
function obtenerNombreServicio(id) {
  const servicio = servicios.find(s => s.id_servicio === id);
  return servicio ? (servicio.nombre || 'Sin nombre') : 'Desconocido';
}

// Función para obtener nombre de la mascota
function obtenerNombreMascota(id) {
  const mascota = mascotas.find(m => m.id_mascota === id);
  return mascota ? (mascota.nombre || 'Sin nombre') : 'Desconocida';
}

// Función para obtener nombre del cliente
function obtenerNombreCliente(idMascota) {
  const mascota = mascotas.find(m => m.id_mascota === idMascota);
  if (!mascota) return 'Desconocido';
  
  return mascota.nombre_cliente || 'Desconocido';
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
  
  // Generar filas de la tabla con las citas filtradas
  let html = '';
  citasFiltradas.forEach(cita => {
    // Priorizar los nombres que ya vienen del backend con JOIN
    const nombreServicio = cita.nombre_servicio || obtenerNombreServicio(cita.id_servicio);
    const nombreMascota = cita.nombre_mascota || obtenerNombreMascota(cita.id_mascota);
    const nombreCliente = cita.nombre_cliente || obtenerNombreCliente(cita.id_mascota);
    
    html += `
      <tr>
        <td>${cita.id_cita}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
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
  
  // Priorizar los nombres que ya vienen del backend con JOIN
  const nombreServicio = cita.nombre_servicio || obtenerNombreServicio(cita.id_servicio);
  const nombreMascota = cita.nombre_mascota || obtenerNombreMascota(cita.id_mascota);
  
  // Actualizar texto de confirmación
  document.getElementById('confirmar-texto').innerHTML = `
    ¿Estás seguro de eliminar la cita del ${cita.fecha} a las ${cita.hora} para 
    <strong>${nombreMascota}</strong> (Servicio: ${nombreServicio})?
  `;
  
  // Mostrar el modal
  document.getElementById('modalEliminar').classList.add('show');
}

// Función para editar cita
async function handleEditarCita(e) {
  e.preventDefault();
  
  if (!citaActual) {
    mostrarToast('Error: No hay cita seleccionada para editar', 'error');
    return;
  }
  
  // Validar formulario
  if (!validarFormularioCompleto('editarForm')) {
    return;
  }
  
  // Obtener datos del formulario
  const citaEditada = {
    fecha: document.getElementById('editar_fecha').value.trim(),
    hora: document.getElementById('editar_hora').value.trim(),
    id_servicio: parseInt(document.getElementById('editar_id_servicio').value),
    id_mascota: parseInt(document.getElementById('editar_id_mascota').value)
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#editarForm .btn-guardar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Guardando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar actualización a la API
    const response = await fetch(`${API_URL_CITAS}/${citaActual.id_cita}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(citaEditada)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error('Error al actualizar la cita: ' + (errorData.error || response.statusText));
    }
    
    // Actualizar la cita en la lista local
    const index = citas.findIndex(c => c.id_cita === citaActual.id_cita);
    if (index !== -1) {
      // Mantener el ID y actualizar el resto de campos
      citas[index] = {
        ...citas[index],
        ...citaEditada
      };
    }
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Cambios Guardados!';
    submitBtn.classList.add('sent');
    
    // Mostrar notificación
    mostrarToast('Cita actualizada correctamente', 'success');
    
    // Cerrar modal y actualizar tabla después de un breve tiempo
    setTimeout(() => {
      document.getElementById('modalEditar').classList.remove('show');
      cargarTablaCitas();
      
      // Restaurar botón
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
      
      // Limpiar referencia a cita actual
      citaActual = null;
    }, 1500);
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al actualizar cita: ' + error.message, 'error');
  }
}

// Función para eliminar cita (CORREGIDA)
async function eliminarCita(idCita) {
  // Mostrar indicador de carga
  const eliminarBtn = document.getElementById('confirmarEliminar');
  const originalText = eliminarBtn.textContent;
  eliminarBtn.textContent = 'Eliminando...';
  eliminarBtn.disabled = true;
  
  try {
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL_CITAS}/${idCita}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error('Error al eliminar la cita: ' + (errorData.error || response.statusText));
    }
    
    // Eliminar la cita de la lista local
    citas = citas.filter(c => c.id_cita !== parseInt(idCita));
    
    // Cambiar estado del botón
    eliminarBtn.textContent = '¡Eliminada!';
    eliminarBtn.classList.add('sent');
    
    // Mostrar notificación
    mostrarToast('Cita eliminada correctamente', 'success');
    
    // Cerrar modal y actualizar tabla después de un breve tiempo
    setTimeout(() => {
      // CORRECCIÓN: usar el ID correcto del modal según tu HTML
      document.getElementById('eliminarModal').classList.remove('show');
      cargarTablaCitas();
      
      // Restaurar botón
      eliminarBtn.textContent = originalText;
      eliminarBtn.disabled = false;
      eliminarBtn.classList.remove('sent');
    }, 1500);
    
  } catch (error) {
    console.error('Error:', error);
    eliminarBtn.textContent = originalText;
    eliminarBtn.disabled = false;
    mostrarToast('Error al eliminar la cita: ' + error.message, 'error');
  }
}

// También necesitarás estas funciones auxiliares si no las tienes:

// Función para abrir el modal de eliminación
function abrirModalEliminar(idCita) {
  document.getElementById('eliminar_id_cita').value = idCita;
  document.getElementById('eliminarModal').classList.add('show');
}

// Event listeners para el modal de eliminar
document.addEventListener('DOMContentLoaded', function() {
  // Cerrar modal con X
  document.querySelectorAll('.cerrar-modal').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.modal').classList.remove('show');
    });
  });
  
  // Cerrar modal con botón Cancelar
  document.querySelectorAll('.cerrar-modal-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.modal').classList.remove('show');
    });
  });
  
  // Confirmar eliminación
  document.getElementById('confirmarEliminar').addEventListener('click', function() {
    const idCita = document.getElementById('eliminar_id_cita').value;
    eliminarCita(idCita);
  });
  
  // Cerrar modal al hacer clic fuera de él
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('show');
      }
    });
  });
});

// Función para crear botones de acción en la tabla
function crearBotonesAccion(cita) {
  return `
    <div class="acciones-buttons">
      <button class="btn-editar" onclick="abrirModalEditar(${cita.id_cita})">
        <i class="icon-edit"></i> Editar
      </button>
      <button class="btn-eliminar" onclick="abrirModalEliminar(${cita.id_cita})">
        <i class="icon-delete"></i> Eliminar
      </button>
    </div>
  `;
}

// Función para validar formulario completo
function validarFormularioCompleto(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;
  
  let esValido = true;
  
  // Obtener todos los inputs obligatorios
  const inputs = form.querySelectorAll('input:required, select:required');
  
  inputs.forEach(input => {
    // Limpiar errores previos
    limpiarError(input.id);
    
    // Validar campo vacío
    if (input.value.trim() === '') {
      mostrarError(input.id, 'Este campo es obligatorio');
      esValido = false;
    }
    
    // Validaciones específicas por tipo de campo
    switch (input.id) {
      case 'id_cita':
      case 'editar_id_cita':
        if (isNaN(input.value) || input.value <= 0) {
          mostrarError(input.id, 'Ingresa un ID válido (número positivo)');
          esValido = false;
        }
        break;
        
      case 'fecha':
      case 'editar_fecha':
        if (!input.value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          mostrarError(input.id, 'Formato de fecha inválido (YYYY-MM-DD)');
          esValido = false;
        }
        break;
        
      case 'hora':
      case 'editar_hora':
        if (!input.value.match(/^\d{2}:\d{2}$/)) {
          mostrarError(input.id, 'Formato de hora inválido (HH:MM)');
          esValido = false;
        }
        break;
    }
  });
  
  return esValido;
}

// Funciones auxiliares para manejo de errores
function mostrarError(inputId, mensaje) {
  const formGroup = document.getElementById(inputId).closest('.form-group');
  if (formGroup) {
    formGroup.classList.add('error');
    
    // Buscar o crear elemento de mensaje de error
    let mensajeError = formGroup.querySelector('.error-message');
    if (!mensajeError) {
      mensajeError = document.createElement('div');
      mensajeError.className = 'error-message';
      formGroup.appendChild(mensajeError);
    }
    
    mensajeError.textContent = mensaje;
  }
}

function limpiarError(inputId) {
  const formGroup = document.getElementById(inputId).closest('.form-group');
  if (formGroup) {
    formGroup.classList.remove('error');
    
    // Eliminar mensaje de error si existe
    const mensajeError = formGroup.querySelector('.error-message');
    if (mensajeError) {
      mensajeError.remove();
    }
  }
}

// Función para mostrar notificaciones toast
function mostrarToast(mensaje, tipo = 'info') {
  // Eliminar toast anterior si existe
  const toastAnterior = document.querySelector('.toast');
  if (toastAnterior) {
    toastAnterior.remove();
  }
  
  // Crear nuevo toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  
  // Añadir al DOM
  document.body.appendChild(toast);
  
  // Mostrar con animación
  setTimeout(() => {
    toast.classList.add('visible');
  }, 100);
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('visible');
    
    // Eliminar del DOM después de que termine la animación
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 3000);
}

// Función para exportar citas a CSV
function exportarCitasCSV() {
  // Verificar si hay citas para exportar
  if (!citas || citas.length === 0) {
    mostrarToast('No hay citas para exportar', 'warning');
    return;
  }
  
  // Crear cabeceras del CSV
  let csv = 'ID,Fecha,Hora,Servicio,Mascota,Cliente\n';
  
  // Añadir cada cita al CSV
  citas.forEach(cita => {
    const nombreServicio = cita.nombre_servicio || obtenerNombreServicio(cita.id_servicio);
    const nombreMascota = cita.nombre_mascota || obtenerNombreMascota(cita.id_mascota);
    const nombreCliente = cita.nombre_cliente || obtenerNombreCliente(cita.id_mascota);
    
    // Escapar campos con comas si es necesario
    const escaparCampo = (campo) => {
      if (campo.includes(',')) {
        return `"${campo}"`;
      }
      return campo;
    };
    
    // Añadir fila al CSV
    csv += `${cita.id_cita},${cita.fecha},${cita.hora},${escaparCampo(nombreServicio)},${escaparCampo(nombreMascota)},${escaparCampo(nombreCliente)}\n`;
  });
  
  // Crear un Blob con el contenido CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // Crear URL temporal y enlace de descarga
  const url = window.URL.createObjectURL(blob);
  const fechaActual = new Date().toISOString().slice(0, 10);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.setAttribute('download', `citas_veterinaria_${fechaActual}.csv`);
  enlace.style.display = 'none';
  
  // Añadir al DOM, hacer clic y luego eliminar
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  
  // Notificar al usuario
  mostrarToast('Archivo CSV exportado correctamente', 'success');
}

// Función para sugerir próxima cita disponible
function sugerirProximaCita() {
  // Por defecto sugerimos para el día siguiente a la última cita
  let fechaSugerida = new Date();
  fechaSugerida.setDate(fechaSugerida.getDate() + 1);
  
  let horaSugerida = '09:00';
  
  // Si hay citas, buscamos un espacio libre
  if (citas && citas.length > 0) {
    // Ordenar citas por fecha
    const citasOrdenadas = [...citas].sort((a, b) => {
      if (a.fecha !== b.fecha) {
        return new Date(a.fecha) - new Date(b.fecha);
      }
      return a.hora.localeCompare(b.hora);
    });
    
    // Obtener la última fecha programada
    const ultimaCita = citasOrdenadas[citasOrdenadas.length - 1];
    const ultimaFecha = new Date(ultimaCita.fecha);
    
    if (ultimaFecha > fechaSugerida) {
      fechaSugerida = new Date(ultimaFecha);
    }
    
    // Buscar citas en la fecha sugerida y encontrar huecos
    const citasEnFechaSugerida = citas.filter(c => c.fecha === fechaSugerida.toISOString().split('T')[0]);
    
    if (citasEnFechaSugerida.length > 0) {
      // Ordenar por hora
      citasEnFechaSugerida.sort((a, b) => a.hora.localeCompare(b.hora));
      
      // Definir horario de atención (de 9:00 a 18:00 cada 30 minutos)
      const horasDisponibles = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        '17:00', '17:30', '18:00'
      ];
      
      // Encontrar la primera hora disponible
      for (const hora of horasDisponibles) {
        const citaExistente = citasEnFechaSugerida.find(c => c.hora === hora);
        if (!citaExistente) {
          horaSugerida = hora;
          break;
        }
      }
      
      // Si no hay horas disponibles, sugerir para el día siguiente a las 9:00
      if (citasEnFechaSugerida.length >= horasDisponibles.length) {
        fechaSugerida.setDate(fechaSugerida.getDate() + 1);
        horaSugerida = '09:00';
      }
    }
  }
  
  // Formatear fecha como YYYY-MM-DD
  const fechaFormateada = fechaSugerida.toISOString().split('T')[0];
  
  return {
    fecha: fechaFormateada,
    hora: horaSugerida
  };
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarAplicacion);