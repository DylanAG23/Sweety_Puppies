document.addEventListener('DOMContentLoaded', function() {
  // Cursor personalizado
  initCustomCursor();
  
  // ScrollyTelling - Animaciones al hacer scroll
  initScrollReveal();
  
  // Botón volver arriba
  initBackToTopButton();
  
  // Formulario mejorado
  initEnhancedForm();
});

// Función para el cursor personalizado
function initCustomCursor() {
  const cursor = document.getElementById('cursor-tijeras');
  if (!cursor) return;

  document.addEventListener('mousemove', function (e) {
      const posX = e.clientX;
      const posY = e.clientY;
      cursor.style.left = `${posX}px`;
      cursor.style.top = `${posY}px`;
  });

  document.addEventListener('mouseout', function (e) {
      if (e.relatedTarget === null) {
          cursor.style.opacity = '0';
      }
  });

  document.addEventListener('mouseover', function () {
      cursor.style.opacity = '1';
  });

  // Efecto especial en enlaces
  const links = document.querySelectorAll('a, button');
  links.forEach(link => {
      link.addEventListener('mouseover', function() {
          cursor.style.transform = 'scale(1.5)'; // Cambia el tamaño del cursor
          cursor.style.borderColor = '#e95adb'; // Cambia el color del borde si lo tienes
      });
      
      link.addEventListener('mouseout', function() {
          cursor.style.transform = 'scale(1)'; // Regresa al tamaño original
          cursor.style.borderColor = ''; // Restablece el color del borde
      });
  });
}

// Función para animaciones al hacer scroll
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right');
  
  function checkReveal() {
      const windowHeight = window.innerHeight;
      const revealPoint = 150;

      revealElements.forEach(element => {
          const revealTop = element.getBoundingClientRect().top;
          if (revealTop < windowHeight - revealPoint) {
              element.classList.add('active');
          }
      });
  }
  
  checkReveal();
  window.addEventListener('scroll', checkReveal);
}

// Función para el botón de volver arriba
function initBackToTopButton() {
  const btnVolverArriba = document.getElementById('btn-volver-arriba');
  
  if (!btnVolverArriba) return;
  
  window.addEventListener('scroll', function() {
      if (window.scrollY > 300) {
          btnVolverArriba.classList.add('visible');
      } else {
          btnVolverArriba.classList.remove('visible');
      }
  });
  
  btnVolverArriba.addEventListener('click', function() {
      window.scrollTo({
          top: 0,
          behavior: 'smooth'
      });
  });
}

// Función para mejorar el formulario
function initEnhancedForm() {
  const form = document.getElementById('clienteForm');
  
  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
      if (input.value !== '') {
          input.parentElement.classList.add('has-value');
      }
  });
  
  inputs.forEach(input => {
      if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
          input.addEventListener('input', function() {
              if (this.value !== '') {
                  this.parentElement.classList.add('has-value');
              } else {
                  this.parentElement.classList.remove('has-value');
              }
          });
          
          input.addEventListener('focus', function() {
              this.parentElement.classList.add('focused');
          });
          
          input.addEventListener('blur', function() {
              this.parentElement.classList.remove('focused');
              if (this.hasAttribute('required') && !this.value) {
                  this.parentElement.classList.add('error');
                  const errorMessage = this.parentElement.querySelector('.form-error');
                  if (errorMessage) {
                      errorMessage.style.display = 'block';
                  }
              } else {
                  this.parentElement.classList.remove('error');
                  const errorMessage = this.parentElement.querySelector('.form-error');
                  if (errorMessage) {
                      errorMessage.style.display = 'none';
                  }
              }
          });
      }
      
      if (input.tagName === 'SELECT') {
          input.addEventListener('change', function() {
              if (this.value !== '') {
                  this.parentElement.classList.add('has-value');
              } else {
                  this.parentElement.classList.remove('has-value');
              }
          });
          
          input.addEventListener('focus', function() {
              this.parentElement.classList.add('focused');
          });
          
          input.addEventListener('blur', function() {
              this.parentElement.classList.remove('focused');
          });
      }
  });
  
  form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      let isValid = true;
      const formData = new FormData(form);
      
      inputs.forEach(input => {
          if (input.hasAttribute('required') && !input.value) {
              isValid = false;
              input.parentElement.classList.add('error');
              const errorMessage = input.parentElement.querySelector('.form-error');
              if (errorMessage) {
                  errorMessage.style.display = 'block';
              }
          } else {
              input.parentElement.classList.remove('error');
              const errorMessage = input.parentElement.querySelector('.form-error');
              if (errorMessage) {
                  errorMessage.style.display = 'none';
              }
          }
      });
      
      if (isValid) {
          const submitButton = form.querySelector('button[type="submit"]');
          const originalText = submitButton.innerHTML;
          submitButton.innerHTML = '¡Enviado!';
          submitButton.classList.add('sent');
          
          // Enviar los datos al servidor
          fetch('http://localhost:3000/api/clientes', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(Object.fromEntries(formData))
          })
          .then(response => response.json())
          .then(data => {
              console.log('Cliente agregado:', data);
              alert('¡Gracias por tu mensaje! Te contactaremos pronto.');
              form.reset();
              submitButton.innerHTML = originalText;
              submitButton.classList.remove('sent');
              inputs.forEach(input => {
                  input.parentElement.classList.remove('has-value');
                  input.parentElement.classList.remove('error');
              });
          })
          .catch(error => {
              console.error('Error al agregar cliente:', error);
              alert('Error al agregar cliente');
              submitButton.innerHTML = originalText;
              submitButton.classList.remove('sent');
          });
      }
  });
}
