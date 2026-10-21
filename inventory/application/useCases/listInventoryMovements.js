// Pantalla 11: historial auditable con filtros, resumen del periodo y paginacion.
async function listInventoryMovements(dependencies, sessionUser, query) {
  const { inventoryRepository, rules } = dependencies;
  const filtros = rules.normalizeMovementFilters(query);
  const { movimientos, total, resumen } = await inventoryRepository.listMovements(filtros);

  return {
    filtros,
    resumen,
    movimientos: movimientos.map(rules.presentMovement),
    paginacion: {
      pagina: filtros.page,
      tamanoPagina: filtros.pageSize,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / filtros.pageSize))
    }
  };
}

module.exports = { listInventoryMovements };
