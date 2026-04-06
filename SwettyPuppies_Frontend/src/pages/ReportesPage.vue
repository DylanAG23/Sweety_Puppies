<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet } from '@/lib/api'
import { getSession, logoutToLogin, requireRole } from '@/lib/session'
import AdminSiteHeader from '@/components/AdminSiteHeader.vue'

type ReportType = 'ganancias' | 'adicionales' | 'citas' | 'resumen'
type PeriodType = 'day' | 'week' | 'month' | 'range'
type TrendMetric = 'citas' | 'ganancias'

type ReportFilter = {
  periodo: PeriodType
  fechaReferencia: string | null
  fechaInicio: string
  fechaFin: string
  label: string
}

type RevenueServiceItem = {
  nombre: string
  totalCitas: number
  totalIngresado: number
}

type AdditionalItem = {
  id: string
  nombre: string
  totalAplicaciones: number
  totalIngresado: number
}

type RevenueReportPayload = {
  totalIngresado: number
  totalCitasRealizadas: number
  promedioPorCita: number
  serviciosPrincipales: RevenueServiceItem[]
}

type AdditionalReportPayload = {
  totalIngresado: number
  totalAplicaciones: number
  adicionales: AdditionalItem[]
}

type CompletedServicesReportPayload = {
  totalCitasRealizadas: number
  totalServiciosPrincipales: number
  totalAdicionalesAplicados: number
  serviciosPrincipales: RevenueServiceItem[]
}

type FinancialSummaryPayload = {
  totalIngresado: number
  fondoInsumos: number
  gananciaNeta: number
  totalCitasRealizadas: number
  promedioPorCita: number
}

type RevenueResponse = {
  success: boolean
  tipo: 'ganancias'
  filtro: ReportFilter
  reporte: RevenueReportPayload
}

type AdditionalResponse = {
  success: boolean
  tipo: 'adicionales'
  filtro: ReportFilter
  reporte: AdditionalReportPayload
}

type CompletedResponse = {
  success: boolean
  tipo: 'citas'
  filtro: ReportFilter
  reporte: CompletedServicesReportPayload
}

type FinancialResponse = {
  success: boolean
  tipo: 'resumen'
  filtro: ReportFilter
  reporte: FinancialSummaryPayload
}

type TrendPoint = {
  key: string
  label: string
  value: number
}

type TrendPayload = {
  metrica: TrendMetric
  granularidad: 'hour' | 'day' | 'month'
  serie: TrendPoint[]
  resumen: {
    total: number
    maximo: number
    promedio: number
    mejorEtiqueta: string | null
  }
}

type TrendResponse = {
  success: boolean
  tipo: 'grafica'
  filtro: ReportFilter
  grafica: TrendPayload
}

const currentPath = window.location.pathname.toLowerCase()
const loading = ref(true)
const downloading = ref(false)
const error = ref('')
const toast = ref('')
const selectedReport = ref<ReportType>('ganancias')
const trendMetric = ref<TrendMetric>('citas')
const period = ref<PeriodType>('month')
const singleDate = ref(new Date().toISOString().slice(0, 10))
const rangeStart = ref(new Date().toISOString().slice(0, 10))
const rangeEnd = ref(new Date().toISOString().slice(0, 10))
const revenueReport = ref<RevenueResponse | null>(null)
const additionalReport = ref<AdditionalResponse | null>(null)
const completedReport = ref<CompletedResponse | null>(null)
const financialReport = ref<FinancialResponse | null>(null)
const trendReport = ref<TrendResponse | null>(null)
const chartWidth = 860
const chartHeight = 320
const chartPadding = { top: 28, right: 24, bottom: 54, left: 58 }

const reportOptions = [
  {
    value: 'ganancias',
    title: 'Ganancias totales',
    description: 'Consulta lo ingresado por citas ya completadas y cobradas en el local.',
  },
  {
    value: 'adicionales',
    title: 'Adicionales',
    description: 'Analiza cuanto dinero estan generando los servicios adicionales aplicados.',
  },
  {
    value: 'citas',
    title: 'Citas realizadas',
    description: 'Mide volumen de atenciones terminadas y los servicios principales mas usados.',
  },
  {
    value: 'resumen',
    title: 'Resumen 30 / 70',
    description: 'Visualiza la distribucion operativa entre insumos y ganancia neta considerada.',
  },
] as const satisfies ReadonlyArray<{ value: ReportType; title: string; description: string }>

