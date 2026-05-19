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

function buildAppointmentCountLookup(rows) {
  const lookup = new Map();
  (rows || []).forEach((row) => {
    lookup.set(String(row.fecha).slice(0, 10), Number(row.totalCitas) || 0);
  });
  return lookup;
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

function buildDashboardKpis(filters, revenueSummary, additionalSummary, statusSummary, dailySummary, distribution) {
  const statusLookup = buildStatusLookup(statusSummary);
  const topService = revenueSummary.serviciosPrincipales[0] || null;
  const topAdditional = additionalSummary.adicionales[0] || null;
  const bestIncomeDay =
    (dailySummary.ingresosPorDia || []).reduce(
      (best, item) => (item.totalIngresado > (best?.totalIngresado || 0) ? item : best),
      null
    ) || null;
  const bestAppointmentsDay =
    (dailySummary.citasPorDia || []).reduce(
      (best, item) => (item.totalCitas > (best?.totalCitas || 0) ? item : best),
      null
    ) || null;

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
    diaMayorCantidadCitas: bestAppointmentsDay
      ? {
          fecha: String(bestAppointmentsDay.fecha).slice(0, 10),
          label: formatDateLabel(bestAppointmentsDay.fecha),
          totalCitas: bestAppointmentsDay.totalCitas
        }
      : null,
    diaMayorIngreso: bestIncomeDay
      ? {
          fecha: String(bestIncomeDay.fecha).slice(0, 10),
          label: formatDateLabel(bestIncomeDay.fecha),
          totalIngresado: bestIncomeDay.totalIngresado
        }
      : null
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

function buildMonthlyTrend(monthlyRows) {
  return (monthlyRows || []).map((row) => ({
    key: String(row.periodo).slice(0, 10),
    label: formatMonthLabel(row.periodo),
    ingresos: Number(row.totalIngresado) || 0,
    citas: Number(row.totalCitas) || 0
  }));
}

function buildStatusTable(statusSummary) {
  return (statusSummary || []).map((item) => ({
    estado: STATE_LABELS[item.estado] || item.estado,
    totalCitas: Number(item.totalCitas) || 0
  }));
}

async function buildAdminDashboardReport(dependencies, filters) {
  const [revenueSummary, additionalSummary, statusSummary, completedSummary, dailySummary, monthlyTrend, completedAppointments] =
    await Promise.all([
      dependencies.reportsRepository.getRevenueSummary(filters),
      dependencies.reportsRepository.getAdditionalRevenueSummary(filters),
      dependencies.reportsRepository.getAppointmentStatusSummary(filters),
      dependencies.reportsRepository.getCompletedServicesSummary(filters),
      dependencies.reportsRepository.getDailyOperationalSummary(filters),
      dependencies.reportsRepository.getMonthlyRevenueTrend(filters),
      dependencies.reportsRepository.getCompletedAppointmentsTable(filters)
    ]);

  const distribution = dependencies.finance.buildFinancialDistribution(revenueSummary.totalIngresado);
  const revenueLine = dependencies.trends.buildTrendSeries(
    filters,
    'ganancias',
    (dailySummary.ingresosPorDia || []).map((item) => ({
      key: String(item.fecha).slice(0, 10),
      value: Number(item.totalIngresado) || 0
    }))
  );

  return {
    filtro: filters,
    kpis: buildDashboardKpis(
      filters,
      revenueSummary,
      additionalSummary,
      statusSummary,
      dailySummary,
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
      tendenciaMensual: buildMonthlyTrend(monthlyTrend)
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
