# Pedidos y segundo flujo de ingresos

Implementado en /api/tienda/checkout y /api/tienda/pedidos; administración en /api/tienda/admin/pedidos y /api/tienda/admin/reporte. Composición en index.js, casos de uso en application/useCases/orderOperations.js y SQL en infrastructure/repositories/PostgresOrdersRepository.js.

Checkout integrado en /cliente/carrito. Detalle, pago e historial en /cliente/pedidos; gestión en /admin/pedidos y consolidado en /admin/ingresos.

Tarjeta y Nequi son simulados. Efectivo se registra al entregar. Solo recogida física. Pago, descuento de inventario y movimientos se confirman en la misma transacción. Rechazo no descuenta stock. Solo se cancelan pedidos sin pagar durante los primeros 15 minutos; no hay cancelación administrativa ni devolución de pedidos pagados.

El identificador de checkout se distingue de los identificadores de acciones. Repetir una acción con el mismo identificador conserva su resultado; reutilizarlo para otra acción devuelve conflicto. El detalle guarda precio y nombre al comprar.

Consentimiento y eventos se guardan en ordenes.observaciones como JSON versionado. La política de datos tiene su evidencia independiente; ver shared/legal/README.md. No se guardan números de tarjeta ni CVV.

Ingresos de productos por fecha de pago y servicios desde historial_citas. Los reportes previos de servicios permanecen separados.

Pruebas: tests/store.integration.test.js y tests/appointments.store.integration.test.js. Esquema: database/001_application_baseline.sql.
