// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Efectos del cursor personalizado
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');

    document.addEventListener('mousemove', function(e) {
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
    });

    // Funcionalidad para las etiquetas flotantes del formulario
    const formGroups = document.querySelectorAll('.form-group');

    formGroups.forEach(group => {
        const input = group.querySelector('input, select, textarea');
        
        if (input) {
            // Verificar si el campo ya tiene valor al cargar la página
            if (input.value.trim() !== '') {
                group.classList.add('has-value');
            }
            
            // Evento focus
            input.addEventListener('focus', () => {
                group.classList.add('focused');
            });
            
            // Evento blur
            input.addEventListener('blur', () => {
                group.classList.remove('focused');
                
                if (input.value.trim() !== '') {
                    group.classList.add('has-value');
                } else {
                    group.classList.remove('has-value');
                }
            });
            
            // Evento input para validación en tiempo real
            input.addEventListener('input', () => {
                if (input.validity.valid) {
                    group.classList.remove('error');
                }
            });
        }
    });

    // Manejo del envío del formulario
    const clienteForm = document.getElementById('clienteForm');
    
    if (clienteForm) {
        clienteForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Validar formulario
            let isValid = true;
            const formInputs = clienteForm.querySelectorAll('input, select, textarea');
            
            formInputs.forEach(input => {
                const group = input.closest('.form-group');
                
                if (!input.validity.valid) {
                    group.classList.add('error');
                    isValid = false;
                } else {
                    group.classList.remove('error');
                }
            });
            
            if (!isValid) {
                return;
            }
            
            // Obtener los datos del formulario
            const formData = new FormData(clienteForm);
            const clienteData = {};
            
            formData.forEach((value, key) => {
                clienteData[key] = value;
            });
            
            // Enviar datos al servidor
            enviarDatosCliente(clienteData);
        });
    }

    // Función para enviar datos al servidor mediante fetch
    function enviarDatosCliente(clienteData) {
        // Mostrar indicador de carga
        const submitBtn = clienteForm.querySelector('.btn-enviar');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
        
        // Realizar la solicitud al servidor
        fetch('http://localhost:3000/api/clientes', {  // Ajusta esta URL a tu API backend
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            // Éxito
            submitBtn.textContent = '¡Cliente Agregado!';
            submitBtn.classList.add('sent');
            
            // Limpiar formulario
            clienteForm.reset();
            formGroups.forEach(group => {
                group.classList.remove('has-value');
            });
            
            // Mostrar mensaje de éxito
            alert('Cliente agregado correctamente');
            
            // Restaurar botón después de 2 segundos
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.classList.remove('sent');
            }, 2000);
        })
        .catch(error => {
            console.error('Error:', error);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            alert('Error al agregar el cliente. Por favor, intenta nuevamente.');
        });
    }
});