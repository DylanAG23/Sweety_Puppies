function createAuthController(useCases) {
  return {
    initiateRegistration: async (req, res) => {
      try {
        const result = await useCases.initiateCustomerRegistration(req.body);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al iniciar el registro');
      }
    },

    verifyRegistration: async (req, res) => {
      try {
        const result = await useCases.verifyRegistrationCode(req.body);
        res.status(201).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al verificar el codigo');
      }
    },

    login: async (req, res) => {
      try {
        const result = await useCases.loginUser(req.body);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al iniciar sesion');
      }
    },

    requestPasswordRecovery: async (req, res) => {
      try {
        const result = await useCases.requestPasswordRecovery(req.body);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al solicitar recuperacion');
      }
    },

    verifyPasswordRecoveryCode: async (req, res) => {
      try {
        const result = await useCases.verifyPasswordRecoveryCode(req.body);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al verificar el codigo de recuperacion');
      }
    },

    resetPasswordWithRecoveryCode: async (req, res) => {
      try {
        const result = await useCases.resetPasswordWithRecoveryCode(req.body);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al cambiar la contrasena');
      }
    },

    getClientHome: async (req, res) => {
      try {
        const result = await useCases.getClientHome(req.user);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al cargar el portal del cliente');
      }
    },

    getAdminHome: async (req, res) => {
      try {
        const result = await useCases.getAdminHome(req.user);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al cargar el panel administrativo');
      }
    },

    getClientProfile: async (req, res) => {
      try {
        const result = await useCases.getClientProfile(req.user);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al obtener el perfil del cliente');
      }
    },

    updateClientProfile: async (req, res) => {
      try {
        const result = await useCases.updateClientProfile(req.user, req.body);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        handleError(res, error, 'Error al actualizar el perfil del cliente');
      }
    }
  };
}

function handleError(res, error, defaultMessage) {
  console.error(defaultMessage, error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || defaultMessage
  });
}

module.exports = { createAuthController };
