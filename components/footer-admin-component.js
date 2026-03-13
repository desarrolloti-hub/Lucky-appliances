// footer-autoloader.js - Auto-loading footer for admin
(function() {
    'use strict';

    // Check if already loaded
    if (window.FooterAutoloaderLoaded) {
        console.log('🔄 Footer Autoloader already loaded, skipping...');
        return;
    }
    window.FooterAutoloaderLoaded = true;

    console.log('👣 Initializing Footer Autoloader...');

    // Load footer styles
    function loadFooterStyles() {
        const styleId = 'footer-autoloader-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            /* ====== FOOTER AUTOLOADER STYLES ====== */
            .autoloaded-footer {
                background: transparent !important;
                color: var(--text-light, #6c757d) !important;
                font-family: 'Poppins', sans-serif !important;
                font-size: 0.8rem !important;
                line-height: 1.4 !important;
                padding: 1rem 0 !important;
                margin-top: 2rem !important;
                border-top: none !important;
                transition: all 0.3s ease !important;
                width: 100% !important;
            }

            .footer-content-wrapper {
                max-width: 1400px !important;
                margin: 0 auto !important;
                padding: 0 20px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                flex-wrap: wrap !important;
                gap: 1rem !important;
            }

            .footer-copyright {
                margin: 0 !important;
                font-size: 0.8rem !important;
                opacity: 0.8 !important;
                color: var(--text-light, #6c757d) !important;
            }

            .footer-version {
                margin: 0 !important;
                font-size: 0.75rem !important;
                opacity: 0.7 !important;
                color: var(--text-light, #6c757d) !important;
                background: rgba(0, 0, 0, 0.05) !important;
                padding: 0.2rem 0.5rem !important;
                border-radius: 10px !important;
            }

            .footer-developer {
                margin: 0 !important;
                font-size: 0.8rem !important;
                opacity: 0.9 !important;
                display: flex !important;
                align-items: center !important;
                gap: 0.5rem !important;
                color: var(--text-light, #6c757d) !important;
            }

            .developer-link {
                color: var(--text-light, #6c757d) !important;
                text-decoration: none !important;
                display: flex !important;
                align-items: center !important;
                gap: 0.5rem !important;
                transition: all 0.3s ease !important;
                font-weight: 500 !important;
            }

            .developer-link:hover {
                color: var(--accent, #f5d742) !important;
                transform: translateY(-1px) !important;
            }

            .developer-logo {
                width: 20px !important;
                height: 20px !important;
                object-fit: contain !important;
                border-radius: 3px !important;
                vertical-align: middle !important;
            }

            .developer-text {
                font-weight: 500 !important;
            }

            /* ====== DARK MODE ====== */
            .dark-mode .autoloaded-footer {
                color: var(--text-light, #a0aec0) !important;
            }

            .dark-mode .footer-copyright,
            .dark-mode .footer-version,
            .dark-mode .footer-developer {
                color: var(--text-light, #a0aec0) !important;
            }

            .dark-mode .footer-version {
                background: rgba(255, 255, 255, 0.1) !important;
            }

            .dark-mode .developer-link {
                color: var(--text-light, #a0aec0) !important;
            }

            .dark-mode .developer-link:hover {
                color: var(--accent-light, #fff5b8) !important;
            }

            /* ====== RESPONSIVE ====== */
            @media (max-width: 768px) {
                .autoloaded-footer {
                    padding: 0.8rem 0 !important;
                    margin-top: 1.5rem !important;
                }

                .footer-content-wrapper {
                    flex-direction: column !important;
                    text-align: center !important;
                    gap: 0.5rem !important;
                    padding: 0 15px !important;
                }

                .footer-copyright,
                .footer-version,
                .footer-developer {
                    font-size: 0.75rem !important;
                }

                .developer-logo {
                    width: 18px !important;
                    height: 18px !important;
                }
            }

            @media (max-width: 480px) {
                .autoloaded-footer {
                    padding: 0.6rem 0 !important;
                    margin-top: 1rem !important;
                }

                .footer-content-wrapper {
                    gap: 0.3rem !important;
                }

                .footer-copyright,
                .footer-version,
                .footer-developer {
                    font-size: 0.7rem !important;
                }

                .developer-logo {
                    width: 16px !important;
                    height: 16px !important;
                }
            }

            /* ====== PRINT STYLES ====== */
            @media print {
                .autoloaded-footer {
                    color: #666 !important;
                    border-top: 1px solid #eee !important;
                }

                .developer-link {
                    color: #666 !important;
                }
            }
        `;

        document.head.appendChild(styles);
        console.log('🎨 Footer styles loaded');
    }

    // Create footer HTML
    function createFooter() {
        const currentYear = new Date().getFullYear();
        
        const footerHTML = `
            <footer class="autoloaded-footer" role="contentinfo">
                <div class="footer-content-wrapper">
                    <div class="footer-left">
                        <p class="footer-copyright">
                            © ${currentYear} Lucky Appliances. All rights reserved.
                        </p>
                        <p class="footer-version">
                            Version 3.0.0
                        </p>
                    </div>
                    
                    <div class="footer-right">
                        <p class="footer-developer">
                            Application developed by 
                            <a href="https://rsienterprise.web.app" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               class="developer-link"
                               aria-label="Visit RSI Enterprise México">
                                <img src="/assets/icons/logoRSI.png" 
                                     alt="RSI Enterprise Logo" 
                                     class="developer-logo"
                                     onerror="this.style.display='none'">
                                <span class="developer-text">RSI Enterprise México</span>
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        `;

        return footerHTML;
    }

    // Insert footer into page
    function insertFooter() {
        // Check if footer already exists
        const existingFooter = document.querySelector('.autoloaded-footer');
        if (existingFooter) {
            console.log('⚠️ Footer already inserted, skipping...');
            return;
        }

        // Find the main content container
        let mainContainer = document.querySelector('.dashboard-container, main, .content, .container');
        
        if (!mainContainer) {
            mainContainer = document.body;
        }

        // Insert footer
        const footerHTML = createFooter();
        
        if (mainContainer === document.body) {
            mainContainer.insertAdjacentHTML('beforeend', footerHTML);
        } else {
            mainContainer.insertAdjacentHTML('afterend', footerHTML);
        }

        console.log('✅ Footer autoloader inserted successfully');
        
        // Handle logo error
        const logo = document.querySelector('.developer-logo');
        if (logo) {
            logo.onerror = function() {
                this.style.display = 'none';
            };
        }
    }

    // Main initialization function
    function initFooter() {
        try {
            // Load styles
            loadFooterStyles();
            
            // Wait for DOM or insert immediately
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', insertFooter);
            } else {
                setTimeout(insertFooter, 100);
            }

            // Sync with ThemeManager
            if (window.ThemeManager) {
                window.ThemeManager.onThemeChange((isDarkMode) => {
                    console.log(`🎨 Footer adapted to theme: ${isDarkMode ? 'dark' : 'light'}`);
                });
            }

            // Listen for ThemeManager ready event
            window.addEventListener('thememodule:ready', () => {
                console.log('🎨 Footer synchronized with ThemeManager');
            });

            // Auto-update year
            function updateYear() {
                const yearElements = document.querySelectorAll('.footer-copyright');
                const currentYear = new Date().getFullYear();
                
                yearElements.forEach(element => {
                    if (element.textContent.includes('©')) {
                        element.textContent = element.textContent.replace(
                            /© \d{4}/,
                            `© ${currentYear}`
                        );
                    }
                });
            }

            // Update year periodically
            setInterval(updateYear, 86400000); // Every 24 hours

        } catch (error) {
            console.error('❌ Error initializing Footer Autoloader:', error);
        }
    }

    // Safe initialization
    function safeInit() {
        try {
            initFooter();
        } catch (error) {
            console.error('❌ Error in safe initialization:', error);
            
            // Retry after 1 second
            setTimeout(() => {
                try {
                    initFooter();
                } catch (retryError) {
                    console.error('❌ Error in retry initialization:', retryError);
                }
            }, 1000);
        }
    }

    // Start footer autoloader
    safeInit();

    // Public API
    window.FooterAutoloader = {
        // Reload the footer
        reload: function() {
            const oldFooter = document.querySelector('.autoloaded-footer');
            if (oldFooter) {
                oldFooter.remove();
            }
            insertFooter();
            return true;
        },

        // Update version
        setVersion: function(version) {
            const versionElements = document.querySelectorAll('.footer-version');
            versionElements.forEach(element => {
                element.textContent = `Version ${version}`;
            });
            return version;
        },

        // Get footer information
        getInfo: function() {
            return {
                year: new Date().getFullYear(),
                version: '2.0.0',
                developer: 'RSI Enterprise México',
                developerUrl: 'https://rsienterprise.web.app',
                logoPath: '/assets/icons/logoRSI.png'
            };
        },

        // Check if footer is loaded
        isLoaded: function() {
            return document.querySelector('.autoloaded-footer') !== null;
        },

        // Get footer element
        getElement: function() {
            return document.querySelector('.autoloaded-footer');
        },

        // Set footer visibility
        setVisible: function(visible) {
            const footer = document.querySelector('.autoloaded-footer');
            if (footer) {
                footer.style.display = visible ? 'block' : 'none';
            }
            return visible;
        }
    };

    // Global simple function
    window.reloadFooter = function() {
        return window.FooterAutoloader.reload();
    };

    console.log('✅ Footer Autoloader initialized and ready');
})();