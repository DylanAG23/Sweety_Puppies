# Auditoría pre-Fase 2 — Sweety Puppies

- **Fecha:** 21 de octubre de 2026
- **Rama:** `auditoria-pre-fase2` (creada desde `dylan`, commit `15c0f92`)
- **Alcance:** backend Express (raíz), frontend Vue 3 (`SwettyPuppies_Frontend`), configuración, dependencias y coherencia con la base de datos.
- **Regla de redacción:** este documento **no contiene valores de secretos**. Donde se menciona una credencial solo se indica archivo, línea y tipo.

> Las secciones 1–5 describen el estado encontrado **antes** de cualquier cambio (Fase A).
> La sección 6 registra lo que se corrigió en las fases B–D y lo que quedó pendiente.

---

## 1. Mapa del proyecto

### 1.1 Estructura

| Zona | Contenido | Estado |
|---|---|---|
| `index.js` | Arranque de Express, montaje de rutas `/api/*`, Swagger y entrega del SPA | Activo |
| `baseDatos.js` | Conexión `pg` (un único `Client`) a Supabase | Activo |
| `routes/*.js` | Routers HTTP: documentación OpenAPI + middleware de auth + delegan en el controlador del módulo hexagonal | **Activo** (no es código antiguo, es la capa de entrada) |
| 11 módulos hexagonales | `adminAgenda`, `adminClients`, `adminPets`, `adminReports`, `adminServiceManagement`, `adminServices`, `auth`, `clientAppointments`, `clientHistory`, `clientPets`, `portalContent` | Activos |
| `middleware/auth.js` | `authenticateToken` (JWT) y `authorizeRoles` | Activo |
| `services/` | `emailService.js` (Nodemailer/Resend/log local), `supabaseStorage.js` (Storage) | Activos (adaptadores compartidos) |
| `shared/pets/dogBreedCatalog.js` | Catálogo de razas (dominio compartido) | Activo |
| `legacy/backend/routes/` | `citas.js` (montado en `/api/citas`) y `login.js` (no montado) | **Legado** |
| `docs/` | Documento técnico + salida JSDoc antigua de `citas.js` | Documentación |
| `public/img/` (raíz) | 3 imágenes sin referencias | Sin uso |
| `Archivos requeridos/` | Dump SQL antiguo + script de `codigos_verificacion` + imagen del esquema | Referencia (desactualizada, ver §4) |

### 1.2 Dependencias

**Backend** (`package.json`, nombre `parcialbd`, sin script `start` ni pruebas):
`@supabase/supabase-js`, `bcrypt`, `cors`, `dotenv`, `express@5`, `jsonwebtoken`, `multer@1.4.5-lts.2`, `nodemailer@8`, `pdfkit`, `pg`, `swagger-jsdoc`, `swagger-ui-express`, y **sin uso**: `mysql2`, `postgres`.

**Frontend:** `vue@3.5`, `apexcharts` + `vue3-apexcharts`; desarrollo: `vite@6.3`, `typescript@5.8`, `vue-tsc`, `eslint@9`, `eslint-plugin-vue`, `@vue/eslint-config-typescript`. No usa `vue-router`: hay un enrutador propio en `App.vue`.

### 1.3 Variables de entorno (solo nombres)

| Variable | Uso | ¿Presente en `.env` local? |
|---|---|---|
| `PORT` | Puerto HTTP | Sí |
| `JWT_SECRET` | Firma de sesiones | Sí |
| `APPOINTMENT_ACTION_SECRET` | Firma de enlaces de revisión de citas | Sí |
| `APP_BASE_URL` | URL base para enlaces en correos | Sí |
| `SUPABASE_URL`, `SUPABASE_KEY`, `BUCKET_NAME` | Supabase Storage | Sí |
| `SUPABASE_PASSWORD` | Contraseña de PostgreSQL | **No** → hoy el backend conecta gracias al valor escrito en `baseDatos.js` |
| `MAIL_MODE`, `MAIL_USER`, `MAIL_APP_PASSWORD`, `MAIL_FROM`, `RESEND_API_KEY` | Correo | Sí |
| `NODE_ENV` | Modo producción | No |

Host, puerto, usuario y base de datos de PostgreSQL están escritos en `baseDatos.js`, no en variables.

### 1.4 Cómo arranca

