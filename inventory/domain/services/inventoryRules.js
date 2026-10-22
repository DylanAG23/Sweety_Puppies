const { InventoryError } = require('../errors/InventoryError');

// Reglas puras del inventario (ACT-15, pantallas 10 y 11, y script de Fase 2).
// Sin I/O: reciben datos y devuelven datos o lanzan InventoryError.

const MOVEMENT_TYPES = ['entrada', 'salida', 'ajuste'];
const STOCK_LEVELS = ['normal', 'bajo', 'agotado'];
const MAX_REASON_LENGTH = 100;
const MAX_NOTE_LENGTH = 500;
const MAX_QUANTITY = 100000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Motivos sugeridos en ACT-15. El motivo es texto libre; estos solo orientan la interfaz.
const SUGGESTED_REASONS = {
  entrada: ['Compra a proveedor', 'Devolución'],
  salida: ['Producto dañado o vencido', 'Uso interno en la peluquería'],
  ajuste: ['Conteo físico']
};

const ORDER_SALE_REASON = 'Venta';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Normal: stock > minimo. Bajo: 0 < stock <= minimo. Agotado: stock = 0.
function computeStockLevel(stockActual, stockMinimo) {
  const stock = Number(stockActual) || 0;
  const minimo = Number(stockMinimo) || 0;

  if (stock <= 0) {
    return 'agotado';
  }

  return stock <= minimo ? 'bajo' : 'normal';
}

function parseUuid(value, message) {
  const text = cleanText(value);

  if (!UUID_PATTERN.test(text)) {
    throw new InventoryError(message, 400, 'INVALID_PRODUCT');
  }

  return text;
}

function normalizeProductId(value) {
  return parseUuid(value, 'El producto indicado no es valido');
}

function parseWholeNumber(value, { min, message }) {
  const text = typeof value === 'number' ? String(value) : cleanText(value);

  if (!/^\d+$/.test(text)) {
    throw new InventoryError(message, 400, 'INVALID_QUANTITY');
  }

  const number = Number(text);

  if (number < min || number > MAX_QUANTITY) {
    throw new InventoryError(message, 400, 'INVALID_QUANTITY');
  }

  return number;
}

// Entrada y salida reciben las unidades a sumar o restar; el ajuste recibe el valor contado.
function normalizeMovementPayload(payload = {}) {
  const productoId = parseUuid(payload.productoId ?? payload.producto_id, 'Selecciona un producto valido');
  const tipo = cleanText(payload.tipo ?? payload.tipoMovimiento ?? payload.tipo_movimiento).toLowerCase();

  if (!MOVEMENT_TYPES.includes(tipo)) {
    throw new InventoryError('El tipo de movimiento debe ser entrada, salida o ajuste', 400, 'INVALID_MOVEMENT_TYPE');
  }

  const cantidad =
    tipo === 'ajuste'
      ? parseWholeNumber(payload.cantidad, { min: 0, message: 'El valor contado debe ser un numero entero igual o mayor a 0' })
      : parseWholeNumber(payload.cantidad, { min: 1, message: 'La cantidad debe ser un numero entero mayor a 0' });

  const motivo = cleanText(payload.motivo);

  if (!motivo) {
    throw new InventoryError('Indica el motivo del movimiento', 400, 'REASON_REQUIRED');
  }

  if (motivo.length > MAX_REASON_LENGTH) {
    throw new InventoryError(`El motivo no puede superar ${MAX_REASON_LENGTH} caracteres`, 400, 'REASON_TOO_LONG');
  }

  const observacion = cleanText(payload.observacion) || null;

  if (observacion && observacion.length > MAX_NOTE_LENGTH) {
    throw new InventoryError(`La observacion no puede superar ${MAX_NOTE_LENGTH} caracteres`, 400, 'NOTE_TOO_LONG');
  }

  return { productoId, tipo, cantidad, motivo, observacion };
}