const currentFilter = computed(() => {
  if (selectedReport.value === 'adicionales') {
    return additionalReport.value?.filtro || null
  }

  if (selectedReport.value === 'citas') {
    return completedReport.value?.filtro || null
  }

  if (selectedReport.value === 'resumen') {
    return financialReport.value?.filtro || null
  }

  return revenueReport.value?.filtro || null
})

const summaryCards = computed(() => {
  if (selectedReport.value === 'adicionales' && additionalReport.value) {
    return [
      { label: 'Ingreso por adicionales', value: formatCurrency(additionalReport.value.reporte.totalIngresado), tone: 'pink' },
      { label: 'Aplicaciones', value: String(additionalReport.value.reporte.totalAplicaciones), tone: 'lavender' },
      { label: 'Adicional lider', value: additionalReport.value.reporte.adicionales[0]?.nombre || 'Sin registros', tone: 'sky' },
    ]
  }

  if (selectedReport.value === 'citas' && completedReport.value) {
    return [
      { label: 'Citas realizadas', value: String(completedReport.value.reporte.totalCitasRealizadas), tone: 'pink' },
      { label: 'Servicios principales', value: String(completedReport.value.reporte.totalServiciosPrincipales), tone: 'lavender' },
      { label: 'Adicionales aplicados', value: String(completedReport.value.reporte.totalAdicionalesAplicados), tone: 'sky' },
    ]
  }

  if (selectedReport.value === 'resumen' && financialReport.value) {
    return [
      { label: 'Total ingresado', value: formatCurrency(financialReport.value.reporte.totalIngresado), tone: 'pink' },
      { label: '30% insumos', value: formatCurrency(financialReport.value.reporte.fondoInsumos), tone: 'lavender' },
      { label: '70% ganancia neta', value: formatCurrency(financialReport.value.reporte.gananciaNeta), tone: 'mint' },
    ]
  }

  if (revenueReport.value) {
    return [
      { label: 'Total ingresado', value: formatCurrency(revenueReport.value.reporte.totalIngresado), tone: 'pink' },
      { label: 'Citas realizadas', value: String(revenueReport.value.reporte.totalCitasRealizadas), tone: 'lavender' },
      { label: 'Promedio por cita', value: formatCurrency(revenueReport.value.reporte.promedioPorCita), tone: 'sky' },
    ]
  }

  return []
})

const selectedOption = computed(
  () => reportOptions.find((option) => option.value === selectedReport.value) || reportOptions[0]
)

const trendPoints = computed(() => trendReport.value?.grafica.serie || [])

const trendMetricLabel = computed(() =>
  trendMetric.value === 'ganancias' ? 'Ganancias totales' : 'Cantidad de citas realizadas'
)

const chartMaxValue = computed(() =>
  Math.max(...trendPoints.value.map((point) => Number(point.value) || 0), 1)
)

const chartPlotPoints = computed(() => {
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const lastIndex = Math.max(trendPoints.value.length - 1, 1)

  return trendPoints.value.map((point, index) => {
    const x =
      trendPoints.value.length === 1
        ? chartPadding.left + innerWidth / 2
        : chartPadding.left + (index / lastIndex) * innerWidth
    const y =
      chartPadding.top + innerHeight - ((Number(point.value) || 0) / chartMaxValue.value) * innerHeight

    return {
      ...point,
      x,
      y,
    }
  })
})

const chartPolyline = computed(() => chartPlotPoints.value.map((point) => `${point.x},${point.y}`).join(' '))

const chartGrid = computed(() => {
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom
  return Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    const value = Math.round(chartMaxValue.value * (1 - ratio))
    const y = chartPadding.top + innerHeight * ratio
    return {
      y,
      value,
      label:
        trendMetric.value === 'ganancias'
          ? formatCompactCurrency(value)
          : formatNumber(value),
    }
  })
})

const chartLabelStep = computed(() => {
  const total = trendPoints.value.length
  if (total <= 8) {
    return 1
  }
  if (total <= 16) {
    return 2
  }
  return Math.ceil(total / 7)
})

