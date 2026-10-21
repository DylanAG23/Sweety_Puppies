const { JWT_SECRET } = require('./helpers/testEnv');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

function tokenFor(rol) {
  return jwt.sign({ sub: 'usuario-prueba', email: 'prueba@example.com', rol }, JWT_SECRET, { expiresIn: '5m' });
}

test('el servidor arranca y responde el healthcheck', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, status: 'ok' });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
});

test('las rutas privadas exigen token', async () => {
  for (const path of ['/api/clientes', '/api/reportes/dashboard', '/api/cliente/mascotas', '/api/auth/me/profile']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, path);
  }
});

test('un token firmado con otro secreto se rechaza', async () => {
  const forged = jwt.sign({ sub: 'x', rol: 'administrador' }, 'secreto-falso');
  const response = await fetch(`${baseUrl}/api/clientes`, { headers: { Authorization: `Bearer ${forged}` } });
  assert.equal(response.status, 403);
});

test('un cliente no puede entrar a rutas de administracion', async () => {
  const response = await fetch(`${baseUrl}/api/clientes`, {
    headers: { Authorization: `Bearer ${tokenFor('cliente')}` }
  });
  assert.equal(response.status, 403);
});

test('una administradora no puede entrar a rutas del portal del cliente', async () => {
  const response = await fetch(`${baseUrl}/api/cliente/mascotas`, {
    headers: { Authorization: `Bearer ${tokenFor('administrador')}` }
  });
  assert.equal(response.status, 403);
});

test('el legado /api/citas ya no esta expuesto', async () => {
  for (const method of ['GET', 'POST', 'DELETE']) {
    const response = await fetch(`${baseUrl}/api/citas${method === 'DELETE' ? '/1' : ''}`, { method });
    assert.equal(response.status, 404, method);
  }
});

test('no se publican archivos del proyecto frontend', async () => {
  for (const path of ['/package.json', '/src/main.ts', '/vite.config.ts']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 404, path);
  }
});

test('un JSON mal formado responde 400 sin detalles internos', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{malo'
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.doesNotMatch(body.message, /SyntaxError|at /);
});

test('CORS solo autoriza los origenes configurados', async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const denied = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://sitio-ajeno.example' } });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('las rutas desconocidas de la API responden 404 en JSON', async () => {
  const response = await fetch(`${baseUrl}/api/no-existe`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
