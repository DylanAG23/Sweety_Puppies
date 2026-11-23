require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { assertStartupConfig, getTrustProxy, getPort, getAppBaseUrl, shouldExposeDevelopmentCodes } = require('../config/env');
const { createApp } = require('../app');
const { smoke } = require('../scripts/smoke-deployment.cjs');

const production = {
  NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(48), APPOINTMENT_ACTION_SECRET: 'b'.repeat(48),
  DATABASE_URL: 'postgres://demo:fake@127.0.0.1:1/demo', APP_BASE_URL: 'https://demo.example.test',
  SUPABASE_URL: 'https://demo.example.test', SUPABASE_KEY: 'clave-de-prueba', BUCKET_NAME: 'imagenes',
  MAIL_MODE: 'gmail', MAIL_USER: 'demo@example.test', MAIL_APP_PASSWORD: 'ficticia', MAIL_FROM: 'Demo <demo@example.test>',
  CORS_ORIGINS: '', TRUST_PROXY: 'false', PORT: '3000'
};
async function withEnv(values, work) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  try { return await work(); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}
async function serve(app, work) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { return await work(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('produccion exige secretos separados, URL valida, Storage y correo operativo', async () => {
  await withEnv(production, async () => {
    assert.doesNotThrow(assertStartupConfig);
    await withEnv({ APP_BASE_URL: 'https://demo.example.test/' }, () => assert.equal(getAppBaseUrl(), 'https://demo.example.test'));
    for (const [key, value, message] of [
      ['JWT_SECRET', 'cambiar', /JWT_SECRET/],
      ['APPOINTMENT_ACTION_SECRET', production.JWT_SECRET, /diferentes/],
      ['APP_BASE_URL', 'http://demo.example.test', /HTTPS/],
      ['APP_BASE_URL', 'https://demo.example.test/login', /sin ruta/],
      ['SUPABASE_KEY', undefined, /SUPABASE_KEY/],
      ['MAIL_MODE', 'local', /local/],
      ['MAIL_APP_PASSWORD', undefined, /MAIL_APP_PASSWORD/],
      ['CORS_ORIGINS', 'https://cliente.example.test/', /origenes exactos/]
    ]) await withEnv({ [key]: value }, () => assert.throws(assertStartupConfig, message));
    await withEnv({ APP_BASE_URL: 'http://127.0.0.1:3000', MAIL_EXPOSE_DEV_CODES: 'true' }, () => {
      assert.doesNotThrow(assertStartupConfig);
      assert.equal(shouldExposeDevelopmentCodes(), false);
    });
    await withEnv({ MAIL_MODE: 'disabled', MAIL_FROM: undefined, MAIL_USER: undefined, MAIL_APP_PASSWORD: undefined }, () => {
      assert.doesNotThrow(assertStartupConfig);
    });
  });
});

test('produccion no toma secretos faltantes del .env de desarrollo', () => {
  const env = { ...process.env, NODE_ENV: 'production', JWT_SECRET: '' };
  const output = execFileSync(process.execPath, ['-e', "console.log(require('./config/env').readEnv('JWT_SECRET') === null)"],
    { cwd: require('node:path').join(__dirname, '..'), env, encoding: 'utf8' });
  assert.equal(output.trim(), 'true');
});

test('puerto y confianza de proxy rechazan configuraciones ambiguas', async () => {
  for (const value of ['abc', '0', '-1', '65536']) await withEnv({ PORT: value }, () => assert.throws(getPort, /PORT/));
  for (const value of ['true', '99', '0.0.0.0/99', '10.0.0.0/24/', 'mal']) await withEnv({ TRUST_PROXY: value }, () => assert.throws(getTrustProxy, /TRUST_PROXY/));
  await withEnv({ TRUST_PROXY: 'loopback,10.0.0.0/24' }, () => assert.deepEqual(getTrustProxy(), ['loopback', '10.0.0.0/24']));
});

test('proxy configurado resuelve IP real e ignora una cabecera falsificada por defecto', async () => {
  for (const value of ['false', 'loopback']) {
    await withEnv({ TRUST_PROXY: value }, async () => {
      const app = require('express')();
      app.set('trust proxy', getTrustProxy());
      const limiter = require('../middleware/rateLimit').createRateLimiter({ windowMs: 60000, max: 1, keyGenerator: req => req.ip, message: 'limite' });
      app.get('/', limiter, (req, res) => res.json({ ip: req.ip }));
      await serve(app, async url => {
        assert.equal((await fetch(url, { headers: { 'X-Forwarded-For': '203.0.113.1' } })).status, 200);
        assert.equal((await fetch(url, { headers: { 'X-Forwarded-For': '203.0.113.2' } })).status, value === 'false' ? 429 : 200);
      });
    });
  }
});

test('readiness separa BD caida de proceso disponible y no expone el error', async () => {
  let available = false;
  await serve(createApp({ checkDatabase: async () => { if (!available) throw new Error('password=secreto-no-publicable'); } }), async url => {
    assert.equal((await fetch(`${url}/api/health`)).status, 200);
    let response = await fetch(`${url}/api/ready`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await response.text(), /password|secreto/);
    available = true;
    response = await fetch(`${url}/api/ready`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).database, 'available');
    for (const hidden of ['/.env', '/.git/config', '/carpeta/.env.production']) {
      assert.equal((await fetch(url + hidden)).status, 404);
    }
  });
});

test('smoke de despliegue solo consulta y nunca marca listo un destino sin BD', async () => {
  let available = false;
  const mockFetch = async (url, options) => {
    assert.equal(options.method, undefined);
    let status = 200, data = '<div id="app"></div>';
    if (url.pathname === '/api/ready') { status = available ? 200 : 503; data = JSON.stringify({ status: available ? 'ready' : 'unavailable' }); }
    else if (url.pathname === '/api/health') data = JSON.stringify({ status: 'ok' });
    else if (url.pathname === '/api/politica-datos') data = JSON.stringify({ version: 'v1' });
    else if (url.pathname === '/api/clientes') status = 401;
    else if (['/api/no-existe', '/.env', '/package.json'].includes(url.pathname)) status = 404;
    return new Response(data, { status });
  };
  assert.equal((await smoke('https://demo.example.test', mockFetch)).ok, false);
  available = true;
  assert.equal((await smoke('https://demo.example.test', mockFetch)).ok, true);
  await assert.rejects(smoke('https://user:pass@example.test', mockFetch), /sin ruta ni credenciales/);
});

test('Swagger usa el mismo origen del despliegue', () => {
  const { swaggerSpec } = require('../swagger');
  assert.equal(swaggerSpec.servers[0].url, '/api');
  assert.ok(Object.keys(swaggerSpec.paths).length > 10);
});
