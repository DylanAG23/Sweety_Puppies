const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const STATE_LABELS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_atencion: 'En atención',
  completada: 'Finalizada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada'
};

function formatDateLabel(dateValue) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTH_LABELS[date.getUTCMonth()]}`;
}

function formatMonthLabel(dateValue) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function buildStatusLookup(rows) {
  const lookup = new Map();
  (rows || []).forEach((row) => {
    lookup.set(row.estado, Number(row.totalCitas) || 0);
  });
  return lookup;
}

function buildIncomeSummaryTable(revenueSummary, additionalSummary, distribution) {
  return [
    {
      concepto: 'Ingresos por servicios principales',
      detalle: `${revenueSummary.totalCitasRealizadas} citas realizadas`,
      valor: revenueSummary.totalIngresado
    },
    {
      concepto: 'Ingresos por servicios adicionales',
      detalle: `${additionalSummary.totalAplicaciones} aplicaciones`,
      valor: additionalSummary.totalIngresado
    },
    {
      concepto: 'Reserva / insumos 30%',
      detalle: 'Proyección operativa sugerida',
      valor: distribution.fondoInsumos
    },
    {
      concepto: 'Ganancia neta 70%',
      detalle: 'Utilidad estimada del periodo',
      valor: distribution.gananciaNeta
    }
  ];
}

function buildPeakDailyPoint(rows, valueKey, labelKey) {
  const positivePoints = (rows || []).filter((item) => Number(item[valueKey]) > 0);

  if (!positivePoints.length) {
    return null;
  }

  const bestPoint = positivePoints.reduce(
    (best, item) => (Number(item[valueKey]) > Number(best?.[valueKey] || 0) ? item : best),
    null
  );

  if (!bestPoint) {
    return null;
  }

  return {
    fecha: String(bestPoint.fecha).slice(0, 10),
    label: labelKey(bestPoint),
    [valueKey]: Number(bestPoint[valueKey]) || 0
  };
}

function buildPeakTrendPoint(trend, fieldName) {
  const positivePoints = (trend?.serie || []).filter((item) => item.value > 0);

  if (!positivePoints.length) {
    return null;
  }

  const bestPoint = positivePoints.reduce(
    (best, item) => (item.value > (best?.value || 0) ? item : best),
    null
  );

  if (!bestPoint) {
    return null;
  }

  return {
    fecha: String(bestPoint.key).slice(0, 10),
    label: bestPoint.label,
    [fieldName]: bestPoint.value
  };
}

function buildDashboardKpis(
  filters,
  revenueSummary,
  additionalSummary,
  statusSummary,
  dailySummary,
  revenueTrend,
  distribution
) {
  const statusLookup = buildStatusLookup(statusSummary);
  const topService = revenueSummary.serviciosPrincipales[0] || null;
  const topAdditional = additionalSummary.adicionales[0] || null;
  const bestIncomeDay =
    buildPeakDailyPoint(dailySummary.ingresosPorDia, 'totalIngresado', (item) => formatDateLabel(item.fecha)) ||
    buildPeakTrendPoint(revenueTrend, 'totalIngresado');
  const bestAppointmentsDay = buildPeakDailyPoint(
    dailySummary.citasPorDia,
    'totalCitas',
    (item) => formatDateLabel(item.fecha)
  );

  return {
    periodo: filters.label,
    totalIngresado: revenueSummary.totalIngresado,
    gananciaNeta: distribution.gananciaNeta,
    reservaInsumos: distribution.fondoInsumos,
    totalCitasRealizadas: revenueSummary.totalCitasRealizadas,
    totalCitasCanceladas: statusLookup.get('cancelada') || 0,
    totalCitasPendientes: statusLookup.get('pendiente') || 0,
    totalCitasConfirmadas: statusLookup.get('confirmada') || 0,
    servicioMasSolicitado: topService
      ? {
          nombre: topService.nombre,
          totalCitas: topService.totalCitas,
          totalIngresado: topService.totalIngresado
        }
      : null,
    servicioAdicionalMasVendido: topAdditional
      ? {
          nombre: topAdditional.nombre,
          totalAplicaciones: topAdditional.totalAplicaciones,
          totalIngresado: topAdditional.totalIngresado
        }
      : null,
    promedioIngresoPorCita: revenueSummary.promedioPorCita,
    diaMayorCantidadCitas: bestAppointmentsDay,
    diaMayorIngreso: bestIncomeDay
  };
}

function buildComparisonChart(revenueSummary, additionalSummary) {
  return [
    { label: 'Servicios principales', value: revenueSummary.totalIngresado },
    { label: 'Servicios adicionales', value: additionalSummary.totalIngresado }
  ];
}

function buildStatusChart(statusSummary) {
  return (statusSummary || []).map((item) => ({
    key: item.estado,
    label: STATE_LABELS[item.estado] || item.estado,
    value: Number(item.totalCitas) || 0
  }));
}

function buildMonthlyTrendBuckets(filters, monthlyRows) {
  const valuesByMonth = new Map(
    (monthlyRows || []).map((row) => [
      String(row.periodo).slice(0, 7),
      {
        ingresos: Number(row.totalIngresado) || 0,
        citas: Number(row.totalCitas) || 0
      }
    ])
  );

  const [startYear, startMonth] = String(filters.fechaInicio).slice(0, 7).split('-').map(Number);
  const [endYear, endMonth] = String(filters.fechaFin).slice(0, 7).split('-').map(Number);

  const buckets = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const current = valuesByMonth.get(monthKey) || { ingresos: 0, citas: 0 };

    buckets.push({
      key,
      label: formatMonthLabel(key),
      ingresos: current.ingresos,
      citas: current.citas
    });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return buckets;
}

function buildStatusTable(statusSummary) {
  return (statusSummary || []).map((item) => ({
    estado: STATE_LABELS[item.estado] || item.estado,
    totalCitas: Number(item.totalCitas) || 0
  }));
}

async function buildAdminDashboardReport(dependencies, filters) {
  const [revenueSummary, additionalSummary, statusSummary, completedSummary, dailySummary, revenueTrendRows, monthlyTrend, completedAppointments] =
    await Promise.all([
      dependencies.reportsRepository.getRevenueSummary(filters),
      dependencies.reportsRepository.getAdditionalRevenueSummary(filters),
      dependencies.reportsRepository.getAppointmentStatusSummary(filters),
      dependencies.reportsRepository.getCompletedServicesSummary(filters),
      dependencies.reportsRepository.getDailyOperationalSummary(filters),
      dependencies.reportsRepository.getTrendSeries(filters, 'ganancias'),
      dependencies.reportsRepository.getMonthlyRevenueTrend(filters),
      dependencies.reportsRepository.getCompletedAppointmentsTable(filters)
    ]);

  const distribution = dependencies.finance.buildFinancialDistribution(revenueSummary.totalIngresado);
  const revenueLine = dependencies.trends.buildTrendSeries(
    filters,
    'ganancias',
    revenueTrendRows
  );

  return {
    filtro: filters,
    kpis: buildDashboardKpis(
      filters,
      revenueSummary,
      additionalSummary,
      statusSummary,
      dailySummary,
      revenueLine,
      distribution
    ),
    graficas: {
      ingresosPorPeriodo: {
        periodo: filters.periodo,
        serie: revenueLine.serie
      },
      evolucionIngresos: revenueLine,
      distribucionServiciosPrincipales: revenueSummary.serviciosPrincipales.map((item) => ({
        label: item.nombre,
        value: item.totalCitas,
        ingreso: item.totalIngresado
      })),
      distribucionServiciosAdicionales: additionalSummary.adicionales.map((item) => ({
        label: item.nombre,
        value: item.totalAplicaciones,
        ingreso: item.totalIngresado
      })),
      citasPorEstado: buildStatusChart(statusSummary),
      comparativoIngresos: buildComparisonChart(revenueSummary, additionalSummary),
      rankingServicios: revenueSummary.serviciosPrincipales.slice(0, 8).map((item, index) => ({
        posicion: index + 1,
        label: item.nombre,
        value: item.totalCitas,
        ingreso: item.totalIngresado
      })),
      tendenciaMensual: buildMonthlyTrendBuckets(filters, monthlyTrend)
    },
    tablas: {
      citasRealizadas: completedAppointments,
      serviciosPrincipales: revenueSummary.serviciosPrincipales.map((item) => ({
        nombre: item.nombre,
        totalCitas: item.totalCitas,
        totalIngresado: item.totalIngresado
      })),
      serviciosAdicionales: additionalSummary.adicionales.map((item) => ({
        nombre: item.nombre,
        totalAplicaciones: item.totalAplicaciones,
        totalIngresado: item.totalIngresado
      })),
      resumenIngresos: buildIncomeSummaryTable(revenueSummary, additionalSummary, distribution),
      citasPorEstado: buildStatusTable(statusSummary)
    },
    resumenOperativo: {
      totalServiciosPrincipales: completedSummary.totalServiciosPrincipales,
      totalAdicionalesAplicados: completedSummary.totalAdicionalesAplicados
    },
    estadoVacio: {
      sinIngresos: revenueSummary.totalIngresado <= 0,
      sinCitasRealizadas: revenueSummary.totalCitasRealizadas <= 0,
      mensaje:
        revenueSummary.totalCitasRealizadas <= 0
          ? 'No encontramos citas finalizadas para el rango seleccionado.'
          : null
    }
  };
}

module.exports = { buildAdminDashboardReport };
