const { AdminServiceManagementError } = require('../../domain/errors/AdminServiceManagementError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof AdminServiceManagementError) {
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

function createAdminServiceManagementController(useCases) {
  return {
    listAppointments: async (req, res) => {
      try {
        const result = await useCases.listAdminAppointments(req.user, req.query);
        res.json({ success: true, citas: result.citas, filtros: result.filtros });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar la gestion de citas');
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

    cancelAppointment: async (req, res) => {
      try {
        const result = await useCases.cancelAdminAppointment(req.user, req.params.id, req.body);
        res.json({ success: true, message: result.message, cita: result.cita });
      } catch (error) {
        handleHttpError(res, error, 'Error al cancelar la cita');
      }
    },

    startAppointment: async (req, res) => {
      try {
        const result = await useCases.startAdminAppointment(req.user, req.params.id);
        res.json({ success: true, message: result.message, cita: result.cita });
      } catch (error) {
        handleHttpError(res, error, 'Error al iniciar la cita');
      }
    },

    updateAppointmentAttention: async (req, res) => {
      try {
        const result = await useCases.updateAdminAppointmentAttention(req.user, req.params.id, req.body);
        res.json({ success: true, message: result.message, cita: result.cita });
      } catch (error) {
        handleHttpError(res, error, 'Error al actualizar la atencion de la cita');
      }
    },

    finalizeAppointment: async (req, res) => {
      try {
        const result = await useCases.finalizeAdminAppointment(req.user, req.params.id, req.body);
        res.json({ success: true, message: result.message, cita: result.cita });
      } catch (error) {
        handleHttpError(res, error, 'Error al finalizar la cita');
      }
    },

    listCompletedServices: async (req, res) => {
      try {
        const result = await useCases.listAdminCompletedServices(req.user, req.query);
        res.json({ success: true, servicios: result.servicios, filtros: result.filtros });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar los servicios realizados');
      }
    },

    getCompletedServiceDetail: async (req, res) => {
      try {
        const result = await useCases.getAdminCompletedServiceDetail(req.user, req.params.id);
        res.json({ success: true, servicio: result.servicio });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el detalle del servicio realizado');
      }
    }
  };
}

module.exports = { createAdminServiceManagementController };
