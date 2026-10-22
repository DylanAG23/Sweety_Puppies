// URL base para las peticiones API - Ajuste para incluir http://localhost:3000
const API_URL = 'http://localhost:3000/api';

// Datos de respaldo en caso de fallo de la API
const SERVICIOS_RESPALDO = [
  {
    id_servicio: 1,
    nombre: "PELUQUIADO",
    descripcion: "hola",
    precio: 100000,
    duracion: 50
  },
  {
    id_servicio: 2,
    nombre: "Corte estándar",
    descripcion: "Corte de pelo higiénico y estético adaptado a la raza de tu mascota",
    precio: 30000,
    duracion: 90
  },
  {
    id_servicio: 3,
    nombre: "Baño y corte premium",
    descripcion: "Combinación de baño premium y corte personalizado según las necesidades de tu mascota",
    precio: 45000,
    duracion: 120
  }
];

// Elemento contenedor donde se mostrarán los servicios
const serviciosContainer = document.querySelector('#servicios');

// Función para cargar los servicios desde la API
async function cargarServicios() {
  try {
    // Mostrar indicador de carga
    mostrarCargando();
    
    // Realizar petición a la API con manejo de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
    
    const response = await fetch(`${API_URL}/servicios`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Si la respuesta no es correcta, lanzar error
    if (!response.ok) {
      throw new Error(`Error al cargar servicios: ${response.status}`);
    }
    
    // Obtener los datos en formato JSON
    const servicios = await response.json();
    
    // Mostrar los servicios en la interfaz
    mostrarServicios(servicios);
    
    console.log('Servicios cargados correctamente:', servicios);
    
  } catch (error) {
    console.error('Error al cargar servicios:', error);
    
    // En caso de error, mostrar servicios de respaldo
    console.log('Usando servicios de respaldo');
    mostrarServicios(SERVICIOS_RESPALDO);
    
    // También mostramos un mensaje discreto de error
    mostrarErrorDiscreto(error.message);
  }
}

// Función para mostrar un indicador de carga
function mostrarCargando() {
  // Añadir un mensaje de cargando
  serviciosContainer.innerHTML = `
    <div class="cargando-contenedor">
      <div class="cargando-animacion"></div>
      <p>Cargando servicios...</p>
    </div>
  `;
}

// Función para mostrar un mensaje de error discreto (sin interrumpir la experiencia)
function mostrarErrorDiscreto(mensaje) {
  // Crear un elemento para el mensaje de error
  const errorElement = document.createElement('div');
  errorElement.className = 'error-discreto';
  errorElement.innerHTML = `
    <p>Nota: Hubo un problema al conectar con el servidor. Se muestran servicios de ejemplo.</p>
  `;
  
  // Añadir el mensaje al final del contenedor
  serviciosContainer.appendChild(errorElement);
  
  // Estilos inline para el mensaje de error
  errorElement.style.backgroundColor = 'rgba(255,220,220,0.2)';
  errorElement.style.padding = '8px';
  errorElement.style.borderRadius = '5px';
  errorElement.style.margin = '20px auto';
  errorElement.style.maxWidth = '800px';
  errorElement.style.fontSize = '0.85rem';
  errorElement.style.color = '#9c0076';
}

// Función para mostrar un mensaje de error completo (reemplaza el contenido)
function mostrarError(mensaje) {
  serviciosContainer.innerHTML = `
    <div class="error-mensaje">
      <p>¡Ups! Algo salió mal</p>
      <p>${mensaje}</p>
      <button onclick="cargarServicios()" class="btn-reintentar">Reintentar</button>
    </div>
  `;
}

// Función para mostrar los servicios en la interfaz
function mostrarServicios(servicios) {
  // Si no hay servicios, mostrar mensaje
  if (!servicios || servicios.length === 0) {
    serviciosContainer.innerHTML = `
      <div class="sin-servicios">
        <p>No hay servicios disponibles en este momento.</p>
      </div>
    `;
    return;
  }
  
  // Limpiar el contenedor
  serviciosContainer.innerHTML = `
    <div class="section-title">
      <h2>Servicios</h2>
    </div>
  `;
  
  // Crear el contenedor para las tarjetas de servicios
  const serviciosGrid = document.createElement('div');
  serviciosGrid.className = 'servicios-grid';
  serviciosGrid.style.display = 'grid';
  serviciosGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
  serviciosGrid.style.gap = '30px';
  serviciosGrid.style.maxWidth = '1200px';
  serviciosGrid.style.margin = '0 auto';
  serviciosGrid.style.padding = '20px';
  
  // Añadir cada servicio
  servicios.forEach(servicio => {
    const servicioCard = crearTarjetaServicio(servicio);
    serviciosGrid.appendChild(servicioCard);
  });
  
  // Añadir el grid al contenedor
  serviciosContainer.appendChild(serviciosGrid);
  
  // Inicializar las animaciones de scroll reveal
  inicializarScrollReveal();
}

// Función para crear una tarjeta de servicio
function crearTarjetaServicio(servicio) {
  const card = document.createElement('div');
  card.className = 'servicio-card scroll-reveal';
  card.dataset.idServicio = servicio.id_servicio;
  
  // Formatear el precio con formato de moneda local
  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(servicio.precio);
  
  // Asignar duración o valores por defecto
  const duracion = servicio.duracion || 'Variable';
  
  // Construir el HTML de la tarjeta con estilos centrados
  card.innerHTML = `
    <h3 style="text-align: center;">${servicio.nombre}</h3>
    <p style="text-align: center;">${servicio.descripcion || 'Sin descripción disponible'}</p>
    <div class="detalles-servicio" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
      <div class="duracion" style="margin-bottom: 8px;">Duración: ${duracion} min</div>
      <div class="precio" style="font-weight: bold; color: #9c0076; font-size: 1.2em; margin-bottom: 15px;">${precioFormateado}</div>
    </div>
    <div style="text-align: center;">
      <button class="btn-reservar" style="background-color: #9c0076; color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer;" onclick="reservarServicio(${servicio.id_servicio})">RESERVAR</button>
    </div>
  `;
  
  // Añadir estilos adicionales a la tarjeta
  card.style.backgroundColor = "white";
  card.style.borderRadius = "15px";
  card.style.padding = "20px";
  card.style.boxShadow = "0 5px 15px rgba(0,0,0,0.1)";
  card.style.transition = "transform 0.3s, box-shadow 0.3s";
  
  // Efecto hover
  card.addEventListener('mouseenter', () => {
    card.style.transform = "translateY(-5px)";
    card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = "translateY(0)";
    card.style.boxShadow = "0 5px 15px rgba(0,0,0,0.1)";
  });
  
  // Añadir evento para ver detalles
  card.addEventListener('click', (e) => {
    // Evitar que se active si se hizo clic en el botón
    if (e.target.classList.contains('btn-reservar')) return;
    
    mostrarDetallesServicio(servicio);
  });
  
  return card;
}

// Función para mostrar detalles de un servicio
function mostrarDetallesServicio(servicio) {
  // Formato de moneda para el precio
  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(servicio.precio);
  
  // Crear un modal simple
  const modal = document.createElement('div');
  modal.className = 'modal-servicio';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '1000';
  
  // Contenido del modal con elementos centrados
  modal.innerHTML = `
    <div class="modal-contenido" style="background-color: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; position: relative; text-align: center;">
      <button class="cerrar-modal" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      <h3 style="color: #9c0076; margin-top: 0; text-align: center;">${servicio.nombre}</h3>
      <p style="margin-bottom: 20px; text-align: center;">${servicio.descripcion || 'Sin descripción disponible'}</p>
      
      <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">Duración: <strong>${servicio.duracion || 'Variable'} minutos</strong></div>
        <div style="font-size: 1.3em; color: #9c0076;"><strong>${precioFormateado}</strong></div>
      </div>
      
      <button class="btn-reservar" style="width: 80%; background-color: #9c0076; color: white; border: none; padding: 12px 0; border-radius: 25px; font-weight: bold; cursor: pointer; margin: 0 auto;" onclick="reservarServicio(${servicio.id_servicio})">RESERVAR AHORA</button>
    </div>
  `;
  
  // Añadir el modal al body
  document.body.appendChild(modal);
  
  // Cerrar modal al hacer clic en el botón o fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('cerrar-modal')) {
      document.body.removeChild(modal);
    }
  });
}

