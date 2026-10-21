# Sweety Puppies

ERP académico para la peluquería canina Sweety Puppies (UNIMINUTO). Incluye portal del cliente (perfil, mascotas, citas, historial) y panel administrativo (agenda, clientes, mascotas, gestión de citas, servicios, contenido y reportes). La Fase 2 agrega tienda e inventario.

| Capa | Tecnología |
|---|---|
| Backend | Node.js ≥ 20, Express 5, arquitectura hexagonal por módulo |
| Base de datos | PostgreSQL en Supabase (conexión directa con `pg`, pool de conexiones) |
| Archivos | Supabase Storage (solo desde el backend) |
| Frontend | Vue 3 + Vite + TypeScript (`SwettyPuppies_Frontend/`) |

> El frontend **nunca** consulta Supabase directamente: todo pasa por la API (`/api/*`). RLS está activo en todas las tablas y solo el usuario del backend lo omite.

---

## 1. Instalación

```bash
# Backend (raíz del repositorio)
npm install

# Frontend
cd SwettyPuppies_Frontend
npm install
```

## 2. Variables de entorno

Copia `.env.example` como `.env` en la raíz y completa los valores. `.env` está en `.gitignore`: **nunca lo subas**.

| Variable | Obligatoria | Uso |
|---|---|---|
| `JWT_SECRET` | Sí | Firma de las sesiones |
| `DATABASE_URL` **o** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Sí | Conexión a PostgreSQL (Supabase → Project Settings → Database) |
| `DB_POOL_MAX`, `DB_SSL` | No | Tamaño del pool (10) y SSL (activo salvo `false`) |
| `APPOINTMENT_ACTION_SECRET` | Recomendada | Firma de los enlaces de confirmar/cancelar citas (si falta, usa `JWT_SECRET`) |
| `PORT` | No | Puerto HTTP (3000) |
| `NODE_ENV` | No | `production` en despliegue |
| `APP_BASE_URL` | No | URL pública usada en los correos |
| `CORS_ORIGINS` | No | Orígenes permitidos separados por coma (por ejemplo `http://localhost:5173`) |
| `SUPABASE_URL`, `SUPABASE_KEY`, `BUCKET_NAME` | Para subir imágenes | Supabase Storage |
| `MAIL_MODE` | No | `gmail`, `smtp`, `remote` (Resend) o `local` (escribe en `temp/verification-codes.log`) |
| `MAIL_USER`, `MAIL_APP_PASSWORD`, `MAIL_FROM`, `RESEND_API_KEY` | Según `MAIL_MODE` | Correo transaccional |
| `ADMIN_NOTIFICATION_EMAIL` | No | Correo que recibe las solicitudes de cita (por defecto `MAIL_USER`) |
| `MAIL_EXPOSE_DEV_CODES` | No | `true` devuelve el código de verificación en la respuesta (solo desarrollo; nunca en producción) |

Frontend (`SwettyPuppies_Frontend/.env.local`, opcional):

| Variable | Uso |
|---|---|
| `VITE_ENABLE_STORE` | `true` muestra las opciones de la tienda (Fase 2) en los menús |

Si falta una variable obligatoria, el servidor no arranca y muestra cuál es.

## 3. Arranque

```bash
# Backend (http://localhost:3000, documentación en /api-docs)
npm run dev          # con recarga automática
npm start            # modo normal

# Frontend en desarrollo (http://localhost:5173, redirige /api al backend)
cd SwettyPuppies_Frontend
npm run dev

# Frontend para producción: el backend sirve SwettyPuppies_Frontend/dist
cd SwettyPuppies_Frontend
npm run build
```

Verificación:

```bash
npm test                                  # backend: node:test (sin base de datos ni correo)
cd SwettyPuppies_Frontend && npm run lint # ESLint
cd SwettyPuppies_Frontend && npm run build # vue-tsc + vite build
```

`GET /api/health` responde `{"success":true,"status":"ok"}` cuando el servidor está arriba.

---

## 4. Estructura

```
├── index.js              arranque: valida configuración, abre el puerto
├── app.js                createApp(): middleware, rutas /api, SPA (sin abrir el puerto)
├── baseDatos.js          pool de PostgreSQL: query() y withTransaction()
├── config/env.js         única lectura de variables de entorno sensibles
├── middleware/           auth (JWT y roles), rateLimit, securityHeaders, errorHandler
├── routes/               routers HTTP + documentación OpenAPI de cada módulo
├── services/             adaptadores compartidos: correo y Supabase Storage
├── shared/               utilidades sin dependencias de negocio (http, texto, razas)
├── <módulo>/             un módulo hexagonal por contexto (ver abajo)
├── tests/                pruebas con node:test
├── legacy/               código heredado, desmontado (ver legacy/README.md)
└── SwettyPuppies_Frontend/
    └── src/
        ├── App.vue               enrutador y carga diferida de páginas
        ├── pages/                una pantalla por archivo
        ├── components/layout/    PlatformShell (menú lateral + barra superior)
        ├── components/ui/        esqueletos y estados de carga
        ├── lib/                  api.ts (único cliente HTTP), session.ts, navigation.ts, dialog.ts
        └── styles/               tokens.css (diseño), base.css (componentes .sp-*), app.css
```

