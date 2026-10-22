# Diagnóstico previo: productos, inventario, carrito y pagos simulados

Base revisada: rama `dylan`, commit `7018ea5`. Consultas de solo lectura contra el esquema `public` de Supabase. No se modificaron tablas, registros, permisos ni código funcional. El alcance definitivo depende del listado de tareas del equipo.

Actualización tras recibir la planeación y el contexto: la sección 8 reconcilia esos documentos con la revisión técnica. Las decisiones documentadas allí resuelven varias preguntas iniciales de la sección 7. Las ampliaciones de esquema de la sección 3 son propuestas técnicas, no requisitos aprobados.

## 1. Estado comprobado

| Área | Existe | Falta |
|---|---|---|
| Arquitectura | Express, Vue 3, TypeScript, módulos separados en dominio, casos de uso y adaptadores | Implementar los cuatro módulos comerciales |
| Catálogo | `categorias`, `productos`, `producto_imagenes`; carpeta `catalog` | API, validaciones, administración, catálogo y detalle |
| Inventario | `inventario`, `movimientos_inventario`; carpeta `inventory` | Entradas, salidas, ajustes, consulta y coordinación con pedidos |
| Carrito | `carritos`, `carrito_items`; carpeta `cart` | Persistencia por cliente, cantidades, contador y sincronización |
| Pedidos | `ordenes`, `detalle_orden`; carpeta `orders` | Checkout, transiciones, historial y entrega |
| Pagos simulados | Métodos y estados en la orden | Simulador, registro de intentos y prevención de procesamiento duplicado |
| Interfaz | Diseño compartido, cliente HTTP, sesiones, menús reservados | Pantallas reales; las actuales muestran módulos en preparación |

Las cuatro fábricas `createCatalogModule`, `createInventoryModule`, `createCartModule` y `createOrdersModule` devuelven objetos vacíos. No están montadas en `app.js`.

En la base hay **5 categorías**. Las otras ocho tablas comerciales tienen **0 registros** al momento de esta revisión. Los controles de conciliación no encontraron discrepancias, pero con tablas vacías esto no demuestra que los futuros flujos funcionen.

Las 37 pruebas del backend y la compilación del frontend pasaron en la actualización anterior a esta revisión. No cubren todavía operaciones comerciales reales ni concurrencia contra PostgreSQL.

## 2. Reglas ya presentes en PostgreSQL

- Identificadores UUID y relaciones mediante claves foráneas.
- Referencia de producto y nombre de categoría únicos.
- Precio de producto entero y positivo. Definir explícitamente la unidad monetaria; propuesta: pesos colombianos enteros, sin cálculos con decimales binarios.
- Un registro de inventario por producto; existencias y mínimo no negativos. La unicidad no obliga a que cada producto tenga inventario: crearlos juntos en una transacción.
- Hasta cuatro posiciones de imagen por producto: `orden` entre 1 y 4 y combinación producto/orden única.
- Un carrito por cliente y una línea por producto dentro de cada carrito; cantidad positiva.
- Código de pedido generado por secuencia, formato `SP-000001`.
- Detalles de pedido con nombre y precio guardados; subtotal igual a cantidad por precio. El total de la cabecera no está vinculado automáticamente a la suma de sus detalles.
- Movimientos con cantidad positiva para entrada y negativa para salida; saldo resultante igual a saldo anterior más cantidad. Un ajuste debe convertirse en la diferencia entre el conteo nuevo y el saldo anterior, no guardar el conteo como movimiento.
- Trigger que impide editar y eliminar movimientos. Corregir errores con nuevos movimientos compensatorios.
- No hay trigger que actualice inventario al insertar un movimiento: ambos cambios deben ejecutarse juntos desde el backend.
- Estados: `en_espera_pago`, `pagado`, `pendiente_recoger`, `entregado`, `cancelado`.
- Métodos: `tarjeta`, `nequi`, `efectivo`.
- La base exige fecha de pago para estados posteriores al pago y fecha de cancelación para cancelados. Efectivo solo admite espera, entrega o cancelación. Estas restricciones no validan por sí solas el orden de las transiciones.

## 3. Puntos que deben resolverse antes de implementar pagos

