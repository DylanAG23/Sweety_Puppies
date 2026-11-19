# Catálogo

Implementado en /api/tienda mediante routes/tienda.js y montado en app.js. La composición está en index.js, los casos de uso en application/useCases/catalogOperations.js y el SQL en infrastructure/repositories/PostgresCatalogRepository.js.

Tablas: categorias, productos y producto_imagenes. Usa inventario para mostrar stock.

Cliente: /cliente/tienda, filtros por categoría, precio y disponibilidad, búsqueda, orden y detalle en diálogo. Administración: /admin/productos y /admin/categorias, alta/edición en diálogo, desactivación y eliminación cuando no hay historial.

Hasta cuatro imágenes JPG/PNG de 2 MB por producto, portada y reordenación. Storage se opera desde el backend. Los productos nacen con stock cero; los cambios de existencias se hacen mediante inventory.

Esquema reproducible: database/001_application_baseline.sql. Ver database/README.md antes de ejecutarlo. Pruebas: tests/store.integration.test.js.
