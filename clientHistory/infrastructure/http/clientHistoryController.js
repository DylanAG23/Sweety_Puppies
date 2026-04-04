const { HistoryError } = require('../../domain/errors/HistoryError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof HistoryError) {
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

function createClientHistoryController(useCases) {
  return {
    getHistory: async (req, res) => {
      try {
        const result = await useCases.getClientHistory(req.user);
        res.json({
          success: true,
          citasActuales: result.citasActuales,
          serviciosRealizados: result.serviciosRealizados,
          mascotas: result.mascotas
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el historial del cliente');
      }
    },

    getCurrentAppointmentDetail: async (req, res) => {
      try {
        const result = await useCases.getClientCurrentAppointmentDetail(req.user, req.params.id);
        res.json({
          success: true,
          cita: result.cita
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al obtener el detalle de la cita');
      }
    },

    getCompletedServiceDetail: async (req, res) => {
      try {
        const result = await useCases.getClientCompletedServiceDetail(req.user, req.params.id);
        res.json({
          success: true,
          servicio: result.servicio
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al obtener el detalle del servicio realizado');
      }
    }
  };
}

module.exports = { createClientHistoryController };
