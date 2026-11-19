# Ejecucion temporal o en maquina virtual

Se sirve Vue compilado y Express desde **un mismo origen y proceso**. No requiere separar hosts, cambiar las rutas `/api` ni configurar direcciones de API en el navegador. Los archivos de esta carpeta son configuracion operativa; los documentos academicos se gestionan en el repositorio de la universidad.

## Preparar la entrega

Con Node.js 22 LTS y las dependencias instaladas, ejecutar desde la raiz:

```text
npm ci
npm ci --prefix SwettyPuppies_Frontend
npm run release
```

El comando compila y crea una carpeta nueva dentro de `release/`. Incluye backend, frontend compilado, lockfile y manifiesto SHA-256. Excluye `.env`, datos reales, respaldos, pruebas, Git y `node_modules`. No elimina entregas anteriores ni publica nada. Copiar **esa carpeta**, no toda la carpeta de trabajo, al destino. Nunca instalar dependencias de Windows y copiarlas a Linux: el destino ejecuta `npm ci --omit=dev`.

## Variables y arranque en cualquier servidor Node

Copiar `deploy/production.env.example` a un archivo privado fuera del repositorio y completar los valores. Deben usarse secretos nuevos de produccion: el `.env` de desarrollo estuvo versionado y no debe reutilizarse en una publicacion. No poner secretos en variables `VITE_*`. Produccion no carga automaticamente el `.env` de desarrollo.

Usar la ruta real del archivo privado en estos comandos, ejecutados desde la entrega:

```text
npm ci --omit=dev
node --env-file=/ruta/privada/sweety.env scripts/check-production.cjs
node --env-file=/ruta/privada/sweety.env scripts/start-production.cjs
```

La comprobacion inicial valida variables y frontend, **sin conectar ni enviar correos**. El arranque exige secretos distintos de al menos 32 caracteres, URL publica HTTPS (HTTP solo para pruebas en loopback), configuracion de Storage y un proveedor real de correo. `MAIL_MODE=local` no permite registro/recuperacion por correo en produccion y se rechaza. `smtp` conserva la compatibilidad existente y significa Gmail, no un servidor SMTP arbitrario. La entrega de mensajes debe verificarse en la red elegida.

En una plataforma que inyecte variables: `NODE_ENV=production`, comando de inicio `npm run start:production`; build desde el repositorio `npm ci && npm ci --prefix SwettyPuppies_Frontend --include=dev && npm run build`. Seleccionar Node 22, un unico proceso/instancia, configurar las variables en el panel y usar el puerto `PORT` que asigne la plataforma. El limitador de intentos usa memoria local; no distribuir esta configuracion en varias replicas.

## Contenedor

```text
docker build -t sweety-puppies:demo .
docker run --name sweety-puppies --init --restart unless-stopped --env-file /ruta/privada/sweety.env -p 127.0.0.1:3000:3000 sweety-puppies:demo
```

El archivo de entorno debe usar `PORT=3000` y `HOST=0.0.0.0` para ese mapeo. El puerto del host queda en loopback, detras del proxy HTTPS elegido. La imagen usa un usuario sin privilegios, omite dependencias de desarrollo y no incluye secretos. La imagen contiene archivos de la aplicacion, no PostgreSQL ni datos de Supabase. Docker debe estar disponible en el destino; no se instala por este proyecto.

## Maquina virtual

En Linux con systemd, adaptar `deploy/sweety-puppies.service` a la ruta de Node, al usuario de servicio `sweety` y a `/opt/sweety-puppies`. El administrador debe crear ese usuario, dar acceso de lectura a la entrega y proteger `/etc/sweety-puppies.env`. No ejecutar el proceso como root. El archivo es una plantilla y no se ha instalado en el servidor de la empresa.

El proxy HTTPS debe reenviar al puerto local y reemplazar correctamente `X-Forwarded-For`, `X-Forwarded-Host` y `X-Forwarded-Proto`. Ajustar `TRUST_PROXY` a la topologia real; para un proxy en el mismo host y Node enlazado a loopback puede usarse `loopback`. No activar confianza global ni suponer un numero de saltos si existen caminos directos al backend. En contenedores, la IP del proxy puede ser una subred de Docker y requiere la configuracion correspondiente.

## Verificar el destino

```text
npm run smoke:deployment -- https://dominio-elegido
```

Solo hace GET: comprueba servidor, BD, rutas SPA, politica, proteccion de rutas privadas y que no se publiquen archivos internos. El codigo de salida es 1 si falla algo; no considera el despliegue correcto cuando Supabase no responde.

- `/api/health`: proceso disponible; se usa como liveness del contenedor.
- `/api/ready`: 200 si PostgreSQL responde; 503 si no. No revela causas internas ni credenciales.
- Swagger usa `/api` del host actual, no localhost.

El smoke no prueba credenciales de correo, almacenamiento ni compras reales. El recorrido final de acceso, imagenes, citas y compras debe ejecutarse cuando Supabase este activo. No ejecutar migraciones ni sembrar datos automaticamente al desplegar.

## Estado de esta preparacion

Destino sin elegir: VM de la empresa o alojamiento temporal. Supabase permanece aplazado por decision del propietario. La publicacion y las pruebas en ese destino requieren decidirlo y disponer de acceso. No se ha contratado ni creado un servicio externo.

Referencias tecnicas: [Node LTS](https://nodejs.org/en/about/previous-releases), [Express detras de un proxy](https://expressjs.com/en/guide/behind-proxies/), [build por etapas de Docker](https://docs.docker.com/build/building/multi-stage/).
