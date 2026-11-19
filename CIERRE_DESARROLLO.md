# Cierre de la revisión de desarrollo

Fecha: 18 de noviembre de 2026. Rama de trabajo: `ACT`.

Actualización de alcance confirmada por el propietario: los términos, informes, manuales y demás documentos están entregados en el repositorio de la universidad y no se consideran pendientes de este trabajo. El trabajo activo comprende desarrollo y preparación del despliegue. El destino aún se decide entre una VM de la empresa y alojamiento temporal; reactivar Supabase queda para más adelante.

Referencia: `Formato planeacion Sweety Puppies (1).xlsx`, hoja «Planeación del Proyecto». Se revisó el código existente antes de completar los pendientes. Se conservan Express, Vue y la arquitectura por módulos; la tienda utiliza las tablas existentes y las citas mantienen sus flujos. Este documento registra evidencia técnica, no modifica estados, porcentajes ni responsables del Excel.

## Actividades de desarrollo

| Actividad | Implementación disponible | Evidencia y alcance |
|---|---|---|
| ACT-20 · Migraciones SQL | Baseline reproducible de las 24 tablas del respaldo; comprobador de estructura de solo lectura y guardia que impide instalar encima de una base existente. | `database/`; cuatro pruebas en `tests/database.baseline.test.js`. Aplicado únicamente en PGlite. No sustituye una restauración de datos ni los esquemas gestionados por Supabase. |
| ACT-22 · Catálogo inicial de prueba | Cinco ejemplos de correa, collar, ropa, juguete e higiene, con categoría, referencia, descripción, precio, imagen, existencias y mínimo. | `database/demo-catalog.cjs`, JSON y SVG DEMO. Carga repetible únicamente en PGlite; no modifica el catálogo real. |
| ACT-23 · API del catálogo | Categorías, productos, estado activo, consulta, imágenes y validaciones del servidor. | Módulo `catalog`, rutas de tienda y administración; integración HTTP y de repositorios. |
| ACT-25 · Panel de productos | Formularios y gestión de fotos, portada, categorías y disponibilidad. | `StoreCatalogAdminPage.vue`; implementaciones existentes conservadas, lint y compilación aprobados. |
| ACT-26 · Autorización de datos | Política suministrada por el propietario, con vigencia confirmada del 18/11/2026; casilla inicialmente desmarcada en registro y checkout, diálogo con texto completo, validación obligatoria en servidor y evidencia de versión/fecha/huella. | `shared/legal/`, `PrivacyConsent.vue`, pruebas de consentimiento. Verificación de correo y consumo del código en una sola transacción. |
| ACT-27 · Inventario | Entradas, salidas, ajustes, mínimo, alertas, historial y CSV. Revalidación del usuario administrativo activo en las operaciones, aunque aún conserve un JWT anterior. | Módulo `inventory`; pruebas de movimientos y revocación de acceso. |
| ACT-28 · Catálogo del cliente | Búsqueda, filtros, detalle, fotos, disponibilidad y agregar al carrito; errores de carga con reintento. | `StorePage.vue`; navegación visual y pruebas del catálogo. |
| ACT-30 · Carrito | Persistencia por cuenta, cantidad, eliminación, fotos, total, indicador en navegación y bloqueo de acciones duplicadas. Se distingue error de carga de carrito vacío. | Módulo `cart`, `StoreCartPage.vue`; integración de propiedad y actualizaciones. |
| ACT-31 · Checkout y pago simulado | Pedido con precios calculados por servidor y doble aceptación; tarjeta de demostración, Nequi simulado y efectivo al recoger. Reintentos idempotentes y rechazo de claves reutilizadas con otra operación. | Módulo `orders`, `SimulatedCardPayment.vue`; pruebas de rechazo, aprobación, efectivo, cambios de método y cancelación. |
| ACT-32 · Inventario y pedidos | Descuento transaccional al aprobar o cobrar; historial de movimientos, comprobación de disponibilidad, reversión completa ante error y limpieza selectiva del carrito. | `tests/store.integration.test.js`: incluye última unidad solicitada por dos clientes, rollback y cambios posteriores al checkout. |
| ACT-33 · Doble flujo de ingresos | Productos por fecha de pago, servicios por fecha del servicio, desglose de métodos y total consolidado; preservación del reporte anterior. | `StoreReportPage.vue`, repositorio de pedidos y prueba cruzada citas/tienda. |
| ACT-34 · Pruebas funcionales | Suite automatizada y recorrido visual aislado de compra. | 91 pruebas aprobadas (incluidas siete de preparación de despliegue), ESLint y compilación TypeScript/Vite aprobados. Esta evidencia no reemplaza la aceptación del equipo o cliente. |
| ACT-35 · Integración con las citas | Crear, confirmar, iniciar y finalizar una cita; comprar después; conservar historial e importes de servicios y separar ingresos de productos. | `tests/appointments.store.integration.test.js`, sobre el esquema completo. Correo sustituido por un doble de prueba y regla horaria de inicio adelantada para ejecutar una cita futura. |
| ACT-36 · Correcciones | Conflictos de identificadores, permisos revocados, consumo de códigos, doble clic, errores de carga, plazo de cancelación actualizado, resultados de reportes y documentación desactualizada. | Pruebas de regresión, compilación y revisión visual indicadas abajo. |

