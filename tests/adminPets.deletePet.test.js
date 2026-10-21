require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deleteAdminPet } = require('../adminPets/application/useCases/deleteAdminPet');
const { AdminPetError } = require('../adminPets/domain/errors/AdminPetError');

const PET = {
  id: 'a0000000-0000-0000-0000-000000000001',
  nombre: 'Prueba',
  foto_mascota_url: 'https://example.com/foto.jpg',
  foto_carnet_vacunacion_url: null
};

function buildDependencies({ pet = PET, references = { citas: 0, historial: 0 } } = {}) {
  const calls = { deleted: [], removedFiles: [] };

  return {
    calls,
    dependencies: {
      petsRepository: {
        resolveAdminContext: async () => ({ id: 'adm-1' }),
        findPetOverview: async (id) => (pet && id === pet.id ? pet : null),
        countPetReferences: async () => references,
        deletePet: async (id) => {
          calls.deleted.push(id);
          return true;
        }
      },
      assetStorageService: {
        safeDeleteByPublicUrl: async (url) => {
          if (url) calls.removedFiles.push(url);
        }
      }
    }
  };
}

const admin = { sub: 'u-admin', rol: 'administrador' };

test('elimina una mascota sin citas ni historial y borra sus fotos', async () => {
  const { dependencies, calls } = buildDependencies();
  const result = await deleteAdminPet(dependencies, admin, PET.id);

  assert.deepEqual(calls.deleted, [PET.id]);
  assert.deepEqual(calls.removedFiles, ['https://example.com/foto.jpg']);
  assert.match(result.message, /Prueba se elimino/);
});

test('no elimina una mascota con citas y sugiere desactivarla', async () => {
  const { dependencies, calls } = buildDependencies({ references: { citas: 2, historial: 1 } });

  await assert.rejects(
    deleteAdminPet(dependencies, admin, PET.id),
    (error) => error instanceof AdminPetError && error.status === 409 && /desactivarla/.test(error.message)
  );
  assert.equal(calls.deleted.length, 0);
});

test('responde 404 si la mascota no existe', async () => {
  const { dependencies, calls } = buildDependencies();

  await assert.rejects(
    deleteAdminPet(dependencies, admin, 'a0000000-0000-0000-0000-00000000ffff'),
    (error) => error instanceof AdminPetError && error.status === 404
  );
  assert.equal(calls.deleted.length, 0);
});
