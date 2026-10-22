// API de tienda; paths relativos al servidor /api ya definido en swagger.js.
const uuid = { type: 'string', format: 'uuid' };
const text = { type: 'string' };
const integer = { type: 'integer', minimum: 1 };
const method = { type: 'string', enum: ['tarjeta', 'nequi', 'efectivo'] };
const fields = (properties, required = []) => ({ type: 'object', properties, required });
const cart = fields({ producto_id: uuid, cantidad: integer }, ['producto_id', 'cantidad']);
const category = fields({ nombre: text, descripcion: text, orden: { type: 'integer', minimum: 0 }, activo: { type: 'boolean' } }, ['nombre']);
const product = fields({ nombre: text, referencia: text, categoria_id: uuid, precio: integer, descripcion_corta: text, descripcion: text, activo: { type: 'boolean' } }, ['nombre', 'referencia', 'categoria_id', 'precio']);
const query = (name, schema = text) => ({ in: 'query', name, schema });
const pagination = [query('page', integer), query('limit', { ...integer, maximum: 100 })];
const catalogFilters = [...pagination, ...['q', 'categoria', 'id', 'min', 'max', 'orden', 'disponibilidad'].map(name => query(name))];

function addStoreDocs(spec) {
  spec.tags.push({ name: 'Tienda', description: 'Catálogo, carrito y pedidos del cliente. Tarjeta y Nequi son simulaciones.' }, { name: 'Admin Tienda', description: 'Administración de catálogo, pedidos e ingresos.' });
  function route(path, verb, summary, body, parameters = [], multipart = false) {
    const operation = { tags: [path.includes('/admin/') ? 'Admin Tienda' : 'Tienda'], summary, security: [{ bearerAuth: [] }], parameters: [...(path.match(/\{\w+\}/g) || []).map(p => ({ in: 'path', name: p.slice(1, -1), required: true, schema: uuid })), ...parameters], responses: { 200: { description: 'Operación completada; JSON con success y datos' }, 400: { description: 'Validación de entrada' }, 401: { description: 'JWT requerido' }, 403: { description: 'Rol o cuenta no autorizados' }, 404: { description: 'Recurso no encontrado o no pertenece al cliente' }, 409: { description: 'Stock, estado, precio o integridad en conflicto' } } };
    if (body) operation.requestBody = { required: true, content: { [multipart ? 'multipart/form-data' : 'application/json']: { schema: body } } };
    spec.paths[path] ||= {};
    spec.paths[path][verb] = operation;
  }
  route('/tienda/categorias', 'get', 'Categorías activas');
  route('/tienda/productos', 'get', 'Catálogo activo; orden recientes, nombre, precio_asc o precio_desc', null, catalogFilters);
  route('/tienda/carrito', 'get', 'Carrito persistente de la cuenta y total actualizado');
  route('/tienda/carrito', 'post', 'Agregar unidades al carrito', cart);
  route('/tienda/carrito', 'patch', 'Establecer cantidad absoluta', cart);
  route('/tienda/carrito', 'delete', 'Vaciar carrito');
  route('/tienda/carrito/{id}', 'delete', 'Quitar producto por su UUID');
  route('/tienda/checkout', 'post', 'Crear pedido; reutilizar requestId en reintentos', fields({ requestId: uuid, metodo_pago: method, total_esperado: integer, consentimiento: { type: 'boolean', enum: [true] } }, ['requestId', 'metodo_pago', 'total_esperado', 'consentimiento']));
  for (const prefix of ['/tienda', '/tienda/admin']) {
    const admin = prefix.endsWith('admin');
    route(prefix + '/pedidos', 'get', 'Listar pedidos ' + (admin ? 'de todos los clientes' : 'propios'), null, [...pagination, query('estado')]);
    route(prefix + '/pedidos/{id}', 'get', 'Detalle de pedido e historial');
    route(prefix + '/pedidos/{id}/acciones', 'post', admin ? 'Preparar, entregar o registrar efectivo recibido' : 'Pago simulado, cambio de método o cancelación sin pagar dentro de 15 minutos', fields({ accion: { type: 'string', enum: admin ? ['listo', 'entregar', 'cobrar_efectivo'] : ['pagar', 'metodo', 'cancelar'] }, requestId: uuid, metodo_pago: method, resultado: { type: 'string', enum: ['aprobado', 'rechazado', 'cancelado'] }, motivo: text }, ['accion']));
  }
  for (const [name, schema] of [['categorias', category], ['productos', product]]) {
    const path = '/tienda/admin/' + name;
    route(path, 'get', 'Consultar ' + name + ' activos e inactivos', null, name === 'productos' ? catalogFilters : []);
    route(path, 'post', 'Crear ' + name, schema);
    route(path + '/{id}', 'patch', 'Guardar edición completa de ' + name, schema);
    route(path + '/{id}', 'delete', 'Eliminar si no tiene relaciones que impidan borrado');
  }
  route('/tienda/admin/productos/{id}/imagenes', 'post', 'Subir una imagen JPG/PNG de hasta 2 MB (máximo cuatro)', fields({ imagen: { type: 'string', format: 'binary' } }, ['imagen']), [], true);
  route('/tienda/admin/productos/{id}/imagenes', 'patch', 'Reordenar todas las imágenes', fields({ ids: { type: 'array', items: uuid, maxItems: 4, uniqueItems: true } }, ['ids']));
  route('/tienda/admin/productos/{id}/imagenes/{imageId}', 'delete', 'Eliminar una imagen');
  route('/tienda/admin/reporte', 'get', 'Ingresos por productos, servicios, consolidado y métodos', null, ['desde', 'hasta'].map(name => ({ ...query(name, { type: 'string', format: 'date' }), required: true })));
}
module.exports = { addStoreDocs };
