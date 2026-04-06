// Variables globales
let mascotas = [];
let clientes = [];
let mascotaActual = null;
const API_URL = 'http://localhost:3000/api/mascotas';
const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar cursor personalizado si existe
  initCursor();

  // Cargar mascotas y clientes al iniciar
  cargarMascotas();
  cargarClientes();

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
      
      // Si es el tab de listado, cargar la lista de mascotas
      if (tabId === 'listado') {
        cargarTablaMascotas();
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
  
  // Inicializar formulario de creación de mascota
  const mascotaForm = document.getElementById('mascotaForm');
  if (mascotaForm) {
    mascotaForm.addEventListener('submit', handleNuevaMascota);
  }
  
  // Inicializar búsqueda de cliente por cédula en el formulario de creación
  const cedulaClienteInput = document.getElementById('cedula_cliente');
  if (cedulaClienteInput) {
    cedulaClienteInput.addEventListener('input', debounce(handleBuscarCliente, 500));
  }
  
  // Inicializar formulario de búsqueda
  const buscarMascotaForm = document.getElementById('buscarMascotaForm');
  if (buscarMascotaForm) {
    buscarMascotaForm.addEventListener('submit', event => {
      event.preventDefault();
      handleBuscarMascota();
    });
  }
  
  // Inicializar formulario de edición
  const editarForm = document.getElementById('editarForm');
  if (editarForm) {
    editarForm.addEventListener('submit', event => {
      event.preventDefault();
      handleEditarMascota();
    });
  }

  // Inicializar formulario de nuevo cliente
  const nuevoClienteForm = document.getElementById('clienteForm');
  if (nuevoClienteForm) {
    nuevoClienteForm.addEventListener('submit', event => {
      event.preventDefault();
      handleNuevoCliente();
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
      if (mascotaActual) {
        eliminarMascota(mascotaActual);
      }
    });
  }
  
  // Cargar la tabla de mascotas si estamos en la pestaña de listado
  if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
    cargarTablaMascotas();
  }
});

// Función para retrasar la ejecución (usado para la búsqueda mientras se escribe)
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Inicializar cursor personalizado si existe
function initCursor() {
  const cursorDot = document.getElementById('cursor-dot');
  const cursorOutline = document.getElementById('cursor-outline');
  
  if (cursorDot && cursorOutline) {
    document.addEventListener('mousemove', (e) => {
      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
      cursorOutline.style.left = `${e.clientX}px`;
      cursorOutline.style.top = `${e.clientY}px`;
    });
  }
}

// Función para cargar mascotas desde la API
async function cargarMascotas() {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`Error al cargar las mascotas: ${response.status}`);
    }
    
    mascotas = await response.json();
    console.log("Mascotas cargadas:", mascotas);
    
    // Si estamos en la pestaña de listado, actualizar la tabla
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaMascotas();
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar las mascotas: ' + error.message, 'error');
  }
}

// Función para cargar clientes desde la API
async function cargarClientes() {
  try {
    const response = await fetch(API_CLIENTES_URL);
    
    if (!response.ok) {
      throw new Error(`Error al cargar los clientes: ${response.status}`);
    }
    
    clientes = await response.json();
    console.log("Clientes cargados:", clientes);
    
    // Actualizar el datalist de clientes
    actualizarDatalistClientes();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar los clientes: ' + error.message, 'error');
  }
}

// Función para actualizar el datalist de clientes
function actualizarDatalistClientes() {
  const datalist = document.getElementById('clientes-list');
  if (!datalist) return;
  
  // Limpiar datalist
  datalist.innerHTML = '';
  
  // Agregar clientes al datalist
  clientes.forEach(cliente => {
    const option = document.createElement('option');
    option.value = cliente.cedula;
    option.textContent = `${cliente.cedula} - ${cliente.nombre}`;
    datalist.appendChild(option);
  });
}