1. **Evitar descontar dos veces.** Un doble clic, recarga o reintento debe devolver el mismo resultado sin duplicar pedido, pago o movimiento. Proponer claves de idempotencia persistidas con unicidad y bloqueo de la orden.
2. **Última unidad y compras simultáneas.** Bloquear las filas de inventario en un orden estable, validar stock dentro de la transacción y registrar descuento, movimientos y estado de pedido de forma atómica. Las verificaciones del carrito no reservan stock.
3. **Importes calculados por el servidor.** El cliente envía productos y cantidades; el backend consulta precios y calcula totales. Guardar la fotografía de nombre/precio en el pedido y definir cómo se informa un cambio de precio entre carrito y checkout.
4. **Historial de intentos.** No se encontró una tabla dedicada a intentos de pago. Proponer `intentos_pago` con orden, resultado, referencia, importe, fechas y clave de idempotencia. Un rechazo necesita trazabilidad aunque el pedido siga pendiente.
5. **Simulación explícita.** Ofrecer escenarios aprobado, rechazado y cancelado. No pedir ni almacenar tarjetas, CVV, claves de Nequi ni credenciales reales. El resultado se procesa y valida en el servidor; un parámetro en la URL no acredita un pago.
6. **Cancelación y devolución de stock.** Determinar quién puede cancelar, en qué estados y si hay restitución. No reponer unidades de un pedido que nunca descontó stock. Evitar reposiciones duplicadas por reintentos.
7. **Carrito y checkout concurrentes.** Definir cuándo se limpian sus líneas y cómo se conservan cambios hechos desde otra pestaña. Un reintento de checkout no debe crear otra orden ni borrar compras posteriores.
8. **Esquema reproducible.** Falta el SQL versionado de la Fase 2 mencionado por los README. Preparar una base de migraciones a partir del esquema real antes de agregar tablas o restricciones; el respaldo antiguo no corresponde a esta versión.

## 4. Integración con la aplicación existente

- Reutilizar `baseDatos.withTransaction` y pasar la misma conexión a todos los repositorios participantes en una compra. No abrir transacciones independientes para pedido e inventario.
- Reutilizar autenticación y roles, resolviendo la identidad del cliente desde la sesión y su perfil activo. Nunca confiar en `cliente_id` enviado por el navegador.
- Las nueve tablas tienen RLS activo y no tienen políticas. Con el acceso privilegiado del backend, la autorización y los filtros de propietario deben hacerse en los casos de uso/repositorios. No abrir permisos públicos para simplificar el carrito.
- Consultar exclusivamente `/api` desde Vue mediante `src/lib/api.ts`.
- El enrutador actual busca rutas exactas en un `Map`. Detalles como `/cliente/tienda/:id` o edición por ID necesitan resolución de parámetros; no basta con insertar literalmente `:id` en el mapa.
- `VITE_ENABLE_STORE` controla los menús y pantallas provisionales. Activarlo después de conectar las pantallas reales.
- Reutilizar los estilos, componentes de carga, errores, diálogos y estructura visual existentes.
- El helper de imágenes valida firmas y permite JPG, PNG, WebP y GIF; el alcance escrito de catálogo pide JPG/PNG de 2 MB. Ajustar esa configuración por módulo. También revisar el límite de archivos, actualmente ligado al número de campos, para admitir hasta cuatro imágenes de producto.
- Validar los permisos de subida/eliminación de Storage en una prueba controlada. Haber comprobado la existencia del bucket público no demuestra que la clave configurada pueda escribir en él.
- Storage y PostgreSQL no comparten transacción: prever limpieza compensatoria de archivos nuevos si falla el guardado, y eliminar imágenes anteriores solo después de confirmar el cambio.
- El cliente HTTP actualmente cierra sesión ante cualquier 403. Distinguir falta de permiso de sesión vencida para no expulsar al usuario por una operación prohibida.

## 5. Orden propuesto de implementación

1. Confirmar requisitos y decisiones pendientes; versionar esquema y preparar datos de prueba separados.
2. Categorías y productos: validaciones, búsqueda, paginación, imágenes, activación y desactivación.
3. Inventario: apertura de saldo, entradas, salidas, ajustes e historial inmutable.
4. Carrito persistente por cliente, cantidades y validación de disponibilidad.
5. Checkout: orden y detalles, cálculo de totales, idempotencia y comportamiento del carrito.
6. Adaptador de pagos simulados, intentos, aprobación atómica y reintentos.
7. Pedidos del cliente, gestión administrativa, recogida y cancelaciones.
8. Pruebas de integración y concurrencia, recorrido visual completo y documentación operativa.

La tienda usará los perfiles y sesiones existentes. Productos, precios y stock tendrán una fuente única en la base; las pantallas no mantendrán copias independientes como fuente de verdad.

## 6. Criterios mínimos de aceptación

