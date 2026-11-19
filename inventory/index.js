const { getInventoryOverview } = require('./application/useCases/getInventoryOverview');
const { getProductInventory } = require('./application/useCases/getProductInventory');
const { updateMinimumStock } = require('./application/useCases/updateMinimumStock');
const { registerInventoryMovement } = require('./application/useCases/registerInventoryMovement');
const { listInventoryMovements } = require('./application/useCases/listInventoryMovements');
const { exportInventoryMovements } = require('./application/useCases/exportInventoryMovements');
const { discountStockForOrder } = require('./application/useCases/discountStockForOrder');
const { createInventoryController } = require('./infrastructure/http/inventoryController');
const { PostgresInventoryRepository } = require('./infrastructure/repositories/PostgresInventoryRepository');
const rules = require('./domain/services/inventoryRules');

function createInventoryModule() {
  const dependencies = {
    inventoryRepository: new PostgresInventoryRepository(),
    rules
  };

  const useCases = {
    getInventoryOverview: (sessionUser, query) => getInventoryOverview(dependencies, sessionUser, query),
    getProductInventory: (sessionUser, productId) => getProductInventory(dependencies, sessionUser, productId),
    updateMinimumStock: (sessionUser, productId, payload) =>
      updateMinimumStock(dependencies, sessionUser, productId, payload),
    registerInventoryMovement: (sessionUser, payload) => registerInventoryMovement(dependencies, sessionUser, payload),
    listInventoryMovements: (sessionUser, query) => listInventoryMovements(dependencies, sessionUser, query),
    exportInventoryMovements: (sessionUser, query) => exportInventoryMovements(dependencies, sessionUser, query)
  };

  // Puertos para otros modulos (orders, ACT-32). Reciben la transaccion abierta.
  const ports = {
    discountStockForOrder: (db, order) => discountStockForOrder(dependencies, db, order)
  };

  return {
    dependencies,
    useCases,
    ports,
    controller: createInventoryController(useCases)
  };
}

module.exports = { createInventoryModule };