// Función para buscar cliente por cédula
async function handleBuscarCliente() {
  const cedula = document.getElementById('cedula_cliente').value.trim();
  const infoCliente = document.getElementById('info-cliente');
  
  if (!infoCliente) return;
  
  // Si no hay cédula, limpiar la información del cliente
  if (!cedula) {
    infoCliente.innerHTML = '';
    infoCliente.classList.remove('encontrado', 'no-encontrado');
    return;
  }
  
  // Buscar en la lista local primero
  const clienteLocal = clientes.find(c => c.cedula === cedula);
  
  if (clienteLocal) {
    // Cliente encontrado localmente
    mostrarInfoCliente(clienteLocal, infoCliente);
    return;
  }
  
  // Si no se encontró localmente, buscar en la API
  try {
    const response = await fetch(`${API_CLIENTES_URL}/${cedula}`);
    
    if (response.status === 404) {
      // Cliente no encontrado en la API
      infoCliente.innerHTML = `
        <p class="no-encontrado">Cliente no encontrado</p>
        <button type="button" class="btn-registrar-cliente" onclick="abrirModalCliente('${cedula}')">Registrar nuevo cliente</button>
      `;
      infoCliente.classList.remove('encontrado');
      infoCliente.classList.add('no-encontrado');
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Error al buscar cliente: ${response.status}`);
    }
    
    const cliente = await response.json();
    mostrarInfoCliente(cliente, infoCliente);
    
    // Agregar a la lista local si no existe
    if (!clientes.some(c => c.cedula === cliente.cedula)) {
      clientes.push(cliente);
      actualizarDatalistClientes();
    }
    
  } catch (error) {
    console.error('Error al buscar cliente:', error);
    infoCliente.innerHTML = `<p class="error">Error al buscar cliente: ${error.message}</p>`;
    infoCliente.classList.remove('encontrado', 'no-encontrado');
  }
}

// Función para mostrar información del cliente
function mostrarInfoCliente(cliente, infoCliente) {
  infoCliente.innerHTML = `
    <p class="encontrado">
      <strong>Cliente:</strong> ${cliente.nombre}<br>
      <strong>Teléfono:</strong> ${cliente.telefono || '-'}<br>
      <strong>Email:</strong> ${cliente.email || '-'}
    </p>
  `;
  infoCliente.classList.add('encontrado');
  infoCliente.classList.remove('no-encontrado');
}

// Función para abrir el modal de nuevo cliente
function abrirModalCliente(cedula = '') {
  // Limpiar formulario
  const clienteForm = document.getElementById('clienteForm');
  if (clienteForm) {
    clienteForm.reset();
    
    // Establecer la cédula si se proporciona
    if (cedula) {
      const cedulaInput = document.getElementById('cliente_cedula');
      if (cedulaInput) {
        cedulaInput.value = cedula;
        cedulaInput.parentElement.classList.add('has-value');
      }
    }
  }
  
  // Mostrar modal
  abrirModal('modal-cliente');
}

// Función para manejar la creación de un nuevo cliente
async function handleNuevoCliente() {
  // Validar formulario
  if (!validarFormulario('clienteForm')) {
    return;
  }
  
  // Obtener datos del formulario
  const nuevoCliente = {
    cedula: document.getElementById('cliente_cedula').value.trim(),
    nombre: document.getElementById('cliente_nombre').value.trim(),
    telefono: document.getElementById('cliente_telefono').value.trim(),
    direccion: document.getElementById('cliente_direccion').value.trim(),
    email: document.getElementById('cliente_email').value.trim()
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#clienteForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar cliente a la API
    const response = await fetch(API_CLIENTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevoCliente)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error al crear el cliente');
    }
    
    // Añadir el cliente a la lista local
    clientes.push(nuevoCliente);
    actualizarDatalistClientes();
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Cliente Registrado!';
    submitBtn.classList.add('sent');
    
    // Cerrar modal después de 1.5 segundos
    setTimeout(() => {
      cerrarModal('modal-cliente');
      
      // Establecer la cédula en el formulario de mascota
      const cedulaInput = document.getElementById('cedula_cliente');
      if (cedulaInput) {
        cedulaInput.value = nuevoCliente.cedula;
        cedulaInput.parentElement.classList.add('has-value');
        // Disparar evento de input para actualizar la información del cliente
        cedulaInput.dispatchEvent(new Event('input'));
      }
      
      // Restaurar botón
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
      
      // Mostrar notificación
      mostrarToast('Cliente registrado correctamente', 'success');
    }, 1500);
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al registrar el cliente: ' + error.message, 'error');
  }
}

// Funciones para la gestión de mascotas
async function handleNuevaMascota(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('mascotaForm')) {
    return;
  }
  
  // Obtener datos del formulario
  const nuevaMascota = {
    id_mascota: document.getElementById('id_mascota').value.trim(),
    nombre: document.getElementById('nombre').value.trim(),
    tamano: document.getElementById('tamano').value.trim(),
    sexo: document.getElementById('sexo').value.trim(),
    edad: parseInt(document.getElementById('edad').value.trim()),
    temperamento: document.getElementById('temperamento').value.trim(),
    cedula_cliente: document.getElementById('cedula_cliente').value.trim()
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#mascotaForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar mascota a la API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevaMascota)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Verificar si es un error de ID duplicado
      if (response.status === 400 && data.message && data.message.includes('Ya existe una mascota con ese ID')) {
        mostrarError('id_mascota', 'Este ID ya está registrado');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      // Verificar si es un error de cliente no registrado
      if (response.status === 400 && data.message === 'La cédula del cliente no está registrada') {
        mostrarError('cedula_cliente', 'Esta cédula no está registrada');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error(data.message || 'Error al crear la mascota');
    }
    
    // Añadir la mascota a la lista local
    const nuevaMascotaConCliente = {
      ...nuevaMascota,
      id_mascota: data.mascota.id_mascota, // Usar el ID generado por el servidor
      nombre_cliente: clientes.find(c => c.cedula === nuevaMascota.cedula_cliente)?.nombre || ''
    };
    mascotas.push(nuevaMascotaConCliente);
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Mascota Agregada!';
    submitBtn.classList.add('sent');
    
    // Limpiar formulario
    document.getElementById('mascotaForm').reset();
    const formGroups = document.querySelectorAll('#mascotaForm .form-group');
    formGroups.forEach(group => {
      group.classList.remove('has-value', 'focused', 'error');
    });
    
    // Limpiar información del cliente
    const infoCliente = document.getElementById('info-cliente');
    if (infoCliente) {
      infoCliente.innerHTML = '';
      infoCliente.classList.remove('encontrado', 'no-encontrado');
    }
    
    // Mostrar notificación
    mostrarToast('Mascota agregada correctamente', 'success');
    
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
    }, 2000);
    
    // Recargar la lista de mascotas para asegurarnos de tener datos actualizados
    cargarMascotas();
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al agregar la mascota: ' + error.message, 'error');
  }
}

async function handleBuscarMascota() {
  const cedula = document.getElementById('buscarCedulaCliente').value.trim();
  const nombre = document.getElementById('buscarNombreMascota').value.trim();
  
  // Verificar que al menos un campo tenga valor
  if (cedula === '' && nombre === '') {
    mostrarToast('Debes ingresar al menos un criterio de búsqueda', 'error');
    return;
  }
  
  try {
    let url = new URL(`${API_URL}/buscar`, window.location.origin);
    let params = new URLSearchParams();
    
    // Agregar parámetros si existen
    if (cedula !== '') {
      params.append('cedula', cedula);
    }
    
    if (nombre !== '') {
      params.append('nombre', nombre);
    }
    
    url.search = params.toString();
    console.log(`Buscando con URL: ${url.toString()}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        const contenedor = document.getElementById('resultados-busqueda');
        contenedor.innerHTML = '<p class="sin-resultados">No se encontraron mascotas con esos criterios</p>';
        return;
      }
      throw new Error(`Error en la respuesta: ${response.status} - ${response.statusText}`);
    }
    
    const resultado = await response.json();
    console.log("Resultados de búsqueda:", resultado);
    
    // Mostrar resultados
    mostrarResultadosBusqueda(Array.isArray(resultado) ? resultado : [resultado]);
    
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    mostrarToast('Error al buscar mascotas: ' + error.message, 'error');
  }
}

