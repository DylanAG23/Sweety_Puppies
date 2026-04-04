const { listClientPets } = require('./application/useCases/listClientPets');
const { getClientPet } = require('./application/useCases/getClientPet');
const { createClientPet } = require('./application/useCases/createClientPet');
const { updateClientPet } = require('./application/useCases/updateClientPet');
const { deleteClientPet } = require('./application/useCases/deleteClientPet');
const { updateClientPetStatus } = require('./application/useCases/updateClientPetStatus');
const { createClientPetsController } = require('./infrastructure/http/clientPetsController');
const { PostgresClientPetsRepository } = require('./infrastructure/repositories/PostgresClientPetsRepository');
const { SupabasePetAssetStorageService } = require('./infrastructure/services/SupabasePetAssetStorageService');
const validation = require('./domain/services/petValidation');

function createClientPetsModule() {
  const dependencies = {
    petRepository: new PostgresClientPetsRepository(),
    assetStorageService: new SupabasePetAssetStorageService(),
    validation
  };

  const useCases = {
    listClientPets: (sessionUser) => listClientPets(dependencies, sessionUser),
    getClientPet: (sessionUser, petId) => getClientPet(dependencies, sessionUser, petId),
    createClientPet: (sessionUser, payload, files) => createClientPet(dependencies, sessionUser, payload, files),
    updateClientPet: (sessionUser, petId, payload, files) => updateClientPet(dependencies, sessionUser, petId, payload, files),
    deleteClientPet: (sessionUser, petId) => deleteClientPet(dependencies, sessionUser, petId),
    updateClientPetStatus: (sessionUser, petId, activo) => updateClientPetStatus(dependencies, sessionUser, petId, activo)
  };

  return {
    useCases,
    controller: createClientPetsController(useCases)
  };
}

module.exports = { createClientPetsModule };
