const { AppointmentError } = require('../../domain/errors/AppointmentError');

function firstFile(files, fieldName) {
  const fileList = files?.[fieldName];
  return Array.isArray(fileList) && fileList.length ? fileList[0] : null;
}

function sendReviewError(res, error, reviewPageRenderer) {
  if (error instanceof AppointmentError) {
    return res.status(error.status).send(
      reviewPageRenderer.render({
        title: 'No pudimos procesar la accion',
        message: error.message || 'El enlace no es valido o ya vencio.',
        appointment: null
      })
    );
  }

  console.error('Error en review de clienteCitas:', error);
  return res.status(500).send(
    reviewPageRenderer.render({
      title: 'No pudimos procesar la accion',
      message: 'Ocurrio un problema inesperado al revisar la cita.',
      appointment: null
    })
  );
}

function sendJsonError(res, error, defaultMessage) {
  if (error instanceof AppointmentError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  if (error?.code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Uno de los valores enviados no es compatible con la configuracion actual de citas'
    });
  }

  console.error(defaultMessage, error);
  return res.status(500).json({
    success: false,
    message: defaultMessage
  });
}

function createClientAppointmentsController(useCases, reviewPageRenderer) {
  return {
    getAdminReview: async (req, res) => {
      try {
        const result = await useCases.getAdminAppointmentReview(req.query?.token);
        res.status(result.status).send(result.html);
      } catch (error) {
        sendReviewError(res, error, reviewPageRenderer);
      }
    },

    processAdminReviewGet: async (req, res) => {
      try {
        const result = await useCases.processAdminAppointmentDecision(req.query?.token, req.query?.decision);
        res.status(result.status).send(result.html);
      } catch (error) {
        sendReviewError(res, error, reviewPageRenderer);
      }
    },

    processAdminReviewPost: async (req, res) => {
      try {
        const result = await useCases.processAdminAppointmentDecision(req.body?.token, req.body?.decision);
        res.status(result.status).send(result.html);
      } catch (error) {
        sendReviewError(res, error, reviewPageRenderer);
      }
    },

    getFormOptions: async (req, res) => {
      try {
        const result = await useCases.getClientAppointmentFormOptions(req.user);
        res.json({
          success: true,
          mascotas: result.mascotas,
          servicios: result.servicios,
          serviciosAdicionales: result.serviciosAdicionales,
          fechaMinimaAgenda: result.fechaMinimaAgenda
        });
      } catch (error) {
        sendJsonError(res, error, 'Error al cargar el formulario de citas');
      }
    },

    getQuote: async (req, res) => {
      try {
        const result = await useCases.quoteClientAppointment(req.user, req.body);
        res.json({
          success: true,
          quote: result.quote
        });
      } catch (error) {
        sendJsonError(res, error, 'Error al calcular el precio estimado');
      }
    },

    getAvailability: async (req, res) => {
      try {
        const result = await useCases.getClientAppointmentAvailability(req.user, req.query);
        res.json({
          success: true,
          ...result
        });
      } catch (error) {
        sendJsonError(res, error, 'Error al consultar la disponibilidad');
      }
    },

    createAppointment: async (req, res) => {
      try {
        const result = await useCases.createClientAppointment(req.user, req.body, {
          fotoEstadoActual: firstFile(req.files, 'fotoEstadoActual')
        });

        res.status(201).json({
          success: true,
          message: result.message,
          cita: result.cita,
          warnings: result.warnings
        });
      } catch (error) {
        sendJsonError(res, error, 'Error al crear la cita');
      }
    },

    cancelAppointment: async (req, res) => {
      try {
        const result = await useCases.cancelClientAppointment(req.user, req.params.id, req.body);
        res.json({
          success: true,
          message: result.message
        });
      } catch (error) {
        sendJsonError(res, error, 'Error al cancelar la cita');
      }
    },

    reprogramAppointment: async (req, res) => {
      try {
        const result = await useCases.reprogramClientAppointment(req.user, req.params.id, req.body);
        res.json({
          success: true,
          message: result.message,
          cita: result.cita
        });
      } catch (error) {
        sendJsonError(res, error, 'Error al reprogramar la cita');
      }
    }
  };
}

module.exports = { createClientAppointmentsController };
