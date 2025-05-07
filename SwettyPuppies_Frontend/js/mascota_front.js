// Variables globales
let mascotas = [];
let mascotaActual = null;
const API_URL = 'http://localhost:3000/api/mascotas';

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
  // Cargar mascotas al iniciar
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
  
  // Inicializar formulario de búsqueda
  const buscarMascotaForm = document.getElementById('buscarMascotaForm');
  if (buscarMascotaForm) {
    buscarMascotaForm.addEventListener('submit', handleBuscarMascota);
  }
  
  // Inicializar formulario de edición
  const editarForm = document.getElementById('editarForm');
  if (editarForm) {
    editarForm.addEventListener('submit', handleEditarMascota);
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
        cerrarModal('modal-eliminar');
      }
    });
  }
  
  // Cargar la tabla de mascotas si estamos en la pestaña de listado
  if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
    cargarTablaMascotas();
  }
});

// Función para cargar mascotas desde la API
async function cargarMascotas() {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error('Error al cargar las mascotas');
    }
    
    mascotas = await response.json();
    
    // Si estamos en la pestaña de listado, actualizar la tabla
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaMascotas();
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar las mascotas', 'error');
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
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Verificar si es un error de ID duplicado
      if (errorData.error && errorData.error.includes('duplicate key')) {
        mostrarError('id_mascota', 'Este ID ya está registrado');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      throw new Error('Error al crear la mascota');
    }
    
    // Añadir la mascota a la lista local
    mascotas.push(nuevaMascota);
    
    // Cambiar estado del botón
    submitBtn.textContent = '¡Mascota Agregada!';
    submitBtn.classList.add('sent');
    
    // Limpiar formulario
    document.getElementById('mascotaForm').reset();
    const formGroups = document.querySelectorAll('#mascotaForm .form-group');
    formGroups.forEach(group => {
      group.classList.remove('has-value', 'focused', 'error');
    });
    
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
    mostrarToast('Error al agregar la mascota', 'error');
  }
}

async function handleBuscarMascota(e) {
  e.preventDefault();
  
  const cedula = document.getElementById('buscarCedulaCliente').value.trim();
  const nombre = document.getElementById('buscarNombreMascota').value.trim();
  
  if (cedula === '') {
    mostrarError('buscarCedulaCliente', 'Ingresa la cédula del cliente');
    return;
  }
  
  try {
    let endpoint = '';
    
    // Si tenemos nombre y cédula, buscar por ambos
    if (nombre !== '') {
      endpoint = `${API_URL}/buscar?cedula=${cedula}&nombre=${nombre}`;
    } else {
      // Si solo tenemos cédula, buscar por cédula
      endpoint = `${API_URL}/cliente/${cedula}`;
    }
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      if (response.status === 404) {
        const contenedor = document.getElementById('resultados-busqueda');
        contenedor.innerHTML = '<p class="sin-resultados">No se encontraron mascotas con esos criterios</p>';
        return;
      }
      throw new Error('Error al buscar mascotas');
    }
    
    const resultado = await response.json();
    
    // Mostrar resultados
    mostrarResultadosBusqueda(Array.isArray(resultado) ? resultado : [resultado]);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al buscar mascotas', 'error');
  }
}

