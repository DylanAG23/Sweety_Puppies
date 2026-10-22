// Pantalla 10 (Control de inventario): existencias, nivel de cada producto,
// indicadores y alerta de productos bajo el minimo o agotados.
async function getInventoryOverview(dependencies, sessionUser, query) {
  const { inventoryRepository, rules } = dependencies;
  const filtros = rules.normalizeOverviewFilters(query);

  const [items, movimientosHoy] = await Promise.all([
    inventoryRepository.listInventory(),
    inventoryRepository.countMovementsToday()
  ]);

  const overview = rules.buildInventoryOverview(items, { filters: filtros, movimientosHoy });

  return {
    filtros,
    ...overview,
    motivosSugeridos: rules.SUGGESTED_REASONS
  };
}

module.exports = { getInventoryOverview };
