# Tienda, carrito e inventario

Implementación en `feature/tienda-carrito-pagos`, basada en `dylan` y en el inventario de `origin/Edwin`. El diagnóstico anterior permanece en `ANALISIS_TIENDA_Y_PAGOS.md`; este documento describe el resultado implementado.

## Ejecutar

Desde la raíz `Sweety_Puppies`:

```powershell
npm ci
npm ci --prefix SwettyPuppies_Frontend
npm run build --prefix SwettyPuppies_Frontend
npm start
```

Abrir http://localhost:3000 e iniciar sesión con una cuenta existente. La terminal debe permanecer abierta. Para desarrollo del frontend: `npm run dev --prefix SwettyPuppies_Frontend`, manteniendo el backend iniciado.

La conexión utiliza la configuración existente de PostgreSQL/Supabase y Storage. No se agregaron tablas, columnas, políticas RLS ni migraciones en la base compartida. No se necesitan los paquetes SSR de Next.js: la aplicación es Vue + Express.

## Operación

1. Administración → Categorías: crear, editar, ordenar y desactivar categorías.
2. Administración → Productos: crear referencia, precio entero en COP y descripciones. Seleccionar hasta cuatro fotos JPG/PNG de 2 MB desde el formulario de creación, con vista previa; se suben al guardar. Al editar se pueden agregar, quitar y reordenar. La portada aparece en el listado. Si falla una carga, el producto ya creado conserva su identificador y las fotos pendientes se pueden reintentar. El producto nace con cero existencias.
3. Administración → Inventario: registrar entrada con motivo, establecer mínimo y consultar alertas. Las salidas y ajustes por conteo dejan movimientos inmutables. Exportación CSV con filtros y neutralización de fórmulas.
4. Cliente → Tienda: buscar y filtrar productos, abrir detalle y agregar al carrito. El carrito pertenece a la cuenta y persiste al cerrar sesión; el encabezado muestra sus unidades.
5. Cliente → Carrito: revisar precio y cantidad, aceptar condiciones y confirmar. Solo recogida en el local, sin entrega a domicilio ni impuestos añadidos.
6. Cliente → Mis pedidos: consultar detalle e historial, reintentar pago, cambiar método o cancelar cuando corresponda. La URL `?id=UUID` abre un pedido concreto.
7. Administración → Pedidos: marcar pedidos pagados listos para recoger y confirmar su entrega; para efectivo, registrar cobro y entrega juntos.
8. Administración → Ingresos: productos según fecha de pago, servicios según fecha de servicio, total consolidado y desglose por método. El reporte de servicios existente continúa disponible.

La tienda está habilitada por defecto. `VITE_ENABLE_STORE=false` oculta sus opciones al compilar; no sustituye la autorización de las API.

## Reglas de compra

- Tarjeta y Nequi son simulaciones explícitas. No se solicitan ni almacenan números de tarjeta, CVV, claves o datos bancarios. Los botones permiten aprobar, rechazar o cancelar el intento.
- En línea: `en_espera_pago → pagado → pendiente_recoger → entregado`. Se descuenta inventario solo al aprobar.
- Efectivo: `en_espera_pago → entregado`. La administradora confirma que recibió el efectivo; en esa transacción se comprueba stock y se registra la entrega.
- El carrito no reserva existencias. Al pagar se vuelve a comprobar disponibilidad, también para efectivo. Un rechazo conserva carrito y stock. Cancelar la simulación vuelve al carrito y deja el pedido sin pagar.
- Regla confirmada por el usuario: **solo se cancelan pedidos sin pagar, durante los primeros 15 minutos desde su creación**. No hay cancelación de pedidos pagados ni devolución simulada. La administración no tiene una acción adicional de cancelación.
- Las categorías inactivas ocultan sus productos. Productos con pedidos o movimientos no pueden eliminarse; se desactivan para conservar el historial.

## Integridad y API

Las rutas nuevas están bajo `/api/tienda`; inventario conserva `/api/admin/inventario`. Todas requieren JWT y rol. Los pedidos y carritos resuelven el cliente desde la cuenta activa, sin aceptar un propietario enviado por el navegador.

| Operación | Ruta |
|---|---|
| Catálogo | `GET /api/tienda/categorias`, `GET /api/tienda/productos` |
| Carrito | `GET/POST/PATCH/DELETE /api/tienda/carrito`, `DELETE /api/tienda/carrito/:productoId` |
| Checkout | `POST /api/tienda/checkout` |
| Pedidos cliente | `GET /api/tienda/pedidos`, `GET /api/tienda/pedidos/:id`, `POST /api/tienda/pedidos/:id/acciones` |
| Administración | `/api/tienda/admin/categorias`, `/productos`, `/productos/:id/imagenes`, `/pedidos` |
| Ingresos | `GET /api/tienda/admin/reporte?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` |

