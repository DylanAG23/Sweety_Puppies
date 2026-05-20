<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { apiGet } from '@/lib/api'
import { getSession, logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type PeriodType = 'day' | 'week' | 'month' | 'range'
type AppointmentState =
  | 'todas'
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'completada'
  | 'cancelada'
  | 'reprogramada'
type QuickRange = 'today' | 'week' | 'month' | 'quarter' | 'year'

type ReportFilter = {
  periodo: PeriodType
  fechaReferencia: string | null
  fechaInicio: string
  fechaFin: string
  label: string
  servicioId: string | null
  servicioAdicionalId: string | null
  clienteId: string | null
  mascotaId: string | null
  estadoCita: AppointmentState
}

type FilterOption = {
  id: string
  nombre: string
  cedula?: string
  clienteNombreCompleto?: string
}

type DashboardKpis = {
  periodo: string
  totalIngresado: number
  gananciaNeta: number
  reservaInsumos: number
  totalCitasRealizadas: number
  totalCitasCanceladas: number
  totalCitasPendientes: number
  totalCitasConfirmadas: number
  servicioMasSolicitado: { nombre: string; totalCitas: number; totalIngresado: number } | null
  servicioAdicionalMasVendido: { nombre: string; totalAplicaciones: number; totalIngresado: number } | null
  promedioIngresoPorCita: number
  diaMayorCantidadCitas: { fecha: string; label: string; totalCitas: number } | null
  diaMayorIngreso: { fecha: string; label: string; totalIngresado: number } | null
}

type ChartDatum = { key: string; label: string; value: number; ingreso?: number; posicion?: number }
type MonthlyTrendDatum = { key: string; label: string; ingresos: number; citas: number }

type CompletedAppointmentRow = {
  id: string
  citaId: string
  fechaServicio: string
  clienteNombreCompleto: string
  clienteEmail: string | null
  clienteTelefono: string | null
  mascotaNombre: string
  servicioPrincipalNombre: string
  serviciosAdicionalesResumen: string | null
  precioFinal: number
}

type DashboardTables = {
  citasRealizadas: CompletedAppointmentRow[]
  serviciosPrincipales: Array<{ nombre: string; totalCitas: number; totalIngresado: number }>
  serviciosAdicionales: Array<{ nombre: string; totalAplicaciones: number; totalIngresado: number }>
  resumenIngresos: Array<{ concepto: string; detalle: string; valor: number }>
  citasPorEstado: Array<{ estado: string; totalCitas: number }>
}

type DashboardResponse = {
  success: boolean
  tipo: 'dashboard'
  filtro: ReportFilter
  kpis: DashboardKpis
  graficas: {
    ingresosPorPeriodo: { periodo: PeriodType; serie: ChartDatum[] }
    evolucionIngresos: { metrica: 'ganancias'; granularidad: 'hour' | 'day' | 'month'; serie: ChartDatum[]; resumen: { total: number; maximo: number; promedio: number; mejorEtiqueta: string | null } }
    distribucionServiciosPrincipales: ChartDatum[]
    distribucionServiciosAdicionales: ChartDatum[]
    citasPorEstado: ChartDatum[]
    comparativoIngresos: ChartDatum[]
    rankingServicios: ChartDatum[]
    tendenciaMensual: MonthlyTrendDatum[]
  }
  tablas: DashboardTables
  resumenOperativo: {
    totalServiciosPrincipales: number
    totalAdicionalesAplicados: number
  }
  estadoVacio: {
    sinIngresos: boolean
    sinCitasRealizadas: boolean
    mensaje: string | null
  }
}

type TableCellFormat = 'currency' | 'number'
type TableColumn = {
  key: string
  label: string
  format?: TableCellFormat
}
type TableRow = Record<string, unknown>
type TableConfig = {
  rows: TableRow[]
  columns: readonly TableColumn[]
}

type FilterCatalogResponse = {
  success: boolean
  catalogos: {
    serviciosPrincipales: FilterOption[]
    serviciosAdicionales: FilterOption[]
    clientes: FilterOption[]
    mascotas: FilterOption[]
  }
}

type TableKey =
  | 'citasRealizadas'
  | 'serviciosPrincipales'
  | 'serviciosAdicionales'
  | 'resumenIngresos'
  | 'citasPorEstado'

const currentPath = window.location.pathname.toLowerCase()
const today = getBogotaDate()

const loading = ref(true)
const refreshing = ref(false)
const downloading = ref(false)
const error = ref('')
const toast = ref('')
const dashboard = ref<DashboardResponse | null>(null)
const filterCatalogs = ref<FilterCatalogResponse['catalogos'] | null>(null)
const activeTable = ref<TableKey>('citasRealizadas')
const activeQuickRange = ref<QuickRange>('month')

const filters = reactive({
  periodo: 'month' as PeriodType,
  fecha: today,
  fechaInicio: startOfMonth(today),
  fechaFin: endOfMonth(today),
  servicioId: '',
  servicioAdicionalId: '',
  estadoCita: 'todas' as AppointmentState,
  clienteId: '',
  mascotaId: ''
})

const tableSort = reactive<Record<TableKey, { key: string; direction: 'asc' | 'desc' }>>({
  citasRealizadas: { key: 'fechaServicio', direction: 'desc' },
  serviciosPrincipales: { key: 'totalIngresado', direction: 'desc' },
  serviciosAdicionales: { key: 'totalIngresado', direction: 'desc' },
  resumenIngresos: { key: 'valor', direction: 'desc' },
  citasPorEstado: { key: 'totalCitas', direction: 'desc' }
})

const chartPalette = ['#8F176E', '#43BFAF', '#F4A7D8', '#1A202C', '#C05AA0', '#88DDD4', '#FFB8D2', '#6D4C76']
const chartFont = 'Poppins, "Segoe UI", sans-serif'

const kpiCards = computed(() => {
  if (!dashboard.value) {
    return []
  }

  const { kpis } = dashboard.value
  return [
    { label: 'Ingresos totales', value: formatCurrency(kpis.totalIngresado), helper: kpis.periodo, tone: 'pink' },
    { label: 'Ganancia neta 70%', value: formatCurrency(kpis.gananciaNeta), helper: 'Estimación operativa', tone: 'mint' },
    { label: 'Reserva / insumos 30%', value: formatCurrency(kpis.reservaInsumos), helper: 'Fondo sugerido', tone: 'sky' },
    { label: 'Citas realizadas', value: formatNumber(kpis.totalCitasRealizadas), helper: 'Trabajo finalizado', tone: 'lavender' },
    { label: 'Citas canceladas', value: formatNumber(kpis.totalCitasCanceladas), helper: 'No cuentan para ingresos', tone: 'rose' },
    { label: 'Citas pendientes', value: formatNumber(kpis.totalCitasPendientes), helper: 'Aún por revisar', tone: 'sand' },
    { label: 'Citas confirmadas', value: formatNumber(kpis.totalCitasConfirmadas), helper: 'Listas para operar', tone: 'lavender' },
    {
      label: 'Servicio más solicitado',
      value: kpis.servicioMasSolicitado?.nombre || 'Sin datos',
      helper: kpis.servicioMasSolicitado ? `${formatNumber(kpis.servicioMasSolicitado.totalCitas)} citas` : 'Sin citas realizadas',
      tone: 'pink'
    },
    {
      label: 'Adicional más vendido',
      value: kpis.servicioAdicionalMasVendido?.nombre || 'Sin datos',
      helper: kpis.servicioAdicionalMasVendido
        ? `${formatNumber(kpis.servicioAdicionalMasVendido.totalAplicaciones)} aplicaciones`
        : 'Sin adicionales aplicados',
      tone: 'sky'
    },
    { label: 'Promedio por cita', value: formatCurrency(kpis.promedioIngresoPorCita), helper: 'Solo sobre citas realizadas', tone: 'mint' },
    {
      label: 'Día con más citas',
      value: kpis.diaMayorCantidadCitas?.label || 'Sin citas en el periodo',
      helper: kpis.diaMayorCantidadCitas ? `${formatNumber(kpis.diaMayorCantidadCitas.totalCitas)} citas` : currentFilterLabel.value,
      tone: 'sand'
    },
    {
      label: 'Día con mayor ingreso',
      value: kpis.diaMayorIngreso?.label || 'Sin ingresos en el periodo',
      helper: kpis.diaMayorIngreso ? formatCurrency(kpis.diaMayorIngreso.totalIngresado) : currentFilterLabel.value,
      tone: 'rose'
    }
  ]
})

const currentFilterLabel = computed(() => dashboard.value?.filtro.label || buildCurrentFilterLabel())
const currentFilterDetails = computed(() => {
  const activeFilter = dashboard.value?.filtro
  return activeFilter ? buildFilterDescriptionFromState(activeFilter) : buildCurrentFilterDescription()
})

const serviceOptions = computed(() => filterCatalogs.value?.serviciosPrincipales || [])
const additionalOptions = computed(() => filterCatalogs.value?.serviciosAdicionales || [])
const clientOptions = computed(() => filterCatalogs.value?.clientes || [])
const petOptions = computed(() => filterCatalogs.value?.mascotas || [])

const incomeByPeriodSeries = computed(() => dashboard.value?.graficas.ingresosPorPeriodo.serie || [])
const revenueEvolutionSeries = computed(() => dashboard.value?.graficas.evolucionIngresos.serie || [])
const mainServiceSeries = computed(() => dashboard.value?.graficas.distribucionServiciosPrincipales || [])
const additionalSeries = computed(() => dashboard.value?.graficas.distribucionServiciosAdicionales || [])
const appointmentStatusSeries = computed(() => dashboard.value?.graficas.citasPorEstado || [])
const comparisonSeries = computed(() => dashboard.value?.graficas.comparativoIngresos || [])
const rankingSeries = computed(() => dashboard.value?.graficas.rankingServicios || [])
const monthlyTrendSeries = computed(() => dashboard.value?.graficas.tendenciaMensual || [])

const incomeBarOptions = computed<ApexOptions>(() => ({
  chart: baseChartOptions('bar'),
  colors: [chartPalette[0]],
  xaxis: { categories: incomeByPeriodSeries.value.map((item) => item.label), labels: axisLabels() },
  yaxis: moneyAxis(),
  plotOptions: { bar: { borderRadius: 10, columnWidth: '52%' } },
  dataLabels: { enabled: false },
  tooltip: moneyTooltip('Ingresos')
}))

const incomeBarSeries = computed(() => [{ name: 'Ingresos', data: incomeByPeriodSeries.value.map((item) => item.value) }])

const incomeLineOptions = computed<ApexOptions>(() => ({
  chart: baseChartOptions('line'),
  colors: [chartPalette[1]],
  stroke: { curve: 'smooth' as const, width: 4 },
  xaxis: { categories: revenueEvolutionSeries.value.map((item) => item.label), labels: axisLabels() },
  yaxis: moneyAxis(),
  tooltip: moneyTooltip('Ingresos'),
  markers: { size: 5, strokeWidth: 0, hover: { size: 7 } },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0.05,
      stops: [0, 90, 100]
    }
  }
}))

