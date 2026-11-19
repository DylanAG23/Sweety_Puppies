# Explicación técnica del software Sweety Puppies

## 1. Descripción general del software

### 1.1 Qué es Sweety Puppies

Sweety Puppies es una plataforma web para la gestión operativa y administrativa de una peluquería canina. El sistema permite atender dos perfiles principales de usuario:

- **Cliente**: persona que registra su cuenta, registra a sus mascotas, agenda citas, consulta su historial y visualiza contenido del portal.
- **Administrador**: persona encargada de la operación del negocio, la agenda, los clientes, las mascotas, los servicios, el contenido visual y los reportes.

### 1.2 Qué problema resuelve

El software busca resolver problemas frecuentes de organización en un negocio de peluquería canina:

- registro disperso de clientes y mascotas
- agendamiento manual con riesgo de cruces de horario
- falta de estandarización en servicios, tarifas y adicionales
- poca trazabilidad del historial de citas realizadas
- dificultad para comunicar estados de citas y verificaciones por correo
- falta de visibilidad operativa y financiera del negocio

### 1.3 Qué módulos principales tiene

Según el código actual, los módulos funcionales principales son:

- **Auth**: registro, login, verificación por correo, recuperación de contraseña, perfil y home por rol
- **Cliente Mascotas**: registro, edición, consulta, activación/desactivación lógica y catálogo de razas
- **Cliente Citas**: cotización, disponibilidad, creación, reprogramación, cancelación y revisión de decisión administrativa
- **Cliente Historial**: consulta de citas activas y citas realizadas
- **Admin Agenda**: agenda general, detalle rápido de citas y bloqueos
- **Admin Gestión de Citas**: centro operativo de citas, atención en curso y finalización
- **Admin Clientes**: consulta y edición de clientes
- **Admin Mascotas**: consulta, edición e historial de mascotas
- **Admin Servicios**: servicios principales, servicios adicionales y tarifas integradas
- **Contenido**: publicaciones visuales del portal del cliente
- **Reportes**: ingresos, adicionales, citas realizadas, resumen financiero y PDF

### 1.4 Funcionalidades para el cliente

El cliente puede:

- registrarse y verificar su cuenta por correo
- iniciar sesión
- recuperar contraseña con código de verificación
- ver su panel principal
- editar su perfil
- registrar mascotas
- editar mascotas
- desactivar lógicamente mascotas
- agendar citas
- consultar disponibilidad horaria
- cotizar servicios
- reprogramar citas
- cancelar citas indicando motivo
- consultar historial de citas activas y realizadas
- visualizar contenido promocional o informativo del negocio

### 1.5 Funcionalidades para el administrador

El administrador puede:

- iniciar sesión y entrar al panel administrativo
- consultar agenda, bloqueos y disponibilidad
- crear y desactivar bloqueos de agenda
- confirmar, cancelar, iniciar, actualizar y finalizar citas
- registrar motivo de cancelación
- notificar cambios de estado por correo
- consultar clientes y editar sus datos
- consultar mascotas y editar sus datos
- gestionar servicios principales y adicionales
- configurar tarifas dentro del módulo de servicios
- administrar contenido del portal del cliente
- generar reportes operativos y financieros
- exportar reportes en PDF

---

## 2. Arquitectura del sistema

### 2.1 Arquitectura adoptada

El proyecto está construido principalmente bajo **arquitectura hexagonal**. Esta decisión es visible en los módulos modernos del backend, que están separados en capas de dominio, aplicación e infraestructura.

Los módulos que siguen este patrón en el repositorio actual incluyen:

- `auth`
- `clientPets`
- `clientAppointments`
- `clientHistory`
- `adminAgenda`
- `adminClients`
- `adminPets`
- `adminServiceManagement`
- `adminServices`
- `adminReports`
- `portalContent`

Además existe una carpeta `legacy/` que conserva compatibilidad heredada con código anterior, pero la lógica nueva no se desarrolla allí.

### 2.2 Qué es arquitectura hexagonal

La arquitectura hexagonal, también conocida como **Ports and Adapters**, busca separar la lógica de negocio del resto de preocupaciones técnicas, como:

- rutas HTTP
- base de datos
- correo
- almacenamiento externo
- rendering o interfaz

