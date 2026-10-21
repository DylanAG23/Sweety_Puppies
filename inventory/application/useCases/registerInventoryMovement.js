const { applyStockMovement, resolveSessionUserId } = require('../services/applyStockMovement');

// Entrada (suma), salida (resta) o ajuste (corrige al valor contado), registrado
// por la administradora. Todo en una transaccion con la fila de inventario bloqueada.
async function registerInventoryMovement(dependencies, sessionUser, payload) {
  const usuarioId = resolveSessionUserId(sessionUser);
  const movement = dependencies.rules.normalizeMovementPayload(payload);

  const result = await dependencies.inventoryRepository.runInTransaction((db) =>
    applyStockMovement(dependencies, db, { ...movement, usuarioId })
  );

  return {
    message: 'Movimiento registrado correctamente',
    ...result
  };
}

module.exports = { registerInventoryMovement };
