const { uuid, integer, fail } = require('../../../shared/store/rules');
function operations({ repository }) {
  const read = async (user) => {
    const id = await repository.client(user);
    const items = await repository.lines(id);
    return {
      items,
      total: items.reduce((n, i) => n + i.precio * i.cantidad, 0),
      cantidad: items.reduce((n, i) => n + i.cantidad, 0)
    };
  };
  return {
    get: read,
    async set(user, body, add = false) {
      const productId = uuid(body.producto_id),
        qty = integer(body.cantidad, 1, 100000);
      await repository.transaction(async (tx) => {
        const clientId = await repository.client(user, tx);
        await repository.lockClient(tx, clientId);
        const product = await repository.product(tx, productId);
        if (!product || !product.activo || !product.categoria_activa)
          fail('Producto no disponible', 409);
        const items = await repository.lines(clientId, tx);
        const quantity =
          qty +
          (add
            ? items.find((i) => i.producto_id === productId)?.cantidad || 0
            : 0);
        if (quantity > product.stock_actual)
          fail('La cantidad supera el stock disponible', 409);
        await repository.set(
          tx,
          await repository.ensure(tx, clientId),
          productId,
          quantity
        );
      });
      return read(user);
    },
    async remove(user, id) {
      uuid(id);
      await repository.transaction(async (tx) => {
        const c = await repository.client(user, tx);
        await repository.lockClient(tx, c);
        await repository.remove(tx, c, id);
      });
      return read(user);
    },
    async clear(user) {
      await repository.transaction(async (tx) => {
        const c = await repository.client(user, tx);
        await repository.lockClient(tx, c);
        await repository.clear(tx, c);
      });
      return read(user);
    }
  };
}
module.exports = { operations };
