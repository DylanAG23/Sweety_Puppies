const { listAdminServices } = require('./application/useCases/listAdminServices');
const { getAdminServiceDetail } = require('./application/useCases/getAdminServiceDetail');
const { createAdminService } = require('./application/useCases/createAdminService');
const { updateAdminService } = require('./application/useCases/updateAdminService');
const { changeAdminServiceStatus } = require('./application/useCases/changeAdminServiceStatus');
const { createAdminServicesController } = require('./infrastructure/http/adminServicesController');
const { PostgresAdminServicesRepository } = require('./infrastructure/repositories/PostgresAdminServicesRepository');
const catalog = require('./domain/services/serviceCatalog');

function createAdminServicesModule() {
  const dependencies = {
    servicesRepository: new PostgresAdminServicesRepository(),
    catalog
  };

  const useCases = {
    listAdminServices: (sessionUser, query, category) => listAdminServices(dependencies, sessionUser, query, category),
    getAdminServiceDetail: (sessionUser, identifier, category) =>
      getAdminServiceDetail(dependencies, sessionUser, identifier, category),
    createAdminService: (sessionUser, payload, category) => createAdminService(dependencies, sessionUser, payload, category),
    updateAdminService: (sessionUser, identifier, payload, category) =>
      updateAdminService(dependencies, sessionUser, identifier, payload, category),
    changeAdminServiceStatus: (sessionUser, identifier, payload, category) =>
      changeAdminServiceStatus(dependencies, sessionUser, identifier, payload, category)
  };

  return {
    useCases,
    controller: createAdminServicesController(useCases)
  };
}

module.exports = { createAdminServicesModule };
