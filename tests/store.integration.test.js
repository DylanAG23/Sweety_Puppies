process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const db = require('../baseDatos');
const {
  PostgresCatalogRepository
} = require('../catalog/infrastructure/repositories/PostgresCatalogRepository');
const {
  PostgresCartRepository
} = require('../cart/infrastructure/repositories/PostgresCartRepository');
const {
  PostgresOrdersRepository
} = require('../orders/infrastructure/repositories/PostgresOrdersRepository');
const { createInventoryModule } = require('../inventory');
let pg, admin, user, other, category, product, clock;
const catalogRepo = new PostgresCatalogRepository(),
  cartRepo = new PostgresCartRepository(),
  orderRepo = new PostgresOrdersRepository();
const catalog =
  require('../catalog/application/useCases/catalogOperations').operations({
    repository: catalogRepo,
    storage: {}
  });
const cart = require('../cart/application/useCases/cartOperations').operations({
  repository: cartRepo
});
const inventory = createInventoryModule();
const orders =
  require('../orders/application/useCases/orderOperations').operations({
    repository: orderRepo,
    cart: cartRepo,
    inventory: inventory.ports,
    now: () => clock || new Date(),
    newId: randomUUID
  });
function adapter(conn) {
  return {
    query: async (sql, args) => {
      const r = await conn.query(sql, args);
      return { ...r, rowCount: r.affectedRows || r.rows.length };
    }
  };
}
before(async () => {
  pg = new PGlite();
  await pg.exec(
    fs.readFileSync(path.join(__dirname, 'fixtures/store-schema.sql'), 'utf8')
  );
  db.query = adapter(pg).query;
  db.withTransaction = (work) => pg.transaction((tx) => work(adapter(tx)));
  const make = async (rol) => {
    const id = randomUUID();
    await db.query('INSERT INTO usuarios(id,rol,email) VALUES($1,$2,$3)', [
      id,
      rol,
      id + '@example.test'
    ]);
    if (rol === 'cliente')
      await db.query(
        "INSERT INTO clientes(usuario_id,nombre,apellido) VALUES($1,'Prueba','Tienda')",
        [id]
      );
    return { id, rol };
  };
  admin = await make('administrador');
  user = await make('cliente');
  other = await make('cliente');
  category = (await catalog.saveCategory(admin, null, { nombre: 'Accesorios' }))
    .categoria;
});
after(async () => {
  await pg?.close();
});
async function fixture(stock = 10, price = 10000) {
  await cart.clear(user);
  product = (
    await catalog.saveProduct(admin, null, {
      categoria_id: category.id,
      referencia: randomUUID(),
      nombre: 'Juguete de prueba',
      precio: price
    })
  ).producto;
  await inventory.useCases.registerInventoryMovement(admin, {
    productoId: product.id,
    tipo: 'entrada',
    cantidad: stock,
    motivo: 'Inventario de prueba'
  });
  return product;
}
async function checkout(method = 'tarjeta', qty = 2) {
  await cart.set(user, { producto_id: product.id, cantidad: qty });
  return (
    await orders.checkout(user, {
      requestId: randomUUID(),
      metodo_pago: method,
      consentimiento: true,
      total_esperado: product.precio * qty
    })
  ).orden;
}
const payment = (id, resultado = 'aprobado', requestId = randomUUID()) =>
  orders.action(user, id, {
    accion: 'pagar',
    resultado,
    metodo_pago: 'tarjeta',
    requestId
  });
const stock = async () =>
  (
    await db.query('SELECT stock_actual FROM inventario WHERE producto_id=$1', [
      product.id
    ])
  ).rows[0].stock_actual;

