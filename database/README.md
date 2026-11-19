# Base de datos de desarrollo (ACT-20 / ACT-22)

Esta carpeta permite reproducir **el esquema de la aplicación** desde el respaldo suministrado `db_cluster-29-10-2026@18-46-17.backup.gz`, sin recuperar usuarios, contraseñas, correos, pedidos ni otros registros. El baseline no se ha aplicado contra Supabase. El comprobador de solo lectura sí se ejecutó tras reactivar el proyecto: 24 tablas y esquema compatible.

## Archivos y procedencia

- `001_application_baseline.sql`: DDL extraído del esquema `public` del respaldo PostgreSQL 17.6. Contiene las 24 tablas, 11 enums, secuencia de pedidos, 3 funciones, 19 triggers, restricciones, índices y RLS. El archivo incluye el SHA-256 del respaldo fuente. La secuencia empieza en 1 porque **no se restauran pedidos**.
- `extract-baseline.cjs`: extracción reproducible, mediante lista permitida de tipos de objetos; rechaza bloques con datos, roles, permisos o dependencias de esquemas ajenos. No sobrescribe una migración ya creada.
- `schema-manifest.json`: estructura esperada obtenida al aplicar el DDL en PostgreSQL aislado. No contiene datos de negocio.
- `schema-inspection.cjs` / `manage.cjs`: comparación de estructura y guardia de instalación. `check` es de solo lectura.
- `demo-catalog.json`, `demo-assets/`, `demo-catalog.cjs`: cinco ejemplos explícitamente ficticios (correa, collar, ropa, juguete e higiene), con precios, existencias, mínimos e ilustraciones SVG. Solo se cargan en PGlite; no deben mezclarse con el catálogo real.

Quedan fuera los esquemas gestionados por Supabase (`auth`, `storage`, `realtime`, etc.), roles de plataforma, ACL globales y archivos de Storage. No ejecutar el respaldo de cluster completo sobre el proyecto existente. Este baseline no es una restauración de datos ni un procedimiento de despliegue.

## Verificar la base configurada, sin modificarla

Desde la raíz del proyecto:

```powershell
node database/manage.cjs check
```

Usa la misma configuración del backend. Código de salida 0: coincide; 2: diferencias estructurales; 1: no fue posible comprobar. Informa grupos de diferencias (tablas, columnas, restricciones, índices, triggers, enums, funciones, secuencias o políticas). Nunca altera objetos para hacerlos coincidir. No imprime credenciales ni lee filas de negocio. Una diferencia de representación entre versiones de PostgreSQL también requiere revisión: no ejecutar un script de corrección automática.

## Instalar SOLO en una base nueva dedicada

Primero configurar explícitamente una conexión de desarrollo a una base vacía. No usar la conexión compartida del equipo. El SQL contiene una transacción y aborta si encuentra cualquiera de las tablas de la aplicación; no contiene DROP, TRUNCATE ni CREATE OR REPLACE.

```powershell
node database/manage.cjs apply-empty --confirm-empty
```

La opción expresa la intención de instalar una base nueva; no elimina la guardia SQL. Si existe una instalación parcial o completa, utilizar `check` y preparar una migración incremental revisada. No se registra el baseline retroactivamente ni se sustituye un esquema existente. RLS permanece habilitado, sin políticas públicas; el acceso continúa por el backend autorizado, como en el respaldo.

Este DDL prepara la estructura; no crea usuarios administrativos ni carga los horarios, tarifas o contenidos reales necesarios para operar. Para recuperación de datos del negocio se requiere un procedimiento separado y explícito. Supabase está activo y la conexión local fue verificada.

## Catálogo DEMO aislado

```powershell
node database/demo-catalog.cjs
node --test tests/database.baseline.test.js
```

El primer comando crea PGlite en memoria, aplica el baseline, carga ejemplos y muestra el resultado. Al terminar descarta la base. No importa `.env` ni ofrece una opción para conectarse a PostgreSQL/Supabase. Repetir `seedDemoCatalog(pg)` en la misma base no duplica productos ni inventario.

En un servidor de vista previa aislado se puede importar `seedDemoCatalog` y servir `assetsDirectory` bajo `/demo-catalog`; las ilustraciones están marcadas DEMO y no representan productos reales. Nunca montar esa utilidad como endpoint de la aplicación productiva.

## Verificación

Las pruebas aplican el baseline en PGlite, comprueban la estructura y RLS, verifican ausencia de registros, detectan cambios de seguridad/columnas, y aseguran que una segunda aplicación o un esquema parcial abortan sin perder datos. También comprueban que el seed es idempotente y rechaza adaptadores ajenos a PGlite. El SQL no se ha aplicado a la base compartida.

Las siguientes modificaciones de esquema deben añadirse como migraciones nuevas; no reescribir el baseline para ocultar diferencias ni usar `tests/fixtures/store-schema.sql` como migración.
