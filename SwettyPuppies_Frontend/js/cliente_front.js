// Variables globales
let clientes = [];
let clienteActual = null;
const API_URL = 'http://localhost:3000/api/clientes';

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
  // Cargar clientes al iniciar
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
      
      // Si es el tab de listado, cargar la lista de clientes
      if (tabId === 'listado') {
        cargarTablaClientes();
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
  
  // Inicializar formulario de creación de cliente
  const clienteForm = document.getElementById('clienteForm');
  if (clienteForm) {
    clienteForm.addEventListener('submit', handleNuevoCliente);
  }
  
  // Inicializar formulario de búsqueda
  const buscarForm = document.getElementById('buscarForm');
  if (buscarForm) {
    buscarForm.addEventListener('submit', handleBuscarCliente);
  }
  
  // Inicializar formulario de edición
  const editarForm = document.getElementById('editarForm');
  if (editarForm) {
    editarForm.addEventListener('submit', handleEditarCliente);
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
      if (clienteActual) {
        eliminarCliente(clienteActual);
        cerrarModal('modal-eliminar');
      }
    });
  }
  
  // Cargar la tabla de clientes si estamos en la pestaña de listado
  if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
    cargarTablaClientes();
  }
});

// Función para cargar clientes desde la API
async function cargarClientes() {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error('Error al cargar los clientes');
    }
    
    clientes = await response.json();
    
    // Si estamos en la pestaña de listado, actualizar la tabla
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaClientes();
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar los clientes', 'error');
  }
}

// Funciones para la gestión de clientes
async function handleNuevoCliente(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('clienteForm')) {
    return;
  }
  
  // Obtener datos del formulario
  const nuevoCliente = {
    cedula: document.getElementById('cedula').value.trim(),
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    email: document.getElementById('email').value.trim()
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#clienteForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar cliente a la API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevoCliente)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Verificar si es un error de cédula duplicada
      if (errorData.error && errorData.error.includes('duplicate key')) {
        mostrarError('cedula', 'Esta cédula ya está registrada');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error('Error al crear el cliente');
    }
    
    // Añadir el cliente a la lista local
    clientes.push(nuevoCliente);
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Cliente Agregado!';
    submitBtn.classList.add('sent');
    
    // Limpiar formulario
    document.getElementById('clienteForm').reset();
    const formGroups = document.querySelectorAll('#clienteForm .form-group');
    formGroups.forEach(group => {
      group.classList.remove('has-value', 'focused', 'error');
    });
    
    // Mostrar notificación
    mostrarToast('Cliente agregado correctamente', 'success');
    
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
    }, 2000);
    
    // Recargar la lista de clientes para asegurarnos de tener datos actualizados
    cargarClientes();
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al agregar el cliente', 'error');
  }
}

function handleBuscarCliente(e) {
  e.preventDefault();
  
  const termino = document.getElementById('buscarTermino').value.trim();
  
  if (termino === '') {
    mostrarError('buscarTermino', 'Ingresa un término de búsqueda');
    return;
  }
  
  // Realizar búsqueda local ya que no hay endpoint de búsqueda en el backend
  buscarClientesLocal(termino);
}

function buscarClientesLocal(termino) {
  const terminoLower = termino.toLowerCase();
  
  // Buscar clientes que coincidan con el término en cualquier campo
  const resultados = clientes.filter(cliente => 
    cliente.cedula.toLowerCase().includes(terminoLower) ||
    cliente.nombre.toLowerCase().includes(terminoLower) ||
    cliente.telefono.toLowerCase().includes(terminoLower) ||
    cliente.email.toLowerCase().includes(terminoLower) ||
    cliente.direccion.toLowerCase().includes(terminoLower)
  );
  
  mostrarResultadosBusqueda(resultados);
}