La idea principal es que el núcleo del negocio no dependa directamente del framework web ni del motor de base de datos.

### 2.3 Dominio, aplicación e infraestructura

En este proyecto, las capas cumplen el siguiente papel:

- **Dominio**: concentra reglas de negocio, validaciones, errores de dominio y servicios puramente funcionales.
- **Aplicación**: organiza casos de uso concretos, es decir, operaciones de negocio completas como crear una cita, verificar un código o listar mascotas.
- **Infraestructura**: implementa lo técnico: consultas SQL, envío de correos, JWT, bcrypt, subida de archivos, PDF, etc.

### 2.4 Qué son puertos y adaptadores

En la práctica del proyecto:

- los **puertos** se expresan como dependencias esperadas por los casos de uso
- los **adaptadores** son las implementaciones concretas de esas dependencias

Ejemplo:

- un caso de uso necesita guardar una cita
- no conoce SQL ni Express
- recibe una dependencia como `appointmentRepository`
- luego infraestructura implementa esa operación usando PostgreSQL

### 2.5 Cómo separa la lógica de negocio del resto

El flujo habitual es:

1. una ruta Express recibe la petición
2. el controller traduce la petición a parámetros del caso de uso
3. el caso de uso ejecuta la lógica de negocio
4. el repositorio o servicio externo hace la operación técnica necesaria
5. el resultado vuelve al controller
6. el controller responde en JSON

Con esto:

- la lógica no queda incrustada en las rutas
- la base de datos no define las reglas de negocio
- los servicios externos se reemplazan sin reescribir el dominio

### 2.6 Por qué esta arquitectura ayuda

Esta arquitectura mejora:

- **mantenibilidad**: cada módulo tiene una estructura repetible y entendible
- **escalabilidad**: se agregan casos de uso o repositorios sin mezclar responsabilidades
- **pruebas**: los casos de uso pueden probarse aislando dependencias
- **cambio tecnológico**: se puede reemplazar infraestructura con menor impacto

---

## 3. Estructura real de carpetas

## 3.1 Backend

### Carpetas de módulos hexagonales

Cada una de estas carpetas contiene un módulo de negocio:

- `auth/`
- `clientPets/`
- `clientAppointments/`
- `clientHistory/`
- `adminAgenda/`
- `adminClients/`
- `adminPets/`
- `adminServiceManagement/`
- `adminServices/`
- `adminReports/`
- `portalContent/`

En general, dentro de cada módulo se repite esta estructura:

- `domain/`
- `application/`
- `infrastructure/`
- `index.js`

### Carpeta `routes/`

La carpeta `routes/` expone las rutas HTTP del sistema. Estas rutas son la puerta de entrada de Express y delegan en los módulos hexagonales correspondientes.

Ejemplos:

- `routes/auth.js`
- `routes/clienteMascotas.js`
- `routes/clienteCitas.js`
- `routes/adminGestion.js`
- `routes/reportes.js`

### Carpeta `middleware/`

Contiene middlewares de autenticación y autorización. El archivo principal es:

- `middleware/auth.js`

### Carpeta `services/`

Contiene servicios transversales o compartidos. Los más importantes son:

- `services/emailService.js`
- `services/supabaseStorage.js`

### Carpeta `shared/`

Contiene recursos compartidos entre módulos. Actualmente destaca:

- `shared/pets/dogBreedCatalog.js`

Este archivo centraliza el catálogo de razas caninas para evitar inconsistencias en los nombres.

### Carpeta `legacy/`

Contiene compatibilidad heredada del sistema anterior:

- `legacy/backend/routes/citas.js`
- `legacy/backend/routes/login.js`

No es el lugar donde se desarrolla lógica nueva. Debe entenderse como compatibilidad temporal.

### Otros archivos backend relevantes

- `index.js`: punto de arranque del servidor
- `baseDatos.js`: conexión principal a PostgreSQL/Supabase
- `swagger.js`: configuración de Swagger/OpenAPI

## 3.2 Frontend

El frontend está ubicado en:

- `SwettyPuppies_Frontend/`

### Carpetas importantes del frontend

