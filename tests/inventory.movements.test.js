require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../inventory/domain/services/inventoryRules');
const { InventoryError } = require('../inventory/domain/errors/InventoryError');
const { registerInventoryMovement } = require('../inventory/application/useCases/registerInventoryMovement');
const { discountStockForOrder } = require('../inventory/application/useCases/discountStockForOrder');
const { getInventoryOverview } = require('../inventory/application/useCases/getInventoryOverview');
const { updateMinimumStock } = require('../inventory/application/useCases/updateMinimumStock');

const SHAMPOO = 'b0000000-0000-0000-0000-000000000001';
const SNACK = 'b0000000-0000-0000-0000-000000000002';
const admin = { sub: 'c0000000-0000-0000-0000-00000000000a', rol: 'administrador' };

// Repositorio falso en memoria. Simula la transaccion: si el trabajo falla,
// restaura el stock y descarta los movimientos (como un ROLLBACK).
function buildDependencies(initial = { [SHAMPOO]: { stockActual: 5, stockMinimo: 3 } }) {
  const state = {
    stock: structuredClone(initial),
    movements: [],
    locks: [],
    transactions: 0
  };

  const inventoryRepository = {
    runInTransaction: async (work) => {
      state.transactions += 1;
      const snapshot = { stock: structuredClone(state.stock), movements: [...state.movements] };
      const db = { id: `tx-${state.transactions}` };

      try {
        return await work(db);
      } catch (error) {
        state.stock = snapshot.stock;
        state.movements = snapshot.movements;
        throw error;
      }
    },
    lockInventoryForProduct: async (db, productId) => {
      assert.ok(db, 'el bloqueo debe hacerse dentro de una transaccion');
      state.locks.push(productId);
      const item = state.stock[productId];
      return item ? { nombre: `Producto ${productId.slice(-1)}`, referencia: 'SP-X', ...item } : null;
    },
    updateStock: async (db, productId, stockActual) => {
      state.stock[productId].stockActual = stockActual;
    },
    insertMovement: async (db, movement) => {
      const saved = { id: `m-${state.movements.length + 1}`, ...movement };
      state.movements.push(saved);
      return saved;
    },
    listInventory: async () =>
      Object.entries(state.stock).map(([productoId, item]) => ({ productoId, nombre: productoId, referencia: 'SP-X', ...item })),
    countMovementsToday: async () => state.movements.length,
    updateMinimumStock: async (productId, stockMinimo) => {
      if (!state.stock[productId]) return null;
      state.stock[productId].stockMinimo = stockMinimo;
      return { productoId: productId, ...state.stock[productId] };
    }
  };

  return { state, dependencies: { inventoryRepository, rules } };
}

test('registra una entrada en una transaccion y deja la bitacora completa', async () => {
  const { state, dependencies } = buildDependencies();

  const result = await registerInventoryMovement(dependencies, admin, {
    productoId: SHAMPOO,
    tipo: 'entrada',
    cantidad: 10,
    motivo: 'Compra a proveedor',
    observacion: 'Factura 4521'
  });

  assert.equal(state.transactions, 1);
  assert.deepEqual(state.locks, [SHAMPOO]);
  assert.equal(state.stock[SHAMPOO].stockActual, 15);
  assert.deepEqual(state.movements[0], {
    id: 'm-1',
    productoId: SHAMPOO,
    ordenId: null,
    usuarioId: admin.sub,
    tipo: 'entrada',
    cantidad: 10,
    stockAnterior: 5,
    stockResultante: 15,
    motivo: 'Compra a proveedor',
    observacion: 'Factura 4521'
  });
  assert.equal(result.inventario.nivel, 'normal');
});

test('una salida que deja el stock bajo el minimo se senala como stock bajo', async () => {
  const { state, dependencies } = buildDependencies();

  const result = await registerInventoryMovement(dependencies, admin, {
    productoId: SHAMPOO,
    tipo: 'salida',
    cantidad: 3,
    motivo: 'Producto danado'
  });

  assert.equal(state.stock[SHAMPOO].stockActual, 2);
  assert.equal(state.movements[0].cantidad, -3);
  assert.equal(result.inventario.nivel, 'bajo');
});

test('una salida mayor al stock se rechaza sin tocar el inventario', async () => {
  const { state, dependencies } = buildDependencies();

  await assert.rejects(
    registerInventoryMovement(dependencies, admin, { productoId: SHAMPOO, tipo: 'salida', cantidad: 6, motivo: 'Uso interno' }),
    (error) => error instanceof InventoryError && error.status === 409
  );
  assert.equal(state.stock[SHAMPOO].stockActual, 5);
  assert.equal(state.movements.length, 0);
});

