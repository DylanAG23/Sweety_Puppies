<template>
  <div class="app">
    <h1>Consulta de Mascotas</h1>

    <input
      v-model="cedula"
      placeholder="Ingrese la cédula del dueño"
      @keyup.enter="buscarMascotas"
    />
    <button @click="buscarMascotas">Buscar</button>

    <div v-if="mascotas.length">
      <h2>Mascotas registradas:</h2>
      <ul>
        <li v-for="mascota in mascotas" :key="mascota.nombre">
          {{ mascota.nombre }} ({{ mascota.especie }}) - Edad: {{ mascota.edad }}
        </li>
      </ul>
    </div>

    <p v-else-if="buscado">No se encontraron mascotas.</p>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue';

interface Mascota {
  nombre: string;
  especie: string;
  edad: number;
}

export default {
  name: 'App',
  setup() {
    const cedula = ref('');
    const mascotas = ref<Mascota[]>([]);
    const buscado = ref(false);

    const buscarMascotas = async () => {
      if (!cedula.value) return;
      try {
        const res = await fetch(`http://localhost:3000/mascotas?cedula=${cedula.value}`);
        const data = await res.json();
        mascotas.value = data;
      } catch (error) {
        console.error('Error al buscar mascotas:', error);
        mascotas.value = [];
      }
      buscado.value = true;
    };

    return {
      cedula,
      mascotas,
      buscado,
      buscarMascotas
    };
  }
};
</script>

<style scoped>
.app {
  max-width: 600px;
  margin: auto;
  padding: 2rem;
  font-family: sans-serif;
}
input {
  padding: 0.5rem;
  width: 300px;
  margin-right: 0.5rem;
}
button {
  padding: 0.5rem;
}
</style>