// brand-carousel-component.js - Componente autónomo para mostrar marcas en carrusel
(function() {
    'use strict';
    
    // =============================================
    // CONFIGURACIÓN
    // =============================================
    
    // Evitar doble ejecución
    if (window.BrandCarouselLoaded) {
        console.log('🔄 Brand Carousel ya cargado, omitiendo...');
        return;
    }
    window.BrandCarouselLoaded = true;
    
    // Configuración por defecto
    const DEFAULT_CONFIG = {
        containerId: 'brand-carousel-container', // ID del contenedor
        autoplay: true,                         // Reproducción automática
        interval: 6000,                         // Intervalo en ms (6 segundos)
        showArrows: true,                       // Mostrar flechas de navegación
        pauseOnHover: true,                     // Pausar al pasar el mouse
        animationDuration: 500,                 // Duración de animación en ms
        itemsPerView: 5,                        // Marcas visibles a la vez
        mobileItemsPerView: 2,                  // Marcas visibles en móvil
        loop: true,                             // Carrusel infinito
        height: '200px',                        // Altura del carrusel
        maxBrands: 20,                          // Máximo número de marcas a mostrar
        showEmptyState: true,                   // Mostrar estado vacío
        brandDetailUrl: '/users/visitors/products/products.html' // URL base para detalles
    };
    
    // =============================================
    // CARGAR DEPENDENCIAS
    // =============================================
    
    async function loadDependencies() {
        try {
            // Cargar BrandManager desde el módulo existente
            const { BrandManager } = await import('/classes/brand.js');
            window.BrandManagerClass = BrandManager;
            return true;
        } catch (error) {
            console.error('❌ Error cargando BrandManager:', error);
            return false;
        }
    }
    
    // =============================================
    // CLASE CARRUSEL DE MARCAS
    // =============================================
    
    class BrandCarousel {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.currentIndex = 0;
            this.brands = [];
            this.isPlaying = true;
            this.intervalId = null;
            this.container = null;
            this.isInitialized = false;
            this.brandManager = null;
            this.totalSlides = 0;
            this.slidesContainer = null;
        }
        
        // Inicializar carrusel
        async init() {
            if (this.isInitialized) {
                console.log('⚠️ Brand Carousel ya inicializado');
                return;
            }
            
            try {
                // Buscar contenedor
                this.container = document.getElementById(this.config.containerId);
                
                if (!this.container) {
                    console.error(`❌ No se encontró el contenedor con ID: ${this.config.containerId}`);
                    return;
                }
                
                console.log(`🎨 Inicializando Brand Carousel en: ${this.config.containerId}`);
                
                // Guardar posición original en el DOM
                this.originalNextSibling = this.container.nextSibling;
                this.originalParent = this.container.parentNode;
                
                // Cargar dependencias
                const dependenciesLoaded = await loadDependencies();
                if (!dependenciesLoaded) {
                    this.showErrorState('No se pudo cargar BrandManager');
                    return;
                }
                
                // Crear instancia de BrandManager
                this.brandManager = new window.BrandManagerClass();
                
                // Cargar marcas
                await this.loadBrands();
                
                if (this.brands.length === 0) {
                    if (this.config.showEmptyState) {
                        this.showEmptyState();
                    }
                    return;
                }
                
                // Calcular número de slides
                this.calculateSlides();
                
                // Renderizar carrusel
                this.render();
                
                // Iniciar autoplay si está habilitado
                if (this.config.autoplay && this.brands.length > this.config.itemsPerView) {
                    this.startAutoplay();
                }
                
                // Agregar eventos
                this.setupEventListeners();
                
                // Aplicar estilos responsivos
                this.applyResponsiveStyles();
                
                this.isInitialized = true;
                console.log('✅ Brand Carousel inicializado correctamente');
                
            } catch (error) {
                console.error('❌ Error inicializando Brand Carousel:', error);
                this.showErrorState('Error al inicializar el carrusel de marcas');
            }
        }
        
        // Cargar marcas usando BrandManager
        async loadBrands() {
            try {
                if (!this.brandManager) {
                    throw new Error('BrandManager no está disponible');
                }
                
                // Usar el método loadBrands del BrandManager
                const loadedBrands = await this.brandManager.loadBrands();
                
                // Limitar número de marcas si es necesario
                const limitedBrands = loadedBrands.slice(0, this.config.maxBrands);
                
                // Convertir a formato para el carrusel
                this.brands = limitedBrands.map(brand => ({
                    id: brand.id,
                    nombre: brand.nombre || 'Sin nombre',
                    imagen: brand.getImageUrl ? brand.getImageUrl() : (brand.imagen || ''),
                    fechaCreacion: brand.fechaCreacion,
                    detailUrl: `${this.config.brandDetailUrl}?brand=${brand.id}`
                }));
                
                console.log(`🏷️ Cargadas ${this.brands.length} marcas desde Firebase`);
                
            } catch (error) {
                console.error('❌ Error cargando marcas:', error);
                this.brands = [];
                throw error;
            }
        }
        
        // Calcular número de slides necesarios
        calculateSlides() {
            if (this.brands.length <= this.config.itemsPerView) {
                this.totalSlides = 1;
            } else {
                this.totalSlides = this.brands.length - this.config.itemsPerView + 1;
                if (this.config.loop) {
                    this.totalSlides += this.config.itemsPerView;
                }
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
                <div class="brand-carousel" data-items-per-view="${this.config.itemsPerView}">
                    <div class="brand-carousel-wrapper">
                        <!-- Botón anterior -->
                        ${this.config.showArrows && this.brands.length > this.config.itemsPerView ? `
                            <button class="brand-carousel-btn brand-carousel-prev" aria-label="Marcas anteriores">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Contenedor de marcas -->
                        <div class="brand-carousel-slides">
                            ${this.createBrandsHTML()}
                        </div>
                        
                        <!-- Botón siguiente -->
                        ${this.config.showArrows && this.brands.length > this.config.itemsPerView ? `
                            <button class="brand-carousel-btn brand-carousel-next" aria-label="Siguientes marcas">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Contador (si hay más de itemsPerView) -->
                        ${this.brands.length > this.config.itemsPerView ? `
                            <div class="brand-carousel-counter">
                                <span class="brand-carousel-current">1</span> / <span class="brand-carousel-total">${this.totalSlides}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            this.container.innerHTML = carouselHTML;
            this.slidesContainer = this.container.querySelector('.brand-carousel-slides');
            
            // Actualizar contador
            this.updateCounter();
            
            // Ajustar posición inicial
            this.updateSlidePosition();
            
            // Aplicar estilos inmediatamente
            this.updateArrowsVisibility();
        }
        
        // Crear HTML para las marcas
        createBrandsHTML() {
            let brandsToShow = this.brands;
            
            // Si hay loop, duplicar marcas al principio y final
            if (this.config.loop && this.brands.length > this.config.itemsPerView) {
                const startClones = this.brands.slice(-this.config.itemsPerView);
                const endClones = this.brands.slice(0, this.config.itemsPerView);
                brandsToShow = [...startClones, ...this.brands, ...endClones];
            }
            
            return brandsToShow.map((brand, index) => {
                const imageUrl = brand.imagen || 'https://via.placeholder.com/150x150/0a2540/ffffff?text=No+Logo';
                
                return `
                    <div class="brand-carousel-item" data-id="${brand.id}" data-index="${index}">
                        <a href="${brand.detailUrl}" class="brand-carousel-link" aria-label="Ver productos de ${brand.nombre}">
                            <div class="brand-logo-container">
                                <div class="brand-logo-image">
                                    <img src="${imageUrl}" 
                                         alt="${brand.nombre} logo" 
                                         class="brand-logo"
                                         loading="lazy"
                                         onerror="this.style.display='none'; this.parentElement.classList.add('image-error')">
                                </div>
                                <div class="brand-name">${brand.nombre}</div>
                            </div>
                        </a>
                    </div>
                `;
            }).join('');
        }
        
        // Agregar estilos CSS
        addStyles() {
            const styleId = 'brand-carousel-styles';
            if (document.getElementById(styleId)) return;
            
            const styles = document.createElement('style');
            styles.id = styleId;
            styles.textContent = /*css*/ `
                /* ====== ESTILOS BASE DEL CARRUSEL DE MARCAS ====== */
                .brand-carousel {
                    width: 100%;
                    max-width: 100vw;
                    height: ${this.config.height};
                    position: relative;
                    overflow: hidden;
                    margin: 2rem 0;
                    isolation: isolate;
                    padding: 0 15px;
                    box-sizing: border-box;
                }
                
                .brand-carousel-wrapper {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                
                /* Contenedor de slides - CORREGIDO */
                .brand-carousel-slides {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    transition: transform ${this.config.animationDuration}ms ease-in-out;
                    will-change: transform;
                    gap: 20px;
                    padding: 0 20px;
                    box-sizing: border-box;
                }
                
                /* Items de marca - CORREGIDO */
                .brand-carousel-item {
                    flex: 0 0 calc((100% - (${this.config.itemsPerView} - 1) * 20px) / ${this.config.itemsPerView});
                    min-width: 0;
                    transition: transform 0.3s ease;
                    padding: 10px;
                    box-sizing: border-box;
                }
                
                .brand-carousel-link {
                    display: block;
                    text-decoration: none;
                    color: inherit;
                    height: 100%;
                }
                
                /* Contenedor del logo */
                .brand-logo-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: var(--light, #f8f9fa);
                    border-radius: var(--border-radius, 8px);
                    padding: 20px;
                    transition: all 0.3s ease;
                    border: 1px solid var(--gray, #e9ecef);
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                
                .dark-mode .brand-logo-container {
                    background: var(--light, #2d3748);
                    border-color: var(--gray, #4a5568);
                }
                
                .brand-logo-container:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15));
                    border-color: var(--accent, #f5d742);
                }
                
                .dark-mode .brand-logo-container:hover {
                    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.4));
                }
                
                /* Imagen del logo */
                .brand-logo-image {
                    width: 100px;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                    position: relative;
                }
                
                .brand-logo {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    object-position: center;
                    filter: grayscale(100%) brightness(0.9);
                    transition: all 0.3s ease;
                    opacity: 0.8;
                }
                
                /* Efectos hover y click */
                .brand-logo-container:hover .brand-logo,
                .brand-carousel-item:active .brand-logo,
                .brand-carousel-item:focus-within .brand-logo {
                    filter: grayscale(0%) brightness(1);
                    opacity: 1;
                    transform: scale(1.05);
                }
                
                /* Estado de error de imagen */
                .brand-logo-image.image-error {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--gray, #e9ecef);
                    color: var(--text-light, #6c757d);
                    font-size: 0.9rem;
                    text-align: center;
                    padding: 10px;
                    border-radius: 8px;
                }
                
                .dark-mode .brand-logo-image.image-error {
                    background-color: var(--gray, #4a5568);
                    color: var(--text-light, #a0aec0);
                }
                
                .brand-logo-image.image-error::after {
                    content: "Logo no disponible";
                }
                
                /* Nombre de la marca */
                .brand-name {
                    text-align: center;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text, #333333);
                    margin-top: 10px;
                    line-height: 1.3;
                    transition: color 0.3s ease;
                    word-break: break-word;
                    max-width: 100%;
                }
                
                .dark-mode .brand-name {
                    color: var(--text, #e2e8f0);
                }
                
                .brand-logo-container:hover .brand-name {
                    color: var(--primary, #0a2540);
                }
                
                .dark-mode .brand-logo-container:hover .brand-name {
                    color: var(--accent, #f5d742);
                }
                
                /* Botones de navegación */
                .brand-carousel-btn {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 40px;
                    height: 40px;
                    background-color: var(--white, #ffffff);
                    color: var(--primary, #0a2540);
                    border: 2px solid var(--gray, #e9ecef);
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    box-shadow: var(--shadow, 0 5px 15px rgba(0,0,0,0.1));
                }
                
                .dark-mode .brand-carousel-btn {
                    background-color: var(--light, #2d3748);
                    color: var(--text, #e2e8f0);
                    border-color: var(--gray, #4a5568);
                    box-shadow: var(--shadow, 0 5px 15px rgba(0,0,0,0.3));
                }
                
                .brand-carousel-btn:hover {
                    background-color: var(--primary, #0a2540);
                    color: var(--white, #ffffff);
                    border-color: var(--primary, #0a2540);
                    transform: translateY(-50%) scale(1.1);
                }
                
                .dark-mode .brand-carousel-btn:hover {
                    background-color: var(--accent, #f5d742);
                    color: var(--primary, #0a2540);
                    border-color: var(--accent, #f5d742);
                }
                
                .brand-carousel-btn:active {
                    transform: translateY(-50%) scale(0.95);
                }
                
                .brand-carousel-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: translateY(-50%);
                }
                
                .brand-carousel-btn:disabled:hover {
                    background-color: var(--white, #ffffff);
                    color: var(--primary, #0a2540);
                    border-color: var(--gray, #e9ecef);
                    transform: translateY(-50%);
                }
                
                .dark-mode .brand-carousel-btn:disabled:hover {
                    background-color: var(--light, #2d3748);
                    color: var(--text, #e2e8f0);
                    border-color: var(--gray, #4a5568);
                }
                
                .brand-carousel-prev {
                    left: 10px;
                }
                
                .brand-carousel-next {
                    right: 10px;
                }
                
                /* Contador */
                .brand-carousel-counter {
                    position: absolute;
                    bottom: -30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: rgba(var(--primary-rgb, 10, 37, 64), 0.1);
                    color: var(--primary, #0a2540);
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    z-index: 10;
                }
                
                .dark-mode .brand-carousel-counter {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: var(--text, #e2e8f0);
                }
                
                .brand-carousel-current {
                    color: var(--accent, #f5d742);
                    font-weight: 600;
                }
                
                .brand-carousel-total {
                    opacity: 0.8;
                }
                
                /* Estado vacío */
                .brand-carousel-empty {
                    width: 100%;
                    height: ${this.config.height};
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--light, #f8f9fa);
                    color: var(--text-light, #6c757d);
                    border-radius: var(--border-radius, 8px);
                    padding: 2rem;
                    text-align: center;
                }
                
                .dark-mode .brand-carousel-empty {
                    background-color: var(--light, #2d3748);
                    color: var(--text-light, #a0aec0);
                }
                
                .brand-carousel-empty i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    color: var(--gray, #e9ecef);
                }
                
                .dark-mode .brand-carousel-empty i {
                    color: var(--gray, #4a5568);
                }
                
                .brand-carousel-empty p {
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                }
                
                /* Estado de error */
                .brand-carousel-error {
                    width: 100%;
                    height: ${this.config.height};
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(var(--danger-rgb, 220, 53, 69), 0.1);
                    color: var(--danger, #dc3545);
                    border: 2px dashed var(--danger, #dc3545);
                    border-radius: var(--border-radius, 8px);
                    padding: 2rem;
                    text-align: center;
                }
                
                .dark-mode .brand-carousel-error {
                    background-color: rgba(229, 62, 62, 0.1);
                    color: var(--danger, #e53e3e);
                    border-color: var(--danger, #e53e3e);
                }
                
                .brand-carousel-error i {
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                }
                
                .brand-carousel-error p {
                    font-size: 1rem;
                    margin-bottom: 0.5rem;
                }
                
                /* ====== MODO OSCURO ====== */
                .dark-mode .brand-logo {
                    filter: grayscale(100%) brightness(0.7);
                }
                
                .dark-mode .brand-logo-container:hover .brand-logo,
                .dark-mode .brand-carousel-item:active .brand-logo,
                .dark-mode .brand-carousel-item:focus-within .brand-logo {
                    filter: grayscale(0%) brightness(1);
                }
                
                /* ====== RESPONSIVE - CORREGIDO ====== */
                @media (max-width: 1200px) {
                    .brand-carousel-item {
                        flex: 0 0 calc((100% - (4 - 1) * 20px) / 4);
                    }
                    
                    .brand-logo-image {
                        width: 90px;
                        height: 90px;
                    }
                }
                
                @media (max-width: 992px) {
                    .brand-carousel {
                        padding: 0 10px;
                    }
                    
                    .brand-carousel-item {
                        flex: 0 0 calc((100% - (3 - 1) * 20px) / 3);
                    }
                    
                    .brand-logo-image {
                        width: 80px;
                        height: 80px;
                    }
                    
                    .brand-name {
                        font-size: 0.85rem;
                    }
                }
                
                @media (max-width: 768px) {
                    .brand-carousel {
                        height: 180px;
                        padding: 0 8px;
                    }
                    
                    .brand-carousel-item {
                        flex: 0 0 calc((100% - (${this.config.mobileItemsPerView} - 1) * 15px) / ${this.config.mobileItemsPerView});
                    }
                    
                    .brand-logo-image {
                        width: 70px;
                        height: 70px;
                    }
                    
                    .brand-logo-container {
                        padding: 15px;
                    }
                    
                    .brand-carousel-slides {
                        gap: 15px;
                        padding: 0 15px;
                    }
                    
                    .brand-carousel-btn {
                        width: 35px;
                        height: 35px;
                        font-size: 0.9rem;
                    }
                    
                    .brand-carousel-prev {
                        left: 5px;
                    }
                    
                    .brand-carousel-next {
                        right: 5px;
                    }
                }
                
                @media (max-width: 576px) {
                    .brand-carousel {
                        height: 160px;
                        padding: 0 5px;
                    }
                    
                    .brand-carousel-item {
                        flex: 0 0 calc((100% - (${this.config.mobileItemsPerView} - 1) * 12px) / ${this.config.mobileItemsPerView});
                    }
                    
                    .brand-logo-image {
                        width: 60px;
                        height: 60px;
                    }
                    
                    .brand-logo-container {
                        padding: 12px;
                    }
                    
                    .brand-carousel-slides {
                        gap: 12px;
                        padding: 0 12px;
                    }
                    
                    .brand-name {
                        font-size: 0.8rem;
                    }
                    
                    .brand-carousel-btn {
                        width: 30px;
                        height: 30px;
                        font-size: 0.8rem;
                    }
                    
                    .brand-carousel-prev {
                        left: 2px;
                    }
                    
                    .brand-carousel-next {
                        right: 2px;
                    }
                }
                
                @media (max-width: 400px) {
                    .brand-carousel {
                        height: 150px;
                        padding: 0 2px;
                    }
                    
                    .brand-logo-image {
                        width: 50px;
                        height: 50px;
                    }
                    
                    .brand-carousel-slides {
                        gap: 10px;
                        padding: 0 10px;
                    }
                }
                
                /* Animaciones */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .brand-carousel {
                    animation: fadeIn 0.5s ease-out;
                }
                
                /* Mejoras de accesibilidad */
                .brand-carousel-link:focus {
                    outline: 2px solid var(--accent, #f5d742);
                    outline-offset: 4px;
                    border-radius: var(--border-radius, 8px);
                }
                
                /* Clase para cuando no hay suficientes marcas */
                .brand-carousel.no-slide {
                    overflow: visible;
                }
                
                .brand-carousel.no-slide .brand-carousel-slides {
                    justify-content: center;
                    transform: none !important;
                    gap: 10px;
                }
                
                .brand-carousel.no-slide .brand-carousel-item {
                    flex: 0 0 auto;
                    width: calc((100% - (${this.config.itemsPerView} - 1) * 10px) / ${this.config.itemsPerView});
                }
            `;
            
            document.head.appendChild(styles);
        }
        
        // Aplicar estilos responsivos
        applyResponsiveStyles() {
            const updateItemsPerView = () => {
                const carousel = this.container.querySelector('.brand-carousel');
                if (!carousel) return;
                
                let itemsPerView = this.config.itemsPerView;
                
                if (window.innerWidth <= 768) {
                    itemsPerView = this.config.mobileItemsPerView;
                    
                    // Ajustar altura para móvil
                    if (this.config.height !== '200px') {
                        carousel.style.height = '180px';
                    }
                } else {
                    if (this.config.height !== '200px') {
                        carousel.style.height = this.config.height;
                    }
                }
                
                // Actualizar atributo data
                carousel.setAttribute('data-items-per-view', itemsPerView);
                
                // Recalcular slides
                this.calculateSlides();
                this.updateSlidePosition();
                
                // Mostrar/ocultar flechas
                this.updateArrowsVisibility();
                
                // Forzar reflow para evitar desbordamiento
                this.updateLayout();
            };
            
            updateItemsPerView();
            window.addEventListener('resize', updateItemsPerView);
        }
        
        // Actualizar visibilidad de flechas
        updateArrowsVisibility() {
            const prevBtn = this.container.querySelector('.brand-carousel-prev');
            const nextBtn = this.container.querySelector('.brand-carousel-next');
            const carousel = this.container.querySelector('.brand-carousel');
            
            if (this.brands.length <= this.getCurrentItemsPerView()) {
                // Ocultar flechas y deshabilitar deslizamiento
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
                if (carousel) carousel.classList.add('no-slide');
            } else {
                // Mostrar flechas
                if (prevBtn) prevBtn.style.display = 'flex';
                if (nextBtn) nextBtn.style.display = 'flex';
                if (carousel) carousel.classList.remove('no-slide');
            }
        }
        
        // Obtener número actual de items por vista
        getCurrentItemsPerView() {
            const carousel = this.container.querySelector('.brand-carousel');
            if (!carousel) return this.config.itemsPerView;
            
            const itemsPerView = parseInt(carousel.getAttribute('data-items-per-view'));
            return itemsPerView || this.config.itemsPerView;
        }
        
        // Actualizar layout (nuevo método)
        updateLayout() {
            // Forzar recálculo en el siguiente frame
            requestAnimationFrame(() => {
                if (this.container) {
                    // Reiniciar transformaciones si es necesario
                    if (this.slidesContainer) {
                        this.slidesContainer.style.transform = '';
                    }
                    
                    // Recalcular
                    this.calculateSlides();
                    this.updateSlidePosition();
                    this.updateArrowsVisibility();
                    
                    // Forzar reflow para evitar desbordamiento
                    void this.container.offsetWidth;
                }
            });
        }
        
        // Configurar event listeners
        setupEventListeners() {
            // Botones de navegación
            const prevBtn = this.container.querySelector('.brand-carousel-prev');
            const nextBtn = this.container.querySelector('.brand-carousel-next');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => this.prevSlide());
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextSlide());
            }
            
            // Pausar al pasar el mouse
            if (this.config.pauseOnHover) {
                const carousel = this.container.querySelector('.brand-carousel');
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
            
            const carousel = this.container.querySelector('.brand-carousel');
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
            if (this.brands.length <= this.getCurrentItemsPerView()) return;
            
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
            if (this.brands.length <= this.getCurrentItemsPerView()) return;
            
            this.currentIndex--;
            
            // Si estamos en loop y pasamos el inicio
            if (this.config.loop && this.currentIndex < 0) {
                this.currentIndex = this.totalSlides - 1;
            } else if (this.currentIndex < 0) {
                this.currentIndex = 0;
                return;
            }
            
            this.updateSlidePosition();
            this.updateCounter();
            this.restartAutoplay();
        }
        
        // Ir a slide siguiente
        nextSlide() {
            if (this.brands.length <= this.getCurrentItemsPerView()) return;
            
            this.currentIndex++;
            
            // Si estamos en loop y pasamos el final
            if (this.config.loop && this.currentIndex >= this.totalSlides) {
                this.currentIndex = 0;
            } else if (this.currentIndex >= this.totalSlides) {
                this.currentIndex = this.totalSlides - 1;
                return;
            }
            
            this.updateSlidePosition();
            this.updateCounter();
            this.restartAutoplay();
        }
        
        // Actualizar posición del slide
        updateSlidePosition() {
            if (!this.slidesContainer || this.brands.length <= this.getCurrentItemsPerView()) return;
            
            const itemsPerView = this.getCurrentItemsPerView();
            const itemWidth = 100 / itemsPerView;
            const translateX = -this.currentIndex * itemWidth;
            
            this.slidesContainer.style.transform = `translateX(${translateX}%)`;
        }
        
        // Actualizar contador
        updateCounter() {
            const currentElement = this.container.querySelector('.brand-carousel-current');
            const totalElement = this.container.querySelector('.brand-carousel-total');
            
            if (currentElement) {
                currentElement.textContent = this.currentIndex + 1;
            }
            
            if (totalElement) {
                totalElement.textContent = this.totalSlides;
            }
        }
        
        // =============================================
        // AUTOPLAY
        // =============================================
        
        // Iniciar autoplay
        startAutoplay() {
            if (this.brands.length <= this.getCurrentItemsPerView() || !this.config.autoplay) return;
            
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
        
        // =============================================
        // ESTADOS
        // =============================================
        
        // Mostrar estado vacío
        showEmptyState() {
            this.container.innerHTML = `
                <div class="brand-carousel-empty">
                    <i class="fas fa-tags"></i>
                    <p>No hay marcas disponibles</p>
                    <small>Agrega marcas desde el panel de administración</small>
                </div>
            `;
        }
        
        // Mostrar estado de error
        showErrorState(message = 'Error al cargar las marcas') {
            this.container.innerHTML = `
                <div class="brand-carousel-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <small>Intenta recargar la página</small>
                </div>
            `;
        }
        
        // =============================================
        // API PÚBLICA
        // =============================================
        
        // Actualizar carrusel (recargar marcas)
        async refresh() {
            try {
                await this.loadBrands();
                
                if (this.brands.length === 0) {
                    if (this.config.showEmptyState) {
                        this.showEmptyState();
                    }
                    return false;
                }
                
                this.calculateSlides();
                
                // Re-renderizar si ya estaba inicializado
                if (this.isInitialized) {
                    this.render();
                    this.updateArrowsVisibility();
                    
                    if (this.config.autoplay && this.brands.length > this.getCurrentItemsPerView()) {
                        this.startAutoplay();
                    }
                }
                
                console.log('🔄 Brand Carousel actualizado');
                return true;
            } catch (error) {
                console.error('❌ Error actualizando Brand Carousel:', error);
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
            const styles = document.getElementById('brand-carousel-styles');
            if (styles) {
                styles.remove();
            }
            
            this.isInitialized = false;
            this.brandManager = null;
            console.log('🗑️ Brand Carousel destruido');
        }
    }
    
    // =============================================
    // INICIALIZACIÓN AUTOMÁTICA
    // =============================================
    
    // Inicializar automáticamente cuando el DOM esté listo
    async function initBrandCarousel() {
        // Buscar todos los contenedores con data-brand-carousel
        const carouselContainers = document.querySelectorAll('[data-brand-carousel]');
        
        for (const container of carouselContainers) {
            const config = {
                containerId: container.id,
                autoplay: container.dataset.autoplay !== 'false',
                interval: parseInt(container.dataset.interval) || DEFAULT_CONFIG.interval,
                showArrows: container.dataset.arrows !== 'false',
                pauseOnHover: container.dataset.pauseOnHover !== 'false',
                itemsPerView: parseInt(container.dataset.itemsPerView) || DEFAULT_CONFIG.itemsPerView,
                mobileItemsPerView: parseInt(container.dataset.mobileItemsPerView) || DEFAULT_CONFIG.mobileItemsPerView,
                loop: container.dataset.loop !== 'false',
                height: container.dataset.height || DEFAULT_CONFIG.height,
                maxBrands: parseInt(container.dataset.maxBrands) || DEFAULT_CONFIG.maxBrands,
                showEmptyState: container.dataset.showEmptyState !== 'false',
                brandDetailUrl: container.dataset.brandDetailUrl || DEFAULT_CONFIG.brandDetailUrl
            };
            
            const carousel = new BrandCarousel(config);
            await carousel.init();
            
            // Guardar referencia
            container._brandCarouselInstance = carousel;
        }
    }
    
    // Esperar a que el DOM esté listo y cargar dependencias
    async function initialize() {
        try {
            // Cargar dependencias primero
            const loaded = await loadDependencies();
            if (!loaded) {
                console.error('❌ No se pudieron cargar las dependencias del Brand Carousel');
                return;
            }
            
            // Inicializar carruseles
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initBrandCarousel);
            } else {
                await initBrandCarousel();
            }
        } catch (error) {
            console.error('❌ Error inicializando Brand Carousel:', error);
        }
    }
    
    // Iniciar
    initialize();
    
    // =============================================
    // API GLOBAL
    // =============================================
    
    // API pública para controlar carruseles desde otros scripts
    window.BrandCarousel = {
        // Crear un nuevo carrusel
        create: function(config) {
            const carousel = new BrandCarousel(config);
            return carousel;
        },
        
        // Obtener instancia de un carrusel por ID
        getInstance: function(containerId) {
            const container = document.getElementById(containerId);
            return container?._brandCarouselInstance || null;
        },
        
        // Actualizar todos los carruseles
        refreshAll: function() {
            document.querySelectorAll('[data-brand-carousel]').forEach(async container => {
                const instance = container._brandCarouselInstance;
                if (instance && typeof instance.refresh === 'function') {
                    await instance.refresh();
                }
            });
        },
        
        // Configuración por defecto
        defaultConfig: DEFAULT_CONFIG
    };
    
    console.log('✅ Brand Carousel cargado y listo');
    
})();