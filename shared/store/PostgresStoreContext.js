const db = require('../../baseDatos');
const { fail, uuid } = require('./rules');
class PostgresStoreContext {
  transaction(work) {
    return db.withTransaction(work);
  }
  async client(user, tx = db) {
    const id = uuid(user?.id || user?.sub || user?.userId);
    const result = await tx.query(
      `SELECT c.id FROM clientes c JOIN usuarios u ON u.id=c.usuario_id WHERE u.id=$1 AND u.activo AND c.activo ORDER BY c.created_at,c.id LIMIT 1`,
      [id]
    );
    if (!result.rowCount)
      fail('No hay un perfil de cliente activo para esta sesión', 403);
    return result.rows[0].id;
  }
  async lockClient(tx, id) {
    await tx.query('SELECT id FROM clientes WHERE id=$1 FOR UPDATE', [id]);
  }
  async admin(user, tx = db) {
    const result = await tx.query(
      "SELECT id FROM usuarios WHERE id=$1 AND activo AND rol='administrador'",
      [uuid(user?.id || user?.sub || user?.userId)]
    );
    if (!result.rowCount)
      fail('Se requiere una cuenta administrativa activa', 403);
  }
}
module.exports = { PostgresStoreContext };