- Crear un producto crea su inventario de forma consistente; referencia repetida y archivos inválidos producen mensajes claros.
- Una cuenta no puede leer o modificar el carrito, los pedidos o los pagos de otra, aunque conozca sus UUID.
- Un producto inactivo o de categoría inactiva no se puede comprar; el carrito informa los cambios.
- Dos compradores de la última unidad: solo uno obtiene compra confirmada; no aparece stock negativo.
- Repetir una aprobación no cambia el saldo ni duplica movimientos.
- Una aprobación concurrente con una cancelación produce una sola transición válida.
- Un pago rechazado no descuenta stock y puede reintentarse según la política acordada.
- Un fallo a mitad de operación revierte pedido/pago/inventario de forma coherente.
- Cambiar un precio o nombre no altera pedidos históricos.
- El total coincide con los detalles y cualquier descuento de stock tiene su movimiento asociado.
- Carrito, pagos y pedidos persisten después de recargar o volver a iniciar sesión.
- La interfaz funciona en móvil y escritorio, con estados vacíos, carga, errores y confirmaciones.
- Las pruebas de concurrencia se ejecutan sobre una base de prueba PostgreSQL; los dobles de repositorio por sí solos no validan bloqueos reales.

## 7. Decisiones a confirmar con el listado de tareas

Los README proponen recogida en peluquería, carrito persistente, cancelación en 15 minutos y pago en efectivo al entregar. Se consideran antecedentes del proyecto, no requisitos nuevos confirmados en esta revisión.

- Recogida únicamente o también envío; impuestos, descuentos y moneda.
- Stock reservado al crear pedido o validado al pagar; vencimiento de pedidos pendientes.
- Ventana de cancelación, su inicio y permisos de administración; tratamiento de pagos ya aprobados.
- Escenarios del simulador y métodos incluidos; efectivo dentro o fuera de esta fase.
- Reglas de imágenes, categorías y visibilidad; límites de cantidad.
- Comprobantes, notificaciones y reportes incluidos en el alcance.

No implementar estas decisiones por suposición antes de revisar las tareas que enviará el equipo.

## 8. Cruce con la planeación y el contexto entregados

Fuentes recibidas, conservadas sin cambios:

- `C:/Users/Felipe Rojas/Downloads/Formato planeacion Sweety Puppies.xlsx`, hoja `Planeación del Proyecto`, actividades en `A27:M71`, corte declarado en `A24`: 22/10/2026.
- `C:/Users/Felipe Rojas/Downloads/CONTEXTO_SWEETY_PUPPIES.md`, especialmente secciones 3, 5, 6 y 7.

El Excel contiene 45 actividades: 26 finalizadas, 2 en proceso y 17 pendientes. Es avance declarado en la planeación, no una medición de funcionalidades verificadas en esta rama. No se alteraron estados, porcentajes, fechas ni responsables.

### Diferencias verificadas

| Referencia | Declaración documental | Evidencia del entorno revisado | Acción necesaria |
|---|---|---|---|
| Contexto, sección 3 | Rama de trabajo `auditoria-pre-fase2` | Rama activa `dylan`, commit `7018ea5` | Identificar la versión que contiene los entregables antes de duplicarlos |
| ACT-22, fila 48 | Catálogo de prueba finalizado | Cinco categorías y cero productos en la consulta previa | Confirmar si solo se cargaron categorías o se usó otro entorno |
| ACT-23, fila 49 | API CRUD de catálogo finalizada | `catalog/index.js` es una estructura vacía; no hay router comercial montado en `app.js` | Localizar la implementación del equipo o incorporarla al trabajo pendiente |
| ACT-25, fila 51 | Panel administrativo de productos finalizado | `/admin/productos` corresponde a una pantalla provisional | Localizar el panel implementado; no darlo por entregado en esta rama |
| ACT-26, fila 52 | Consentimiento finalizado | La propia nota deja la integración del checkout para ACT-31 | Mantener ese criterio dentro de ACT-31; no considerar checkout completado |
| ACT-27, fila 53 | Inventario en proceso, 40% | Estructura de módulo sin lógica en esta rama | Identificar y coordinar el trabajo de Edwin antes de reemplazarlo |

No se concluye que el trabajo del equipo no exista; se concluye que no está integrado en la versión revisada.

### Reglas que el contexto ya documenta

