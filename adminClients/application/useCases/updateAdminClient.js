const { AdminClientError } = require('../../domain/errors/AdminClientError');

async function updateAdminClient(dependencies, sessionUser, identifier, payload) {
  await dependencies.clientsRepository.resolveAdminContext(sessionUser);
  const currentClient = await dependencies.clientsRepository.findClientOverview(identifier);

  if (!currentClient) {
    throw new AdminClientError('No encontramos el cliente solicitado', 404, 'CLIENT_NOT_FOUND');
  }

  const normalizedPayload = dependencies.profile.validateAdminClientPayload(
    dependencies.profile.normalizeAdminClientPayload(payload)
  );

  await dependencies.clientsRepository.ensureEmailAvailable(normalizedPayload.email, currentClient.usuario_id);
  await dependencies.clientsRepository.updateClientProfile(currentClient.id, normalizedPayload);

  return dependencies.getAdminClientDetail(sessionUser, currentClient.id);
}

module.exports = { updateAdminClient };