- **Backend:** `node index.js` (no hay script `npm start`). Carga `.env`, conecta un `Client` de `pg` al iniciar y sirve `/api/*`, `/api-docs` y el SPA.
- **Frontend:** `npm run dev` (Vite en `:5173`, proxy de `/api` a `:3000`) o `npm run build` → `dist/`, que el backend sirve si existe.

### 1.5 Resultado de ejecutar lo existente

| Comando | Resultado |
|---|---|
| `npm install` (raíz) | OK |
| `npm audit` (raíz) | **14 vulnerabilidades**: 1 crítica (`proxy-addr`), 9 altas (`path-to-regexp`, `qs`, `jws`, `ws`, `validator`, `nodemailer`, `mysql2`…), 2 moderadas, 2 bajas |
| `node index.js` | Arranca y conecta a Supabase. `GET /api/contenido/activo` → 200 |
| `GET /api/citas` (sin token) | **500** con `column c.id_servicio does not exist` en el cuerpo |
| `GET /package.json`, `GET /src/main.ts` | **200**: el servidor expone archivos del proyecto frontend |
| Pruebas backend | No existen (`npm test` imprime un error a propósito) |
| `npm install` (frontend) | OK |
| `npm audit` (frontend) | **34 vulnerabilidades**: 2 críticas (`proxy-addr`, `shell-quote`), 25 altas (`vite`, `vue`, `rollup`, `postcss`, `@typescript-eslint/*`…) |
| `vue-tsc --build` | Sin errores |
| `vite build` | OK, con aviso: chunk principal de **894 kB** y ApexCharts de **518 kB** |
| `eslint .` | Sin hallazgos |

---

## 2. Arquitectura hexagonal (módulo por módulo)

### 2.1 Regla de dependencias

Verificado con búsqueda de `require` en `domain/` y `application/` de los 11 módulos:

- Ningún caso de uso ni servicio de dominio importa `express`, `pg`, `baseDatos`, `jsonwebtoken`, `bcrypt`, `nodemailer`, Supabase ni `process.env`. ✅
- Los casos de uso reciben sus dependencias por parámetro (`dependencies.xxxRepository`, `xxxService`) y las ensambla cada `index.js` (raíz de composición). Los puertos son implícitos (duck typing de JavaScript), lo cual es aceptable; no hay interfaces documentadas. ✅
- `domain/` y `application/` solo importan sus propios errores/servicios y `shared/pets/dogBreedCatalog`. ✅
- Las transacciones se exponen como unidad de trabajo (`runInTransaction(async (db) => …)`): el caso de uso pasa un manejador opaco sin conocer `pg`. ✅

### 2.2 Controladores

- Los 11 controladores solo leen `req`, llaman al caso de uso y traducen errores a HTTP. No hay SQL ni reglas de negocio en controladores ni en `routes/`. ✅
- **Problema:** 9 de 11 controladores devuelven `error.message` de errores inesperados (ver A6).

### 2.3 Rutas y duplicación

- `routes/` **no** es código antiguo duplicado: es la capa de entrada HTTP de los módulos. Todos los módulos están registrados en `index.js` y las rutas protegidas responden 401 sin token.
- Legado real: `legacy/backend/routes/citas.js` (montado en `/api/citas`, ver C4) y `legacy/backend/routes/login.js` (re-exportado por `routes/login.js`, **no montado**; `/api/login` apunta al módulo `auth`).
- `routes/imagenes.js` es un alias de `contenido` montado en `/api/imagenes`; el frontend no lo usa.
- Duplicación funcional: `adminAgenda` y `adminServiceManagement` tienen cada uno `confirmAdminAppointment` y `getAdminAppointmentDetail` con lógica ligeramente distinta. El frontend usa ambos (`/api/admin/agenda/citas/:id/confirm` y `/api/admin/gestion/citas/:id/confirm`).
- Acoplamiento entre módulos: `adminServiceManagement/index.js:14` importa `buildAppointmentEmailViewModel` del dominio de `clientAppointments`.

---

## 3. Hallazgos por gravedad

### CRÍTICO

