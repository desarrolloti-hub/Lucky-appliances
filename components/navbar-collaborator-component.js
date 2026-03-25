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

    // Módulos disponibles con grupos
    const AVAILABLE_MODULES = [
        // Sales Group
        { 
            id: 'pos', 
            name: 'POS', 
            fullName: 'Point of Sale',
            icon: 'fa-cash-register',
            path: '../posAdmin/posAdmin.html',
            group: 'sales'
        },
        { 
            id: 'sales', 
            name: 'Sales History', 
            fullName: 'Sales History',
            icon: 'fa-chart-line',
            path: '../salesAdmin/salesAdmin.html',
            group: 'sales'
        },
        { 
            id: 'clients', 
            name: 'Clients', 
            fullName: 'Client Management',
            icon: 'fa-users',
            path: '../clientsAdmin/clientsAdmin.html',
            group: 'sales'
        },
        // Catalog Group
        { 
            id: 'products', 
            name: 'Products', 
            fullName: 'Product Management',
            icon: 'fa-box',
            path: '../productAdmin/productAdmin.html',
            group: 'catalog'
        },
        { 
            id: 'categories', 
            name: 'Categories', 
            fullName: 'Category Management',
            icon: 'fa-tags',
            path: '../categoryAdmin/categoryAdmin.html',
            group: 'catalog'
        },
        { 
            id: 'brands', 
            name: 'Brands', 
            fullName: 'Brand Management',
            icon: 'fa-tag',
            path: '../brandAdmin/brandAdmin.html',
            group: 'catalog'
        },
        // Content Group
        { 
            id: 'comments', 
            name: 'Comments', 
            fullName: 'Comments Management',
            icon: 'fa-comments',
            path: '../commentAdmin/commentAdmin.html',
            group: 'content'
        },
        { 
            id: 'carousel', 
            name: 'Carousel', 
            fullName: 'Carousel Management',
            icon: 'fa-images',
            path: '../carouselAdmin/carouselAdmin.html',
            group: 'content'
        },
        // Administration Group
        { 
            id: 'users', 
            name: 'Users', 
            fullName: 'User Management',
            icon: 'fa-users',
            path: '../newUserAdmin/newUserAdmin.html',
            group: 'administration'
        },
        { 
            id: 'permissions', 
            name: 'Permissions', 
            fullName: 'Permissions Management',
            icon: 'fa-shield-alt',
            path: '../permissionAdmin/permissionAdmin.html',
            group: 'administration'
        }
    ];

    // Configuración de grupos
    const GROUP_CONFIG = {
        sales: { name: 'Sales', icon: 'fa-chart-line', order: 1 },
        catalog: { name: 'Catalog', icon: 'fa-boxes', order: 2 },
        content: { name: 'Content', icon: 'fa-images', order: 3 },
        administration: { name: 'Administration', icon: 'fa-cog', order: 4 }
    };

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
            const module = await import('/classes/permission.js');
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

        return AVAILABLE_MODULES.filter(module => 
            permission.hasPermission(module.id)
        );
    }

    function groupModules(modules) {
        const grouped = {};
        
        modules.forEach(module => {
            const groupKey = module.group || 'other';
            if (!grouped[groupKey]) {
                grouped[groupKey] = [];
            }
            grouped[groupKey].push(module);
        });
        
        return grouped;
    }

    function addStyles() {
        const styleId = 'floating-collaborator-navbar-styles';
        if (document.getElementById(styleId)) return;

        const styles = /*css*/ `
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
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            }
            .floating-collab-toggle.menu-open {
                opacity: 0;
                transform: scale(0);
                pointer-events: none;
            }
            .dark-mode .floating-collab-toggle {
                background: linear-gradient(135deg, #1a365d 0%, #0a2540 100%);
            }
            .floating-collab-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9998;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .floating-collab-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .floating-collab-panel {
                position: fixed;
                top: 0;
                left: -320px;
                width: 320px;
                height: 100vh;
                background: #ffffff;
                z-index: 9999;
                transition: left 0.4s cubic-bezier(0.4,0,0.2,1);
                display: flex;
                flex-direction: column;
                box-shadow: 5px 0 30px rgba(0,0,0,0.15);
            }
            .dark-mode .floating-collab-panel {
                background: #1a253a;
            }
            .floating-collab-panel.active {
                left: 0;
            }
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
                background: rgba(255,255,255,0.15);
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
                background: rgba(255,255,255,0.25);
                transform: rotate(90deg);
            }
            .floating-collab-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
            }
            .dark-mode .floating-collab-content {
                background: #2d3748;
            }
            .menu-group {
                margin-bottom: 8px;
            }
            .menu-group-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                background: rgba(10,37,64,0.05);
                border-radius: 8px;
                cursor: pointer;
                margin-bottom: 4px;
            }
            .dark-mode .menu-group-header {
                background: rgba(255,255,255,0.05);
                color: #e2e8f0;
            }
            .menu-group-header:hover {
                background: rgba(10,37,64,0.1);
            }
            .menu-group-header .group-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                font-size: 0.85rem;
                color: #0a2540;
            }
            .dark-mode .menu-group-header .group-title {
                color: #f5d742;
            }
            .menu-group-header .group-title i {
                width: 24px;
                font-size: 1rem;
            }
            .menu-group-header .group-arrow {
                transition: transform 0.3s ease;
                font-size: 0.7rem;
                color: #6c757d;
            }
            .menu-group-header.collapsed .group-arrow {
                transform: rotate(-90deg);
            }
            .menu-group-items {
                list-style: none;
                margin: 0;
                padding: 0 0 0 34px;
                overflow: hidden;
                transition: max-height 0.3s ease;
                max-height: 500px;
            }
            .menu-group-items.collapsed {
                max-height: 0;
            }
            .menu-group-items li {
                margin-bottom: 4px;
            }
            .menu-group-items a {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                text-decoration: none;
                color: #555;
                background: transparent;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-size: 0.85rem;
            }
            .dark-mode .menu-group-items a {
                color: #cbd5e0;
            }
            .menu-group-items a i {
                width: 20px;
                font-size: 0.85rem;
                color: #6c757d;
            }
            .menu-group-items a:hover {
                background: rgba(10,37,64,0.08);
                transform: translateX(3px);
            }
            .menu-group-items a.active {
                background: #fff5b8;
                color: #0a2540;
                font-weight: 500;
            }
            .dark-mode .menu-group-items a.active {
                background: rgba(245,215,66,0.2);
                color: #f5d742;
            }
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
            }
            .role-badge {
                display: inline-block;
                padding: 3px 8px;
                background: rgba(245,215,66,0.2);
                color: #0a2540;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: 600;
                margin-top: 5px;
            }
            .dark-mode .role-badge {
                background: rgba(245,215,66,0.3);
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
            .not-logged-in.active {
                display: block;
            }
            .login-btn {
                display: inline-block;
                padding: 8px 16px;
                background: #0a2540;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 0.85rem;
                text-decoration: none;
            }
            .dark-mode .login-btn {
                background: #f5d742;
                color: #0a2540;
            }
            .access-summary {
                background: rgba(10,37,64,0.05);
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 20px;
                border-left: 3px solid #f5d742;
            }
            .access-summary p {
                margin: 5px 0;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .access-summary i {
                color: #f5d742;
                width: 20px;
            }
            .floating-collab-actions {
                padding: 20px 0 0 0;
                border-top: 1px solid #e9ecef;
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .theme-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background: rgba(10,37,64,0.08);
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
            }
            .dark-mode .theme-toggle-btn {
                background: rgba(255,255,255,0.08);
                color: #e2e8f0;
            }
            .logout-btn {
                display: flex !important;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 10px 14px;
                background: rgba(220,53,69,0.1);
                color: #dc3545;
                border: 1px solid rgba(220,53,69,0.2);
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
            }
            @media (max-width: 768px) {
                .floating-collab-toggle { width: 50px; height: 50px; font-size: 1.3rem; top: 15px; left: 15px; }
                .floating-collab-panel { width: 100%; max-width: 320px; left: -100%; }
                .floating-collab-panel.active { left: 0; }
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    function setupCollapsibleGroups() {
        const groups = document.querySelectorAll('.menu-group');
        
        function closeAllGroups(exceptGroup = null) {
            groups.forEach(group => {
                if (exceptGroup !== group) {
                    const items = group.querySelector('.menu-group-items');
                    const header = group.querySelector('.menu-group-header');
                    if (items && !items.classList.contains('collapsed')) {
                        items.classList.add('collapsed');
                        if (header) header.classList.add('collapsed');
                    }
                }
            });
        }
        
        groups.forEach(group => {
            const header = group.querySelector('.menu-group-header');
            const items = group.querySelector('.menu-group-items');
            if (!header || !items) return;
            
            const hasActiveLink = group.querySelector('a.active');
            if (hasActiveLink) {
                items.classList.remove('collapsed');
                header.classList.remove('collapsed');
                closeAllGroups(group);
            } else {
                items.classList.add('collapsed');
                header.classList.add('collapsed');
            }
            
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = items.classList.contains('collapsed');
                if (isCollapsed) {
                    items.classList.remove('collapsed');
                    header.classList.remove('collapsed');
                    closeAllGroups(group);
                } else {
                    items.classList.add('collapsed');
                    header.classList.add('collapsed');
                }
            });
        });
    }

    function createFloatingNavbar() {
        if (document.getElementById('floatingCollabToggle')) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'floating-collab-toggle';
        toggleBtn.id = 'floatingCollabToggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

        const overlay = document.createElement('div');
        overlay.className = 'floating-collab-overlay';
        overlay.id = 'floatingCollabOverlay';

        const panel = document.createElement('div');
        panel.className = 'floating-collab-panel';
        panel.id = 'floatingCollabPanel';

        panel.innerHTML = `
            <div class="floating-collab-header">
                <div class="floating-collab-brand">
                    <img src="/assets/icons/Logo Lucky Apliances.png" alt="Logo">
                    <div>
                        <h3>Lucky Appliances</h3>
                        <p>Collaborator Panel</p>
                    </div>
                </div>
                <button class="floating-collab-close" id="floatingCollabClose"><i class="fas fa-times"></i></button>
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
                <div id="collabModulesContainer"></div>
                <div class="floating-collab-actions">
                    <button class="theme-toggle-btn" id="floatingThemeToggle">
                        <span id="themeToggleText">Dark Mode</span>
                        <i id="themeToggleIcon" class="fas fa-moon"></i>
                    </button>
                    <button class="logout-btn" id="floatingLogoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Logout
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

        toggleBtn.addEventListener('click', () => isOpen ? closePanel() : openPanel());
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);
        document.addEventListener('keydown', (e) => e.key === 'Escape' && isOpen && closePanel());
    }

    function markActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.menu-group-items a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkPage = href.split('/').pop();
            if (linkPage === currentPage) {
                link.classList.add('active');
                const group = link.closest('.menu-group');
                if (group) {
                    const items = group.querySelector('.menu-group-items');
                    const header = group.querySelector('.menu-group-header');
                    if (items) items.classList.remove('collapsed');
                    if (header) header.classList.remove('collapsed');
                }
            } else {
                link.classList.remove('active');
            }
        });
    }

    async function renderAccessibleModules() {
        const container = document.getElementById('collabModulesContainer');
        const accessSummary = document.getElementById('accessSummary');
        const accessibleCount = document.getElementById('accessibleCount');
        const summaryRole = document.getElementById('summaryRole');
        
        if (!container) return;

        const modules = getAccessibleModules();
        console.log('Módulos accesibles:', modules.length);

        if (modules.length === 0) {
            container.innerHTML = `
                <div class="no-modules-message" style="text-align:center; padding:30px 20px; background:white; border-radius:10px;">
                    <i class="fas fa-lock" style="font-size:2rem; color:#f5d742; margin-bottom:15px;"></i>
                    <p>No modules accessible</p>
                    <p style="font-size:0.8rem;">Contact your administrator</p>
                </div>
            `;
            if (accessSummary) accessSummary.style.display = 'none';
            return;
        }

        // Agrupar módulos
        const grouped = {};
        modules.forEach(module => {
            const groupKey = module.group;
            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(module);
        });

        let html = '';
        
        // Orden de grupos: sales, catalog, content, administration
        const groupOrder = ['sales', 'catalog', 'content', 'administration'];
        
        for (const groupKey of groupOrder) {
            if (grouped[groupKey] && grouped[groupKey].length > 0) {
                const groupInfo = GROUP_CONFIG[groupKey] || { name: groupKey.charAt(0).toUpperCase() + groupKey.slice(1), icon: 'fa-folder' };
                html += `
                    <div class="menu-group">
                        <div class="menu-group-header">
                            <span class="group-title">
                                <i class="fas ${groupInfo.icon}"></i>
                                <span>${groupInfo.name}</span>
                            </span>
                            <i class="fas fa-chevron-down group-arrow"></i>
                        </div>
                        <ul class="menu-group-items">
                            ${grouped[groupKey].map(module => `
                                <li>
                                    <a href="${module.path}">
                                        <i class="fas ${module.icon}"></i>
                                        <span>${module.name}</span>
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
        }

        container.innerHTML = html;

        if (accessSummary && accessibleCount && summaryRole) {
            accessSummary.style.display = 'block';
            accessibleCount.textContent = modules.length;
            summaryRole.textContent = currentUser?.role || 'Collaborator';
        }

        setupCollapsibleGroups();
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

        async function updateUserUI(user) {
            if (user) {
                currentUser = user;
                userSection.classList.add('active');
                if (notLoggedInSection) notLoggedInSection.classList.remove('active');
                logoutBtn.style.display = 'flex';
                
                if (userName) userName.textContent = user.fullName || user.displayName || user.email?.split('@')[0] || 'User';
                if (userEmail) userEmail.textContent = user.email || 'No email';
                if (userRole) userRole.textContent = user.role || 'Collaborator';
                
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
                
                await loadPermissions();
                await renderAccessibleModules();
            } else {
                currentUser = null;
                userSection.classList.remove('active');
                if (notLoggedInSection) notLoggedInSection.classList.add('active');
                logoutBtn.style.display = 'none';
                
                const container = document.getElementById('collabModulesContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="no-modules-message" style="text-align:center; padding:30px 20px; background:white; border-radius:10px;">
                            <i class="fas fa-lock" style="font-size:2rem; color:#f5d742; margin-bottom:15px;"></i>
                            <p>Please login to access modules</p>
                        </div>
                    `;
                }
            }
        }

        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                await updateUserUI(user);
            } catch (e) {
                await updateUserUI(null);
            }
        } else {
            await updateUserUI(null);
        }
    }

    function setupThemeIntegration() {
        const themeToggle = document.getElementById('floatingThemeToggle');
        const themeIcon = document.getElementById('themeToggleIcon');
        const themeText = document.getElementById('themeToggleText');
        if (!themeToggle) return;

        function updateTheme() {
            const isDarkMode = document.body.classList.contains('dark-mode');
            if (themeIcon) themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
            if (themeText) themeText.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
        }

        themeToggle.addEventListener('click', () => {
            if (window.ThemeManager) {
                window.ThemeManager.toggle();
                setTimeout(updateTheme, 100);
            } else {
                const isDarkMode = document.body.classList.contains('dark-mode');
                if (isDarkMode) {
                    document.body.classList.remove('dark-mode');
                    localStorage.setItem('theme', 'light');
                } else {
                    document.body.classList.add('dark-mode');
                    localStorage.setItem('theme', 'dark');
                }
                updateTheme();
            }
        });
        updateTheme();
    }

    function setupLogout() {
        const logoutBtn = document.getElementById('floatingLogoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async () => {
            try {
                if (typeof Swal !== 'undefined') {
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
                } else {
                    if (!confirm('Are you sure you want to logout?')) return;
                }

                if (typeof firebase !== 'undefined' && firebase.auth) {
                    await firebase.auth().signOut();
                }
                
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
                console.error('Logout error:', error);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error during logout. Please try again.'
                    });
                }
            }
        });
    }

    window.FloatingCollaboratorNavbar = {
        open: () => document.getElementById('floatingCollabToggle')?.click(),
        close: () => document.getElementById('floatingCollabClose')?.click(),
        toggleTheme: () => document.getElementById('floatingThemeToggle')?.click(),
        logout: () => document.getElementById('floatingLogoutBtn')?.click(),
        refreshPermissions: async () => {
            await loadPermissions();
            await renderAccessibleModules();
        }
    };

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