test('catálogo filtra precio y categoría; valida precios, permisos e imágenes', async () => {
  await fixture();
  assert.equal(
    (
      await catalog.products(user, {
        id: product.id,
        min: 10000,
        max: 10000,
        categoria: category.id
      })
    ).total,
    1
  );
  assert.equal(
    (await catalog.products(user, { id: product.id, min: 10001 })).total,
    0
  );
  await assert.rejects(catalog.saveProduct(user, null, {}), /administrativa/);
  await assert.rejects(
    catalog.saveProduct(admin, null, {
      categoria_id: category.id,
      referencia: 'X',
      nombre: 'X',
      precio: 0
    }),
    /inválido/
  );
  const imgs = [];
  for (let i = 0; i < 4; i++)
    imgs.push(
      await catalogRepo.addImage(product.id, 'https://example.test/' + i)
    );
  await assert.rejects(
    catalogRepo.addImage(product.id, 'https://example.test/5'),
    /cuatro/
  );
  await catalogRepo.reorderImages(product.id, imgs.map((i) => i.id).reverse());
  assert.equal(
    (await catalog.products(user, { id: product.id })).productos[0].imagenes[0]
      .id,
    imgs[3].id
  );
  await assert.rejects(
    catalogRepo.reorderImages(product.id, [imgs[0].id]),
    /inválido/
  );
  await assert.rejects(catalog.deleteProduct(admin, product.id), /historial/);
});
test('carrito persiste por cliente y rechaza cantidades inválidas o superiores al stock', async () => {
  await fixture(3);
  await cart.set(user, { producto_id: product.id, cantidad: 2 });
  assert.equal((await cart.get(user)).total, 20000);
  assert.equal((await cart.get(other)).items.length, 0);
  await assert.rejects(
    cart.set(user, { producto_id: product.id, cantidad: 2 }, true),
    /stock/
  );
  await assert.rejects(
    cart.set(user, { producto_id: product.id, cantidad: -1 }),
    /inválido/
  );
});
test('checkout valida consentimiento, precios y reutiliza la misma solicitud', async () => {
  await fixture();
  await cart.set(user, { producto_id: product.id, cantidad: 1 });
  const body = {
    requestId: randomUUID(),
    metodo_pago: 'tarjeta',
    total_esperado: 10000,
    consentimiento: true
  };
  await assert.rejects(
    orders.checkout(user, { ...body, consentimiento: false }),
    /aceptar/
  );
  await assert.rejects(
    orders.checkout(user, { ...body, total_esperado: 1 }),
    /precios/
  );
  const first = await orders.checkout(user, body),
    again = await orders.checkout(user, body);
  assert.equal(first.orden.id, again.orden.id);
  assert.equal(await stock(), 10);
  await assert.rejects(orders.detail(other, first.orden.id), /no encontrado/);
});
test('pago aprobado descuenta stock una sola vez, vacía carrito y no permite cancelar pagados', async () => {
  await fixture();
  const o = await checkout(),
    key = randomUUID();
  assert.equal((await payment(o.id, 'aprobado', key)).orden.estado, 'pagado');
  await payment(o.id, 'aprobado', key);
  assert.equal(await stock(), 8);
  assert.equal((await cart.get(user)).items.length, 0);
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM movimientos_inventario WHERE orden_id=$1',
        [o.id]
      )
    ).rows[0].n,
    1
  );
  await assert.rejects(
    orders.action(user, o.id, { accion: 'cancelar' }),
    /sin pagar/
  );
  await assert.rejects(payment(o.id), /procesado/);
  await orders.action(admin, o.id, { accion: 'listo' }, true);
  assert.equal(
    (await orders.action(admin, o.id, { accion: 'entregar' }, true)).orden
      .estado,
    'entregado'
  );
});
test('rechazo y cancelación de simulación conservan stock y carrito; se puede reintentar', async () => {
  await fixture();
  const o = await checkout();
  await payment(o.id, 'rechazado');
  await payment(o.id, 'cancelado');
  assert.equal(await stock(), 10);
  assert.equal((await cart.get(user)).cantidad, 2);
  assert.equal((await payment(o.id)).orden.estado, 'pagado');
});
test('falta de stock durante pago revierte el pedido y todos los movimientos', async () => {
  await fixture(2);
  const o = await checkout();
  await inventory.useCases.registerInventoryMovement(admin, {
    productoId: product.id,
    tipo: 'salida',
    cantidad: 1,
    motivo: 'Venta externa'
  });
  await assert.rejects(payment(o.id), /stock/i);
  assert.equal(await stock(), 1);
  assert.equal(
    (await orders.detail(user, o.id)).orden.estado,
    'en_espera_pago'
  );
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM movimientos_inventario WHERE orden_id=$1',
        [o.id]
      )
    ).rows[0].n,
    0
  );
});
test('efectivo se cobra y descuenta únicamente al entregar; cambios de método', async () => {
  await fixture();
  const o = await checkout('efectivo');
  assert.equal(await stock(), 10);
  assert.equal((await cart.get(user)).items.length, 0);
  await assert.rejects(
    orders.action(user, o.id, { accion: 'cobrar_efectivo' }),
    /permitida/
  );
  const paid = await orders.action(
    admin,
    o.id,
    { accion: 'cobrar_efectivo', requestId: randomUUID() },
    true
  );
  assert.equal(paid.orden.estado, 'entregado');
  assert.equal(await stock(), 8);
  await fixture();
  const online = await checkout();
  assert.equal(
    (
      await orders.action(user, online.id, {
        accion: 'metodo',
        metodo_pago: 'efectivo'
      })
    ).orden.metodo_pago,
    'efectivo'
  );
  assert.equal((await cart.get(user)).items.length, 0);
});
test('cancelación solo sin pagar y antes de 15 minutos, sin modificar inventario', async () => {
  await fixture();
  const o = await checkout();
  assert.equal(
    (await orders.action(user, o.id, { accion: 'cancelar' })).orden.estado,
    'cancelado'
  );
  assert.equal(await stock(), 10);
  const late = await checkout();
  clock = new Date(new Date(late.created_at).getTime() + 16 * 60000);
  try {
    await assert.rejects(
      orders.action(user, late.id, { accion: 'cancelar' }),
      /plazo/
    );
  } finally {
    clock = null;
  }
});
test('el pago conserva los cambios de carrito realizados después del checkout', async () => {
  await fixture();
  const o = await checkout();
  await cart.set(user, { producto_id: product.id, cantidad: 3 });
  await payment(o.id);
  assert.equal((await cart.get(user)).cantidad, 3);
});
test('reportes separan productos y servicios; el historial de inventario es inmutable', async () => {
  await db.query(
    'INSERT INTO historial_citas(fecha_servicio,precio_final,precio_calculado,precio_base) VALUES(now(),25000,25000,25000)'
  );
  const report = (
    await orders.report(admin, { desde: '2020-01-01', hasta: '2099-12-31' })
  ).reporte;
  assert.equal(report.servicios, 25000);
  assert.equal(report.consolidado, report.productos + 25000);
  assert.ok(report.pedidos > 0);
  await assert.rejects(
    db.query('DELETE FROM movimientos_inventario'),
    /inmutable|modificar|eliminar|permit/i
  );
  const overview = await inventory.useCases.getInventoryOverview(admin, {});
  assert.ok(overview.productos.length > 0);
  const history = await inventory.useCases.listInventoryMovements(admin, {});
  assert.ok(history.movimientos.length > 0);
});