- `src/pages/`: páginas principales del portal cliente y del panel admin
- `src/components/`: componentes reutilizables, como headers y selectores
- `src/lib/`: utilidades de sesión, API y navegación
- `src/styles/`: estilos globales y estilos heredados aún cargados
- `public/`: imágenes, favicon y recursos públicos
- `src/legacy/`: archivos heredados archivados, conservados como referencia/control

### Páginas principales detectadas

Administrador:

- `AdminHomePage.vue`
- `AdminAgendaPage.vue`
- `AdminManagementPage.vue`
- `ClientesPage.vue`
- `MascotasPage.vue`
- `ServiciosPage.vue`
- `ImagenesPage.vue`
- `ReportesPage.vue`

Cliente:

- `ClienteDashboardPage.vue`
- `ClientProfilePage.vue`
- `ClientPetsPage.vue`
- `ClientBookAppointmentPage.vue`
- `ClientHistoryPage.vue`

Autenticación:

- `AuthPage.vue`

### Cómo se maneja la navegación

El proyecto **no usa actualmente `vue-router`**. En su lugar, la navegación se resuelve desde:

- `SwettyPuppies_Frontend/src/App.vue`

Allí existe un mapa manual de rutas, validación de sesión y control por rol.

### Cómo se consumen los endpoints

El frontend consume los endpoints usando funciones helper en:

- `SwettyPuppies_Frontend/src/lib/api.ts`

Estas funciones centralizan:

- `GET`
- `POST`
- `PATCH`
- `DELETE`
- envío de `FormData`
- manejo de token JWT
- expiración/autologout ante `401` o `403`

## 3.3 Flujo real de una petición

Un flujo típico del backend es:

1. el cliente llama una URL del frontend
2. el frontend hace `fetch` a `/api/...`
3. Express recibe la petición en `routes/*.js`
4. el middleware valida JWT y rol si aplica
5. el controller del módulo recibe la petición
6. el controller llama un caso de uso
7. el caso de uso usa repositorios o servicios inyectados
8. el repositorio ejecuta SQL usando `pg`
9. el resultado vuelve al caso de uso
10. el controller responde JSON al frontend

---

## 4. Lógica de negocio

## 4.1 Autenticación

La autenticación está concentrada en el módulo `auth/`. Su archivo ensamblador es:

- `auth/index.js`

Los casos de uso incluyen:

- `initiateCustomerRegistration`
- `verifyRegistrationCode`
- `loginUser`
- `requestPasswordRecovery`
- `verifyPasswordRecoveryCode`
- `resetPasswordWithRecoveryCode`
- `getClientHome`
- `getAdminHome`
- `getClientProfile`
- `updateClientProfile`

## 4.2 Registro de clientes con verificación por correo

El flujo observado es:

1. se reciben datos del cliente
2. se validan campos obligatorios
3. se genera un código temporal
4. se registra el código en `codigos_verificacion`
5. se envía el código por correo
6. al validar el código:
   - se crea el usuario en `usuarios`
   - se crea el cliente en `clientes`
   - se marca el código como usado

## 4.3 Inicio de sesión

El login:

- busca el usuario por correo
- valida si está activo
- compara contraseña usando bcrypt
- determina si el usuario es cliente o administrador
- construye el payload de sesión
- genera un JWT

## 4.4 Recuperación de contraseña

El flujo incluye:

1. solicitud de recuperación
2. generación de código temporal
3. envío por correo
4. verificación del código
5. actualización de `password_hash` en `usuarios`

## 4.5 Control de roles

Los roles observados en el sistema son:

- `cliente`
- `administrador`

El middleware revisa:

- existencia del token
- validez del token
- si el rol está permitido para la ruta

## 4.6 Gestión de clientes

El módulo `adminClients/` permite:

- listar clientes
- buscar por nombre, apellido, cédula, teléfono o correo
- obtener detalle
- ver mascotas asociadas
- ver resumen operativo
- editar datos del cliente y del usuario relacionado

## 4.7 Gestión de mascotas

Hay dos perspectivas:

- `clientPets/`: gestión desde el portal del cliente
- `adminPets/`: consulta y edición administrativa

Se manejan datos como:

- nombre
- raza
- tamaño
- sexo
- edad
- pelaje
- comportamiento
- alergias
- enfermedades
- observaciones
- fotos