// Función para manejar la reserva de un servicio
function reservarServicio(idServicio) {
  console.log('Reservar servicio con ID:', idServicio);
  
  // Aquí podrías redirigir a la página de reservas con este servicio preseleccionado
  window.location.href = `citas.html?servicio=${idServicio}`;
}

// Inicializar las animaciones de scroll reveal
function inicializarScrollReveal() {
  // Seleccionar todos los elementos con la clase scroll-reveal
  const elements = document.querySelectorAll('.scroll-reveal:not(.active)');
  
  // Verificar si IntersectionObserver está disponible
  if ('IntersectionObserver' in window) {
    // Configurar el observador
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    // Observar cada elemento
    elements.forEach(element => {
      observer.observe(element);
    });
  } else {
    // Fallback para navegadores que no soportan IntersectionObserver
    elements.forEach(element => {
      element.classList.add('active');
    });
  }
}

// Función para recargar los servicios automáticamente
function configurarActualizacionAutomatica() {
  // Recargar cada 5 minutos (300000 ms)
  setInterval(cargarServicios, 300000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, iniciando carga de servicios...');
  
  // Verificar si el contenedor de servicios existe
  if (!serviciosContainer) {
    console.error('No se encontró el contenedor de servicios (#servicios)');
    return;
  }
  
  // Cargar los servicios
  cargarServicios();
  
  // Configurar actualización automática
  configurarActualizacionAutomatica();
});

// Exportar funciones para uso externo
window.cargarServicios = cargarServicios;
window.reservarServicio = reservarServicio;