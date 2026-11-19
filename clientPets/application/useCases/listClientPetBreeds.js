async function listClientPetBreeds(dependencies) {
  return {
    razas: dependencies.breedCatalog.listDogBreedCatalog()
  };
}

module.exports = { listClientPetBreeds };
