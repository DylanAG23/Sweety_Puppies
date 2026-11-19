const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PAGE_MARGIN = 52;
const COLORS = {
  purple: '#8F176E',
  purpleSoft: '#B14790',
  green: '#43BFAF',
  black: '#1F1A1E',
  gray: '#5C525A',
  lightLine: '#E6DCE4',
  pale: '#F9F6F9'
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

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(date);
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
    .moveTo(PAGE_MARGIN, PAGE_MARGIN - 10)
    .lineTo(doc.page.width - PAGE_MARGIN, PAGE_MARGIN - 10)
    .strokeColor(COLORS.lightLine)
    .lineWidth(1)
    .stroke();
  doc.restore();
}

function drawHeader(doc, servicio) {
  const logoPath = resolveLogoPath();
  const headerTop = PAGE_MARGIN;

  if (logoPath) {
    doc.image(logoPath, PAGE_MARGIN, headerTop, {
      fit: [150, 96],
      align: 'left',
      valign: 'top'
    });
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(23)
    .fillColor(COLORS.purple)
    .text('Sweety Puppies', PAGE_MARGIN + 178, headerTop + 4, {
      width: 300
    });

  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.gray)
    .text('Comprobante de cita realizada', PAGE_MARGIN + 178, headerTop + 36, {
      width: 300
    });

  doc
    .font('Helvetica-Bold')
    .fontSize(17)
    .fillColor(COLORS.purple)
    .text('RESUMEN DEL SERVICIO', PAGE_MARGIN + 178, headerTop + 66, {
      width: 320
    });

  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.black)
    .text(`Mascota: ${servicio.mascotaNombre}`, PAGE_MARGIN + 178, headerTop + 92, {
      width: 320
    });

  doc
    .moveTo(PAGE_MARGIN, headerTop + 132)
    .lineTo(doc.page.width - PAGE_MARGIN, headerTop + 132)
    .strokeColor(COLORS.green)
    .lineWidth(2)
    .stroke();

  doc.y = headerTop + 152;
}

function drawDetailGrid(doc, servicio) {
  ensureSpace(doc, 250);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.purple).text('Detalles principales', PAGE_MARGIN, doc.y);
  doc.y += 14;

  const rows = [
    ['Cliente', servicio.clienteNombreCompleto || 'No registrado'],
    ['Cedula', servicio.clienteCedula || 'No registrada'],
    ['Correo', servicio.clienteEmail || 'No registrado'],
    ['Telefono', servicio.clienteTelefono || 'No registrado'],
    ['Mascota', servicio.mascotaNombre],
    ['Raza', servicio.mascotaRaza || 'No registrada'],
    ['Tamano', servicio.mascotaTamano || 'No registrado'],
    ['Tipo de pelaje', servicio.mascotaTipoPelaje || 'No registrado'],
    ['Fecha del servicio', formatDate(servicio.fechaServicio)],
    ['Servicio principal', servicio.servicioPrincipalNombre],
    ['Adicionales', servicio.serviciosAdicionalesResumen || 'Sin adicionales'],
    ['Estado del pelaje', servicio.estadoPelajeReal || 'No registrado'],
    ['Comportamiento', servicio.comportamientoObservado || 'No registrado']
  ];

  const columnGap = 18;
  const columnWidth = (doc.page.width - PAGE_MARGIN * 2 - columnGap) / 2;
  const leftRows = rows.filter((_, index) => index % 2 === 0);
  const rightRows = rows.filter((_, index) => index % 2 === 1);
  const startY = doc.y;

  function drawColumn(items, x) {
    let columnY = startY;

    items.forEach(([label, value]) => {
      ensureSpace(doc, 34);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.purpleSoft).text(label, x, columnY, {
        width: columnWidth
      });

      doc.font('Helvetica').fontSize(10.4).fillColor(COLORS.black).text(value, x, columnY + 14, {
        width: columnWidth
      });

      doc
        .moveTo(x, columnY + 30)
        .lineTo(x + columnWidth, columnY + 30)
        .strokeColor(COLORS.lightLine)
        .lineWidth(0.8)
        .stroke();

      columnY += 38;
    });

    return columnY;
  }

  const leftBottom = drawColumn(leftRows, PAGE_MARGIN);
  const rightBottom = drawColumn(rightRows, PAGE_MARGIN + columnWidth + columnGap);
  doc.y = Math.max(leftBottom, rightBottom) + 8;
}

