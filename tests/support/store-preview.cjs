// Preview aislado: nunca carga .env ni conecta a Supabase. Solo escucha loopback.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = require('node:crypto').randomUUID();
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const db = require('../../baseDatos');
(async () => {
  const pg = new PGlite();
  await pg.exec(
    fs.readFileSync(
      path.join(__dirname, '../../database/001_application_baseline.sql'),
      'utf8'
    )
  );
  const adapter = (conn) => ({
    query: async (sql, args) => {
      const r = await conn.query(sql, args);
      return { ...r, rowCount: r.affectedRows || r.rows.length };
    }
  });
  db.query = adapter(pg).query;
  db.withTransaction = (work) => pg.transaction((tx) => work(adapter(tx)));
  const users = {};
  for (const rol of ['cliente', 'administrador']) {
    const u = (
      await db.query(
        "INSERT INTO usuarios(rol,email,password_hash) VALUES($1,$2,'cuenta-solo-preview') RETURNING *",
        [rol, rol + '@example.test']
      )
    ).rows[0];
    users[rol] = u;
    if (rol === 'cliente')
      await db.query(
        "INSERT INTO clientes(usuario_id,nombre,apellido,cedula,telefono) VALUES($1,'Cliente','Prueba','100000000','3000000000')",
        [u.id]
      );
  }
  const { seedDemoCatalog, assetsDirectory } = require('../../database/demo-catalog.cjs');
  await seedDemoCatalog(pg);
  const express = require('express'), app = express();
  app.use('/demo-catalog', express.static(assetsDirectory));
  app.get('/__preview/:role', (req, res) => {
    const u = users[req.params.role];
    if (!u) return res.sendStatus(404);
    const session = {
      token: jwt.sign({ id: u.id, rol: u.rol }, process.env.JWT_SECRET, {
        expiresIn: '1h'
      }),
      userData: { id: u.id, rol: u.rol, nombre: 'Prueba', email: u.email },
      timestamp: Date.now()
    };
    res
      .type('html')
      .send(
        `<script>sessionStorage.setItem('sweetyPuppiesSession',${JSON.stringify(JSON.stringify(session))});location.replace('${u.rol === 'cliente' ? '/cliente/tienda' : '/admin/productos'}')</script>`
      );
  });
  app.use(require('../../app').createApp());
  const server = app.listen(3011, '127.0.0.1', () =>
    console.log(
      'Preview aislado: http://127.0.0.1:3011/__preview/cliente y /__preview/administrador'
    )
  );
  process.on('SIGINT', () =>
    server.close(async () => {
      await pg.close();
      process.exit(0);
    })
  );
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