const incomeLineSeries = computed(() => [{ name: 'Evolución', data: revenueEvolutionSeries.value.map((item) => item.value) }])

const mainServicesDonutOptions = computed(() => donutOptions(mainServiceSeries.value.map((item) => item.label)))
const mainServicesDonutSeries = computed(() => mainServiceSeries.value.map((item) => item.value))

const additionalsDonutOptions = computed(() => donutOptions(additionalSeries.value.map((item) => item.label)))
const additionalsDonutSeries = computed(() => additionalSeries.value.map((item) => item.value))

const statusBarOptions = computed<ApexOptions>(() => ({
  chart: baseChartOptions('bar'),
  plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: '50%' } },
  xaxis: { categories: appointmentStatusSeries.value.map((item) => item.label), labels: axisLabels() },
  dataLabels: { enabled: false },
  tooltip: countTooltip('Citas'),
  colors: chartPalette
}))

const statusBarSeries = computed(() => [{ name: 'Citas', data: appointmentStatusSeries.value.map((item) => item.value) }])

const comparisonOptions = computed<ApexOptions>(() => ({
  chart: baseChartOptions('bar'),
  colors: [chartPalette[0], chartPalette[1]],
  plotOptions: { bar: { horizontal: true, borderRadius: 10, barHeight: '50%' } },
  xaxis: { categories: comparisonSeries.value.map((item) => item.label), labels: axisLabels() },
  yaxis: moneyAxis(),
  tooltip: moneyTooltip('Ingresos')
}))