const trendInsightCards = computed(() => {
  if (!trendReport.value) {
    return []
  }

  return [
    {
      label: trendMetric.value === 'ganancias' ? 'Ingreso acumulado del periodo' : 'Citas acumuladas del periodo',
      value:
        trendMetric.value === 'ganancias'
          ? formatCurrency(trendReport.value.grafica.resumen.total)
          : formatNumber(trendReport.value.grafica.resumen.total),
      tone: 'pink',
    },
    {
      label: 'Pico mas alto',
      value:
        trendMetric.value === 'ganancias'
          ? formatCurrency(trendReport.value.grafica.resumen.maximo)
          : formatNumber(trendReport.value.grafica.resumen.maximo),
      helper: trendReport.value.grafica.resumen.mejorEtiqueta || 'Sin datos',
      tone: 'lavender',
    },
    {
      label: 'Promedio por tramo',
      value:
        trendMetric.value === 'ganancias'
          ? formatCurrency(trendReport.value.grafica.resumen.promedio)
          : formatNumber(trendReport.value.grafica.resumen.promedio),
      tone: 'sky',
    },
  ]
})

onMounted(async () => {
  document.body.className = 'cliente-portal-body'

  const session = requireRole('administrador')
  if (!session) {
    loading.value = false
    return
  }

  await loadReport()
})

function buildQueryParams(forPdf = false) {
  const params = new URLSearchParams()
  params.set('periodo', period.value)

  if (period.value === 'range') {
    params.set('fechaInicio', rangeStart.value)
    params.set('fechaFin', rangeEnd.value)
  } else {
    params.set('fecha', singleDate.value)
  }

  if (forPdf) {
    params.set('tipo', selectedReport.value)
  }

  return params.toString()
}

async function loadReport() {
  loading.value = true
  error.value = ''

  try {
    const query = buildQueryParams()
    await Promise.all([loadSelectedReport(query), loadTrendReport(query)])
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el reporte'
  } finally {
    loading.value = false
  }
}

async function changeReport(value: ReportType) {
  selectedReport.value = value
  await loadReport()
}

async function loadSelectedReport(query: string) {
  if (selectedReport.value === 'adicionales') {
    additionalReport.value = await apiGet<AdditionalResponse>(`/api/reportes/adicionales?${query}`)
    return
  }

  if (selectedReport.value === 'citas') {
    completedReport.value = await apiGet<CompletedResponse>(`/api/reportes/citas-realizadas?${query}`)
    return
  }

  if (selectedReport.value === 'resumen') {
    financialReport.value = await apiGet<FinancialResponse>(`/api/reportes/resumen-financiero?${query}`)
    return
  }

  revenueReport.value = await apiGet<RevenueResponse>(`/api/reportes/ganancias?${query}`)
}

async function loadTrendReport(query = buildQueryParams()) {
  trendReport.value = await apiGet<TrendResponse>(`/api/reportes/grafica?${query}&metrica=${trendMetric.value}`)
}

async function downloadPdf() {
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
        Authorization: `Bearer ${session.token}`,
      },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'No se pudo generar el PDF')
    }

    const blob = await response.blob()
    const fileUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = fileUrl
    anchor.download = `reporte-${selectedReport.value}.pdf`
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

function showToast(message: string) {
  toast.value = message
  window.setTimeout(() => {
    if (toast.value === message) {
      toast.value = ''
    }
  }, 4200)
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CO').format(Number(value) || 0)
}

function formatCompactCurrency(value: number | null | undefined) {
  const amount = Number(value) || 0
  if (amount === 0) {
    return '$0'
  }

  return `$${new Intl.NumberFormat('es-CO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)}`
}
</script>

