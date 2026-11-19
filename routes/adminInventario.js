const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createInventoryModule } = require('../inventory');

const router = express.Router();
const { controller } = createInventoryModule();

/**
 * @openapi
 * components:
 *   schemas:
 *     InventoryItem:
 *       type: object
 *       properties:
 *         productoId:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *           example: Shampoo hipoalergenico 500 ml
 *         referencia:
 *           type: string
 *           example: SP-HIG-014
 *         categoriaNombre:
 *           type: string
 *           example: Higiene y bano
 *         activo:
 *           type: boolean
 *         stockActual:
 *           type: integer
 *           example: 3
 *         stockMinimo:
 *           type: integer
 *           example: 6
 *         nivel:
 *           type: string
 *           enum: [normal, bajo, agotado]
 *           example: bajo
 *     InventoryMovement:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         fecha:
 *           type: string
 *           format: date-time
 *         productoNombre:
 *           type: string
 *         productoReferencia:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [entrada, salida, ajuste]
 *         cantidad:
 *           type: integer
 *           description: Con signo. Entrada positiva, salida negativa, ajuste positivo o negativo.
 *           example: -2
 *         stockAnterior:
 *           type: integer
 *           example: 5
 *         stockResultante:
 *           type: integer
 *           example: 3
 *         motivo:
 *           type: string
 *           example: Venta
 *         observacion:
 *           type: string
 *           nullable: true
 *         origen:
 *           type: string
 *           example: Pedido SP-000123
 *         usuarioNombre:
 *           type: string
 *           example: Sistema
 *     InventoryMovementInput:
 *       type: object
 *       required: [productoId, tipo, cantidad, motivo]
 *       properties:
 *         productoId:
 *           type: string
 *           format: uuid
 *         tipo:
 *           type: string
 *           enum: [entrada, salida, ajuste]
 *         cantidad:
 *           type: integer
 *           description: Entrada y salida, unidades a sumar o restar (mayor a 0). Ajuste, valor contado (0 o mas).
 *           example: 10
 *         motivo:
 *           type: string
 *           maxLength: 100
 *           example: Compra a proveedor
 *         observacion:
 *           type: string
 *           maxLength: 500
 *           example: Factura 4521
 */

/**
 * @openapi
 * /admin/inventario:
 *   get:
 *     tags: [Admin Inventario]
 *     summary: Existencias, indicadores y alertas de stock minimo
 *     description: Devuelve cada producto con su stock actual, minimo y nivel (normal, bajo o agotado), el resumen de la pantalla de inventario y la lista de productos que necesitan reposicion.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/SearchQuery'
 *       - in: query
 *         name: nivel
 *         schema:
 *           type: string
 *           enum: [todos, normal, bajo, agotado, alerta]
 *         description: Con el valor alerta devuelve solo los productos bajo el minimo o agotados.
 *     responses:
 *       200:
 *         description: Inventario cargado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 resumen:
 *                   type: object
 *                   properties:
 *                     unidadesEnStock:
 *                       type: integer
 *                     productosStockBajo:
 *                       type: integer
 *                     productosAgotados:
 *                       type: integer
 *                     movimientosHoy:
 *                       type: integer
 *                 alerta:
 *                   type: string
 *                   nullable: true
 *                   example: 5 productos estan por debajo del stock minimo y 2 estan agotados.
 *                 alertas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryItem'
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * /admin/inventario/productos/{productoId}:
 *   get:
 *     tags: [Admin Inventario]
 *     summary: Stock de un producto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inventario del producto.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /admin/inventario/productos/{productoId}/minimo:
 *   patch:
 *     tags: [Admin Inventario]
 *     summary: Cambia el stock minimo (alerta) de un producto
 *     description: No genera movimiento porque no cambia las unidades.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stockMinimo]
 *             properties:
 *               stockMinimo:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Stock minimo actualizado.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /admin/inventario/movimientos:
 *   get:
 *     tags: [Admin Inventario]
 *     summary: Historial de entradas, salidas y ajustes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/SearchQuery'
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [todos, entrada, salida, ajuste]
 *       - in: query
 *         name: productoId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Movimientos filtrados con resumen del periodo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 resumen:
 *                   type: object
 *                   properties:
 *                     entradas:
 *                       type: integer
 *                       example: 120
 *                     salidas:
 *                       type: integer
 *                       example: -64
 *                     ajustesNeto:
 *                       type: integer
 *                       example: 0
 *                     cantidadAjustes:
 *                       type: integer
 *                       example: 2
 *                 movimientos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryMovement'
 *                 paginacion:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *   post:
 *     tags: [Admin Inventario]
 *     summary: Registra una entrada, salida o ajuste
 *     description: Entrada suma, salida resta (sin dejar el stock negativo) y ajuste corrige al valor contado. El movimiento queda en la bitacora y no se puede editar ni eliminar.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryMovementInput'
 *     responses:
 *       201:
 *         description: Movimiento registrado.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: No hay stock suficiente para la salida.
 * /admin/inventario/movimientos/exportar:
 *   get:
 *     tags: [Admin Inventario]
 *     summary: Descarga el historial filtrado en CSV (Excel)
 *     description: Acepta los mismos filtros que el listado, sin paginacion.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo CSV separado por punto y coma.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */

router.use(authenticateToken, authorizeRoles('administrador'));

router.get('/', controller.getOverview);
router.get('/movimientos', controller.listMovements);
router.get('/movimientos/exportar', controller.exportMovements);
router.post('/movimientos', controller.registerMovement);
router.get('/productos/:productoId', controller.getProductInventory);
router.patch('/productos/:productoId/minimo', controller.updateMinimumStock);

module.exports = router;
