const { InventoryError } = require('../../domain/errors/InventoryError');

// Aplica un movimiento dentro de una transaccion ya abierta (db):
// bloquea la fila de inventario (SELECT ... FOR UPDATE), calcula el resultado,
// actualiza el stock y deja el registro inmutable en movimientos_inventario.
async function applyStockMovement(dependencies, db, movement) {
  const { inventoryRepository, rules } = dependencies;
  const inventario = await inventoryRepository.lockInventoryForProduct(db, movement.productoId);

  if (!inventario) {
    throw new InventoryError('No encontramos el producto solicitado', 404, 'PRODUCT_NOT_FOUND');
  }

  const calculo = rules.computeMovement({
    tipo: movement.tipo,
    cantidad: movement.cantidad,
    stockAnterior: inventario.stockActual
  });

  await inventoryRepository.updateStock(db, movement.productoId, calculo.stockResultante);

  const registro = await inventoryRepository.insertMovement(db, {
    productoId: movement.productoId,
    ordenId: movement.ordenId || null,
    usuarioId: movement.usuarioId || null,
    tipo: movement.tipo,
    cantidad: calculo.cantidad,
    stockAnterior: calculo.stockAnterior,
    stockResultante: calculo.stockResultante,
    motivo: movement.motivo,
    observacion: movement.observacion || null
  });

  return {
    movimiento: registro,
    inventario: {
      productoId: movement.productoId,
      nombre: inventario.nombre,
      referencia: inventario.referencia,
      stockActual: calculo.stockResultante,
      stockMinimo: inventario.stockMinimo,
      nivel: rules.computeStockLevel(calculo.stockResultante, inventario.stockMinimo)
    }
  };
}

function resolveSessionUserId(sessionUser) {
  const userId = sessionUser?.sub || sessionUser?.id || sessionUser?.userId;

  if (!userId) {
    throw new InventoryError('No se encontro una sesion valida', 401, 'AUTH_REQUIRED');
  }

  return userId;
}

module.exports = { applyStockMovement, resolveSessionUserId };
