// navbar-collaborator-component.js - Navbar flotante para colaboradores con permisos dinámicos
// Muestra solo los módulos a los que el usuario tiene acceso

(function() {
    'use strict';
    
    if (window.FloatingCollaboratorNavbarLoaded) {
        console.log('🔄 Floating Collaborator Navbar ya cargado');
        return;
    }
    window.FloatingCollaboratorNavbarLoaded = true;

    console.log('🚀 Iniciando Floating Collaborator Navbar...');

    // Variables globales
    let firebaseApp = null;
    let db = null;
    let permissionManager = null;
    let currentUser = null;
    let userPermissions = null;

    // Módulos disponibles (los mismos que en dashboardGeneral.js)
    const AVAILABLE_MODULES = [
        { 
            id: 'brands', 
            name: 'Brands', 
            fullName: 'Brand Management',
            icon: 'fa-tags',
            path: '../brandAdmin/brandAdmin.html'
        },
        { 
            id: 'categories', 
            name: 'Categories', 
            fullName: 'Category Management',
            icon: 'fa-list',
            path: '../categoryAdmin/categoryAdmin.html'
        },
        { 
            id: 'comments', 
            name: 'Comments', 
            fullName: 'Comments Management',
            icon: 'fa-comments',
            path: '../commentAdmin/commentAdmin.html'
        },
        { 
            id: 'carousel', 
            name: 'Carousel', 
            fullName: 'Carousel Management',
            icon: 'fa-images',
            path: '../carouselAdmin/carouselAdmin.html'
        },
        { 
            id: 'users', 
            name: 'Users', 
            fullName: 'User Management',
            icon: 'fa-users',
            path: '../newUserAdmin/newUserAdmin.html'
        },
        { 
            id: 'products', 
            name: 'Products', 
            fullName: 'Product Management',
            icon: 'fa-box',
            path: '../productAdmin/productAdmin.html'
        },
        { 
            id: 'suppliers', 
            name: 'Suppliers', 
            fullName: 'Supplier Management',
            icon: 'fa-truck',
            path: '../providerAdmin/providerAdmin.html'
        },
        { 
            id: 'pos', 
            name: 'POS', 
            fullName: 'Point of Sale',
            icon: 'fa-cash-register',
            path: '../posAdmin/posAdmin.html'
        },
        { 
            id: 'permissions', 
            name: 'Permissions', 
            fullName: 'Permissions Management',
            icon: 'fa-lock',
            path: '../permissionAdmin/permissionAdmin.html'
        }
    ];

    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    async function init() {
        try {
            await loadFirebaseConfig();
            addStyles();
            createFloatingNavbar();
            setupEventListeners();
            await checkAuthStatus();
            setupThemeIntegration();
            setupLogout();
            console.log('✅ Floating Collaborator Navbar listo');
        } catch (error) {
            console.error('❌ Error inicializando navbar:', error);
        }
    }

    async function loadFirebaseConfig() {
        try {
            if (typeof firebase === 'undefined') {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = '/config/firebase-config.js';
                    script.onload = () => {
                        setTimeout(() => {
                            initializeFirebase();
                            resolve();
                        }, 500);
                    };
                    script.onerror = () => {
                        console.warn('⚠️ No se pudo cargar firebase-config.js');
                        initializeFirebase();
                        resolve();
                    };
                    document.head.appendChild(script);
                });
            } else {
                initializeFirebase();
            }
        } catch (error) {
            console.error('Error loading Firebase config:', error);
            initializeFirebase();
        }
    }

    function initializeFirebase() {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
                console.log('Firebase not available, using fallback authentication');
                return;
            }

            firebaseApp = firebase.apps[0];
            db = firebase.firestore();
            console.log('✅ Firebase inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
        }
    }

    async function loadPermissions() {
        try {
            // Importar PermissionManager
            const module = await import('../classes/permission.js');
            const PermissionManager = module.PermissionManager;
            
            permissionManager = new PermissionManager();
            await permissionManager.loadPermissions();
            
            console.log('✅ Permisos cargados:', permissionManager.permissions.length);
            
        } catch (error) {
            console.error('❌ Error cargando permisos:', error);
        }
    }

    function getAccessibleModules() {
        if (!currentUser || !currentUser.role || !permissionManager) {
            return [];
        }

        const permission = permissionManager.getPermissionByRole(currentUser.role);
        if (!permission) {
            console.log(`No permissions found for role: ${currentUser.role}`);
            return [];
        }

        userPermissions = permission;

        // Filtrar módulos accesibles
        return AVAILABLE_MODULES.filter(module => 
            permission.hasPermission(module.id)
        );
    }

    function addStyles() {
        const styleId = 'floating-collaborator-navbar-styles';
        if (document.getElementById(styleId)) return;

        const styles = /*css*/ `
            /* Botón flotante */
            .floating-collab-toggle {
                position: fixed;
                top: 20px;
                left: 20px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #0a2540 0%, #061a2d 100%);
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                transition: all 0.3s ease;
                opacity: 1;
                transform: scale(1);
            }

            .floating-collab-toggle.menu-open {
                opacity: 0;
                transform: scale(0);
                pointer-events: none;
            }

            .dark-mode .floating-collab-toggle {
                background: linear-gradient(135deg, #1a365d 0%, #0a2540 100%);
            }

            .floating-collab-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
            }

            /* Overlay */
            .floating-collab-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9998;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .floating-collab-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            /* Panel lateral */
            .floating-collab-panel {
                position: fixed;
                top: 0;
                left: -320px;
                width: 320px;
                height: 100vh;
                background: #ffffff;
                z-index: 9999;
                transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                box-shadow: 5px 0 30px rgba(0, 0, 0, 0.15);
            }

            .dark-mode .floating-collab-panel {
                background: #1a253a;
            }

            .floating-collab-panel.active {
                left: 0;
            }

            /* Header del panel */
            .floating-collab-header {
                padding: 20px;
                background: linear-gradient(135deg, #0a2540 0%, #061a2d 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 80px;
            }

            .dark-mode .floating-collab-header {
                background: linear-gradient(135deg, #1a365d 0%, #0a2540 100%);
            }

            .floating-collab-brand {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .floating-collab-brand img {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                object-fit: contain;
                background: transparent;
                padding: 5px;
            }

            .floating-collab-brand h3 {
                font-size: 1.2rem;
                margin: 0;
                font-weight: 600;
            }

            .floating-collab-brand p {
                font-size: 0.8rem;
                opacity: 0.9;
                margin: 0;
            }

            .floating-collab-close {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.1rem;
                transition: all 0.2s ease;
            }

            .floating-collab-close:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: rotate(90deg);
            }

            /* Contenido del panel */
            .floating-collab-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
            }

            .dark-mode .floating-collab-content {
                background: #2d3748;
            }

            /* Sección de permisos */
            .access-summary {
                background: rgba(10, 37, 64, 0.05);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
                border-left: 3px solid #f5d742;
            }

            .dark-mode .access-summary {
                background: rgba(255, 255, 255, 0.05);
            }

            .access-summary p {
                margin: 5px 0;
                font-size: 0.9rem;
                color: #666;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .dark-mode .access-summary p {
                color: #a0aec0;
            }

            .access-summary i {
                color: #f5d742;
                width: 20px;
            }

            .access-count {
                font-weight: 600;
                color: #0a2540;
                font-size: 1.1rem;
            }

            .dark-mode .access-count {
                color: #f5d742;
            }

            /* Menú de navegación */
            .floating-collab-menu {
                list-style: none;
                margin: 0;
                padding: 0;
            }

            .floating-collab-menu li {
                margin-bottom: 8px;
            }

            .floating-collab-menu a {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 14px 16px;
                text-decoration: none;
                color: #333333;
                background: white;
                border-radius: 10px;
                transition: all 0.3s ease;
                border-left: 4px solid transparent;
                font-weight: 500;
                font-size: 0.95rem;
            }

            .dark-mode .floating-collab-menu a {
                background: #2d3748;
                color: #e2e8f0;
            }

            .floating-collab-menu a i {
                width: 20px;
                text-align: center;
                font-size: 1.1rem;
                color: #0a2540;
            }

            .dark-mode .floating-collab-menu a i {
                color: #f5d742;
            }

            .floating-collab-menu a:hover {
                background: rgba(10, 37, 64, 0.08);
                transform: translateX(5px);
                border-left-color: #f5d742;
            }

            .dark-mode .floating-collab-menu a:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            .floating-collab-menu a.active {
                background: #fff5b8;
                color: #0a2540;
                border-left-color: #f5d742;
                font-weight: 600;
            }

            .dark-mode .floating-collab-menu a.active {
                background: rgba(245, 215, 66, 0.2);
                color: #f5d742;
            }

            /* Sección de usuario */
            .floating-collab-user {
                padding: 20px;
                background: white;
                border-radius: 10px;
                margin-bottom: 20px;
                border: 1px solid #e9ecef;
                display: none;
            }

            .dark-mode .floating-collab-user {
                background: #2d3748;
                border-color: #4a5568;
                color: #e2e8f0;
            }

            .floating-collab-user.active {
                display: block;
            }

            .user-info {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .user-avatar {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #0a2540 0%, #061a2d 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                font-weight: 600;
                flex-shrink: 0;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
            }

            .user-details {
                flex: 1;
                min-width: 0;
            }

            .user-details h4 {
                margin: 0 0 5px 0;
                font-size: 1rem;
                font-weight: 600;
            }

            .user-details p {
                margin: 0;
                font-size: 0.85rem;
                color: #6c757d;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .dark-mode .user-details p {
                color: #a0aec0;
            }

            .role-badge {
                display: inline-block;
                padding: 3px 8px;
                background: rgba(245, 215, 66, 0.2);
                color: #0a2540;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: 600;
                margin-top: 5px;
            }

            .dark-mode .role-badge {
                background: rgba(245, 215, 66, 0.3);
                color: #f5d742;
            }

            .not-logged-in {
                padding: 20px;
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 10px;
                margin-bottom: 20px;
                display: none;
            }

            .dark-mode .not-logged-in {
                background: #744210;
                border-color: #966919;
                color: #fff3cd;
            }

            .not-logged-in.active {
                display: block;
            }

            .not-logged-in p {
                margin: 0 0 15px 0;
                font-size: 0.9rem;
            }

            .login-btn {
                display: inline-block;
                padding: 8px 16px;
                background: #0a2540;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                font-weight: 500;
                text-decoration: none;
                transition: all 0.3s ease;
            }

            .login-btn:hover {
                background: #061a2d;
                transform: translateY(-2px);
            }

            .dark-mode .login-btn {
                background: #f5d742;
                color: #0a2540;
            }

            .dark-mode .login-btn:hover {
                background: #e6c93d;
            }

            /* Acciones */
            .floating-collab-actions {
                padding: 20px 0 0 0;
                border-top: 1px solid #e9ecef;
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .dark-mode .floating-collab-actions {
                border-top-color: #4a5568;
            }

            .theme-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: rgba(10, 37, 64, 0.08);
                border: none;
                border-radius: 10px;
                cursor: pointer;
                color: #333333;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .dark-mode .theme-toggle-btn {
                background: rgba(255, 255, 255, 0.08);
                color: #e2e8f0;
            }

            .theme-toggle-btn:hover {
                background: rgba(10, 37, 64, 0.15);
                transform: translateY(-2px);
            }

            .dark-mode .theme-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .logout-btn {
                display: flex !important;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 12px 16px;
                background: rgba(220, 53, 69, 0.1);
                color: #dc3545;
                border: 1px solid rgba(220, 53, 69, 0.2);
                border-radius: 10px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .dark-mode .logout-btn {
                background: rgba(220, 53, 69, 0.15);
                border-color: rgba(220, 53, 69, 0.3);
                color: #f56565;
            }

            .logout-btn:hover {
                background: rgba(220, 53, 69, 0.2);
                transform: translateY(-2px);
            }

            /* Mensaje de sin permisos */
            .no-modules-message {
                text-align: center;
                padding: 30px 20px;
                background: white;
                border-radius: 10px;
                margin: 10px 0;
                color: #6c757d;
            }

            .dark-mode .no-modules-message {
                background: #2d3748;
                color: #a0aec0;
            }

            .no-modules-message i {
                font-size: 2rem;
                color: #f5d742;
                margin-bottom: 15px;
            }

            .no-modules-message p {
                margin: 5px 0;
                font-size: 0.9rem;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .floating-collab-toggle {
                    top: 15px;
                    left: 15px;
                    width: 50px;
                    height: 50px;
                    font-size: 1.3rem;
                }

                .floating-collab-panel {
                    width: 100%;
                    max-width: 320px;
                    left: -100%;
                }

                .floating-collab-panel.active {
                    left: 0;
                }
            }

            @media (max-width: 480px) {
                .floating-collab-toggle {
                    top: 10px;
                    left: 10px;
                    width: 45px;
                    height: 45px;
                    font-size: 1.2rem;
                }

                .floating-collab-panel {
                    width: 100%;
                }

                .floating-collab-header {
                    padding: 15px;
                    min-height: 70px;
                }

                .floating-collab-brand h3 {
                    font-size: 1.1rem;
                }

                .floating-collab-brand p {
                    font-size: 0.75rem;
                }
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    function createFloatingNavbar() {
        if (document.getElementById('floatingCollabToggle')) return;

        // Botón flotante
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'floating-collab-toggle';
        toggleBtn.id = 'floatingCollabToggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        toggleBtn.setAttribute('aria-label', 'Toggle Menu');

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'floating-collab-overlay';
        overlay.id = 'floatingCollabOverlay';

        // Panel
        const panel = document.createElement('div');
        panel.className = 'floating-collab-panel';
        panel.id = 'floatingCollabPanel';

        panel.innerHTML = /*html*/ `
            <div class="floating-collab-header">
                <div class="floating-collab-brand">
                    <img src="/assets/icons/Logo Lucky Apliances.png" alt="Logo" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzBBNTQwIi8+CjxwYXRoIGQ9Ik0xMCAxNUwzMCAxNUwzMCAyNUwxMCAyNUwxMCAxNVoiIGZpbGw9IiNGNUQ3NDIiLz4KPHBhdGggZD0iTTE1IDEwTDE1IDMwTDI1IDMwTDI1IDEwTDE1IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='">
                    <div>
                        <h3>Lucky Appliances</h3>
                        <p>Collaborator Panel</p>
                    </div>
                </div>
                <button class="floating-collab-close" id="floatingCollabClose" aria-label="Close menu">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="floating-collab-content">
                <div class="floating-collab-user" id="floatingCollabUser">
                    <div class="user-info">
                        <div class="user-avatar" id="userAvatar">C</div>
                        <div class="user-details">
                            <h4 id="userName">Loading...</h4>
                            <p id="userEmail">Loading user information...</p>
                            <span class="role-badge" id="userRole">Role</span>
                        </div>
                    </div>
                </div>

                <div class="not-logged-in" id="notLoggedIn">
                    <p>You are not logged in. Please login to access the system.</p>
                    <a href="/users/visitors/login/login.html" class="login-btn">Go to Login</a>
                </div>

                <div class="access-summary" id="accessSummary" style="display: none;">
                    <p><i class="fas fa-check-circle"></i> <span id="accessibleCount">0</span> accessible modules</p>
                    <p><i class="fas fa-user-tag"></i> Role: <span id="summaryRole">-</span></p>
                </div>

                <ul class="floating-collab-menu" id="floatingCollabMenu">
                    <li><a href="/users/collaborator/dashboardGeneral/dashboardGeneral.html"><i class="fas fa-home"></i> Dashboard</a></li>
                    <!-- Los módulos se cargarán dinámicamente aquí -->
                </ul>

                <div class="floating-collab-actions">
                    <button class="theme-toggle-btn" id="floatingThemeToggle">
                        <span id="themeToggleText">Dark Mode</span>
                        <i id="themeToggleIcon" class="fas fa-moon"></i>
                    </button>
                    <button class="logout-btn" id="floatingLogoutBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(toggleBtn);
        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        markActiveLink();
    }

    function setupEventListeners() {
        const toggleBtn = document.getElementById('floatingCollabToggle');
        const closeBtn = document.getElementById('floatingCollabClose');
        const overlay = document.getElementById('floatingCollabOverlay');
        const panel = document.getElementById('floatingCollabPanel');

        if (!toggleBtn || !closeBtn || !panel) return;

        let isOpen = false;

        function openPanel() {
            panel.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            isOpen = true;
            toggleBtn.classList.add('menu-open');
        }

        function closePanel() {
            panel.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            isOpen = false;
            toggleBtn.classList.remove('menu-open');
        }

        function togglePanel() {
            if (isOpen) {
                closePanel();
            } else {
                openPanel();
            }
        }

        toggleBtn.addEventListener('click', togglePanel);
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);

        const menuLinks = document.querySelectorAll('.floating-collab-menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href !== window.location.pathname.split('/').pop()) {
                    setTimeout(closePanel, 300);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closePanel();
            }
        });
    }

    function markActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const menuLinks = document.querySelectorAll('.floating-collab-menu a');
        
        menuLinks.forEach(link => {
            const href = link.getAttribute('href');
            const linkPage = href.split('/').pop();
            if (linkPage === currentPage || 
                (currentPage === '' && linkPage === 'index.html') ||
                (currentPage.includes(linkPage.replace('.html', '')))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async function renderAccessibleModules() {
        const menu = document.getElementById('floatingCollabMenu');
        const accessSummary = document.getElementById('accessSummary');
        const accessibleCount = document.getElementById('accessibleCount');
        const summaryRole = document.getElementById('summaryRole');
        
        if (!menu) return;

        // Mantener el link del dashboard
        const dashboardLink = menu.querySelector('li:first-child');
        menu.innerHTML = '';
        if (dashboardLink) {
            menu.appendChild(dashboardLink);
        } else {
            const li = document.createElement('li');
            li.innerHTML = '<a href="/users/collaborator/dashboardGeneral/dashboardGeneral.html"><i class="fas fa-home"></i> Dashboard</a>';
            menu.appendChild(li);
        }

        const modules = getAccessibleModules();

        if (modules.length === 0) {
            // Mostrar mensaje de sin módulos
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="no-modules-message">
                    <i class="fas fa-lock"></i>
                    <p>No modules accessible</p>
                    <p style="font-size: 0.8rem;">Contact your administrator</p>
                </div>
            `;
            menu.appendChild(li);
            
            if (accessSummary) {
                accessSummary.style.display = 'none';
            }
        } else {
            // Agregar módulos accesibles
            modules.forEach(module => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${module.path}"><i class="fas ${module.icon}"></i> ${module.name}</a>`;
                menu.appendChild(li);
            });

            // Mostrar resumen de accesos
            if (accessSummary && accessibleCount && summaryRole) {
                accessSummary.style.display = 'block';
                accessibleCount.textContent = modules.length;
                
                const roleDisplay = getRoleDisplayName(currentUser?.role);
                summaryRole.textContent = roleDisplay;
            }
        }

        // Marcar enlace activo después de renderizar
        markActiveLink();
    }

    function getRoleDisplayName(role) {
        const roleNames = {
            admin: 'Administrator',
            developer: 'Developer',
            auditor: 'Auditor',
            sales: 'Sales',
            store: 'Store'
        };
        return roleNames[role] || role;
    }

    async function checkAuthStatus() {
        const userSection = document.getElementById('floatingCollabUser');
        const notLoggedInSection = document.getElementById('notLoggedIn');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        const userRole = document.getElementById('userRole');
        const logoutBtn = document.getElementById('floatingLogoutBtn');
        const menu = document.getElementById('floatingCollabMenu');
        
        if (!userSection || !logoutBtn) return;

        // Función para actualizar UI según autenticación
        async function updateUserUI(user) {
            if (user) {
                currentUser = user;
                
                // Mostrar sección de usuario
                userSection.classList.add('active');
                if (notLoggedInSection) notLoggedInSection.classList.remove('active');
                if (menu) menu.style.display = 'block';
                logoutBtn.style.display = 'flex';

                // Actualizar información básica
                if (userName) {
                    userName.textContent = user.fullName || user.displayName || user.email?.split('@')[0] || 'User';
                }
                if (userEmail) {
                    userEmail.textContent = user.email || 'No email';
                }
                if (userRole) {
                    const roleDisplay = getRoleDisplayName(user.role);
                    userRole.textContent = roleDisplay;
                }
                if (userAvatar) {
                    if (user.photo) {
                        userAvatar.style.backgroundImage = `url('${user.photo}')`;
                        userAvatar.textContent = '';
                    } else {
                        const firstLetter = (user.fullName || user.displayName || user.email || 'C')[0].toUpperCase();
                        userAvatar.style.backgroundImage = 'none';
                        userAvatar.textContent = firstLetter;
                    }
                }

                // Cargar permisos y renderizar módulos accesibles
                await loadPermissions();
                await renderAccessibleModules();

            } else {
                // Usuario no autenticado
                currentUser = null;
                userPermissions = null;
                
                userSection.classList.remove('active');
                if (notLoggedInSection) notLoggedInSection.classList.add('active');
                if (menu) menu.style.display = 'none';
                logoutBtn.style.display = 'none';
            }
        }

        // Verificar autenticación desde localStorage (por ahora)
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                console.log('User found in localStorage:', user);
                await updateUserUI(user);
            } catch (e) {
                console.error('Error parsing user data:', e);
                await updateUserUI(null);
            }
        } else {
            console.log('No user found in localStorage');
            await updateUserUI(null);
        }

        // También verificar Firebase si está disponible
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser && !currentUser) {
                    // Si hay usuario en Firebase pero no en localStorage, crear objeto básico
                    const user = {
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photo: firebaseUser.photoURL,
                        role: 'collaborator' // Rol por defecto mientras tanto
                    };
                    await updateUserUI(user);
                }
            });
        }
    }

    function setupThemeIntegration() {
        const themeToggle = document.getElementById('floatingThemeToggle');
        const themeIcon = document.getElementById('themeToggleIcon');
        const themeText = document.getElementById('themeToggleText');
        
        if (!themeToggle) return;

        function updateTheme() {
            const isDarkMode = document.body.classList.contains('dark-mode');
            
            if (themeIcon) {
                themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
            }
            if (themeText) {
                themeText.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
            }
        }

        themeToggle.addEventListener('click', function() {
            if (window.ThemeManager) {
                window.ThemeManager.toggle();
                setTimeout(updateTheme, 100);
            } else {
                const isDarkMode = document.body.classList.contains('dark-mode');
                const newDarkMode = !isDarkMode;
                
                if (newDarkMode) {
                    document.body.classList.add('dark-mode');
                    document.documentElement.classList.add('dark-mode');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.body.classList.remove('dark-mode');
                    document.documentElement.classList.remove('dark-mode');
                    localStorage.setItem('theme', 'light');
                }
                
                updateTheme();
            }
        });

        updateTheme();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    updateTheme();
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    }

    function setupLogout() {
        const logoutBtn = document.getElementById('floatingLogoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async function() {
            try {
                if (typeof Swal === 'undefined') {
                    const confirmLogout = confirm('Are you sure you want to logout?');
                    if (!confirmLogout) return;
                } else {
                    const result = await Swal.fire({
                        title: 'Confirm Logout',
                        text: 'Are you sure you want to logout?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Logout',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#dc3545'
                    });

                    if (!result.isConfirmed) return;
                }

                console.log('Logging out...');

                if (typeof firebase !== 'undefined' && firebase.auth) {
                    try {
                        await firebase.auth().signOut();
                    } catch (firebaseError) {
                        console.error('Firebase logout error:', firebaseError);
                    }
                }

                // Limpiar localStorage
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userPermissions');

                if (typeof Swal !== 'undefined') {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Logout Successful',
                        text: 'You have been logged out.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }

                setTimeout(() => {
                    window.location.href = '/users/visitors/login/login.html';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Logout error:', error);
                if (typeof Swal !== 'undefined') {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error during logout. Please try again.'
                    });
                }
            }
        });
    }

    // Public API
    window.FloatingCollaboratorNavbar = {
        open: function() {
            const toggleBtn = document.getElementById('floatingCollabToggle');
            if (toggleBtn) toggleBtn.click();
        },
        close: function() {
            const closeBtn = document.getElementById('floatingCollabClose');
            if (closeBtn) closeBtn.click();
        },
        toggleTheme: function() {
            const themeToggle = document.getElementById('floatingThemeToggle');
            if (themeToggle) themeToggle.click();
        },
        logout: function() {
            const logoutBtn = document.getElementById('floatingLogoutBtn');
            if (logoutBtn) logoutBtn.click();
        },
        refreshPermissions: async function() {
            await loadPermissions();
            await renderAccessibleModules();
        }
    };

    // Cargar recursos
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