- Recogida en peluquería, sin domicilio ni dirección de envío en checkout.
- Precios en COP enteros, sin IVA en el alcance de esta simulación académica. Esto describe el alcance entregado, no una conclusión tributaria.
- Tarjeta y Nequi simulados, sin capturar datos financieros reales; efectivo en el local.
- Descuento de stock al aprobar pago simulado; para efectivo, al registrar pago y entrega.
- Carrito persistente; se conserva al rechazar/cancelar el pago. Se vacía al aprobar pago o confirmar pedido en efectivo.
- Cancelación por cliente durante los primeros 15 minutos desde `created_at`. Cancelación administrativa y reposición de un pedido pagado siguen pendientes en el propio documento.
- Ingresos separados por servicios y productos, más consolidado: incorporar ACT-33 expresamente al alcance técnico. Servicios desde `historial_citas`; productos por `fecha_pago`, excluyendo espera y cancelación según la definición documental. Resolver cómo reflejar cancelaciones de pagos previos antes de presentar esos importes como caja neta.
- No mezclar citas con líneas de producto en una orden. Mantener la funcionalidad de agenda existente.
- Las cinco categorías son ejemplos; siguen pendientes productos, precios y existencias reales. Confirmar si se incluyen snacks.

### Aclaración sobre pagos y esquema

El contexto identifica como discrepancia del diagrama de clases la entidad `Pago` y confirma que el modelo actual tiene 24 tablas. Por tanto, la sugerencia inicial de `intentos_pago` no es un compromiso de implementación ni una migración autorizada. Primero se definirá el simulador sobre `ordenes` y `detalle_orden`, con aprobación repetida segura mediante transacción, bloqueo y validación de estado. Si el equipo requiere historial persistente de rechazos, idempotencia de checkout u otros datos no representables con el esquema existente, se presentará una propuesta SQL separada para revisión, justificando cada cambio.

Las instrucciones dirigidas a asistentes dentro del Markdown se registran como contenido del documento; no autorizan por sí solas ejecutar migraciones, crear ramas o publicar cambios.

### Secuencia de entrega vinculada al cronograma

| Bloque | Actividades | Resultado verificable |
|---|---|---|
| Conciliar lo existente | ACT-20, 22, 23, 25, 27 | Código del equipo identificado, esquema versionado y estado técnico reconciliado |
| Catálogo e inventario | ACT-23, 25, 27, 28 | Administración, tienda, detalle, imágenes, saldos y movimientos funcionales |
| Compra y pagos | ACT-30, 31, 32 | Carrito persistente, checkout con consentimiento, simulador y descuento atómico |
| Reportes | ACT-33 | Servicios, productos y consolidado sin contar pedidos impagos |
| Validación | ACT-34, 35, 36 | Pruebas funcionales, concurrencia, permisos y regresión de citas |
| Entrega | ACT-37 a 43 y 45 | Despliegue, pruebas de humo, manuales y evidencia de aceptación |

Fechas del documento: ACT-28 hasta 31/10; ACT-30 a 32 hasta 07/11; ACT-33 a 36 hasta 14/11; cierre 28/11/2026. Se conservan como cronograma del equipo, no como promesa nueva de ejecución.

Antes del diseño visual definitivo falta revisar `ACT-15_Wireframes_y_Guia_de_Estilos` (no incluido entre los dos archivos recibidos). También falta el script `Fase2_Script_Supabase_tienda_inventario.sql` para contrastar y versionar el esquema. Esto no impide conciliar las tareas y preparar contratos de API, pero limita la validación contra los wireframes y las migraciones originales.

### Comprobación de otras ramas tras actualizar las referencias remotas

Se ejecutó `git fetch origin` y se inspeccionaron `origin/dylan`, `origin/Edwin`, `origin/edwin2`, `origin/pipe` y `origin/main`, sin cambiar de rama ni fusionar código.

- **`origin/Edwin`, commit `e8910fc`: sí contiene implementación de backend de inventario (ACT-27).** Incluye reglas, repositorio PostgreSQL, controlador, router `/api/admin/inventario`, movimientos, mínimos, exportación y un caso de uso `discountStockForOrder`. Tiene archivos de pruebas `inventory.movements.test.js` e `inventory.rules.test.js`. La existencia de estas pruebas no significa que se hayan ejecutado en esta revisión.
- `catalog/index.js` sigue vacío tanto en `origin/Edwin` como en `origin/dylan`. No se encontró una implementación de ACT-23 ni del panel ACT-25 entre las ramas inspeccionadas. Esto no descarta código que alguien tenga localmente o sin publicar.
- La rama activa continúa siendo `dylan`. El primer paso de implementación propuesto pasa a ser revisar e integrar el trabajo de inventario de Edwin, validando sus contratos con pedidos y sus pruebas, antes de desarrollar otra solución de stock.
- ACT-22 sigue sin poder confirmarse como catálogo de productos cargado en el entorno revisado. No se modificó el Excel para cambiar su estado.