## Reglas conservadas

- Solo se permite cancelar un pedido sin pagar dentro de los primeros 15 minutos. No se agregaron cancelaciones de pedidos pagados ni devoluciones simuladas.
- La compra es para recogida en el local. El carrito no reserva stock. El pago rechazado conserva carrito y existencias; el aprobado y el cobro en efectivo comprueban stock dentro de la transacción.
- La pasarela es simulada, sin cobros reales. Los campos ficticios de tarjeta no se envían ni se almacenan en el servidor. Los identificadores de las solicitudes evitan duplicar operaciones.
- La autorización de datos es independiente de las condiciones de compra y no incluye publicidad. El texto publicado procede de los documentos entregados y de la fecha confirmada por el propietario.
- Se conservan la organización del proyecto y los flujos anteriores. Los términos y demás entregables documentales se gestionan en el repositorio de la universidad, según confirmó el propietario.

## Verificación efectuada

1. `npm test`: **91 pruebas, 91 aprobadas, cero fallos**. Usan datos ficticios y PGlite; no conectan a la base compartida ni envían correos reales.
2. `npx eslint .` desde `SwettyPuppies_Frontend`: aprobado sin correcciones automáticas.
3. `npm run build` desde `SwettyPuppies_Frontend`: TypeScript y compilación aprobados. Continúa la advertencia de tamaño de algunos bundles de gráficas; no bloquea la compilación.
4. Navegador con `tests/support/store-preview.cjs`: cinco productos DEMO con imágenes; agregar una pelota de $10.000; comprobar foto en carrito y confirmación bloqueada sin ambas aceptaciones; crear pedido; cargar tarjeta aprobada de demostración; pagar; comprobar carrito vacío, stock de 15 a 14 e ingresos de productos por $10.000.
5. Esquema completo: instalación desde cero, estructura y RLS, ausencia de registros reales, protección ante repetición o instalación parcial, detección de diferencias y catálogo DEMO idempotente. No se aplicó SQL al proyecto compartido.
6. Entrega de producción: 283 archivos verificados con SHA-256, instalación independiente de dependencias y arranque real con `NODE_ENV=production`. Se comprobaron HTML, rutas SPA, JS compilado, Swagger, autenticación y respuesta 503 ante la BD deliberadamente inaccesible. No se contactaron servicios externos. El script reproducible es `tests/support/verify-release.cjs`.
7. Dockerfile y plantilla de systemd preparados. No hay Docker instalado en este PC y no se tiene todavía el destino: la imagen Linux y el servicio en la VM no se declaran ejecutados ni publicados.

La prueba cruzada verifica una cita por $50.000 y una venta de dos productos por $30.000: reporte consolidado de $80.000, reporte anterior de servicios de $50.000 e historial de la cita sin cambios. PGlite no reproduce conexiones múltiples de un servidor PostgreSQL ni verifica Supabase Storage, Gmail o su disponibilidad real.

### Repetir las comprobaciones

Desde la raíz del repositorio en PowerShell:

```powershell
npm test
Push-Location SwettyPuppies_Frontend
npx eslint .
npm run build
Pop-Location
```

Para la vista previa aislada:

```powershell
node tests/support/store-preview.cjs
```

Abrir `http://127.0.0.1:3011/__preview/cliente` o `http://127.0.0.1:3011/__preview/administrador`. Son accesos exclusivos del servidor de pruebas, con datos temporales; no son cuentas de la aplicación real. Ctrl+C elimina el entorno en memoria. Los otros módulos necesitan sus propios datos operativos; su flujo de citas se cubre con la prueba de integración.

## Pendientes externos y trabajo fuera de este cierre

- **Supabase está pausado.** La conexión, el esquema remoto y Storage no pueden declararse verificados con esta revisión. Al reanudar el proyecto, ejecutar `node database/manage.cjs check` para comparar sin modificar, revisar las diferencias y repetir las operaciones contra un entorno autorizado. No ejecutar `apply-empty` sobre la base existente.
- El respaldo recibido se utilizó para extraer estructura. No se restauraron registros del negocio ni objetos de Storage. El baseline y el catálogo DEMO no sustituyen esos datos.
- ACT-37 y ACT-38: se prepararon build de producción, paquete portable sin secretos, Dockerfile, plantilla de servicio para VM y validación de configuración. Falta elegir el destino y publicar allí. ACT-39: el comando `npm run smoke:deployment -- URL` permite comprobar el destino por HTTP sin modificar datos; su ejecución en el entorno publicado sigue pendiente.
- Los términos, informes, manuales y UML se consideran entregados en el repositorio de la universidad según la confirmación del propietario. No se solicita rehacerlos ni se contabilizan como pendientes de desarrollo.

Guías relacionadas: `TIENDA_IMPLEMENTACION.md`, `database/README.md`, `shared/legal/README.md` y los README de los módulos `catalog`, `cart` y `orders`.
