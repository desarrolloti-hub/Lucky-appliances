// category-cards-component.js - Componente mejorado para mostrar categorías en tarjetas
(function() {
    'use strict';
    
    // =============================================
    // CONFIGURACIÓN
    // =============================================
    
    if (window.CategoryCardsLoaded) {
        console.log('🔄 Componente de categorías ya cargado, omitiendo...');
        return;
    }
    window.CategoryCardsLoaded = true;
    
    const DEFAULT_CONFIG = {
        containerId: 'categories-container',
        sectionId: 'categories-section',
        maxCategories: 6,
        itemsPerRow: 3,
        mobileItemsPerRow: 1,
        showViewAll: true,
        themeAware: true,
        animationDelay: 100,
        cardHeight: '420px',
        mobileCardHeight: '380px'
    };
    
    // =============================================
    // CARGAR DEPENDENCIAS
    // =============================================
    
    async function loadDependencies() {
        try {
            const { CategoryManager } = await import('/classes/category.js');
            window.CategoryManagerClass = CategoryManager;
            return true;
        } catch (error) {
            console.error('❌ Error cargando CategoryManager:', error);
            return false;
        }
    }
    
    // =============================================
    // CLASE COMPONENTE DE CATEGORÍAS
    // =============================================
    
    class CategoryCardsComponent {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.categories = [];
            this.container = null;
            this.section = null;
            this.isInitialized = false;
            this.categoryManager = null;
            this.observer = null;
        }
        
        async init() {
            if (this.isInitialized) return;
            
            try {
                console.log('🎨 Inicializando componente de categorías...');
                
                this.container = document.getElementById(this.config.containerId);
                
                if (!this.container) {
                    this.createContainer();
                }
                
                const dependenciesLoaded = await loadDependencies();
                if (!dependenciesLoaded) {
                    this.showErrorState('No se pudo cargar CategoryManager');
                    return;
                }
                
                this.categoryManager = new window.CategoryManagerClass();
                await this.loadCategories();
                
                if (this.categories.length === 0) {
                    this.showEmptyState();
                    return;
                }
                
                this.createSection();
                this.render();
                this.addStyles();
                this.setupIntersectionObserver();
                
                this.isInitialized = true;
                console.log(`✅ Componente de categorías inicializado con ${this.categories.length} categorías`);
                
            } catch (error) {
                console.error('❌ Error inicializando componente de categorías:', error);
                this.showErrorState('Error al cargar las categorías');
            }
        }
        
        createContainer() {
            this.container = document.createElement('div');
            this.container.id = this.config.containerId;
            
            const brandCarousel = document.querySelector('[data-brand-carousel]');
            if (brandCarousel) {
                brandCarousel.parentNode.insertBefore(this.container, brandCarousel.nextSibling);
            } else {
                const brandsSection = document.getElementById('brands');
                if (brandsSection) {
                    brandsSection.parentNode.insertBefore(this.container, brandsSection.nextSibling);
                } else {
                    document.body.appendChild(this.container);
                }
            }
        }
        
        createSection() {
            this.section = document.createElement('section');
            this.section.id = this.config.sectionId;
            this.section.className = 'categories-section section';
            
            const sectionHTML = `
                <div class="container">
                    <div class="section-header">
                        <span class="section-subtitle">Explore Our Collection</span>
                        <h2 class="section-title">Featured Categories</h2>
                        <div class="section-divider">
                            <div class="divider-line"></div>
                            <div class="divider-icon">
                                <div class="icon-wrapper">
                                    <i class="fas fa-th-large"></i>
                                </div>
                            </div>
                            <div class="divider-line"></div>
                        </div>
                        <p class="section-description">Discover our premium appliance categories</p>
                    </div>
                </div>
                <div class="categories-container"></div>
            `;
            
            this.section.innerHTML = sectionHTML;
            
            this.container.parentNode.insertBefore(this.section, this.container);
            const categoriesContainer = this.section.querySelector('.categories-container');
            categoriesContainer.appendChild(this.container);
            this.container = categoriesContainer;
        }
        
        async loadCategories() {
            try {
                if (!this.categoryManager) throw new Error('CategoryManager no disponible');
                
                const loadedCategories = await this.categoryManager.loadCategories();
                this.categories = loadedCategories.slice(0, this.config.maxCategories);
                console.log(`📊 Cargadas ${this.categories.length} categorías`);
                
            } catch (error) {
                console.error('❌ Error cargando categorías:', error);
                this.categories = [];
                throw error;
            }
        }
        
        render() {
            this.container.innerHTML = '';
            
            const grid = document.createElement('div');
            grid.className = 'categories-grid';
            
            this.categories.forEach((category, index) => {
                const card = this.createCategoryCard(category, index);
                grid.appendChild(card);
            });
            
            this.container.appendChild(grid);
            
            if (this.config.showViewAll && this.categoryManager.getTotalCategories() > this.config.maxCategories) {
                this.addViewAllButton();
            }
        }
        
        createCategoryCard(category, index) {
            const imageUrl = category.getImageUrl ? category.getImageUrl() : (category.image || '');
            const hasImage = imageUrl && !imageUrl.includes('placeholder');
            
            const card = document.createElement('a');
            card.className = 'category-card';
            card.href = `/visitors/products/products.html?category=${category.id}`;
            card.dataset.index = index;
            card.dataset.categoryId = category.id;
            card.style.animationDelay = `${index * this.config.animationDelay}ms`;
            
            card.innerHTML = `
                <div class="category-card-inner">
                    <div class="category-image ${hasImage ? '' : 'no-image'}">
                        <div class="image-gradient"></div>
                        <img src="${imageUrl}" 
                             alt="${category.nombre}"
                             loading="lazy"
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/800x600/0a2540/ffffff?text=No+Image'">
                        ${!hasImage ? '<div class="image-placeholder"><i class="fas fa-box-open"></i></div>' : ''}
                    </div>
                    <div class="category-content">
                        <div class="category-info">
                            <h3 class="category-name">${category.nombre}</h3>
                            <div class="category-action">
                                <i class="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            return card;
        }
        
        addViewAllButton() {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'categories-view-all';
            
            buttonContainer.innerHTML = `
                <a href="/visitors/products/products.html" class="btn-view-all">
                    <span>View All Products</span>
                    <i class="fas fa-arrow-right"></i>
                </a>
            `;
            
            this.container.appendChild(buttonContainer);
        }
        
        addStyles() {
            const styleId = 'category-cards-styles';
            if (document.getElementById(styleId)) return;
            
            const styles = document.createElement('style');
            styles.id = styleId;
            styles.textContent = /*css*/ `
                /* ====== ESTILOS BASE ====== */
                .categories-section {
                    padding: 5rem 0;
                    background: var(--light, #f8f9fa);
                    position: relative;
                    width: 100%;
                    max-width: 100vw;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                
                .dark-mode .categories-section {
                    background: var(--light, #2d3748);
                }
                
                .categories-section .container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 15px;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                /* Encabezado */
                .section-header {
                    text-align: center;
                    margin-bottom: 3.5rem;
                    max-width: 100%;
                    overflow: hidden;
                }
                
                .section-subtitle {
                    display: block;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--accent, #f5d742);
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    margin-bottom: 0.8rem;
                }
                
                .section-title {
                    font-size: 2.8rem;
                    font-weight: 800;
                    color: var(--primary, #0a2540);
                    margin-bottom: 1.5rem;
                    line-height: 1.2;
                    max-width: 100%;
                    overflow-wrap: break-word;
                }
                
                .dark-mode .section-title {
                    color: var(--text, #e2e8f0);
                }
                
                /* Divisor mejorado */
                .section-divider {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1.2rem;
                    margin: 2rem 0 1.5rem;
                    max-width: 100%;
                }
                
                .divider-line {
                    width: 60px;
                    height: 3px;
                    background: var(--accent, #f5d742);
                    border-radius: 2px;
                    flex-shrink: 0;
                }
                
                .divider-icon {
                    position: relative;
                    flex-shrink: 0;
                }
                
                .icon-wrapper {
                    width: 60px;
                    height: 60px;
                    background: var(--accent, #f5d742);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 5px 20px rgba(245, 215, 66, 0.3);
                }
                
                .icon-wrapper i {
                    color: var(--primary, #0a2540);
                    font-size: 1.5rem;
                }
                
                .section-description {
                    font-size: 1.1rem;
                    color: var(--text-light, #6c757d);
                    max-width: 600px;
                    margin: 0 auto;
                    line-height: 1.6;
                }
                
                /* Grid de categorías - CORREGIDO */
                .categories-grid {
                    display: grid;
                    grid-template-columns: repeat(${this.config.itemsPerRow}, minmax(0, 1fr));
                    gap: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 15px;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                /* Tarjetas mejoradas */
                .category-card {
                    background: var(--white, #ffffff);
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: var(--shadow, 0 8px 25px rgba(0,0,0,0.1));
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    opacity: 0;
                    transform: translateY(20px);
                    animation: fadeInUp 0.6s ease-out forwards;
                    height: ${this.config.cardHeight};
                    display: block;
                    text-decoration: none;
                    position: relative;
                    border: 2px solid transparent;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                .dark-mode .category-card {
                    background: var(--white, #1a253a);
                    box-shadow: var(--shadow, 0 8px 25px rgba(0,0,0,0.3));
                }
                
                .category-card:hover {
                    transform: translateY(-10px);
                    border-color: var(--accent, #f5d742);
                    box-shadow: 0 20px 40px rgba(245, 215, 66, 0.25);
                }
                
                .dark-mode .category-card:hover {
                    border-color: var(--accent, #f5d742);
                    box-shadow: 0 20px 40px rgba(245, 215, 66, 0.3);
                }
                
                .category-card-inner {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                
                /* Imagen grande */
                .category-image {
                    height: 75%;
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, var(--primary, #0a2540) 0%, var(--primary-light, #1a365d) 100%);
                }
                
                .image-gradient {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 60%;
                    background: linear-gradient(to top, 
                        rgba(0,0,0,0.8) 0%, 
                        rgba(0,0,0,0.4) 50%, 
                        rgba(0,0,0,0) 100%);
                    z-index: 1;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .category-card:hover .image-gradient {
                    opacity: 1;
                }
                
                .category-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.6s ease;
                }
                
                .category-card:hover .category-image img {
                    transform: scale(1.1);
                }
                
                .image-placeholder {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: var(--white, #ffffff);
                    font-size: 4rem;
                    opacity: 0.3;
                }
                
                /* Contenido minimalista */
                .category-content {
                    padding: 1.8rem;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    background: var(--white, #ffffff);
                    box-sizing: border-box;
                }
                
                .dark-mode .category-content {
                    background: var(--white, #1a253a);
                }
                
                .category-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }
                
                .category-name {
                    font-size: 1.4rem;
                    font-weight: 600;
                    color: var(--primary, #0a2540);
                    margin: 0;
                    flex: 1;
                    max-width: calc(100% - 60px);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .dark-mode .category-name {
                    color: var(--text, #e2e8f0);
                }
                
                /* Botón minimalista */
                .category-action {
                    width: 44px;
                    height: 44px;
                    background: var(--accent, #f5d742);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary, #0a2540);
                    font-size: 1.2rem;
                    transition: all 0.3s ease;
                    margin-left: 1rem;
                    flex-shrink: 0;
                }
                
                .category-card:hover .category-action {
                    transform: translateX(5px);
                    background: var(--primary, #0a2540);
                    color: var(--accent, #f5d742);
                }
                
                /* Botón "Ver todas" */
                .categories-view-all {
                    text-align: center;
                    margin-top: 3rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--gray, #e9ecef);
                    grid-column: 1 / -1;
                }
                
                .dark-mode .categories-view-all {
                    border-top-color: var(--gray, #4a5568);
                }
                
                .btn-view-all {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.9rem 2rem;
                    background: transparent;
                    color: var(--primary, #0a2540);
                    border: 2px solid var(--accent, #f5d742);
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 1rem;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }
                
                .dark-mode .btn-view-all {
                    color: var(--text, #e2e8f0);
                }
                
                .btn-view-all:hover {
                    background: var(--accent, #f5d742);
                    color: var(--primary, #0a2540);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(245, 215, 66, 0.3);
                }
                
                .btn-view-all i {
                    transition: transform 0.3s ease;
                }
                
                .btn-view-all:hover i {
                    transform: translateX(5px);
                }
                
                /* Estados */
                .categories-empty,
                .categories-error {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--white, #ffffff);
                    border-radius: 16px;
                    border: 2px dashed var(--gray, #e9ecef);
                    color: var(--text-light, #6c757d);
                    max-width: 100%;
                    overflow: hidden;
                }
                
                .dark-mode .categories-empty,
                .dark-mode .categories-error {
                    background: var(--white, #1a253a);
                    border-color: var(--gray, #4a5568);
                    color: var(--text-light, #a0aec0);
                }
                
                .categories-empty i,
                .categories-error i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .categories-empty p,
                .categories-error p {
                    font-size: 1.2rem;
                    margin-bottom: 0.5rem;
                }
                
                /* Animaciones */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* ====== RESPONSIVE - CORREGIDO ====== */
                @media (max-width: 1200px) {
                    .categories-grid {
                        grid-template-columns: repeat(min(${this.config.itemsPerRow}, 3), minmax(0, 1fr));
                        gap: 1.8rem;
                        padding: 0 20px;
                    }
                    
                    .category-card {
                        height: 380px;
                    }
                    
                    .section-title {
                        font-size: 2.5rem;
                    }
                }
                
                @media (max-width: 992px) {
                    .categories-section {
                        padding: 4rem 0;
                    }
                    
                    .categories-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        padding: 0 15px;
                    }
                    
                    .category-card {
                        height: ${this.config.mobileCardHeight};
                    }
                    
                    .section-title {
                        font-size: 2.2rem;
                    }
                    
                    .icon-wrapper {
                        width: 55px;
                        height: 55px;
                    }
                    
                    .icon-wrapper i {
                        font-size: 1.3rem;
                    }
                    
                    .section-description {
                        padding: 0 15px;
                    }
                }
                
                @media (max-width: 768px) {
                    .categories-section {
                        padding: 3.5rem 0;
                    }
                    
                    .categories-grid {
                        grid-template-columns: minmax(0, 1fr);
                        gap: 1.5rem;
                        max-width: 500px;
                        padding: 0 15px;
                    }
                    
                    .section-title {
                        font-size: 2rem;
                        padding: 0 10px;
                    }
                    
                    .section-subtitle {
                        font-size: 0.9rem;
                        letter-spacing: 2px;
                    }
                    
                    .divider-line {
                        width: 40px;
                    }
                    
                    .icon-wrapper {
                        width: 50px;
                        height: 50px;
                    }
                    
                    .icon-wrapper i {
                        font-size: 1.2rem;
                    }
                    
                    .section-description {
                        font-size: 1rem;
                        padding: 0 1rem;
                    }
                    
                    .category-content {
                        padding: 1.5rem;
                    }
                    
                    .category-name {
                        font-size: 1.3rem;
                    }
                    
                    .category-action {
                        width: 40px;
                        height: 40px;
                        font-size: 1.1rem;
                    }
                    
                    .categories-empty,
                    .categories-error {
                        margin: 0 15px;
                    }
                }
                
                @media (max-width: 576px) {
                    .categories-grid {
                        gap: 1.2rem;
                        padding: 0 10px;
                    }
                    
                    .category-card {
                        height: 350px;
                    }
                    
                    .section-title {
                        font-size: 1.8rem;
                    }
                    
                    .category-content {
                        padding: 1.2rem;
                    }
                    
                    .category-name {
                        font-size: 1.2rem;
                    }
                    
                    .btn-view-all {
                        padding: 0.8rem 1.5rem;
                        font-size: 0.95rem;
                    }
                    
                    .categories-empty,
                    .categories-error {
                        padding: 3rem 1rem;
                        margin: 0 10px;
                    }
                }
                
                @media (max-width: 400px) {
                    .categories-grid {
                        grid-template-columns: minmax(0, 1fr);
                        max-width: 320px;
                        padding: 0 8px;
                    }
                    
                    .category-card {
                        height: 320px;
                    }
                    
                    .section-title {
                        font-size: 1.6rem;
                        padding: 0 5px;
                    }
                    
                    .category-image {
                        height: 70%;
                    }
                    
                    .category-name {
                        font-size: 1.1rem;
                    }
                    
                    .section-divider {
                        gap: 0.8rem;
                    }
                    
                    .divider-line {
                        width: 30px;
                    }
                    
                    .icon-wrapper {
                        width: 45px;
                        height: 45px;
                    }
                    
                    .icon-wrapper i {
                        font-size: 1rem;
                    }
                }
                
                @media (max-width: 350px) {
                    .categories-grid {
                        padding: 0 5px;
                        gap: 1rem;
                    }
                    
                    .category-card {
                        height: 300px;
                    }
                    
                    .category-content {
                        padding: 1rem;
                    }
                    
                    .category-name {
                        font-size: 1rem;
                    }
                    
                    .category-action {
                        width: 36px;
                        height: 36px;
                        font-size: 1rem;
                        margin-left: 0.5rem;
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }
        
        setupIntersectionObserver() {
            if (!('IntersectionObserver' in window)) return;
            
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const index = parseInt(card.dataset.index);
                        
                        setTimeout(() => {
                            card.style.animation = `fadeInUp 0.6s ease-out ${index * this.config.animationDelay}ms forwards`;
                        }, 100);
                        
                        this.observer.unobserve(card);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });
            
            const cards = this.container.querySelectorAll('.category-card');
            cards.forEach(card => {
                this.observer.observe(card);
            });
        }
        
        handleCategoryClick(categoryId, categoryName) {
            console.log(`📍 Navegando a categoría: ${categoryName} (ID: ${categoryId})`);
        }
        
        showEmptyState() {
            this.container.innerHTML = `
                <div class="categories-empty">
                    <i class="fas fa-folder-open"></i>
                    <p>No categories available</p>
                    <small>Categories will appear here once they are added</small>
                </div>
            `;
        }
        
        showErrorState(message = 'Error loading categories') {
            this.container.innerHTML = `
                <div class="categories-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <small>Please try again later</small>
                </div>
            `;
        }
        
        async refresh() {
            try {
                await this.loadCategories();
                
                if (this.categories.length === 0) {
                    this.showEmptyState();
                    return false;
                }
                
                this.render();
                
                if (this.observer) {
                    this.observer.disconnect();
                    this.setupIntersectionObserver();
                }
                
                console.log('🔄 Categorías actualizadas');
                return true;
                
            } catch (error) {
                console.error('❌ Error actualizando categorías:', error);
                this.showErrorState('Error updating categories');
                return false;
            }
        }
        
        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            if (this.section && this.section.parentNode) {
                this.section.parentNode.removeChild(this.section);
            }
            
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            const styles = document.getElementById('category-cards-styles');
            if (styles) styles.remove();
            
            this.isInitialized = false;
            this.categoryManager = null;
            console.log('🗑️ Componente de categorías destruido');
        }
    }
    
    // =============================================
    // INICIALIZACIÓN AUTOMÁTICA
    // =============================================
    
    async function initCategoryCards() {
        const containers = document.querySelectorAll('[data-category-cards]');
        
        for (const container of containers) {
            const config = {
                containerId: container.id,
                sectionId: container.dataset.sectionId || DEFAULT_CONFIG.sectionId,
                maxCategories: parseInt(container.dataset.maxCategories) || DEFAULT_CONFIG.maxCategories,
                itemsPerRow: parseInt(container.dataset.itemsPerRow) || DEFAULT_CONFIG.itemsPerRow,
                mobileItemsPerRow: parseInt(container.dataset.mobileItemsPerRow) || DEFAULT_CONFIG.mobileItemsPerRow,
                showViewAll: container.dataset.showViewAll !== 'false',
                themeAware: container.dataset.themeAware !== 'false',
                animationDelay: parseInt(container.dataset.animationDelay) || DEFAULT_CONFIG.animationDelay,
                cardHeight: container.dataset.cardHeight || DEFAULT_CONFIG.cardHeight,
                mobileCardHeight: container.dataset.mobileCardHeight || DEFAULT_CONFIG.mobileCardHeight
            };
            
            const component = new CategoryCardsComponent(config);
            await component.init();
            
            container._categoryCardsInstance = component;
        }
    }
    
    async function initialize() {
        try {
            const loaded = await loadDependencies();
            if (!loaded) {
                console.error('❌ No se pudieron cargar las dependencias');
                return;
            }
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initCategoryCards);
            } else {
                await initCategoryCards();
            }
        } catch (error) {
            console.error('❌ Error inicializando componente de categorías:', error);
        }
    }
    
    initialize();
    
    // =============================================
    // API GLOBAL
    // =============================================
    
    window.CategoryCards = {
        create: function(config) {
            return new CategoryCardsComponent(config);
        },
        
        getInstance: function(containerId) {
            const container = document.getElementById(containerId);
            return container?._categoryCardsInstance || null;
        },
        
        refreshAll: function() {
            document.querySelectorAll('[data-category-cards]').forEach(async container => {
                const instance = container._categoryCardsInstance;
                if (instance && typeof instance.refresh === 'function') {
                    await instance.refresh();
                }
            });
        },
        
        defaultConfig: DEFAULT_CONFIG
    };
    
    console.log('✅ Category Cards Component cargado y listo');
    
})();