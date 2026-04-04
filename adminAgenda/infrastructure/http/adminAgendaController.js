const { AdminAgendaError } = require('../../domain/errors/AdminAgendaError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof AdminAgendaError) {
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

function createAdminAgendaController(useCases) {
  return {
    getAgenda: async (req, res) => {
      try {
        const result = await useCases.getAdminAgenda(req.user, req.query);
        res.json({ success: true, ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar la agenda administrativa');
      }
    },

    getAppointmentDetail: async (req, res) => {
      try {
        const result = await useCases.getAdminAppointmentDetail(req.user, req.params.id);
        res.json({ success: true, cita: result.cita });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el detalle de la cita');
      }
    },

    confirmAppointment: async (req, res) => {
      try {
        const result = await useCases.confirmAdminAppointment(req.user, req.params.id);
        res.json({ success: true, message: result.message, cita: result.cita });
      } catch (error) {
        handleHttpError(res, error, 'Error al confirmar la cita');
      }
    },

    listBlocks: async (req, res) => {
      try {
        const result = await useCases.listAdminBlocks(req.user, req.query);
        res.json({ success: true, fecha: result.fecha, bloqueos: result.bloqueos });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar los bloqueos de agenda');
      }
    },

    createBlock: async (req, res) => {
      try {
        const result = await useCases.createAdminBlock(req.user, req.body);
        res.status(201).json({ success: true, message: result.message, bloqueo: result.bloqueo });
      } catch (error) {
        handleHttpError(res, error, 'Error al crear el bloqueo');
      }
    },

    deactivateBlock: async (req, res) => {
      try {
        const result = await useCases.deactivateAdminBlock(req.user, req.params.id);
        res.json({ success: true, message: result.message });
      } catch (error) {
        handleHttpError(res, error, 'Error al desactivar el bloqueo');
      }
    }
  };
}

module.exports = { createAdminAgendaController };
