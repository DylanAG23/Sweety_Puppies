// carrusel-dinamico.js - Versión optimizada y mejorada visualmente
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
    
    // Inyectar estilos mejorados para el carrusel
    inyectarEstilosCarrusel();
    
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
     * Inyecta estilos mejorados para el carrusel
     */
    function inyectarEstilosCarrusel() {
        if (document.getElementById('estilos-carrusel-dinamico')) return;
        
        const estilos = document.createElement('style');
        estilos.id = 'estilos-carrusel-dinamico';
        estilos.textContent = `
            /* Estilos mejorados para el carrusel */
            .carrusel-container {
                position: relative;
                margin: 2rem auto;
                overflow: hidden;
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
                background: linear-gradient(145deg, #f9f9f9, #ffffff);
            }
            
            .carrusel-track {
                display: flex;
                transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
            }
            
            .carrusel-slide {
                padding: 15px;
                box-sizing: border-box;
                flex-shrink: 0;
            }
            
            .imagen-card {
                position: relative;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
                transform: translateY(0);
                transition: all 0.4s ease-out;
                height: 100%;
                background-color: #fff;
                animation: fadeInUp 0.7s ease-out forwards;
                opacity: 0;
            }
            
            .imagen-card:hover {
                transform: translateY(-10px);
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.12);
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .carrusel-imagen {
                width: 100%;
                height: 250px;
                object-fit: cover;
                display: block;
                transition: transform 0.5s ease;
            }
            
            .imagen-card:hover .carrusel-imagen {
                transform: scale(1.05);
            }
            
            .imagen-info {
                padding: 15px;
                color: #333;
            }
            
            .imagen-info h3 {
                margin: 0 0 8px;
                font-size: 1.2rem;
                font-weight: 600;
                color: #222;
            }
            
            .imagen-info p {
                margin: 0;
                font-size: 0.9rem;
                color: #666;
                line-height: 1.5;
            }
            
            .imagen-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .imagen-card:hover .imagen-overlay {
                opacity: 1;
            }
            
            .btn-imagen {
                background: rgba(255, 255, 255, 0.9);
                color: #333;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                font-size: 1.2rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                transform: scale(0.9);
                outline: none;
            }
            
            .btn-imagen:hover {
                background: #fff;
                transform: scale(1);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            }
            
            /* Icono de ver mejorado */
            .icono-ver {
                display: inline-block;
                width: 24px;
                height: 24px;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'%3E%3C/path%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3C/svg%3E");
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
            
            .carrusel-control {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(255, 255, 255, 0.8);
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #555;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
                z-index: 1;
                transition: all 0.3s ease;
                opacity: 0.7;
            }
            
            .carrusel-control:hover {
                background: white;
                color: #222;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                opacity: 1;
            }
            
            .carrusel-control.prev {
                left: 10px;
            }
            
            .carrusel-control.next {
                right: 10px;
            }
            
            .carrusel-indicadores {
                display: flex;
                justify-content: center;
                margin-top: 20px;
                padding: 10px 0;
            }
            
            .carrusel-indicador {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #ddd;
                margin: 0 5px;
                padding: 0;
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .carrusel-indicador.active {
                background: #666;
                transform: scale(1.3);
            }
            
            .cargando-contenedor {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: #666;
                font-family: Arial, sans-serif;
            }
            
            .cargando-animacion {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .sin-imagenes {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: #666;
                text-align: center;
                padding: 20px;
            }
            
            .sin-imagenes-icono {
                font-size: 3rem;
                margin-bottom: 15px;
                opacity: 0.5;
            }
            
            .error-carrusel {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                text-align: center;
                padding: 20px;
                color: #666;
            }
            
            .error-icono {
                font-size: 2rem;
                color: #e74c3c;
                margin-bottom: 15px;
            }
            
            .error-detalle {
                font-size: 0.8rem;
                color: #999;
                margin-bottom: 15px;
                max-width: 80%;
                overflow-wrap: break-word;
            }
            
            .btn-reintentar {
                background-color: #3498db;
                color: white;
                border: none;
                padding: 8px 16px;
                font-size: 0.9rem;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.3s ease;
            }
            
            .btn-reintentar:hover {
                background-color: #2980b9;
            }
            
            /* Modal de imagen mejorado */
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.8);
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .modal.show {
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .modal-contenido {
                background-color: white;
                max-width: 80%;
                max-height: 80%;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
                position: relative;
                animation: scaleIn 0.3s ease;
            }
            
            @keyframes scaleIn {
                from { transform: scale(0.9); }
                to { transform: scale(1); }
            }
            
            .modal-cabecera {
                padding: 15px;
                display: flex;
                justify-content: flex-end;
                background-color: #f8f8f8;
                border-bottom: 1px solid #eee;
            }
            
            .cerrar-modal {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #666;
                transition: color 0.2s ease;
            }
            
            .cerrar-modal:hover {
                color: #e74c3c;
            }
            
            .modal-cuerpo {
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            #modal-imagen {
                max-width: 100%;
                max-height: 70vh;
                object-fit: contain;
                display: block;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(estilos);
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
                <div class="sin-imagenes-icono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
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
                <div class="error-icono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
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
            
// Añadir overlay con efecto hover y botón mejorado
            const overlay = document.createElement('div');
            overlay.className = 'imagen-overlay';
            
            const verButton = document.createElement('button');
            verButton.className = 'btn-imagen btn-imagen-ver';
            verButton.setAttribute('aria-label', 'Ver imagen');
            
            // Crear el icono para el botón
            const iconoVer = document.createElement('span');
            iconoVer.className = 'icono-ver';
            verButton.appendChild(iconoVer);
            
            // Añadir evento para abrir imagen en modal al hacer clic
            verButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                abrirModalImagen(imagen.ruta, imagen.nombre);
            });
            
            // Agregar botón al overlay
            overlay.appendChild(verButton);
            
            // Añadir overlay a la card
            card.appendChild(overlay);
            
            // Añadir card al slide y slide al track
            slide.appendChild(card);
            carruselTrack.appendChild(slide);
        });
        
        // Añadir el track al contenedor
        carruselContainer.appendChild(carruselTrack);
        
        // Añadir controles de navegación
        agregarControlesCarrusel();
        
        // Añadir indicadores de posición
        agregarIndicadoresCarrusel(imagenes.length);
        
        // Crear el modal para visualizar imágenes si no existe
        crearModalImagen();
    }

    /**
     * Crea los controles de navegación del carrusel
     */
    function agregarControlesCarrusel() {
        // Crear botón anterior
        const prevButton = document.createElement('button');
        prevButton.className = 'carrusel-control prev';
        prevButton.innerHTML = '&#10094;';
        prevButton.setAttribute('aria-label', 'Anterior');
        prevButton.addEventListener('click', () => navegarCarrusel('prev'));
        
        // Crear botón siguiente
        const nextButton = document.createElement('button');
        nextButton.className = 'carrusel-control next';
        nextButton.innerHTML = '&#10095;';
        nextButton.setAttribute('aria-label', 'Siguiente');
        nextButton.addEventListener('click', () => navegarCarrusel('next'));
        
        // Añadir botones al contenedor
        carruselContainer.appendChild(prevButton);
        carruselContainer.appendChild(nextButton);
    }

    /**
     * Crea los indicadores de posición del carrusel
     * @param {number} cantidad - Cantidad de slides
     */
    function agregarIndicadoresCarrusel(cantidad) {
        // Crear contenedor de indicadores
        const indicadoresContainer = document.createElement('div');
        indicadoresContainer.className = 'carrusel-indicadores';
        
        // Crear un indicador por cada slide
        for (let i = 0; i < cantidad; i++) {
            const indicador = document.createElement('button');
            indicador.className = `carrusel-indicador ${i === 0 ? 'active' : ''}`;
            indicador.setAttribute('aria-label', `Ir a imagen ${i + 1}`);
            indicador.setAttribute('data-index', i);
            
            // Añadir evento para navegar al hacer clic
            indicador.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                moverCarruselA(index);
            });
            
            indicadoresContainer.appendChild(indicador);
        }
        
        // Añadir contenedor de indicadores
        carruselContainer.appendChild(indicadoresContainer);
    }

    /**
     * Crea el modal para visualizar imágenes a tamaño completo
     */
    function crearModalImagen() {
        // Verificar si ya existe el modal
        if (document.getElementById('modal-imagen-container')) return;
        
        // Crear la estructura del modal
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modal-imagen-container';
        modalContainer.className = 'modal';
        
        // Contenido del modal
        modalContainer.innerHTML = `
            <div class="modal-contenido">
                <div class="modal-cabecera">
                    <button class="cerrar-modal" aria-label="Cerrar">&times;</button>
                </div>
                <div class="modal-cuerpo">
                    <img id="modal-imagen" src="" alt="Imagen ampliada">
                </div>
            </div>
        `;
        
        // Añadir eventos para cerrar el modal
        modalContainer.addEventListener('click', function(e) {
            if (e.target === modalContainer) {
                cerrarModalImagen();
            }
        });
        
        // Evento para cerrar con botón
        modalContainer.querySelector('.cerrar-modal').addEventListener('click', cerrarModalImagen);
        
        // Añadir evento para cerrar con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalContainer.classList.contains('show')) {
                cerrarModalImagen();
            }
        });
        
        // Añadir modal al body
        document.body.appendChild(modalContainer);
    }

    /**
     * Abre el modal con la imagen seleccionada
     * @param {string} src - URL de la imagen
     * @param {string} titulo - Título de la imagen para el alt
     */
    function abrirModalImagen(src, titulo) {
        const modal = document.getElementById('modal-imagen-container');
        const imagen = document.getElementById('modal-imagen');
        
        if (modal && imagen) {
            // Establecer la imagen
            imagen.src = validarUrlImagen(src);
            imagen.alt = titulo || 'Imagen ampliada';
            
            // Mostrar el modal con animación
            modal.classList.add('show');
            
            // Desactivar scroll del body
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Cierra el modal de imagen
     */
    function cerrarModalImagen() {
        const modal = document.getElementById('modal-imagen-container');
        
        if (modal) {
            // Ocultar modal con animación
            modal.classList.remove('show');
            
            // Restaurar scroll
            document.body.style.overflow = '';
        }
    }

    /**
     * Función para inicializar el carrusel
     */
    function inicializarCarrusel() {
        // Si no hay imágenes o no hay contenedor, salir
        if (!carruselImagenes.length || !carruselContainer) return;
        
        // Configurar ancho de slides según responsive
        ajustarAnchoSlides();
        
        // Añadir evento resize para responsividad
        window.addEventListener('resize', ajustarAnchoSlides);
        
        // Iniciar autoplay si está habilitado
        if (carruselConfig.autoplay) {
            iniciarAutoplay();
        }
        
        // Añadir eventos de pausa/resume del autoplay al hover
        carruselContainer.addEventListener('mouseenter', pausarAutoplay);
        carruselContainer.addEventListener('mouseleave', iniciarAutoplay);
        
        // Mostrar primera slide
        moverCarruselA(0);
    }

    /**
     * Ajusta el ancho de los slides según configuración responsive
     */
    function ajustarAnchoSlides() {
        const track = carruselContainer.querySelector('.carrusel-track');
        if (!track) return;
        
        // Obtener el ancho del contenedor
        const containerWidth = carruselContainer.clientWidth;
        
        // Determinar cuántos slides mostrar según breakpoints
        let slidesToShow = carruselConfig.slidesToShow;
        
        // Verificar responsive settings
        if (carruselConfig.responsive) {
            // Ordenar breakpoints de mayor a menor
            const breakpoints = carruselConfig.responsive.sort((a, b) => b.breakpoint - a.breakpoint);
            
            // Encontrar el primer breakpoint que aplica
            for (const bp of breakpoints) {
                if (containerWidth <= bp.breakpoint && bp.settings.slidesToShow) {
                    slidesToShow = bp.settings.slidesToShow;
                    break;
                }
            }
        }
        
        // Calcular ancho de cada slide
        const slideWidth = `${100 / slidesToShow}%`;
        
        // Aplicar ancho a todos los slides
        const slides = track.querySelectorAll('.carrusel-slide');
        slides.forEach(slide => {
            slide.style.width = slideWidth;
            slide.style.flex = `0 0 ${slideWidth}`;
        });
    }

    /**
     * Inicia el autoplay del carrusel
     */
    function iniciarAutoplay() {
        // Limpiar intervalo existente si hay uno
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
        }
        
        // Crear nuevo intervalo solo si autoplay está activo
        if (carruselConfig.autoplay) {
            autoplayInterval = setInterval(() => {
                navegarCarrusel('next');
            }, carruselConfig.autoplaySpeed);
        }
    }

    /**
     * Pausa el autoplay del carrusel
     */
    function pausarAutoplay() {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
            autoplayInterval = null;
        }
    }

    /**
     * Navega a la siguiente o anterior slide
     * @param {string} direccion - 'next' o 'prev'
     */
    function navegarCarrusel(direccion) {
        if (!carruselImagenes.length) return;
        
        // Calcular nuevo índice
        let newIndex = currentIndex;
        
        if (direccion === 'next') {
            // Avanzar al siguiente, volviendo al inicio si es necesario
            newIndex = (currentIndex + 1) % carruselImagenes.length;
        } else if (direccion === 'prev') {
            // Retroceder al anterior, yendo al final si es necesario
            newIndex = (currentIndex - 1 + carruselImagenes.length) % carruselImagenes.length;
        }
        
        // Mover a la nueva posición
        moverCarruselA(newIndex);
    }

    /**
     * Mueve el carrusel a una posición específica
     * @param {number} index - Índice de la slide a mostrar
     */
    function moverCarruselA(index) {
        // Validar índice
        if (index < 0 || index >= carruselImagenes.length) return;
        
        // Actualizar índice actual
        currentIndex = index;
        
        // Obtener el track
        const track = carruselContainer.querySelector('.carrusel-track');
        if (!track) return;
        
        // Calcular desplazamiento
        const desplazamiento = -index * 100 / carruselConfig.slidesToShow;
        
        // Aplicar transformación con animación suave
        track.style.transform = `translateX(${desplazamiento}%)`;
        
        // Actualizar indicadores activos
        actualizarIndicadoresActivos();
    }

    /**
     * Actualiza los indicadores activos del carrusel
     */
    function actualizarIndicadoresActivos() {
        // Obtener todos los indicadores
        const indicadores = carruselContainer.querySelectorAll('.carrusel-indicador');
        
        // Quitar clase activa de todos
        indicadores.forEach(indicador => {
            indicador.classList.remove('active');
        });
        
        // Añadir clase activa al indicador actual
        const indicadorActual = carruselContainer.querySelector(`.carrusel-indicador[data-index="${currentIndex}"]`);
        if (indicadorActual) {
            indicadorActual.classList.add('active');
        }
    }

    // Iniciar carga de imágenes al cargar la página
    cargarImagenesDesdeStorage();
});