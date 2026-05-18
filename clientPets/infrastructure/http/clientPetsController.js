const { PetError } = require('../../domain/errors/PetError');

function firstFile(files, fieldName) {
  const fileList = files?.[fieldName];
  return Array.isArray(fileList) && fileList.length ? fileList[0] : null;
}

function handleHttpError(error, res) {
  if (error instanceof PetError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  if (error?.code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Uno de los valores seleccionados no es compatible con la configuracion actual de mascotas'
    });
  }

  console.error('Error en modulo clienteMascotas:', error);

  return res.status(500).json({
    success: false,
    message: 'Ocurrio un error inesperado al procesar mascotas'
  });
}

function createClientPetsController(useCases) {
  return {
    listPets: async (req, res) => {
      try {
        const result = await useCases.listClientPets(req.user);
        res.json({
          success: true,
          mascotas: result.mascotas
        });
      } catch (error) {
        handleHttpError(error, res);
      }
    },

    listPetBreeds: async (_req, res) => {
      try {
        const result = await useCases.listClientPetBreeds();
        res.json({
          success: true,
          razas: result.razas
        });
      } catch (error) {
        handleHttpError(error, res);
      }
    },

    getPet: async (req, res) => {
      try {
        const result = await useCases.getClientPet(req.user, req.params.id);
        res.json({
          success: true,
          mascota: result.mascota
        });
      } catch (error) {
        handleHttpError(error, res);
      }
    },

    createPet: async (req, res) => {
      try {
        const result = await useCases.createClientPet(req.user, req.body, {
          fotoMascota: firstFile(req.files, 'fotoMascota'),
          fotoCarnet: firstFile(req.files, 'fotoCarnet')
        });

        res.status(201).json({
          success: true,
          message: result.message,
          mascota: result.mascota,
          warnings: result.warnings
        });
      } catch (error) {
        handleHttpError(error, res);
      }
    },

    updatePet: async (req, res) => {
      try {
        const result = await useCases.updateClientPet(req.user, req.params.id, req.body, {
          fotoMascota: firstFile(req.files, 'fotoMascota'),
          fotoCarnet: firstFile(req.files, 'fotoCarnet')
        });

        res.json({
          success: true,
          message: result.message,
          mascota: result.mascota,
          warnings: result.warnings
        });
      } catch (error) {
        handleHttpError(error, res);
      }
    },

    deletePet: async (req, res) => {
      try {
        const result = await useCases.deleteClientPet(req.user, req.params.id);
        res.json({
          success: true,
          message: result.message
        });
      } catch (error) {
        handleHttpError(error, res);
      }
    },

    updatePetStatus: async (req, res) => {
      try {
        const result = await useCases.updateClientPetStatus(req.user, req.params.id, req.body?.activo);
        res.json({
          success: true,
          message: result.message,
          mascota: result.mascota
        });
      } catch (error) {
        handleHttpError(error, res);
      }
    }
  };
}

module.exports = { createClientPetsController };