**C1. `.env` versionado en git con todos los secretos.**
`.env` está en el índice y en 4 commits ya publicados en `origin` (`db4d3e8`, `cada9c9`, `83d000b`, `42ac750`). Contiene la clave de Supabase, `JWT_SECRET`, `APPOINTMENT_ACTION_SECRET`, la contraseña de aplicación de Gmail y la clave de Resend. No existe `.gitignore` en la raíz.
*Corrección:* `git rm --cached .env`, `.gitignore` raíz y `.env.example`. **Rotar todos esos secretos**, porque el historial ya se publicó. Purgar el historial (`git filter-repo`) queda como decisión del equipo (§5, pregunta 5).

**C2. Credenciales de PostgreSQL escritas en el código.** `baseDatos.js:4-7`: host, usuario y una contraseña de respaldo (`process.env.SUPABASE_PASSWORD || '<literal>'`). Como `SUPABASE_PASSWORD` no está en `.env`, el sistema funciona **solo** gracias a ese literal, que también está publicado en el historial.
*Corrección:* leer toda la conexión de variables de entorno, sin valores de respaldo, y fallar al arrancar si faltan. **Rotar la contraseña de la base de datos** en Supabase.

**C3. Secreto JWT por defecto.** `middleware/auth.js:11`, `auth/index.js:24`, `clientAppointments/infrastructure/services/EmailAppointmentNotificationService.js:21` y `legacy/backend/routes/login.js:103` usan un valor literal si falta `JWT_SECRET`. Si la variable no se configura (por ejemplo en un despliegue nuevo), cualquiera puede firmar un token con `rol: administrador`.
*Corrección:* módulo de configuración único que exige `JWT_SECRET` al arrancar.

**C4. `/api/citas` (legado) sin autenticación, con lectura, creación, edición y borrado.** `index.js:29` → `legacy/backend/routes/citas.js:50-377`. Hoy cada consulta falla porque usa el esquema antiguo (`id_cita`, `id_servicio`, `cedula_cliente`), y responde 500 **con el mensaje SQL** en el cuerpo. Si alguien alineara el esquema, permitiría a cualquiera borrar citas. Ningún consumidor lo usa: el frontend usa `/api/cliente/citas` y `/api/admin/*`.
*Corrección:* desmontar la ruta y proponer borrar el archivo.

### ALTO

**A1. Transacciones sobre un `Client` compartido.** `baseDatos.js` exporta un único `Client`. Seis repositorios hacen `BEGIN … COMMIT` sobre él:
`adminClients/…/PostgresAdminClientsRepository.js:209`, `adminServiceManagement/…:354`, `adminServices/…:262`, `auth/…/PostgresAuthRepository.js:139`, `clientAppointments/…:250`, `portalContent/…:159`.
Con peticiones concurrentes, consultas de otras peticiones quedan dentro de la transacción abierta, y un `ROLLBACK` puede deshacer escrituras ajenas. Además, `adminServices` llama a `findPrimaryServiceById`/`findAdditionalServiceById` **dentro** de la transacción usando el `client` global (líneas 305, 340, 388, 408): con un `Pool` esa lectura iría por otra conexión y devolvería `null`.
*Corrección:* `Pool` con la misma interfaz `query()`, `withTransaction()` sobre `pool.connect()`, y refactorizar los 6 repositorios para que todo lo transaccional use el cliente reservado.

**A2. XSS almacenado en la página de revisión de citas e inyección HTML en correos.** `clientAppointments/infrastructure/services/AppointmentReviewPageRenderer.js:12-40` interpola sin escapar `clientName`, `petName`, `serviceName`, `observacionesCliente` y los nombres de adicionales. Esa página se sirve desde el **mismo origen** del SPA, donde el token de la administradora vive en `sessionStorage`: un cliente puede escribir `<script>` en "observaciones" y robar la sesión de administración. Lo mismo pasa en las plantillas de `services/emailService.js` (inyección HTML en correos).
*Corrección:* función `escapeHtml` aplicada a todo dato dinámico.

**A3. Sin límite de intentos en autenticación.** Login, verificación de registro y recuperación de contraseña (`routes/auth.js:655-660`) no limitan intentos. Con códigos de 6 dígitos válidos 15 minutos, la fuerza bruta del código de recuperación permite tomar cualquier cuenta.
*Corrección:* limitador en memoria por IP y por correo (sin dependencias nuevas).

