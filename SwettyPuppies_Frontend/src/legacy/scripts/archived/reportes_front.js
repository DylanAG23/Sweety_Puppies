// JavaScript para la funcionalidad de reportes - Frontend con API Real
document.addEventListener('DOMContentLoaded', function() {
    initializeReportes();
});

function initializeReportes() {
    // Configurar pestañas
    setupTabs();
    
    // Configurar fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaDiaria').value = today;
    document.getElementById('anoMensual').value = new Date().getFullYear();
    
    // Configurar cursores personalizados si existen
    setupCustomCursor();
    
    // Configurar fechas máximas
    setupMaxDates();
}

// Sistema de pestañas
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y contenidos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Agregar clase active al botón clickeado y su contenido
            this.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
            
            // Limpiar resultados anteriores
            limpiarResultados();
        });
    });
}

// Generar reporte diario - CONECTADO A API REAL
async function generarReporteDiario() {
    const fecha = document.getElementById('fechaDiaria').value;
    
    if (!fecha) {
        mostrarError('Por favor selecciona una fecha');
        return;
    }
    
    mostrarCarga(true);
    limpiarResultados();
    
    try {
        // Llamada real a la API
        const response = await fetch(`/api/reportes/citas-diarias?fecha=${fecha}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener los datos');
        }
        
        const data = await response.json();
        
        if (data.citas.length === 0) {
            mostrarSinDatos();
            return;
        }
        
        mostrarEstadisticasDiarias(data);
        mostrarDetalleCitasDiarias(data.citas, data.totalIngresos);
        mostrarToast('Reporte diario generado exitosamente');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message || 'Error al generar el reporte');
    } finally {
        mostrarCarga(false);
    }
}

// Mostrar estadísticas diarias
function mostrarEstadisticasDiarias(data) {
    const clientesUnicos = new Set(data.citas.map(cita => cita.cedula)).size;
    const mascotasUnicas = new Set(data.citas.map(cita => cita.nombre_mascota)).size;
    
    document.getElementById('totalCitasDia').textContent = data.totalCitas;
    document.getElementById('ingresosDia').textContent = formatearMoneda(data.totalIngresos);
    document.getElementById('clientesDia').textContent = clientesUnicos;
    document.getElementById('mascotasDia').textContent = mascotasUnicas;
    
    document.getElementById('estadisticasDiarias').style.display = 'block';
    
    // Agregar animación a las tarjetas
    const statCards = document.querySelectorAll('#estadisticasDiarias .stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.animation = 'bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }, index * 200);
    });
}

// Mostrar detalle de citas diarias
function mostrarDetalleCitasDiarias(citas, totalIngresos) {
    const tbody = document.getElementById('tablaCitasDiarias');
    tbody.innerHTML = '';
    
    citas.forEach(cita => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatearHora(cita.hora)}</td>
            <td>${cita.nombre_cliente}</td>
            <td>${cita.nombre_mascota}</td>
            <td>${cita.nombre_servicio}</td>
            <td>${cita.observaciones || '-'}</td>
            <td>${formatearMoneda(cita.precio)}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('totalDiaFooter').textContent = formatearMoneda(totalIngresos);
    document.getElementById('detalleCitasDiarias').style.display = 'block';
}

// Generar reporte por período - CONECTADO A API REAL
async function generarReportePeriodo() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    if (!fechaInicio || !fechaFin) {
        mostrarError('Por favor selecciona las fechas de inicio y fin');
        return;
    }
    
    if (new Date(fechaInicio) > new Date(fechaFin)) {
        mostrarError('La fecha de inicio no puede ser mayor que la fecha de fin');
        return;
    }
    
    mostrarCarga(true);
    limpiarResultados();
    
    try {
        // Validar fechas
        validarFechas(fechaInicio, fechaFin);
        
        // Llamadas paralelas a la API
        const [resumenResponse, serviciosResponse, clientesResponse, diasResponse] = await Promise.all([
            fetch(`/api/reportes/resumen-general?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
            fetch(`/api/reportes/servicios-populares?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
            fetch(`/api/reportes/clientes-frecuentes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
            fetch(`/api/reportes/dias-semana?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)
        ]);
        
        // Verificar respuestas
        if (!resumenResponse.ok || !serviciosResponse.ok || !clientesResponse.ok || !diasResponse.ok) {
            throw new Error('Error al obtener algunos datos del reporte');
        }
        
        const [resumenData, serviciosData, clientesData, diasData] = await Promise.all([
            resumenResponse.json(),
            serviciosResponse.json(),
            clientesResponse.json(),
            diasResponse.json()
        ]);
        
        // Verificar si hay datos
        if (resumenData.resumen.totalCitas === 0) {
            mostrarSinDatos();
            return;
        }
        
        mostrarResumenPeriodo(resumenData.resumen);
        mostrarServiciosPopulares(serviciosData.servicios);
        mostrarClientesFrecuentes(clientesData.clientes);
        mostrarEstadisticasDiasSemana(diasData.diasSemana);
        
        mostrarToast('Reporte por período generado exitosamente');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message || 'Error al generar el reporte');
    } finally {
        mostrarCarga(false);
    }
}

// Mostrar resumen del período
function mostrarResumenPeriodo(resumen) {
    document.getElementById('totalCitasPeriodo').textContent = resumen.totalCitas;
    document.getElementById('ingresosPeriodo').textContent = formatearMoneda(resumen.totalIngresos);
    document.getElementById('clientesPeriodo').textContent = resumen.clientesUnicos;
    document.getElementById('promedioDiario').textContent = formatearMoneda(resumen.promedioDiario);
    document.getElementById('servicioPopular').textContent = resumen.servicioMasPopular;
    
    document.getElementById('resumenPeriodo').style.display = 'block';
}

// Mostrar servicios populares
function mostrarServiciosPopulares(servicios) {
    const tbody = document.getElementById('tablaServiciosPopulares');
    tbody.innerHTML = '';
    
    servicios.forEach(servicio => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${servicio.servicio}</td>
            <td>${servicio.cantidad_citas}</td>
            <td>${formatearMoneda(servicio.precio)}</td>
            <td>${formatearMoneda(servicio.total_ingresos)}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('serviciosPopulares').style.display = 'block';
}

// Mostrar clientes frecuentes
function mostrarClientesFrecuentes(clientes) {
    const tbody = document.getElementById('tablaClientesFrecuentes');
    tbody.innerHTML = '';
    
    clientes.forEach(cliente => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cliente.cliente}</td>
            <td>${cliente.cedula}</td>
            <td>${cliente.total_citas}</td>
            <td>${formatearMoneda(cliente.total_gastado)}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('clientesFrecuentes').style.display = 'block';
}

// Mostrar estadísticas por días de la semana
function mostrarEstadisticasDiasSemana(dias) {
    const tbody = document.getElementById('tablaDiasSemana');
    tbody.innerHTML = '';
    
    // Mapear nombres de días en inglés a español
    const diasEspanol = {
        'Sunday   ': 'Domingo',
        'Monday   ': 'Lunes',
        'Tuesday  ': 'Martes',
        'Wednesday': 'Miércoles',
        'Thursday ': 'Jueves',
        'Friday   ': 'Viernes',
        'Saturday ': 'Sábado'
    };
    
    dias.forEach(dia => {
        const diaLimpio = dia.dia_semana ? dia.dia_semana.trim() : '';
        const nombreDia = diasEspanol[dia.dia_semana] || diaLimpio || 'N/A';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${nombreDia}</td>
            <td>${dia.total_citas}</td>
            <td>${formatearMoneda(dia.total_ingresos)}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('diasSemana').style.display = 'block';
}

// Generar reporte mensual - CONECTADO A API REAL
async function generarReporteMensual() {
    const ano = document.getElementById('anoMensual').value;
    
    if (!ano) {
        mostrarError('Por favor ingresa un año');
        return;
    }
    
    if (ano < 2020 || ano > 2030) {
        mostrarError('Por favor ingresa un año válido (2020-2030)');
        return;
    }
    
    mostrarCarga(true);
    limpiarResultados();
    
    try {
        // Llamada real a la API
        const response = await fetch(`/api/reportes/ingresos-mensuales?ano=${ano}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener los datos');
        }
        
        const data = await response.json();
        
        if (data.ingresos.length === 0) {
            mostrarSinDatos();
            return;
        }
        
        mostrarIngresosMensuales(data.ingresos, ano);
        mostrarToast('Reporte mensual generado exitosamente');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message || 'Error al generar el reporte mensual');
    } finally {
        mostrarCarga(false);
    }
}

// Mostrar ingresos mensuales
function mostrarIngresosMensuales(ingresos, ano) {
    const mesesEspanol = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    // Crear array completo de 12 meses
    const ingresosPorMes = new Array(12).fill(null).map((_, index) => {
        const mesEncontrado = ingresos.find(ing => parseInt(ing.mes) === index + 1);
        return {
            mes: mesesEspanol[index],
            total_citas: mesEncontrado ? parseInt(mesEncontrado.total_citas) : 0,
            total_ingresos: mesEncontrado ? parseFloat(mesEncontrado.total_ingresos) : 0
        };
    });
    
    const tbody = document.getElementById('tablaIngresosMensuales');
    tbody.innerHTML = '';
    
    ingresosPorMes.forEach(mes => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${mes.mes}</td>
            <td>${mes.total_citas}</td>
            <td>${formatearMoneda(mes.total_ingresos)}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('anoSeleccionado').textContent = ano;
    document.getElementById('ingresosMensuales').style.display = 'block';
}

function exportarPDF() {
    // Verificar qué pestaña está activa
    const tabActiva = document.querySelector('.tab-btn.active');
    if (!tabActiva) {
        mostrarError('No hay datos para exportar');
        return;
    }
    
    const tipoReporte = tabActiva.getAttribute('data-tab');
    
    // Verificar si hay datos visibles
    const hayDatos = verificarDatosParaExportar(tipoReporte);
    if (!hayDatos) {
        mostrarError('No hay datos para exportar. Genera un reporte primero.');
        return;
    }
    
    mostrarCarga(true);
    
    try {
        switch (tipoReporte) {
            case 'diario':
                exportarReporteDiarioPDF();
                break;
            case 'periodo':
                exportarReportePeriodoPDF();
                break;
            case 'mensual':
                exportarReporteMensualPDF();
                break;
            default:
                throw new Error('Tipo de reporte no válido');
        }
        
        mostrarToast('PDF generado y descargado exitosamente');
    } catch (error) {
        console.error('Error al generar PDF:', error);
        mostrarError('Error al generar el PDF: ' + error.message);
    } finally {
        mostrarCarga(false);
    }
}

// Verificar si hay datos para exportar
function verificarDatosParaExportar(tipoReporte) {
    switch (tipoReporte) {
        case 'diario':
            return document.getElementById('estadisticasDiarias').style.display !== 'none';
        case 'periodo':
            return document.getElementById('resumenPeriodo').style.display !== 'none';
        case 'mensual':
            return document.getElementById('ingresosMensuales').style.display !== 'none';
        default:
            return false;
    }
}

// Exportar reporte diario a PDF
function exportarReporteDiarioPDF() {
    const fecha = document.getElementById('fechaDiaria').value;
    const fechaFormateada = formatearFechaLegible(fecha);
    
    // Crear el contenido del PDF
    let contenidoHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #9c0076; padding-bottom: 20px;">
                <h1 style="color: #9c0076; margin: 0; font-size: 28px;">Sweety Puppies</h1>
                <h2 style="color: #333; margin: 10px 0; font-size: 20px;">Reporte Diario de Citas</h2>
                <p style="color: #666; margin: 5px 0; font-size: 16px;">Fecha: ${fechaFormateada}</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;">Generado el: ${new Date().toLocaleString('es-CO')}</p>
            </div>
    `;
    
    // Estadísticas generales
    const totalCitas = document.getElementById('totalCitasDia').textContent;
    const ingresos = document.getElementById('ingresosDia').textContent;
    const clientes = document.getElementById('clientesDia').textContent;
    const mascotas = document.getElementById('mascotasDia').textContent;
    
    contenidoHTML += `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #9c0076; border-bottom: 2px solid #9c0076; padding-bottom: 10px;">Resumen del Día</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 24px;">${totalCitas}</h4>
                    <p style="margin: 5px 0; color: #666;">Citas del día</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 24px;">${ingresos}</h4>
                    <p style="margin: 5px 0; color: #666;">Ingresos del día</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 24px;">${clientes}</h4>
                    <p style="margin: 5px 0; color: #666;">Clientes únicos</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 24px;">${mascotas}</h4>
                    <p style="margin: 5px 0; color: #666;">Mascotas atendidas</p>
                </div>
            </div>
        </div>
    `;
    
    // Detalle de citas
    const filasCitas = document.querySelectorAll('#tablaCitasDiarias tr');
    if (filasCitas.length > 0) {
        contenidoHTML += `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #9c0076; border-bottom: 2px solid #9c0076; padding-bottom: 10px;">Detalle de Citas</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #9c0076; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Hora</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Cliente</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Mascota</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Servicio</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Observaciones</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Precio</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        filasCitas.forEach((fila, index) => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length > 0) {
                const esImpar = index % 2 === 0;
                contenidoHTML += `
                    <tr style="background-color: ${esImpar ? '#f8f9fa' : 'white'};">
                        <td style="padding: 8px; border: 1px solid #ddd;">${celdas[0].textContent}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${celdas[1].textContent}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${celdas[2].textContent}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${celdas[3].textContent}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${celdas[4].textContent}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${celdas[5].textContent}</td>
                    </tr>
                `;
            }
        });
        
        const totalFooter = document.getElementById('totalDiaFooter').textContent;
        contenidoHTML += `
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #9c0076; color: white; font-weight: bold;">
                            <td colspan="5" style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total del día:</td>
                            <td style="padding: 12px; border: 1px solid #ddd;">${totalFooter}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }
    
    contenidoHTML += `
        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Este reporte fue generado automáticamente por el sistema de gestión Sweety Puppies</p>
        </div>
        </div>
    `;
    
    // Generar y descargar PDF
    generarPDFDesdeHTML(contenidoHTML, `reporte-diario-${fecha}.pdf`);
}

// Exportar reporte por período a PDF
function exportarReportePeriodoPDF() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    let contenidoHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #9c0076; padding-bottom: 20px;">
                <h1 style="color: #9c0076; margin: 0; font-size: 28px;">Sweety Puppies</h1>
                <h2 style="color: #333; margin: 10px 0; font-size: 20px;">Reporte por Período</h2>
                <p style="color: #666; margin: 5px 0; font-size: 16px;">Desde: ${formatearFechaLegible(fechaInicio)} hasta: ${formatearFechaLegible(fechaFin)}</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;">Generado el: ${new Date().toLocaleString('es-CO')}</p>
            </div>
    `;
    
    // Resumen general
    const totalCitas = document.getElementById('totalCitasPeriodo').textContent;
    const ingresos = document.getElementById('ingresosPeriodo').textContent;
    const clientes = document.getElementById('clientesPeriodo').textContent;
    const promedio = document.getElementById('promedioDiario').textContent;
    const servicioPopular = document.getElementById('servicioPopular').textContent;
    
    contenidoHTML += `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #9c0076; border-bottom: 2px solid #9c0076; padding-bottom: 10px;">Resumen General</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 24px;">${totalCitas}</h4>
                    <p style="margin: 5px 0; color: #666;">Total de citas</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 20px;">${ingresos}</h4>
                    <p style="margin: 5px 0; color: #666;">Total ingresos</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 24px;">${clientes}</h4>
                    <p style="margin: 5px 0; color: #666;">Clientes únicos</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #9c0076; font-size: 20px;">${promedio}</h4>
                    <p style="margin: 5px 0; color: #666;">Promedio diario</p>
                </div>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center; border-left: 4px solid #9c0076;">
                <h4 style="margin: 0; color: #9c0076;">🏆 Servicio más popular: ${servicioPopular}</h4>
            </div>
        </div>
    `;
    
    // Agregar tablas si están visibles
    contenidoHTML += agregarTablaPDF('serviciosPopulares', 'Servicios Más Populares', 
        ['Servicio', 'Cantidad', 'Precio Unitario', 'Total Ingresos']);
    
    contenidoHTML += agregarTablaPDF('clientesFrecuentes', 'Clientes Más Frecuentes', 
        ['Cliente', 'Cédula', 'Total Citas', 'Total Gastado']);
    
    contenidoHTML += agregarTablaPDF('diasSemana', 'Estadísticas por Día de la Semana', 
        ['Día de la Semana', 'Total Citas', 'Total Ingresos']);
    
    contenidoHTML += `
        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Este reporte fue generado automáticamente por el sistema de gestión Sweety Puppies</p>
        </div>
        </div>
    `;
    
    generarPDFDesdeHTML(contenidoHTML, `reporte-periodo-${fechaInicio}-${fechaFin}.pdf`);
}

