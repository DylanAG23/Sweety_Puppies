<template>
  <main class="not-found">
    <div class="not-found-card">
      <h1>Ruta no encontrada</h1>
      <p>La vista que buscas no existe en este momento.</p>
      <a href="/login">Volver al acceso</a>
    </div>
  </main>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #fff8fc 0%, #ffe9f6 45%, #f6f3ff 100%);
}

.not-found-card {
  max-width: 420px;
  padding: 32px;
  border-radius: 28px;
  text-align: center;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 60px rgba(196, 82, 154, 0.12);
}

.not-found-card h1 {
  margin: 0 0 12px;
  color: #8e0f71;
}

.not-found-card p {
  margin: 0 0 16px;
  color: #69465f;
}

.not-found-card a {
  color: #9c0076;
  font-weight: 700;
}
</style>
