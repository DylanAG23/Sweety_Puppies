const { HistoryError } = require('../../domain/errors/HistoryError');
const { sendUnexpectedError } = require('../../../shared/http/httpErrors');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof HistoryError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  return sendUnexpectedError(res, error, defaultMessage);
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
    },

    downloadCompletedServiceReceipt: async (req, res) => {
      try {
        const result = await useCases.generateClientCompletedServiceReceipt(req.user, req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.send(result.buffer);
      } catch (error) {
        handleHttpError(res, error, 'Error al generar el comprobante del servicio realizado');
      }
    }
  };
}

module.exports = { createClientHistoryController };
