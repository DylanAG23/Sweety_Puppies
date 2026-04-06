function toMoney(value) {
  return Math.round(Number(value) || 0);
}

function buildFinancialDistribution(totalIngresado) {
  const total = toMoney(totalIngresado);
  const fondoInsumos = Math.round(total * 0.3);
  const gananciaNeta = total - fondoInsumos;

  return {
    totalIngresado: total,
    fondoInsumos,
    gananciaNeta
  };
}

module.exports = {
  toMoney,
  buildFinancialDistribution
};
