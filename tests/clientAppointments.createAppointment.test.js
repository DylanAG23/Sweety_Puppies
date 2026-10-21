require('./helpers/testEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../clientAppointments/domain/services/appointmentRules');
const { createClientAppointment } = require('../clientAppointments/application/useCases/createClientAppointment');
const { AppointmentError } = require('../clientAppointments/domain/errors/AppointmentError');

const CLIENT_ID = 'c0000000-0000-0000-0000-000000000001';
const PET_ID = 'a0000000-0000-0000-0000-000000000001';
const SERVICE_ID = 'b0000000-0000-0000-0000-000000000001';
const ADDITIONAL_ID = 'd0000000-0000-0000-0000-000000000001';

// Primer lunes a mas de 10 dias de hoy: siempre es una fecha futura y laboral.
function futureMonday() {
  let date = rules.addDays(rules.getBusinessNow().date, 10);
  while (rules.getDayName(date) !== 'lunes') {
    date = rules.addDays(date, 1);
  }
  return date;
}

function buildDependencies({ blockingAppointments = [] } = {}) {
  const calls = { transactions: 0, created: [], additionals: [], notifications: [] };
  const transactionHandle = { id: 'tx-1' };

  const appointmentRepository = {
    resolveClientContext: async () => ({ primaryClientId: CLIENT_ID, clientIds: [CLIENT_ID] }),
    findOwnedPet: async (petId, clientIds) =>
      petId === PET_ID && clientIds.includes(CLIENT_ID)
        ? { id: PET_ID, nombre: 'Lulu', tamano: 'pequeno', tipo_pelaje: 'corto' }
        : null,
    findActiveService: async (serviceId) =>
      serviceId === SERVICE_ID
        ? {
            id: SERVICE_ID,
            nombre: 'Bano completo',
            duracion_minutos: 120,
            requiere_tamano: true,
            requiere_tipo_pelaje: true,
            aplica_recargo_nudos: true,
            aplica_recargo_comportamiento: true
          }
        : null,
    findActiveAdditionalServicesByIds: async (ids) =>
      ids.filter((id) => id === ADDITIONAL_ID).map((id) => ({ id, nombre: 'Hidratacion', descripcion: null })),
    findBaseServicePrice: async () => 85000,
    findAdditionalServicePrices: async (ids) => ids.map((id) => ({ servicio_adicional_id: id, precio: 20000 })),
    getBusinessScheduleForDate: async () => ({
      abierto: true,
      hora_apertura: '09:00:00',
      hora_cierre: '17:00:00',
      ultima_cita: '15:00:00',
      duracion_base_minutos: 60
    }),
    listAgendaBlocks: async () => [],
    listBlockingAppointments: async () => blockingAppointments,
    runInTransaction: async (work) => {
      calls.transactions += 1;
      return work(transactionHandle);
    },
    createAppointment: async (payload, db) => {
      assert.equal(db, transactionHandle, 'la cita debe crearse dentro de la transaccion');
      calls.created.push(payload);
      return { id: 'cita-nueva', estado: 'pendiente', fecha: payload.fecha, horaInicio: payload.horaInicio };
    },
    addAppointmentAdditional: async (appointmentId, additional, db) => {
      assert.equal(db, transactionHandle, 'los adicionales deben guardarse en la misma transaccion');
      calls.additionals.push({ appointmentId, additional });
    },
    getAppointmentNotificationDetails: async (id) => ({ id })
  };

  return {
    calls,
    dependencies: {
      appointmentRepository,
      assetStorageService: { uploadCurrentStatePhoto: async () => ({ publicUrl: 'https://example.com/foto.jpg' }) },
      notificationService: {
        sendAppointmentRequest: async (appointment, flow) => calls.notifications.push({ appointment, flow })
      },
      rules
    }
  };
}

const session = { sub: 'usuario-1', rol: 'cliente', clienteId: CLIENT_ID };

test('crea una cita pendiente con precio calculado, adicionales y notificacion', async () => {
  const { dependencies, calls } = buildDependencies();
  const fecha = futureMonday();

  const result = await createClientAppointment(dependencies, session, {
    mascotaId: PET_ID,
    servicioId: SERVICE_ID,
    servicioAdicionalIds: [ADDITIONAL_ID],
    estadoPelajeReportado: 'normal',
    comportamientoReportado: 'normal',
    fecha,
    horaInicio: '09:00:00'
  });

  assert.equal(calls.transactions, 1);
  assert.equal(calls.created.length, 1);
  assert.equal(calls.created[0].clienteId, CLIENT_ID);
  assert.equal(calls.created[0].precioCalculado, 105000);
  assert.equal(calls.created[0].horaFinEstimada, '11:00:00');
  assert.equal(calls.additionals.length, 1);
  assert.equal(calls.notifications.length, 1);
  assert.equal(result.cita.precioCalculado, 105000);
  assert.deepEqual(result.warnings, []);
});

test('rechaza una hora que ya ocupa una cita confirmada', async () => {
  const { dependencies, calls } = buildDependencies({
    blockingAppointments: [{ hora_inicio: '09:00:00', hora_fin_estimada: '11:00:00' }]
  });

  await assert.rejects(
    createClientAppointment(dependencies, session, {
      mascotaId: PET_ID,
      servicioId: SERVICE_ID,
      fecha: futureMonday(),
      horaInicio: '09:00:00'
    }),
    (error) => error instanceof AppointmentError && error.code === 'SLOT_NOT_AVAILABLE'
  );
  assert.equal(calls.created.length, 0);
});

test('no permite agendar con una mascota de otra cuenta', async () => {
  const { dependencies, calls } = buildDependencies();

  await assert.rejects(
    createClientAppointment(dependencies, session, {
      mascotaId: 'a0000000-0000-0000-0000-00000000ffff',
      servicioId: SERVICE_ID,
      fecha: futureMonday(),
      horaInicio: '09:00:00'
    }),
    (error) => error instanceof AppointmentError && error.status === 404
  );
  assert.equal(calls.transactions, 0);
});

test('un fallo del correo no impide registrar la cita', async () => {
  const { dependencies, calls } = buildDependencies();
  dependencies.notificationService.sendAppointmentRequest = async () => {
    throw new Error('SMTP caido');
  };

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const result = await createClientAppointment(dependencies, session, {
      mascotaId: PET_ID,
      servicioId: SERVICE_ID,
      fecha: futureMonday(),
      horaInicio: '10:00:00'
    });
    assert.equal(result.cita.id, 'cita-nueva');
    assert.equal(calls.created.length, 1);
  } finally {
    console.error = originalConsoleError;
  }
});