**A4. El servidor publica el proyecto frontend.** `index.js:92` hace `express.static(frontendRoot)`: expone `package.json`, `src/`, `tsconfig*`, `vite.config.ts` y el código fuente. Verificado: `GET /package.json` → 200.
*Corrección:* servir solo `dist/`. Fallback del SPA para cualquier `GET` que no sea `/api`, lo que además deja listas las rutas de la Fase 2.

**A5. Dependencias vulnerables.** Backend: 14 (1 crítica). Frontend: 34 (2 críticas). La mayoría se corrige con `npm audit fix` sin cambios mayores. `nodemailer` necesita un salto de versión mayor.
*Corrección:* `npm audit fix`, quitar `mysql2`/`postgres` y evaluar `nodemailer`.

**A6. Errores internos expuestos al cliente.** `handleHttpError` en `adminAgenda`, `adminClients`, `adminPets`, `adminReports`, `adminServiceManagement`, `adminServices`, `clientHistory` y `portalContent` (línea 14 de cada controlador) y `authController.js:97` devuelven `error.message` en respuestas 500: nombres de tablas, columnas y tipos de Postgres. Un UUID mal formado produce 500 con `invalid input syntax for type uuid`.
*Corrección:* manejador HTTP compartido: mensaje genérico en 500, `22P02` → 400 y registro completo solo en el servidor.

### MEDIO

**M1. Subida de archivos débil.** `routes/clienteMascotas.js:14`, `routes/contenido.js:14` y `routes/clienteCitas.js:14` validan solo `mimetype.startsWith('image/')`, que es un dato del cliente: acepta SVG (puede contener scripts). La extensión del archivo guardado sale del nombre original (`services/supabaseStorage.js:26`). En `clienteCitas` el error de multer no se captura (`routes/clienteCitas.js:594`) y cae al manejador por defecto de Express (HTML 500).
*Corrección:* lista blanca JPG/PNG/WebP/GIF, verificación de la firma binaria del archivo, extensión derivada del tipo real y captura del error en las tres rutas.

**M2. El código de verificación puede volver en la respuesta.** `services/emailService.js:386,449-457`: si falta `MAIL_MODE` (el valor por defecto es `local`) y `NODE_ENV` no es `production`, el código de registro **y el de recuperación** se devuelven como `developmentCode`, lo que permite cambiar la contraseña de cualquier cuenta. Hoy está mitigado porque `MAIL_MODE=gmail`.
*Corrección:* devolverlo solo si se activa explícitamente (`MAIL_EXPOSE_DEV_CODES=true`) y nunca en producción.

**M3. Confirmar o cancelar citas con un `GET` desde el correo.** `routes/clienteCitas.js:586`: los escáneres de enlaces de los proveedores de correo pueden "visitar" el enlace y confirmar o cancelar la cita sin intervención humana. → **Pregunta de negocio** (§5).

**M4. Enumeración de usuarios.** `auth/application/useCases/requestPasswordRecovery.js:7-11` devuelve un mensaje distinto según exista o no el correo.
*Corrección:* mensaje único. El flujo de pantallas no cambia.

**M5. CORS abierto a cualquier origen** (`index.js:16`). El riesgo es moderado porque se usan tokens Bearer, no cookies.
*Corrección:* lista de orígenes por variable `CORS_ORIGINS`.

**M6. Sin cabeceras de seguridad** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
*Corrección:* middleware propio, sin dependencia nueva.

**M7. Choque de citas confirmadas.** *(Corregido tras revisar el código en la Fase B.)* Las citas `pendiente` no ocupan franja: solo `confirmada` y `en_atencion` la bloquean (`PostgresClientAppointmentsRepository.listBlockingAppointments`). Por diseño, varias personas pueden pedir la misma hora. El riesgo real está en otro punto: **confirmar una cita no verifica si ya existe otra confirmada en esa franja** (`adminAgenda` y `adminServiceManagement`, `confirmAdminAppointment`), así que la administradora puede confirmar dos citas que se cruzan.
→ **Pregunta de negocio** (§5, pregunta 7): validarlo cambia lo que ve la administradora.

**M8. El frontend cierra la sesión ante cualquier 401/403.** `src/lib/api.ts:6`: el login de un usuario inactivo responde 403, la página redirige a `/login` y el mensaje "Tu usuario está inactivo" nunca se ve.
*Corrección:* cerrar sesión solo si la petición llevaba token.