function mostrarResultadosBusqueda(resultados) {
  const contenedor = document.getElementById('resultados-busqueda');
  
  if (resultados.length === 0) {
    contenedor.innerHTML = '<p class="sin-resultados">No se encontraron clientes con esos criterios</p>';
    return;
  }
  
  let html = `
    <table class="tabla-clientes">
      <thead>
        <tr>
          <th>Cédula</th>
          <th>Nombre</th>
          <th>Teléfono</th>
          <th>Email</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  resultados.forEach(cliente => {
    html += `
      <tr>
        <td>${cliente.cedula}</td>
        <td>${cliente.nombre}</td>
        <td>${cliente.telefono}</td>
        <td>${cliente.email}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar('${cliente.cedula}')">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar('${cliente.cedula}')">🗑️</button>
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

function cargarTablaClientes() {
  const tbody = document.getElementById('tbody-clientes');
  const sinClientes = document.getElementById('sin-clientes');
  
  // Verificar si hay clientes
  if (clientes.length === 0) {
    tbody.innerHTML = '';
    sinClientes.style.display = 'block';
    return;
  }
  
  // Ocultar mensaje de no hay clientes
  sinClientes.style.display = 'none';
  
  // Generar filas de la tabla
  let html = '';
  clientes.forEach(cliente => {
    html += `
      <tr>
        <td>${cliente.cedula}</td>
        <td>${cliente.nombre}</td>
        <td>${cliente.telefono}</td>
        <td>${cliente.direccion}</td>
        <td>${cliente.email}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar('${cliente.cedula}')">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar('${cliente.cedula}')">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

async function abrirModalEditar(cedula) {
  clienteActual = cedula;
  
  try {
    // Obtener datos actualizados del cliente de la API
    const response = await fetch(`${API_URL}/${cedula}`);
    
    if (!response.ok) {
      throw new Error('Cliente no encontrado');
    }
    
    const cliente = await response.json();
    
    // Llenar formulario con datos del cliente
    document.getElementById('editar-cedula').value = cliente.cedula;
    document.getElementById('editar-nombre').value = cliente.nombre;
    document.getElementById('editar-telefono').value = cliente.telefono;
    document.getElementById('editar-direccion').value = cliente.direccion;
    document.getElementById('editar-email').value = cliente.email;
    
    // Activar clase has-value en todos los campos del formulario
    const formGroups = document.querySelectorAll('#editarForm .form-group');
    formGroups.forEach(group => {
      group.classList.add('has-value');
    });
    
    // Mostrar modal
    abrirModal('modal-editar');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar datos del cliente', 'error');
  }
}

function abrirModalEliminar(cedula) {
  clienteActual = cedula;
  
  // Buscar cliente en la lista local
  const cliente = clientes.find(c => c.cedula === cedula);
  
  if (!cliente) {
    mostrarToast('Cliente no encontrado', 'error');
    return;
  }
  
  // Mostrar nombre del cliente a eliminar
  document.getElementById('cliente-a-eliminar').textContent = cliente.nombre;
  
  // Mostrar modal
  abrirModal('modal-eliminar');
}

async function handleEditarCliente(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('editarForm')) {
    return;
  }
  
  const cedula = document.getElementById('editar-cedula').value.trim();
  
  // Recopilar datos del cliente
  const clienteActualizado = {
    cedula: cedula,
    nombre: document.getElementById('editar-nombre').value.trim(),
    telefono: document.getElementById('editar-telefono').value.trim(),
    direccion: document.getElementById('editar-direccion').value.trim(),
    email: document.getElementById('editar-email').value.trim()
  };
  
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#editarForm .btn-enviar');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Actualizando...';
  submitBtn.disabled = true;
  
  try {
    // Enviar actualización a la API
    const response = await fetch(`${API_URL}/${cedula}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clienteActualizado)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Verificar si es un error de cédula duplicada
      if (errorData.error && errorData.error.includes('duplicate key')) {
        mostrarError('editar-cedula', 'Esta cédula ya está registrada por otro cliente');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error('Error al actualizar el cliente');
    }
    
    // Actualizar en la lista local
    const clienteIndex = clientes.findIndex(c => c.cedula === cedula);
    if (clienteIndex !== -1) {
      clientes[clienteIndex] = clienteActualizado;
    }
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Cliente Actualizado!';
    submitBtn.classList.add('sent');
    
    // Cerrar modal y mostrar notificación
    setTimeout(() => {
      cerrarModal('modal-editar');
      mostrarToast('Cliente actualizado correctamente', 'success');
      
      // Actualizar tabla si estamos en la pestaña de listado
      if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
        cargarTablaClientes();
      }
      
      // Actualizar resultados de búsqueda si hay un término de búsqueda activo
      const terminoBusqueda = document.getElementById('buscarTermino').value.trim();
      if (terminoBusqueda !== '' && document.querySelector('.tab-btn[data-tab="buscar"]').classList.contains('active')) {
        handleBuscarCliente(new Event('submit'));
      }
      
      // Restaurar botón
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sent');
    }, 1500);
    
    // Recargar la lista de clientes para asegurarnos de tener datos actualizados
    cargarClientes();
    
  } catch (error) {
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al actualizar el cliente', 'error');
  }
}

async function eliminarCliente(cedula) {
  try {
    // Mostrar indicador de carga
    mostrarToast('Eliminando cliente...', 'info');
    
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL}/${cedula}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Error al eliminar el cliente');
    }
    
    // Eliminar cliente de la lista local
    clientes = clientes.filter(c => c.cedula !== cedula);
    
    // Mostrar notificación
    mostrarToast('Cliente eliminado correctamente', 'success');
    
    // Actualizar tabla si estamos en la pestaña de listado
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaClientes();
    }
    
    // Actualizar resultados de búsqueda si hay un término de búsqueda activo
    const terminoBusqueda = document.getElementById('buscarTermino').value.trim();
    if (terminoBusqueda !== '' && document.querySelector('.tab-btn[data-tab="buscar"]').classList.contains('active')) {
      handleBuscarCliente(new Event('submit'));
    }
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al eliminar el cliente', 'error');
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
  
  // Validar email
  const emailInput = form.querySelector('input[type="email"]');
  if (emailInput && emailInput.value.trim() !== '') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailInput.value.trim())) {
      mostrarError(emailInput.id, 'Ingresa un correo electrónico válido');
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

// Exponer funciones al ámbito global para los botones en HTML
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;