function mostrarResultadosBusqueda(resultados) {
  const contenedor = document.getElementById('resultados-busqueda');
  
  if (!resultados || resultados.length === 0) {
    contenedor.innerHTML = '<p class="sin-resultados">No se encontraron mascotas con esos criterios</p>';
    return;
  }
  
  let html = `
    <table class="tabla-mascotas">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Tamaño</th>
          <th>Sexo</th>
          <th>Edad</th>
          <th>Temperamento</th>
          <th>Cédula Cliente</th>
          <th>Nombre Cliente</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  resultados.forEach(mascota => {
    html += `
      <tr>
        <td>${mascota.id_mascota}</td>
        <td>${mascota.nombre}</td>
        <td>${mascota.tamano || '-'}</td>
        <td>${mascota.sexo || '-'}</td>
        <td>${mascota.edad || '-'}</td>
        <td>${mascota.temperamento || '-'}</td>
        <td>${mascota.cedula_cliente}</td>
        <td>${mascota.nombre_cliente || '-'}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${mascota.id_mascota})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${mascota.id_mascota})">🗑️</button>
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

function cargarTablaMascotas() {
  const tbody = document.getElementById('tbody-mascotas');
  const sinMascotas = document.getElementById('sin-mascotas');
  
  // Verificar si hay mascotas
  if (!mascotas || mascotas.length === 0) {
    tbody.innerHTML = '';
    sinMascotas.style.display = 'block';
    return;
  }
  
  // Ocultar mensaje de no hay mascotas
  sinMascotas.style.display = 'none';
  
  // Generar filas de la tabla
  let html = '';
  mascotas.forEach(mascota => {
    html += `
      <tr>
        <td>${mascota.id_mascota}</td>
        <td>${mascota.nombre}</td>
        <td>${mascota.tamano || '-'}</td>
        <td>${mascota.sexo || '-'}</td>
        <td>${mascota.edad || '-'}</td>
        <td>${mascota.temperamento || '-'}</td>
        <td>${mascota.cedula_cliente}</td>
        <td>${mascota.nombre_cliente || '-'}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar(${mascota.id_mascota})">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar(${mascota.id_mascota})">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

function abrirModalEditar(id) {
  console.log(`Abriendo modal para editar mascota con ID: ${id}`);
  mascotaActual = id;
  
  try {
    // Buscar mascota en la lista local
    const mascota = mascotas.find(m => Number(m.id_mascota) === Number(id));
    
    if (!mascota) {
      throw new Error('Mascota no encontrada en la lista local');
    }
    
    console.log("Datos de la mascota a editar:", mascota);
    
    // Llenar formulario con datos de la mascota
    document.getElementById('editar-id').value = mascota.id_mascota;
    document.getElementById('editar-nombre').value = mascota.nombre;
    document.getElementById('editar-tamano').value = mascota.tamano || '';
    document.getElementById('editar-sexo').value = mascota.sexo || '';
    document.getElementById('editar-edad').value = mascota.edad || '';
    document.getElementById('editar-temperamento').value = mascota.temperamento || '';
    document.getElementById('editar-cedula_cliente').value = mascota.cedula_cliente;
    
    // Activar clase has-value en todos los campos del formulario
    const formGroups = document.querySelectorAll('#editarForm .form-group');
    formGroups.forEach(group => {
      const input = group.querySelector('input, select, textarea');
      if (input && input.value.trim() !== '') {
        group.classList.add('has-value');
      } else {
        group.classList.remove('has-value');
      }
    });
    
    // Mostrar modal
    abrirModal('modal-editar');
    
  } catch (error) {
    console.error('Error al abrir modal de edición:', error);
    mostrarToast('Error al cargar datos de la mascota: ' + error.message, 'error');
  }
}

function abrirModalEliminar(id) {
  console.log(`Abriendo modal para eliminar mascota con ID: ${id}`);
  mascotaActual = id;
  
  // Buscar mascota en la lista local
  const mascota = mascotas.find(m => Number(m.id_mascota) === Number(id));
  
  if (!mascota) {
    mostrarToast('Mascota no encontrada', 'error');
    return;
  }
  
  // Mostrar nombre de la mascota a eliminar
  document.getElementById('mascota-a-eliminar').textContent = mascota.nombre;
  
  // Mostrar modal
  abrirModal('modal-eliminar');
}

async function handleEditarMascota() {
  // Obtener el ID de la mascota a editar
  const id = document.getElementById('editar-id').value.trim();
  
  // Validar formulario
  if (!validarFormulario('editarForm')) {
    return;
  }
  
  console.log(`Editando mascota con ID: ${id}`);
  
  // Recopilar datos de la mascota
  const mascotaActualizada = {
    nombre: document.getElementById('editar-nombre').value.trim(),
    tamano: document.getElementById('editar-tamano').value.trim(),
    sexo: document.getElementById('editar-sexo').value.trim(),
    edad: document.getElementById('editar-edad').value.trim() ? parseInt(document.getElementById('editar-edad').value.trim()) : null,
    temperamento: document.getElementById('editar-temperamento').value.trim(),
    cedula_cliente: document.getElementById('editar-cedula_cliente').value.trim()
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#editarForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Actualizando...';
  submitBtn.disabled = true;
  
  try {
    console.log("Datos a actualizar:", mascotaActualizada);
    
    // Enviar actualización a la API
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mascotaActualizada)
    });
    
    console.log("Respuesta de la API:", response.status);
    
    const data = await response.json();
    console.log("Datos de respuesta:", data);
    
    if (!response.ok) {
      if (response.status === 400 && data.message === 'La cédula del cliente no está registrada') {
        mostrarError('editar-cedula_cliente', 'Esta cédula no está registrada');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error(data.message || `Error al actualizar la mascota: ${response.status}`);
    }
    
    // Actualizar en la lista local con los nuevos datos
    const mascotaIndex = mascotas.findIndex(m => Number(m.id_mascota) === Number(id));
    if (mascotaIndex !== -1) {
      mascotas[mascotaIndex] = {
        id_mascota: id,
        ...mascotaActualizada,
        nombre_cliente: data.mascota ? data.mascota.nombre_cliente : mascotas[mascotaIndex].nombre_cliente
      };
    }
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Mascota Actualizada!';
    submitBtn.classList.add('sent');
    
// Cerrar modal y mostrar notificación
      setTimeout(() => {
        cerrarModal('modal-editar');
        mostrarToast('Mascota actualizada correctamente', 'success');
        
        // Actualizar tabla si estamos en la pestaña de listado
        if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
          cargarTablaMascotas();
        }
        
        // Restaurar botón
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('sent');
      }, 1500);
      
      // Recargar la lista de mascotas para asegurarnos de tener datos actualizados
      cargarMascotas();
      
    } catch (error) {
      console.error('Error al actualizar mascota:', error);
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      mostrarToast('Error al actualizar la mascota: ' + error.message, 'error');
    }
}

async function eliminarMascota(id) {
  console.log(`Eliminando mascota con ID: ${id}`);
  
  try {
    // Mostrar indicador de carga
    mostrarToast('Eliminando mascota...', 'info');
    
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    
    console.log("Respuesta de eliminación:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error al eliminar la mascota: ${response.status}`);
    }
    
    // Intentar leer la respuesta JSON
    try {
      const data = await response.json();
      console.log("Datos de respuesta de eliminación:", data);
    } catch (e) {
      console.log("No se pudo leer JSON de la respuesta, pero el estado es OK");
    }
    
    // Eliminar mascota de la lista local
    mascotas = mascotas.filter(m => m.id_mascota !== id);
    
    // Cerrar modal si está abierto
    cerrarModal('modal-eliminar');
    
    // Mostrar notificación
    mostrarToast('Mascota eliminada correctamente', 'success');
    
    // Actualizar tabla si estamos en la pestaña de listado
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaMascotas();
    }
    
    // Si hay una búsqueda activa, volver a ejecutarla para refrescar resultados
    if (document.querySelector('.tab-btn[data-tab="buscar"]').classList.contains('active')) {
      const cedula = document.getElementById('buscarCedulaCliente').value.trim();
      const nombre = document.getElementById('buscarNombreMascota').value.trim();
      if (cedula || nombre) {
        handleBuscarMascota();
      }
    }
    
  } catch (error) {
    console.error('Error al eliminar mascota:', error);
    mostrarToast('Error al eliminar la mascota: ' + error.message, 'error');
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
  
  // Validar edad (debe ser un número positivo)
  const edadInput = form.querySelector('input[type="number"][name="edad"], input[id="editar-edad"]');
  if (edadInput && edadInput.value.trim() !== '') {
    const edad = parseInt(edadInput.value.trim());
    if (isNaN(edad) || edad < 0) {
      mostrarError(edadInput.id, 'La edad debe ser un número positivo');
      formValido = false;
    }
  }
  
  return formValido;
}

