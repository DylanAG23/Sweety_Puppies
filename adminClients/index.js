const { listAdminClients } = require('./application/useCases/listAdminClients');
const { getAdminClientDetail } = require('./application/useCases/getAdminClientDetail');
const { updateAdminClient } = require('./application/useCases/updateAdminClient');
const { createAdminClientsController } = require('./infrastructure/http/adminClientsController');
const { PostgresAdminClientsRepository } = require('./infrastructure/repositories/PostgresAdminClientsRepository');
const search = require('./domain/services/clientSearch');
const profile = require('./domain/services/clientProfile');

function createAdminClientsModule() {
  const dependencies = {
    clientsRepository: new PostgresAdminClientsRepository(),
    search,
    profile
  };

  const useCases = {
    listAdminClients: (sessionUser, query) => listAdminClients(dependencies, sessionUser, query),
    getAdminClientDetail: (sessionUser, identifier) => getAdminClientDetail(dependencies, sessionUser, identifier)
  };

  dependencies.getAdminClientDetail = useCases.getAdminClientDetail;
  useCases.updateAdminClient = (sessionUser, identifier, payload) =>
    updateAdminClient(dependencies, sessionUser, identifier, payload);

  return {
    useCases,
    controller: createAdminClientsController(useCases)
  };
}

module.exports = { createAdminClientsModule };