<template>
  <main class="admin-reports-page">
    <section v-if="loading" class="admin-shell state-card">
      <h1>Cargando reportes...</h1>
      <p>Estamos preparando las cifras reales del negocio desde las citas ya completadas.</p>
    </section>

    <section v-else-if="error && !summaryCards.length" class="admin-shell state-card">
      <h1>No pudimos abrir los reportes</h1>
      <p>{{ error }}</p>
      <div class="card-actions">
        <a href="/login" class="btn-secondary">Volver al acceso</a>
        <button type="button" class="btn-primary" @click="logoutToLogin">Cerrar sesion</button>
      </div>
    </section>

    <template v-else>
      <AdminSiteHeader :current-path="currentPath" />

      <section class="admin-shell hero-card">
        <div class="hero-copy">
          <span class="section-kicker">Reportes del negocio</span>
          <h1>Numeros claros para tomar decisiones lindas y rentables</h1>
          <p>
            Aqui la administradora revisa solo ingresos reales generados por citas ya realizadas,
            separando adicionales, volumen operativo y la distribucion financiera 30 / 70.
          </p>

          <div class="hero-note-card">
            <strong>Fuente oficial</strong>
            <p>
              Todos estos reportes salen de <code>historial_citas</code> y de los adicionales
              realmente aplicados a citas completadas.
            </p>
          </div>
        </div>

        <div class="hero-filters">
          <div class="filter-grid">
            <label class="field-group">
              <span>Tipo de reporte</span>
              <select v-model="selectedReport" @change="loadReport">
                <option v-for="option in reportOptions" :key="option.value" :value="option.value">
                  {{ option.title }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Periodo</span>
              <select v-model="period">
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="range">Rango personalizado</option>
              </select>
            </label>

            <label v-if="period !== 'range'" class="field-group">
              <span>Fecha de referencia</span>
              <input v-model="singleDate" type="date">
            </label>

            <template v-else>
              <label class="field-group">
                <span>Fecha inicial</span>
                <input v-model="rangeStart" type="date">
              </label>
              <label class="field-group">
                <span>Fecha final</span>
                <input v-model="rangeEnd" type="date">
              </label>
            </template>
          </div>

          <p class="filter-description">
            {{ selectedOption.description }}
          </p>

          <div class="card-actions">
            <button type="button" class="btn-primary" @click="loadReport">Consultar reporte</button>
            <button type="button" class="btn-secondary" :disabled="downloading" @click="downloadPdf">
              {{ downloading ? 'Generando PDF...' : 'Generar PDF' }}
            </button>
          </div>
        </div>
      </section>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="summary-card" :class="card.tone">
          <strong>{{ card.label }}</strong>
          <span>{{ card.value }}</span>
        </article>
      </section>

      <section class="admin-shell section-card chart-dashboard">
        <div class="section-header">
          <div>
            <span class="section-kicker">Dashboard estadistico</span>
            <h2>Grafica comparativa del comportamiento del negocio</h2>
          </div>
          <small class="period-label">{{ currentFilter?.label || 'Periodo por definir' }}</small>
        </div>

        <div class="chart-toolbar">
          <label class="field-group compact-field">
            <span>Metrica a visualizar</span>
            <select v-model="trendMetric" @change="loadTrendReport()">
              <option value="citas">Cantidad de citas realizadas</option>
              <option value="ganancias">Ganancias totales</option>
            </select>
          </label>

          <p class="chart-caption">
            Explora el comportamiento por {{ trendMetricLabel.toLowerCase() }} usando el mismo filtro de
            dia, semana, mes o rango personalizado.
          </p>
        </div>

        <div class="summary-grid trend-insights">
          <article v-for="card in trendInsightCards" :key="card.label" class="summary-card" :class="card.tone">
            <strong>{{ card.label }}</strong>
            <span>{{ card.value }}</span>
            <small v-if="card.helper">{{ card.helper }}</small>
          </article>
        </div>

        <div v-if="chartPlotPoints.length" class="chart-stage">
          <svg class="trend-chart" :viewBox="`0 0 ${chartWidth} ${chartHeight}`" preserveAspectRatio="none">
            <line
              v-for="grid in chartGrid"
              :key="`grid-${grid.y}`"
              :x1="chartPadding.left"
              :x2="chartWidth - chartPadding.right"
              :y1="grid.y"
              :y2="grid.y"
              class="grid-line"
            />

            <text
              v-for="grid in chartGrid"
              :key="`label-${grid.y}`"
              :x="chartPadding.left - 10"
              :y="grid.y + 4"
              class="axis-label"
              text-anchor="end"
            >
              {{ grid.label }}
            </text>

            <polyline :points="chartPolyline" class="trend-line" />

            <template v-for="(point, index) in chartPlotPoints" :key="point.key">
              <circle :cx="point.x" :cy="point.y" r="6" class="trend-dot" />
              <text
                v-if="index % chartLabelStep === 0 || index === chartPlotPoints.length - 1"
                :x="point.x"
                :y="chartHeight - 16"
                class="x-axis-label"
                text-anchor="middle"
              >
                {{ point.label }}
              </text>
            </template>
          </svg>
        </div>
        <div v-else class="empty-box">
          Todavia no hay datos suficientes para construir la grafica del periodo consultado.
        </div>
      </section>

      <section class="admin-shell section-card">
        <div class="section-header">
          <div>
            <span class="section-kicker">Resultado consultado</span>
            <h2>{{ selectedOption.title }}</h2>
          </div>
          <small class="period-label">{{ currentFilter?.label || 'Periodo por definir' }}</small>
        </div>

        <p v-if="toast" class="toast-message">{{ toast }}</p>
        <p v-if="error" class="inline-error">{{ error }}</p>

        <template v-if="selectedReport === 'ganancias' && revenueReport">
          <div class="insight-card">
            <strong>Ingreso promedio por cita</strong>
            <span>{{ formatCurrency(revenueReport.reporte.promedioPorCita) }}</span>
            <small>Calculado solo con citas completadas dentro del periodo.</small>
          </div>

          <div v-if="revenueReport.reporte.serviciosPrincipales.length" class="report-list">
            <article v-for="item in revenueReport.reporte.serviciosPrincipales" :key="item.nombre" class="report-row">
              <div>
                <strong>{{ item.nombre }}</strong>
                <small>{{ formatNumber(item.totalCitas) }} citas realizadas</small>
              </div>
              <span>{{ formatCurrency(item.totalIngresado) }}</span>
            </article>
          </div>
          <div v-else class="empty-box">No hubo citas realizadas en el periodo consultado.</div>
        </template>

        <template v-else-if="selectedReport === 'adicionales' && additionalReport">
          <div v-if="additionalReport.reporte.adicionales.length" class="report-list">
            <article v-for="item in additionalReport.reporte.adicionales" :key="item.id" class="report-row">
              <div>
                <strong>{{ item.nombre }}</strong>
                <small>{{ formatNumber(item.totalAplicaciones) }} aplicaciones</small>
              </div>
              <span>{{ formatCurrency(item.totalIngresado) }}</span>
            </article>
          </div>
          <div v-else class="empty-box">Todavia no hay adicionales cobrados en el periodo consultado.</div>
        </template>

        <template v-else-if="selectedReport === 'citas' && completedReport">
          <div v-if="completedReport.reporte.serviciosPrincipales.length" class="report-list">
            <article v-for="item in completedReport.reporte.serviciosPrincipales" :key="item.nombre" class="report-row">
              <div>
                <strong>{{ item.nombre }}</strong>
                <small>{{ formatNumber(item.totalCitas) }} citas realizadas</small>
              </div>
              <span>{{ formatCurrency(item.totalIngresado) }}</span>
            </article>
          </div>
          <div v-else class="empty-box">No hubo servicios principales realizados en el periodo consultado.</div>
        </template>

        <template v-else-if="selectedReport === 'resumen' && financialReport">
          <div class="financial-split">
            <article class="financial-card total">
              <strong>Total ingresado</strong>
              <span>{{ formatCurrency(financialReport.reporte.totalIngresado) }}</span>
            </article>
            <article class="financial-card reserve">
              <strong>30% insumos / ahorro operativo</strong>
              <span>{{ formatCurrency(financialReport.reporte.fondoInsumos) }}</span>
            </article>
            <article class="financial-card net">
              <strong>70% ganancia neta considerada</strong>
              <span>{{ formatCurrency(financialReport.reporte.gananciaNeta) }}</span>
            </article>
          </div>
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
.admin-reports-page {
  width: min(1440px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 24px 0 56px;
}

.admin-shell,
.summary-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32px;
  border: 1px solid rgba(255, 214, 235, 0.95);
  box-shadow: 0 28px 70px rgba(204, 115, 174, 0.12);
}

.state-card,
.hero-card,
.section-card {
  padding: 30px 32px;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.92fr);
  gap: 24px;
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

.hero-copy h1 {
  margin: 18px 0 12px;
  color: #94186f;
  font-size: clamp(2.15rem, 3vw, 3rem);
}

.hero-copy p,
.filter-description {
  margin: 0;
  color: #624d5f;
  line-height: 1.7;
}

.hero-note-card,
.insight-card,
.empty-box {
  margin-top: 20px;
  border-radius: 24px;
  border: 1px solid rgba(245, 210, 231, 0.95);
  background: linear-gradient(135deg, rgba(255, 249, 252, 0.98), rgba(238, 249, 255, 0.98));
  padding: 20px;
}

.hero-note-card strong,
.insight-card strong {
  display: block;
  margin-bottom: 8px;
  color: #94186f;
}

.hero-filters {
  display: grid;
  align-content: start;
  gap: 16px;
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
  background: linear-gradient(135deg, #c80f9b 0%, #de49d3 100%);
  color: #fff;
  box-shadow: 0 18px 28px rgba(222, 73, 211, 0.22);
}

.btn-secondary {
  background: #fff;
  color: #9c0076;
  border: 1px solid rgba(241, 181, 213, 0.95);
}

.card-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.summary-card {
  padding: 22px;
}

.summary-card strong {
  display: block;
  color: #8f176e;
}

.summary-card span {
  display: block;
  margin-top: 12px;
  font-size: 1.9rem;
  font-weight: 800;
  color: #51304c;
}

.summary-card small {
  display: block;
  margin-top: 8px;
  color: #7a6072;
  font-weight: 700;
}

.summary-card.pink { background: linear-gradient(135deg, rgba(255,245,251,0.96), rgba(255,255,255,0.96)); }
.summary-card.lavender { background: linear-gradient(135deg, rgba(247,242,255,0.96), rgba(255,255,255,0.96)); }
.summary-card.sky { background: linear-gradient(135deg, rgba(238,249,255,0.96), rgba(255,255,255,0.96)); }
.summary-card.mint { background: linear-gradient(135deg, rgba(235,255,251,0.96), rgba(255,255,255,0.96)); }

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
}

.section-header h2 {
  margin: 10px 0 0;
  color: #94186f;
  font-size: 2rem;
}

.chart-dashboard {
  margin-bottom: 20px;
}

.chart-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 18px;
}