**M9. Bundle grande.** Todas las páginas y ApexCharts se cargan de entrada (894 kB + 518 kB).
*Corrección:* carga diferida por página (`defineAsyncComponent`).

**M10. Accesibilidad.**
- 12 reglas `outline: none/0` y solo 6 reglas `:focus-visible`.
- Modales sin `role="dialog"`, `aria-modal` ni cierre con Escape (`AdminAgendaPage.vue:856`, `AdminManagementPage.vue:603/715/742`, `ClientesPage.vue:412`, `ClientHistoryPage.vue:774`).
- `window.confirm` nativo en `ClientPetsPage.vue:425,451,472`.
- No hay `prefers-reduced-motion` global.
- Colores de la guía que no alcanzan AA (4,5:1) en texto pequeño: `#7f8ba0` (texto de apoyo), `#0b9f93` (enlace o categoría) y `#f2a900` sobre `#fff3d8` (advertencia).

**M11. No se puede contrastar el código con el esquema real.**
- `Archivos requeridos/SweetyPuppiesBD.sql` es un volcado de **otro** proyecto de Supabase, el de la imagen `supabase-schema-onyzutykzjiocjnlaqgr.png`. Solo tiene 4 tablas legadas con IDs enteros (`citas.id_cita`, `mascotas.cedula_cliente`, `servicios.tipo`…).
- El código activo usa 15 tablas con UUID: `usuarios`, `clientes`, `administradores`, `codigos_verificacion`, `mascotas`, `citas`, `historial_citas`, `servicios`, `servicios_adicionales`, `tarifas_servicio`, `tarifas_servicio_adicional`, `cita_servicios_adicionales`, `horarios_negocio`, `bloqueos_agenda`, `imagenes`.
- Estados de cita usados por el código: `pendiente`, `confirmada`, `en_atencion`, `completada`, `cancelada`, `reprogramada`. Las comparaciones usan `estado::text`, lo que tolera tanto `enum` como `varchar`.
- `Fase2_Script_Supabase_tienda_inventario.sql` **no está** en el repositorio.
- Única inconsistencia comprobada en ejecución: el legado `/api/citas` consulta columnas inexistentes (C4).

*Corrección:* el equipo debe exportar el esquema actual (`pg_dump --schema-only`, o el SQL Editor de Supabase) y versionarlo junto con el script de la Fase 2. No se ejecutó SQL directo contra Supabase (regla 2).

**M12. `node_modules/` versionado.** 4.288 archivos en git y sin `.gitignore` en la raíz.
*Corrección:* `git rm -r --cached node_modules`.

**M13. Duplicación y acoplamiento entre módulos** (ver §2.3).
*Propuesta:* un "núcleo compartido" de citas (`shared/appointments`) para las reglas de estado y el modelo de correo. Se deja como propuesta porque tocarlo cambia el comportamiento de dos pantallas.

**M14. El token pasa por `localStorage`.** `src/lib/session.ts:169`: la sincronización entre pestañas escribe la sesión en `localStorage` y solo la borra la pestaña que la pidió. Si responden varias pestañas, el token puede quedar ahí indefinidamente.

### BAJO

- **B1.** Dependencias sin uso: `mysql2`, `postgres`.
- **B2.** Código muerto: `routes/login.js` + `legacy/backend/routes/login.js` (no montado, esquema antiguo, secreto por defecto). En el frontend: `components/LegacyPageView.vue`, `lib/legacyPage.ts`, `src/legacy/**` y `public/legacy/**`, todos sin referencias. `src/legacy/scripts/archived/carrusel-dinamico.js` contiene la URL del proyecto Supabase y una clave publicable para consultar Supabase **directamente desde el navegador**, lo que va contra la regla del proyecto. También `public/img/` en la raíz (3 imágenes sin uso) y `docs/*.html` (JSDoc del `citas.js` legado). → Se propone borrarlos (§6.4).
- **B3.** `package.json` del backend: nombre `parcialbd`, sin `start`, `dev` ni `test`.
- **B4.** Correo de administración de respaldo escrito en el código (`EmailAppointmentNotificationService.js:25`).
- **B5.** Font Awesome desde CDN sin `integrity` (`index.html:8`).
- **B6.** Swagger público en `/api-docs`. Aceptable en un proyecto académico; conviene protegerlo en producción.
- **B7.** `README.md` raíz vacío y `src/legacy/README.md` desactualizado (dice que el login usa una plantilla legada; ya no es así).
- **B8.** Un token inválido responde 403 en lugar de 401. No se cambia: el frontend depende de eso.
- **B9.** El modo de correo local escribe códigos en `temp/verification-codes.log`, y `temp/` no está ignorado.

