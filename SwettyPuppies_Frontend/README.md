# Sweety Puppies — Frontend

Vue 3 + Vite + TypeScript. La documentación completa del proyecto (instalación, variables, estructura) está en el [README de la raíz](../README.md).

```bash
npm install
npm run dev     # http://localhost:5173 (redirige /api a http://localhost:3000)
npm run build   # vue-tsc + vite build -> dist/ (lo sirve el backend)
npm run lint    # ESLint (corrige lo automatico)
```

- Todas las llamadas a la API pasan por `src/lib/api.ts`. El frontend no consulta Supabase.
- Diseño: tokens en `src/styles/tokens.css` y componentes `.sp-*` en `src/styles/base.css` (guía ACT-15).
- Menús: `src/lib/navigation.ts`. Las opciones de la tienda se activan con `VITE_ENABLE_STORE=true` en `.env.local`.
- `src/legacy/` y `public/legacy/` son código archivado que la SPA no usa (ver `src/legacy/README.md`).