// Exportar reporte mensual a PDF
function exportarReporteMensualPDF() {
    const ano = document.getElementById('anoMensual').value;
    
    let contenidoHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #9c0076; padding-bottom: 20px;">
                <h1 style="color: #9c0076; margin: 0; font-size: 28px;">Sweety Puppies</h1>
                <h2 style="color: #333; margin: 10px 0; font-size: 20px;">Estadísticas Mensuales</h2>
                <p style="color: #666; margin: 5px 0; font-size: 16px;">Año: ${ano}</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;">Generado el: ${new Date().toLocaleString('es-CO')}</p>
            </div>
    `;
    
    contenidoHTML += agregarTablaPDF('ingresosMensuales', 'Ingresos Mensuales', 
        ['Mes', 'Total Citas', 'Total Ingresos']);
    
    contenidoHTML += `
        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Este reporte fue generado automáticamente por el sistema de gestión Sweety Puppies</p>
        </div>
        </div>
    `;
    
    generarPDFDesdeHTML(contenidoHTML, `estadisticas-mensuales-${ano}.pdf`);
}

// Función auxiliar para agregar tablas al PDF
function agregarTablaPDF(idTabla, titulo, encabezados) {
    const contenedor = document.getElementById(idTabla);
    if (contenedor.style.display === 'none') return '';
    
    const tabla = contenedor.querySelector('table tbody');
    if (!tabla) return '';
    
    const filas = tabla.querySelectorAll('tr');
    if (filas.length === 0) return '';
    
    let contenidoTabla = `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #9c0076; border-bottom: 2px solid #9c0076; padding-bottom: 10px;">${titulo}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #9c0076; color: white;">
    `;
    
    encabezados.forEach(encabezado => {
        contenidoTabla += `<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">${encabezado}</th>`;
    });
    
    contenidoTabla += `
                    </tr>
                </thead>
                <tbody>
    `;
    
    filas.forEach((fila, index) => {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length > 0) {
            const esImpar = index % 2 === 0;
            contenidoTabla += `<tr style="background-color: ${esImpar ? '#f8f9fa' : 'white'};">`;
            celdas.forEach(celda => {
                contenidoTabla += `<td style="padding: 8px; border: 1px solid #ddd;">${celda.textContent}</td>`;
            });
            contenidoTabla += `</tr>`;
        }
    });
    
    contenidoTabla += `
                </tbody>
            </table>
        </div>
    `;
    
    return contenidoTabla;
}

