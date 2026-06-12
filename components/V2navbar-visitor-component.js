// navbar-visitor-component.js - Sin buscador
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
        if (window.ThemeManager) {
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
                .navbar-top-section {
                    padding: 15px 8px;
                    position: relative;
                    flex-wrap: nowrap;
                }
                
                .navbar-hamburger-btn {
                    display: block;
                    order: 1;
                    margin-right: 15px;
                    margin-left: 0;
                }
                
                .navbar-brand {
                    order: 2;
                    flex: 1;
                    text-align: center;
                    justify-content: center;
                }
                
                .dark-mode-toggle-btn {
                    order: 3;
                    margin-left: auto;
                    margin-right: 15px;
                    display: flex;
                    background: rgba(10, 37, 64, 0.1);
                }
                
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
                
                body.mobile-menu-open {
                    overflow: hidden;
                }
            }
            
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
            
            .dark-mode .navbar-mobile-overlay {
                background: rgba(0, 0, 0, 0.7);
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
    
    function setupDarkMode() {
        const darkModeBtn = document.getElementById('darkModeToggle');
        if (!darkModeBtn) return;
        
        function updateDarkModeIcon() {
            if (!darkModeBtn) return;
            const isDarkMode = document.body.classList.contains('dark-mode');
            darkModeBtn.innerHTML = isDarkMode ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
        
        if (window.ThemeManager) {
            updateDarkModeIcon();
            
            darkModeBtn.addEventListener('click', () => {
                const newTheme = window.ThemeManager.toggle();
                updateDarkModeIcon();
                console.log(`🌙 Tema cambiado a: ${newTheme}`);
            });
            
            window.ThemeManager.onThemeChange((isDarkMode) => {
                updateDarkModeIcon();
            });
        } else {
            const savedMode = localStorage.getItem('darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            let isDarkMode = savedMode !== null ? savedMode === 'true' : prefersDark;
            
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            }
            
            darkModeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                updateDarkModeIcon();
                localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
                console.log(`🌙 Modo oscuro ${document.body.classList.contains('dark-mode') ? 'activado' : 'desactivado'}`);
            });
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