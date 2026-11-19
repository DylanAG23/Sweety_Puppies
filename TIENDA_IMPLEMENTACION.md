# Tienda, carrito e inventario

Implementación integrada en `ACT`, a partir del trabajo de tienda y del inventario del equipo. El diagnóstico anterior permanece en `ANALISIS_TIENDA_Y_PAGOS.md`. Este documento describe el funcionamiento; `CIERRE_DESARROLLO.md` relaciona la revisión actual con las actividades del Excel.

## Ejecutar

Desde la raíz `Sweety_Puppies`:

```powershell
npm ci
npm ci --prefix SwettyPuppies_Frontend
npm run build --prefix SwettyPuppies_Frontend
npm start
```

Abrir http://localhost:3000 e iniciar sesión con una cuenta existente. La terminal debe permanecer abierta. Para desarrollo del frontend: `npm run dev --prefix SwettyPuppies_Frontend`, manteniendo el backend iniciado.

La conexión utiliza la configuración existente de PostgreSQL/Supabase y Storage. Supabase está activo y el esquema remoto fue comprobado como compatible; las lecturas de la aplicación en localhost responden correctamente. No se agregaron tablas, columnas, políticas RLS ni migraciones en la base compartida. `database/` permite reproducir el esquema en una base nueva y compararlo sin alterar la instalación existente. No se necesitan los paquetes SSR de Next.js: la aplicación es Vue + Express.

## Operación

1. Administración → Categorías: crear, editar, ordenar y desactivar categorías.
2. Administración → Productos: crear referencia, precio entero en COP y descripciones. Seleccionar hasta cuatro fotos JPG/PNG de 2 MB desde el formulario de creación, con vista previa; se suben al guardar. Al editar se pueden agregar, quitar y reordenar. La portada aparece en el listado. Si falla una carga, el producto ya creado conserva su identificador y las fotos pendientes se pueden reintentar. El producto nace con cero existencias.
3. Administración → Inventario: registrar entrada con motivo, establecer mínimo y consultar alertas. Las salidas y ajustes por conteo dejan movimientos inmutables. Exportación CSV con filtros y neutralización de fórmulas.
4. Cliente → Tienda: buscar y filtrar productos, abrir detalle y agregar al carrito. El carrito pertenece a la cuenta y persiste al cerrar sesión; el encabezado muestra sus unidades.
5. Cliente → Carrito: revisar fotos, precios y cantidades, leer la política de datos y aceptar por separado la autorización de datos y las condiciones de compra. Confirmar el pedido. Solo recogida en el local, sin entrega a domicilio ni impuestos añadidos.
6. Cliente → Mis pedidos: consultar detalle e historial, reintentar pago, cambiar método o cancelar cuando corresponda. La URL `?id=UUID` abre un pedido concreto.
7. Administración → Pedidos: marcar pedidos pagados listos para recoger y confirmar su entrega; para efectivo, registrar cobro y entrega juntos.
8. Administración → Ingresos: productos según fecha de pago, servicios según fecha de servicio, total consolidado y desglose por método. El reporte de servicios existente continúa disponible.

La tienda está habilitada por defecto. `VITE_ENABLE_STORE=false` oculta sus opciones al compilar; no sustituye la autorización de las API.

## Reglas de compra

- Tarjeta y Nequi son simulaciones explícitas, sin cobros. El formulario de tarjeta acepta exclusivamente los números de demostración `4242 4242 4242 4242` (aprobación) y `4000 0000 0000 0002` (rechazo), con titular, vencimiento y CVV ficticios. Estos campos permanecen en el navegador; al servidor solo se envía el resultado simulado. Nequi permite elegir el resultado sin pedir credenciales bancarias. Se puede cancelar el intento.
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

Checkout recibe `requestId` UUID, `metodo_pago`, `consentimiento: true`, `consentimiento_datos: true`, `politica_version` vigente y `total_esperado`. El servidor calcula los precios reales, guarda nombre/precio de cada línea y exige revisar el carrito si cambió el total. La versión vigente se consulta en `GET /api/politica-datos`; la fecha y huella de aceptación las genera el servidor.

Acciones del cliente: `pagar`, `metodo`, `cancelar`. Administración: `listo`, `entregar`, `cobrar_efectivo`. `pagar` requiere `requestId`, `metodo_pago` y `resultado` (`aprobado`, `rechazado`, `cancelado`). Reutilizar el identificador del intento al reintentar una solicitud cuya respuesta se perdió. Si se cambia la acción, el resultado o el método manteniendo el identificador, la API responde 409; un intento distinto requiere otro identificador.

