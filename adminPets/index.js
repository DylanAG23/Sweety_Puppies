const { listAdminPets } = require('./application/useCases/listAdminPets');
const { getAdminPetDetail } = require('./application/useCases/getAdminPetDetail');
const { getAdminPetHistory } = require('./application/useCases/getAdminPetHistory');
const { updateAdminPet } = require('./application/useCases/updateAdminPet');
const { listAdminPetBreeds } = require('./application/useCases/listAdminPetBreeds');
const { deleteAdminPet } = require('./application/useCases/deleteAdminPet');
const { createAdminPetsController } = require('./infrastructure/http/adminPetsController');
const { PostgresAdminPetsRepository } = require('./infrastructure/repositories/PostgresAdminPetsRepository');
const { SupabaseAdminPetAssetStorageService } = require('./infrastructure/services/SupabaseAdminPetAssetStorageService');
const search = require('./domain/services/petSearch');
const profile = require('./domain/services/petProfile');
const breedCatalog = require('../shared/pets/dogBreedCatalog');

function createAdminPetsModule() {
  const dependencies = {
    petsRepository: new PostgresAdminPetsRepository(),
    assetStorageService: new SupabaseAdminPetAssetStorageService(),
    search,
    profile,
    breedCatalog
  };

  const useCases = {
    listAdminPets: (sessionUser, query) => listAdminPets(dependencies, sessionUser, query),
    listAdminPetBreeds: () => listAdminPetBreeds(dependencies),
    getAdminPetDetail: (sessionUser, identifier) => getAdminPetDetail(dependencies, sessionUser, identifier),
    getAdminPetHistory: (sessionUser, identifier) => getAdminPetHistory(dependencies, sessionUser, identifier),
    deleteAdminPet: (sessionUser, identifier) => deleteAdminPet(dependencies, sessionUser, identifier)
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
