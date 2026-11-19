const { InventoryError } = require('../../domain/errors/InventoryError');
const { applyStockMovement } = require('../services/applyStockMovement');

// Puerto para el modulo orders (ACT-32): salida automatica por cada producto de
// un pedido, con motivo "Venta", origen el pedido y usuario "Sistema".
// Se ejecuta dentro de la transaccion del pedido (db), asi el pago y el
// descuento se confirman o se revierten juntos. Si falta stock lanza
// INSUFFICIENT_STOCK y el pedido completo se revierte.
async function discountStockForOrder(dependencies, db, { ordenId, items }) {
  if (!db) {
    throw new InventoryError('El descuento de stock debe ejecutarse dentro de una transaccion', 500, 'TRANSACTION_REQUIRED');
  }

  const lineas = dependencies.rules.groupOrderItems(items);
  const resultados = [];

  for (const linea of lineas) {
    resultados.push(
      await applyStockMovement(dependencies, db, {
        productoId: linea.productoId,
        tipo: 'salida',
        cantidad: linea.cantidad,
        motivo: dependencies.rules.ORDER_SALE_REASON,
        ordenId,
        usuarioId: null
      })
    );
  }

  return resultados;
}

module.exports = { discountStockForOrder };