---

## 4. Frontend: estado actual

- **Rutas:** enrutador propio en `App.vue` con mapa de rutas, guardas por rol y alias heredados (`/clientes.html`…). La lista se repite a mano en `index.js` (`appRoutes`): si una ruta no está en ambos sitios, recargar la página da 404.
- **API:** `src/lib/api.ts` centraliza `fetch` con el token. Dos páginas usan `fetch` directo para descargar PDF (`ClientHistoryPage.vue:325`, `ReportesPage.vue:525`).
- **Sesión:** `sessionStorage` con caducidad de 24 h y sincronización entre pestañas (ver M14).
- **TypeScript/lint:** sin errores.
- **Estilos:** `app.css` define pocas variables (`--sp-primary-purple`…). El resto son 474 colores hexadecimales repartidos en los `.vue` y 11 hojas `styles/legacy/*.css` cargadas globalmente; algunas apenas se usan (por ejemplo, `carrusel-estilos.css`: 0 de 15 clases en uso).
- **Estados de carga y error:** cada página los resuelve a su manera (textos "Cargando…"), sin skeletons ni avisos temporales (toasts) comunes.
- **Responsividad:** existen puntos de quiebre a 980 px y 720 px en los encabezados y en algunas páginas.
- **Legado:** solo siguen en uso los CSS de `styles/legacy/` (sobre todo `login.css`, usado por `AuthPage.vue`).

---

## 5. Preguntas para el negocio / el equipo

1. **Tipografía.** El encargo dice *Poppins*, pero la guía ACT-15 (pág. 21) y la aplicación actual usan *Montserrat*. Se mantiene Montserrat (coherente con la guía de la tienda) y la fuente queda en un único token (`--sp-font-family`), así que cambiar a Poppins es una línea. ¿Cuál es la oficial?
2. **Confirmar o cancelar citas desde el correo.** Hoy un clic en el enlace del correo ejecuta la acción (`GET`). Los escáneres de enlaces de algunos proveedores pueden activarla solos. ¿Pasamos a "el enlace abre la página de revisión y la acción se confirma con un botón"? Eso añade un clic para la administradora.
3. **"Eliminar mascota" en el portal del cliente.** El diálogo dice "Esta acción no se puede deshacer", pero el backend hace una baja lógica, igual que "Desactivar". ¿Eliminar debe ocultarla para siempre al cliente, o basta con unificar el texto?
4. **Duplicación agenda / gestión.** ¿Confirmar una cita desde la Agenda debe comportarse exactamente igual que desde Gestión de citas (mismos correos y mismos campos actualizados)? Si es así, se unifican en un núcleo compartido.
5. **Historial de git.** ¿Purgamos `.env` del historial (`git filter-repo`, reescribe commits y obliga al equipo a volver a clonar) o basta con rotar los secretos?
6. **Pruebas con datos reales.** Para probar de punta a punta el registro, las citas y el panel de administración se necesitan una cuenta de prueba de cliente y otra de administradora, o autorización para crear datos de prueba en la base de Supabase.
7. **Citas que se cruzan.** ¿Debe el sistema impedir confirmar una cita si ya hay otra confirmada en esa franja (o al menos advertirlo)? Ver M7.
8. **Tienda visible antes de tiempo.** Las opciones de la tienda existen pero están apagadas (`VITE_ENABLE_STORE`). ¿Las mostramos ya como "Próximamente" a clientes y administradora, o esperamos a que haya pantallas funcionales?
9. **Subidas desde iPhone.** Ahora solo se aceptan JPG, PNG, WebP y GIF reales. Safari convierte las fotos HEIC a JPG al subirlas, pero si alguien sube un `.heic` directamente verá "Solo se permiten imágenes JPG, PNG, WebP o GIF". ¿Es aceptable?
10. **Textos del menú.** El grupo "Principal" del panel se llama ahora "Operación", como en la guía ACT-15 (pág. 14). ¿Lo mantenemos?

---

## 6. Registro de correcciones (Fases B–D)

