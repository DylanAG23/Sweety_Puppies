const { PortalContentError } = require('../../domain/errors/PortalContentError');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof PortalContentError) {
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

function createPortalContentController(useCases) {
  return {
    listAdminContent: async (req, res) => {
      try {
        const result = await useCases.listAdminContent(req.user, req.query);
        res.json({
          success: true,
          publicaciones: result.publicaciones,
          search: result.search
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el contenido');
      }
    },

    getContentDetail: async (req, res) => {
      try {
        const result = await useCases.getAdminContentDetail(req.user, req.params.id);
        res.json({
          success: true,
          publicacion: result.publicacion
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el detalle del contenido');
      }
    },

    createContent: async (req, res) => {
      try {
        const imageFile = req.files?.imagen?.[0] || null;
        const result = await useCases.createAdminContent(req.user, req.body, imageFile);
        res.status(201).json({
          success: true,
          message: 'Publicacion creada correctamente',
          publicacion: result.publicacion
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al crear la publicacion');
      }
    },

    updateContent: async (req, res) => {
      try {
        const imageFile = req.files?.imagen?.[0] || null;
        const result = await useCases.updateAdminContent(req.user, req.params.id, req.body, imageFile);
        res.json({
          success: true,
          message: 'Publicacion actualizada correctamente',
          publicacion: result.publicacion
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al actualizar la publicacion');
      }
    },

    changeContentStatus: async (req, res) => {
      try {
        const result = await useCases.changeAdminContentStatus(req.user, req.params.id, req.body);
        res.json({
          success: true,
          message: result.publicacion.activo
            ? 'Publicacion activada correctamente'
            : 'Publicacion desactivada correctamente',
          publicacion: result.publicacion
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cambiar el estado de la publicacion');
      }
    },

    reorderContent: async (req, res) => {
      try {
        const result = await useCases.reorderAdminContent(req.user, req.body);
        res.json({
          success: true,
          message: 'Orden visual actualizado correctamente',
          publicaciones: result.publicaciones
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al reordenar las publicaciones');
      }
    },

    listActiveContent: async (req, res) => {
      try {
        const result = await useCases.listActivePortalContent();
        res.json({
          success: true,
          publicaciones: result.publicaciones
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el contenido activo');
      }
    }
  };
}

module.exports = { createPortalContentController };
