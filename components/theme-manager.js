// theme-manager.js - Gestor global de tema oscuro/claro con TODOS los estilos
(function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN INICIAL
    // =============================================
    
    if (window.ThemeManagerLoaded) {
        console.log('🔄 Theme Manager ya cargado, omitiendo...');
        return;
    }
    window.ThemeManagerLoaded = true;
    
    console.log('🎨 Iniciando Theme Manager...');
    
    // Inicializar inmediatamente para evitar flash de contenido
    initTheme();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', completeInit);
    } else {
        setTimeout(completeInit, 100);
    }
    
    function initTheme() {
        try {
            // Cargar tema guardado
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            let themeToApply;
            
            if (savedTheme === 'dark' || savedTheme === 'light') {
                themeToApply = savedTheme;
            } else if (savedTheme === 'auto') {
                themeToApply = prefersDark ? 'dark' : 'light';
            } else {
                // Si no hay tema guardado, usar preferencias del sistema
                themeToApply = prefersDark ? 'dark' : 'light';
                localStorage.setItem('theme', 'auto');
            }
            
            // Aplicar tema inmediatamente
            const isDarkMode = themeToApply === 'dark';
            
            if (isDarkMode) {
                document.documentElement.classList.add('dark-mode');
                document.body.classList.add('dark-mode');
            } else {
                document.documentElement.classList.remove('dark-mode');
                document.body.classList.remove('dark-mode');
            }
            
            console.log(`🎨 Tema aplicado: ${themeToApply} (dark-mode: ${isDarkMode})`);
            
        } catch (error) {
            console.error('❌ Error al inicializar tema:', error);
        }
    }
    
    async function completeInit() {
        try {
            addThemeManagerStyles();
            setupThemeAPI();
            setupSystemThemeListener();
            addSweetAlertStyles(); // Agregar estilos de SweetAlert2
            console.log('✅ Theme Manager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al completar inicialización:', error);
        }
    }
    
    function addThemeManagerStyles() {
        const styleId = 'theme-manager-styles';
        if (document.getElementById(styleId)) return;
        
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            /* ====== VARIABLES DE COLOR MODO CLARO ====== */
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
                --success: #28a745;
                --warning: #ffc107;
                --danger: #dc3545;
                --info: #17a2b8;
            }
            
            /* ====== VARIABLES DE COLOR MODO OSCURO ====== */
            :root.dark-mode {
                --primary: #1a365d;
                --primary-light: #2d4a7d;
                --primary-dark: #0a2540;
                --accent: #f5d742;
                --accent-dark: #e5c730;
                --accent-light: #fff5b8;
                --text: #e2e8f0;
                --text-light: #a0aec0;
                --light: #2d3748;
                --white: #1a253a;
                --gray: #4a5568;
                --dark-gray: #2d3748;
                --shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.4);
                --success: #38a169;
                --warning: #d69e2e;
                --danger: #e53e3e;
                --info: #3182ce;
            }
            
            /* ====== ESTILOS GLOBALES MODO OSCURO ====== */
            .dark-mode {
                background-color: var(--white) !important;
                color: var(--text) !important;
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            
            /* Body y elementos base */
            .dark-mode body {
                background-color: var(--white) !important;
                color: var(--text) !important;
            }
            
            /* Inputs y formularios */
            .dark-mode input,
            .dark-mode textarea,
            .dark-mode select {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode input:focus,
            .dark-mode textarea:focus,
            .dark-mode select:focus {
                border-color: var(--accent) !important;
                box-shadow: 0 0 0 0.2rem rgba(245, 215, 66, 0.25) !important;
            }
            
            /* Botones generales */
            .dark-mode .btn-primary {
                background-color: var(--primary) !important;
                border-color: var(--primary) !important;
                color: var(--white) !important;
            }
            
            .dark-mode .btn-secondary {
                background-color: var(--gray) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .btn-accent {
                background-color: var(--accent) !important;
                border-color: var(--accent) !important;
                color: var(--primary) !important;
            }
            
            /* Tarjetas y contenedores */
            .dark-mode .card,
            .dark-mode .panel,
            .dark-mode .container-light,
            .dark-mode .bg-light {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .bg-white {
                background-color: var(--white) !important;
            }
            
            /* Tablas */
            .dark-mode table {
                background-color: var(--white) !important;
                color: var(--text) !important;
                border-color: var(--gray) !important;
            }
            
            .dark-mode table th {
                background-color: var(--primary) !important;
                color: var(--text) !important;
                border-color: var(--gray) !important;
            }
            
            .dark-mode table td {
                border-color: var(--gray) !important;
            }
            
            .dark-mode table tr:nth-child(even) {
                background-color: var(--light) !important;
            }
            
            /* Enlaces */
            .dark-mode a:not(.navbar-main-menu a):not(.footer-links a):not(.footer-legal a):not(.copyright a) {
                color: var(--accent) !important;
            }
            
            .dark-mode a:hover:not(.navbar-main-menu a):not(.footer-links a):not(.footer-legal a):not(.copyright a) {
                color: var(--accent-light) !important;
            }
            
            /* Títulos */
            .dark-mode h1,
            .dark-mode h2,
            .dark-mode h3,
            .dark-mode h4,
            .dark-mode h5,
            .dark-mode h6 {
                color: var(--text) !important;
            }
            
            /* Textos */
            .dark-mode .text-dark {
                color: var(--text) !important;
            }
            
            .dark-mode .text-light {
                color: var(--text-light) !important;
            }
            
            /* Alertas y mensajes */
            .dark-mode .alert-success {
                background-color: rgba(56, 161, 105, 0.2) !important;
                border-color: var(--success) !important;
                color: #c6f6d5 !important;
            }
            
            .dark-mode .alert-warning {
                background-color: rgba(214, 158, 46, 0.2) !important;
                border-color: var(--warning) !important;
                color: #fefcbf !important;
            }
            
            .dark-mode .alert-danger {
                background-color: rgba(229, 62, 62, 0.2) !important;
                border-color: var(--danger) !important;
                color: #fed7d7 !important;
            }
            
            .dark-mode .alert-info {
                background-color: rgba(49, 130, 206, 0.2) !important;
                border-color: var(--info) !important;
                color: #c3dafe !important;
            }
            
            /* Listas */
            .dark-mode ul,
            .dark-mode ol {
                color: var(--text) !important;
            }
            
            /* ====== ESTILOS ESPECÍFICOS PARA COMPONENTES ====== */
            
            /* NAVBAR - Eliminar estilos duplicados del navbar */
            .dark-mode #complete-navbar {
                background-color: rgba(26, 37, 58, 0.95) !important;
            }
            
            .dark-mode #complete-navbar.scrolled {
                background-color: var(--white) !important;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3) !important;
            }
            
            .dark-mode .navbar-brand {
                color: var(--text) !important;
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
                border-bottom-color: var(--gray) !important;
            }
            
            .dark-mode .hamburger-line {
                background-color: var(--text) !important;
            }
            
            .dark-mode .dark-mode-toggle-btn {
                color: var(--text) !important;
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            .dark-mode .dark-mode-toggle-btn:hover {
                background-color: rgba(255, 255, 255, 0.2) !important;
            }
            
            .dark-mode #navbar-search-input {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode #navbar-search-input:focus {
                border-color: var(--accent) !important;
                box-shadow: 0 2px 15px rgba(245, 215, 66, 0.3) !important;
            }
            
            .dark-mode .navbar-search-section {
                background-color: var(--white) !important;
                border-top-color: var(--gray) !important;
            }
            
            .dark-mode .search-results-dropdown {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
            }
            
            .dark-mode .search-result-item {
                border-bottom-color: var(--gray) !important;
            }
            
            .dark-mode .search-result-item:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            .dark-mode .result-info h4 {
                color: var(--text) !important;
            }
            
            .dark-mode .result-brand {
                color: var(--text-light) !important;
            }
            
            .dark-mode .result-category {
                color: var(--text-light) !important;
            }
            
            .dark-mode .result-price {
                color: var(--accent) !important;
            }
            
            .dark-mode .navbar-mobile-overlay {
                background: rgba(0, 0, 0, 0.7) !important;
            }
            
            .dark-mode .search-loading,
            .dark-mode .search-error,
            .dark-mode .no-results {
                color: var(--text-light) !important;
            }
            
            /* FOOTER - Eliminar estilos duplicados del footer */
            .dark-mode .footer-component {
                background-color: #0a1a2d !important;
            }
            
            .dark-mode .footer-content {
                background-color: #0a1a2d !important;
            }
            
            .dark-mode .footer-bottom {
                background-color: #1a253a !important;
            }
            
            /* Forzar colores de texto en modo oscuro para footer */
            .dark-mode .footer-col h3,
            .dark-mode .footer-logo span,
            .dark-mode .footer-about,
            .dark-mode .footer-links a,
            .dark-mode .footer-contact li,
            .dark-mode .footer-contact span,
            .dark-mode .copyright,
            .dark-mode .footer-legal a {
                color: rgba(255, 255, 255, 0.9) !important;
            }
            
            .dark-mode .footer-links a:hover,
            .dark-mode .footer-legal a:hover,
            .dark-mode .copyright a:hover {
                color: var(--accent, #f5d742) !important;
            }
            
            .dark-mode .footer-social a {
                color: rgba(255, 255, 255, 0.9) !important;
                background-color: rgba(255, 255, 255, 0.15) !important;
            }
            
            .dark-mode .footer-social a:hover {
                background-color: var(--accent, #f5d742) !important;
                color: var(--accent-dark, #061a2d) !important;
            }
            
            /* ====== ESTILOS PARA PÁGINAS COMUNES ====== */
            
            /* Página de login/registro */
            .dark-mode .login-container,
            .dark-mode .register-container {
                background-color: var(--white) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .login-card,
            .dark-mode .register-card {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
            }
            
            /* Página de productos */
            .dark-mode .product-card {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
            }
            
            .dark-mode .product-price {
                color: var(--accent) !important;
            }
            
            /* Página de detalles */
            .dark-mode .product-details-container {
                background-color: var(--white) !important;
            }
            
            .dark-mode .product-info-card {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
            }
            
            /* Formularios generales */
            .dark-mode .form-group label {
                color: var(--text) !important;
            }
            
            .dark-mode .form-control {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .form-control:focus {
                border-color: var(--accent) !important;
                box-shadow: 0 0 0 0.2rem rgba(245, 215, 66, 0.25) !important;
            }
            
            /* Modales */
            .dark-mode .modal-content {
                background-color: var(--light) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .modal-header,
            .dark-mode .modal-footer {
                border-color: var(--gray) !important;
            }
            
            /* Dropdowns */
            .dark-mode .dropdown-menu {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
            }
            
            .dark-mode .dropdown-item {
                color: var(--text) !important;
            }
            
            .dark-mode .dropdown-item:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            /* Badges y tags */
            .dark-mode .badge-primary {
                background-color: var(--accent) !important;
                color: var(--white) !important;
            }
            
            .dark-mode .badge-secondary {
                background-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            /* Transición suave para cambios de tema */
            * {
                transition: background-color 0.3s ease, 
                          border-color 0.3s ease, 
                          color 0.3s ease,
                          box-shadow 0.3s ease !important;
            }
            
            /* Excepciones para transiciones innecesarias */
            .no-theme-transition,
            .no-theme-transition * {
                transition: none !important;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // =============================================
    // ESTILOS PARA SWEETALERT2 (NUEVA FUNCIÓN)
    // =============================================
    
    function addSweetAlertStyles() {
        const styleId = 'sweetalert2-theme-styles';
        if (document.getElementById(styleId)) return;
        
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            /* ====== ESTILOS PARA SWEETALERT2 ====== */
            
            /* Alertas principales */
            .swal2-popup {
                border-radius: var(--border-radius-lg) !important;
                background-color: var(--white) !important;
                color: var(--text) !important;
                font-family: 'Poppins', sans-serif !important;
                border: 1px solid var(--gray) !important;
                box-shadow: var(--shadow-lg) !important;
                padding: 2rem !important;
                width: auto !important;
                max-width: 500px !important;
                transition: var(--transition) !important;
            }
            
            /* Títulos */
            .swal2-title {
                color: var(--accent) !important;
                font-size: 1.5rem !important;
                font-weight: 600 !important;
                margin-bottom: 1rem !important;
                padding: 0 !important;
                line-height: 1.4 !important;
            }
            
            /* Contenido */
            .swal2-html-container {
                color: var(--text-light) !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                margin: 1rem 0 !important;
                padding: 0 !important;
            }
            
            /* Contenedor de acciones */
            .swal2-actions {
                margin: 1.5rem 0 0 0 !important;
                gap: 0.75rem !important;
                flex-wrap: nowrap !important;
            }
            
            /* Botones */
            .swal2-confirm,
            .swal2-deny,
            .swal2-cancel {
                border-radius: var(--border-radius) !important;
                font-weight: 500 !important;
                font-size: 0.95rem !important;
                padding: 0.75rem 1.5rem !important;
                transition: all 0.3s ease !important;
                font-family: 'Poppins', sans-serif !important;
                border: 2px solid transparent !important;
                min-width: 100px !important;
                margin: 0 !important;
                box-shadow: none !important;
            }
            
            /* Botón principal */
            .swal2-confirm {
                background-color: var(--accent) !important;
                border-color: var(--accent) !important;
                color: var(--white) !important;
            }
            
            .swal2-confirm:hover {
                background-color: var(--accent-light) !important;
                border-color: var(--accent-light) !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(10, 37, 64, 0.3) !important;
            }
            
            .swal2-confirm:focus {
                box-shadow: 0 0 0 3px rgba(10, 37, 64, 0.5) !important;
            }
            
            /* Botón secundario */
            .swal2-cancel {
                background-color: var(--gray) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .swal2-cancel:hover {
                background-color: var(--dark-gray) !important;
                border-color: var(--dark-gray) !important;
                color: var(--white) !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(52, 58, 64, 0.3) !important;
            }
            
            /* Botón de peligro */
            .swal2-deny {
                background-color: var(--danger) !important;
                border-color: var(--danger) !important;
                color: var(--white) !important;
            }
            
            .swal2-deny:hover {
                background-color: #c82333 !important;
                border-color: #c82333 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3) !important;
            }
            
            /* Toast notifications */
            .swal2-toast {
                background-color: var(--white) !important;
                color: var(--text) !important;
                border: 1px solid var(--gray) !important;
                border-radius: var(--border-radius) !important;
                box-shadow: var(--shadow) !important;
                font-family: 'Poppins', sans-serif !important;
                padding: 1rem 1.25rem !important;
                width: auto !important;
                min-width: 300px !important;
            }
            
            .swal2-toast .swal2-title {
                font-size: 1rem !important;
                margin-bottom: 0.5rem !important;
            }
            
            .swal2-toast .swal2-html-container {
                font-size: 0.9rem !important;
                margin: 0 !important;
            }
            
            /* Progress bar */
            .swal2-timer-progress-bar {
                background-color: var(--accent) !important;
                height: 3px !important;
                border-radius: 0 0 var(--border-radius) var(--border-radius) !important;
            }
            
            /* Iconos */
            /*.swal2-icon {
                border-width: 4px !important;
                margin: 1rem auto 1rem !important;
                width: 4rem !important;
                height: 4rem !important;
            }*/ /*verificar funcionamiento mas adelante VRC 19/12/2025*/
            
            /* Icono éxito */
            .swal2-icon.swal2-success {
                border-color: var(--success) !important;
                color: var(--success) !important;
            }
            
            .swal2-icon.swal2-success [class^="swal2-success-line"] {
                background-color: var(--success) !important;
            }
            
            .swal2-icon.swal2-success .swal2-success-ring {
                border-color: rgba(40, 167, 69, 0.3) !important;
            }
            
            /* Icono error */
            .swal2-icon.swal2-error {
                border-color: var(--danger) !important;
                color: var(--danger) !important;
            }
            
            .swal2-icon.swal2-error [class^="swal2-x-mark-line"] {
                background-color: var(--danger) !important;
            }
            
            /* Icono advertencia */
            .swal2-icon.swal2-warning {
                border-color: var(--warning) !important;
                color: var(--warning) !important;
            }
            
            /* Icono información */
            .swal2-icon.swal2-info {
                border-color: var(--info) !important;
                color: var(--info) !important;
            }
            
            /* Icono pregunta */
            .swal2-icon.swal2-question {
                border-color: var(--accent) !important;
                color: var(--accent) !important;
            }
            
            /* Inputs */
            .swal2-input,
            .swal2-textarea,
            .swal2-select,
            .swal2-file {
                border: 2px solid var(--gray) !important;
                border-radius: var(--border-radius) !important;
                background-color: var(--white) !important;
                color: var(--text) !important;
                font-family: 'Poppins', sans-serif !important;
                transition: var(--transition) !important;
                padding: 0.75rem !important;
                font-size: 0.95rem !important;
                width: 100% !important;
                margin: 0.5rem 0 !important;
            }
            
            .swal2-input:focus,
            .swal2-textarea:focus,
            .swal2-select:focus,
            .swal2-file:focus {
                border-color: var(--accent) !important;
                box-shadow: 0 0 0 3px rgba(245, 215, 66, 0.25) !important;
                outline: none !important;
            }
            
            /* Spinner de carga */
            .swal2-loader {
                border-color: var(--accent) transparent var(--accent) transparent !important;
            }
            
            /* Footer */
            .swal2-footer {
                border-top: 1px solid var(--gray) !important;
                color: var(--text-light) !important;
                font-size: 0.9rem !important;
                padding: 1rem 0 0 0 !important;
                margin: 1rem 0 0 0 !important;
            }
            
            /* Close button */
            .swal2-close {
                color: var(--text-light) !important;
                font-size: 1.75rem !important;
                transition: color 0.3s ease !important;
            }
            
            .swal2-close:hover {
                color: var(--danger) !important;
            }
            
            /* ====== MODO OSCURO ====== */
            
            .dark-mode .swal2-popup {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .swal2-title {
                color: var(--text) !important;
            }
            
            .dark-mode .swal2-html-container {
                color: var(--text-light) !important;
            }
            
            .dark-mode .swal2-toast {
                background-color: var(--light) !important;
                border-color: var(--gray) !important;
            }
            
            .dark-mode .swal2-input,
            .dark-mode .swal2-textarea,
            .dark-mode .swal2-select,
            .dark-mode .swal2-file {
                background-color: var(--white) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .swal2-confirm {
                background-color: var(--accent) !important;
                border-color: var(--accent) !important;
                color: var(--white) !important;
            }
            
            .dark-mode .swal2-confirm:hover {
                background-color: var(--accent-light) !important;
                border-color: var(--accent-light) !important;
            }
            
            .dark-mode .swal2-cancel {
                background-color: var(--gray) !important;
                border-color: var(--gray) !important;
                color: var(--text) !important;
            }
            
            .dark-mode .swal2-cancel:hover {
                background-color: var(--dark-gray) !important;
                border-color: var(--dark-gray) !important;
                color: var(--white) !important;
            }
            
            .dark-mode .swal2-deny {
                background-color: var(--danger) !important;
                border-color: var(--danger) !important;
                color: var(--white) !important;
            }
            
            .dark-mode .swal2-deny:hover {
                background-color: #e53e3e !important;
                border-color: #e53e3e !important;
            }
            
            .dark-mode .swal2-footer {
                border-color: var(--gray) !important;
                color: var(--text-light) !important;
            }
            
            /* ====== RESPONSIVE ====== */
            
            @media (max-width: 768px) {
                .swal2-popup {
                    width: 90% !important;
                    max-width: 400px !important;
                    padding: 1.5rem !important;
                    margin: 1rem !important;
                }
                
                .swal2-title {
                    font-size: 1.3rem !important;
                }
                
                .swal2-actions {
                    flex-direction: column !important;
                    width: 100% !important;
                }
                
                .swal2-confirm,
                .swal2-deny,
                .swal2-cancel {
                    width: 100% !important;
                    margin: 0.25rem 0 !important;
                }
                
                .swal2-toast {
                    min-width: 280px !important;
                    max-width: 90% !important;
                }
            }
            
            @media (max-width: 480px) {
                .swal2-popup {
                    padding: 1.25rem !important;
                }
                
                .swal2-title {
                    font-size: 1.2rem !important;
                }
                
                .swal2-html-container {
                    font-size: 0.95rem !important;
                }
                
                .swal2-toast {
                    padding: 0.875rem 1rem !important;
                    min-width: 250px !important;
                }
            }
        `;
        
        document.head.appendChild(styles);
        console.log('🎨 Estilos de SweetAlert2 aplicados');
    }
    
    function setupSystemThemeListener() {
        // Escuchar cambios en las preferencias del sistema
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Solo aplicar si el usuario no ha elegido un tema específico
            const savedTheme = localStorage.getItem('theme');
            if (!savedTheme || savedTheme === 'auto') {
                const newTheme = e.matches ? 'dark' : 'light';
                window.ThemeManager.setTheme('auto', true);
                console.log(`🎨 Tema del sistema cambiado, aplicando: ${newTheme}`);
            }
        });
    }
    
    function setupThemeAPI() {
        // API pública para controlar el tema
        window.ThemeManager = {
            // Cambiar tema
            setTheme: function(theme, isSystemChange = false) {
                if (['light', 'dark', 'auto'].includes(theme)) {
                    const isDarkMode = theme === 'dark' || 
                                      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    
                    // Aplicar clases
                    if (isDarkMode) {
                        document.documentElement.classList.add('dark-mode');
                        document.body.classList.add('dark-mode');
                    } else {
                        document.documentElement.classList.remove('dark-mode');
                        document.body.classList.remove('dark-mode');
                    }
                    
                    // Guardar preferencia (excepto si es cambio del sistema y ya está en auto)
                    if (!isSystemChange || (isSystemChange && localStorage.getItem('theme') === 'auto')) {
                        localStorage.setItem('theme', theme);
                    }
                    
                    // Disparar evento
                    const themeChangeEvent = new CustomEvent('themechange', {
                        detail: { 
                            theme: theme,
                            isDarkMode: isDarkMode,
                            isSystemChange: isSystemChange
                        }
                    });
                    window.dispatchEvent(themeChangeEvent);
                    
                    console.log(`🎨 Tema establecido: ${theme} (dark-mode: ${isDarkMode})`);
                    
                    // Actualizar botón del navbar si existe
                    this.updateNavbarButton(isDarkMode);
                    
                    return true;
                }
                return false;
            },
            
            // Obtener tema actual
            getTheme: function() {
                const saved = localStorage.getItem('theme');
                if (saved && ['light', 'dark', 'auto'].includes(saved)) {
                    return saved;
                }
                return 'auto'; // Por defecto
            },
            
            // Alternar entre claro/oscuro
            toggle: function() {
                const current = this.isDarkMode();
                const newTheme = current ? 'light' : 'dark';
                this.setTheme(newTheme);
                return newTheme;
            },
            
            // Verificar si es modo oscuro
            isDarkMode: function() {
                return document.body.classList.contains('dark-mode');
            },
            
            // Actualizar botón del navbar
            updateNavbarButton: function(isDarkMode) {
                const darkModeBtn = document.getElementById('darkModeToggle');
                if (darkModeBtn) {
                    darkModeBtn.innerHTML = isDarkMode ? 
                        '<i class="fas fa-sun"></i>' : 
                        '<i class="fas fa-moon"></i>';
                }
            },
            
            // Sincronizar con el botón del navbar
            syncWithNavbar: function() {
                const isDarkMode = this.isDarkMode();
                this.updateNavbarButton(isDarkMode);
                return isDarkMode;
            },
            
            // Forzar actualización
            refresh: function() {
                const theme = this.getTheme();
                return this.setTheme(theme);
            },
            
            // Agregar estilos específicos para un componente
            addComponentStyles: function(componentName, styles) {
                const styleId = `theme-${componentName}-styles`;
                let styleEl = document.getElementById(styleId);
                
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }
                
                styleEl.textContent = styles;
            },
            
            // Función específica para SweetAlert2
            setupSweetAlert: function() {
                console.log('🎨 Configurando SweetAlert2 con tema personalizado');
                // Los estilos ya están aplicados por addSweetAlertStyles()
            },
            
            // Eventos
            onThemeChange: function(callback) {
                window.addEventListener('themechange', (e) => {
                    callback(e.detail.isDarkMode, e.detail.theme);
                });
            },
            
            // Verificar compatibilidad
            hasLocalStorage: function() {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            // Obtener variables CSS
            getCSSVariable: function(varName) {
                return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            }
        };
        
        // Función global simple
        window.toggleDarkMode = function() {
            return window.ThemeManager.toggle();
        };
        
        // Actualizar botón del navbar inmediatamente si existe
        const isDarkMode = window.ThemeManager.isDarkMode();
        window.ThemeManager.updateNavbarButton(isDarkMode);
        
        // Configurar SweetAlert2 automáticamente
        window.ThemeManager.setupSweetAlert();
        
        // Notificar a otros componentes que el ThemeManager está listo
        window.dispatchEvent(new CustomEvent('thememodule:ready'));
    }
    
    // =============================================
    // CARGAR RECURSOS NECESARIOS
    // =============================================
    
    // Verificar si Font Awesome ya está cargado
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }
    
    console.log('✅ Theme Manager cargado y listo');
})();