### 6.1 Corregido

| Hallazgo | Qué se hizo | Commit |
|---|---|---|
| C1 | `.gitignore` raíz, `.env.example` sin valores; `.env` y `node_modules/` (3.988 archivos) salen del índice. Los archivos locales se conservan | `07814fb` |
| C2 | `config/env.js`: la conexión sale de `DATABASE_URL` o `DB_*`, sin valores en el código. Si falta, el servidor no arranca y dice qué variable falta | `284979d` |
| C3 | Sin secreto JWT por defecto; los tokens se verifican solo con HS256 | `284979d` |
| C4 | `/api/citas` desmontado y fuera de Swagger (ahora responde 404) | `c5a1a46`, `0a4ee8a` |
| A1 | `baseDatos.js` pasa a `Pool` con la misma interfaz `query()` más `withTransaction()`. Los 6 repositorios transaccionales usan una conexión reservada; `adminServices` lee después del `COMMIT` | `284979d` |
| A2 | `escapeHtml` en la página de revisión de citas y en las 4 plantillas de correo | `900a0b6` |
| A3 | Límite de intentos por IP y por correo en login, registro y recuperación (429) | `7599b42` |
| A4 | Solo se sirve `dist/`; fallback del SPA para cualquier ruta de navegación | `c5a1a46` |
| A5 | Backend: **0 vulnerabilidades**; se quitan `mysql2` y `postgres`; `nodemailer` 10.0.14 y `multer` 2.4.0. Frontend: de 34 a 4 (ver 6.2) | `69cc5c6`, `2ee30c8` |
| A6 | Manejador HTTP compartido (`shared/http/httpErrors.js`): 500 genérico, `22P02` → 400, `23505`/`23503` → 409; manejador global de JSON inválido y multer | `c5a1a46` |
| M1 | Lista blanca JPG/PNG/WebP/GIF verificada por firma binaria; extensión según el tipo real; 400 en JSON en las 3 rutas | `be730b3` |
| M2 | El código de verificación solo vuelve en la respuesta con `MAIL_EXPOSE_DEV_CODES=true` y nunca en producción | `900a0b6` |
| M4 | La recuperación responde lo mismo exista o no la cuenta | `7599b42` |
| M5, M6 | CORS por `CORS_ORIGINS`; cabeceras `nosniff`, `X-Frame-Options`, `Referrer-Policy`, sin `x-powered-by` | `c5a1a46` |
| M8 | `api.ts` solo cierra la sesión si la petición iba autenticada; mensajes claros sin conexión y ante 429 | `789b712` |
| M9 | Carga diferida de páginas: el bundle inicial pasa de **894 kB a 112 kB** y ApexCharts solo se carga en Reportes | `8d76e1b` |
| M10 | Foco visible global; `v-dialog` en los 16 modales; botones de cierre con nombre accesible; `role=alert/status`; `prefers-reduced-motion`; colores AA; se elimina el `window.confirm` sobrescrito | `8d76e1b` |
| M12 | `node_modules/` fuera de git | `07814fb` |
| M14 | La sincronización entre pestañas ya no deja el token en `localStorage` | `789b712` |
| B1 | Dependencias sin uso eliminadas | `69cc5c6` |
| B3 | `package.json`: nombre, `start`, `dev`, `test`, `engines` | `69cc5c6` |
| B4 | Correo de administración desde `ADMIN_NOTIFICATION_EMAIL`/`MAIL_USER`, sin dirección fija en el código | `284979d` |
| B5 | SRI en Font Awesome (hash verificado contra cdnjs) | `8d76e1b` |
| B7 | README raíz, del frontend y del legado | `b8749c6` |
| B9 | `temp/` en `.gitignore` | `07814fb` |
| Lint | Los 33 errores que aparecieron tras actualizar ESLint: efectos secundarios en un `computed` de `App.vue`, variables sin uso y legado archivado excluido | `8d76e1b` |

**Pruebas añadidas** (`npm test`, 33 en verde, sin base de datos ni correo): arranque de la app, autenticación y roles, legado desmontado, CORS, `loginUser`, `createClientAppointment`, `withTransaction` (COMMIT, ROLLBACK, conexiones separadas), escape de HTML, detección de imágenes, limitador y una **prueba de arquitectura** que impide que dominio o casos de uso importen infraestructura en cualquiera de los 15 módulos.