// Calcula la cantidad con signo y el stock resultante, como lo exige la base
// (stock_resultante = stock_anterior + cantidad, sin quedar negativo).
function computeMovement({ tipo, cantidad, stockAnterior }) {
  const anterior = Number(stockAnterior) || 0;
  let cantidadConSigno;

  if (tipo === 'entrada') {
    cantidadConSigno = cantidad;
  } else if (tipo === 'salida') {
    if (cantidad > anterior) {
      throw new InventoryError(
        `No hay suficiente stock: hay ${anterior} y se intentan retirar ${cantidad}`,
        409,
        'INSUFFICIENT_STOCK'
      );
    }
    cantidadConSigno = -cantidad;
  } else {
    cantidadConSigno = cantidad - anterior;

    if (cantidadConSigno === 0) {
      throw new InventoryError('El valor contado es igual al stock actual; no hay nada que ajustar', 400, 'NO_CHANGE');
    }
  }

  return {
    cantidad: cantidadConSigno,
    stockAnterior: anterior,
    stockResultante: anterior + cantidadConSigno
  };
}

function normalizeMinimumStock(payload = {}) {
  return parseWholeNumber(payload.stockMinimo ?? payload.stock_minimo, {
    min: 0,
    message: 'El stock minimo debe ser un numero entero igual o mayor a 0'
  });
}

function normalizeOverviewFilters(query = {}) {
  const nivel = cleanText(query.nivel).toLowerCase();

  return {
    search: cleanText(query.search ?? query.busqueda).slice(0, 100),
    nivel: STOCK_LEVELS.includes(nivel) || nivel === 'alerta' ? nivel : 'todos'
  };
}

function matchesSearch(item, search) {
  if (!search) {
    return true;
  }

  const term = search.toLowerCase();
  return [item.nombre, item.referencia, item.categoriaNombre].some((value) =>
    String(value || '').toLowerCase().includes(term)
  );
}

// Agrega el nivel a cada producto, arma el resumen de la pantalla 10 y las alertas.
function buildInventoryOverview(items, { filters, movimientosHoy = 0 }) {
  const withLevel = items.map((item) => ({
    ...item,
    nivel: computeStockLevel(item.stockActual, item.stockMinimo)
  }));

  const resumen = {
    unidadesEnStock: withLevel.reduce((total, item) => total + (Number(item.stockActual) || 0), 0),
    productosStockBajo: withLevel.filter((item) => item.nivel === 'bajo').length,
    productosAgotados: withLevel.filter((item) => item.nivel === 'agotado').length,
    movimientosHoy: Number(movimientosHoy) || 0
  };

  const alertas = withLevel
    .filter((item) => item.nivel !== 'normal')
    .map((item) => ({
      productoId: item.productoId,
      nombre: item.nombre,
      referencia: item.referencia,
      stockActual: item.stockActual,
      stockMinimo: item.stockMinimo,
      nivel: item.nivel
    }));

  const productos = withLevel.filter((item) => {
    if (filters.nivel === 'alerta' && item.nivel === 'normal') return false;
    if (STOCK_LEVELS.includes(filters.nivel) && item.nivel !== filters.nivel) return false;
    return matchesSearch(item, filters.search);
  });

  return {
    resumen,
    alerta: buildAlertMessage(resumen),
    alertas,
    productos
  };
}

function buildAlertMessage({ productosStockBajo, productosAgotados }) {
  if (!productosStockBajo && !productosAgotados) {
    return null;
  }

  const partes = [];

  if (productosStockBajo) {
    partes.push(
      productosStockBajo === 1
        ? '1 producto esta por debajo del stock minimo'
        : `${productosStockBajo} productos estan por debajo del stock minimo`
    );
  }

  if (productosAgotados) {
    partes.push(productosAgotados === 1 ? '1 esta agotado' : `${productosAgotados} estan agotados`);
  }

  return `${partes.join(' y ')}.`;
}

function parseDate(value, label) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  if (!DATE_PATTERN.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new InventoryError(`La fecha ${label} no es valida (usa AAAA-MM-DD)`, 400, 'INVALID_DATE');
  }

  return text;
}

