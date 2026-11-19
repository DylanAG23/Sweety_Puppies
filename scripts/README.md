# Scripts auxiliares

Esta carpeta agrupa utilidades de compilacion, entrega y operacion. Los casos de uso del negocio siguen en sus modulos.

## Estructura

- `start-production.cjs`: entrada del servidor con configuracion de produccion.
- `check-production.cjs`: valida variables y frontend compilado, sin consultar servicios externos.
- `prepare-release.cjs` y `runtime-manifest.json`: crean una entrega nueva con una lista permitida de archivos y sus huellas SHA-256.
- `smoke-deployment.cjs`: comprueba mediante GET el servidor, la BD, el frontend y las rutas protegidas del destino.

## Regla de mantenimiento

Los scripts aqui almacenados no deben sustituir modulos del sistema ni contener logica de negocio. Ver `deploy/README.md` para los comandos y el alcance de cada comprobacion.