test('varios productos: un fallo posterior revierte descuentos anteriores', async () => {
  await fixture(5);
  const first = product;
  await fixture(5);
  const second = product;
  const sorted = [first, second].sort((a, b) => a.id.localeCompare(b.id));
  for (const p of sorted)
    await cart.set(user, { producto_id: p.id, cantidad: 2 });
  const o = (
    await orders.checkout(user, {
      requestId: randomUUID(),
      metodo_pago: 'nequi',
      consentimiento: true,
      total_esperado: 40000
    })
  ).orden;
  await inventory.useCases.registerInventoryMovement(admin, {
    productoId: sorted[1].id,
    tipo: 'salida',
    cantidad: 4,
    motivo: 'Agotado durante checkout'
  });
  await assert.rejects(payment(o.id), /stock/i);
  assert.equal(
    (
      await db.query(
        'SELECT stock_actual FROM inventario WHERE producto_id=$1',
        [sorted[0].id]
      )
    ).rows[0].stock_actual,
    5
  );
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM movimientos_inventario WHERE orden_id=$1',
        [o.id]
      )
    ).rows[0].n,
    0
  );
});

test('HTTP: autenticación, roles, propiedad y validación de entradas', async () => {
  process.env.JWT_SECRET = 'isolated-http-test-secret';
  const jwt = require('jsonwebtoken');
  const server = require('../app').createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const call = async (path, user, method = 'GET', body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (user)
      headers.Authorization =
        'Bearer ' + jwt.sign(user, process.env.JWT_SECRET);
    const res = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json() };
  };
  try {
    assert.equal((await call('/api/tienda/productos')).status, 401);
    assert.equal((await call('/api/tienda/admin/productos', user)).status, 403);
    assert.equal((await call('/api/tienda/carrito', admin)).status, 403);
    assert.equal(
      (await call('/api/tienda/productos?min=-1', user)).status,
      400
    );
    assert.equal(
      (await call('/api/tienda/admin/productos', admin)).status,
      200
    );
    assert.equal(
      (await call('/api/admin/inventario/movimientos', admin)).status,
      200
    );
    const o = (await orders.list(user, {})).ordenes[0];
    assert.equal(
      (await call('/api/tienda/pedidos/' + o.id, other)).status,
      404
    );
    const owned = await call('/api/tienda/pedidos/' + o.id, user);
    assert.equal(owned.status, 200);
    assert.equal('observaciones' in owned.data.orden, false);
    assert.equal(
      (
        await call('/api/tienda/pedidos/' + o.id + '/acciones', user, 'POST', {
          accion: 'entregar'
        })
      ).status,
      403
    );
    assert.equal(
      (
        await call(
          '/api/tienda/admin/reporte?desde=2026-02-30&hasta=2026-03-01',
          admin
        )
      ).status,
      400
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
