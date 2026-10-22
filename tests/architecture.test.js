require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Modulos hexagonales: carpetas de la raiz con index.js y domain/.
const MODULES = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(ROOT, name, 'domain')) && fs.existsSync(path.join(ROOT, name, 'index.js')));

// Lo que el dominio y los casos de uso nunca deben importar.
const FORBIDDEN = [
  /^express$/,
  /^pg$/,
  /^multer$/,
  /^jsonwebtoken$/,
  /^bcrypt$/,
  /^nodemailer$/,
  /^@supabase\//,
  /baseDatos/,
  /\/infrastructure\//,
  /\/config\//,
  /\/services\/(emailService|supabaseStorage)/
];

function jsFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return jsFiles(fullPath);
    }
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

test('se detectan los modulos hexagonales, incluidos los de la Fase 2', () => {
  for (const name of ['auth', 'clientAppointments', 'adminReports', 'catalog', 'inventory', 'cart', 'orders']) {
    assert.ok(MODULES.includes(name), `falta el modulo ${name}`);
  }
});

test('dominio y casos de uso no dependen de infraestructura ni de librerias externas', () => {
  const violations = [];

  for (const moduleName of MODULES) {
    for (const layer of ['domain', 'application']) {
      for (const file of jsFiles(path.join(ROOT, moduleName, layer))) {
        const source = fs.readFileSync(file, 'utf8');
        const requires = [...source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((match) => match[1]);

        for (const required of requires) {
          if (FORBIDDEN.some((pattern) => pattern.test(required))) {
            violations.push(`${path.relative(ROOT, file)} -> ${required}`);
          }
        }

        if (/process\.env/.test(source)) {
          violations.push(`${path.relative(ROOT, file)} -> process.env`);
        }
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('cada modulo expone una funcion de composicion create<Nombre>Module', () => {
  for (const moduleName of MODULES) {
    const exported = require(path.join(ROOT, moduleName));
    const factories = Object.entries(exported).filter(
      ([key, value]) => /^create[A-Z]\w*Module$/.test(key) && typeof value === 'function'
    );
    assert.equal(factories.length, 1, `${moduleName} debe exportar una sola funcion create...Module`);
  }
});

test('los modulos de la Fase 2 cargan sin conectarse a nada', () => {
  const { createCatalogModule } = require('../catalog');
  const { createInventoryModule } = require('../inventory');
  const { createCartModule } = require('../cart');
  const { createOrdersModule } = require('../orders');

  for (const factory of [createCatalogModule, createInventoryModule, createCartModule, createOrdersModule]) {
    const moduleInstance = factory();
    assert.equal(typeof moduleInstance.useCases, 'object');
    assert.equal(typeof moduleInstance.controller, 'object');
  }
});