La eliminación funcional de mascota quedó orientada a **baja lógica** usando `activo`, lo que preserva historial y reportes.

## 4.8 Agendamiento de citas

El módulo `clientAppointments/` gestiona:

- carga de opciones del formulario
- tarifas base y adicionales
- disponibilidad de agenda
- creación de cita
- reprogramación
- cancelación

El cálculo de disponibilidad contempla:

- horarios del negocio
- bloqueos manuales
- citas que ya ocupan franja
- duración estimada del servicio

## 4.9 Bloqueos de agenda y disponibilidad horaria

Los bloqueos se manejan desde:

- `adminAgenda/`

Se usan tablas como:

- `horarios_negocio`
- `bloqueos_agenda`
- `citas`

La disponibilidad del cliente se calcula tomando en cuenta estas tres fuentes.

## 4.10 Ciclo de vida de una cita

El sistema maneja un flujo de estados de cita:

- `pendiente`
- `confirmada`
- `en_atencion`
- `completada`
- `cancelada`
- `reprogramada`

La lógica operativa principal está en:

- `adminServiceManagement/`

Ejemplo de ciclo:

1. el cliente crea la cita
2. queda `pendiente`
3. administración la confirma
4. pasa a `confirmada`
5. cuando inicia el servicio, pasa a `en_atencion`
6. se registran cambios de atención
7. al finalizar, pasa a `completada`
8. se genera registro en `historial_citas`

También puede cancelarse con motivo, ya sea por cliente o administración.

## 4.11 Servicios, servicios adicionales, tarifas y cálculo de precios

El módulo `adminServices/` ya absorbió la lógica que antes estaba separada en “tarifas”.

Actualmente permite gestionar:

- servicios principales
- servicios adicionales
- tarifas por tamaño y tipo de pelaje
- tarifas adicionales por tamaño
- banderas de negocio:
  - recargo por nudos
  - recargo por comportamiento

El cálculo de precios del lado cliente utiliza:

- `servicios`
- `servicios_adicionales`
- `tarifas_servicio`
- `tarifas_servicio_adicional`

## 4.12 Historial de citas realizadas

El historial consolidado se maneja con:

- `historial_citas`

Esta tabla se alimenta al finalizar una cita. Allí se guarda una fotografía histórica de la atención, incluyendo datos del cliente, mascota, servicio, precio y observaciones finales.

## 4.13 Reportes e indicadores

El módulo `adminReports/` calcula reportes usando `historial_citas` como fuente principal. Esto garantiza que solo se tomen en cuenta citas realmente realizadas.

Se calculan:

- ingresos totales
- ingresos por adicionales
- citas realizadas
- resumen financiero 30/70
- tendencias por periodo

## 4.14 Contenido visual del portal del cliente

El módulo `portalContent/` administra publicaciones visuales persistidas en `imagenes`. El cliente ve solo las publicaciones activas, ordenadas por el campo `orden`.

---

## 5. Seguridad

## 5.1 Hash de contraseñas con bcrypt

El proyecto usa `bcrypt` a través de:

- `auth/infrastructure/services/BcryptHashService.js`

Su propósito es:

- generar hash seguro de contraseña
- validar coincidencia de credencial en login

El sistema nunca debería comparar contraseñas en texto plano.

## 5.2 Uso de JWT

El proyecto usa `jsonwebtoken` y un servicio dedicado:

- `auth/infrastructure/services/JwtTokenService.js`

El JWT encapsula:

- identidad del usuario
- rol
- ids relevantes del perfil

## 5.3 Middleware de autenticación

El archivo:

- `middleware/auth.js`

implementa:

- `authenticateToken`
- `authorizeRoles`

Con esto se protege el acceso a rutas privadas del cliente y del administrador.

## 5.4 Validaciones principales

El sistema aplica validaciones a nivel de dominio, por ejemplo en:

- `auth/domain/services/authValidation.js`
- `clientPets/domain/services/petValidation.js`
- `clientAppointments/domain/services/appointmentRules.js`
- `adminServices/domain/services/serviceCatalog.js`
- `portalContent/domain/services/contentCatalog.js`

Esto evita que la validación quede acoplada solo al frontend.

## 5.5 Manejo de variables de entorno

El sistema carga configuración mediante:

