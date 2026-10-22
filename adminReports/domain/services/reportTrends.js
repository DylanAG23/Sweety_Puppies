const { AdminReportError } = require('../errors/AdminReportError');

const TREND_METRICS = ['citas', 'ganancias'];
const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function parseDateString(value) {
  const normalized = String(value).slice(0, 10);
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

function addMonths(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function countDaysInclusive(startDate, endDate) {
  const diff = endDate.getTime() - startDate.getTime();
  return Math.floor(diff / 86400000) + 1;
}

function normalizeTrendMetric(value) {
  const normalized = String(value || 'citas').trim().toLowerCase();

  if (!TREND_METRICS.includes(normalized)) {
    throw new AdminReportError('Debes indicar una metrica valida para la grafica', 400, 'INVALID_TREND_METRIC');
  }

  return normalized;
}

function resolveTrendGranularity(filters) {
  if (filters.periodo === 'day') {
    return 'hour';
  }

  if (filters.periodo === 'week' || filters.periodo === 'month') {
    return 'day';
  }

  const totalDays = countDaysInclusive(parseDateString(filters.fechaInicio), parseDateString(filters.fechaFin));
  return totalDays > 62 ? 'month' : 'day';
}

function buildExpectedBuckets(filters, granularity) {
  if (granularity === 'hour') {
    return Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      label: `${String(hour).padStart(2, '0')}:00`
    }));
  }

  if (granularity === 'month') {
    const buckets = [];
    let cursor = new Date(Date.UTC(
      parseDateString(filters.fechaInicio).getUTCFullYear(),
      parseDateString(filters.fechaInicio).getUTCMonth(),
      1
    ));
    const limit = new Date(Date.UTC(
      parseDateString(filters.fechaFin).getUTCFullYear(),
      parseDateString(filters.fechaFin).getUTCMonth(),
      1
    ));

    while (cursor <= limit) {
      buckets.push({
        key: formatDateKey(cursor),
        label: `${MONTH_LABELS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`
      });
      cursor = addMonths(cursor, 1);
    }

    return buckets;
  }

  const buckets = [];
  let cursor = parseDateString(filters.fechaInicio);
  const limit = parseDateString(filters.fechaFin);

  while (cursor <= limit) {
    const key = formatDateKey(cursor);
    if (filters.periodo === 'week') {
      buckets.push({
        key,
        label: `${WEEKDAY_LABELS[cursor.getUTCDay()]} ${cursor.getUTCDate()}`
      });
    } else if (filters.periodo === 'month') {
      buckets.push({
        key,
        label: String(cursor.getUTCDate())
      });
    } else {
      buckets.push({
        key,
        label: `${String(cursor.getUTCDate()).padStart(2, '0')} ${MONTH_LABELS[cursor.getUTCMonth()]}`
      });
    }
    cursor = addDays(cursor, 1);
  }

  return buckets;
}

function buildTrendSeries(filters, metrica, rows) {
  const granularidad = resolveTrendGranularity(filters);
  const expectedBuckets = buildExpectedBuckets(filters, granularidad);
  const valuesByKey = new Map(
    (rows || []).map((row) => [String(row.key), Number(row.value) || 0])
  );

  const serie = expectedBuckets.map((bucket) => ({
    ...bucket,
    value: valuesByKey.get(String(bucket.key)) || 0
  }));

  const total = serie.reduce((sum, item) => sum + item.value, 0);
  const maximo = serie.reduce((max, item) => Math.max(max, item.value), 0);
  const mejorPunto = serie.find((item) => item.value === maximo) || null;
  const promedio = serie.length ? total / serie.length : 0;

  return {
    metrica,
    granularidad,
    serie,
    resumen: {
      total,
      maximo,
      promedio,
      mejorEtiqueta: mejorPunto ? mejorPunto.label : null
    }
  };
}

module.exports = {
  normalizeTrendMetric,
  buildTrendSeries
};
