const { HistoryError } = require('../../domain/errors/HistoryError');

function slugify(value) {
  return String(value || 'comprobante')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function generateClientCompletedServiceReceipt(dependencies, sessionUser, historyId) {
  const clientContext = await dependencies.historyRepository.resolveClientContext(sessionUser);
  const servicio = await dependencies.historyRepository.findCompletedServiceDetail(historyId, clientContext.clientIds);

  if (!servicio) {
    throw new HistoryError('La cita realizada solicitada no pertenece a tu historial', 404, 'SERVICE_HISTORY_NOT_FOUND');
  }

  const pdfBuffer = await dependencies.receiptPdfService.generateReceipt({
    servicio
  });

  const dateKey = String(servicio.fechaServicio || '').slice(0, 10) || 'sin-fecha';
  const petSlug = slugify(servicio.mascotaNombre);
  const fileName = `comprobante-${petSlug}-${dateKey}.pdf`;

  return {
    buffer: pdfBuffer,
    fileName
  };
}

module.exports = { generateClientCompletedServiceReceipt };