function mostrarResultadosBusqueda(resultados) {
  const contenedor = document.getElementById('resultados-busqueda');
  
  if (resultados.length === 0) {
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
          <th>Cédula Cliente</th>
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
        <td>${mascota.tamano}</td>
        <td>${mascota.sexo}</td>
        <td>${mascota.edad}</td>
        <td>${mascota.cedula_cliente}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar('${mascota.id_mascota}')">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar('${mascota.id_mascota}')">🗑️</button>
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
  if (mascotas.length === 0) {
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
        <td>${mascota.tamano}</td>
        <td>${mascota.sexo}</td>
        <td>${mascota.edad}</td>
        <td>${mascota.temperamento}</td>
        <td>${mascota.cedula_cliente}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirModalEditar('${mascota.id_mascota}')">✏️</button>
          <button class="btn-accion btn-eliminar-icon" onclick="abrirModalEliminar('${mascota.id_mascota}')">🗑️</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

async function abrirModalEditar(id) {
  mascotaActual = id;
  
  try {
    // Buscar mascota en la lista local
    const mascota = mascotas.find(m => m.id_mascota === id);
    
    if (!mascota) {
      // Si no está en la lista local, intentar obtenerla de la API
      throw new Error('Mascota no encontrada en la lista local');
    }
    
    // Llenar formulario con datos de la mascota
    document.getElementById('editar-id').value = mascota.id_mascota;
    document.getElementById('editar-nombre').value = mascota.nombre;
    document.getElementById('editar-tamano').value = mascota.tamano;
    document.getElementById('editar-sexo').value = mascota.sexo;
    document.getElementById('editar-edad').value = mascota.edad;
    document.getElementById('editar-temperamento').value = mascota.temperamento;
    document.getElementById('editar-cedula_cliente').value = mascota.cedula_cliente;
    
    // Activar clase has-value en todos los campos del formulario
    const formGroups = document.querySelectorAll('#editarForm .form-group');
    formGroups.forEach(group => {
      group.classList.add('has-value');
    });
    
    // Mostrar modal
    abrirModal('modal-editar');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al cargar datos de la mascota', 'error');
  }
}

function abrirModalEliminar(id) {
  mascotaActual = id;
  
  // Buscar mascota en la lista local
  const mascota = mascotas.find(m => m.id_mascota === id);
  
  if (!mascota) {
    mostrarToast('Mascota no encontrada', 'error');
    return;
  }
  
  // Mostrar nombre de la mascota a eliminar
  document.getElementById('mascota-a-eliminar').textContent = mascota.nombre;
  
  // Mostrar modal
  abrirModal('modal-eliminar');
}

async function handleEditarMascota(e) {
  e.preventDefault();
  
  // Validar formulario
  if (!validarFormulario('editarForm')) {
    return;
  }
  
  const id = document.getElementById('editar-id').value.trim();
  
  // Recopilar datos de la mascota
  const mascotaActualizada = {
    nombre: document.getElementById('editar-nombre').value.trim(),
    tamano: document.getElementById('editar-tamano').value.trim(),
    sexo: document.getElementById('editar-sexo').value.trim(),
    edad: parseInt(document.getElementById('editar-edad').value.trim()),
    temperamento: document.getElementById('editar-temperamento').value.trim(),
    cedula_cliente: document.getElementById('editar-cedula_cliente').value.trim()
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
      body: JSON.stringify(mascotaActualizada)
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar la mascota');
    }
    
    // Actualizar en la lista local con los nuevos datos
    const mascotaIndex = mascotas.findIndex(m => m.id_mascota === id);
    if (mascotaIndex !== -1) {
      mascotas[mascotaIndex] = {
        id_mascota: id,
        ...mascotaActualizada
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
    console.error('Error:', error);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    mostrarToast('Error al actualizar la mascota', 'error');
  }
}

async function eliminarMascota(id) {
  try {
    // Mostrar indicador de carga
    mostrarToast('Eliminando mascota...', 'info');
    
    // Enviar solicitud de eliminación a la API
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Error al eliminar la mascota');
    }
    
    // Eliminar mascota de la lista local
    mascotas = mascotas.filter(m => m.id_mascota !== id);
    
    // Mostrar notificación
    mostrarToast('Mascota eliminada correctamente', 'success');
    
    // Actualizar tabla si estamos en la pestaña de listado
    if (document.querySelector('.tab-btn[data-tab="listado"]').classList.contains('active')) {
      cargarTablaMascotas();
    }
    
    // Si hay una búsqueda activa, volver a ejecutarla para refrescar resultados
    if (document.querySelector('.tab-btn[data-tab="buscar"]').classList.contains('active')) {
      const cedula = document.getElementById('buscarCedulaCliente').value.trim();
      if (cedula) {
        handleBuscarMascota(new Event('submit'));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    mostrarToast('Error al eliminar la mascota', 'error');
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
  const edadInput = form.querySelector('input[type="number"]');
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

// Exponer funciones al ámbito global para los botones en HTML
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;