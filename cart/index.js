// Modulo Carrito (Fase 2: tienda e inventario).
// Estructura preparada siguiendo el patron hexagonal del proyecto; todavia no
// tiene casos de uso ni rutas montadas. Ver cart/README.md.
//
// Al implementarlo:
// 1. casos de uso en application/useCases (sin importar express ni pg)
// 2. reglas puras en domain/services y errores en domain/errors
// 3. repositorio Postgres en infrastructure/repositories (require('../../../baseDatos'))
// 4. controlador en infrastructure/http y router en routes/
// 5. montar el router en app.js

function createCartModule() {
  const dependencies = {};

  const useCases = {};

  return {
    dependencies,
    useCases,
    controller: {}
  };
}

module.exports = { createCartModule };