// Generar PDF desde HTML usando window.print
function generarPDFDesdeHTML(contenidoHTML, nombreArchivo) {
    // Crear una nueva ventana
    const ventanaPDF = window.open('', '_blank');
    
    // Escribir el contenido HTML con estilos de impresión
    ventanaPDF.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${nombreArchivo}</title>
            <meta charset="UTF-8">
            <style>
                @page {
                    size: A4;
                    margin: 1cm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                }
                table {
                    page-break-inside: avoid;
                }
                @media print {
                    body { 
                        print-color-adjust: exact; 
                        -webkit-print-color-adjust: exact; 
                    }
                    .no-print { 
                        display: none; 
                    }
                }
            </style>
        </head>
        <body>
            ${contenidoHTML}
        </body>
        </html>
    `);
    
    ventanaPDF.document.close();
    
    // Esperar un poco para que cargue el contenido y luego imprimir
    setTimeout(() => {
        ventanaPDF.focus();
        ventanaPDF.print();
        
        // Cerrar la ventana después de imprimir
        setTimeout(() => {
            ventanaPDF.close();
        }, 1000);
    }, 500);
}

// Función auxiliar para formatear fechas legibles
function formatearFechaLegible(fecha) {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Funciones de utilidad
function formatearMoneda(cantidad) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cantidad || 0);
}

function formatearHora(hora) {
    if (!hora) return '-';
    
    // Si la hora viene como string de tiempo completo (HH:MM:SS), extraer solo HH:MM
    let horaLimpia = hora;
    if (typeof hora === 'string' && hora.includes(':')) {
        const partes = hora.split(':');
        horaLimpia = `${partes[0]}:${partes[1]}`;
    }
    
    // Convertir formato de hora de 24h a 12h
    const [horas, minutos] = horaLimpia.split(':');
    const horaNum = parseInt(horas);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    const hora12 = horaNum % 12 || 12;
    
    return `${hora12}:${minutos} ${ampm}`;
}

function mostrarCarga(mostrar) {
    const cargando = document.getElementById('cargando');
    if (cargando) {
        cargando.style.display = mostrar ? 'flex' : 'none';
    }
}

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('errorMensaje');
    const textoError = document.getElementById('textoError');
    
    if (errorDiv && textoError) {
        textoError.textContent = mensaje;
        errorDiv.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function mostrarSinDatos() {
    const sinDatos = document.getElementById('sinDatos');
    if (sinDatos) {
        sinDatos.style.display = 'block';
    }
}

function mostrarToast(mensaje) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    
    if (toast && toastText) {
        toastText.textContent = mensaje;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function limpiarResultados() {
    // Ocultar todos los contenedores de resultados
    const elementos = [
        'estadisticasDiarias', 'detalleCitasDiarias', 'resumenPeriodo',
        'serviciosPopulares', 'clientesFrecuentes', 'diasSemana',
        'ingresosMensuales', 'errorMensaje', 'sinDatos'
    ];
    
    elementos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.style.display = 'none';
        }
    });
}

// Configurar cursor personalizado
function setupCustomCursor() {
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');
    
    if (!cursorDot || !cursorOutline) return;
    
    document.addEventListener('mousemove', function(e) {
        const posX = e.clientX;
        const posY = e.clientY;
        
        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;
        
        cursorOutline.style.left = `${posX}px`;
        cursorOutline.style.top = `${posY}px`;
        
        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });
    
    // Efectos hover para elementos interactivos
    const clickableElements = document.querySelectorAll('button, a, input, .tab-btn');
    
    clickableElements.forEach(el => {
        el.addEventListener('mouseenter', function() {
            cursorDot.style.transform = 'translate(-50%, -50%) scale(2)';
            cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
        });
        
        el.addEventListener('mouseleave', function() {
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
}

// Configurar fechas máximas en los inputs
function setupMaxDates() {
    const hoy = new Date().toISOString().split('T')[0];
    const inputs = ['fechaDiaria', 'fechaInicio', 'fechaFin'];
    
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.setAttribute('max', hoy);
        }
    });
}

// Validaciones adicionales
function validarFechas(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const hoy = new Date();
    
    if (inicio > hoy || fin > hoy) {
        throw new Error('No se pueden seleccionar fechas futuras');
    }
    
    if (inicio > fin) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    
    // Validar que el rango no sea mayor a 1 año
    const unAno = 365 * 24 * 60 * 60 * 1000;
    if (fin - inicio > unAno) {
        throw new Error('El rango de fechas no puede ser mayor a un año');
    }
    
    return true;
}

// Event listeners adicionales
document.addEventListener('keydown', function(e) {
    // Esc para cerrar mensajes de error
    if (e.key === 'Escape') {
        limpiarResultados();
    }
});