.compact-field {
  min-width: 280px;
}

.chart-caption {
  margin: 0;
  color: #6f5a6d;
  max-width: 560px;
  line-height: 1.6;
}

.trend-insights {
  margin-bottom: 18px;
}

.chart-stage {
  border-radius: 28px;
  border: 1px solid rgba(245, 210, 231, 0.95);
  background:
    radial-gradient(circle at top left, rgba(255, 238, 248, 0.96), transparent 42%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(238, 249, 255, 0.98));
  padding: 18px;
}

.trend-chart {
  width: 100%;
  height: 320px;
}

.grid-line {
  stroke: rgba(205, 162, 190, 0.35);
  stroke-width: 1;
  stroke-dasharray: 6 8;
}

.axis-label,
.x-axis-label {
  fill: #7a6072;
  font-size: 12px;
  font-weight: 700;
}

.trend-line {
  fill: none;
  stroke: #d32fb4;
  stroke-width: 4;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.trend-dot {
  fill: #ffffff;
  stroke: #d32fb4;
  stroke-width: 4;
}

.period-label {
  color: #7a6072;
  font-weight: 700;
}

.toast-message,
.inline-error {
  margin: 0 0 18px;
  border-radius: 18px;
  padding: 14px 16px;
  font-weight: 600;
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

.insight-card span {
  display: block;
  margin-top: 10px;
  font-size: 2rem;
  font-weight: 800;
  color: #51304c;
}

.report-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.report-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 249, 252, 0.98), rgba(238, 249, 255, 0.98));
  border: 1px solid rgba(245, 210, 231, 0.95);
}

