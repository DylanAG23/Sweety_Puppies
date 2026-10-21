// Ruta legada /api/citas: DESMONTADA en app.js (no tenia autenticacion y usaba
// el esquema antiguo). Se conserva solo como referencia; ver legacy/README.md.
// No se documenta en Swagger porque el endpoint ya no existe.
const router = require('../legacy/backend/routes/citas');

module.exports = router;