test('el ajuste registra la diferencia contra el conteo fisico', async () => {
  const { state, dependencies } = buildDependencies();

  await registerInventoryMovement(dependencies, admin, { productoId: SHAMPOO, tipo: 'ajuste', cantidad: 0, motivo: 'Conteo fisico' });

  assert.equal(state.stock[SHAMPOO].stockActual, 0);
  assert.equal(state.movements[0].cantidad, -5);
  assert.equal(state.movements[0].stockResultante, 0);
});

test('responde 404 si el producto no existe', async () => {
  const { dependencies } = buildDependencies();

  await assert.rejects(
    registerInventoryMovement(dependencies, admin, {
      productoId: 'b0000000-0000-0000-0000-00000000ffff',
      tipo: 'entrada',
      cantidad: 1,
      motivo: 'Compra'
    }),
    (error) => error instanceof InventoryError && error.status === 404
  );
});

test('el pedido descuenta cada producto como "Venta" del Sistema', async () => {
  const { state, dependencies } = buildDependencies({
    [SHAMPOO]: { stockActual: 5, stockMinimo: 3 },
    [SNACK]: { stockActual: 10, stockMinimo: 2 }
  });
  const ordenId = 'd0000000-0000-0000-0000-000000000001';

  await dependencies.inventoryRepository.runInTransaction((db) =>
    discountStockForOrder(dependencies, db, {
      ordenId,
      items: [
        { productoId: SNACK, cantidad: 2 },
        { productoId: SHAMPOO, cantidad: 1 }
      ]
    })
  );

  assert.equal(state.stock[SHAMPOO].stockActual, 4);
  assert.equal(state.stock[SNACK].stockActual, 8);
  assert.deepEqual(state.locks, [SHAMPOO, SNACK], 'bloquea en orden estable');
  for (const movement of state.movements) {
    assert.equal(movement.tipo, 'salida');
    assert.equal(movement.motivo, 'Venta');
    assert.equal(movement.ordenId, ordenId);
    assert.equal(movement.usuarioId, null);
  }
});

test('si un producto del pedido no alcanza, no se descuenta ninguno', async () => {
  const { state, dependencies } = buildDependencies({
    [SHAMPOO]: { stockActual: 5, stockMinimo: 3 },
    [SNACK]: { stockActual: 1, stockMinimo: 2 }
  });

  await assert.rejects(
    dependencies.inventoryRepository.runInTransaction((db) =>
      discountStockForOrder(dependencies, db, {
        ordenId: 'd0000000-0000-0000-0000-000000000002',
        items: [
          { productoId: SHAMPOO, cantidad: 1 },
          { productoId: SNACK, cantidad: 2 }
        ]
      })
    ),
    (error) => error instanceof InventoryError && error.code === 'INSUFFICIENT_STOCK'
  );

  assert.equal(state.stock[SHAMPOO].stockActual, 5);
  assert.equal(state.stock[SNACK].stockActual, 1);
  assert.equal(state.movements.length, 0);
});

test('el descuento de un pedido exige una transaccion abierta', async () => {
  const { dependencies } = buildDependencies();

  await assert.rejects(
    discountStockForOrder(dependencies, null, { ordenId: null, items: [{ productoId: SHAMPOO, cantidad: 1 }] }),
    (error) => error instanceof InventoryError && error.code === 'TRANSACTION_REQUIRED'
  );
});

test('el resumen de inventario incluye alertas y motivos sugeridos', async () => {
  const { dependencies } = buildDependencies({
    [SHAMPOO]: { stockActual: 2, stockMinimo: 3 },
    [SNACK]: { stockActual: 0, stockMinimo: 2 }
  });

  const result = await getInventoryOverview(dependencies, admin, {});

  assert.equal(result.resumen.productosStockBajo, 1);
  assert.equal(result.resumen.productosAgotados, 1);
  assert.match(result.alerta, /1 producto esta por debajo del stock minimo y 1 esta agotado/);
  assert.ok(result.motivosSugeridos.entrada.includes('Compra a proveedor'));
});

test('cambiar el stock minimo recalcula el nivel sin generar movimientos', async () => {
  const { state, dependencies } = buildDependencies();

  const result = await updateMinimumStock(dependencies, admin, SHAMPOO, { stockMinimo: 8 });

  assert.equal(result.inventario.stockMinimo, 8);
  assert.equal(result.inventario.nivel, 'bajo');
  assert.equal(state.movements.length, 0);

  await assert.rejects(
    updateMinimumStock(dependencies, admin, SHAMPOO, { stockMinimo: -1 }),
    (error) => error instanceof InventoryError && error.status === 400
  );
});