Checkout recibe `requestId` UUID, `metodo_pago`, `consentimiento: true` y `total_esperado`. El servidor calcula los precios reales, guarda nombre/precio de cada línea y exige revisar el carrito si cambió el total.

Acciones del cliente: `pagar`, `metodo`, `cancelar`. Administración: `listo`, `entregar`, `cobrar_efectivo`. `pagar` requiere `requestId`, `metodo_pago` y `resultado` (`aprobado`, `rechazado`, `cancelado`). Reutilizar el identificador del intento al reintentar una solicitud cuya respuesta se perdió.

Se usa una sola transacción para estado, fecha de pago, inventario, movimientos y limpieza del carrito. Los bloqueos por cliente y pedido serializan los reintentos; inventario bloquea productos en orden estable. Un fallo en cualquier línea revierte toda la compra. La limpieza del carrito compara identificador, cantidad y timestamp exacto para conservar cambios hechos después del checkout.

Sin agregar una tabla de pagos, `ordenes.observaciones` guarda un documento JSON versionado con clave de checkout, consentimiento, snapshot del carrito y eventos de pago/estado. Los eventos incluyen identificador del intento, resultado, fecha y responsable. La API no expone el snapshot interno. El historial de inventario sigue en su tabla original. Una futura pasarela real requerirá su propia integración y verificación de pagos; no debe reutilizar los botones de simulación.

Las imágenes se guardan en Supabase Storage. Si falla la asociación con el producto, se intenta limpiar el archivo subido. Si falla la limpieza de un archivo eliminado, la operación devuelve una advertencia para revisión en Storage.

## Verificación

```powershell
npm test
npm exec --prefix SwettyPuppies_Frontend -- eslint .
npm run build --prefix SwettyPuppies_Frontend
```

Para lint también se puede entrar a `SwettyPuppies_Frontend` y ejecutar `npx eslint .`.

Las pruebas de integración usan PGlite en memoria con las definiciones, restricciones y triggers de las nueve tablas comerciales leídos de Supabase, y tablas mínimas de usuarios/clientes/servicios. **`tests/fixtures/store-schema.sql` es exclusivamente una fixture de pruebas, no un script para ejecutar en Supabase.** Las pruebas no cargan `.env` ni conectan a la base compartida.

Cubren permisos HTTP, propiedad de pedidos, validaciones, fotos y límites, checkout repetido, pago duplicado, rechazo/reintento, efectivo, cambio de método, cancelación, rollback de múltiples productos, cambios posteriores de carrito, reportes y movimientos inmutables. PGlite comprueba transacciones pero no sustituye una prueba de carga con conexiones simultáneas a PostgreSQL.

Para repetir la revisión visual con datos ficticios:

```powershell
node tests/support/store-preview.cjs
```

Abrir `http://127.0.0.1:3011/__preview/cliente` o `http://127.0.0.1:3011/__preview/administrador`. Este servidor escucha solo loopback, usa usuarios temporales y una base en memoria; no es una opción de despliegue. Detenerlo con Ctrl+C elimina el entorno temporal. Los enlaces de otros módulos no están preparados en esta fixture.

Se comprobó también la carga, lectura pública y eliminación de una imagen temporal en el bucket real. No se insertaron productos, pedidos o movimientos de prueba en Supabase.

### Resultado de la validación

- Backend: 71 pruebas aprobadas (59 previas y 12 de integración de tienda).
- Frontend: ESLint completo y compilación con verificación TypeScript aprobados. Permanece la advertencia previa de tamaño de los bundles de gráficas/reportes.
- Navegador: alta de producto, entrada de stock, carrito, rechazo/reintento de pago, retorno al carrito al cancelar simulación, preparación y entrega, ingresos y vista móvil verificados en entorno aislado.
- Supabase real: consultas HTTP de catálogo, categorías, carrito, pedidos, inventario, movimientos e ingresos respondieron 200; Storage permitió subir, leer y eliminar la imagen temporal.
- Las operaciones nuevas también están disponibles en Swagger, etiquetas Tienda y Admin Tienda.

## Tema visual

Modo oscuro por defecto, con selector claro/oscuro en la barra superior y en el acceso. La preferencia se guarda en este navegador (`sweety-theme`); se aplica en `html` antes de cargar los estilos para evitar destellos claros y conservarla al cambiar de página. `theme.css` define la paleta y estados semánticos; `theme-legacy.css` adapta los colores fijos de las pantallas anteriores. Las nuevas pantallas deben usar los tokens para evitar ampliar esa capa de compatibilidad.

Verificación visual de ambos temas en productos, formularios y diálogos, inicio administrativo, agenda, reportes, acceso y carrito; revisión del carrito a 390 px y comprobación de persistencia al recargar. Se revisó el contraste de texto sobre fondos sólidos en esas vistas; esto no equivale a una certificación integral de accesibilidad.
