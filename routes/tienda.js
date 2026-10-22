const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { endpoint } = require('../shared/store/http');
const { createImageUpload } = require('../shared/http/imageUpload');
const catalog = require('../catalog').createCatalogModule().useCases;
const cart = require('../cart').createCartModule().useCases;
const orders = require('../orders').createOrdersModule().useCases;
const router = express.Router();
router.use(authenticateToken);
const admin = authorizeRoles('administrador'),
  client = authorizeRoles('cliente');
router.get(
  '/categorias',
  client,
  endpoint((req) => catalog.categories(req.user))
);
router.get(
  '/productos',
  client,
  endpoint((req) => catalog.products(req.user, req.query))
);
router.get(
  '/carrito',
  client,
  endpoint((req) => cart.get(req.user))
);
router.post(
  '/carrito',
  client,
  endpoint((req) => cart.set(req.user, req.body, true))
);
router.patch(
  '/carrito',
  client,
  endpoint((req) => cart.set(req.user, req.body))
);
router.delete(
  '/carrito/:id',
  client,
  endpoint((req) => cart.remove(req.user, req.params.id))
);
router.delete(
  '/carrito',
  client,
  endpoint((req) => cart.clear(req.user))
);
router.post(
  '/checkout',
  client,
  endpoint((req) => orders.checkout(req.user, req.body))
);
router.get(
  '/pedidos',
  client,
  endpoint((req) => orders.list(req.user, req.query))
);
router.get(
  '/pedidos/:id',
  client,
  endpoint((req) => orders.detail(req.user, req.params.id))
);
router.post(
  '/pedidos/:id/acciones',
  client,
  endpoint((req) => orders.action(req.user, req.params.id, req.body))
);
router.get(
  '/admin/categorias',
  admin,
  endpoint((req) => catalog.categories(req.user, true))
);
router.post(
  '/admin/categorias',
  admin,
  endpoint((req) => catalog.saveCategory(req.user, null, req.body))
);
router.patch(
  '/admin/categorias/:id',
  admin,
  endpoint((req) => catalog.saveCategory(req.user, req.params.id, req.body))
);
router.delete(
  '/admin/categorias/:id',
  admin,
  endpoint((req) => catalog.deleteCategory(req.user, req.params.id))
);
router.get(
  '/admin/productos',
  admin,
  endpoint((req) => catalog.products(req.user, req.query, true))
);
router.post(
  '/admin/productos',
  admin,
  endpoint((req) => catalog.saveProduct(req.user, null, req.body))
);
router.patch(
  '/admin/productos/:id',
  admin,
  endpoint((req) => catalog.saveProduct(req.user, req.params.id, req.body))
);
router.delete(
  '/admin/productos/:id',
  admin,
  endpoint((req) => catalog.deleteProduct(req.user, req.params.id))
);
router.post(
  '/admin/productos/:id/imagenes',
  admin,
  createImageUpload([{ name: 'imagen', maxCount: 1 }], {
    maxFileSize: 2 * 1024 * 1024
  }),
  endpoint((req) =>
    catalog.upload(req.user, req.params.id, req.files?.imagen?.[0])
  )
);
router.delete(
  '/admin/productos/:id/imagenes/:imageId',
  admin,
  endpoint((req) =>
    catalog.removeImage(req.user, req.params.id, req.params.imageId)
  )
);
router.patch(
  '/admin/productos/:id/imagenes',
  admin,
  endpoint((req) => catalog.reorder(req.user, req.params.id, req.body))
);
router.get(
  '/admin/pedidos',
  admin,
  endpoint((req) => orders.list(req.user, req.query, true))
);
router.get(
  '/admin/pedidos/:id',
  admin,
  endpoint((req) => orders.detail(req.user, req.params.id, true))
);
router.post(
  '/admin/pedidos/:id/acciones',
  admin,
  endpoint((req) => orders.action(req.user, req.params.id, req.body, true))
);
router.get(
  '/admin/reporte',
  admin,
  endpoint((req) => orders.report(req.user, req.query))
);
module.exports = router;
