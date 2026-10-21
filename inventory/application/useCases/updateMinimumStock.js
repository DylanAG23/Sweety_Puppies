const { InventoryError } = require('../../domain/errors/InventoryError');

// El stock minimo es un parametro de alerta: cambiarlo no mueve unidades,
// por eso no genera movimiento de inventario.
async function updateMinimumStock(dependencies, sessionUser, productId, payload) {
  const { inventoryRepository, rules } = dependencies;
  const productoId = rules.normalizeProductId(productId);
  const stockMinimo = rules.normalizeMinimumStock(payload);
  const item = await inventoryRepository.updateMinimumStock(productoId, stockMinimo);

  if (!item) {
    throw new InventoryError('No encontramos el producto solicitado', 404, 'PRODUCT_NOT_FOUND');
  }

  return {
    message: 'Stock minimo actualizado',
    inventario: {
      ...item,
      nivel: rules.computeStockLevel(item.stockActual, item.stockMinimo)
    }
  };
}

module.exports = { updateMinimumStock };