function drawSummaryBlock(doc, servicio) {
  ensureSpace(doc, 180);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.purple).text('Resumen y cierre de la cita', PAGE_MARGIN, doc.y);
  doc.y += 14;

  const sections = [
    ['Resumen del servicio', servicio.resumenServicioRealizado || 'No se registro un resumen final.'],
    ['Observaciones finales', servicio.observacionesFinales || 'No se registraron observaciones finales.'],
    ['Recomendaciones', servicio.recomendaciones || 'No se registraron recomendaciones.']
  ];

  sections.forEach(([title, content]) => {
    ensureSpace(doc, 62);
    const sectionY = doc.y;

    doc.font('Helvetica-Bold').fontSize(10.8).fillColor(COLORS.purple).text(title, PAGE_MARGIN, sectionY);
    doc.font('Helvetica').fontSize(10.4).fillColor(COLORS.black).text(content, PAGE_MARGIN, sectionY + 18, {
      width: doc.page.width - PAGE_MARGIN * 2,
      lineGap: 3
    });

    doc.y = doc.y + 48;
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .strokeColor(COLORS.lightLine)
      .lineWidth(0.8)
      .stroke();
    doc.y += 14;
  });
}

function drawAmountsTable(doc, servicio) {
  ensureSpace(doc, 110);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.purple).text('Resumen de valores', PAGE_MARGIN, doc.y);
  doc.y += 12;

  const rows = [
    ['Precio base', formatMoney(servicio.precioBase)],
    ['Precio calculado', formatMoney(servicio.precioCalculado)],
    ['Precio final', formatMoney(servicio.precioFinal)]
  ];

  rows.forEach((row, index) => {
    const y = doc.y;

    if (index === rows.length - 1) {
      doc.rect(PAGE_MARGIN, y - 3, doc.page.width - PAGE_MARGIN * 2, 28).fill('#F7EEF5');
    }

    doc.font(index === rows.length - 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(11).fillColor(COLORS.black).text(row[0], PAGE_MARGIN + 8, y + 4);
    doc.font(index === rows.length - 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(11).fillColor(COLORS.black).text(
      row[1],
      doc.page.width - PAGE_MARGIN - 170,
      y + 4,
      { width: 160, align: 'right' }
    );

    doc
      .moveTo(PAGE_MARGIN, y + 24)
      .lineTo(doc.page.width - PAGE_MARGIN, y + 24)
      .strokeColor(index === rows.length - 1 ? COLORS.green : COLORS.lightLine)
      .lineWidth(index === rows.length - 1 ? 1.2 : 0.8)
      .stroke();

    doc.y += 28;
  });

  doc.y += 12;
}

function drawFooter(doc) {
  const footerY = doc.page.height - PAGE_MARGIN + 8;

  doc.moveTo(PAGE_MARGIN, footerY - 10).lineTo(doc.page.width - PAGE_MARGIN, footerY - 10).strokeColor(COLORS.lightLine).lineWidth(1).stroke();

  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray).text(
    'Sweety Puppies | Documento generado desde el portal del cliente',
    PAGE_MARGIN,
    footerY,
    {
      width: doc.page.width - PAGE_MARGIN * 2,
      align: 'center'
    }
  );
}

class SimpleClientReceiptPdfService {
  async generateReceipt(payload) {
    const { servicio } = payload;
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN
      },
      info: {
        Title: `Comprobante de ${servicio.mascotaNombre}`,
        Author: 'Sweety Puppies ERP',
        Subject: 'Comprobante de cita realizada',
        Keywords: 'Sweety Puppies, cliente, comprobante, cita'
      }
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('pageAdded', () => drawPageBase(doc));

    drawPageBase(doc);
    drawHeader(doc, servicio);
    drawDetailGrid(doc, servicio);
    drawSummaryBlock(doc, servicio);
    drawAmountsTable(doc, servicio);
    drawFooter(doc);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }
}

module.exports = { SimpleClientReceiptPdfService };