Se usa una sola transacción para estado, fecha de pago, inventario, movimientos y limpieza del carrito. Los bloqueos por cliente y pedido serializan los reintentos; inventario bloquea productos en orden estable. Un fallo en cualquier línea revierte toda la compra. La limpieza del carrito compara identificador, cantidad y timestamp exacto para conservar cambios hechos después del checkout.

Sin agregar una tabla de pagos, `ordenes.observaciones` guarda un documento JSON versionado con clave de checkout, consentimiento, snapshot del carrito y eventos de pago/estado. Los eventos incluyen identificador del intento, resultado, fecha y responsable. La API no expone el snapshot interno. El historial de inventario sigue en su tabla original. Una futura pasarela real requerirá su propia integración y verificación de pagos; no debe reutilizar los botones de simulación.

Las imágenes se guardan en Supabase Storage. Si falla la asociación con el producto, se intenta limpiar el archivo subido. Si falla la limpieza de un archivo eliminado, la operación devuelve una advertencia para revisión en Storage.

## Verificación

```powershell
npm test
Push-Location SwettyPuppies_Frontend
npx eslint .
npm run build
Pop-Location
```

Para lint también se puede entrar a `SwettyPuppies_Frontend` y ejecutar `npx eslint .`.

Las pruebas de integración usan PGlite en memoria. La suite de tienda conserva su fixture específica; las pruebas del baseline y la integración entre citas y tienda usan el esquema completo de 24 tablas extraído del respaldo. **`tests/fixtures/store-schema.sql` es exclusivamente una fixture de pruebas, no un script para ejecutar en Supabase.** Las pruebas no conectan a la base compartida.

Cubren permisos HTTP, revocación de acceso administrativo, propiedad de pedidos, validaciones, fotos y límites, checkout repetido, claves de solicitud en conflicto, pago duplicado, rechazo/reintento, efectivo, cambio de método, cancelación, rollback de múltiples productos, competencia por la última unidad, cambios posteriores de carrito, reportes y movimientos inmutables. También verifican consentimiento y la coexistencia de citas, ventas e ingresos. PGlite comprueba transacciones pero no sustituye una prueba de carga con conexiones simultáneas a PostgreSQL.

Para repetir la revisión visual con datos ficticios:

```powershell
node tests/support/store-preview.cjs
```

Abrir `http://127.0.0.1:3011/__preview/cliente` o `http://127.0.0.1:3011/__preview/administrador`. Este servidor escucha solo loopback, usa usuarios temporales, el esquema completo y una base en memoria con cinco productos DEMO e imágenes ilustrativas. No es una opción de despliegue. Detenerlo con Ctrl+C elimina el entorno temporal. Los enlaces de otros módulos no están preparados en esta vista previa.

La revisión original comprobó la carga, lectura pública y eliminación de una imagen temporal en el bucket real. Tras reactivar Supabase se comprobaron las cinco imágenes existentes mediante HEAD, sin repetir escrituras. Las políticas de escritura anónima del bucket requieren restricción junto con una clave privada de servidor; detalle en `CIERRE_DESARROLLO.md`.

### Resultado de la validación

- Backend: 92 pruebas aprobadas, incluidas siete de preparación de despliegue; detalle de cobertura y alcance en `CIERRE_DESARROLLO.md`.
- Frontend: ESLint completo y compilación con verificación TypeScript aprobados. Permanece la advertencia previa de tamaño de los bundles de gráficas/reportes.
- Navegador, cierre actual: catálogo con imágenes, carrito, aceptación de datos y condiciones, checkout, pago simulado aprobado, descuento de inventario e ingresos verificados en entorno aislado. Las revisiones anteriores también cubrieron alta, edición, entrega y vista móvil.
- Supabase real: esquema compatible, smoke local aprobado y consultas autenticadas de cliente/administración e imágenes verificadas. La publicación externa sigue pendiente por decisión del propietario.
- Las operaciones nuevas también están disponibles en Swagger, etiquetas Tienda y Admin Tienda.

## Tema visual

Modo oscuro por defecto, con selector claro/oscuro en la barra superior y en el acceso. La preferencia se guarda en este navegador (`sweety-theme`); se aplica en `html` antes de cargar los estilos para evitar destellos claros y conservarla al cambiar de página. `theme.css` define la paleta y estados semánticos; `theme-legacy.css` adapta los colores fijos de las pantallas anteriores. Las nuevas pantallas deben usar los tokens para evitar ampliar esa capa de compatibilidad.

Verificación visual de ambos temas en productos, formularios y diálogos, inicio administrativo, agenda, reportes, acceso y carrito; revisión del carrito a 390 px y comprobación de persistencia al recargar. Se revisó el contraste de texto sobre fondos sólidos en esas vistas; esto no equivale a una certificación integral de accesibilidad.
