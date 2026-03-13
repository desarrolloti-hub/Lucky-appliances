// footer-component.js - Componente autónomo de footer (CORREGIDO para modo oscuro)
(function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN INICIAL
    // =============================================
    
    if (window.FooterComponentLoaded) {
        console.log('🔄 Footer component ya cargado, omitiendo...');
        return;
    }
    window.FooterComponentLoaded = true;
    
    console.log('🚀 Iniciando footer component...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
    
    async function init() {
        try {
            removeOriginalFooter();
            await createFooterComponent();
            setupFooterFunctionalities();
            observeDarkMode();
            console.log('✅ Footer component inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar footer:', error);
        }
    }
    
    function removeOriginalFooter() {
        const originalFooter = document.querySelector('footer');
        if (originalFooter) {
            originalFooter.remove();
            console.log('🗑️ Footer original removido');
        }
    }
    
    // =============================================
    // CREAR FOOTER COMPONENT
    // =============================================
    
    async function createFooterComponent() {
        addFooterStyles();
        createFooterHTML();
    }
    
    function addFooterStyles() {
        const styleId = 'footer-component-styles';
        if (document.getElementById(styleId)) return;
        
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent =/*css*/ `
            /* ====== ESTILOS DEL FOOTER ====== */
            * {
                box-sizing: border-box;
                    margin: 0;
                padding: 0;
            }
            .footer-component {
                background-color: var(--primary-dark, #061a2d);
                color: var(--white, #ffffff);
                width: 100%;
                font-family: 'Poppins', sans-serif;
            }
            
            /* Contenido principal del footer */
            .footer-content {
                background-color: var(--primary-dark, #061a2d);
                padding: 80px 0 40px;
            }
            
            .footer-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            /* Grid del footer */
            .footer-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 40px;
            }
            
            /* Columnas del footer */
            .footer-col h3 {
                font-size: 20px;
                margin-bottom: 25px;
                position: relative;
                padding-bottom: 10px;
                color: var(--white, #ffffff) !important;
            }
            
            .footer-col h3::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 50px;
                height: 2px;
                background-color: var(--accent, #f5d742);
            }
            
            /* Logo en el footer */
            .footer-logo {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .footer-logo-img {
                height: 40px;
            }
            
            .footer-logo span {
                font-weight: 700;
                font-size: 20px;
                color: var(--white, #ffffff) !important;
            }
            
            /* Texto "about" */
            .footer-about {
                margin-bottom: 20px;
                opacity: 0.8;
                font-size: 15px;
                line-height: 1.6;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            /* Social icons */
            .footer-social {
                display: flex;
                gap: 15px;
                margin-top: 20px;
            }
            
            .footer-social a {
                width: 40px;
                height: 40px;
                background-color: rgba(255, 255, 255, 0.1);
                color: var(--white, #ffffff) !important;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease-in-out;
                text-decoration: none;
            }
            
            .footer-social a:hover {
                background-color: var(--accent, #f5d742);
                color: var(--primary, #0a2540) !important;
                transform: translateY(-3px);
            }
            
            /* Links del footer */
            .footer-links {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .footer-links li {
                margin-bottom: 12px;
            }
            
            .footer-links a {
                color: rgba(255, 255, 255, 0.7) !important;
                text-decoration: none;
                transition: all 0.3s ease-in-out;
                display: flex;
                align-items: center;
                font-size: 15px;
            }
            
            .footer-links a:hover {
                color: var(--accent, #f5d742) !important;
                padding-left: 5px;
            }
            
            .footer-links a i {
                margin-right: 8px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7) !important;
            }
            
            .footer-links a:hover i {
                color: var(--accent, #f5d742) !important;
            }
            
            /* Información de contacto */
            .footer-contact {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .footer-contact li {
                display: flex;
                align-items: flex-start;
                margin-bottom: 15px;
                font-size: 15px;
                line-height: 1.5;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            .footer-contact i {
                margin-right: 15px;
                color: var(--accent, #f5d742) !important;
                font-size: 18px;
                margin-top: 3px;
                min-width: 20px;
            }
            
            .footer-contact span {
                flex: 1;
                opacity: 0.8;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            /* Sección inferior del footer */
            .footer-bottom {
                background-color: var(--primary, #0a2540);
                padding: 20px 0;
            }
            
            .footer-bottom-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            .footer-bottom-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .copyright {
                font-size: 14px;
                opacity: 0.8;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            .copyright a {
                color: rgba(255, 255, 255, 0.9) !important;
                text-decoration: underline;
            }
            
            .copyright a:hover {
                color: var(--accent, #f5d742) !important;
            }
            
            .footer-legal {
                display: flex;
                gap: 20px;
            }
            
            .footer-legal a {
                color: rgba(255, 255, 255, 0.7) !important;
                text-decoration: none;
                font-size: 14px;
                transition: all 0.3s ease-in-out;
            }
            
            .footer-legal a:hover {
                color: var(--accent, #f5d742) !important;
            }
            
            /* ====== RESPONSIVE ====== */
            @media (max-width: 768px) {
                .footer-content {
                    padding: 60px 0 30px;
                }
                
                .footer-grid {
                    gap: 30px;
                }
                
                .footer-bottom-content {
                    flex-direction: column;
                    text-align: center;
                    gap: 15px;
                }
                
                .footer-legal {
                    justify-content: center;
                }
            }
            
            @media (max-width: 480px) {
                .footer-content {
                    padding: 40px 0 20px;
                }
                
                .footer-grid {
                    grid-template-columns: 1fr;
                    gap: 25px;
                }
                
                .footer-col h3 {
                    font-size: 18px;
                    margin-bottom: 20px;
                }
                
                .footer-about {
                    font-size: 14px;
                }
                
                .footer-links a,
                .footer-contact li {
                    font-size: 14px;
                }
                
                .footer-contact i {
                    font-size: 16px;
                }
            }
            
            /* ====== MODO OSCURO - ASEGURAR CONTRASTE ====== */
            .dark-mode .footer-component {
                background-color: #0a1a2d !important;
            }
            
            .dark-mode .footer-content {
                background-color: #0a1a2d !important;
            }
            
            .dark-mode .footer-bottom {
                background-color: #1a253a !important;
            }
            
            /* Forzar colores de texto en modo oscuro */
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
                background-color: rgba(255, 255, 255, 0.15);
            }
            
            .dark-mode .footer-social a:hover {
                background-color: var(--accent, #f5d742);
                color: var(--primary-dark, #061a2d) !important;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    function createFooterHTML() {
        const footer = document.createElement('footer');
        footer.className = 'footer-component';
        
        footer.innerHTML =/*html*/ `
            <div class="footer-content">
                <div class="footer-container">
                    <div class="footer-grid">
                        <!-- Columna 1: Logo y descripción -->
                        <div class="footer-col">
                            <div class="footer-logo">
                                <img src="/assets/icons/Logo Lucky Apliances.png" alt="Lucky Appliances" class="footer-logo-img">
                                <span>Lucky Appliances</span>
                            </div>
                            <p class="footer-about">Premium home appliances distributor with over 15 years of experience bringing luxury and innovation to your home.</p>
                            <div class="footer-social">
                                <a href="https://offerup.co/EvZ0XL5XLTb" target="_blank" title="OfferUp">
                                    <i class="fas fa-store"></i>
                                </a>
                                <a href="https://wa.me/17147279106?text=Hello!%20I%20want%20more%20information%20about%20your%20products." target="_blank" title="WhatsApp">
                                    <i class="fab fa-whatsapp"></i>
                                </a>
                                <a href="https://www.facebook.com/share/1B7jKatnwR/?mibextid=wwXIfr" target="_blank" title="Facebook Messenger">
                                    <i class="fab fa-facebook-messenger"></i>
                                </a>
                            </div>
                        </div>
                        
                        <!-- Columna 2: Quick Links -->
                        <div class="footer-col">
                            <h3>Quick Links</h3>
                            <ul class="footer-links">
                                <li><a href="/index.html"><i class="fas fa-chevron-right"></i> Home</a></li>
                                <li><a href="/users/visitors/aboutUs/aboutUs.html"><i class="fas fa-chevron-right"></i> About Us</a></li>
                                <li><a href="/users/visitors/products/products.html"><i class="fas fa-chevron-right"></i> Products</a></li>
                                <li><a href="/users/visitors/login/login.html"><i class="fas fa-chevron-right"></i> Login</a></li>
                            </ul>
                        </div>
                        
                        <!-- Columna 3: Customer Service -->
                        <div class="footer-col">
                            <h3>Customer Service</h3>
                            <ul class="footer-links">
                                <li><a href="contact.html"><i class="fas fa-chevron-right"></i> Contact Us</a></li>
                            </ul>
                        </div>
                        
                        <!-- Columna 4: Contact Info -->
                        <div class="footer-col">
                            <h3>Contact Info</h3>
                            <ul class="footer-contact">
                                <li>
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>3990 W Russell Rd Suite 6, Las Vegas, NV, 89118</span>
                                </li>
                                <li>
                                    <i class="fas fa-phone-alt"></i>
                                    <span>(725) 300-1480</span>
                                </li>
                                <li>
                                    <i class="fas fa-phone-alt"></i>
                                    <span>(714) 727-9106</span>
                                </li>
                                <li>
                                    <i class="fas fa-phone-alt"></i>
                                    <span>(702) 910-0979</span>
                                </li>
                                <li>
                                    <i class="fas fa-envelope"></i>
                                    <span>luckyappliancesllc@gmail.com</span>
                                </li>
                                <li>
                                    <i class="fas fa-clock"></i>
                                    <span>Mon-Fri: 9AM-6PM | Sat: 9AM-6PM</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer-bottom">
                <div class="footer-bottom-container">
                    <div class="footer-bottom-content">
                        <p class="copyright">
                            Application developed by 
                            <a href="https://rsienterprise.com" target="_blank">
                                RSI Enterprise Mexico
                            </a>.
                        </p>
                        <div class="footer-legal">
                            <a href="404.html">Policies</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(footer);
    }
    
    // =============================================
    // CONFIGURAR FUNCIONALIDADES DEL FOOTER
    // =============================================
    
    function setupFooterFunctionalities() {
        // Asegurar que los enlaces externos se abran en nueva pestaña
        const externalLinks = document.querySelectorAll('.footer-component a[href^="http"]');
        externalLinks.forEach(link => {
            if (!link.href.includes(window.location.hostname)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
        
        // Aplicar modo oscuro inicial si está activo
        applyDarkModeInitial();
        
        console.log('🔧 Funcionalidades del footer configuradas');
    }
    
    function applyDarkModeInitial() {
        if (document.body.classList.contains('dark-mode')) {
            // Forzar colores de texto en modo oscuro
            const footer = document.querySelector('.footer-component');
            if (footer) {
                footer.classList.add('dark-mode');
            }
        }
    }
    
    // REEMPLAZA esta función en footer-visitor-component.js
    function observeDarkMode() {
        // Usar ThemeManager si está disponible
        if (window.ThemeManager) {
            window.ThemeManager.onThemeChange((isDarkMode) => {
                const footer = document.querySelector('.footer-component');
                if (footer) {
                    if (isDarkMode) {
                        footer.classList.add('dark-mode');
                    } else {
                        footer.classList.remove('dark-mode');
                    }
                }
            });
            
            // Aplicar estado inicial
            const isDarkMode = window.ThemeManager.isDarkMode();
            const footer = document.querySelector('.footer-component');
            if (footer && isDarkMode) {
                footer.classList.add('dark-mode');
            }
        } else {
            // Fallback al método anterior
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const footer = document.querySelector('.footer-component');
                        if (footer) {
                            if (document.body.classList.contains('dark-mode')) {
                                footer.classList.add('dark-mode');
                            } else {
                                footer.classList.remove('dark-mode');
                            }
                        }
                    }
                });
            });
            
            observer.observe(document.body, { attributes: true });
        }
    }
    
    // =============================================
    // API PÚBLICA
    // =============================================
    
    window.FooterComponent = {
        refresh: function() {
            // Método para refrescar el footer si es necesario
            console.log('🔄 Footer actualizado');
            // Re-aplicar modo oscuro si está activo
            if (document.body.classList.contains('dark-mode')) {
                const footer = document.querySelector('.footer-component');
                if (footer) {
                    footer.classList.add('dark-mode');
                }
            }
        },
        
        getVersion: function() {
            return '1.1.0'; // Versión actualizada
        },
        
        // En footer-visitor-component.js, dentro de window.FooterComponent
        applyDarkMode: function(enable) {
            const footer = document.querySelector('.footer-component');
            if (footer) {
                if (enable) {
                    footer.classList.add('dark-mode');
                } else {
                    footer.classList.remove('dark-mode');
                }
            }
        }
    };
    
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
    
    // Verificar si la fuente Poppins ya está cargada
    if (!document.querySelector('link[href*="poppins"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }
    
    console.log('✅ Footer component cargado y listo');
})();