- `dotenv`

Se usan variables sensibles como:

- `PORT`
- `JWT_SECRET`
- `MAIL_USER`
- `MAIL_APP_PASSWORD`
- `MAIL_FROM`
- `MAIL_MODE`
- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_PASSWORD`
- `BUCKET_NAME`

## 5.6 Buenas prácticas aplicadas

Se observan buenas prácticas como:

- separación de responsabilidades
- rutas delgadas
- casos de uso aislados
- reutilización de validaciones
- uso de hash de contraseñas
- uso de JWT
- control por rol
- documentación Swagger

## 5.7 Puntos sensibles a revisar

Sin imprimir datos sensibles, hay varios puntos que deberían revisarse en una versión más madura:

- existe una **contraseña de base de datos con fallback hardcodeado** en `baseDatos.js`
- existe un **JWT secret por defecto hardcodeado** en `auth/index.js` y `middleware/auth.js`
- el frontend usa `sessionStorage` y sincronización entre pestañas, lo cual es funcional pero requiere políticas claras
- no existe actualmente un `.env.example`
- el script `npm test` del backend es un placeholder y no hay una suite automatizada real
- el archivo SQL disponible no representa con precisión todo el modelo actual usado por el código

---

## 6. Correos y SMTP

## 6.1 Cómo funciona el envío de correos

El sistema centraliza el envío de correos en:

- `services/emailService.js`

Además existen adaptadores específicos por módulo, por ejemplo:

- `auth/infrastructure/services/EmailNotificationService.js`
- `clientAppointments/infrastructure/services/EmailAppointmentNotificationService.js`
- `adminServiceManagement/infrastructure/services/AdminServiceManagementNotificationService.js`

## 6.2 Uso de Nodemailer

El proyecto usa `nodemailer` para envío mediante Gmail/app password o modo SMTP equivalente, según configuración.

## 6.3 Configuración SMTP observada

Variables utilizadas:

- `MAIL_USER`
- `MAIL_APP_PASSWORD`
- `MAIL_FROM`
- `MAIL_MODE`

También existe soporte alterno para:

- `RESEND_API_KEY`

## 6.4 Flujo de verificación por correo

En registro:

1. se genera código
2. se registra en base de datos
3. se envía por correo
4. el usuario lo ingresa
5. se valida y se activa el alta real del cliente

## 6.5 Flujo de recuperación de contraseña

1. el usuario solicita recuperación
2. se emite código
3. se envía correo
4. se verifica código
5. se actualiza contraseña

## 6.6 Correos de notificación de citas

El código actual sí incluye correos relacionados con citas, por ejemplo:

- solicitud nueva de cita
- reprogramación pendiente
- cita confirmada
- cita cancelada
- cita iniciada
- cita finalizada
- cancelación con motivo por cliente o administración

## 6.7 Modo local o de respaldo

Si no hay configuración remota válida, el sistema puede escribir logs de respaldo en:

- `temp/verification-codes.log`

Esto sirve para entorno de desarrollo o prototipo controlado, pero no reemplaza un servicio de correo real en producción.

---

## 7. Base de datos

## 7.1 Motor de base de datos

El backend opera sobre **PostgreSQL**, usando un proyecto de **Supabase** como proveedor.

## 7.2 Conexión actual

La conexión principal se realiza en:

- `baseDatos.js`

La librería usada es:

- `pg`

Además existe uso de:

- `@supabase/supabase-js`

para almacenamiento en Supabase Storage.

## 7.3 Tablas principales observadas en el código

A partir de las consultas SQL reales del repositorio, las tablas principales en uso son:

- `usuarios`
- `clientes`
- `administradores`
- `codigos_verificacion`
- `mascotas`
- `citas`
- `historial_citas`
- `servicios`
- `servicios_adicionales`
- `tarifas_servicio`
- `tarifas_servicio_adicional`
- `cita_servicios_adicionales`
- `horarios_negocio`
- `bloqueos_agenda`
- `imagenes`

## 7.4 Relaciones principales inferidas del código

- `usuarios` se relaciona con `clientes` y `administradores` por `usuario_id`
- `clientes` se relaciona con `mascotas` por `cliente_id`
- `clientes` se relaciona con `citas` por `cliente_id`
- `mascotas` se relaciona con `citas` por `mascota_id`
- `servicios` se relaciona con `citas` por `servicio_id`
- `servicios_adicionales` se relaciona con `citas` mediante `cita_servicios_adicionales`
- `historial_citas` conserva referencias a `cita_id`, `cliente_id` y `mascota_id`
- `tarifas_servicio` depende de `servicios`
- `tarifas_servicio_adicional` depende de `servicios_adicionales`

## 7.5 Observación importante sobre el archivo SQL

Existe un archivo:

- `Archivos requeridos/SweetyPuppiesBD.sql`

pero su estructura visible contiene tablas legacy con nombres y columnas antiguas. Por tanto, **no debe asumirse como única fuente de verdad del modelo actual**. La fuente más confiable del estado actual es la suma de:

- consultas SQL reales del backend
- tablas accedidas por repositorios activos

## 7.6 Cómo se conecta la lógica con la base de datos

La lógica del backend no llama la base directamente desde las rutas. El acceso se da desde repositorios como:

- `auth/infrastructure/repositories/PostgresAuthRepository.js`
- `clientAppointments/infrastructure/repositories/PostgresClientAppointmentsRepository.js`
- `adminReports/infrastructure/repositories/PostgresAdminReportsRepository.js`

---

## 8. Librerías y herramientas

## 8.1 Dependencias principales del backend

- **express**: servidor HTTP y routing
- **cors**: control de solicitudes cross-origin
- **dotenv**: carga de variables de entorno
- **jsonwebtoken**: emisión y validación de JWT
- **bcrypt**: hash y verificación de contraseñas
- **nodemailer**: envío de correos
- **pg**: cliente PostgreSQL
- **@supabase/supabase-js**: acceso a Supabase Storage
- **multer**: manejo de carga de archivos, especialmente imágenes
- **pdfkit**: generación de reportes PDF
- **swagger-jsdoc**: generación del spec OpenAPI
- **swagger-ui-express**: interfaz visual de Swagger

### Dependencias instaladas pero sin uso evidente en el código activo

- **mysql2**
- **postgres**

Estas dependencias aparecen en `package.json`, pero no muestran uso directo en el código fuente activo revisado.

## 8.2 Dependencias principales del frontend

- **vue**: framework frontend principal
- **vite**: bundler y servidor de desarrollo
- **typescript**: tipado estático del frontend
- **vue-tsc**: validación de tipos sobre archivos `.vue`
- **eslint** y `eslint-plugin-vue`: lint del frontend
- **@vitejs/plugin-vue**: integración Vue + Vite
- **npm-run-all2**: coordinación de tareas de build

## 8.3 Herramientas de desarrollo y documentación

- **Swagger/OpenAPI**: documentación de endpoints
- **PDFKit**: salida PDF de reportes
- **Supabase Storage**: almacenamiento de imágenes

---

## 9. Frontend

## 9.1 Organización de la vista cliente

La vista cliente usa:

- `ClientSiteHeader.vue`
- páginas dedicadas por funcionalidad
- control de sesión con `session.ts`
- consumo HTTP por `api.ts`

Las rutas del cliente incluyen:

- `/cliente`
- `/cliente/perfil`
- `/cliente/mascotas`
- `/cliente/citas/nueva`
- `/cliente/historial`

## 9.2 Organización de la vista administrador

La vista admin usa:

- `AdminSiteHeader.vue`
- páginas dedicadas por módulo
- un shell visual con sidebar colapsable

Las rutas del admin incluyen:

- `/admin`
- `/admin/agenda`
- `/admin/gestion`
- `/admin/clientes`
- `/admin/mascotas`
- `/admin/servicios`
- `/admin/contenido`
- `/admin/reportes`

## 9.3 Consumo de endpoints

Cada pantalla consume endpoints REST del backend con helpers centralizados. La sesión se toma desde `sessionStorage`, y cada request privada agrega el header `Authorization: Bearer <token>`.

## 9.4 Manejo de rutas y navegación

Actualmente:

- no se usa `vue-router`
- la navegación se resuelve manualmente en `App.vue`
- el sistema hace validación por rol antes de decidir qué pantalla mostrar

## 9.5 Lógica visual general

La interfaz actual utiliza:

- tonos pastel
- morados y turquesas de marca
- tarjetas suaves
- sidebar lateral en admin y cliente
- diseño orientado a usabilidad y lectura no técnica

---

## 10. Reportes

## 10.1 Cómo se calculan ingresos

Los ingresos se calculan desde:

- `historial_citas`

Esto garantiza que solo entren citas ya realizadas, no solicitudes pendientes o en atención.

## 10.2 Cómo se filtran por fecha

El módulo acepta filtros por:

- día
- semana
- mes
- rango personalizado

La lógica está centralizada en:

- `adminReports/domain/services/reportFilters.js`

## 10.3 Cómo se generan PDFs

Los PDFs se generan usando:

- `adminReports/infrastructure/services/SimplePdfReportService.js`

La librería usada es:

- `pdfkit`

El PDF incluye:

- encabezado institucional
- tipo de reporte
- período consultado
- fecha de generación
- resumen y detalle

## 10.4 Qué datos se toman como base

Para reportes se usan principalmente:

- `historial_citas`
- `cita_servicios_adicionales`
- `servicios_adicionales`

Así se obtienen:

- total ingresado
- ingresos por adicionales
- cantidad de citas realizadas
- resumen financiero 30/70
- tendencias por volumen o ingreso

---

## 11. Preguntas técnicas frecuentes

### ¿Por qué se usó arquitectura hexagonal?

Porque el sistema mezcla reglas de negocio importantes con integraciones de base de datos, correo, archivos y frontend. La arquitectura hexagonal permite aislar esas reglas para que el software sea más mantenible y fácil de ampliar.

### ¿Por qué no se usó una arquitectura MVC simple?

Un MVC clásico tiende a concentrar demasiada lógica en controllers y modelos activos. En un sistema con agenda, reportes, correo, seguridad y catálogos, eso habría aumentado el acoplamiento. La arquitectura hexagonal facilita separar decisiones de negocio de Express y SQL.

### ¿Cómo funciona JWT?

Cuando el usuario inicia sesión correctamente, el backend genera un token firmado que contiene su identidad y rol. Ese token se envía en cada petición protegida. El middleware lo valida antes de permitir acceso a la ruta.

### ¿Cómo funciona bcrypt?

La contraseña no se guarda en texto plano. Se transforma en un hash seguro con bcrypt. En login, el sistema compara la contraseña ingresada contra el hash almacenado.

### ¿Cómo se envían correos?

El sistema usa Nodemailer con configuración SMTP/Gmail o un modo remoto configurable. También contempla un fallback local de desarrollo para registrar códigos o eventos si no hay canal externo disponible.

### ¿Cómo se calcula el precio de una cita?

Primero se toma el servicio principal. Luego se consulta la tarifa base según tamaño y tipo de pelaje. Después se suman adicionales y, si aplica, recargos por nudos o comportamiento. El módulo de servicios centraliza esta definición.

### ¿Cómo se evita el cruce de citas?

La disponibilidad se calcula con:

- horarios del negocio
- duración estimada del servicio
- bloqueos de agenda
- citas existentes que ya ocupan el mismo rango

Si hay solapamiento, el horario no se ofrece al cliente.

### ¿Cómo se separa la lógica de negocio?

La ruta Express no decide precios ni estados ni validaciones profundas. Solo delega. El caso de uso coordina la operación y los repositorios ejecutan el acceso a datos. Esta es la separación clave del patrón hexagonal.

### ¿Cómo se conectan frontend, backend y base de datos?

El frontend llama endpoints REST del backend. El backend valida autenticación y ejecuta casos de uso. Los repositorios consultan PostgreSQL/Supabase. El resultado vuelve al frontend en formato JSON.

### ¿Qué significa que sea un prototipo en entorno controlado?

Significa que el sistema es funcional y sólido para demostración, validación académica y pruebas del negocio, pero aún conserva decisiones típicas de un entorno no productivo, por ejemplo:

- ausencia de una suite automatizada de pruebas
- fallbacks sensibles en configuración
- documentación de despliegue no formalizada
- compatibilidad legacy todavía presente

### ¿Qué módulos están listos y qué podría mejorarse?

Módulos con implementación funcional relevante:

- Auth
- Cliente Mascotas
- Cliente Citas
- Cliente Historial
- Admin Agenda
- Admin Gestión de Citas
- Admin Clientes
- Admin Mascotas
- Admin Servicios
- Contenido
- Reportes

Mejoras técnicas recomendadas:

- eliminar completamente compatibilidad legacy restante
- formalizar `.env.example`
- retirar secretos por defecto del código
- incorporar pruebas automatizadas
- revisar y actualizar la documentación de base de datos
- considerar migración futura a `vue-router` y un store dedicado si el frontend sigue creciendo

---

## 12. Cierre

Sweety Puppies es un sistema web modular orientado a operación real de una peluquería canina. La arquitectura actual ya separa en gran medida la lógica del negocio de la infraestructura, lo que facilita su mantenimiento y lo vuelve defendible en una sustentación técnica. Aun así, conserva algunos rastros de compatibilidad heredada y algunos puntos sensibles de configuración que conviene presentar como oportunidades de mejora, no como fallas del modelo arquitectónico.

---

## 13. Actualizacion del modulo de reportes

El modulo de reportes evoluciono desde reportes aislados hacia un **dashboard administrativo dinamico**. Esta mejora mantiene la arquitectura hexagonal y concentra los calculos de negocio en backend, de modo que el frontend solo consume estructuras ya agregadas.

### 13.1 Endpoint agregado del dashboard

El backend expone un endpoint agregado para el tablero administrativo:

- `GET /api/reportes/dashboard`

Tambien expone un endpoint auxiliar para poblar filtros:

- `GET /api/reportes/catalogos`

### 13.2 Filtros disponibles

El dashboard puede consultarse por:

- dia
- semana
- mes
- rango personalizado
- servicio principal
- servicio adicional
- estado de cita
- cliente
- mascota

### 13.3 KPIs principales

El dashboard calcula y muestra:

- ingresos totales del periodo
- ganancia neta estimada del 70%
- reserva / insumos del 30%
- total de citas realizadas
- total de citas canceladas
- total de citas pendientes
- total de citas confirmadas
- servicio principal mas solicitado
- servicio adicional mas vendido
- promedio de ingreso por cita
- dia con mayor cantidad de citas
- dia con mayor ingreso

### 13.4 Regla de calculo de ingresos

La regla sigue siendo estricta:

- los ingresos solo se calculan desde `historial_citas`
- por tanto, solo se cuentan citas ya realizadas o finalizadas
- nunca se usan citas pendientes, canceladas o en atencion para ingresos reales

La distribucion financiera se calcula asi:

- `totalIngresado = 100%`
- `reservaInsumos = 30%`
- `gananciaNeta = 70%`

Este calculo se implementa en:

- `adminReports/domain/services/reportFinance.js`

### 13.5 Libreria de graficos utilizada

Para el dashboard se utilizo:

- `apexcharts`
- `vue3-apexcharts`

Esto permite una visualizacion moderna, responsive y mantenible en Vue 3 sin trasladar calculos de negocio al frontend.

### 13.6 Graficas del dashboard

Las visualizaciones implementadas incluyen:

- grafico de barras para ingresos por periodo
- grafico de linea para evolucion de ingresos
- grafico de dona para distribucion de servicios principales
- grafico de dona para distribucion de servicios adicionales
- grafico de barras para citas por estado
- grafico comparativo entre ingresos por servicios principales y adicionales
- grafico de ranking de servicios mas vendidos
- grafico de tendencia mensual con ingresos y volumen

### 13.7 Tablas dinamicas

El modulo ahora incluye tablas dinamicas de:

- citas realizadas
- servicios principales mas solicitados
- servicios adicionales mas vendidos
- resumen de ingresos
- citas por estado

Estas tablas reaccionan a los mismos filtros del dashboard y permiten ordenamiento desde frontend sin recalcular negocio.

### 13.8 Exportacion PDF

La exportacion se mantiene con:

- `PDFKit`

El PDF ahora puede representar tambien el estado del dashboard respetando los filtros activos, incluyendo:

- rango de fechas
- total ingresado
- ganancia neta 70%
- reserva / insumos 30%
- citas realizadas
- servicios y adicionales destacados
- observaciones del periodo
