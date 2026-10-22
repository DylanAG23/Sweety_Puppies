const { StoreError } = require('./rules');
function endpoint(work) {
  return async (req, res) => {
    req.body ||= {};
    try {
      res.json({ success: true, ...(await work(req)) });
    } catch (error) {
      if (error instanceof StoreError || error.name === 'InventoryError')
        return res
          .status(error.status || 400)
          .json({ success: false, message: error.message, code: error.code });
      const known = {
        23505: 'Ya existe un registro con esa referencia o nombre',
        23503:
          'El registro tiene datos relacionados. Desactívalo para conservar su historial',
        23514: 'La operación no cumple las reglas de datos',
        '22P02': 'Valor o identificador inválido',
        22003: 'El importe o la cantidad supera el límite permitido',
        40001: 'La información cambió. Actualiza e intenta de nuevo',
        '40P01': 'Otra operación está actualizando los datos. Intenta de nuevo'
      };
      if (known[error.code])
        return res
          .status(409)
          .json({ success: false, message: known[error.code] });
      console.error('Error en tienda:', error.code || error.message);
      res
        .status(500)
        .json({
          success: false,
          message: 'No se pudo completar la operación. Intenta nuevamente.'
        });
    }
  };
}
module.exports = { endpoint };