**Fase C (visual):** tokens centralizados (`tokens.css`), capa base con componentes `.sp-*` (`base.css`), `PlatformShell` único para cliente y administración (antes eran ~1.200 líneas duplicadas), esqueletos de carga en las 14 pantallas y 267 colores fijos reemplazados por tokens. Detalle en el README, §6.

**Fase D (terreno de la Fase 2):** módulos `catalog`, `inventory`, `cart` y `orders` con la estructura hexagonal y un README de alcance cada uno; menús y rutas reservadas para la tienda detrás de `VITE_ENABLE_STORE`.

### 6.2 Pendiente

| Tema | Detalle | Responsable |
|---|---|---|
| **Rotar secretos** | Todo lo que estuvo en `.env` y en `baseDatos.js` está en el historial publicado: contraseña de PostgreSQL, clave de Supabase, `JWT_SECRET`, `APPOINTMENT_ACTION_SECRET`, contraseña de aplicación de Gmail y clave de Resend | Equipo (Supabase, Google, Resend) |
| **Variables de base de datos** | Agregar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` (o `DATABASE_URL`) al `.env` local. Sin ellas el backend no arranca | Equipo |
| Purgar historial | Opcional, con `git filter-repo` (§5, pregunta 5) | Decisión del equipo |
| Esquema real | Versionar `pg_dump --schema-only` del proyecto actual y `Fase2_Script_Supabase_tienda_inventario.sql` (M11) | Equipo |
| Prueba en vivo | Registro, correo, login, recuperación, agendar, mascotas, panel, carrusel y subida contra Supabase: requiere las variables de base de datos y cuentas de prueba (§5, pregunta 6) | Pendiente |
| `braces` (alta) | 4 alertas en la cadena de ESLint del frontend. No hay versión corregida y no llega al bundle | Revisar cuando salga el arreglo |
| M3 | Acciones por `GET` desde el correo (§5, pregunta 2) | Negocio |
| M7 | Choque de citas confirmadas (§5, pregunta 7) | Negocio |
| M13 | Duplicación agenda/gestión y acoplamiento entre módulos (§5, pregunta 4) | Negocio + equipo |
| Rendimiento del limitador | Es en memoria (una instancia). Si se despliega con varias instancias, moverlo a un almacenamiento compartido | Equipo |
| CSP | No se añadió `Content-Security-Policy`: depende de Google Fonts, cdnjs y Supabase. Conviene definirla al desplegar | Equipo |
| Colores decorativos | Quedan tonos de degradados (`#e60073`, `#eefafe`…) en los estilos heredados; no tienen equivalente en la guía | Opcional |

### 6.3 Propuesta de borrado (no ejecutada)

Código sin referencias, confirmado con búsqueda en todo el repositorio:

- Backend: `legacy/`, `routes/citas.js`, `routes/login.js`, `routes/imagenes.js` (alias de `contenido`, sin consumidores), `public/img/` en la raíz y `docs/*.html`, `docs/fonts`, `docs/scripts`, `docs/styles` (JSDoc del legado).
- Frontend: `src/legacy/`, `public/legacy/`, `src/components/LegacyPageView.vue`, `src/lib/legacyPage.ts` y `src/styles/legacy/carrusel-estilos.css` (ya no se carga).
- `Archivos requeridos/SweetyPuppiesBD.sql` y la imagen del esquema: corresponden a otro proyecto antiguo. Conviene reemplazarlos por el esquema actual.

### 6.4 Cambios visibles para el usuario

Ninguno cambia el flujo de las pantallas. Sí cambian la apariencia y algunos textos:

- Tipografía Montserrat y color de texto `#22354b` en todo el cuerpo (antes algunos textos heredaban `sans-serif` y negro).
- Los botones deshabilitados se ven grises (guía, pág. 22) y los botones se elevan 2 px al pasar el mouse.
- El texto de apoyo y los enlaces turquesa son un poco más oscuros (contraste AA).
- El menú lateral es más compacto, el logo aparece sobre fondo blanco y el grupo del panel se llama "Operación".
- Mientras carga una pantalla se ve un esqueleto en lugar del texto "Cargando…".
- El mensaje de recuperación de contraseña es el mismo exista o no la cuenta.
- Las subidas aceptan solo JPG, PNG, WebP y GIF.