function parsePositiveInt(value, fallback, max) {
  const number = Number.parseInt(value, 10);

  if (!Number.isInteger(number) || number < 1) {
    return fallback;
  }

  return Math.min(number, max);
}

function normalizeMovementFilters(query = {}, { paginate = true } = {}) {
  const desde = parseDate(query.desde ?? query.fechaInicio, 'inicial');
  const hasta = parseDate(query.hasta ?? query.fechaFin, 'final');

  if (desde && hasta && desde > hasta) {
    throw new InventoryError('La fecha inicial no puede ser posterior a la final', 400, 'INVALID_DATE_RANGE');
  }

  const tipo = cleanText(query.tipo).toLowerCase();
  const productoIdText = cleanText(query.productoId ?? query.producto_id);

  return {
    desde,
    hasta,
    tipo: MOVEMENT_TYPES.includes(tipo) ? tipo : 'todos',
    productoId: productoIdText ? parseUuid(productoIdText, 'El producto del filtro no es valido') : null,
    search: cleanText(query.search ?? query.busqueda).slice(0, 100),
    page: paginate ? parsePositiveInt(query.page ?? query.pagina, 1, 100000) : 1,
    pageSize: paginate ? parsePositiveInt(query.pageSize ?? query.limite, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE) : null
  };
}

// Origen y usuario como los muestra ACT-15: "Pedido SP-000123" / "Manual" y "Sistema" si no hay usuario.
function presentMovement(row) {
  return {
    ...row,
    origen: row.ordenCodigo ? `Pedido ${row.ordenCodigo}` : 'Manual',
    usuarioNombre: row.usuarioId ? row.usuarioNombre || 'Administradora' : 'Sistema'
  };
}

function csvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let text = String(value);

  // Evita que Excel interprete el contenido como formula.
  if (/^[=+\-@\t\r]/.test(text) && !/^[+-]?\d+$/.test(text)) {
    text = `'${text}`;
  }

  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatBogotaDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

// CSV con separador ";" y BOM para que Excel en espanol lo abra con tildes y columnas.
function buildMovementsCsv(movements) {
  const header = [
    'Fecha',
    'Referencia',
    'Producto',
    'Tipo',
    'Cantidad',
    'Stock anterior',
    'Stock resultante',
    'Motivo',
    'Observacion',
    'Origen',
    'Usuario'
  ];

  const rows = movements.map((movement) => [
    formatBogotaDateTime(movement.fecha),
    movement.productoReferencia,
    movement.productoNombre,
    movement.tipo,
    movement.cantidad > 0 ? `+${movement.cantidad}` : movement.cantidad,
    movement.stockAnterior,
    movement.stockResultante,
    movement.motivo,
    movement.observacion,
    movement.origen,
    movement.usuarioNombre
  ]);

  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

// Une las lineas de un pedido por producto para descontar una sola vez cada uno.
function groupOrderItems(items = []) {
  const totals = new Map();

  for (const item of items) {
    const productoId = parseUuid(item?.productoId ?? item?.producto_id, 'El pedido tiene un producto invalido');
    const cantidad = parseWholeNumber(item?.cantidad, { min: 1, message: 'El pedido tiene una cantidad invalida' });
    totals.set(productoId, (totals.get(productoId) || 0) + cantidad);
  }

  if (!totals.size) {
    throw new InventoryError('El pedido no tiene productos para descontar', 400, 'EMPTY_ORDER');
  }

  // Orden estable por id: dos pedidos simultaneos bloquean las filas en el mismo orden (sin interbloqueos).
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

module.exports = {
  MOVEMENT_TYPES,
  STOCK_LEVELS,
  SUGGESTED_REASONS,
  ORDER_SALE_REASON,
  computeStockLevel,
  normalizeProductId,
  normalizeMovementPayload,
  computeMovement,
  normalizeMinimumStock,
  normalizeOverviewFilters,
  buildInventoryOverview,
  buildAlertMessage,
  normalizeMovementFilters,
  presentMovement,
  buildMovementsCsv,
  groupOrderItems
};