const comparisonChartSeries = computed(() => [{ name: 'Ingresos', data: comparisonSeries.value.map((item) => item.value) }])

const rankingOptions = computed<ApexOptions>(() => ({
  chart: baseChartOptions('bar'),
  colors: [chartPalette[0]],
  plotOptions: { bar: { horizontal: true, borderRadius: 10, barHeight: '60%' } },
  xaxis: { categories: rankingSeries.value.map((item) => item.label), labels: axisLabels() },
  tooltip: countTooltip('Citas'),
  dataLabels: { enabled: false }
}))

const rankingChartSeries = computed(() => [{ name: 'Citas vendidas', data: rankingSeries.value.map((item) => item.value) }])

const monthlyTrendOptions = computed<ApexOptions>(() => ({
  chart: baseChartOptions('line'),
  colors: [chartPalette[0], chartPalette[1]],
  stroke: { curve: 'smooth' as const, width: [4, 3] },
  xaxis: { categories: monthlyTrendSeries.value.map((item) => item.label), labels: axisLabels() },
  yaxis: [
    moneyAxis(),
    {
      opposite: true,
      labels: {
        style: { colors: '#6f5a6d', fontFamily: chartFont }
      }
    }
  ] as ApexOptions['yaxis'],
  tooltip: {
    shared: true,
    intersect: false,
    y: [
      { formatter: (value: number) => formatCurrency(value) },
      { formatter: (value: number) => `${formatNumber(value)} citas` }
    ]
  }
}))

const monthlyTrendChartSeries = computed(() => [
  { name: 'Ingresos', type: 'area', data: monthlyTrendSeries.value.map((item) => item.ingresos) },
  { name: 'Citas', type: 'line', data: monthlyTrendSeries.value.map((item) => item.citas) }
])

const tableTabs = [
  { key: 'citasRealizadas', label: 'Citas realizadas' },
  { key: 'serviciosPrincipales', label: 'Servicios más solicitados' },
  { key: 'serviciosAdicionales', label: 'Servicios adicionales' },
  { key: 'resumenIngresos', label: 'Resumen de ingresos' },
  { key: 'citasPorEstado', label: 'Citas por estado' }
] as const

const tableConfig = computed<TableConfig | null>(() => {
  const tables = dashboard.value?.tablas
  if (!tables) {
    return null
  }

  const configs: Record<TableKey, TableConfig> = {
    citasRealizadas: {
      rows: tables.citasRealizadas as TableRow[],
      columns: [
        { key: 'fechaServicio', label: 'Fecha' },
        { key: 'clienteNombreCompleto', label: 'Cliente' },
        { key: 'mascotaNombre', label: 'Mascota' },
        { key: 'servicioPrincipalNombre', label: 'Servicio principal' },
        { key: 'serviciosAdicionalesResumen', label: 'Adicionales' },
        { key: 'precioFinal', label: 'Ingreso', format: 'currency' as const }
      ]
    },
    serviciosPrincipales: {
      rows: tables.serviciosPrincipales as TableRow[],
      columns: [
        { key: 'nombre', label: 'Servicio principal' },
        { key: 'totalCitas', label: 'Citas', format: 'number' as const },
        { key: 'totalIngresado', label: 'Ingresos', format: 'currency' as const }
      ]
    },
    serviciosAdicionales: {
      rows: tables.serviciosAdicionales as TableRow[],
      columns: [
        { key: 'nombre', label: 'Servicio adicional' },
        { key: 'totalAplicaciones', label: 'Aplicaciones', format: 'number' as const },
        { key: 'totalIngresado', label: 'Ingresos', format: 'currency' as const }
      ]
    },
    resumenIngresos: {
      rows: tables.resumenIngresos as TableRow[],
      columns: [
        { key: 'concepto', label: 'Concepto' },
        { key: 'detalle', label: 'Detalle' },
        { key: 'valor', label: 'Valor', format: 'currency' as const }
      ]
    },
    citasPorEstado: {
      rows: tables.citasPorEstado as TableRow[],
      columns: [
        { key: 'estado', label: 'Estado' },
        { key: 'totalCitas', label: 'Total', format: 'number' as const }
      ]
    }
  }

  return configs[activeTable.value]
})

const sortedTableRows = computed(() => {
  const config = tableConfig.value
  if (!config) {
    return []
  }

  const sort = tableSort[activeTable.value]
  const rows = [...config.rows]

  rows.sort((left, right) => compareValues(left[sort.key as keyof typeof left], right[sort.key as keyof typeof right], sort.direction))
  return rows
})

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  try {
    await Promise.all([loadFilterCatalogs(), loadDashboard()])
  } finally {
    loading.value = false
  }
})

async function loadFilterCatalogs() {
  const response = await apiGet<FilterCatalogResponse>('/api/reportes/catalogos')
  filterCatalogs.value = response.catalogos
}

async function loadDashboard() {
  refreshing.value = true
  error.value = ''

  try {
    dashboard.value = await apiGet<DashboardResponse>(`/api/reportes/dashboard?${buildQueryParams()}`)
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el dashboard de reportes'
  } finally {
    refreshing.value = false
  }
}

