// Script para manejo de reportes de citas (versión JavaScript puro) con depuración mejorada
document.addEventListener('DOMContentLoaded', function() {
  console.log('=== INICIO DE MÓDULO DE REPORTES ===');
  
  // Referencias a elementos del DOM
  const fechaInput = document.getElementById('fecha');
  const generarReporteBtn = document.querySelector('.btn-primary');
  const cargandoDiv = document.querySelector('.cargando');
  const errorDiv = document.querySelector('.error-mensaje');
  const vistaPreviaDiv = document.querySelector('.vista-previa');
  const sinDatosDiv = document.querySelector('.sin-datos');
  const resumenDiv = document.querySelector('.resumen');
  const tablaCitas = document.querySelector('.tabla-citas tbody');
  const totalIngresosFoot = document.querySelector('.tabla-citas tfoot');
  const descargarPdfBtn = document.querySelector('.btn-success');
  const toastElement = document.getElementById('toast');
  
  // Log para verificar que los elementos DOM se encuentran correctamente
  console.log('Comprobando elementos DOM:');
  console.log('- fechaInput:', fechaInput);
  console.log('- generarReporteBtn:', generarReporteBtn);
  console.log('- cargandoDiv:', cargandoDiv);
  console.log('- errorDiv:', errorDiv);
  console.log('- vistaPreviaDiv:', vistaPreviaDiv);
  console.log('- tablaCitas:', tablaCitas);
  
  // Variables de estado
  let datosReporte = null;
  let cargando = false;
  
  // Inicializar fecha con la fecha actual
  const fechaHoy = new Date();
  const fechaHoyStr = fechaHoy.toISOString().split('T')[0];
  if (fechaInput) {
    fechaInput.value = fechaHoyStr;
    fechaInput.max = fechaHoyStr; // No permitir fechas futuras
    console.log('Fecha inicializada:', fechaInput.value);
  }
  
  // Función para formatear fecha
  function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  // Función para formatear hora
  function formatearHora(horaStr) {
    if (!horaStr) return '-';
    // Si la hora viene en formato HH:MM:SS, extraemos solo HH:MM
    return horaStr.substring(0, 5);
  }
  
  // Función para formatear moneda
  function formatearMoneda(valor) {
    if (valor === undefined || valor === null) return '0.00';
    return parseFloat(valor).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  
  // Función para mostrar mensajes toast
  function mostrarToast(mensaje) {
    if (!toastElement) {
      console.warn('Elemento toast no encontrado');
      return;
    }
    
    toastElement.textContent = mensaje;
    toastElement.className = 'toast show';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      toastElement.className = 'toast';
    }, 3000);
  }
  
  // Función para mostrar/ocultar elementos según el estado
  function actualizarInterfaz() {
    console.log('Actualizando interfaz. Estado cargando:', cargando);
    console.log('Hay datos de reporte:', datosReporte !== null);
    
    if (cargandoDiv) {
      cargandoDiv.style.display = cargando ? 'block' : 'none';
    } else {
      console.warn('Elemento cargandoDiv no encontrado');
    }
    
    if (generarReporteBtn) {
      generarReporteBtn.disabled = cargando;
      generarReporteBtn.textContent = cargando ? 'Generando...' : 'Generar Reporte';
    } else {
      console.warn('Elemento generarReporteBtn no encontrado');
    }
    
    if (vistaPreviaDiv) {
      if (datosReporte && !cargando) {
        console.log('Mostrando vista previa');
        vistaPreviaDiv.style.display = 'block';
      } else {
        vistaPreviaDiv.style.display = 'none';
      }
    } else {
      console.warn('Elemento vistaPreviaDiv no encontrado');
    }
    
    if (sinDatosDiv && datosReporte) {
      const noHayCitas = datosReporte.citas && datosReporte.citas.length === 0;
      console.log('¿No hay citas?', noHayCitas);
      sinDatosDiv.style.display = noHayCitas ? 'block' : 'none';
    } else if (!sinDatosDiv) {
      console.warn('Elemento sinDatosDiv no encontrado');
    }
  }
  
  // Función para actualizar el contenido del reporte
  function actualizarContenidoReporte() {
    if (!datosReporte) {
      console.warn('No hay datos de reporte para mostrar');
      return;
    }
    
    console.log('Actualizando contenido del reporte con datos:', datosReporte);
    
    // Actualizar resumen
    if (resumenDiv) {
      const fechaFormateada = formatearFecha(datosReporte.fecha);
      
      // Actualizar el encabezado
      const encabezadoReporte = document.querySelector('.card-header h4');
      if (encabezadoReporte) {
        encabezadoReporte.textContent = `Reporte de Citas: ${fechaFormateada}`;
      } else {
        console.warn('Elemento encabezadoReporte no encontrado');
      }
      
      // Actualizar los párrafos del resumen
      const parrafosResumen = resumenDiv.querySelectorAll('p');
      if (parrafosResumen.length >= 3) {
        parrafosResumen[0].innerHTML = `<strong>Fecha:</strong> ${fechaFormateada}`;
        parrafosResumen[1].innerHTML = `<strong>Total de citas:</strong> ${datosReporte.totalCitas}`;
        parrafosResumen[2].innerHTML = `<strong>Total de ingresos:</strong> $${formatearMoneda(datosReporte.totalIngresos)}`;
      } else {
        console.warn('No se encontraron suficientes párrafos en el resumen', parrafosResumen.length);
      }
    } else {
      console.warn('Elemento resumenDiv no encontrado');
    }
    
    // Limpiar y actualizar tabla de citas
    if (tablaCitas) {
      tablaCitas.innerHTML = '';
      
      if (datosReporte.citas && datosReporte.citas.length > 0) {
        console.log(`Agregando ${datosReporte.citas.length} filas a la tabla`);
        
        datosReporte.citas.forEach((cita, index) => {
          const row = document.createElement('tr');
          
          row.innerHTML = `
            <td>${formatearHora(cita.hora)}</td>
            <td>${cita.nombre_cliente || '-'}</td>
            <td>${cita.nombre_mascota || '-'}</td>
            <td>${cita.nombre_servicio || '-'}</td>
            <td>${cita.observaciones || '-'}</td>
            <td>$${formatearMoneda(cita.precio)}</td>
          `;
          
          tablaCitas.appendChild(row);
        });
      } else {
        console.log('No hay citas para mostrar en la tabla');
      }
    } else {
      console.warn('Elemento tablaCitas no encontrado');
    }
    
    // Actualizar total en el pie de tabla
    if (totalIngresosFoot) {
      const tdTotal = totalIngresosFoot.querySelector('td:last-child strong');
      if (tdTotal) {
        tdTotal.textContent = `$${formatearMoneda(datosReporte.totalIngresos)}`;
      } else {
        console.warn('Elemento tdTotal no encontrado en el pie de tabla');
      }
    } else {
      console.warn('Elemento totalIngresosFoot no encontrado');
    }
  }
  
  // Función para generar el reporte
  function generarReporte() {
    const fechaSeleccionada = fechaInput ? fechaInput.value : fechaHoyStr;
    cargando = true;
    
    console.log(`Intentando generar reporte para la fecha: ${fechaSeleccionada}`);
    
    // Limpiar error anterior
    if (errorDiv) {
      errorDiv.style.display = 'none';
      const errorMsg = errorDiv.querySelector('p');
      if (errorMsg) {
        errorMsg.textContent = '';
      }
    }
    
    actualizarInterfaz();
    
    // Construir la URL de la API
    const apiUrl = `/api/reportes/citas-diarias?fecha=${fechaSeleccionada}`;
    console.log('URL de la API:', apiUrl);
    
    // Realizar la solicitud a la API
    fetch(apiUrl)
      .then(response => {
        console.log('Respuesta recibida de la API:', response);
        console.log('Status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Datos de reporte recibidos:', data);
        datosReporte = data;
        
        // Verificar si los datos son válidos
        if (!data || typeof data !== 'object') {
          console.error('La respuesta no contiene un objeto JSON válido');
          throw new Error('Formato de respuesta inválido');
        }
        
        // Verificar si la estructura es la esperada
        if (!Array.isArray(data.citas)) {
          console.warn('La propiedad "citas" no es un array o no existe');
          data.citas = [];
        }
        
        actualizarContenidoReporte();
      })
      .catch(err => {
        console.error('Error al generar reporte:', err);
        
        if (errorDiv) {
          const errorMsg = errorDiv.querySelector('p');
          if (errorMsg) {
            errorMsg.textContent = `Error: ${err.message || 'No se pudo generar el reporte. Por favor intente nuevamente.'}`;
          }
          errorDiv.style.display = 'block';
        }
        datosReporte = null;
      })
      .finally(() => {
        cargando = false;
        actualizarInterfaz();
        console.log('Proceso de generación de reporte finalizado');
      });
  }
  
  // Función para descargar el PDF
  function descargarPDF() {
    if (!datosReporte) {
      console.warn('No hay datos de reporte para generar PDF');
      mostrarToast('No hay datos para generar el PDF');
      return;
    }
    
    try {
      console.log('Iniciando generación de PDF');
      
      // Verificar que jsPDF está disponible
      if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error('La biblioteca jsPDF no está disponible');
        throw new Error('La biblioteca para generar PDF no está disponible');
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Título del documento
      doc.setFontSize(18);
      doc.text('Sweety Puppies - Reporte Diario de Citas', 14, 20);
      
      // Información del reporte
      doc.setFontSize(12);
      doc.text(`Fecha: ${formatearFecha(datosReporte.fecha)}`, 14, 30);
      doc.text(`Total de citas: ${datosReporte.totalCitas}`, 14, 37);
      doc.text(`Total de ingresos: $${formatearMoneda(datosReporte.totalIngresos)}`, 14, 44);
      
      // Tabla de citas
      const tableColumn = ["Hora", "Cliente", "Mascota", "Servicio", "Precio"];
      const tableRows = [];
      
      // Llenar los datos para la tabla
      if (datosReporte.citas && datosReporte.citas.length > 0) {
        datosReporte.citas.forEach(cita => {
          const citaData = [
            formatearHora(cita.hora),
            cita.nombre_cliente || '-',
            cita.nombre_mascota || '-',
            cita.nombre_servicio || '-',
            `$${formatearMoneda(cita.precio)}`
          ];
          tableRows.push(citaData);
        });
      }
      
      // Verificar que autoTable está disponible
      if (typeof doc.autoTable !== 'function') {
        console.error('El plugin autoTable para jsPDF no está disponible');
        throw new Error('El complemento para generar tablas no está disponible');
      }
      
      // Agregar la tabla al PDF
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.5,
          valign: 'middle',
          halign: 'center'
        },
        headStyles: {
          fillColor: [253, 199, 253],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        foot: [['', '', '', 'Total:', `$${formatearMoneda(datosReporte.totalIngresos)}`]],
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        }
      });
      
      // Guardar el PDF
      const nombreArchivo = `reporte_citas_${datosReporte.fecha}.pdf`;
      doc.save(nombreArchivo);
      console.log(`PDF guardado como: ${nombreArchivo}`);
      
      // Mostrar notificación
      mostrarToast('Reporte descargado exitosamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      
      if (errorDiv) {
        const errorMsg = errorDiv.querySelector('p');
        if (errorMsg) {
          errorMsg.textContent = `Error al generar PDF: ${error.message}`;
        }
        errorDiv.style.display = 'block';
      }
      
      mostrarToast('Error al generar el PDF');
    }
  }
  
  // Agregar listeners de eventos
  if (generarReporteBtn) {
    generarReporteBtn.addEventListener('click', function(e) {
      console.log('Botón "Generar Reporte" clickeado');
      e.preventDefault();
      generarReporte();
    });
  } else {
    console.error('¡IMPORTANTE! No se pudo encontrar el botón de generar reporte');
  }
  
  if (fechaInput) {
    fechaInput.addEventListener('change', function(e) {
      console.log('Fecha seleccionada cambiada a:', e.target.value);
    });
  }
  
  if (descargarPdfBtn) {
    descargarPdfBtn.addEventListener('click', function(e) {
      console.log('Botón "Descargar PDF" clickeado');
      e.preventDefault();
      descargarPDF();
    });
  } else {
    console.warn('No se pudo encontrar el botón de descargar PDF');
  }
  
  // Generar reporte inicial al cargar la página
  console.log('Generando reporte inicial...');
  setTimeout(generarReporte, 500); // Pequeño retraso para asegurar que todo esté cargado
  
  // Funcionalidad del cursor personalizado
  function initCustomCursor() {
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');
    
    if (!cursorDot || !cursorOutline) {
      console.warn('Elementos del cursor personalizado no encontrados');
      return;
    }
    
    window.addEventListener('mousemove', function(e) {
      const posX = e.clientX;
      const posY = e.clientY;
      
      cursorDot.style.transform = `translate(${posX}px, ${posY}px)`;
      cursorOutline.style.transform = `translate(${posX}px, ${posY}px)`;
    });
  }
  
  // Inicializar cursor personalizado
  initCustomCursor();
  
  console.log('=== INICIALIZACIÓN DE MÓDULO DE REPORTES COMPLETADA ===');
});