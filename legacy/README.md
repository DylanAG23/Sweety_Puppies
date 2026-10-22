# Legacy backend (desmontado)

Rutas heredadas del primer sistema (esquema con IDs enteros: `citas.id_cita`, `mascotas.cedula_cliente`…).

## Estado (octubre de 2026)

| Archivo | Montado | Motivo |
|---|---|---|
| `backend/routes/citas.js` | **No** (antes en `/api/citas`) | No pedía autenticación y permitía leer, crear, editar y borrar citas. Además consultaba columnas que ya no existen. |
| `backend/routes/login.js` | No | Reemplazado por el módulo `auth` (`/api/auth`, `/api/login`). |

`routes/citas.js` y `routes/login.js` solo re-exportan estos archivos y tampoco se montan.

Se propone borrar esta carpeta, `routes/citas.js` y `routes/login.js` (ver `AUDITORIA_PRE_FASE2.md`). No desarrollar lógica nueva aquí.
