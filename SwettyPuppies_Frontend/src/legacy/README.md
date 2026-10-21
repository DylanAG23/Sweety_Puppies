# Legacy frontend (archivado)

Esta carpeta agrupa plantillas y scripts del frontend anterior a la SPA de Vue.

## Estado (octubre de 2026)

**Nada de esta carpeta se usa en la aplicación.** Ninguna pagina, componente ni ruta importa `html/` ni `scripts/`, y ESLint la ignora. El login actual es `src/pages/AuthPage.vue`.

- `html/active/login.html` y `html/archived/*`: plantillas antiguas.
- `scripts/archived/*`: scripts antiguos. `carrusel-dinamico.js` consultaba Supabase directamente desde el navegador, algo que el proyecto ya no permite.
- Tambien estan sin uso `src/components/LegacyPageView.vue`, `src/lib/legacyPage.ts` y `public/legacy/`.

Se propone borrar todo esto (ver `AUDITORIA_PRE_FASE2.md`). Se conserva hasta que el equipo lo confirme.

Los estilos de `src/styles/legacy/` si siguen en uso parcial (sobre todo `login.css`).