### Módulos hexagonales

| Módulo | Responsabilidad |
|---|---|
| `auth` | Registro con verificación por correo, login, recuperación, perfil |
| `clientPets`, `clientAppointments`, `clientHistory` | Portal del cliente |
| `adminAgenda`, `adminClients`, `adminPets`, `adminServiceManagement`, `adminServices`, `adminReports`, `portalContent` | Panel administrativo |
| `catalog`, `inventory`, `cart`, `orders` | **Fase 2** (estructura preparada, sin implementar) |

Cada módulo sigue la misma forma:

```
<módulo>/
  index.js                      composición: crea repositorios/servicios, casos de uso y controlador
  application/useCases/         un caso de uso por archivo: (dependencies, sessionUser, payload) => resultado
  application/services/         orquestación reutilizada por varios casos de uso (opcional)
  domain/errors/                error de dominio con status HTTP y código
  domain/services/              reglas puras (validaciones, cálculos), sin I/O
  infrastructure/http/          controlador: lee req, llama al caso de uso, traduce errores
  infrastructure/repositories/  SQL parametrizado con pg (único lugar con SQL)
  infrastructure/services/      correo, almacenamiento, PDF…
```

**Regla de dependencias:** `domain/` y `application/` no importan Express, `pg`, `baseDatos`, `config/`, librerías externas ni `infrastructure/`. Reciben todo por el objeto `dependencies` que arma `index.js`. La prueba `tests/architecture.test.js` lo verifica en cada `npm test`.

**Transacciones:** el caso de uso pide `repository.runInTransaction(async (db) => …)` y pasa `db` a cada método del repositorio. Dentro, el repositorio usa `require('../../../baseDatos').withTransaction`, que reserva una conexión del pool. Nunca hagas `BEGIN` con `db.query` fuera de `withTransaction`.

## 5. Cómo agregar un módulo nuevo

1. Copia la estructura de un módulo existente (por ejemplo `catalog/`) con el nombre nuevo.
2. Crea el error de dominio en `domain/errors/MiModuloError.js` (`message`, `status`, `code`).
3. Escribe las reglas puras en `domain/services/` y un caso de uso por archivo en `application/useCases/`. El caso de uso solo usa lo que recibe en `dependencies`.
4. Implementa el repositorio en `infrastructure/repositories/PostgresMiModuloRepository.js` con consultas parametrizadas (`$1`, `$2`…). Si escribe en varias tablas, usa `withTransaction`.
5. Crea el controlador en `infrastructure/http/miModuloController.js`. Responde los errores de dominio con su `status` y los demás con `sendUnexpectedError` (`shared/http/httpErrors.js`).
6. Ensambla todo en `index.js` con una función `createMiModuloModule()`.
7. Crea `routes/miModulo.js` con `authenticateToken` y `authorizeRoles('cliente' | 'administrador')`, y su documentación `@openapi`.
8. Monta el router en `app.js` (`app.use('/api/...', require('./routes/miModulo'))`).
9. Agrega pruebas del caso de uso en `tests/` con repositorios falsos y ejecuta `npm test`.
10. En el frontend: página en `src/pages/`, ruta en `App.vue` (con `lazyPage`), opción de menú en `src/lib/navigation.ts` y llamadas con `src/lib/api.ts`. Usa los componentes `.sp-*` de `styles/base.css` y los tokens de `styles/tokens.css`.

## 6. Guía visual

Los tokens de `SwettyPuppies_Frontend/src/styles/tokens.css` siguen la guía ACT-15 (morado `#8f176e`, turquesa `#37bea7`, Montserrat, radios de 14 a 32 px). Para cambiar la tipografía basta con editar `--sp-font-family` y el enlace de Google Fonts en `index.html`.

Componentes listos para la tienda (`styles/base.css`): `.sp-btn` (`--primary`, `--secondary`, `--outline`, `--danger`), `.sp-input`, `.sp-card`, `.sp-badge` (`--success`, `--warning`, `--danger`, `--info`), `.sp-alert`, `.sp-skeleton`, `.sp-empty-state`, `.sp-table`, `.sp-dialog` y `.sp-toast`. Los modales usan la directiva `v-dialog="cerrar"` (foco atrapado, Escape y semántica de diálogo).

## 7. Documentación adicional

- `AUDITORIA_PRE_FASE2.md`: hallazgos, correcciones y pendientes antes de la Fase 2.
- `docs/explicacion_software/`: explicación técnica del sistema.
- `<módulo>/README.md` de `catalog`, `inventory`, `cart` y `orders`: alcance previsto de la Fase 2.
- Swagger: `http://localhost:3000/api-docs`.
