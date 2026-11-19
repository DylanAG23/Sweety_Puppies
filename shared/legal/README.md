# Política y autorización de datos

Fuente: `EEE7D1FD.pdf` y `ACT-07_Politica_tratamiento_datos.docx` del ZIP suministrado por el propietario. Se preservó el contenido; el propietario confirmó los datos del negocio y la vigencia del 18 de noviembre de 2026. No se incorporaron los términos ACT-10 ni se cambiaron reglas de devoluciones.

`privacy-policy.json` es la versión del texto publicado. `sha256` identifica el título y los párrafos unidos por salto de línea, codificados en UTF-8. Al actualizar la política, conservar esta versión en el control de versiones, generar otra versión y recalcular su huella. No cambiar contenido conservando el identificador.

`GET /api/politica-datos` es público y sirve el texto completo para registro y checkout. El componente PrivacyConsent abre un diálogo accesible y deja la casilla desmarcada. No hay consentimiento de publicidad implícito.

Registro y checkout requieren `consentimiento_datos: true` y `politica_version` vigente. El servidor genera la fecha y huella; no confía en una fecha enviada por el navegador. El checkout conserva por separado la aceptación de condiciones de compra.

Registro: la evidencia queda en `codigos_verificacion.payload.consentimiento_datos`. Al verificar el correo, la misma transacción crea el usuario y vincula el registro utilizado mediante `payload.usuarioId`, retirando el hash de contraseña del payload usado. Los registros usados con evidencia son comprobantes y no se deben borrar como si fueran únicamente códigos caducados. No se agrega una tabla ni se necesita migración. Esto no incorpora un procedimiento de supresión o de retención legal: queda fuera de esta integración.

Checkout: la evidencia queda en `ordenes.observaciones`, dentro de `consentimiento.datos`. Las compras anteriores conservan su información original. Los códigos de registro anteriores sin autorización deben solicitarse de nuevo después de aceptar la política; el reenvío reemplaza el código pendiente sin bloquearse por ese mismo correo.

La verificación bloquea el código dentro de la misma transacción que crea la cuenta, consulta duplicados y marca el código como usado. Un código usado no crea otra cuenta y un reenvío invalida los códigos pendientes anteriores.

Verificación actual: 91 pruebas backend aprobadas, incluidas cuatro de consentimiento y persistencia/reenvío. ESLint completo y compilación TypeScript/Vite aprobados. Revisión visual del registro y diálogo en modo claro/oscuro, y de ambas aceptaciones en checkout. Supabase está pausado: la persistencia se verificó en PostgreSQL aislado, no mediante altas reales en la base compartida. Detalle general en `CIERRE_DESARROLLO.md`.
