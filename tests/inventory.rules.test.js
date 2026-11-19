require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../inventory/domain/services/inventoryRules');
const { InventoryError } = require('../inventory/domain/errors/InventoryError');

const PRODUCT_ID = 'b0000000-0000-0000-0000-000000000001';

const isInventoryError = (status, code) => (error) =>
  error instanceof InventoryError && error.status === status && (!code || error.code === code);

test('nivel de stock: normal sobre el minimo, bajo hasta el minimo y agotado en 0', () => {
  assert.equal(rules.computeStockLevel(12, 5), 'normal');
  assert.equal(rules.computeStockLevel(5, 5), 'bajo');
  assert.equal(rules.computeStockLevel(1, 5), 'bajo');
  assert.equal(rules.computeStockLevel(0, 5), 'agotado');
  assert.equal(rules.computeStockLevel(0, 0), 'agotado');
  assert.equal(rules.computeStockLevel(3, 0), 'normal');
});

test('entrada suma, salida resta y ajuste corrige al valor contado', () => {
  assert.deepEqual(rules.computeMovement({ tipo: 'entrada', cantidad: 10, stockAnterior: 12 }), {
    cantidad: 10,
    stockAnterior: 12,
    stockResultante: 22
  });
  assert.deepEqual(rules.computeMovement({ tipo: 'salida', cantidad: 2, stockAnterior: 5 }), {
    cantidad: -2,
    stockAnterior: 5,
    stockResultante: 3
  });
  assert.deepEqual(rules.computeMovement({ tipo: 'ajuste', cantidad: 9, stockAnterior: 10 }), {
    cantidad: -1,
    stockAnterior: 10,
    stockResultante: 9
  });
  assert.deepEqual(rules.computeMovement({ tipo: 'ajuste', cantidad: 0, stockAnterior: 4 }).stockResultante, 0);
});

test('una salida no puede dejar el stock negativo', () => {
  assert.throws(
    () => rules.computeMovement({ tipo: 'salida', cantidad: 6, stockAnterior: 5 }),
    isInventoryError(409, 'INSUFFICIENT_STOCK')
  );
  assert.equal(rules.computeMovement({ tipo: 'salida', cantidad: 5, stockAnterior: 5 }).stockResultante, 0);
});

test('un ajuste igual al stock actual se rechaza', () => {
  assert.throws(() => rules.computeMovement({ tipo: 'ajuste', cantidad: 7, stockAnterior: 7 }), isInventoryError(400, 'NO_CHANGE'));
});

test('valida el movimiento: producto, tipo, cantidad entera y motivo obligatorio', () => {
  const valid = { productoId: PRODUCT_ID, tipo: 'Entrada', cantidad: '10', motivo: ' Compra a proveedor ', observacion: '  ' };
  assert.deepEqual(rules.normalizeMovementPayload(valid), {
    productoId: PRODUCT_ID,
    tipo: 'entrada',
    cantidad: 10,
    motivo: 'Compra a proveedor',
    observacion: null
  });

  assert.throws(() => rules.normalizeMovementPayload({ ...valid, productoId: '123' }), isInventoryError(400, 'INVALID_PRODUCT'));
  assert.throws(() => rules.normalizeMovementPayload({ ...valid, tipo: 'robo' }), isInventoryError(400, 'INVALID_MOVEMENT_TYPE'));
  assert.throws(() => rules.normalizeMovementPayload({ ...valid, cantidad: 0 }), isInventoryError(400, 'INVALID_QUANTITY'));
  assert.throws(() => rules.normalizeMovementPayload({ ...valid, cantidad: -3 }), isInventoryError(400, 'INVALID_QUANTITY'));
  assert.throws(() => rules.normalizeMovementPayload({ ...valid, cantidad: 2.5 }), isInventoryError(400, 'INVALID_QUANTITY'));
  assert.throws(() => rules.normalizeMovementPayload({ ...valid, motivo: '' }), isInventoryError(400, 'REASON_REQUIRED'));
  assert.throws(() => rules.normalizeMovementPayload({ ...valid, motivo: 'x'.repeat(101) }), isInventoryError(400, 'REASON_TOO_LONG'));

  // En el ajuste la cantidad es el valor contado, que puede ser 0.
  assert.equal(rules.normalizeMovementPayload({ ...valid, tipo: 'ajuste', cantidad: 0 }).cantidad, 0);
});

