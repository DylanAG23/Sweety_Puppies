async function listAdminPetBreeds(dependencies) {
  return {
    razas: dependencies.breedCatalog.listDogBreedCatalog()
  };
}

module.exports = { listAdminPetBreeds };
