require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, escapeHtmlFields } = require('../shared/text/escapeHtml');
const { detectImageType } = require('../shared/http/imageUpload');
const { createRateLimiter } = require('../middleware/rateLimit');
const { renderAppointmentReviewPage } = require('../clientAppointments/infrastructure/services/AppointmentReviewPageRenderer');
const { getDatabaseConfig, ConfigError } = require('../config/env');

test('escapeHtml neutraliza etiquetas y comillas', () => {
  assert.equal(escapeHtml('<script>"x"&\'y\''), '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;');
  assert.equal(escapeHtml(null), '');
  assert.deepEqual(escapeHtmlFields({ a: '<b>', n: 3, list: [{ nombre: '<i>' }] }), {
    a: '&lt;b&gt;',
    n: 3,
    list: [{ nombre: '&lt;i&gt;' }]
  });
});

test('la pagina de revision de citas no ejecuta HTML escrito por el cliente', () => {
  const html = renderAppointmentReviewPage({
    title: 'Revisa',
    message: 'Mensaje',
    token: 'abc"><script>',
    appointment: {
      clientName: '<script>alert(1)</script>',
      petName: 'Lulu',
      serviceName: 'Bano',
      fecha: '2026-11-02',
      horaInicio: '09:00:00',
      horaFinEstimada: '11:00:00',
      estado: 'pendiente',
      estadoPelajeReportado: 'normal',
      comportamientoReportado: 'normal',
      precioFinal: 100000,
      additionalServices: [{ nombre: '<img src=x onerror=alert(1)>', precio: 1000 }],
      observacionesCliente: '<svg onload=alert(1)>'
    }
  });

  assert.doesNotMatch(html, /<script>|<img src|<svg|"><script/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('detectImageType reconoce imagenes reales y rechaza otros contenidos', () => {
  assert.equal(detectImageType(Buffer.from('ffd8ffe000104a464946000101', 'hex')), 'image/jpeg');
  assert.equal(detectImageType(Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')), 'image/png');
  assert.equal(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(detectImageType(Buffer.from('GIF89a\0\0\0\0\0\0')), 'image/gif');
  assert.equal(detectImageType(Buffer.from('<svg onload=alert(1)></svg>')), null);
  assert.equal(detectImageType(Buffer.from('<html><body>hola</body></html>')), null);
});

test('el limitador bloquea al superar el maximo y responde 429', () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 2, keyGenerator: () => 'k', message: 'espera' });
  const statuses = [];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = {
      setHeader() {},
      status(code) {
        statuses.push(code);
        return { json() {} };
      }
    };
    limiter({}, res, () => statuses.push('next'));
  }

  assert.deepEqual(statuses, ['next', 'next', 429]);
});

test('sin configuracion de base de datos el arranque falla con un mensaje claro', () => {
  assert.throws(() => getDatabaseConfig(), (error) => error instanceof ConfigError && /DB_HOST/.test(error.message));
});
