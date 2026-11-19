class StoreError extends Error {
  constructor(message, status = 400, code = 'VALIDATION_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function fail(message, status = 400, code) {
  throw new StoreError(message, status, code);
}
function uuid(value) {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  )
    fail('Identificador inválido');
  return value.toLowerCase();
}
function integer(value, min = 0, max = 2147483647) {
  if (
    !['number', 'string'].includes(typeof value) ||
    String(value).trim() === '' ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    fail('Cantidad o precio inválido');
  return Number(value);
}
function text(value, max = 150, required = true) {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail('Revisa los campos obligatorios y su longitud');
  return value.trim();
}
function boolean(value) {
  if (typeof value !== 'boolean') fail('Estado inválido');
  return value;
}
function method(value) {
  if (!['tarjeta', 'nequi', 'efectivo'].includes(value))
    fail('Método de pago inválido');
  return value;
}
function total(items) {
  return integer(
    items.reduce(
      (sum, i) =>
        sum +
        integer(i.cantidad, 1) * integer(i.precio ?? i.precio_unitario, 1),
      0
    ),
    1
  );
}
function dateRange(query) {
  const valid = (s) =>
    typeof s === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(query.desde) || !valid(query.hasta) || query.desde > query.hasta)
    fail('Selecciona un período válido');
  return { desde: query.desde, hasta: query.hasta };
}
module.exports = {
  StoreError,
  fail,
  uuid,
  integer,
  text,
  boolean,
  method,
  total,
  dateRange
};
