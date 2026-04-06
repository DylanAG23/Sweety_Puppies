# Legacy controlado

Esta carpeta concentra compatibilidad heredada del proyecto anterior.

## Objetivo

Evitar que el codigo viejo siga mezclado con la arquitectura activa del sistema.

## Contenido actual

- `backend/routes/citas.js`
- `backend/routes/login.js`

## Regla de mantenimiento

No desarrollar logica nueva aqui.

Cada archivo presente en esta carpeta debe entenderse como compatibilidad temporal hasta que:

- exista reemplazo hexagonal equivalente
- se retiren los consumidores que aun dependan de esta compatibilidad
