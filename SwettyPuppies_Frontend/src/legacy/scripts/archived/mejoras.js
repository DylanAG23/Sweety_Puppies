document.addEventListener('DOMContentLoaded', function() {
  // ScrollyTelling - Animaciones al hacer scroll
  initScrollReveal();
  
  // Botón volver arriba
  initBackToTopButton();
  
});

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
