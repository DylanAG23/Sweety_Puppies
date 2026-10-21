// Descarga del historial filtrado (sin paginar) en CSV para Excel.
async function exportInventoryMovements(dependencies, sessionUser, query) {
  const { inventoryRepository, rules } = dependencies;
  const filtros = rules.normalizeMovementFilters(query, { paginate: false });
  const { movimientos } = await inventoryRepository.listMovements(filtros);

  return {
    fileName: `movimientos_inventario_${filtros.desde || 'inicio'}_${filtros.hasta || 'hoy'}.csv`,
    content: rules.buildMovementsCsv(movimientos.map(rules.presentMovement))
  };
}

module.exports = { exportInventoryMovements };
