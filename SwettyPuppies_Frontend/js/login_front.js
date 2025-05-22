// Funcionalidad del formulario de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usuarioInput = document.getElementById('usuario');
    const contrasenaInput = document.getElementById('contrasena');

    // Manejo de etiquetas flotantes
    function manejarEtiquetasFlotantes() {
        const inputs = document.querySelectorAll('.form-group input');
        
        inputs.forEach(input => {
            const formGroup = input.closest('.form-group');
            
            // Al hacer focus
            input.addEventListener('focus', function() {
                formGroup.classList.add('focused');
            });
            
            // Al perder focus
            input.addEventListener('blur', function() {
                formGroup.classList.remove('focused');
                if (this.value.trim() !== '') {
                    formGroup.classList.add('has-value');
                } else {
                    formGroup.classList.remove('has-value');
                }
            });
            
            // Verificar si ya tiene valor al cargar
            if (input.value.trim() !== '') {
                formGroup.classList.add('has-value');
            }
        });
    }

    // Mostrar toast de notificación
    function mostrarToast(mensaje, tipo = 'info') {
        const toast = document.getElementById('toast');
        const toastMensaje = document.getElementById('toast-mensaje');
        
        toastMensaje.textContent = mensaje;
        toast.className = `toast ${tipo}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Validar formulario
    function validarFormulario() {
        let esValido = true;
        const formGroups = document.querySelectorAll('.form-group');
        
        formGroups.forEach(group => {
            const input = group.querySelector('input');
            const valor = input.value.trim();
            
            // Limpiar errores previos
            group.classList.remove('error');
            
            if (valor === '') {
                group.classList.add('error');
                esValido = false;
            }
        });
        
        return esValido;
    }

    // Limpiar errores al escribir
    function limpiarErroresAlEscribir() {
        const inputs = document.querySelectorAll('.form-group input');
        
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                const formGroup = this.closest('.form-group');
                if (this.value.trim() !== '') {
                    formGroup.classList.remove('error');
                }
            });
        });
    }

    // Manejar envío del formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validarFormulario()) {
            mostrarToast('Por favor, completa todos los campos', 'error');
            return;
        }
        
        const btnEnviar = document.querySelector('.btn-enviar');
        const usuario = usuarioInput.value.trim();
        const contrasena = contrasenaInput.value.trim();
        
        // Mostrar estado de carga
        btnEnviar.classList.add('loading');
        btnEnviar.disabled = true;
        
        try {
            // Llamada al backend de Node.js
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuario: usuario,
                    contrasena: contrasena
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarToast('¡Inicio de sesión exitoso!', 'success');
                
                // Guardar token en una variable global o en memoria para la sesión
                window.userToken = data.token;
                window.userData = data.usuario;
                
                // Redirigir después de un breve delay
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1500);
                
            } else {
                mostrarToast(data.message || 'Usuario o contraseña incorrectos', 'error');
            }
            
        } catch (error) {
            console.error('Error en el login:', error);
            mostrarToast('Error de conexión. Intenta nuevamente.', 'error');
        } finally {
            // Remover estado de carga
            btnEnviar.classList.remove('loading');
            btnEnviar.disabled = false;
        }
    });

    // Manejo de tecla Enter
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.matches('.form-group input')) {
            const inputs = Array.from(document.querySelectorAll('.form-group input'));
            const currentIndex = inputs.indexOf(e.target);
            
            if (currentIndex < inputs.length - 1) {
                // Si no es el último input, ir al siguiente
                inputs[currentIndex + 1].focus();
            } else {
                // Si es el último input, enviar formulario
                loginForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Inicializar funcionalidades
    manejarEtiquetasFlotantes();
    limpiarErroresAlEscribir();
});

// Cursor personalizado (si lo usas en otras páginas)
document.addEventListener('DOMContentLoaded', function() {
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');
    
    if (cursorDot && cursorOutline) {
        document.addEventListener('mousemove', function(e) {
            const posX = e.clientX;
            const posY = e.clientY;
            
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            
            cursorOutline.style.left = `${posX}px`;
            cursorOutline.style.top = `${posY}px`;
            
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });
    }
});