function buildQueryParams(forPdf = false) {
  const params = new URLSearchParams()
  params.set('periodo', filters.periodo)

  if (filters.periodo === 'range') {
    params.set('fechaInicio', filters.fechaInicio)
    params.set('fechaFin', filters.fechaFin)
  } else {
    params.set('fecha', filters.fecha)
  }

  if (filters.servicioId) params.set('servicioId', filters.servicioId)
  if (filters.servicioAdicionalId) params.set('servicioAdicionalId', filters.servicioAdicionalId)
  if (filters.clienteId) params.set('clienteId', filters.clienteId)
  if (filters.mascotaId) params.set('mascotaId', filters.mascotaId)
  if (filters.estadoCita && filters.estadoCita !== 'todas') params.set('estadoCita', filters.estadoCita)
  if (forPdf) params.set('tipo', 'dashboard')

  return params.toString()
}

function applyQuickRange(preset: QuickRange) {
  activeQuickRange.value = preset

  if (preset === 'today') {
    filters.periodo = 'day'
    filters.fecha = today
    return
  }

  if (preset === 'week') {
    filters.periodo = 'week'
    filters.fecha = today
    return
  }

  if (preset === 'month') {
    filters.periodo = 'month'
    filters.fecha = today
    return
  }

  if (preset === 'quarter') {
    filters.periodo = 'range'
    filters.fechaInicio = offsetMonths(today, -2, true)
    filters.fechaFin = today
    return
  }

  filters.periodo = 'range'
  filters.fechaInicio = `${today.slice(0, 4)}-01-01`
  filters.fechaFin = today
}

async function applyFilters() {
  await loadDashboard()
}

async function clearFilters() {
  filters.servicioId = ''
  filters.servicioAdicionalId = ''
  filters.clienteId = ''
  filters.mascotaId = ''
  filters.estadoCita = 'todas'
  applyQuickRange('month')
  await loadDashboard()
}

