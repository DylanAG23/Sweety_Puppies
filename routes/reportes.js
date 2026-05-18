const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createAdminReportsModule } = require('../adminReports');

const router = express.Router();
const { controller } = createAdminReportsModule();

/**
 * @openapi
 * components:
 *   schemas:
 *     AdminReportFilters:
 *       type: object
 *       properties:
 *         periodo:
 *           type: string
 *           example: month
 *         fecha:
 *           type: string
 *           format: date
 *           nullable: true
 *         fechaInicio:
 *           type: string
 *           format: date
 *           nullable: true
 *         fechaFin:
 *           type: string
 *           format: date
 *           nullable: true
 *     AdminRevenueReportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         tipo:
 *           type: string
 *           example: ganancias
 *         filtros:
 *           $ref: '#/components/schemas/AdminReportFilters'
 *         totalIngresado:
 *           type: number
 *           example: 420000
 *         cantidadCitas:
 *           type: integer
 *           example: 4
 *         promedioPorCita:
 *           type: number
 *           example: 105000
 *     AdminAdditionalRevenueReportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         tipo:
 *           type: string
 *           example: adicionales
 *         filtros:
 *           $ref: '#/components/schemas/AdminReportFilters'
 *         totalIngresado:
 *           type: number
 *           example: 80000
 *         cantidadAplicaciones:
 *           type: integer
 *           example: 4
 *         adicionales:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Hidratacion profunda
 *               cantidad:
 *                 type: integer
 *                 example: 3
 *               total:
 *                 type: number
 *                 example: 60000
 *     AdminCompletedServicesReportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         tipo:
 *           type: string
 *           example: citas
 *         filtros:
 *           $ref: '#/components/schemas/AdminReportFilters'
 *         totalCitas:
 *           type: integer
 *           example: 4
 *         serviciosPrincipales:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Bano completo
 *               cantidad:
 *                 type: integer
 *                 example: 3
 *         adicionalesAplicados:
 *           type: integer
 *           example: 4
 *     AdminFinancialSummaryResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         tipo:
 *           type: string
 *           example: resumen
 *         filtros:
 *           $ref: '#/components/schemas/AdminReportFilters'
 *         totalIngresado:
 *           type: number
 *           example: 420000
 *         fondoInsumos:
 *           type: number
 *           example: 126000
 *         gananciaNeta:
 *           type: number
 *           example: 294000
 *     AdminTrendReportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         tipo:
 *           type: string
 *           example: grafica
 *         filtros:
 *           $ref: '#/components/schemas/AdminReportFilters'
 *         grafica:
 *           type: object
 *           properties:
 *             metrica:
 *               type: string
 *               example: ganancias
 *             granularidad:
 *               type: string
 *               example: day
 *             serie:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrendPoint'
 *             resumen:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   example: 420000
 *                 maximo:
 *                   type: number
 *                   example: 140000
 *                 promedio:
 *                   type: number
 *                   example: 105000
 *                 mejorEtiqueta:
 *                   type: string
 *                   example: 12 Abr
 * tags:
 *   - name: Reportes
 *     description: Reportes financieros y operativos del negocio.
 *
 * /reportes/ganancias:
 *   get:
 *     summary: Obtiene el reporte de ganancias del periodo
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ReportPeriod'
 *       - $ref: '#/components/parameters/ReportDate'
 *       - $ref: '#/components/parameters/ReportStartDate'
 *       - $ref: '#/components/parameters/ReportEndDate'
 *     responses:
 *       200:
 *         description: Reporte generado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminRevenueReportResponse'
 *             examples:
 *               resumenMensual:
 *                 value:
 *                   success: true
 *                   tipo: ganancias
 *                   filtros:
 *                     periodo: month
 *                     fecha: '2026-04-23'
 *                     fechaInicio: '2026-04-01'
 *                     fechaFin: '2026-04-30'
 *                   totalIngresado: 420000
 *                   cantidadCitas: 4
 *                   promedioPorCita: 105000
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /reportes/adicionales:
 *   get:
 *     summary: Obtiene el reporte de ingresos por servicios adicionales
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ReportPeriod'
 *       - $ref: '#/components/parameters/ReportDate'
 *       - $ref: '#/components/parameters/ReportStartDate'
 *       - $ref: '#/components/parameters/ReportEndDate'
 *     responses:
 *       200:
 *         description: Reporte de adicionales generado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAdditionalRevenueReportResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /reportes/citas-realizadas:
 *   get:
 *     summary: Obtiene el reporte de citas realizadas del periodo
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ReportPeriod'
 *       - $ref: '#/components/parameters/ReportDate'
 *       - $ref: '#/components/parameters/ReportStartDate'
 *       - $ref: '#/components/parameters/ReportEndDate'
 *     responses:
 *       200:
 *         description: Reporte de citas realizadas generado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCompletedServicesReportResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /reportes/resumen-financiero:
 *   get:
 *     summary: Obtiene el resumen financiero 30/70 del periodo
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ReportPeriod'
 *       - $ref: '#/components/parameters/ReportDate'
 *       - $ref: '#/components/parameters/ReportStartDate'
 *       - $ref: '#/components/parameters/ReportEndDate'
 *     responses:
 *       200:
 *         description: Resumen financiero generado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminFinancialSummaryResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /reportes/grafica:
 *   get:
 *     summary: Obtiene la serie estadistica para la grafica de reportes
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ReportPeriod'
 *       - $ref: '#/components/parameters/ReportDate'
 *       - $ref: '#/components/parameters/ReportStartDate'
 *       - $ref: '#/components/parameters/ReportEndDate'
 *       - in: query
 *         name: metrica
 *         schema:
 *           type: string
 *           enum: [citas, ganancias]
 *     responses:
 *       200:
 *         description: Serie estadistica generada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminTrendReportResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /reportes/pdf:
 *   get:
 *     summary: Descarga el PDF del reporte actual
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [ganancias, adicionales, citas, resumen]
 *       - $ref: '#/components/parameters/ReportPeriod'
 *       - $ref: '#/components/parameters/ReportDate'
 *       - $ref: '#/components/parameters/ReportStartDate'
 *       - $ref: '#/components/parameters/ReportEndDate'
 *     responses:
 *       200:
 *         description: PDF generado correctamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/ganancias', controller.getRevenueReport);
router.get('/adicionales', controller.getAdditionalRevenueReport);
router.get('/citas-realizadas', controller.getCompletedServicesReport);
router.get('/resumen-financiero', controller.getFinancialSummaryReport);
router.get('/grafica', controller.getTrendReport);
router.get('/pdf', controller.downloadReportPdf);

module.exports = router;
