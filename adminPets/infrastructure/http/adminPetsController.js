const { AdminPetError } = require('../../domain/errors/AdminPetError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof AdminPetError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  console.error(defaultMessage, error);
  return res.status(500).json({
    success: false,
    message: error.message || defaultMessage
  });
}

function createAdminPetsController(useCases) {
  return {
    listPets: async (req, res) => {
      try {
        const result = await useCases.listAdminPets(req.user, req.query);
        res.json({
          success: true,
          mascotas: result.mascotas,
          search: result.search
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar las mascotas');
      }
    },

    listPetBreeds: async (_req, res) => {
      try {
        const result = await useCases.listAdminPetBreeds();
        res.json({
          success: true,
          razas: result.razas
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el catalogo de razas');
      }
    },

    getPetDetail: async (req, res) => {
      try {
        const result = await useCases.getAdminPetDetail(req.user, req.params.id);
        res.json({
          success: true,
          mascota: result.mascota
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el detalle de la mascota');
      }
    },

    getPetHistory: async (req, res) => {
      try {
        const result = await useCases.getAdminPetHistory(req.user, req.params.id);
        res.json({
          success: true,
          mascotaId: result.mascotaId,
          historial: result.historial
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el historial de la mascota');
      }
    },

    updatePet: async (req, res) => {
      try {
        const result = await useCases.updateAdminPet(req.user, req.params.id, req.body);
        res.json({
          success: true,
          message: 'Mascota actualizada correctamente',
          mascota: result.mascota
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al actualizar la mascota');
      }
    }
  };
}

module.exports = { createAdminPetsController };
