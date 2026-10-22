const { PortalContentError } = require('./domain/errors/PortalContentError');
const catalog = require('./domain/services/contentCatalog');
const { listAdminContent } = require('./application/useCases/listAdminContent');
const { getAdminContentDetail } = require('./application/useCases/getAdminContentDetail');
const { createAdminContent } = require('./application/useCases/createAdminContent');
const { updateAdminContent } = require('./application/useCases/updateAdminContent');
const { changeAdminContentStatus } = require('./application/useCases/changeAdminContentStatus');
const { reorderAdminContent } = require('./application/useCases/reorderAdminContent');
const { listActivePortalContent } = require('./application/useCases/listActivePortalContent');
const { createPortalContentController } = require('./infrastructure/http/portalContentController');
const { PostgresPortalContentRepository } = require('./infrastructure/repositories/PostgresPortalContentRepository');
const { SupabasePortalContentStorageService } = require('./infrastructure/services/SupabasePortalContentStorageService');

function createPortalContentModule() {
  const dependencies = {
    contentRepository: new PostgresPortalContentRepository(),
    storageService: new SupabasePortalContentStorageService(),
    catalog,
    errors: {
      PortalContentError
    }
  };

  const useCases = {
    listAdminContent: (sessionUser, query) => listAdminContent(dependencies, sessionUser, query),
    getAdminContentDetail: (sessionUser, identifier) => getAdminContentDetail(dependencies, sessionUser, identifier),
    createAdminContent: (sessionUser, payload, imageFile) => createAdminContent(dependencies, sessionUser, payload, imageFile),
    updateAdminContent: (sessionUser, identifier, payload, imageFile) =>
      updateAdminContent(dependencies, sessionUser, identifier, payload, imageFile),
    changeAdminContentStatus: (sessionUser, identifier, payload) =>
      changeAdminContentStatus(dependencies, sessionUser, identifier, payload),
    reorderAdminContent: (sessionUser, payload) => reorderAdminContent(dependencies, sessionUser, payload),
    listActivePortalContent: () => listActivePortalContent(dependencies)
  };

  return {
    useCases,
    controller: createPortalContentController(useCases)
  };
}

module.exports = { createPortalContentModule };
