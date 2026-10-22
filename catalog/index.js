const { operations } = require('./application/useCases/catalogOperations');
const {
  PostgresCatalogRepository
} = require('./infrastructure/repositories/PostgresCatalogRepository');
function createCatalogModule() {
  const dependencies = {
    repository: new PostgresCatalogRepository(),
    storage: require('../services/supabaseStorage')
  };
  const useCases = operations(dependencies);
  return { dependencies, useCases, controller: useCases };
}
module.exports = { createCatalogModule };
