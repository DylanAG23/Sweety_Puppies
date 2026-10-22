const r = require('../../../shared/store/rules');
function metadata(order) {
  try {
    const m = JSON.parse(order.observaciones);
    if (m.version === 1 && Array.isArray(m.events) && Array.isArray(m.cart))
      return m;
  } catch {}
  return { version: 1, events: [], cart: [] };
}
function publicOrder(order) {
  const m = metadata(order);
  const { observaciones, ...safe } = order;
  return {
    ...safe,
    eventos: m.events,
    simulado: order.metodo_pago !== 'efectivo',
    consentimiento: m.consentimiento || null
  };
}
function operations({ repository, cart, inventory, now, newId }) {
  async function access(user, id, tx, admin) {
    const found = await repository.find(tx, id);
    if (!found) r.fail('Pedido no encontrado', 404);
    if (admin) await repository.admin(user, tx);
    else if (found.cliente_id !== (await repository.client(user, tx)))
      r.fail('Pedido no encontrado', 404);
    await repository.lockClient(tx, found.cliente_id);
    return repository.lock(tx, id);
  }
  return {
    async checkout(user, b) {
      const key = r.uuid(b.requestId),
        method = r.method(b.metodo_pago);
      if (b.consentimiento !== true)
        r.fail(
          'Debes aceptar las condiciones de compra y tratamiento de datos'
        );
      const order = await repository.transaction(async (tx) => {
        const clientId = await repository.client(user, tx);
        await repository.lockClient(tx, clientId);
        const old = await repository.existing(tx, clientId, key);
        if (old) return old;
        let items = await cart.lines(clientId, tx);
        if (!items.length) r.fail('Tu carrito está vacío');
        if (items.length > 100)
          r.fail('El pedido admite hasta 100 productos diferentes');
        await repository.lockProducts(
          tx,
          items.map((i) => i.producto_id)
        );
        items = await cart.lines(clientId, tx);
        for (const i of items)
          if (!i.activo || !i.categoria_activa || i.cantidad > i.stock_actual)
            r.fail(
              'Hay productos inactivos o cantidades sin stock. Revisa tu carrito',
              409
            );
        const total = r.total(items);
        if (total !== r.integer(b.total_esperado, 1))
          r.fail(
            'Los precios cambiaron. Revisa el total actualizado antes de confirmar',
            409
          );
        const meta = {
          version: 1,
          requestId: key,
          consentimiento: {
            aceptado: true,
            version: 'tienda-v1',
            fecha: now().toISOString()
          },
          cart: items.map((i) => ({
            id: i.id,
            cantidad: i.cantidad,
            updated_at: i.updated_at
          })),
          events: []
        };
        const created = await repository.create(
          tx,
          clientId,
          method,
          total,
          meta,
          items
        );
        if (method === 'efectivo') await cart.consume(tx, clientId, meta.cart);
        return created;
      });
      return { orden: publicOrder(order) };
    },
    async list(user, q, admin = false) {
      if (admin) await repository.admin(user);
      const clientId = admin ? null : await repository.client(user);
      const filters = {
        page: r.integer(q.page ?? 1, 1, 100000),
        limit: r.integer(q.limit ?? 20, 1, 100),
        estado: q.estado || null
      };
      const result = await repository.list(clientId, filters);
      return { ...result, ordenes: result.ordenes.map(publicOrder) };
    },
    async detail(user, id, admin = false) {
      r.uuid(id);
      return repository.transaction(async (tx) => {
        const order = await access(user, id, tx, admin);
        return {
          orden: publicOrder(order),
          items: await repository.details(id, tx)
        };
      });
    },
    async action(user, id, b, admin = false) {
      r.uuid(id);
      const action = b.accion;
      if (
        !(
          admin
            ? ['listo', 'entregar', 'cobrar_efectivo']
            : ['pagar', 'cancelar', 'metodo']
        ).includes(action)
      )
        r.fail('Acción no permitida', 403);
      const result = await repository.transaction(async (tx) => {
        const order = await access(user, id, tx, admin);
        const meta = metadata(order);
        const time = now();
        const requestId = b.requestId ? r.uuid(b.requestId) : null;
        if (action === 'pagar' && !requestId)
          r.fail('Falta el identificador del intento');
        if (requestId && meta.events.some((e) => e.requestId === requestId))
          return {
            orden: publicOrder(order),
            resultado: meta.events.find((e) => e.requestId === requestId)
              .resultado
          };
        let outcome = 'aprobado';
        if (action === 'cancelar') {
          if (order.estado === 'cancelado')
            return { orden: publicOrder(order) };
          if (order.estado !== 'en_espera_pago')
            r.fail('Solo puedes cancelar pedidos sin pagar', 409);
          if (time - new Date(order.created_at) > 15 * 60 * 1000)
            r.fail('El plazo de cancelación de 15 minutos terminó', 409);
          order.estado = 'cancelado';
          order.fecha_cancelacion = time;
          order.motivo_cancelacion = r.text(
            b.motivo || 'Cancelado por el cliente',
            1000
          );
          outcome = 'cancelado';
        } else if (action === 'metodo') {
          if (order.estado !== 'en_espera_pago')
            r.fail('Solo puedes cambiar el método de un pedido sin pagar', 409);
          order.metodo_pago = r.method(b.metodo_pago);
          if (order.metodo_pago === 'efectivo')
            await cart.consume(tx, order.cliente_id, meta.cart);
        } else if (action === 'listo') {
          if (order.estado === 'pendiente_recoger')
            return { orden: publicOrder(order) };
          if (order.estado !== 'pagado')
            r.fail(
              'Solo un pedido pagado puede quedar listo para recoger',
              409
            );
          order.estado = 'pendiente_recoger';
        } else if (action === 'entregar') {
          if (order.estado === 'entregado')
            return { orden: publicOrder(order) };
          if (order.estado !== 'pendiente_recoger')
            r.fail('Primero marca el pedido como listo para recoger', 409);
          order.estado = 'entregado';
        } else {
          if (order.estado !== 'en_espera_pago')
            r.fail('El pedido ya fue procesado. Actualiza su estado', 409);
          if (action === 'cobrar_efectivo' && order.metodo_pago !== 'efectivo')
            r.fail('El pedido no es de pago en efectivo', 409);
          if (action === 'pagar') {
            order.metodo_pago = r.method(b.metodo_pago);
            if (order.metodo_pago === 'efectivo')
              r.fail('El efectivo se registra al entregar en el local');
            outcome = b.resultado;
            if (!['aprobado', 'rechazado', 'cancelado'].includes(outcome))
              r.fail('Resultado de simulación inválido');
          }
          if (outcome === 'aprobado') {
            const items = await repository.details(id, tx);
            if (r.total(items) !== order.total)
              r.fail('El pedido tiene un total inconsistente', 409);
            const products = await repository.lockProducts(
              tx,
              items.map((i) => i.producto_id)
            );
            if (
              products.length !== items.length ||
              products.some((p) => !p.activo || !p.categoria_activa)
            )
              r.fail('Un producto dejó de estar disponible', 409);
            await inventory.discountStockForOrder(tx, { ordenId: id, items });
            order.estado =
              action === 'cobrar_efectivo' ? 'entregado' : 'pagado';
            order.fecha_pago = time;
            await cart.consume(tx, order.cliente_id, meta.cart);
          }
        }
        if (meta.events.length >= 100)
          r.fail('Se alcanzó el límite de intentos de este pedido', 409);
        meta.events.push({
          id: newId(),
          usuarioId: user.id || user.sub || user.userId,
          rol: admin ? 'administrador' : 'cliente',
          requestId,
          accion: action,
          resultado: outcome,
          fecha: time.toISOString(),
          metodo: order.metodo_pago
        });
        return {
          orden: publicOrder(await repository.update(tx, order, meta)),
          resultado: outcome
        };
      });
      return result;
    },
    async report(user, q) {
      await repository.admin(user);
      const f = r.dateRange(q);
      return { reporte: await repository.report(f.desde, f.hasta) };
    }
  };
}
module.exports = { operations, metadata, publicOrder };
