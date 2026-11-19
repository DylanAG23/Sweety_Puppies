// Verifica la entrega real con NODE_ENV=production y dependencias propias.
// Todos los datos son ficticios. La BD deliberadamente inaccesible debe dar 503.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { createHash, randomBytes } = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const assert = require('node:assert/strict');
const { smoke } = require('../../scripts/smoke-deployment.cjs');

async function unusedPort() {
  const server = net.createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

(async () => {
  const directory = path.resolve(process.argv[2]);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'release-manifest.json'), 'utf8'));
  for (const [file, hash] of Object.entries(manifest.files)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(directory, file))).digest('hex'), hash, file);
    assert.doesNotMatch(file, /(^|\/)\.env(?:$|\.)|\.(?:backup|gz|log)$|(^|\/)(?:tests|node_modules|\.git)(\/|$)/i);
  }
  assert.ok(fs.existsSync(path.join(directory, 'node_modules/express/package.json')), 'Instala las dependencias en la entrega antes de verificarla.');
  const port = await unusedPort(), unavailablePort = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port), HOST: '127.0.0.1',
    JWT_SECRET: randomBytes(48).toString('hex'), APPOINTMENT_ACTION_SECRET: randomBytes(48).toString('hex'),
    DATABASE_URL: `postgres://demo:fake@127.0.0.1:${unavailablePort}/demo`, APP_BASE_URL: baseUrl,
    SUPABASE_URL: 'https://demo.example.invalid', SUPABASE_KEY: 'ficticia', BUCKET_NAME: 'imagenes',
    MAIL_MODE: 'gmail', MAIL_USER: 'demo@example.invalid', MAIL_APP_PASSWORD: 'ficticia', MAIL_FROM: 'Demo <demo@example.invalid>',
    CORS_ORIGINS: '', TRUST_PROXY: 'false', MAIL_EXPOSE_DEV_CODES: 'false' };
  execFileSync(process.execPath, ['scripts/check-production.cjs'], { cwd: directory, env, stdio: 'pipe' });
  const child = spawn(process.execPath, ['scripts/start-production.cjs'], { cwd: directory, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', () => {});
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(poll); reject(new Error('El servidor empaquetado no inicio.')); }, 15000);
      const poll = setInterval(() => {
        if (logs.includes('Servidor corriendo')) { clearTimeout(timeout); clearInterval(poll); resolve(); }
        else if (child.exitCode !== null) { clearTimeout(timeout); clearInterval(poll); reject(new Error('El servidor empaquetado termino antes de iniciar.')); }
      }, 50);
    });
    const result = await smoke(baseUrl);
    assert.equal(result.ok, false);
    assert.deepEqual(result.results.filter(item => !item.ok), [{ path: '/api/ready', ok: false, status: 503 }]);
    const html = await (await fetch(baseUrl + '/login')).text();
    const asset = /<script[^>]+src="([^"]+)"/.exec(html)?.[1];
    assert.ok(asset, 'El HTML debe referenciar el JS compilado.');
    const script = await fetch(baseUrl + asset);
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(baseUrl + '/api-docs/')).status, 200);
    console.log(JSON.stringify({ packagedFiles: Object.keys(manifest.files).length, manifestVerified: true,
      productionStartup: true, spaAndAssets: true, privateRoutesProtected: true,
      databaseUnavailableReturns503: true, externalServicesContacted: false }, null, 2));
  } finally {
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
