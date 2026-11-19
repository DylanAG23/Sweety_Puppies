<script setup lang="ts">
// Se muestra si no se pudo descargar el codigo de una pantalla
// (por ejemplo, sin conexion o tras publicar una version nueva).
function reload() {
  window.location.reload()
}
</script>

<template>
  <main class="page-load-error">
    <section class="sp-card page-load-error-card" role="alert">
      <h1>No pudimos abrir esta pantalla</h1>
      <p>Revisa tu conexion a internet e intenta de nuevo.</p>
      <button type="button" class="sp-btn sp-btn--primary" @click="reload">Reintentar</button>
    </section>
  </main>
</template>

<style scoped>
.page-load-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--sp-space-6);
}

.page-load-error-card {
  display: grid;
  justify-items: center;
  gap: var(--sp-space-3);
  max-width: 460px;
  text-align: center;
}

.page-load-error-card h1 {
  margin: 0;
  color: var(--sp-primary);
  font-size: var(--sp-font-h2);
}

.page-load-error-card p {
  margin: 0 0 var(--sp-space-3);
  color: var(--sp-muted);
}
</style>
