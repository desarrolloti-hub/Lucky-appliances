// carousel-autonomous.js - Carrusel automático que usa la clase CarouselManager
(function() {
    'use strict';
    
    // =============================================
    // CONFIGURACIÓN
    // =============================================
    
    // Evitar doble ejecución
    if (window.CarouselLoaded) {
        console.log('🔄 Carrusel ya cargado, omitiendo...');
        return;
    }
    window.CarouselLoaded = true;
    
    // Configuración por defecto
    const DEFAULT_CONFIG = {
        containerId: 'carousel-container', // ID del contenedor
        autoplay: true,                    // Reproducción automática
        interval: 5000,                    // Intervalo en ms (5 segundos)
        showDots: true,                    // Mostrar indicadores
        showArrows: true,                  // Mostrar flechas de navegación
        pauseOnHover: true,                // Pausar al pasar el mouse
        animationDuration: 500,            // Duración de animación en ms
        height: '500px',                   // Altura del carrusel
        mobileHeight: '300px'              // Altura en móviles
    };
    
    // =============================================
    // CARGAR DEPENDENCIAS
    // =============================================
    
    async function loadDependencies() {
        try {
            // Cargar CarouselManager desde el módulo existente
            const { CarouselManager } = await import('/classes/carousel.js');
            window.CarouselManagerClass = CarouselManager;
            return true;
        } catch (error) {
            console.error('❌ Error cargando CarouselManager:', error);
            return false;
        }
    }
    
    // =============================================
    // CLASE CARRUSEL AUTÓNOMO
    // =============================================
    
    class AutonomousCarousel {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.currentIndex = 0;
            this.items = [];
            this.isPlaying = true;
            this.intervalId = null;
            this.container = null;
            this.isInitialized = false;
            this.carouselManager = null;
        }
        
        // Inicializar carrusel
        async init() {
            if (this.isInitialized) {
                console.log('⚠️ Carrusel ya inicializado');
                return;
            }
            
            try {
                // Buscar contenedor
                this.container = document.getElementById(this.config.containerId);
                
                if (!this.container) {
                    console.error(`❌ No se encontró el contenedor con ID: ${this.config.containerId}`);
                    return;
                }
                
                console.log(`🎨 Inicializando carrusel en: ${this.config.containerId}`);
                
                // Cargar dependencias
                const dependenciesLoaded = await loadDependencies();
                if (!dependenciesLoaded) {
                    this.showErrorState('No se pudo cargar CarouselManager');
                    return;
                }
                
                // Crear instancia de CarouselManager
                this.carouselManager = new window.CarouselManagerClass();
                
                // Cargar items
                await this.loadItems();
                
                if (this.items.length === 0) {
                    this.showEmptyState();
                    return;
                }
                
                // Renderizar carrusel
                this.render();
                
                // Iniciar autoplay si está habilitado
                if (this.config.autoplay && this.items.length > 1) {
                    this.startAutoplay();
                }
                
                // Agregar eventos
                this.setupEventListeners();
                
                // Aplicar estilos responsivos
                this.applyResponsiveStyles();
                
                this.isInitialized = true;
                console.log('✅ Carrusel inicializado correctamente');
                
            } catch (error) {
                console.error('❌ Error inicializando carrusel:', error);
                this.showErrorState('Error al inicializar el carrusel');
            }
        }
        
        // Cargar items usando CarouselManager
        async loadItems() {
            try {
                if (!this.carouselManager) {
                    throw new Error('CarouselManager no está disponible');
                }
                
                // Usar el método loadItems del CarouselManager
                const carouselItems = await this.carouselManager.loadItems();
                
                // Convertir a formato para el carrusel
                this.items = carouselItems.map(item => ({
                    id: item.id,
                    nombre: item.nombre || '',
                    descripcion: item.descripcion || '',
                    image: item.getImageUrl ? item.getImageUrl() : (item.image || ''),
                    createdAt: item.createdAt
                }));
                
                console.log(`📷 Cargadas ${this.items.length} imágenes desde Firebase`);
                
            } catch (error) {
                console.error('❌ Error cargando imágenes:', error);
                this.items = [];
                throw error;
            }
        }
        
        // Renderizar carrusel
        render() {
            // Limpiar contenedor
            this.container.innerHTML = '';
            
            // Agregar estilos
            this.addStyles();
            
            // Crear estructura del carrusel
            const carouselHTML = `
                <div class="autonomous-carousel">
                    <div class="carousel-wrapper">
                        <!-- Botón anterior -->
                        ${this.config.showArrows ? `
                            <button class="carousel-btn carousel-prev" aria-label="Imagen anterior">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Contenedor de slides -->
                        <div class="carousel-slides">
                            ${this.items.map((item, index) => this.createSlideHTML(item, index)).join('')}
                        </div>
                        
                        <!-- Botón siguiente -->
                        ${this.config.showArrows ? `
                            <button class="carousel-btn carousel-next" aria-label="Siguiente imagen">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Overlay para texto -->
                        <div class="carousel-overlay">
                            <div class="carousel-content">
                                <h3 class="carousel-title" id="carousel-current-title"></h3>
                                <p class="carousel-description" id="carousel-current-description"></p>
                            </div>
                        </div>
                        
                        <!-- Indicadores (dots) -->
                        ${this.config.showDots && this.items.length > 1 ? `
                            <div class="carousel-dots">
                                ${this.items.map((_, index) => `
                                    <button class="carousel-dot ${index === 0 ? 'active' : ''}" 
                                            data-index="${index}"
                                            aria-label="Ir a imagen ${index + 1}">
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <!-- Contador -->
                        <div class="carousel-counter">
                            <span class="carousel-current">1</span> / <span class="carousel-total">${this.items.length}</span>
                        </div>
                    </div>
                </div>
            `;
            
            this.container.innerHTML = carouselHTML;
            
            // Actualizar contenido inicial
            this.updateCurrentSlide();
            this.updateCounter();
        }
        
        // Crear HTML para un slide
        createSlideHTML(item, index) {
            const imageUrl = item.image || 'https://via.placeholder.com/1200x500/0a2540/ffffff?text=No+Image';
            const isActive = index === 0 ? 'active' : '';
            
            return `
                <div class="carousel-slide ${isActive}" data-index="${index}" data-id="${item.id}">
                    <div class="slide-image" style="background-image: url('${imageUrl}')">
                        <img src="${imageUrl}" 
                             alt="${item.nombre}" 
                             loading="lazy"
                             onerror="this.style.display='none'; this.parentElement.classList.add('image-error')">
                    </div>
                </div>
            `;
        }
        
        // Agregar estilos CSS
        addStyles() {
            const styleId = 'autonomous-carousel-styles';
            if (document.getElementById(styleId)) return;
            
            const styles = document.createElement('style');
            styles.id = styleId;
            styles.textContent = /*css*/ `
                /* ====== ESTILOS BASE DEL CARRUSEL ====== */
                .autonomous-carousel {
                    width: 100%;
                    height: ${this.config.height};
                    position: relative;
                    overflow: hidden;
                    border-radius: var(--border-radius-lg, 12px);
                    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15));
                    margin: 2rem 0;
                    isolation: isolate;
                }
                
                .carousel-wrapper {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                
                /* Slides */
                .carousel-slides {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                
                .carousel-slide {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    transition: opacity ${this.config.animationDuration}ms ease-in-out;
                    z-index: 1;
                }
                
                .carousel-slide.active {
                    opacity: 1;
                    z-index: 2;
                }
                
                /* Imágenes */
                .slide-image {
                    width: 100%;
                    height: 100%;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    position: relative;
                }
                
                .slide-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                    display: block;
                }
                
                .slide-image.image-error {
                    background-color: var(--primary, #0a2540);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--white, #ffffff);
                    font-size: 1.2rem;
                }
                
                .slide-image.image-error::after {
                    content: "Imagen no disponible";
                    font-family: 'Poppins', sans-serif;
                }
                
                /* Botones de navegación */
                .carousel-btn {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 50px;
                    height: 50px;
                    background-color: rgba(var(--primary-rgb, 10, 37, 64), 0.7);
                    color: var(--white, #ffffff);
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(5px);
                }
                
                .carousel-btn:hover {
                    background-color: rgba(var(--primary-rgb, 10, 37, 64), 0.9);
                    transform: translateY(-50%) scale(1.1);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                
                .carousel-btn:active {
                    transform: translateY(-50%) scale(0.95);
                }
                
                .carousel-prev {
                    left: 20px;
                }
                
                .carousel-next {
                    right: 20px;
                }
                
                .carousel-btn i {
                    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
                }
                
                /* Overlay de texto */
                .carousel-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, 
                        rgba(0,0,0,0.8) 0%, 
                        rgba(0,0,0,0.5) 50%, 
                        rgba(0,0,0,0) 100%);
                    padding: 2rem;
                    z-index: 5;
                    transition: all 0.3s ease;
                }
                
                .dark-mode .carousel-overlay {
                    background: linear-gradient(to top, 
                        rgba(0,0,0,0.9) 0%, 
                        rgba(0,0,0,0.6) 50%, 
                        rgba(0,0,0,0.2) 100%);
                }
                
                .carousel-content {
                    max-width: 800px;
                    margin: 0 auto;
                    color: var(--white, #ffffff);
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }
                
                .carousel-title {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    line-height: 1.2;
                    opacity: 0.95;
                }
                
                .carousel-description {
                    font-size: 1.1rem;
                    line-height: 1.5;
                    opacity: 0.85;
                    margin: 0;
                }
                
                /* Indicadores (dots) */
                .carousel-dots {
                    position: absolute;
                    bottom: 80px;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    z-index: 10;
                    padding: 10px;
                }
                
                .carousel-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid var(--white, #ffffff);
                    background-color: transparent;
                    cursor: pointer;
                    padding: 0;
                    transition: all 0.3s ease;
                }
                
                .carousel-dot:hover {
                    background-color: rgba(255,255,255,0.5);
                    transform: scale(1.2);
                }
                
                .carousel-dot.active {
                    background-color: var(--accent, #f5d742);
                    border-color: var(--accent, #f5d742);
                    transform: scale(1.2);
                }
                
                /* Contador */
                .carousel-counter {
                    position: absolute;
                    bottom: 25px;
                    right: 25px;
                    background-color: rgba(0,0,0,0.6);
                    color: var(--white, #ffffff);
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    z-index: 10;
                    backdrop-filter: blur(5px);
                    border: 1px solid rgba(255,255,255,0.2);
                }
                
                .carousel-current {
                    color: var(--accent, #f5d742);
                    font-weight: 600;
                }
                
                .carousel-total {
                    opacity: 0.8;
                }
                
                /* Estado vacío */
                .carousel-empty {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--light, #f8f9fa);
                    color: var(--text-light, #6c757d);
                    border-radius: var(--border-radius-lg, 12px);
                    padding: 2rem;
                    text-align: center;
                }
                
                .carousel-empty i {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    color: var(--gray, #e9ecef);
                }
                
                .carousel-empty p {
                    font-size: 1.2rem;
                    margin-bottom: 0.5rem;
                }
                
                .carousel-empty small {
                    font-size: 0.9rem;
                    opacity: 0.7;
                }
                
                /* Estado de error */
                .carousel-error {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(var(--danger-rgb, 220, 53, 69), 0.1);
                    color: var(--danger, #dc3545);
                    border: 2px dashed var(--danger, #dc3545);
                    border-radius: var(--border-radius-lg, 12px);
                    padding: 2rem;
                    text-align: center;
                }
                
                .carousel-error i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .carousel-error p {
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                }
                
                .carousel-error small {
                    font-size: 0.9rem;
                    opacity: 0.7;
                }
                
                /* Controles de autoplay */
                .carousel-controls {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    z-index: 10;
                    display: flex;
                    gap: 10px;
                }
                
                .carousel-play-btn {
                    width: 40px;
                    height: 40px;
                    background-color: rgba(255,255,255,0.2);
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    color: var(--white, #ffffff);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(5px);
                }
                
                .carousel-play-btn:hover {
                    background-color: rgba(255,255,255,0.3);
                    transform: scale(1.1);
                }
                
                /* ====== MODO OSCURO ====== */
                .dark-mode .autonomous-carousel {
                    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.4));
                }
                
                .dark-mode .carousel-empty {
                    background-color: var(--light, #2d3748);
                    color: var(--text-light, #a0aec0);
                }
                
                .dark-mode .carousel-empty i {
                    color: var(--gray, #4a5568);
                }
                
                .dark-mode .carousel-error {
                    background-color: rgba(229, 62, 62, 0.1);
                    color: var(--danger, #e53e3e);
                    border-color: var(--danger, #e53e3e);
                }
                
                /* ====== RESPONSIVE ====== */
                @media (max-width: 992px) {
                    .autonomous-carousel {
                        height: 400px;
                    }
                    
                    .carousel-title {
                        font-size: 1.8rem;
                    }
                    
                    .carousel-description {
                        font-size: 1rem;
                    }
                    
                    .carousel-btn {
                        width: 45px;
                        height: 45px;
                        font-size: 1.1rem;
                    }
                    
                    .carousel-dots {
                        bottom: 70px;
                    }
                }
                
                @media (max-width: 768px) {
                    .autonomous-carousel {
                        height: ${this.config.mobileHeight};
                        border-radius: var(--border-radius, 8px);
                        margin: 1.5rem 0;
                    }
                    
                    .carousel-title {
                        font-size: 1.5rem;
                    }
                    
                    .carousel-description {
                        font-size: 0.95rem;
                    }
                    
                    .carousel-overlay {
                        padding: 1.5rem;
                    }
                    
                    .carousel-btn {
                        width: 40px;
                        height: 40px;
                        font-size: 1rem;
                    }
                    
                    .carousel-prev {
                        left: 15px;
                    }
                    
                    .carousel-next {
                        right: 15px;
                    }
                    
                    .carousel-dots {
                        bottom: 60px;
                    }
                    
                    .carousel-counter {
                        bottom: 20px;
                        right: 20px;
                        padding: 5px 10px;
                        font-size: 0.85rem;
                    }
                }
                
                @media (max-width: 576px) {
                    .autonomous-carousel {
                        height: 280px;
                        margin: 1rem 0;
                    }
                    
                    .carousel-title {
                        font-size: 1.3rem;
                        margin-bottom: 0.3rem;
                    }
                    
                    .carousel-description {
                        font-size: 0.9rem;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    
                    .carousel-overlay {
                        padding: 1rem;
                    }
                    
                    .carousel-btn {
                        width: 35px;
                        height: 35px;
                        font-size: 0.9rem;
                    }
                    
                    .carousel-dots {
                        bottom: 50px;
                    }
                    
                    .carousel-dot {
                        width: 10px;
                        height: 10px;
                    }
                    
                    .carousel-counter {
                        bottom: 15px;
                        right: 15px;
                        font-size: 0.8rem;
                    }
                }
                
                @media (max-width: 400px) {
                    .autonomous-carousel {
                        height: 250px;
                    }
                    
                    .carousel-title {
                        font-size: 1.2rem;
                    }
                    
                    .carousel-description {
                        font-size: 0.85rem;
                        -webkit-line-clamp: 2;
                    }
                    
                    .carousel-overlay {
                        padding: 0.8rem;
                    }
                    
                    .carousel-btn {
                        width: 30px;
                        height: 30px;
                        font-size: 0.8rem;
                    }
                    
                    .carousel-btn:hover {
                        transform: translateY(-50%) scale(1.05);
                    }
                    
                    .carousel-dots {
                        bottom: 45px;
                    }
                }
                
                /* Animaciones */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .autonomous-carousel {
                    animation: fadeIn 0.5s ease-out;
                }
            `;
            
            document.head.appendChild(styles);
        }
        
        // Aplicar estilos responsivos
        applyResponsiveStyles() {
            const updateHeight = () => {
                const carousel = this.container.querySelector('.autonomous-carousel');
                if (!carousel) return;
                
                if (window.innerWidth <= 768) {
                    carousel.style.height = this.config.mobileHeight;
                } else {
                    carousel.style.height = this.config.height;
                }
            };
            
            updateHeight();
            window.addEventListener('resize', updateHeight);
        }
        
        // Configurar event listeners
        setupEventListeners() {
            // Botones de navegación
            const prevBtn = this.container.querySelector('.carousel-prev');
            const nextBtn = this.container.querySelector('.carousel-next');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => this.prevSlide());
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextSlide());
            }
            
            // Indicadores (dots)
            const dots = this.container.querySelectorAll('.carousel-dot');
            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.goToSlide(index);
                });
            });
            
            // Pausar al pasar el mouse
            if (this.config.pauseOnHover) {
                const carousel = this.container.querySelector('.autonomous-carousel');
                if (carousel) {
                    carousel.addEventListener('mouseenter', () => this.pauseAutoplay());
                    carousel.addEventListener('mouseleave', () => this.resumeAutoplay());
                }
            }
            
            // Teclado
            document.addEventListener('keydown', (e) => {
                if (!this.container.contains(document.activeElement)) return;
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.prevSlide();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextSlide();
                        break;
                    case ' ':
                        e.preventDefault();
                        this.toggleAutoplay();
                        break;
                }
            });
            
            // Eventos táctiles para móviles
            this.setupTouchEvents();
        }
        
        // Configurar eventos táctiles
        setupTouchEvents() {
            let touchStartX = 0;
            let touchEndX = 0;
            const minSwipeDistance = 50;
            
            const carousel = this.container.querySelector('.autonomous-carousel');
            if (!carousel) return;
            
            carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                this.pauseAutoplay();
            }, { passive: true });
            
            carousel.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe(touchStartX, touchEndX, minSwipeDistance);
                
                // Reanudar autoplay después de un tiempo
                setTimeout(() => {
                    if (this.config.autoplay) {
                        this.resumeAutoplay();
                    }
                }, 1000);
            }, { passive: true });
        }
        
        // Manejar gestos de deslizar
        handleSwipe(startX, endX, minDistance) {
            const distance = startX - endX;
            
            if (Math.abs(distance) < minDistance) return;
            
            if (distance > 0) {
                // Deslizó hacia la izquierda (siguiente)
                this.nextSlide();
            } else {
                // Deslizó hacia la derecha (anterior)
                this.prevSlide();
            }
        }
        
        // =============================================
        // FUNCIONES DE NAVEGACIÓN
        // =============================================
        
        // Ir a slide anterior
        prevSlide() {
            this.goToSlide(this.currentIndex - 1);
        }
        
        // Ir a slide siguiente
        nextSlide() {
            this.goToSlide(this.currentIndex + 1);
        }
        
        // Ir a slide específico
        goToSlide(index) {
            if (this.items.length <= 1) return;
            
            // Calcular índice válido
            const totalSlides = this.items.length;
            const newIndex = (index + totalSlides) % totalSlides;
            
            // Actualizar slides
            const slides = this.container.querySelectorAll('.carousel-slide');
            const dots = this.container.querySelectorAll('.carousel-dot');
            
            // Quitar clase activa del slide actual
            slides[this.currentIndex]?.classList.remove('active');
            dots[this.currentIndex]?.classList.remove('active');
            
            // Agregar clase activa al nuevo slide
            this.currentIndex = newIndex;
            slides[this.currentIndex]?.classList.add('active');
            dots[this.currentIndex]?.classList.add('active');
            
            // Actualizar contenido
            this.updateCurrentSlide();
            this.updateCounter();
            
            // Reiniciar autoplay
            this.restartAutoplay();
        }
        
        // Actualizar contenido del slide actual
        updateCurrentSlide() {
            if (this.items.length === 0) return;
            
            const currentItem = this.items[this.currentIndex];
            const titleElement = this.container.querySelector('#carousel-current-title');
            const descElement = this.container.querySelector('#carousel-current-description');
            
            if (titleElement) {
                titleElement.textContent = currentItem.nombre;
            }
            
            if (descElement) {
                descElement.textContent = currentItem.descripcion || '';
            }
        }
        
        // Actualizar contador
        updateCounter() {
            const currentElement = this.container.querySelector('.carousel-current');
            const totalElement = this.container.querySelector('.carousel-total');
            
            if (currentElement) {
                currentElement.textContent = this.currentIndex + 1;
            }
            
            if (totalElement) {
                totalElement.textContent = this.items.length;
            }
        }
        
        // =============================================
        // AUTOPLAY
        // =============================================
        
        // Iniciar autoplay
        startAutoplay() {
            if (this.items.length <= 1 || !this.config.autoplay) return;
            
            this.stopAutoplay();
            this.isPlaying = true;
            
            this.intervalId = setInterval(() => {
                this.nextSlide();
            }, this.config.interval);
        }
        
        // Detener autoplay
        stopAutoplay() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.isPlaying = false;
        }
        
        // Pausar autoplay
        pauseAutoplay() {
            if (this.isPlaying) {
                this.stopAutoplay();
            }
        }
        
        // Reanudar autoplay
        resumeAutoplay() {
            if (this.config.autoplay && !this.isPlaying) {
                this.startAutoplay();
            }
        }
        
        // Reiniciar autoplay
        restartAutoplay() {
            if (this.config.autoplay) {
                this.stopAutoplay();
                this.startAutoplay();
            }
        }
        
        // Alternar autoplay
        toggleAutoplay() {
            if (this.isPlaying) {
                this.stopAutoplay();
            } else {
                this.startAutoplay();
            }
        }
        
        // =============================================
        // ESTADOS
        // =============================================
        
        // Mostrar estado vacío
        showEmptyState() {
            this.container.innerHTML = `
                <div class="carousel-empty">
                    <i class="fas fa-images"></i>
                    <p>No hay imágenes en el carrusel</p>
                    <small>Agrega imágenes desde el panel de administración</small>
                </div>
            `;
        }
        
        // Mostrar estado de error
        showErrorState(message = 'Error al cargar el carrusel') {
            this.container.innerHTML = `
                <div class="carousel-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <small>Intenta recargar la página</small>
                </div>
            `;
        }
        
        // =============================================
        // API PÚBLICA
        // =============================================
        
        // Actualizar carrusel (recargar imágenes)
        async refresh() {
            try {
                await this.loadItems();
                this.render();
                this.updateCurrentSlide();
                this.updateCounter();
                
                if (this.config.autoplay && this.items.length > 1) {
                    this.startAutoplay();
                }
                
                console.log('🔄 Carrusel actualizado');
                return true;
            } catch (error) {
                console.error('❌ Error actualizando carrusel:', error);
                return false;
            }
        }
        
        // Destruir carrusel (limpiar recursos)
        destroy() {
            this.stopAutoplay();
            
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            // Remover estilos
            const styles = document.getElementById('autonomous-carousel-styles');
            if (styles) {
                styles.remove();
            }
            
            this.isInitialized = false;
            this.carouselManager = null;
            console.log('🗑️ Carrusel destruido');
        }
    }
    
    // =============================================
    // INICIALIZACIÓN AUTOMÁTICA
    // =============================================
    
    // Inicializar automáticamente cuando el DOM esté listo
    async function initAutonomousCarousel() {
        // Buscar todos los contenedores con data-carousel
        const carouselContainers = document.querySelectorAll('[data-carousel]');
        
        for (const container of carouselContainers) {
            const config = {
                containerId: container.id,
                autoplay: container.dataset.autoplay !== 'false',
                interval: parseInt(container.dataset.interval) || DEFAULT_CONFIG.interval,
                showDots: container.dataset.dots !== 'false',
                showArrows: container.dataset.arrows !== 'false',
                pauseOnHover: container.dataset.pauseOnHover !== 'false',
                height: container.dataset.height || DEFAULT_CONFIG.height,
                mobileHeight: container.dataset.mobileHeight || DEFAULT_CONFIG.mobileHeight
            };
            
            const carousel = new AutonomousCarousel(config);
            await carousel.init();
            
            // Guardar referencia
            container._carouselInstance = carousel;
        }
    }
    
    // Esperar a que el DOM esté listo y cargar dependencias
    async function initialize() {
        try {
            // Cargar dependencias primero
            const loaded = await loadDependencies();
            if (!loaded) {
                console.error('❌ No se pudieron cargar las dependencias del carrusel');
                return;
            }
            
            // Inicializar carruseles
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initAutonomousCarousel);
            } else {
                await initAutonomousCarousel();
            }
        } catch (error) {
            console.error('❌ Error inicializando carrusel autónomo:', error);
        }
    }
    
    // Iniciar
    initialize();
    
    // =============================================
    // API GLOBAL
    // =============================================
    
    // API pública para controlar carruseles desde otros scripts
    window.AutonomousCarousel = {
        // Crear un nuevo carrusel
        create: function(config) {
            const carousel = new AutonomousCarousel(config);
            return carousel;
        },
        
        // Obtener instancia de un carrusel por ID
        getInstance: function(containerId) {
            const container = document.getElementById(containerId);
            return container?._carouselInstance || null;
        },
        
        // Actualizar todos los carruseles
        refreshAll: function() {
            document.querySelectorAll('[data-carousel]').forEach(async container => {
                const instance = container._carouselInstance;
                if (instance && typeof instance.refresh === 'function') {
                    await instance.refresh();
                }
            });
        },
        
        // Configuración por defecto
        defaultConfig: DEFAULT_CONFIG
    };
    
    console.log('✅ Autonomous Carousel cargado y listo');
    
})();