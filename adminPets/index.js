const { listAdminPets } = require('./application/useCases/listAdminPets');
const { getAdminPetDetail } = require('./application/useCases/getAdminPetDetail');
const { getAdminPetHistory } = require('./application/useCases/getAdminPetHistory');
const { updateAdminPet } = require('./application/useCases/updateAdminPet');
const { createAdminPetsController } = require('./infrastructure/http/adminPetsController');
const { PostgresAdminPetsRepository } = require('./infrastructure/repositories/PostgresAdminPetsRepository');
const search = require('./domain/services/petSearch');
const profile = require('./domain/services/petProfile');

function createAdminPetsModule() {
  const dependencies = {
    petsRepository: new PostgresAdminPetsRepository(),
    search,
    profile
  };

  const useCases = {
    listAdminPets: (sessionUser, query) => listAdminPets(dependencies, sessionUser, query),
    getAdminPetDetail: (sessionUser, identifier) => getAdminPetDetail(dependencies, sessionUser, identifier),
    getAdminPetHistory: (sessionUser, identifier) => getAdminPetHistory(dependencies, sessionUser, identifier)
  };

  dependencies.getAdminPetDetail = useCases.getAdminPetDetail;
  useCases.updateAdminPet = (sessionUser, identifier, payload) =>
    updateAdminPet(dependencies, sessionUser, identifier, payload);

  return {
    useCases,
    controller: createAdminPetsController(useCases)
  };
}

module.exports = { createAdminPetsModule };
