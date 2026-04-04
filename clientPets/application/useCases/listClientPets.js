async function listClientPets(dependencies, sessionUser) {
  const context = await dependencies.petRepository.resolveClientContext(sessionUser);
  const mascotas = await dependencies.petRepository.listByClientIds(context.clientIds);

  return { mascotas };
}

module.exports = { listClientPets };