test('el resumen cuenta unidades, stock bajo, agotados y arma la alerta', () => {
  const items = [
    { productoId: '1', nombre: 'Shampoo', referencia: 'SP-HIG-014', stockActual: 12, stockMinimo: 5 },
    { productoId: '2', nombre: 'Snack dental', referencia: 'SP-SNK-021', stockActual: 3, stockMinimo: 6 },
    { productoId: '3', nombre: 'Perfume', referencia: 'SP-HIG-020', stockActual: 0, stockMinimo: 4 },
    { productoId: '4', nombre: 'Acondicionador', referencia: 'SP-HIG-030', stockActual: 4, stockMinimo: 5 }
  ];

  const overview = rules.buildInventoryOverview(items, {
    filters: rules.normalizeOverviewFilters({}),
    movimientosHoy: 7
  });

  assert.deepEqual(overview.resumen, {
    unidadesEnStock: 19,
    productosStockBajo: 2,
    productosAgotados: 1,
    movimientosHoy: 7
  });
  assert.equal(overview.alerta, '2 productos estan por debajo del stock minimo y 1 esta agotado.');
  assert.deepEqual(overview.alertas.map((item) => item.productoId), ['2', '3', '4']);
  assert.equal(overview.productos.length, 4);

  const onlyAlerts = rules.buildInventoryOverview(items, { filters: rules.normalizeOverviewFilters({ nivel: 'alerta' }) });
  assert.deepEqual(onlyAlerts.productos.map((item) => item.productoId), ['2', '3', '4']);

  const search = rules.buildInventoryOverview(items, { filters: rules.normalizeOverviewFilters({ search: 'sp-hig' }) });
  assert.deepEqual(search.productos.map((item) => item.productoId), ['1', '3', '4']);

  const healthy = rules.buildInventoryOverview([items[0]], { filters: rules.normalizeOverviewFilters({}) });
  assert.equal(healthy.alerta, null);
  assert.deepEqual(healthy.alertas, []);
});

test('filtros de movimientos: fechas validas, rango ordenado y paginacion limitada', () => {
  const filters = rules.normalizeMovementFilters({ desde: '2026-09-01', hasta: '2026-09-29', tipo: 'Salida', pageSize: '500' });
  assert.equal(filters.tipo, 'salida');
  assert.equal(filters.pageSize, 100);
  assert.equal(filters.page, 1);

  assert.equal(rules.normalizeMovementFilters({ tipo: 'otro' }).tipo, 'todos');
  assert.throws(() => rules.normalizeMovementFilters({ desde: '29/09/2026' }), isInventoryError(400, 'INVALID_DATE'));
  assert.throws(
    () => rules.normalizeMovementFilters({ desde: '2026-10-01', hasta: '2026-09-01' }),
    isInventoryError(400, 'INVALID_DATE_RANGE')
  );
  assert.equal(rules.normalizeMovementFilters({}, { paginate: false }).pageSize, null);
});

test('origen y usuario se muestran como en ACT-15', () => {
  const sale = rules.presentMovement({ ordenCodigo: 'SP-000123', usuarioId: null, usuarioNombre: null });
  assert.equal(sale.origen, 'Pedido SP-000123');
  assert.equal(sale.usuarioNombre, 'Sistema');

  const manual = rules.presentMovement({ ordenCodigo: null, usuarioId: 'u-1', usuarioNombre: 'Sara Leguizamon' });
  assert.equal(manual.origen, 'Manual');
  assert.equal(manual.usuarioNombre, 'Sara Leguizamon');
});

test('el CSV usa punto y coma, escapa comillas y neutraliza formulas', () => {
  const csv = rules.buildMovementsCsv([
    {
      fecha: '2026-09-29T15:24:00Z',
      productoReferencia: 'SP-HIG-014',
      productoNombre: 'Shampoo "suave"; 500 ml',
      tipo: 'entrada',
      cantidad: 10,
      stockAnterior: 3,
      stockResultante: 13,
      motivo: '=HYPERLINK("x")',
      observacion: null,
      origen: 'Manual',
      usuarioNombre: 'Sara'
    }
  ]);

  assert.ok(csv.startsWith('﻿Fecha;Referencia;Producto'));
  const line = csv.split('\r\n')[1];
  assert.match(line, /"Shampoo ""suave""; 500 ml"/);
  assert.match(line, /;\+10;3;13;/);
  assert.match(line, /'=HYPERLINK/);
  assert.match(line, /29\/09\/2026/);
});

test('las lineas de un pedido se agrupan por producto en orden estable', () => {
  const other = 'a0000000-0000-0000-0000-000000000009';
  assert.deepEqual(
    rules.groupOrderItems([
      { productoId: PRODUCT_ID, cantidad: 1 },
      { productoId: other, cantidad: 2 },
      { producto_id: PRODUCT_ID, cantidad: 3 }
    ]),
    [
      { productoId: other, cantidad: 2 },
      { productoId: PRODUCT_ID, cantidad: 4 }
    ]
  );
  assert.throws(() => rules.groupOrderItems([]), isInventoryError(400, 'EMPTY_ORDER'));
});
