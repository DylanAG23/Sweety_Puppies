const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PAGE_MARGIN = 54;
const COLORS = {
  purple: '#8F176E',
  purpleSoft: '#B14790',
  green: '#43BFAF',
  black: '#1F1A1E',
  gray: '#5C525A',
  lightLine: '#DCD1D9'
};

const CANDIDATE_LOGO_PATHS = [
  'C:/Users/Dylan Avellaneda/Downloads/SweetyPuppies logo.png',
  path.join(__dirname, '../../../../SwettyPuppies_Frontend/public/logo.png'),
  path.join(__dirname, '../../../../SwettyPuppies_Frontend/public/img/logo.png')
];

function resolveLogoPath() {
  return CANDIDATE_LOGO_PATHS.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || null;
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-CO').format(Number(value) || 0);
}

function formatDateTime() {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date());
}

function humanizeReportType(reportType) {
  if (reportType === 'dashboard') {
    return 'Dashboard administrativo de reportes';
  }
  if (reportType === 'adicionales') {
    return 'Reporte de ingresos por servicios adicionales';
  }
  if (reportType === 'citas') {
    return 'Reporte de citas realizadas';
  }
  if (reportType === 'resumen') {
    return 'Resumen financiero 30 / 70';
  }
  return 'Reporte de ganancias totales';
}

function buildSummaryRows(reportType, reporte) {
  if (reportType === 'dashboard') {
    const kpis = reporte.kpis || {};
    return [
      ['Total ingresado', formatMoney(kpis.totalIngresado)],
      ['70% ganancia neta estimada', formatMoney(kpis.gananciaNeta)],
      ['30% insumos / reserva', formatMoney(kpis.reservaInsumos)],
      ['Citas realizadas', formatNumber(kpis.totalCitasRealizadas)],
      ['Citas canceladas', formatNumber(kpis.totalCitasCanceladas)],
      ['Promedio por cita', formatMoney(kpis.promedioIngresoPorCita)]
    ];
  }

  if (reportType === 'adicionales') {
    return [
      ['Ingreso por adicionales', formatMoney(reporte.totalIngresado)],
      ['Aplicaciones registradas', formatNumber(reporte.totalAplicaciones)],
      ['Adicional destacado', reporte.adicionales?.[0]?.nombre || 'Sin registros']
    ];
  }

  if (reportType === 'citas') {
    return [
      ['Citas realizadas', formatNumber(reporte.totalCitasRealizadas)],
      ['Servicios principales realizados', formatNumber(reporte.totalServiciosPrincipales)],
      ['Adicionales aplicados', formatNumber(reporte.totalAdicionalesAplicados)]
    ];
  }

  if (reportType === 'resumen') {
    return [
      ['Total ingresado', formatMoney(reporte.totalIngresado)],
      ['30% fondo de insumos / ahorro', formatMoney(reporte.fondoInsumos)],
      ['70% ganancia neta considerada', formatMoney(reporte.gananciaNeta)],
      ['Citas realizadas', formatNumber(reporte.totalCitasRealizadas)],
      ['Promedio por cita', formatMoney(reporte.promedioPorCita)]
    ];
  }

  return [
    ['Total ingresado', formatMoney(reporte.totalIngresado)],
    ['Citas realizadas', formatNumber(reporte.totalCitasRealizadas)],
    ['Promedio por cita', formatMoney(reporte.promedioPorCita)]
  ];
}

function buildDetailRows(reportType, reporte) {
  if (reportType === 'dashboard') {
    const rows = [];

    (reporte.tablas?.serviciosPrincipales || []).slice(0, 4).forEach((item) => {
      rows.push({
        nombre: `Servicio: ${item.nombre}`,
        detalle: `${formatNumber(item.totalCitas)} citas`,
        valor: formatMoney(item.totalIngresado)
      });
    });

    (reporte.tablas?.serviciosAdicionales || []).slice(0, 4).forEach((item) => {
      rows.push({
        nombre: `Adicional: ${item.nombre}`,
        detalle: `${formatNumber(item.totalAplicaciones)} aplicaciones`,
        valor: formatMoney(item.totalIngresado)
      });
    });

    return rows;
  }

  if (reportType === 'adicionales') {
    return (reporte.adicionales || []).map((item) => ({
      nombre: item.nombre,
      detalle: `${formatNumber(item.totalAplicaciones)} aplicaciones`,
      valor: formatMoney(item.totalIngresado)
    }));
  }

  if (reportType === 'resumen') {
    return [
      {
        nombre: 'Total ingresado',
        detalle: '100% del ingreso del periodo',
        valor: formatMoney(reporte.totalIngresado)
      },
      {
        nombre: 'Fondo insumos / ahorro',
        detalle: '30% sugerido para operacion',
        valor: formatMoney(reporte.fondoInsumos)
      },
      {
        nombre: 'Ganancia neta considerada',
        detalle: '70% sugerido como utilidad neta',
        valor: formatMoney(reporte.gananciaNeta)
      }
    ];
  }

  return (reporte.serviciosPrincipales || []).map((item) => ({
    nombre: item.nombre,
    detalle: `${formatNumber(item.totalCitas)} registros`,
    valor: formatMoney(item.totalIngresado)
  }));
}

