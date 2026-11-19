require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const db = require('../baseDatos');
const { PostgresClientAppointmentsRepository } = require('../clientAppointments/infrastructure/repositories/PostgresClientAppointmentsRepository');
const { PostgresAdminServiceManagementRepository } = require('../adminServiceManagement/infrastructure/repositories/PostgresAdminServiceManagementRepository');
const { createClientAppointment } = require('../clientAppointments/application/useCases/createClientAppointment');
const { confirmAdminAppointment } = require('../adminServiceManagement/application/useCases/confirmAdminAppointment');
const { startAdminAppointment } = require('../adminServiceManagement/application/useCases/startAdminAppointment');
const { finalizeAdminAppointment } = require('../adminServiceManagement/application/useCases/finalizeAdminAppointment');
const appointmentRules = require('../clientAppointments/domain/services/appointmentRules');
const managementRules = require('../adminServiceManagement/domain/services/managementRules');
const { policy } = require('../shared/legal/consent');

test('ACT-35: cita completa, compra y doble flujo conservan separados el historial y el inventario', async () => {
  const pg = new PGlite();
  const originalQuery = db.query, originalTransaction = db.withTransaction;
  const adapter = (conn) => ({ query: async (sql, params) => {
    const result = await conn.query(sql, params);
    return { ...result, rowCount: result.affectedRows || result.rows.length };
  } });
  try {
    await pg.exec(fs.readFileSync(path.join(__dirname, '../database/001_application_baseline.sql'), 'utf8'));
    db.query = adapter(pg).query;
    db.withTransaction = work => pg.transaction(tx => work(adapter(tx)));
    const insert = async (sql, params = []) => (await db.query(sql + ' RETURNING id', params)).rows[0].id;
    const uid = await insert("INSERT INTO usuarios(email,password_hash,rol) VALUES('cliente@example.test','no-login','cliente')");
    const aid = await insert("INSERT INTO usuarios(email,password_hash,rol) VALUES('admin@example.test','no-login','administrador')");
    const clientId = await insert("INSERT INTO clientes(usuario_id,nombre,apellido,cedula,telefono) VALUES($1,'Cliente','Prueba','100000','3000000000')", [uid]);
    await insert("INSERT INTO administradores(usuario_id,username,nombre,telefono) VALUES($1,'prueba','Admin','3000000001')", [aid]);
    const petId = await insert("INSERT INTO mascotas(cliente_id,nombre,tamano,tipo_pelaje,edad) VALUES($1,'Luna','pequeno','corto',2)", [clientId]);
    const serviceId = await insert("INSERT INTO servicios(nombre,duracion_minutos) VALUES('Baño de prueba',60)");
    await db.query("INSERT INTO tarifas_servicio(servicio_id,tamano,tipo_pelaje,precio_base) VALUES($1,'pequeno','corto',50000)", [serviceId]);
    const date = appointmentRules.addDays(appointmentRules.getBusinessNow().date, 3);
    await db.query("INSERT INTO horarios_negocio(dia,hora_apertura,hora_cierre,ultima_cita,duracion_base_minutos) VALUES($1,'08:00','18:00','16:00',60)", [appointmentRules.getDayName(date)]);
    const user = { id: uid, rol: 'cliente' }, admin = { id: aid, rol: 'administrador' };
    const notifications = [];
    const appointmentDeps = { appointmentRepository: new PostgresClientAppointmentsRepository(), rules: appointmentRules,
      assetStorageService: {}, notificationService: { sendAppointmentRequest: async () => notifications.push('solicitud') } };
    const requested = await createClientAppointment(appointmentDeps, user, { mascotaId: petId, servicioId: serviceId, fecha: date, horaInicio: '09:00:00' });
    assert.equal(requested.cita.estado, 'pendiente');
    const managementDeps = { managementRepository: new PostgresAdminServiceManagementRepository(),
      // Avance de reloj para poder iniciar la cita futura sin esperar días reales.
      rules: { ...managementRules, canStartAppointmentNow: () => ({ allowed: true }) }, emailViewModelBuilder: x => x,
      notificationService: {
        notifyAppointmentConfirmed: async () => notifications.push('confirmada'),
        notifyAppointmentStarted: async () => notifications.push('atencion'),
        notifyAppointmentCompleted: async () => notifications.push('completada')
      } };
    const id = requested.cita.id;
    await confirmAdminAppointment(managementDeps, admin, id);
    await startAdminAppointment(managementDeps, admin, id);
    await finalizeAdminAppointment(managementDeps, admin, id, { observacionesFinales: 'Prueba de integración' });
    assert.equal((await db.query('SELECT estado FROM citas WHERE id=$1', [id])).rows[0].estado, 'completada');
    assert.deepEqual(notifications, ['solicitud', 'confirmada', 'atencion', 'completada']);
    const historyBefore = (await db.query('SELECT * FROM historial_citas WHERE cita_id=$1', [id])).rows;
    assert.equal(historyBefore.length, 1);
    assert.equal(historyBefore[0].precio_final, 50000);

    const catalog = require('../catalog').createCatalogModule().useCases;
    const cart = require('../cart').createCartModule().useCases;
    const inventory = require('../inventory').createInventoryModule().useCases;
    const orders = require('../orders').createOrdersModule().useCases;
    const category = (await catalog.saveCategory(admin, null, { nombre: 'Prueba' })).categoria;
    const product = (await catalog.saveProduct(admin, null, { categoria_id: category.id, referencia: 'REG-35', nombre: 'Juguete de prueba', precio: 15000 })).producto;
    await inventory.registerInventoryMovement(admin, { productoId: product.id, tipo: 'entrada', cantidad: 5, motivo: 'Prueba aislada' });
    await cart.set(user, { producto_id: product.id, cantidad: 2 });
    const order = (await orders.checkout(user, { requestId: randomUUID(), metodo_pago: 'tarjeta', total_esperado: 30000,
      consentimiento: true, consentimiento_datos: true, politica_version: policy.version })).orden;
    await orders.action(user, order.id, { accion: 'pagar', resultado: 'rechazado', metodo_pago: 'tarjeta', requestId: randomUUID() });
    assert.equal((await cart.get(user)).cantidad, 2);
    await orders.action(user, order.id, { accion: 'pagar', resultado: 'aprobado', metodo_pago: 'tarjeta', requestId: randomUUID() });
    assert.equal((await db.query('SELECT stock_actual FROM inventario WHERE producto_id=$1', [product.id])).rows[0].stock_actual, 3);
    assert.deepEqual((await db.query('SELECT * FROM historial_citas WHERE cita_id=$1', [id])).rows, historyBefore);
    assert.equal((await db.query('SELECT count(*)::int n FROM citas')).rows[0].n, 1);
    const from = appointmentRules.addDays(appointmentRules.getBusinessNow().date, -1);
    const to = appointmentRules.addDays(date, 1);
    const report = (await orders.report(admin, { desde: from, hasta: to })).reporte;
    assert.equal(report.servicios, 50000);
    assert.equal(report.productos, 30000);
    assert.equal(report.consolidado, 80000);
    const legacyReport = await require('../adminReports').createAdminReportsModule().useCases.getAdminRevenueReport(admin,
      { periodo: 'range', fechaInicio: from, fechaFin: to });
    assert.equal(legacyReport.reporte.totalIngresado, 50000);
    await assert.rejects(finalizeAdminAppointment(managementDeps, admin, id, {}), /atencion/);
  } finally {
    db.query = originalQuery; db.withTransaction = originalTransaction;
    await pg.close();
  }
});