async function exportPdf() {
  const session = getSession()
  if (!session) {
    logoutToLogin()
    return
  }

  downloading.value = true
  error.value = ''

  try {
    const response = await fetch(`/api/reportes/pdf?${buildQueryParams(true)}`, {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'No se pudo generar el PDF')
    }

    const blob = await response.blob()
    const fileUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = fileUrl
    anchor.download = `dashboard-reportes-${dashboard.value?.filtro.fechaInicio || today}-${dashboard.value?.filtro.fechaFin || today}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(fileUrl)
    showToast('PDF generado correctamente')
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo descargar el PDF'
  } finally {
    downloading.value = false
  }
}

function changeSort(table: TableKey, key: string) {
  const current = tableSort[table]
  if (current.key === key) {
    current.direction = current.direction === 'asc' ? 'desc' : 'asc'
    return
  }

  current.key = key
  current.direction = 'desc'
}

function showToast(message: string) {
  toast.value = message
  window.setTimeout(() => {
    if (toast.value === message) {
      toast.value = ''
    }
  }, 4200)
}

function hasChartData(rows: Array<{ value?: number; ingresos?: number; citas?: number }>) {
  return rows.some((item) => (Number(item.value) || Number(item.ingresos) || Number(item.citas) || 0) > 0)
}

function hasChartRows(rows: Array<unknown>) {
  return rows.length > 0
}

function compareValues(left: unknown, right: unknown, direction: 'asc' | 'desc') {
  const factor = direction === 'asc' ? 1 : -1

  if (typeof left === 'number' && typeof right === 'number') {
    return (left - right) * factor
  }

  const leftDate = normalizeDateValue(left)
  const rightDate = normalizeDateValue(right)
  if (leftDate && rightDate) {
    return (leftDate.getTime() - rightDate.getTime()) * factor
  }

  const leftText = String(left ?? '').toLowerCase()
  const rightText = String(right ?? '').toLowerCase()
  return leftText.localeCompare(rightText, 'es') * factor
}

function normalizeDateValue(value: unknown) {
  if (typeof value !== 'string' || !value.includes('-')) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatCell(value: unknown, format?: 'currency' | 'number') {
  if (format === 'currency') {
    return formatCurrency(Number(value) || 0)
  }

  if (format === 'number') {
    return formatNumber(Number(value) || 0)
  }

  if (value == null || value === '') {
    return 'Sin datos'
  }

  if (typeof value === 'string' && value.includes('T')) {
    return formatDateTime(value)
  }

  return String(value)
}

function resolveRowKey(row: TableRow) {
  return String(
    row.id ??
      row.citaId ??
      row.nombre ??
      row.concepto ??
      row.estado ??
      row.fechaServicio ??
      JSON.stringify(row)
  )
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CO').format(Number(value) || 0)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(value))
}

function getBogotaDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = formatter.formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function startOfMonth(dateValue: string) {
  return `${dateValue.slice(0, 7)}-01`
}

function endOfMonth(dateValue: string) {
  const [year, month] = dateValue.slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

function offsetMonths(dateValue: string, diff: number, start = false) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + diff, start ? 1 : day))
  if (!start) {
    return date.toISOString().slice(0, 10)
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function buildCurrentFilterLabel() {
  if (filters.periodo === 'range') {
    return `Rango ${filters.fechaInicio} a ${filters.fechaFin}`
  }

  if (filters.periodo === 'week') {
    return `Semana de ${filters.fecha}`
  }

  if (filters.periodo === 'month') {
    return `Mes de ${filters.fecha.slice(0, 7)}`
  }

  return `Dia ${filters.fecha}`
}

function buildFilterDescriptionFromState(filterState: ReportFilter) {
  const details = [`Desde ${formatDateOnly(filterState.fechaInicio)} hasta ${formatDateOnly(filterState.fechaFin)}`]

  const selectedService = serviceOptions.value.find((item) => item.id === filterState.servicioId)
  const selectedAdditional = additionalOptions.value.find((item) => item.id === filterState.servicioAdicionalId)
  const selectedClient = clientOptions.value.find((item) => item.id === filterState.clienteId)
  const selectedPet = petOptions.value.find((item) => item.id === filterState.mascotaId)

  if (selectedService) details.push(`Servicio principal: ${selectedService.nombre}`)
  if (selectedAdditional) details.push(`Adicional: ${selectedAdditional.nombre}`)
  if (filterState.estadoCita !== 'todas') details.push(`Estado: ${formatAppointmentState(filterState.estadoCita)}`)
  if (selectedClient) details.push(`Cliente: ${selectedClient.nombre}`)
  if (selectedPet) details.push(`Mascota: ${selectedPet.nombre}`)

  return details.join(' · ')
}

function buildCurrentFilterDescription() {
  const currentRange = resolveCurrentFilterRange()

  return buildFilterDescriptionFromState({
    periodo: filters.periodo,
    fechaReferencia: filters.periodo === 'range' ? null : filters.fecha,
    fechaInicio: filters.periodo === 'range' ? filters.fechaInicio : currentRange.fechaInicio,
    fechaFin: filters.periodo === 'range' ? filters.fechaFin : currentRange.fechaFin,
    label: buildCurrentFilterLabel(),
    servicioId: filters.servicioId || null,
    servicioAdicionalId: filters.servicioAdicionalId || null,
    clienteId: filters.clienteId || null,
    mascotaId: filters.mascotaId || null,
    estadoCita: filters.estadoCita
  })
}

function resolveCurrentFilterRange() {
  if (filters.periodo === 'day') {
    return { fechaInicio: filters.fecha, fechaFin: filters.fecha }
  }

  if (filters.periodo === 'week') {
    const date = new Date(`${filters.fecha}T00:00:00`)
    const dayIndex = (date.getDay() + 6) % 7
    const start = new Date(date)
    start.setDate(date.getDate() - dayIndex)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    return {
      fechaInicio: toDateInput(start),
      fechaFin: toDateInput(end)
    }
  }

  return {
    fechaInicio: startOfMonth(filters.fecha),
    fechaFin: endOfMonth(filters.fecha)
  }
}

function toDateInput(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10)
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeZone: 'America/Bogota'
  }).format(new Date(`${value}T00:00:00`))
}

function formatAppointmentState(value: AppointmentState) {
  const labels: Record<AppointmentState, string> = {
    todas: 'Todas',
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    en_atencion: 'En atención',
    completada: 'Finalizada',
    cancelada: 'Cancelada',
    reprogramada: 'Reprogramada'
  }

  return labels[value]
}

function baseChartOptions(type: 'bar' | 'line'): NonNullable<ApexOptions['chart']> {
  return {
    type,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { speed: 650 },
    fontFamily: chartFont,
    foreColor: '#6f5a6d'
  }
}

function axisLabels(): NonNullable<ApexOptions['xaxis']>['labels'] {
  return {
    rotate: -25,
    hideOverlappingLabels: true,
    style: {
      colors: '#7a6072',
      fontFamily: chartFont,
      fontWeight: 600
    }
  }
}

function moneyAxis() {
  return {
    labels: {
      formatter: (value: number) =>
        new Intl.NumberFormat('es-CO', {
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(value),
      style: {
        colors: '#6f5a6d',
        fontFamily: chartFont
      }
    }
  }
}

function moneyTooltip(title: string): ApexOptions['tooltip'] {
  return {
    y: {
      formatter: (value: number) => `${title}: ${formatCurrency(value)}`
    }
  }
}

function countTooltip(title: string): ApexOptions['tooltip'] {
  return {
    y: {
      formatter: (value: number) => `${title}: ${formatNumber(value)}`
    }
  }
}

function donutOptions(labels: string[]): ApexOptions {
  return {
    chart: {
      type: 'donut' as const,
      toolbar: { show: false },
      fontFamily: chartFont
    },
    colors: chartPalette,
    labels,
    legend: {
      position: 'bottom' as const,
      fontSize: '13px',
      fontFamily: chartFont
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `${value.toFixed(0)}%`
    },
    stroke: {
      colors: ['#ffffff']
    }
  }
}
</script>

<template>
  <main class="admin-reports-page">
    <section v-if="loading" class="admin-shell state-card">
      <h1>Cargando dashboard de reportes...</h1>
      <p>Estamos conectando ingresos, citas realizadas y comportamiento operativo del negocio.</p>
    </section>

    <section v-else-if="error && !dashboard" class="admin-shell state-card">
      <h1>No pudimos abrir reportes</h1>
      <p>{{ error }}</p>
      <div class="card-actions">
        <a href="/login" class="btn-secondary">Volver al acceso</a>
        <button type="button" class="btn-primary" @click="logoutToLogin">Cerrar sesión</button>
      </div>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="admin-shell hero-card">
        <div class="hero-copy">
          <span class="section-kicker">Panel de resultados</span>
          <h1>Un tablero vivo para entender ingresos, citas y decisiones del negocio</h1>
          <p>
            Este módulo toma la información real desde <code>historial_citas</code> y desde las
            citas del sistema para mostrar indicadores accionables, gráficas comparativas y tablas
            dinámicas listas para análisis administrativo.
          </p>
          <div class="hero-note-card">
            <strong>Regla financiera aplicada</strong>
            <p>
              Los ingresos se calculan únicamente con citas ya finalizadas. Sobre ese total se
              proyecta el 30% para insumos o reserva y el 70% como ganancia neta estimada.
            </p>
          </div>
        </div>

        <div class="hero-filters">
          <div class="quick-range-row">
            <button
              v-for="preset in [
                { key: 'today', label: 'Hoy' },
                { key: 'week', label: 'Esta semana' },
                { key: 'month', label: 'Este mes' },
                { key: 'quarter', label: 'Ultimos 3 meses' },
                { key: 'year', label: 'Año actual' }
              ]"
              :key="preset.key"
              type="button"
              class="quick-chip"
              :class="{ active: activeQuickRange === preset.key }"
              @click="applyQuickRange(preset.key as QuickRange)"
            >
              {{ preset.label }}
            </button>
          </div>

          <div class="filter-grid">
            <label class="field-group">
              <span>Periodo</span>
              <select v-model="filters.periodo">
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="range">Rango personalizado</option>
              </select>
            </label>

            <label v-if="filters.periodo !== 'range'" class="field-group">
              <span>Fecha de referencia</span>
              <input v-model="filters.fecha" type="date">
            </label>

            <template v-else>
              <label class="field-group">
                <span>Fecha inicial</span>
                <input v-model="filters.fechaInicio" type="date">
              </label>
              <label class="field-group">
                <span>Fecha final</span>
                <input v-model="filters.fechaFin" type="date">
              </label>
            </template>

            <label class="field-group">
              <span>Servicio principal</span>
              <select v-model="filters.servicioId">
                <option value="">Todos los servicios</option>
                <option v-for="service in serviceOptions" :key="service.id" :value="service.id">
                  {{ service.nombre }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Servicio adicional</span>
              <select v-model="filters.servicioAdicionalId">
                <option value="">Todos los adicionales</option>
                <option v-for="service in additionalOptions" :key="service.id" :value="service.id">
                  {{ service.nombre }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Estado de cita</span>
              <select v-model="filters.estadoCita">
                <option value="todas">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="confirmada">Confirmadas</option>
                <option value="en_atencion">En atención</option>
                <option value="completada">Finalizadas</option>
                <option value="cancelada">Canceladas</option>
                <option value="reprogramada">Reprogramadas</option>
              </select>
            </label>

            <label class="field-group">
              <span>Cliente</span>
              <select v-model="filters.clienteId">
                <option value="">Todos los clientes</option>
                <option v-for="customer in clientOptions" :key="customer.id" :value="customer.id">
                  {{ customer.nombre }}
                  <template v-if="customer.cedula"> · {{ customer.cedula }}</template>
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Mascota</span>
              <select v-model="filters.mascotaId">
                <option value="">Todas las mascotas</option>
                <option v-for="pet in petOptions" :key="pet.id" :value="pet.id">
                  {{ pet.nombre }}
                  <template v-if="pet.clienteNombreCompleto"> · {{ pet.clienteNombreCompleto }}</template>
                </option>
              </select>
            </label>
          </div>

          <div class="card-actions">
            <button type="button" class="btn-primary" :disabled="refreshing" @click="applyFilters">
              {{ refreshing ? 'Actualizando...' : 'Aplicar filtros' }}
            </button>
            <button type="button" class="btn-secondary" @click="clearFilters">Limpiar filtros</button>
            <button type="button" class="btn-secondary dark" :disabled="downloading" @click="exportPdf">
              {{ downloading ? 'Generando PDF...' : 'Exportar PDF' }}
            </button>
          </div>
        </div>
      </section>

      <section class="summary-grid kpi-grid">
        <article v-for="card in kpiCards" :key="card.label" class="summary-card" :class="card.tone">
          <strong>{{ card.label }}</strong>
          <span>{{ card.value }}</span>
          <small>{{ card.helper }}</small>
        </article>
      </section>

      <section class="admin-shell section-card">
        <div class="section-header">
          <div>
            <span class="section-kicker">Lectura del periodo</span>
            <h2>{{ currentFilterLabel }}</h2>
            <p class="period-reading">{{ currentFilterDetails }}</p>
          </div>
          <small class="period-label">Actualizado con filtros en vivo</small>
        </div>

        <p v-if="toast" class="toast-message">{{ toast }}</p>
        <p v-if="error" class="inline-error">{{ error }}</p>
        <p v-if="dashboard?.estadoVacio.mensaje" class="empty-inline">
          {{ dashboard.estadoVacio.mensaje }}
        </p>

        <div class="charts-grid">
          <article class="chart-card wide">
            <div class="chart-header">
              <div>
                <strong>Ingresos por periodo</strong>
                <small>Barra clara para ver cuánto entró por tramo del filtro actual.</small>
              </div>
            </div>
            <div class="chart-stage">
              <div class="chart-wrapper" :class="{ muted: hasChartRows(incomeByPeriodSeries) && !hasChartData(incomeByPeriodSeries) }">
                <VueApexCharts type="bar" height="320" :options="incomeBarOptions" :series="incomeBarSeries" />
              </div>
              <div v-if="hasChartRows(incomeByPeriodSeries) && !hasChartData(incomeByPeriodSeries)" class="chart-overlay">
                No hay ingresos finalizados en este rango para construir la gráfica.
              </div>
            </div>
          </article>

          <article class="chart-card wide">
            <div class="chart-header">
              <div>
                <strong>Evolución de ingresos</strong>
                <small>Tendencia temporal para detectar subidas, caídas y picos.</small>
              </div>
            </div>
            <div class="chart-stage">
              <div class="chart-wrapper" :class="{ muted: hasChartRows(revenueEvolutionSeries) && !hasChartData(revenueEvolutionSeries) }">
                <VueApexCharts type="line" height="320" :options="incomeLineOptions" :series="incomeLineSeries" />
              </div>
              <div v-if="hasChartRows(revenueEvolutionSeries) && !hasChartData(revenueEvolutionSeries)" class="chart-overlay">
                El periodo sí está cargado, pero todavía no tiene ingresos finalizados para dibujar una tendencia útil.
              </div>
            </div>
          </article>

          <article class="chart-card">
            <div class="chart-header">
              <div>
                <strong>Distribución de servicios principales</strong>
                <small>Participación de cada servicio fijo en las citas realizadas.</small>
              </div>
            </div>
            <div v-if="hasChartData(mainServiceSeries)" class="chart-wrapper">
              <VueApexCharts type="donut" height="320" :options="mainServicesDonutOptions" :series="mainServicesDonutSeries" />
            </div>
            <div v-else class="empty-box">Sin servicios principales finalizados en el periodo.</div>
          </article>

          <article class="chart-card">
            <div class="chart-header">
              <div>
                <strong>Distribución de servicios adicionales</strong>
                <small>Muestra qué extras están siendo más comprados.</small>
              </div>
            </div>
            <div v-if="hasChartData(additionalSeries)" class="chart-wrapper">
              <VueApexCharts type="donut" height="320" :options="additionalsDonutOptions" :series="additionalsDonutSeries" />
            </div>
            <div v-else class="empty-box">No hay adicionales registrados en el rango seleccionado.</div>
          </article>

          <article class="chart-card">
            <div class="chart-header">
              <div>
                <strong>Citas por estado</strong>
                <small>Controla el peso operativo entre pendientes, confirmadas y canceladas.</small>
              </div>
            </div>
            <div class="chart-stage">
              <div class="chart-wrapper" :class="{ muted: hasChartRows(appointmentStatusSeries) && !hasChartData(appointmentStatusSeries) }">
                <VueApexCharts type="bar" height="320" :options="statusBarOptions" :series="statusBarSeries" />
              </div>
              <div v-if="hasChartRows(appointmentStatusSeries) && !hasChartData(appointmentStatusSeries)" class="chart-overlay">
                No encontramos citas en el periodo y filtros actuales.
              </div>
            </div>
          </article>

          <article class="chart-card">
            <div class="chart-header">
              <div>
                <strong>Comparativo de ingresos</strong>
                <small>Compara lo que produce el servicio principal frente a los adicionales.</small>
              </div>
            </div>
            <div class="chart-stage">
              <div class="chart-wrapper" :class="{ muted: hasChartRows(comparisonSeries) && !hasChartData(comparisonSeries) }">
                <VueApexCharts type="bar" height="320" :options="comparisonOptions" :series="comparisonChartSeries" />
              </div>
              <div v-if="hasChartRows(comparisonSeries) && !hasChartData(comparisonSeries)" class="chart-overlay">
                No hay datos comparables para el filtro actual.
              </div>
            </div>
          </article>

          <article class="chart-card wide">
            <div class="chart-header">
              <div>
                <strong>Ranking de servicios más vendidos</strong>
                <small>Te ayuda a identificar rápidamente qué servicio jalona la operación.</small>
              </div>
            </div>
            <div class="chart-stage">
              <div class="chart-wrapper" :class="{ muted: hasChartRows(rankingSeries) && !hasChartData(rankingSeries) }">
                <VueApexCharts type="bar" height="320" :options="rankingOptions" :series="rankingChartSeries" />
              </div>
              <div v-if="hasChartRows(rankingSeries) && !hasChartData(rankingSeries)" class="chart-overlay">
                El ranking está listo, pero este periodo aún no acumula ventas finalizadas.
              </div>
            </div>
          </article>

          <article class="chart-card wide">
            <div class="chart-header">
              <div>
                <strong>Tendencia mensual</strong>
                <small>Combina ingresos y volumen para comparar meses con una lectura tipo Power BI.</small>
              </div>
            </div>
            <div class="chart-stage">
              <div class="chart-wrapper" :class="{ muted: hasChartRows(monthlyTrendSeries) && !hasChartData(monthlyTrendSeries) }">
                <VueApexCharts type="line" height="340" :options="monthlyTrendOptions" :series="monthlyTrendChartSeries" />
              </div>
              <div v-if="hasChartRows(monthlyTrendSeries) && !hasChartData(monthlyTrendSeries)" class="chart-overlay">
                El histórico mensual está reservado, pero todavía no registra ingresos o citas finalizadas en este rango.
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="admin-shell section-card">
        <div class="section-header">
          <div>
            <span class="section-kicker">Tablas dinámicas</span>
            <h2>Desglose operativo del periodo</h2>
          </div>
          <small class="period-label">Ordena y cambia entre tablas según la pregunta de negocio</small>
        </div>

        <div class="table-tabs">
          <button
            v-for="tab in tableTabs"
            :key="tab.key"
            type="button"
            class="table-tab"
            :class="{ active: activeTable === tab.key }"
            @click="activeTable = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="tableConfig" class="table-shell">
          <div class="table-scroll">
            <table class="report-table">
              <thead>
                <tr>
                  <th
                    v-for="column in tableConfig.columns"
                    :key="column.key"
                    scope="col"
                  >
                    <button type="button" class="sort-button" @click="changeSort(activeTable, column.key)">
                      <span>{{ column.label }}</span>
                      <small v-if="tableSort[activeTable].key === column.key">
                        {{ tableSort[activeTable].direction === 'asc' ? '↑' : '↓' }}
                      </small>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!sortedTableRows.length">
                  <td :colspan="tableConfig.columns.length" class="empty-cell">
                    No encontramos registros para esta tabla con el filtro actual.
                  </td>
                </tr>
                <tr v-for="row in sortedTableRows" v-else :key="resolveRowKey(row)">
                  <td v-for="column in tableConfig.columns" :key="column.key">
                    {{ formatCell(row[column.key], column.format) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.admin-reports-page {
  width: min(1680px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 24px 0 56px;
}

.admin-shell,
.summary-card,
.chart-card {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 26px 80px rgba(186, 84, 145, 0.12);
}

.state-card,
.hero-card,
.section-card {
  padding: 30px 32px;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(480px, 0.95fr);
  gap: 22px;
}

.section-kicker {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff3fa 0%, #eef9ff 100%);
  color: #9c0076;
  font-size: 0.86rem;
  font-weight: 700;
}

.hero-copy h1,
.section-header h2 {
  margin: 16px 0 12px;
  color: #94186f;
}

.period-reading {
  margin: 0;
  color: #624d5f;
  line-height: 1.65;
  max-width: 880px;
}

.hero-copy h1 {
  font-size: clamp(2.2rem, 3vw, 3.2rem);
}

.hero-copy p,
.hero-note-card p,
.empty-inline {
  color: #624d5f;
  line-height: 1.7;
}

.hero-note-card,
.empty-box {
  margin-top: 18px;
  border-radius: 24px;
  border: 1px solid rgba(245, 210, 231, 0.95);
  background: linear-gradient(135deg, rgba(255, 249, 252, 0.98), rgba(238, 249, 255, 0.98));
  padding: 18px 20px;
}

.hero-note-card strong {
  display: block;
  margin-bottom: 8px;
  color: #94186f;
}

.hero-filters {
  display: grid;
  gap: 16px;
  align-content: start;
}

.quick-range-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-chip {
  border: 1px solid rgba(241, 181, 213, 0.95);
  background: rgba(255, 255, 255, 0.9);
  color: #8f176e;
  padding: 10px 16px;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.quick-chip.active {
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  color: #fff;
  box-shadow: 0 16px 26px rgba(143, 23, 110, 0.2);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-group {
  display: grid;
  gap: 8px;
  color: #8f176e;
  font-weight: 700;
}

.field-group input,
.field-group select {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(241, 181, 213, 0.95);
  background: rgba(255, 255, 255, 0.96);
  padding: 14px 16px;
  font: inherit;
  color: #4d2d47;
}

.field-group input:focus,
.field-group select:focus {
  outline: none;
  border-color: rgba(219, 67, 175, 0.9);
  box-shadow: 0 0 0 4px rgba(233, 90, 219, 0.16);
}

.card-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  border: none;
  border-radius: 999px;
  padding: 14px 22px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  color: #fff;
  box-shadow: 0 18px 28px var(--sp-primary-shadow);
}

.btn-secondary {
  background: #fff;
  color: #8f176e;
  border: 1px solid rgba(241, 181, 213, 0.95);
}

.btn-secondary.dark {
  background: #1a202c;
  color: #fff;
  border-color: #1a202c;
}

.summary-grid {
  display: grid;
  gap: 16px;
  margin: 20px 0;
}

.kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-card {
  padding: 20px 22px;
}

.summary-card strong {
  display: block;
  color: #8f176e;
  min-height: 42px;
}

.summary-card span {
  display: block;
  margin-top: 10px;
  font-size: 1.95rem;
  font-weight: 800;
  color: #51304c;
}

.summary-card small {
  display: block;
  margin-top: 8px;
  color: #7a6072;
  line-height: 1.45;
}

.summary-card.pink { background: linear-gradient(135deg, rgba(255, 245, 251, 0.98), rgba(255, 255, 255, 0.98)); }
.summary-card.mint { background: linear-gradient(135deg, rgba(235, 255, 251, 0.98), rgba(255, 255, 255, 0.98)); }
.summary-card.sky { background: linear-gradient(135deg, rgba(238, 249, 255, 0.98), rgba(255, 255, 255, 0.98)); }
.summary-card.lavender { background: linear-gradient(135deg, rgba(247, 242, 255, 0.98), rgba(255, 255, 255, 0.98)); }
.summary-card.rose { background: linear-gradient(135deg, rgba(255, 242, 246, 0.98), rgba(255, 255, 255, 0.98)); }
.summary-card.sand { background: linear-gradient(135deg, rgba(255, 249, 236, 0.98), rgba(255, 255, 255, 0.98)); }

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
  margin-bottom: 18px;
}

.section-header h2 {
  font-size: clamp(1.8rem, 2.5vw, 2.6rem);
}

.period-label {
  color: #7a6072;
  font-weight: 700;
}

.empty-inline,
.toast-message,
.inline-error {
  border-radius: 18px;
  padding: 14px 16px;
  font-weight: 600;
}

.empty-inline {
  background: rgba(255, 249, 252, 0.94);
  border: 1px solid rgba(245, 210, 231, 0.95);
}

.toast-message {
  background: rgba(232, 255, 248, 0.96);
  color: #188b78;
  border: 1px solid rgba(126, 227, 197, 0.8);
}

.inline-error {
  background: rgba(255, 241, 244, 0.96);
  color: #c33b74;
  border: 1px solid rgba(255, 201, 215, 0.9);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.chart-card {
  padding: 20px;
}

.chart-card.wide {
  grid-column: span 2;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.chart-header strong {
  display: block;
  color: #8f176e;
  font-size: 1.05rem;
}

.chart-header small {
  color: #7a6072;
  line-height: 1.55;
}

.chart-stage {
  position: relative;
}

.chart-wrapper {
  min-height: 320px;
}

.chart-wrapper.muted {
  opacity: 0.38;
  filter: saturate(0.65);
}

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: #7a6072;
  font-weight: 600;
  line-height: 1.55;
  pointer-events: none;
}


.table-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.table-tab {
  border: 1px solid rgba(241, 181, 213, 0.95);
  background: rgba(255, 255, 255, 0.9);
  color: #8f176e;
  border-radius: 999px;
  padding: 10px 16px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.table-tab.active {
  background: linear-gradient(135deg, var(--sp-primary-purple) 0%, var(--sp-primary-purple-deep) 100%);
  color: #fff;
}

.table-shell {
  border-radius: 24px;
  border: 1px solid rgba(245, 210, 231, 0.95);
  background: linear-gradient(135deg, rgba(255, 249, 252, 0.98), rgba(238, 249, 255, 0.98));
}

.table-scroll {
  overflow: auto;
}

.report-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  padding: 15px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(238, 223, 232, 0.96);
}

.report-table th {
  background: rgba(255, 255, 255, 0.72);
}

.report-table td {
  color: #51304c;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: #8f176e;
  font-weight: 800;
  cursor: pointer;
}

.empty-cell {
  text-align: center !important;
  color: #7a6072 !important;
  font-weight: 700;
}

@media (max-width: 1320px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hero-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1040px) {
  .charts-grid,
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .chart-card.wide {
    grid-column: auto;
  }
}

@media (max-width: 760px) {
  .admin-reports-page {
    width: min(100vw - 20px, 100%);
    padding-top: 12px;
  }

  .state-card,
  .hero-card,
  .section-card {
    padding: 22px 18px;
    border-radius: 24px;
  }

  .filter-grid,
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .section-header,
  .chart-header {
    flex-direction: column;
  }
}
</style>


