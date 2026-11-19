const { InventoryError } = require('../../domain/errors/InventoryError');
const { sendUnexpectedError } = require('../../../shared/http/httpErrors');

function handleHttpError(res, error, defaultMessage) {
  if (error instanceof InventoryError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      code: error.code
    });
  }

  return sendUnexpectedError(res, error, defaultMessage);
}

function createInventoryController(useCases) {
  return {
    getOverview: async (req, res) => {
      try {
        const result = await useCases.getInventoryOverview(req.user, req.query);
        res.json({ success: true, ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el inventario');
      }
    },

    getProductInventory: async (req, res) => {
      try {
        const result = await useCases.getProductInventory(req.user, req.params.productoId);
        res.json({ success: true, inventario: result.inventario });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar el inventario del producto');
      }
    },

    updateMinimumStock: async (req, res) => {
      try {
        const result = await useCases.updateMinimumStock(req.user, req.params.productoId, req.body);
        res.json({ success: true, message: result.message, inventario: result.inventario });
      } catch (error) {
        handleHttpError(res, error, 'Error al actualizar el stock minimo');
      }
    },

    registerMovement: async (req, res) => {
      try {
        const result = await useCases.registerInventoryMovement(req.user, req.body);
        res.status(201).json({
          success: true,
          message: result.message,
          movimiento: result.movimiento,
          inventario: result.inventario
        });
      } catch (error) {
        handleHttpError(res, error, 'Error al registrar el movimiento de inventario');
      }
    },

    listMovements: async (req, res) => {
      try {
        const result = await useCases.listInventoryMovements(req.user, req.query);
        res.json({ success: true, ...result });
      } catch (error) {
        handleHttpError(res, error, 'Error al cargar los movimientos de inventario');
      }
    },

    exportMovements: async (req, res) => {
      try {
        const result = await useCases.exportInventoryMovements(req.user, req.query);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.send(result.content);
      } catch (error) {
        handleHttpError(res, error, 'Error al exportar los movimientos de inventario');
      }
    }
  };
}

module.exports = { createInventoryController };
