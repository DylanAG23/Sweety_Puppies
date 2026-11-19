// Solo GET publicos: no crea cuentas, pedidos, imagenes ni movimientos.
async function smoke(baseUrl, fetchImpl = fetch) {
  const origin = new URL(baseUrl);
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new Error('Indica el origen HTTP/HTTPS de la aplicacion, sin ruta ni credenciales.');
  }
  const checks = [
    { path: '/api/health', status: 200, verify: async r => (await r.json()).status === 'ok' },
    { path: '/api/ready', status: 200, verify: async r => (await r.json()).status === 'ready' },
    { path: '/login', status: 200, verify: async r => /id=["']app["']/.test(await r.text()) },
    { path: '/cliente/carrito', status: 200, verify: async r => /id=["']app["']/.test(await r.text()) },
    { path: '/api/politica-datos', status: 200, verify: async r => Boolean((await r.json()).version) },
    { path: '/api/clientes', status: 401 },
    { path: '/api/no-existe', status: 404 },
    { path: '/.env', status: 404 },
    { path: '/package.json', status: 404 }
  ];
  const results = [];
  for (const check of checks) {
    try {
      const response = await fetchImpl(new URL(check.path, origin), { signal: AbortSignal.timeout(15000), redirect: 'manual' });
      const ok = response.status === check.status && (!check.verify || await check.verify(response));
      results.push({ path: check.path, ok, status: response.status });
    } catch { results.push({ path: check.path, ok: false, status: 'sin respuesta' }); }
  }
  return { ok: results.every(result => result.ok), results };
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Uso: npm run smoke:deployment -- https://tu-dominio');
    process.exitCode = 1;
  } else {
    smoke(url).then(result => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
module.exports = { smoke };
