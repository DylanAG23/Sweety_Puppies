require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { policy, consentEvidence } = require('../shared/legal/consent');
const validation = require('../auth/domain/services/authValidation');
const { initiateCustomerRegistration } = require('../auth/application/useCases/initiateCustomerRegistration');
const { verifyRegistrationCode } = require('../auth/application/useCases/verifyRegistrationCode');
const { PGlite } = require('@electric-sql/pglite');
const db = require('../baseDatos');
const { PostgresAuthRepository } = require('../auth/infrastructure/repositories/PostgresAuthRepository');

const input = { nombre: 'Ana', apellido: 'Prueba', cedula: '123', telefono: '3000000000',
  email: 'ana@example.test', password: 'Prueba123!', confirmPassword: 'Prueba123!',
  consentimiento_datos: true, politica_version: policy.version };

test('registro exige aceptación explícita y la versión vigente', () => {
  for (const value of [false, undefined, 'true', 1]) {
    assert.throws(() => validation.validateRegistrationInput({ ...input, consentimiento_datos: value }), /política/);
  }
  assert.throws(() => validation.validateRegistrationInput({ ...input, politica_version: 'antigua' }), /política/);
  assert.equal(validation.validateRegistrationInput(input).email, input.email);
});

test('registro conserva evidencia del servidor sin aceptar una fecha o hash del navegador', async () => {
  let stored;
  await initiateCustomerRegistration({ validation,
    authRepository: { ensureNoDuplicateUser: async () => {}, invalidatePendingRegistrationCodes: async () => {},
      createPendingRegistration: async (data) => { stored = data; } },
    hashService: { hash: async () => 'hash-prueba' },
    verificationCodeService: { generateCode: () => '123456', buildExpirationDate: () => new Date('2030-01-01') },
    notificationService: { sendVerificationCode: async () => ({ delivered: true }) }
  }, { ...input, fecha: 'inventada', sha256: 'inventado' });
  assert.equal(stored.payload.consentimiento_datos.version, policy.version);
  assert.equal(stored.payload.consentimiento_datos.sha256, policy.sha256);
  assert.equal(stored.payload.consentimiento_datos.publicidad, false);
  assert.ok(Number.isFinite(Date.parse(stored.payload.consentimiento_datos.fecha)));
});

test('verificar código conserva vínculo con usuario y rechaza registros antiguos sin consentimiento', async () => {
  let pending = {}, created = false, evidenceUser;
  const deps = { validation, authRepository: {
    findValidVerificationCode: async () => ({ id: 'codigo', payload: pending }),
    ensureNoDuplicateUser: async () => {},
    transaction: async (work) => work({
      lockRegistrationCode: async () => ({ id: 'codigo', payload: pending }),
      ensureNoDuplicateUser: async () => {},
      createUser: async () => { created = true; return { id: 'usuario' }; },
      createClient: async () => ({ id: 'cliente' }),
      markVerificationCodeAsUsed: async (id, user) => { evidenceUser = user; }
    })
  } };
  await assert.rejects(verifyRegistrationCode(deps, { email: input.email, codigo: '123456' }), /política/);
  assert.equal(created, false);
  pending = { ...input, consentimiento_datos: consentEvidence() };
  await verifyRegistrationCode(deps, { email: input.email, codigo: '123456' });
  assert.equal(evidenceUser, 'usuario');
});

test('registro y reenvío conservan evidencia vinculada al usuario en PostgreSQL aislado', async () => {
  const pg = new PGlite();
  const originalQuery = db.query, originalTransaction = db.withTransaction;
  const adapter = (conn) => ({ query: async (sql, args) => {
    const result = await conn.query(sql, args);
    return { ...result, rowCount: result.affectedRows || result.rows.length };
  } });
  try {
    await pg.exec(`CREATE TABLE usuarios(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE, password_hash text, rol text, activo boolean);
      CREATE TABLE clientes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id uuid REFERENCES usuarios(id), nombre text, apellido text, cedula text UNIQUE, telefono text, activo boolean);
      CREATE TABLE codigos_verificacion(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, codigo text, tipo text, payload jsonb, expiracion timestamptz, usado boolean, created_at timestamptz DEFAULT now());`);
    db.query = adapter(pg).query;
    db.withTransaction = work => pg.transaction(tx => work(adapter(tx)));
    const deps = { validation, authRepository: new PostgresAuthRepository(),
      hashService: { hash: async () => 'hash-prueba' },
      verificationCodeService: { generateCode: () => '123456', buildExpirationDate: () => new Date(Date.now() + 600000) },
      notificationService: { sendVerificationCode: async () => ({ delivered: true }) } };
    await initiateCustomerRegistration(deps, input);
    await initiateCustomerRegistration(deps, input);
    assert.equal((await db.query('SELECT * FROM codigos_verificacion WHERE NOT usado')).rowCount, 1);
    const result = await verifyRegistrationCode(deps, { email: input.email, codigo: '123456' });
    const evidence = (await db.query("SELECT payload FROM codigos_verificacion WHERE payload->>'usuarioId'=$1 AND usado", [result.usuario.id])).rows[0].payload;
    assert.equal(evidence.consentimiento_datos.sha256, policy.sha256);
    assert.equal(evidence.passwordHash, undefined);
    await assert.rejects(verifyRegistrationCode(deps, { email: input.email, codigo: '123456' }), /inválido/);
    await assert.rejects(initiateCustomerRegistration(deps, input), /Ya existe/);
  } finally {
    db.query = originalQuery;
    db.withTransaction = originalTransaction;
    await pg.close();
  }
});
