// float-buttons-component.js - Botón flotante de WhatsApp simplificado
(function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN INICIAL
    // =============================================
    
    if (window.FloatButtonsLoaded) {
        console.log('🔄 Float Buttons ya cargado, omitiendo...');
        return;
    }
    window.FloatButtonsLoaded = true;
    
    console.log('🎯 Iniciando Float Buttons Component (WhatsApp only)...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
    
    async function init() {
        try {
            removeOriginalFloatButtons();
            await createFloatButtonsComponent();
            setupWhatsAppFunctionality();
            console.log('✅ Float Buttons Component inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar Float Buttons:', error);
        }
    }
    
    function removeOriginalFloatButtons() {
        const originalFloatButtons = document.querySelector('.float-buttons');
        if (originalFloatButtons) {
            originalFloatButtons.remove();
            console.log('🗑️ Float buttons original removido');
        }
    }
    
    // =============================================
    // CREAR COMPONENTE DE BOTÓN FLOTANTE
    // =============================================
    
    async function createFloatButtonsComponent() {
        addFloatButtonsStyles();
        createFloatButtonsHTML();
    }
    
    function addFloatButtonsStyles() {
        const styleId = 'float-buttons-styles';
        if (document.getElementById(styleId)) return;
        
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent =/*css*/ `
            /* ====== VARIABLES DE COLOR ====== */
            :root {
                --primary: #0a2540;
                --accent: #f5d742;
                --white: #ffffff;
                --shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
                --transition: all 0.3s ease-in-out;
            }
            
            /* ====== BOTÓN FLOTANTE ====== */
            .float-buttons-container {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 15px;
                transition: var(--transition);
                animation: fadeIn 0.5s ease-out;
            }
            
            /* Botón flotante base */
            .float-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: var(--shadow-lg);
                transition: var(--transition);
                border: none;
                font-size: 24px;
                position: relative;
                text-decoration: none;
                user-select: none;
            }
            
            /* Efectos hover y active */
            .float-btn:hover {
                transform: translateY(-5px) scale(1.05);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
            }
            
            .float-btn:active {
                transform: translateY(-2px) scale(0.95);
            }
            
            /* Botón de WhatsApp */
            .whatsapp-btn {
                background-color: #25D366;
                color: white;
            }
            
            .whatsapp-btn:hover {
                background-color: #128C7E;
            }
            
            /* ====== RESPONSIVE - MÓVIL ====== */
            @media (max-width: 768px) {
                .float-buttons-container {
                    bottom: 20px;
                    right: 20px;
                }
                
                .float-btn {
                    width: 50px;
                    height: 50px;
                    font-size: 20px;
                }
            }
            
            @media (max-width: 480px) {
                .float-buttons-container {
                    bottom: 15px;
                    right: 15px;
                }
                
                .float-btn {
                    width: 45px;
                    height: 45px;
                    font-size: 18px;
                }
            }
            
            /* ====== ANIMACIONES ====== */
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    function createFloatButtonsHTML() {
        const floatButtonsContainer = document.createElement('div');
        floatButtonsContainer.className = 'float-buttons-container';
        floatButtonsContainer.id = 'floatButtonsContainer';
        
        floatButtonsContainer.innerHTML =/*html*/ `
            <!-- Botón de WhatsApp -->
            <a href="https://wa.me/17147279106?text=Hello!%20I%20want%20more%20information%20about%20your%20products." 
               class="float-btn whatsapp-btn" 
               target="_blank" 
               rel="noopener noreferrer"
               title="Chat on WhatsApp">
                <i class="fab fa-whatsapp"></i>
            </a>
        `;
        
        document.body.appendChild(floatButtonsContainer);
    }
    
    // =============================================
    // CONFIGURAR FUNCIONALIDADES
    // =============================================
    
    function setupWhatsAppFunctionality() {
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                console.log('📱 WhatsApp button clicked');
                
                // Ejemplo de Google Analytics (si está configurado)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'whatsapp_click', {
                        'event_category': 'engagement',
                        'event_label': 'float_button'
                    });
                }
            });
        }
    }
    
    // =============================================
    // API PÚBLICA DEL COMPONENTE
    // =============================================
    
    window.FloatButtonsComponent = {
        // Control de visibilidad
        show: function() {
            const container = document.getElementById('floatButtonsContainer');
            if (container) {
                container.style.display = 'flex';
            }
        },
        
        hide: function() {
            const container = document.getElementById('floatButtonsContainer');
            if (container) {
                container.style.display = 'none';
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
    
    console.log('✅ Float Buttons Component (WhatsApp only) cargado y listo');
})();