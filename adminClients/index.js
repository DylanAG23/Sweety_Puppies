const { listAdminClients } = require('./application/useCases/listAdminClients');
const { getAdminClientDetail } = require('./application/useCases/getAdminClientDetail');
const { createAdminClientsController } = require('./infrastructure/http/adminClientsController');
const { PostgresAdminClientsRepository } = require('./infrastructure/repositories/PostgresAdminClientsRepository');
const search = require('./domain/services/clientSearch');

function createAdminClientsModule() {
  const dependencies = {
    clientsRepository: new PostgresAdminClientsRepository(),
    search
  };

  const useCases = {
    listAdminClients: (sessionUser, query) => listAdminClients(dependencies, sessionUser, query),
    getAdminClientDetail: (sessionUser, identifier) => getAdminClientDetail(dependencies, sessionUser, identifier)
  };

  return {
    useCases,
    controller: createAdminClientsController(useCases)
  };
}

module.exports = { createAdminClientsModule };