function ensureSpace(doc, requiredHeight) {
  if (doc.y + requiredHeight <= doc.page.height - PAGE_MARGIN) {
    return;
  }

  doc.addPage();
  drawPageBase(doc);
}

function drawPageBase(doc) {
  doc.y = PAGE_MARGIN;
  doc.save();
  doc
    .moveTo(PAGE_MARGIN, PAGE_MARGIN - 12)
    .lineTo(doc.page.width - PAGE_MARGIN, PAGE_MARGIN - 12)
    .strokeColor(COLORS.lightLine)
    .lineWidth(1)
    .stroke();
  doc.restore();
}

function drawHeader(doc, payload) {
  const logoPath = resolveLogoPath();
  const headerTop = PAGE_MARGIN;

  if (logoPath) {
    doc.image(logoPath, PAGE_MARGIN, headerTop, {
      fit: [170, 110],
      align: 'left',
      valign: 'top'
    });
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor(COLORS.purple)
    .text('Sweety Puppies', PAGE_MARGIN + 190, headerTop + 6, {
      width: 300,
      align: 'left'
    });

  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.gray)
    .text('Peluqueria canina | Reporte administrativo del negocio', PAGE_MARGIN + 190, headerTop + 36, {
      width: 300
    });

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COLORS.purple)
    .text('REPORTE', PAGE_MARGIN + 190, headerTop + 66);

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(COLORS.black)
    .text(humanizeReportType(payload.reportType), PAGE_MARGIN + 190, headerTop + 90, {
      width: 300
    });

  doc
    .moveTo(PAGE_MARGIN, headerTop + 130)
    .lineTo(doc.page.width - PAGE_MARGIN, headerTop + 130)
    .strokeColor(COLORS.green)
    .lineWidth(2)
    .stroke();

  doc.y = headerTop + 150;
}

function drawMetaSection(doc, payload) {
  ensureSpace(doc, 90);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.purple).text('Detalles del reporte', PAGE_MARGIN, doc.y);

  doc.y += 10;

  const leftX = PAGE_MARGIN;
  const rightX = doc.page.width / 2 + 10;
  const startY = doc.y;

  drawMetaRow(doc, leftX, startY, 'Tipo', humanizeReportType(payload.reportType));
  drawMetaRow(doc, leftX, startY + 20, 'Periodo consultado', payload.filtro.label);
  drawMetaRow(doc, rightX, startY, 'Fecha de generacion', formatDateTime());
  drawMetaRow(doc, rightX, startY + 20, 'Fuente', 'Historial de citas realizadas y servicios adicionales aplicados');

  doc.y = startY + 54;

  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).strokeColor(COLORS.lightLine).lineWidth(1).stroke();

  doc.y += 18;
}

function drawMetaRow(doc, x, y, label, value) {
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.purpleSoft).text(`${label}:`, x, y, { width: 130 });
  doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.black).text(value, x + 92, y, { width: 200 });
}

function drawSummarySection(doc, rows) {
  ensureSpace(doc, 120);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.purple).text('Resumen principal', PAGE_MARGIN, doc.y);

  doc.y += 12;

  rows.forEach(([label, value], index) => {
    const y = doc.y;

    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.black).text(label, PAGE_MARGIN, y, { width: 250 });

    doc.font('Helvetica').fontSize(11).fillColor(COLORS.black).text(value, doc.page.width - PAGE_MARGIN - 180, y, {
      width: 180,
      align: 'right'
    });

    doc.y += 18;

    if (index < rows.length - 1) {
      doc.moveTo(PAGE_MARGIN, doc.y - 4).lineTo(doc.page.width - PAGE_MARGIN, doc.y - 4).strokeColor('#EFE7EC').lineWidth(0.8).stroke();
    }
  });

  doc.y += 12;
}

function drawNotesSection(doc, reportType, reporte) {
  ensureSpace(doc, 90);

  const notes = [];

  if (reportType === 'ganancias') {
    notes.push('Las ganancias reportadas provienen unicamente de citas ya completadas y registradas en historial.');
    notes.push(`El promedio por cita del periodo fue ${formatMoney(reporte.promedioPorCita)}.`);
  } else if (reportType === 'dashboard') {
    const kpis = reporte.kpis || {};
    notes.push('Este documento resume el dashboard administrativo aplicando exactamente los filtros seleccionados.');
    notes.push(
      `El servicio principal mas solicitado fue ${kpis.servicioMasSolicitado?.nombre || 'sin registros'} y el adicional mas vendido fue ${kpis.servicioAdicionalMasVendido?.nombre || 'sin registros'}.`
    );
    notes.push(
      `El mejor dia por ingreso fue ${kpis.diaMayorIngreso?.label || 'sin datos'} y el de mayor volumen de citas fue ${kpis.diaMayorCantidadCitas?.label || 'sin datos'}.`
    );
  } else if (reportType === 'adicionales') {
    notes.push('Este reporte muestra el ingreso generado por servicios adicionales ya cobrados al negocio.');
    notes.push(`Se registraron ${formatNumber(reporte.totalAplicaciones)} aplicaciones en el periodo consultado.`);
  } else if (reportType === 'citas') {
    notes.push('El volumen operativo se calcula solo con citas realizadas y cerradas en el sistema.');
    notes.push('Los servicios principales listados ayudan a identificar en que se concentra la demanda.');
  } else {
    notes.push('La distribucion 30 / 70 es una lectura interna para administracion, no reemplaza contabilidad formal.');
    notes.push('El 30% se propone como reserva operativa y el 70% como ganancia neta considerada.');
  }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.purple).text('Observaciones', PAGE_MARGIN, doc.y);

  doc.y += 10;

  notes.forEach((note) => {
    doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.black).text(`- ${note}`, PAGE_MARGIN, doc.y, {
      width: doc.page.width - PAGE_MARGIN * 2,
      lineGap: 3
    });
    doc.y += 8;
  });

  doc.y += 8;
}

