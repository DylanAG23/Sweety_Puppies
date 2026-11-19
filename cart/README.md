# Carrito

Implementado en /api/tienda/carrito. La composición está en index.js, los casos de uso en application/useCases/cartOperations.js y el SQL en infrastructure/repositories/PostgresCartRepository.js.

Tablas: carritos y carrito_items. Cada cliente consulta y modifica únicamente su carrito. Se conserva por cuenta; precios y disponibilidad se consultan del catálogo. Agregar, actualizar, eliminar y vaciar exigen sesión y validaciones de stock.

Pantalla: /cliente/carrito, con fotografías, cantidades y resumen de compra. El contador del encabezado se actualiza al cambiar el carrito. No reserva stock; al pagar se valida otra vez.

El checkout vacía las líneas originales al aprobar el pago o confirmar efectivo. Conserva cambios posteriores al checkout mediante cantidad y timestamp de cada línea.

Esquema: database/001_application_baseline.sql. Pruebas: tests/store.integration.test.js.
