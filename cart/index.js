const { operations } = require('./application/useCases/cartOperations');
const {
  PostgresCartRepository
} = require('./infrastructure/repositories/PostgresCartRepository');
function createCartModule() {
  const dependencies = { repository: new PostgresCartRepository() };
  const useCases = operations(dependencies);
  return { dependencies, useCases, controller: useCases };
}
module.exports = { createCartModule };
