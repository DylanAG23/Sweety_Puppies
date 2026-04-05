const { AdminClientError } = require('../../domain/errors/AdminClientError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof AdminClientError) {
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

function createAdminClientsController(useCases) {
  return {
    listClients: async (req, res) => {
      try {
        const result = await useCases.listAdminClients(req.user, req.query);
        res.json({
          success: true,
          clientes: result.clientes,
          search: result.search
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar los clientes');
      }
    },

    getClientDetail: async (req, res) => {
      try {
        const result = await useCases.getAdminClientDetail(req.user, req.params.id);
        res.json({
          success: true,
          cliente: result.cliente
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el detalle del cliente');
      }
    },

    updateClient: async (req, res) => {
      try {
        const result = await useCases.updateAdminClient(req.user, req.params.id, req.body);
        res.json({
          success: true,
          message: 'Cliente actualizado correctamente',
          cliente: result.cliente
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al actualizar el cliente');
      }
    }
  };
}

module.exports = { createAdminClientsController };