.report-row strong {
  display: block;
  color: #94186f;
}

.report-row small {
  color: #6f5a6d;
}

.report-row span {
  font-weight: 800;
  color: #51304c;
}

.financial-split {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.financial-card {
  border-radius: 26px;
  padding: 24px;
  border: 1px solid rgba(245, 210, 231, 0.95);
}

.financial-card.total { background: linear-gradient(135deg, rgba(255,245,251,0.98), rgba(255,255,255,0.98)); }
.financial-card.reserve { background: linear-gradient(135deg, rgba(255,248,236,0.98), rgba(255,255,255,0.98)); }
.financial-card.net { background: linear-gradient(135deg, rgba(235,255,251,0.98), rgba(255,255,255,0.98)); }

.financial-card strong {
  display: block;
  color: #94186f;
}

.financial-card span {
  display: block;
  margin-top: 12px;
  font-size: 2rem;
  font-weight: 800;
  color: #51304c;
}

@media (max-width: 1080px) {
  .hero-card,
  .financial-split {
    grid-template-columns: 1fr;
  }

  .chart-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 760px) {
  .admin-reports-page {
    width: min(100vw - 24px, 100%);
    padding-top: 12px;
  }

  .state-card,
  .hero-card,
  .section-card {
    padding: 22px 20px;
    border-radius: 24px;
  }

  .filter-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .section-header,
  .report-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
