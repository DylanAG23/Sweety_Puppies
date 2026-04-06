const { AdminServiceError } = require('../../domain/errors/AdminServiceError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof AdminServiceError) {
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

function createAdminServicesController(useCases) {
  return {
    listPrimaryServices: async (req, res) => {
      try {
        const result = await useCases.listAdminServices(req.user, req.query, 'principales');
        res.json({
          success: true,
          servicios: result.servicios,
          search: result.search,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar los servicios');
      }
    },

    listAdditionalServices: async (req, res) => {
      try {
        const result = await useCases.listAdminServices(req.user, req.query, 'adicionales');
        res.json({
          success: true,
          servicios: result.servicios,
          search: result.search,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar los servicios adicionales');
      }
    },

    getPrimaryServiceDetail: async (req, res) => {
      try {
        const result = await useCases.getAdminServiceDetail(req.user, req.params.id, 'principales');
        res.json({
          success: true,
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el detalle del servicio');
      }
    },

    getAdditionalServiceDetail: async (req, res) => {
      try {
        const result = await useCases.getAdminServiceDetail(req.user, req.params.id, 'adicionales');
        res.json({
          success: true,
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el detalle del servicio adicional');
      }
    },

    createPrimaryService: async (req, res) => {
      try {
        const result = await useCases.createAdminService(req.user, req.body, 'principales');
        res.status(201).json({
          success: true,
          message: 'Servicio creado correctamente',
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al crear el servicio');
      }
    },

    createAdditionalService: async (req, res) => {
      try {
        const result = await useCases.createAdminService(req.user, req.body, 'adicionales');
        res.status(201).json({
          success: true,
          message: 'Servicio adicional creado correctamente',
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al crear el servicio adicional');
      }
    },

    updatePrimaryService: async (req, res) => {
      try {
        const result = await useCases.updateAdminService(req.user, req.params.id, req.body, 'principales');
        res.json({
          success: true,
          message: 'Servicio actualizado correctamente',
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al actualizar el servicio');
      }
    },

    updateAdditionalService: async (req, res) => {
      try {
        const result = await useCases.updateAdminService(req.user, req.params.id, req.body, 'adicionales');
        res.json({
          success: true,
          message: 'Servicio adicional actualizado correctamente',
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al actualizar el servicio adicional');
      }
    },

    changePrimaryServiceStatus: async (req, res) => {
      try {
        const result = await useCases.changeAdminServiceStatus(req.user, req.params.id, req.body, 'principales');
        res.json({
          success: true,
          message: result.servicio.activo ? 'Servicio activado correctamente' : 'Servicio desactivado correctamente',
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cambiar el estado del servicio');
      }
    },

    changeAdditionalServiceStatus: async (req, res) => {
      try {
        const result = await useCases.changeAdminServiceStatus(req.user, req.params.id, req.body, 'adicionales');
        res.json({
          success: true,
          message: result.servicio.activo
            ? 'Servicio adicional activado correctamente'
            : 'Servicio adicional desactivado correctamente',
          servicio: result.servicio,
          categoria: result.categoria
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cambiar el estado del servicio adicional');
      }
    }
  };
}

module.exports = { createAdminServicesController };
