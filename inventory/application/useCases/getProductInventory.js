const { InventoryError } = require('../../domain/errors/InventoryError');

// Stock de un producto (formulario "Registrar movimiento" y edicion de producto).
async function getProductInventory(dependencies, sessionUser, productId) {
  const { inventoryRepository, rules } = dependencies;
  const productoId = rules.normalizeProductId(productId);
  const item = await inventoryRepository.findProductInventory(productoId);

  if (!item) {
    throw new InventoryError('No encontramos el producto solicitado', 404, 'PRODUCT_NOT_FOUND');
  }

  return {
    inventario: {
      ...item,
      nivel: rules.computeStockLevel(item.stockActual, item.stockMinimo)
    }
  };
}

module.exports = { getProductInventory };
