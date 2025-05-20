// carrusel-dinamico.js - Versión optimizada para Supabase
document.addEventListener('DOMContentLoaded', function() {
    // Elemento contenedor del carrusel
    const carruselContainer = document.getElementById('carrusel-imagenes');
    
    // Configuración del carrusel
    const carruselConfig = {
        autoplay: true,
        autoplaySpeed: 5000,
        slidesToShow: 3,
        tableName: 'imagenes',         // Tabla de Supabase con metadata de imágenes
        bucketName: 'imagenes',        // Bucket de Supabase que contiene las imágenes
        carpeta: 'uploads',            // Carpeta dentro del bucket donde están las imágenes
        categoria: 'carrusel',         // Categoría de imágenes a mostrar (opcional)
        responsive: [
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 1
                }
            },
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2
                }
            }
        ]
    };
    
    // Variables globales del carrusel
    let autoplayInterval = null;
    let currentIndex = 0;
    let carruselImagenes = [];
    
    // Configuración de Supabase
    const supabaseUrl = 'https://onyzutykzjiocjnlaqgr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ueXp1dHlremppb2NqbmxhcWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMzM5NTEsImV4cCI6MjA2MTgwOTk1MX0.lUtAdt56P_PsQ4Qo9gxSp6SSg9gvrfbSBc88sVxXk0Y';
    
    // Cargar la biblioteca de Supabase si no está disponible
    function cargarScriptSupabase() {
        return new Promise((resolve, reject) => {
            // Si ya está cargado, resolvemos inmediatamente
            if (typeof supabase !== 'undefined') {
                resolve();
                return;
            }
            
            // Si no está cargado, añadimos el script al DOM
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('No se pudo cargar la biblioteca de Supabase'));
            
            document.head.appendChild(script);
        });
    }

    /**
     * Función para inicializar el cliente de Supabase
     * @return {Object} - Cliente de Supabase
     */
    async function initSupabaseClient() {
        try {
            await cargarScriptSupabase();
            
            // Crear cliente de Supabase una vez que la biblioteca esté cargada
            return supabase.createClient(supabaseUrl, supabaseKey);
        } catch (error) {
            console.error('Error al inicializar Supabase:', error);
            return null;
        }
    }

    /**
     * SOLUCIÓN ALTERNATIVA: Cargar directamente desde Storage
     * Esta función es más directa y evita problemas con tablas de metadatos
     */
    async function cargarImagenesDesdeStorage() {
        try {
            // Mostrador de carga con animación
            mostrarCargando();
            
            // Inicializar cliente de Supabase
            const supabaseClient = await initSupabaseClient();
            
            if (!supabaseClient) {
                throw new Error('No se pudo inicializar el cliente de Supabase');
            }
            
            // Obtener lista de archivos directamente desde el bucket de storage
            const { data: files, error } = await supabaseClient
                .storage
                .from(carruselConfig.bucketName)
                .list(carruselConfig.carpeta || '', {
                    sortBy: { column: 'name', order: 'asc' }
                });
            
            // Verificar si hay error
            if (error) {
                throw new Error(`Error al listar archivos de Storage: ${error.message}`);
            }
            
            // Filtrar solo archivos de imagen
            const imageFiles = files.filter(file => 
                file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i) && !file.name.startsWith('.')
            );
            
            console.log('Archivos de imagen encontrados:', imageFiles.length);
            
            if (imageFiles && imageFiles.length > 0) {
                // Transformar los datos para el formato esperado
                carruselImagenes = imageFiles.map((file, index) => {
                    // Construir la ruta completa
                    const rutaArchivo = `${carruselConfig.carpeta ? carruselConfig.carpeta + '/' : ''}${file.name}`;
                    
                    // Obtener URL pública para la imagen
                    const { data } = supabaseClient.storage
                        .from(carruselConfig.bucketName)
                        .getPublicUrl(rutaArchivo);
                    
                    // Crear un objeto con el formato requerido
                    return {
                        id: index + 1,
                        nombre: file.name.replace(/\.(jpeg|jpg|png|gif|webp)$/i, '').replace(/_/g, ' '),
                        ruta: data.publicUrl,
                        descripcion: `Imagen ${index + 1}`,
                        categoria: carruselConfig.categoria || 'general',
                        fecha_creacion: new Date().toISOString()
                    };
                });
                
                console.log('Imágenes cargadas desde Storage:', carruselImagenes.length);
                
                // Crear elementos del carrusel
                crearElementosCarrusel(carruselImagenes);
                
                // Inicializar el carrusel
                inicializarCarrusel();
            } else {
                console.log('No se encontraron imágenes en el bucket');
                
                // Intentar cargar desde la base de datos como respaldo
                cargarImagenesDesdeBaseDatos();
            }
            
        } catch (error) {
            console.error('Error al cargar imágenes desde Storage:', error);
            
            // Intentar cargar desde la base de datos como respaldo
            cargarImagenesDesdeBaseDatos();
        }
    }

    /**
     * Función original para cargar las imágenes desde la tabla de Supabase
     */
    async function cargarImagenesDesdeBaseDatos() {
        try {
            // Mostrador de carga con animación
            mostrarCargando();
            
            // Inicializar cliente de Supabase
            const supabaseClient = await initSupabaseClient();
            
            if (!supabaseClient) {
                throw new Error('No se pudo inicializar el cliente de Supabase');
            }
            
            // Realizar la consulta a Supabase para obtener imágenes de la categoría especificada
            let query = supabaseClient
                .from(carruselConfig.tableName)
                .select('id, nombre, ruta, descripcion, categoria, fecha_creacion')
                .eq('activo', true);
                
            // Filtrar por categoría si se especificó
            if (carruselConfig.categoria) {
                query = query.eq('categoria', carruselConfig.categoria);
            }
            
            // Ejecutar la consulta
            const { data, error } = await query;
            
            // Verificar si hay error
            if (error) {
                throw new Error(`Error de Supabase: ${error.message}`);
            }
            
            // Procesamiento de datos de Supabase
            if (data && data.length > 0) {
                // Transformar datos para incluir URLs completas de Supabase Storage
                carruselImagenes = data.map(imagen => {
                    // Procesar la ruta para garantizar que se acceda correctamente
                    let rutaImagen = imagen.ruta;
                    
                    // Si la ruta no tiene una URL completa, construirla
                    if (rutaImagen && !rutaImagen.startsWith('http')) {
                        // Si la ruta ya incluye 'uploads/', usarla tal como está
                        if (!rutaImagen.includes('uploads/') && carruselConfig.carpeta) {
                            rutaImagen = `${carruselConfig.carpeta}/${rutaImagen}`;
                        }
                        
                        // Obtener URL pública para la imagen
                        const { data } = supabaseClient.storage
                            .from(carruselConfig.bucketName)
                            .getPublicUrl(rutaImagen);
                        
                        rutaImagen = data.publicUrl;
                    }
                    
                    return {
                        ...imagen,
                        ruta: rutaImagen
                    };
                });
                
                console.log('Imágenes del carrusel cargadas desde BD:', carruselImagenes.length);
                
                // Crear elementos del carrusel
                crearElementosCarrusel(carruselImagenes);
                
                // Inicializar el carrusel
                inicializarCarrusel();
            } else {
                console.log('No se encontraron imágenes activas en la BD');
                mostrarMensajeSinImagenes();
                
                // Plan B: Cargar imágenes locales si la BD falla
                setTimeout(cargarImagenesLocales, 2000);
            }
            
        } catch (error) {
            console.error('Error al cargar las imágenes desde la BD:', error);
            
            // Mostrar mensaje de error amigable
            mostrarErrorCarga(error);
            
            // Plan B: Cargar imágenes locales si Supabase falla
            setTimeout(cargarImagenesLocales, 2000);
        }
    }
    
    /**
     * Muestra un indicador de carga en el contenedor
     */
    function mostrarCargando() {
        if (!carruselContainer) return;
        
        carruselContainer.innerHTML = `
            <div class="cargando-contenedor">
                <div class="cargando-animacion"></div>
                <div>Cargando imágenes...</div>
            </div>
        `;
    }
    
    /**
     * Muestra un mensaje cuando no hay imágenes disponibles
     */
    function mostrarMensajeSinImagenes() {
        if (!carruselContainer) return;
        
        carruselContainer.innerHTML = `
            <div class="sin-imagenes">
                <div class="sin-imagenes-icono">🖼️</div>
                <div class="sin-imagenes-texto">No hay imágenes disponibles para el carrusel</div>
            </div>
        `;
    }
    
    /**
     * Muestra un mensaje de error con opción para reintentar
     * @param {Error} error - Error capturado
     */
    function mostrarErrorCarga(error) {
        if (!carruselContainer) return;
        
        carruselContainer.innerHTML = `
            <div class="error-carrusel">
                <div class="error-icono">⚠️</div>
                <p>No se pudieron cargar las imágenes del carrusel</p>
                <p class="error-detalle">Detalles: ${error.message}</p>
                <button id="btn-reintentar" class="btn-reintentar">Reintentar</button>
            </div>
        `;
        
        // Agregar evento al botón de reintentar
        document.getElementById('btn-reintentar')?.addEventListener('click', cargarImagenesDesdeStorage);
    }
    
    /**
     * Función para cargar imágenes locales como respaldo
     */
    function cargarImagenesLocales() {
        console.log('Cargando imágenes locales como respaldo para el carrusel...');
        
        // Imágenes de respaldo (ajusta las rutas según tu estructura)
        const imagenesLocales = [
            { 
                id: 1, 
                nombre: 'Mascota 1', 
                ruta: 'img/mascota1.png', 
                descripcion: 'Adorable perrito',
                categoria: 'carrusel'
            },
            { 
                id: 2, 
                nombre: 'Mascota 2', 
                ruta: 'img/mascota2.png', 
                descripcion: 'Cachorro feliz',
                categoria: 'carrusel'
            },
            { 
                id: 3, 
                nombre: 'Mascota 3', 
                ruta: 'img/mascota3.png', 
                descripcion: 'Peludo contento',
                categoria: 'carrusel'
            },
            { 
                id: 4, 
                nombre: 'Mascota 4', 
                ruta: 'img/mascota4.png', 
                descripcion: 'Hermoso canino',
                categoria: 'carrusel'
            }
        ];
        
        // Almacenar imágenes locales en la variable global
        carruselImagenes = imagenesLocales;
        
        // Crear los elementos con las imágenes locales
        crearElementosCarrusel(imagenesLocales);
        
        // Inicializar el carrusel con las imágenes locales
        inicializarCarrusel();
    }
    
    /**
     * Función para validar y normalizar URL de imagen
     * @param {string} url - URL de la imagen a validar
     * @return {string} - URL normalizada
     */
    function validarUrlImagen(url) {
        // Si no hay URL, devolver placeholder
        if (!url) return 'img/placeholder.png';
        
        // Si la URL ya está completa (http o https), devolverla tal cual
        if (url.startsWith('http')) return url;
        
        // Para otras rutas relativas, devolver tal cual
        return url;
    }
    
    /**
     * Función para crear los elementos del carrusel
     * @param {Array} imagenes - Array de objetos de imagen
     */
    function crearElementosCarrusel(imagenes) {
        // Limpiar el contenedor
        if (!carruselContainer) return;
        carruselContainer.innerHTML = '';
        
        // Añadir clase wrapper al contenedor principal si no la tiene
        if (!carruselContainer.classList.contains('carrusel-container')) {
            carruselContainer.classList.add('carrusel-container');
        }
        
        // Crear el contenedor de slides
        const carruselTrack = document.createElement('div');
        carruselTrack.className = 'carrusel-track';
        
        // Crear cada slide con su imagen
        imagenes.forEach((imagen, index) => {
            // Crear el slide
            const slide = document.createElement('div');
            slide.className = 'carrusel-slide';
            
            // Crear la tarjeta para la imagen con animación
            const card = document.createElement('div');
            card.className = 'imagen-card';
            card.style.animationDelay = `${index * 0.1}s`;
            
            // Crear la imagen con URL validada
            const img = document.createElement('img');
            img.src = validarUrlImagen(imagen.ruta);
            img.alt = imagen.nombre || 'Imagen de mascota';
            img.className = 'carrusel-imagen';
            img.loading = 'lazy'; // Lazy loading para mejorar rendimiento
            
            // Agregar eventos para manejo de errores de carga de imagen
            img.onerror = function() {
                console.log(`Error al cargar imagen: ${this.src}`);
                this.onerror = null; // Prevenir recursión
                this.src = 'img/placeholder.png'; // Imagen alternativa si falla
            };
            
            // Crear los textos descriptivos
            const info = document.createElement('div');
            info.className = 'imagen-info';
            
            const titulo = document.createElement('h3');
            titulo.textContent = imagen.nombre || 'Sin título';
            
            const descripcion = document.createElement('p');
            descripcion.textContent = imagen.descripcion || '';
            
            card.appendChild(img);
            card.appendChild(info);
            
            // Añadir overlay con efecto hover
            const overlay = document.createElement('div');
            overlay.className = 'imagen-overlay';
            
            const verButton = document.createElement('button');
            verButton.className = 'btn-imagen btn-imagen-ver';
            verButton.innerHTML = '<i class="fas fa-eye">👁️</i>';
            verButton.onclick = () => verImagenCarrusel(imagen.id);
            
            overlay.appendChild(verButton);
            card.appendChild(overlay);
            
            slide.appendChild(card);
            carruselTrack.appendChild(slide);
        });
        
        // Agregar el track al contenedor
        carruselContainer.appendChild(carruselTrack);
        
        // Agregar controles de navegación
        const controlPrev = document.createElement('button');
        controlPrev.className = 'carrusel-control prev';
        controlPrev.innerHTML = '❮';
        controlPrev.setAttribute('aria-label', 'Anterior');
        
        const controlNext = document.createElement('button');
        controlNext.className = 'carrusel-control next';
        controlNext.innerHTML = '❯';
        controlNext.setAttribute('aria-label', 'Siguiente');
        
        carruselContainer.appendChild(controlPrev);
        carruselContainer.appendChild(controlNext);
        
        // Agregar indicadores
        const indicadoresContainer = document.createElement('div');
        indicadoresContainer.className = 'carrusel-indicadores';
        
        const slidesToShow = getVisibleSlideCount();
        const totalIndicadores = Math.ceil(imagenes.length / slidesToShow);
        
        for (let i = 0; i < totalIndicadores; i++) {
            const indicador = document.createElement('button');
            indicador.className = 'carrusel-indicador';
            indicador.setAttribute('aria-label', `Ir a la página ${i + 1}`);
            if (i === 0) indicador.classList.add('active');
            indicador.dataset.index = i;
            indicadoresContainer.appendChild(indicador);
        }
        
        carruselContainer.appendChild(indicadoresContainer);
    }
    
    /**
     * Función para ver imagen del carrusel en detalle
     * @param {number} id - ID de la imagen a ver
     */
    function verImagenCarrusel(id) {
        const imagen = carruselImagenes.find(img => img.id == id);
        if (!imagen) return;

        // Si existe la función del gestor de imágenes, usarla
        if (typeof verImagen === 'function') {
            verImagen(id);
            return;
        }

        // Alternativa: abrir modal propio
        // Verificar si existe el modal
        let modalVerImagen = document.getElementById('modal-ver-imagen');
        
        // Si no existe, crearlo
        if (!modalVerImagen) {
            modalVerImagen = document.createElement('div');
            modalVerImagen.id = 'modal-ver-imagen';
            modalVerImagen.className = 'modal';
            
            // Versión simplificada del modal que solo muestra la imagen
            modalVerImagen.innerHTML = `
                <div class="modal-contenido">
                    <div class="modal-cabecera">
                        <button class="cerrar-modal">&times;</button>
                    </div>
                    <div class="modal-cuerpo">
                        <img id="modal-imagen" src="" alt="${imagen.nombre || 'Imagen de carrusel'}">
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalVerImagen);
            
            // Agregar evento para cerrar el modal
            modalVerImagen.querySelector('.cerrar-modal').addEventListener('click', () => {
                modalVerImagen.classList.remove('show');
                document.body.style.overflow = '';
            });
        }

        // Actualizar la imagen en el modal
        const modalImagen = document.getElementById('modal-imagen');
        if (modalImagen) {
            modalImagen.src = validarUrlImagen(imagen.ruta);
            modalImagen.alt = imagen.nombre || 'Imagen de carrusel';
            modalImagen.onerror = function() {
                this.src = 'img/placeholder.png';
                this.onerror = null;
            };
        }

        // Mostrar modal
        modalVerImagen.classList.add('show');
        document.body.style.overflow = 'hidden'; // Evitar scroll
    }
    
    /**
     * Determina cuántos slides mostrar según el ancho de la pantalla
     * @return {number} - Número de slides a mostrar
     */
    function getVisibleSlideCount() {
        const windowWidth = window.innerWidth;
        
        // Aplicar configuración responsive
        for (const config of carruselConfig.responsive) {
            if (windowWidth <= config.breakpoint) {
                return config.settings.slidesToShow;
            }
        }
        
        // Valor por defecto
        return carruselConfig.slidesToShow;
    }
    
    /**
     * Función para inicializar el comportamiento del carrusel
     */
    function inicializarCarrusel() {
        const track = document.querySelector('.carrusel-track');
        const slides = Array.from(document.querySelectorAll('.carrusel-slide'));
        const prevButton = document.querySelector('.carrusel-control.prev');
        const nextButton = document.querySelector('.carrusel-control.next');
        const indicadores = document.querySelectorAll('.carrusel-indicador');
        
        if (!track || slides.length === 0) return;
        
        // Añadir mensaje de depuración
        console.log(`Inicializando carrusel con ${slides.length} slides`);
        
        let slidesToShow = getVisibleSlideCount();
        let slideWidth = carruselContainer.clientWidth / slidesToShow;
        
        // Configuración inicial de los slides
        posicionarSlides();
        
        /**
         * Establece el ancho y posición inicial de los slides
         */
        function posicionarSlides() {
            slidesToShow = getVisibleSlideCount();
            slideWidth = carruselContainer.clientWidth / slidesToShow;
            
            // Establecer el ancho de cada slide
            slides.forEach(slide => {
                slide.style.minWidth = `${slideWidth}px`;
            });
            
            // Posicionar en el slide actual
            moveToSlide(currentIndex);
        }
        
        /**
         * Mueve el carrusel a un slide específico
         * @param {number} index - Índice del slide a mostrar
         */
        function moveToSlide(index) {
            // Validar índice
            if (index < 0) index = 0;
            if (index > slides.length - slidesToShow) index = slides.length - slidesToShow;
            
            currentIndex = index;
            
            // Animar la transición con translateX
            track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
            track.style.transition = 'transform 0.5s ease';
            
            // Calcular el indicador activo (para páginas)
            const indicadorActivo = Math.floor(currentIndex / slidesToShow);
            
            // Actualizar indicadores
            indicadores.forEach((indicador, i) => {
                if (i === indicadorActivo) {
                    indicador.classList.add('active');
                } else {
                    indicador.classList.remove('active');
                }
            });
        }
        
        /**
         * Va al siguiente slide
         */
        function moveNext() {
            const nextIndex = currentIndex + 1;
            if (nextIndex <= slides.length - slidesToShow) {
                moveToSlide(nextIndex);
            } else {
                // Volver al principio con animación suave
                track.style.transition = 'none';
                moveToSlide(0);
                setTimeout(() => {
                    track.style.transition = 'transform 0.5s ease';
                }, 10);
            }
        }
        
        /**
         * Va al slide anterior
         */
        function movePrev() {
            const prevIndex = currentIndex - 1;
            if (prevIndex >= 0) {
                moveToSlide(prevIndex);
            } else {
                // Ir al final con animación suave
                track.style.transition = 'none';
                moveToSlide(slides.length - slidesToShow);
                setTimeout(() => {
                    track.style.transition = 'transform 0.5s ease';
                }, 10);
            }
        }
        
        // Agregar eventos a los botones
        prevButton.addEventListener('click', () => {
            movePrev();
            resetAutoplay();
        });
        
        nextButton.addEventListener('click', () => {
            moveNext();
            resetAutoplay();
        });
        
        // Agregar eventos a los indicadores
        indicadores.forEach(indicador => {
            indicador.addEventListener('click', () => {
                const targetIndex = parseInt(indicador.dataset.index) * slidesToShow;
                moveToSlide(targetIndex);
                resetAutoplay();
            });
        });
        
        // Manejar redimensionamiento de la ventana
        window.addEventListener('resize', () => {
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(() => {
                posicionarSlides();
            }, 250);
        });
        
        /**
         * Inicia la reproducción automática
         */
        function startAutoplay() {
            if (carruselConfig.autoplay) {
                autoplayInterval = setInterval(moveNext, carruselConfig.autoplaySpeed);
            }
        }
        
        /**
         * Reinicia la reproducción automática
         */
        function resetAutoplay() {
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                startAutoplay();
            }
        }
        
        // Iniciar la reproducción automática
        startAutoplay();
        
        // Detener autoplay al pasar el ratón sobre el carrusel
        carruselContainer.addEventListener('mouseenter', () => {
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                autoplayInterval = null;
            }
        });
        
        // Reanudar autoplay al quitar el ratón
        carruselContainer.addEventListener('mouseleave', startAutoplay);
        
        // Movimiento táctil para dispositivos móviles
        let touchStartX = 0;
        let touchEndX = 0;
        
        carruselContainer.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            
            // Detener la animación durante el toque
            track.style.transition = 'none';
        }, { passive: true });
        
        carruselContainer.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            
            // Restaurar la animación
            track.style.transition = 'transform 0.5s ease';
            
            // Gestionar el deslizamiento
            handleSwipe();
            
            // Resetear el autoplay
            resetAutoplay();
        }, { passive: true });
        
        /**
         * Procesa el gesto de deslizamiento
         */
        function handleSwipe() {
            const swipeThreshold = 50;
            if (touchEndX < touchStartX - swipeThreshold) {
                // Deslizar a la izquierda (siguiente)
                moveNext();
            } else if (touchEndX > touchStartX + swipeThreshold) {
                // Deslizar a la derecha (anterior)
                movePrev();
            }
        }
        
        // Mejorar accesibilidad con eventos de teclado
        carruselContainer.setAttribute('tabindex', '0');
        carruselContainer.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                movePrev();
                resetAutoplay();
            } else if (e.key === 'ArrowRight') {
                moveNext();
                resetAutoplay();
            }
        });
    }
    
    // Iniciar carga de imágenes directamente desde Storage
    cargarImagenesDesdeStorage();
});