function drawDetailTable(doc, title, rows) {
  ensureSpace(doc, 110);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.purple).text(title, PAGE_MARGIN, doc.y);

  doc.y += 12;

  const tableX = PAGE_MARGIN;
  const tableWidth = doc.page.width - PAGE_MARGIN * 2;
  const nameWidth = tableWidth * 0.45;
  const detailWidth = tableWidth * 0.28;
  const valueWidth = tableWidth - nameWidth - detailWidth;
  const headerY = doc.y;

  doc.rect(tableX, headerY, tableWidth, 24).fill(COLORS.green);

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10.5);
  doc.text('Concepto', tableX + 10, headerY + 7, { width: nameWidth - 12 });
  doc.text('Detalle', tableX + nameWidth + 10, headerY + 7, { width: detailWidth - 12 });
  doc.text('Valor', tableX + nameWidth + detailWidth + 10, headerY + 7, {
    width: valueWidth - 20,
    align: 'right'
  });

  doc.y = headerY + 28;

  if (!rows.length) {
    doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.black).text('No se encontraron registros para este periodo.', tableX, doc.y + 8, {
      width: tableWidth
    });
    doc.y += 28;
    return;
  }

  rows.forEach((row, index) => {
    ensureSpace(doc, 30);
    const rowY = doc.y;

    if (index % 2 === 0) {
      doc.rect(tableX, rowY - 2, tableWidth, 24).fill('#F9F7F9');
    }

    doc.font('Helvetica-Bold').fontSize(10.2).fillColor(COLORS.black);
    doc.text(row.nombre, tableX + 10, rowY + 4, { width: nameWidth - 12 });

    doc.font('Helvetica').fontSize(10.2).fillColor(COLORS.black);
    doc.text(row.detalle, tableX + nameWidth + 10, rowY + 4, { width: detailWidth - 12 });

    doc.font('Helvetica').fontSize(10.2).fillColor(COLORS.black);
    doc.text(row.valor, tableX + nameWidth + detailWidth + 10, rowY + 4, {
      width: valueWidth - 20,
      align: 'right'
    });

    doc.moveTo(tableX, rowY + 24).lineTo(tableX + tableWidth, rowY + 24).strokeColor('#EEE7EC').lineWidth(0.8).stroke();

    doc.y += 24;
  });

  doc.y += 12;
}

function drawFooter(doc) {
  const footerY = doc.page.height - PAGE_MARGIN + 8;

  doc.moveTo(PAGE_MARGIN, footerY - 10).lineTo(doc.page.width - PAGE_MARGIN, footerY - 10).strokeColor(COLORS.lightLine).lineWidth(1).stroke();

  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray).text(
    'Sweety Puppies | Documento generado desde el ERP administrativo del negocio',
    PAGE_MARGIN,
    footerY,
    {
      width: doc.page.width - PAGE_MARGIN * 2,
      align: 'center'
    }
  );
}

class SimplePdfReportService {
  async generateReportPdf(payload) {
    const summaryRows = buildSummaryRows(payload.reportType, payload.reporte);
    const detailRows = buildDetailRows(payload.reportType, payload.reporte);
    const detailTitle =
      payload.reportType === 'dashboard'
        ? 'Servicios y adicionales destacados'
        : payload.reportType === 'adicionales'
          ? 'Detalle de servicios adicionales'
          : payload.reportType === 'resumen'
            ? 'Distribucion financiera'
            : 'Detalle del periodo';

    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN
      },
      info: {
        Title: payload.reportTitle,
        Author: 'Sweety Puppies ERP',
        Subject: `Reporte ${payload.reportType}`,
        Keywords: 'Sweety Puppies, reportes, citas, ingresos'
      }
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('pageAdded', () => drawPageBase(doc));

    drawPageBase(doc);
    drawHeader(doc, payload);
    drawMetaSection(doc, payload);
    drawSummarySection(doc, summaryRows);
    drawNotesSection(doc, payload.reportType, payload.reporte);
    drawDetailTable(doc, detailTitle, detailRows);
    drawFooter(doc);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }
}

module.exports = { SimplePdfReportService };
