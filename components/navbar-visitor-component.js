// navbar-complete.js - Corregido para responsive y modo oscuro
(function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN INICIAL
    // =============================================
    
    if (window.NavbarCompleteLoaded) {
        console.log('🔄 Navbar completo ya cargado, omitiendo...');
        return;
    }
    window.NavbarCompleteLoaded = true;
    
    console.log('🚀 Iniciando navbar completo...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
    
    async function init() {
        try {
            removeOriginalNavbar();
            await createCompleteNavbar();
            setupAllFunctionalities();
            applyDarkModeFromStorage();
            console.log('✅ Navbar completo inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar navbar:', error);
        }
    }
    
    function removeOriginalNavbar() {
        const originalHeader = document.getElementById('main-header');
        if (originalHeader) {
            originalHeader.remove();
            console.log('🗑️ Navbar original removido');
        }
    }
    
    // =============================================
    // CREAR NAVBAR COMPLETO
    // =============================================
    
    async function createCompleteNavbar() {
        addCompleteStyles();
        createNavbarHTML();
        adjustBodyPadding();
    }
    
    function applyDarkModeFromStorage() {
        // Esta función ya no es necesaria porque ThemeManager se inicializa primero
        // Pero la mantenemos por compatibilidad
        if (window.ThemeManager) {
            // ThemeManager ya aplicó el tema, solo actualizamos el icono
            const isDarkMode = window.ThemeManager.isDarkMode();
            const darkModeBtn = document.getElementById('darkModeToggle');
            if (darkModeBtn) {
                darkModeBtn.innerHTML = isDarkMode ? 
                    '<i class="fas fa-sun"></i>' : 
                    '<i class="fas fa-moon"></i>';
            }
        }
    }

    function addCompleteStyles() {
        const styleId = 'navbar-complete-styles';
        if (document.getElementById(styleId)) return;
        
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent =/*css*/ `
            /* ====== VARIABLES DE COLOR ====== */
            :root {
                --primary: #0a2540;
                --primary-light: #1a365d;
                --primary-dark: #061a2d;
                --accent: #f5d742;
                --accent-dark: #e5c730;
                --accent-light: #fff5b8;
                --text: #333333;
                --text-light: #6c757d;
                --light: #f8f9fa;
                --white: #ffffff;
                --gray: #e9ecef;
                --dark-gray: #343a40;
                --shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
                --transition: all 0.3s ease-in-out;
                --border-radius: 8px;
                --border-radius-lg: 12px;
            }
            
            /* ====== NAVBAR COMPLETO ====== */
            #complete-navbar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                z-index: 1000;
                background-color: rgba(255, 255, 255, 0.95);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                transition: var(--transition);
                font-family: 'Poppins', sans-serif;
            }
            
            #complete-navbar.scrolled {
                background-color: var(--white);
                box-shadow: var(--shadow);
            }
            
            .navbar-main-container {
                display: flex;
                flex-direction: column;
                padding: 0;
            }
            
            /* Parte superior con logo y menú */
            .navbar-top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 20px;
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            /* Logo */
            .navbar-brand {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 700;
                font-size: 20px;
                color: var(--primary);
                text-decoration: none;
                z-index: 1003;
            }
            
            .navbar-logo-img {
                height: 40px;
                transition: var(--transition);
            }
            
            .navbar-brand:hover .navbar-logo-img {
                transform: rotate(15deg);
            }
            
            /* Menú principal - DESKTOP */
            .navbar-main-menu {
                display: flex;
                list-style: none;
                gap: 25px;
                margin: 0;
                padding: 0;
            }
            
            .navbar-main-menu a {
                color: var(--primary);
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                transition: var(--transition);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .navbar-main-menu a span {
                display: inline-block;
            }
            
            .navbar-main-menu a:hover {
                color: var(--accent);
            }
            
            .navbar-main-menu a.active {
                color: var(--accent);
                font-weight: 600;
            }
            
            /* Botón modo oscuro - SEPARADO DEL MENÚ */
            .dark-mode-toggle-btn {
                background: rgba(10, 37, 64, 0.1);
                border: none;
                color: var(--primary);
                font-size: 1.2rem;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: var(--transition);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                margin-left: 10px;
                z-index: 1003;
            }
            
            .dark-mode-toggle-btn:hover {
                background-color: rgba(10, 37, 64, 0.2);
                transform: rotate(15deg);
            }
            
            /* BOTÓN HAMBURGUESA - POSICIONADO A LA IZQUIERDA */
            .navbar-hamburger-btn {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                width: 40px;
                height: 40px;
                padding: 0;
                position: relative;
                z-index: 1002;
                margin: 0 15px 0 0;
            }
            
            .hamburger-line {
                display: block;
                width: 25px;
                height: 3px;
                background-color: var(--primary);
                margin: 5px 0;
                border-radius: 3px;
                transition: var(--transition);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(6px, 6px);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(6px, -6px);
            }
            
            /* Sección de búsqueda - DEBAJO DEL NAVBAR */
            .navbar-search-section {
                width: 100%;
                background-color: var(--light);
                border-top: 1px solid var(--gray);
                padding: 15px 0;
                display: block;
            }
            
            .search-container {
                position: relative;
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            #navbar-search-input {
                width: 100%;
                padding: 12px 20px;
                border: 2px solid #e0e0e0;
                border-radius: 30px;
                font-size: 1rem;
                font-family: 'Poppins', sans-serif;
                background-color: var(--white);
                color: var(--text);
                transition: var(--transition);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            }
            
            #navbar-search-input:focus {
                outline: none;
                border-color: var(--accent);
                box-shadow: 0 2px 15px rgba(245, 215, 66, 0.2);
            }
            
            /* Overlay para móvil */
            .navbar-mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
            }
            
            .navbar-mobile-overlay.active {
                display: block;
            }
            
            /* ====== RESPONSIVE - MÓVIL ====== */
            @media (max-width: 992px) {
                /* NAVBAR SUPERIOR - REORGANIZADO */
                .navbar-top-section {
                    padding: 15px 8px;
                    position: relative;
                    flex-wrap: nowrap;
                    
                }
                
                /* BOTÓN HAMBURGUESA A LA IZQUIERDA */
                .navbar-hamburger-btn {
                    display: block;
                    order: 1;
                    margin-right: 15px;
                    margin-left: 0;
                }
                
                /* LOGO CENTRADO */
                .navbar-brand {
                    order: 2;
                    flex: 1;
                    text-align: center;
                    justify-content: center;
                }
                
                /* BOTÓN MODO OSCURO - VISIBLE EN MÓVIL */
                .dark-mode-toggle-btn {
                    order: 3;
                    margin-left: auto;
                    margin-right: 15px;
                    display: flex;
                    background: rgba(10, 37, 64, 0.1);
                }
                
                /* MENÚ MÓVIL - SE OCULTA COMPLETAMENTE */
                .navbar-main-menu {
                    position: fixed;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100vh;
                    background-color: var(--white);
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 100px 20px 30px;
                    gap: 0;
                    transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 1001;
                    overflow-y: auto;
                    box-shadow: none;
                    opacity: 0;
                    display: flex !important;
                }
                
                .navbar-main-menu.active {
                    left: 0;
                    opacity: 1;
                }
                
                /* Animación elementos del menú */
                .navbar-main-menu li {
                    width: 100%;
                    max-width: 300px;
                    border-bottom: 1px solid rgba(10, 37, 64, 0.1);
                    opacity: 0;
                    transform: translateX(-20px);
                    transition: var(--transition);
                }
                
                .navbar-main-menu.active li {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .navbar-main-menu li:nth-child(1) { transition-delay: 0.1s; }
                .navbar-main-menu li:nth-child(2) { transition-delay: 0.15s; }
                .navbar-main-menu li:nth-child(3) { transition-delay: 0.2s; }
                .navbar-main-menu li:nth-child(4) { transition-delay: 0.25s; }
                .navbar-main-menu li:nth-child(5) { transition-delay: 0.3s; }
                .navbar-main-menu li:nth-child(6) { transition-delay: 0.35s; }
                
                /* Alineación correcta de iconos en móvil */
                .navbar-main-menu a {
                    padding: 15px 20px;
                    font-size: 18px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    justify-content: flex-start;
                    text-align: left;
                    border-radius: var(--border-radius);
                    margin: 5px 0;
                }
                
                .navbar-main-menu a i {
                    width: 24px;
                    text-align: center;
                    font-size: 1.2rem;
                }
                
                .navbar-main-menu a span {
                    flex: 1;
                }
                
                .navbar-main-menu a:hover {
                    background-color: rgba(245, 215, 66, 0.1);
                    padding-left: 25px;
                }
                
                /* BÚSQUEDA EN MÓVIL */
                .navbar-search-section {
                    position: relative;
                    top: auto;
                    left: auto;
                    width: 100%;
                    z-index: 1;
                    background: var(--white);
                    border-top: 1px solid var(--gray);
                }
                
                /* RESULTADOS DE BÚSQUEDA EN MÓVIL */
                .search-results-dropdown {
                    position: fixed !important;
                    top: 140px !important;
                    left: 0 !important;
                    width: 100vw !important;
                    max-height: calc(100vh - 140px) !important;
                    border-radius: 0 !important;
                    border: none !important;
                    border-top: 1px solid #e0e0e0 !important;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15) !important;
                }
                
                /* Bloquear scroll cuando menú está abierto */
                body.mobile-menu-open {
                    overflow: hidden;
                }
            }
            
            /* Pantallas muy pequeñas */
            @media (max-width: 480px) {
                .navbar-brand span {
                    font-size: 18px;
                }
                
                .navbar-logo-img {
                    height: 35px;
                }
                
                .navbar-main-menu {
                    padding: 90px 15px 20px;
                }
                
                .navbar-main-menu a {
                    font-size: 16px;
                    padding: 14px 15px;
                }
                
                .navbar-main-menu a i {
                    font-size: 1.1rem;
                }
                
                .navbar-hamburger-btn {
                    width: 35px;
                    height: 35px;
                    margin-right: 10px;
                }
                
                .dark-mode-toggle-btn {
                    margin-right: 10px;
                    width: 35px;
                    height: 35px;
                }
            }
            
            /* ====== RESULTADOS DE BÚSQUEDA ====== */
            .search-results-dropdown {
                list-style: none;
                padding: 0;
                margin: 8px 0 0 0;
                position: absolute;
                width: calc(100% - 40px);
                background: var(--white);
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
                z-index: 1000;
                max-height: 400px;
                overflow-y: auto;
                display: none;
            }
            
            .search-results-dropdown.active {
                display: block;
                animation: fadeIn 0.2s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .search-result-item {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: background-color 0.2s;
            }
            
            .search-result-item:hover {
                background-color: #f9f9f9;
            }
            
            .search-result-item:last-child {
                border-bottom: none;
            }
            
            .result-thumbnail {
                width: 50px;
                height: 50px;
                object-fit: contain;
                border-radius: 6px;
                border: 1px solid #eee;
                background-color: #fafafa;
            }
            
            .result-info {
                flex: 1;
                min-width: 0;
            }
            
            .result-info h4 {
                margin: 0;
                font-size: 0.95rem;
                color: var(--text);
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .result-brand {
                font-weight: 500;
                color: #555;
                font-size: 0.85rem;
                margin: 2px 0;
            }
            
            .result-category {
                color: var(--text-light);
                font-size: 0.75rem;
                margin: 2px 0 0 0;
            }
            
            .result-price {
                font-weight: 600;
                color: var(--primary);
                font-size: 0.9rem;
                margin-left: auto;
                padding-left: 10px;
            }
            
            .search-loading,
            .search-error,
            .no-results {
                padding: 15px;
                text-align: center;
                color: var(--text-light);
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .search-error {
                color: #e74c3c;
            }
            
            /* ====== MODO OSCURO ====== */
            .dark-mode {
                --primary: #1a365d;
                --primary-dark: #0a2540;
                --text: #e2e8f0;
                --text-light: #a0aec0;
                --light: #2d3748;
                --white: #1a253a;
                --gray: #4a5568;
                --dark-gray: #2d3748;
            }
            
            .dark-mode #complete-navbar {
                background-color: rgba(26, 37, 100, 0.95);
            }
            
            .dark-mode #complete-navbar.scrolled {
                background-color: var(--white);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
            
            .dark-mode .navbar-brand {
                color: var(--text);
            }
            
            /* FONDO DEL MENÚ MÓVIL EN MODO OSCURO - CORREGIDO */
            .dark-mode .navbar-main-menu {
                background-color: #1a253a !important;
            }
            
            .dark-mode .navbar-main-menu a {
                color: var(--text) !important;
            }
            
            .dark-mode .navbar-main-menu a:hover {
                color: var(--accent) !important;
                background-color: rgba(245, 215, 66, 0.1) !important;
            }
            
            .dark-mode .navbar-main-menu a.active {
                color: var(--accent) !important;
            }
            
            .dark-mode .navbar-main-menu li {
                border-bottom-color: var(--gray);
            }
            
            .dark-mode .hamburger-line {
                background-color: var(--text);
            }
            
            .dark-mode .dark-mode-toggle-btn {
                color: var(--text);
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .dark-mode .dark-mode-toggle-btn:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .dark-mode #navbar-search-input {
                background-color: var(--light);
                border-color: var(--gray);
                color: var(--text);
            }
            
            .dark-mode #navbar-search-input:focus {
                border-color: var(--accent);
                box-shadow: 0 2px 15px rgba(245, 215, 66, 0.3);
            }
            
            .dark-mode .navbar-search-section {
                background-color: var(--white);
                border-top-color: var(--gray);
            }
            
            .dark-mode .search-results-dropdown {
                background-color: var(--light);
                border-color: var(--gray);
            }
            
            .dark-mode .search-result-item {
                border-bottom-color: var(--gray);
            }
            
            .dark-mode .search-result-item:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .dark-mode .result-info h4 {
                color: var(--text);
            }
            
            .dark-mode .result-brand {
                color: var(--text-light);
            }
            
            .dark-mode .result-category {
                color: var(--text-light);
            }
            
            .dark-mode .result-price {
                color: var(--accent);
            }
            
            .dark-mode .navbar-mobile-overlay {
                background: rgba(0, 0, 0, 0.7);
            }
            
            .dark-mode .search-loading,
            .dark-mode .search-error,
            .dark-mode .no-results {
                color: var(--text-light);
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    function createNavbarHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';
        
        navbar.innerHTML =/*html*/ `
            <div class="navbar-main-container">
                <!-- Parte superior: logo, menú y botones -->
                <div class="navbar-top-section">
                    <!-- Botón hamburguesa a la IZQUIERDA -->
                    <button class="navbar-hamburger-btn" id="navbarHamburger" aria-label="Toggle menu">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                    
                    <!-- Logo -->
                    <a href="/index.html" class="navbar-brand">
                        <img src="/assets/icons/Logo Lucky Apliances.png" alt="Lucky Appliances" class="navbar-logo-img">
                        <span>Lucky Appliances</span>
                    </a>
                    
                    <!-- Botón modo oscuro FUERA del menú - SIEMPRE VISIBLE -->
                    <button class="dark-mode-toggle-btn" id="darkModeToggle" title="Toggle dark mode">
                        <i class="fas fa-moon"></i>
                    </button>
                    
                    <!-- Menú principal SIN el botón modo oscuro -->
                    <ul class="navbar-main-menu" id="navbarMainMenu">
                        <li><a href="/index.html" class="active"><i class="fas fa-home"></i> <span>Home</span></a></li>
                        <li><a href="/users/visitors/products/products.html"><i class="fas fa-box-open"></i> <span>Products</span></a></li>
                        <li><a href="/users/visitors/location/location.html"><i class="fas fa-map-marker-alt"></i> <span>Location</span></a></li>
                        <li><a href="/users/visitors/contact/contact.html"><i class="fas fa-envelope"></i> <span>Contact</span></a></li>
                    </ul>
                </div>
                
                <!-- Sección de búsqueda (DEBAJO) -->
                <div class="navbar-search-section">
                    <div class="search-container">
                        <input type="text" id="navbar-search-input" placeholder="Search for products..." autocomplete="off">
                        <ul id="navbar-search-results" class="search-results-dropdown"></ul>
                    </div>
                </div>
                
                <!-- Overlay para móvil -->
                <div class="navbar-mobile-overlay" id="navbarMobileOverlay"></div>
            </div>
        `;
        
        document.body.insertBefore(navbar, document.body.firstChild);
    }
    
    function adjustBodyPadding() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;
        
        const navbarHeight = navbar.offsetHeight;
        document.body.style.paddingTop = navbarHeight + 'px';
        
        const resizeObserver = new ResizeObserver(() => {
            const newHeight = navbar.offsetHeight;
            document.body.style.paddingTop = newHeight + 'px';
        });
        
        resizeObserver.observe(navbar);
        
        window.addEventListener('resize', () => {
            const currentHeight = navbar.offsetHeight;
            document.body.style.paddingTop = currentHeight + 'px';
        });
    }
    
    // =============================================
    // CONFIGURAR TODAS LAS FUNCIONALIDADES
    // =============================================
    
    function setupAllFunctionalities() {
        setupResponsiveMenu();
        setupDarkMode();
        setupScrollEffects();
        setupPredictiveSearch();
        markActiveLink();
    }
    
    function setupResponsiveMenu() {
        const hamburgerBtn = document.getElementById('navbarHamburger');
        const mainMenu = document.getElementById('navbarMainMenu');
        const overlay = document.getElementById('navbarMobileOverlay');
        
        if (!hamburgerBtn || !mainMenu || !overlay) return;
        
        let isMenuOpen = false;
        
        function openMobileMenu() {
            mainMenu.classList.add('active');
            hamburgerBtn.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('mobile-menu-open');
            isMenuOpen = true;
            
            const menuItems = mainMenu.querySelectorAll('li');
            menuItems.forEach((item, index) => {
                item.style.transitionDelay = `${0.1 + (index * 0.05)}s`;
            });
        }
        
        function closeMobileMenu() {
            mainMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
            isMenuOpen = false;
            
            const menuItems = mainMenu.querySelectorAll('li');
            menuItems.forEach(item => {
                item.style.transitionDelay = '0s';
            });
        }
        
        function toggleMobileMenu() {
            if (isMenuOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        }
        
        hamburgerBtn.addEventListener('click', toggleMobileMenu);
        overlay.addEventListener('click', closeMobileMenu);
        
        // Cerrar menú al hacer clic en enlaces (móvil)
        mainMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    setTimeout(closeMobileMenu, 300);
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMobileMenu();
            }
        });
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && isMenuOpen) {
                closeMobileMenu();
            }
        });
    }
    
    // REEMPLAZA esta función en navbar-visitor-component.js
    function setupDarkMode() {
        const darkModeBtn = document.getElementById('darkModeToggle');
        if (!darkModeBtn) return;
        
        // Usar ThemeManager si está disponible
        if (window.ThemeManager) {
            // Sincronizar icono inicial
            updateDarkModeIcon();
            
            darkModeBtn.addEventListener('click', () => {
                const newTheme = window.ThemeManager.toggle();
                updateDarkModeIcon();
                console.log(`🌙 Tema cambiado a: ${newTheme}`);
            });
            
            // Escuchar cambios de tema
            window.ThemeManager.onThemeChange((isDarkMode) => {
                updateDarkModeIcon();
            });
        } else {
            // Fallback a localStorage simple
            const savedMode = localStorage.getItem('darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            let isDarkMode = savedMode !== null ? savedMode === 'true' : prefersDark;
            
            // Aplicar modo inicial
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            }
            
            darkModeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                isDarkMode = document.body.classList.contains('dark-mode');
                
                // Actualizar icono
                darkModeBtn.innerHTML = isDarkMode ? 
                    '<i class="fas fa-sun"></i>' : 
                    '<i class="fas fa-moon"></i>';
                
                // Guardar preferencia
                localStorage.setItem('darkMode', isDarkMode);
                
                console.log(`🌙 Modo oscuro ${isDarkMode ? 'activado' : 'desactivado'}`);
            });
        }
        
        function updateDarkModeIcon() {
            if (!darkModeBtn || !window.ThemeManager) return;
            
            const isDarkMode = window.ThemeManager.isDarkMode();
            darkModeBtn.innerHTML = isDarkMode ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
    }
    
    function setupDarkMode() {
        const darkModeBtn = document.getElementById('darkModeToggle');
        if (!darkModeBtn) return;
        
        // Actualizar icono inicial
        updateDarkModeIcon();
        
        // Configurar evento de clic
        darkModeBtn.addEventListener('click', () => {
            if (window.ThemeManager) {
                const newTheme = window.ThemeManager.toggle();
                console.log(`🌙 Tema cambiado a: ${newTheme}`);
            } else {
                // Fallback simple
                const isDarkMode = document.body.classList.contains('dark-mode');
                const newDarkMode = !isDarkMode;
                
                if (newDarkMode) {
                    document.body.classList.add('dark-mode');
                    darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.body.classList.remove('dark-mode');
                    darkModeBtn.innerHTML = '<i class="fas fa-moon"></i>';
                    localStorage.setItem('theme', 'light');
                }
                
                console.log(`🌙 Modo oscuro ${newDarkMode ? 'activado' : 'desactivado'}`);
            }
        });
        
        // Escuchar cambios de tema
        if (window.ThemeManager) {
            window.ThemeManager.onThemeChange((isDarkMode) => {
                updateDarkModeIcon();
            });
        } else {
            // Fallback: observar cambios en la clase
            const observer = new MutationObserver(() => {
                updateDarkModeIcon();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
        
        function updateDarkModeIcon() {
            if (!darkModeBtn) return;
            
            const isDarkMode = document.body.classList.contains('dark-mode');
            darkModeBtn.innerHTML = isDarkMode ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
    }
    
    function setupScrollEffects() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    function setupPredictiveSearch() {
        const searchInput = document.getElementById('navbar-search-input');
        const searchResults = document.getElementById('navbar-search-results');
        
        if (!searchInput || !searchResults) return;
        
        let debounceTimer;
        const debounceDelay = 300;
        const minSearchLength = 2;
        
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('focus', () => {
            if (searchResults.children.length > 0) {
                searchResults.classList.add('active');
            }
        });
        
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchResults.classList.remove('active');
            }, 200);
        });
        
        function handleSearchInput(e) {
            clearTimeout(debounceTimer);
            const searchTerm = e.target.value.trim();
            
            if (searchTerm.length < minSearchLength) {
                clearSearchResults();
                return;
            }
            
            debounceTimer = setTimeout(() => {
                performSearch(searchTerm);
            }, debounceDelay);
        }
        
        function clearSearchResults() {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
        }
        
        async function performSearch(term) {
            try {
                const searchTerm = term.toLowerCase();
                
                searchResults.innerHTML = '<li class="search-loading">Searching...</li>';
                searchResults.classList.add('active');
                
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    await searchWithFirebase(searchTerm);
                } else {
                    showMockResults(searchTerm);
                }
            } catch (error) {
                console.error("Error searching products:", error);
                showSearchError();
            }
        }
        
        async function searchWithFirebase(searchTerm) {
            const db = firebase.firestore();
            const querySnapshot = await db.collection("products").limit(8).get();
            
            const results = [];
            querySnapshot.forEach(doc => {
                const product = doc.data();
                
                const matches = [
                    product.Model?.toLowerCase().includes(searchTerm),
                    product.Brand?.toLowerCase().includes(searchTerm),
                    product.Category?.toLowerCase().includes(searchTerm),
                    product.Subcategory?.toLowerCase().includes(searchTerm),
                    product.ProductClass?.toLowerCase().includes(searchTerm),
                    product.ItemDescription?.toLowerCase().includes(searchTerm)
                ].some(Boolean);
                
                if (matches) {
                    results.push({
                        id: doc.id,
                        ...product
                    });
                }
            });
            
            displaySearchResults(results);
        }
        
        function showMockResults(term) {
            const mockResults = [
                {
                    id: '1',
                    Model: 'Samsung Refrigerator RF28R7201SR',
                    Brand: 'Samsung',
                    Category: 'Refrigerators',
                    UnitRetail: 1899.99,
                    images: []
                },
                {
                    id: '2',
                    Model: 'LG Washer WM4000HWA',
                    Brand: 'LG',
                    Category: 'Washers',
                    UnitRetail: 1099.99,
                    images: []
                }
            ].filter(item => 
                item.Model.toLowerCase().includes(term) || 
                item.Brand.toLowerCase().includes(term) ||
                item.Category.toLowerCase().includes(term)
            );
            
            displaySearchResults(mockResults);
        }
        
        function displaySearchResults(results) {
            searchResults.innerHTML = '';
            
            if (results.length === 0) {
                searchResults.innerHTML = `
                    <li class="no-results">
                        <i class="fas fa-search"></i>
                        <span>No products found</span>
                    </li>
                `;
                searchResults.classList.add('active');
                return;
            }
            
            results.forEach(product => {
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.dataset.id = product.id;
                
                const imageSrc = product.images && product.images.length > 0 ? 
                    (product.images[0].startsWith('data:') ? product.images[0] : `data:image/jpeg;base64,${product.images[0]}`) : 
                    'https://via.placeholder.com/50x50?text=No+Image';
                
                li.innerHTML = `
                    <img src="${imageSrc}" alt="${product.Model || 'Product'}" class="result-thumbnail" 
                         onerror="this.src='https://via.placeholder.com/50x50?text=Image'">
                    <div class="result-info">
                        <h4>${product.Model || 'No model specified'}</h4>
                        <p class="result-brand">${product.Brand || 'No brand'}</p>
                        <p class="result-category">${product.Category || ''}</p>
                    </div>
                    <div class="result-price">${product.UnitRetail ? '$' + product.UnitRetail.toLocaleString() : 'N/A'}</div>
                `;
                
                li.addEventListener('click', () => {
                    if (product.id) {
                        window.location.href = `product-details.html?id=${product.id}`;
                    }
                });
                
                searchResults.appendChild(li);
            });
            
            searchResults.classList.add('active');
        }
        
        function showSearchError() {
            searchResults.innerHTML = `
                <li class="search-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error loading results</span>
                </li>
            `;
            searchResults.classList.add('active');
        }
    }
    
    function markActiveLink() {
        const currentPath = window.location.pathname.replace(/\/$/, '');
        const navLinks = document.querySelectorAll('.navbar-main-menu a');

        navLinks.forEach(link => {
            const linkPath = link
                .getAttribute('href')
                .replace(window.location.origin, '')
                .replace(/\/$/, '');

            if (
                currentPath === linkPath ||
                currentPath.startsWith(linkPath + '/')
            ) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    // =============================================
    // API PÚBLICA
    // =============================================
    
    window.NavbarComplete = {
        toggleMenu: function() {
            const hamburgerBtn = document.getElementById('navbarHamburger');
            if (hamburgerBtn) hamburgerBtn.click();
        },
        
        toggleDarkMode: function() {
            const darkModeBtn = document.getElementById('darkModeToggle');
            if (darkModeBtn) darkModeBtn.click();
        },
        
        search: function(query) {
            const searchInput = document.getElementById('navbar-search-input');
            if (searchInput) {
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.focus();
            }
        },
        
        getCurrentMode: function() {
            return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        }
    };
    
    // =============================================
    // CARGAR RECURSOS NECESARIOS
    // =============================================
    
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }
    
    if (!document.querySelector('link[href*="poppins"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }
    
})();