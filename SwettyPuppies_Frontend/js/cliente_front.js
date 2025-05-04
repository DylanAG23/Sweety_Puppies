document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('clienteForm');
  
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
  
      const data = {
        cedula: form.cedula.value,
        nombre: form.nombre.value,
        telefono: form.telefono.value,
        direccion: form.direccion.value,
        email: form.email.value
      };
  
      try {
        const response = await fetch('http://localhost:3000/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
  
        if (response.ok) {
          alert('Cliente agregado correctamente');
          form.reset();
        } else {
          alert('Error al agregar cliente');
        }
      } catch (error) {
        console.error('Error en la solicitud:', error);
        alert('Hubo un problema al conectar con el servidor');
      }
    });
  });
  