function mostrarError(inputId, mensaje) {
  const input = document.getElementById(inputId);
  const formGroup = input.parentElement;
  const errorSpan = formGroup.querySelector('.form-error');
  
  formGroup.classList.add('error');
  if (errorSpan) {
    errorSpan.textContent = mensaje;
  }
}

function ocultarError(inputId) {
  const input = document.getElementById(inputId);
  const formGroup = input.parentElement;
  
  formGroup.classList.remove('error');
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
  const mensajeElement = document.getElementById('toast-mensaje');
  
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

// Función para el debounce (que falta en el segundo archivo pero está en el primero)
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Exponer funciones al ámbito global para los botones en HTML
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;
window.handleBuscarMascota = handleBuscarMascota;
window.eliminarMascota = eliminarMascota;
window.abrirModalCliente = function(cedula = '') {
  // Limpiar formulario
  const clienteForm = document.getElementById('clienteForm');
  if (clienteForm) {
    clienteForm.reset();
    
    // Establecer la cédula si se proporciona
    if (cedula) {
      const cedulaInput = document.getElementById('cliente_cedula');
      if (cedulaInput) {
        cedulaInput.value = cedula;
        cedulaInput.parentElement.classList.add('has-value');
      }
    }
  }
  
  // Mostrar modal
  abrirModal('modal-cliente');
};