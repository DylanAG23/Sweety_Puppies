const { operations } = require('./application/useCases/orderOperations');
const {
  PostgresOrdersRepository
} = require('./infrastructure/repositories/PostgresOrdersRepository');
const {
  PostgresCartRepository
} = require('../cart/infrastructure/repositories/PostgresCartRepository');
function createOrdersModule() {
  const dependencies = {
    repository: new PostgresOrdersRepository(),
    cart: new PostgresCartRepository(),
    inventory: require('../inventory').createInventoryModule().ports,
    now: () => new Date(),
    newId: () => require('crypto').randomUUID()
  };
  const useCases = operations(dependencies);
  return { dependencies, useCases, controller: useCases };
}
module.exports = { createOrdersModule };
