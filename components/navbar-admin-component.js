
(function() {
    'use strict';
    
    if (window.FloatingAdminNavbarLoaded) {
        console.log('🔄 Floating Admin Navbar ya cargado');
        return;
    }
    window.FloatingAdminNavbarLoaded = true;

    console.log('🚀 Iniciando Floating Admin Navbar...');

    // Variables globales
    let firebaseApp = null;
    let db = null;

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
            console.log('✅ Floating Admin Navbar listo');
        } catch (error) {
            console.error('❌ Error inicializando navbar:', error);
        }
    }

    async function loadFirebaseConfig() {
        try {
            // Intentar cargar la configuración desde el archivo externo
            if (typeof firebase === 'undefined') {
                // Crear un script para cargar firebase-config.js
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
                        console.warn('⚠️ No se pudo cargar firebase-config.js, usando valores por defecto');
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
            // Verificar si Firebase ya está inicializado
            if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
                console.log('Firebase not available, using fallback authentication');
                return;
            }

            // Usar la app por defecto si ya existe
            firebaseApp = firebase.apps[0];
            db = firebase.firestore();
            console.log('✅ Firebase inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
        }
    }

    function addStyles() {
        const styleId = 'floating-admin-navbar-styles';
        if (document.getElementById(styleId)) return;

        const styles = /*css*/ `
            /* Botón flotante - SE OCULTA CUANDO EL MENÚ ESTÁ ABIERTO */
            .floating-admin-toggle {
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

            /* OCULTAR BOTÓN CUANDO EL MENÚ ESTÁ ABIERTO */
            .floating-admin-toggle.menu-open {
                opacity: 0;
                transform: scale(0);
                pointer-events: none;
            }

            .dark-mode .floating-admin-toggle {
                background: linear-gradient(135deg, #1a365d 0%, #0a2540 100%);
            }

            .floating-admin-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
            }

            /* Overlay */
            .floating-admin-overlay {
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

            .floating-admin-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            /* Panel lateral */
            .floating-admin-panel {
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

            .dark-mode .floating-admin-panel {
                background: #1a253a;
            }

            .floating-admin-panel.active {
                left: 0;
            }

            /* Header del panel */
            .floating-admin-header {
                padding: 20px;
                background: linear-gradient(135deg, #0a2540 0%, #061a2d 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 80px;
            }

            .dark-mode .floating-admin-header {
                background: linear-gradient(135deg, #1a365d 0%, #0a2540 100%);
            }

            .floating-admin-brand {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .floating-admin-brand img {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                object-fit: contain;
                background: transparent;
                padding: 5px;
            }

            .floating-admin-brand h3 {
                font-size: 1.2rem;
                margin: 0;
                font-weight: 600;
            }

            .floating-admin-brand p {
                font-size: 0.8rem;
                opacity: 0.9;
                margin: 0;
            }

            .floating-admin-close {
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

            .floating-admin-close:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: rotate(90deg);
            }

            /* Contenido del panel */
            .floating-admin-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
            }

            .dark-mode .floating-admin-content {
                background: #2d3748;
            }

            /* Menú de navegación */
            .floating-admin-menu {
                list-style: none;
                margin: 0;
                padding: 0;
            }

            .floating-admin-menu li {
                margin-bottom: 8px;
            }

            .floating-admin-menu a {
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

            .dark-mode .floating-admin-menu a {
                background: #2d3748;
                color: #e2e8f0;
            }

            .floating-admin-menu a i {
                width: 20px;
                text-align: center;
                font-size: 1.1rem;
                color: #0a2540;
            }

            .dark-mode .floating-admin-menu a i {
                color: #f5d742;
            }

            .floating-admin-menu a:hover {
                background: rgba(10, 37, 64, 0.08);
                transform: translateX(5px);
                border-left-color: #f5d742;
            }

            .dark-mode .floating-admin-menu a:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            .floating-admin-menu a.active {
                background: #fff5b8;
                color: #0a2540;
                border-left-color: #f5d742;
                font-weight: 600;
            }

            .dark-mode .floating-admin-menu a.active {
                background: rgba(245, 215, 66, 0.2);
                color: #f5d742;
            }

            /* Sección de usuario */
            .floating-admin-user {
                padding: 20px;
                background: white;
                border-radius: 10px;
                margin-bottom: 20px;
                border: 1px solid #e9ecef;
                display: none;
            }

            .dark-mode .floating-admin-user {
                background: #2d3748;
                border-color: #4a5568;
                color: #e2e8f0;
            }

            .floating-admin-user.active {
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
                font-size: 0.3rem;
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

            /* Acciones - LOGOUT VISIBLE */
            .floating-admin-actions {
                padding: 20px 0 0 0;
                border-top: 1px solid #e9ecef;
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .dark-mode .floating-admin-actions {
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

            .theme-toggle-btn i {
                transition: transform 0.3s ease;
            }

            .theme-toggle-btn:hover i {
                transform: rotate(30deg);
            }

            /* BOTÓN LOGOUT VISIBLE */
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

            /* Responsive */
            @media (max-width: 768px) {
                .floating-admin-toggle {
                    top: 15px;
                    left: 15px;
                    width: 50px;
                    height: 50px;
                    font-size: 1.3rem;
                }

                .floating-admin-panel {
                    width: 100%;
                    max-width: 320px;
                    left: -100%;
                }

                .floating-admin-panel.active {
                    left: 0;
                }
            }

            @media (max-width: 480px) {
                .floating-admin-toggle {
                    top: 10px;
                    left: 10px;
                    width: 45px;
                    height: 45px;
                    font-size: 1.2rem;
                }

                .floating-admin-panel {
                    width: 100%;
                }

                .floating-admin-header {
                    padding: 15px;
                    min-height: 70px;
                }

                .floating-admin-brand h3 {
                    font-size: 1.1rem;
                }

                .floating-admin-brand p {
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
        if (document.getElementById('floatingAdminToggle')) return;

        // Botón flotante
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'floating-admin-toggle';
        toggleBtn.id = 'floatingAdminToggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        toggleBtn.setAttribute('aria-label', 'Toggle Admin Menu');

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'floating-admin-overlay';
        overlay.id = 'floatingAdminOverlay';

        // Panel
        const panel = document.createElement('div');
        panel.className = 'floating-admin-panel';
        panel.id = 'floatingAdminPanel';

        panel.innerHTML = /*html*/ `
            <div class="floating-admin-header">
                <div class="floating-admin-brand">
                    <img src="/assets/icons/Logo Lucky Apliances.png" alt="Logo" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzBBNTQwIi8+CjxwYXRoIGQ9Ik0xMCAxNUwzMCAxNUwzMCAyNUwxMCAyNUwxMCAxNVoiIGZpbGw9IiNGNUQ3NDIiLz4KPHBhdGggZD0iTTE1IDEwTDE1IDMwTDI1IDMwTDI1IDEwTDE1IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='">
                    <div>
                        <h3>Lucky Appliances</h3>
                        <p>Admin Panel</p>
                    </div>
                </div>
                <button class="floating-admin-close" id="floatingAdminClose" aria-label="Close menu">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="floating-admin-content">
                <div class="floating-admin-user" id="floatingAdminUser">
                    <div class="user-info">
                        <div class="user-avatar" id="userAvatar">A</div>
                        <div class="user-details">
                            <h4 id="userName">Loading...</h4>
                            <p id="userEmail">Loading user information...</p>
                        </div>
                    </div>
                </div>

                <div class="not-logged-in" id="notLoggedIn">
                    <p>You are not logged in. Please login to access the admin panel.</p>
                    <a href="/users/visitors/login/login.html" class="login-btn">Go to Login</a>
                </div>

                <ul class="floating-admin-menu" id="floatingAdminMenu">
                    <li><a href="../dashAdmin/dashAdmin.html"><i class="fas fa-home"></i> Home</a></li>
                    <li><a href="../productAdmin/productAdmin.html"><i class="fas fa-box"></i> Products</a></li>
                    <li><a href="../categoryAdmin/categoryAdmin.html"><i class="fas fa-tags"></i> Categories</a></li>
                    <li><a href="../brandAdmin/brandAdmin.html"><i class="fas fa-brands fa-apple"></i> Brands</a></li>
                    <li><a href="../commentAdmin/commentAdmin.html"><i class="fas fa-comments"></i> Comments</a></li>
                    <li><a href="../carouselAdmin/carouselAdmin.html"><i class="fas fa-images"></i> Carousel</a></li>
                    <li><a href="../newUserAdmin/newUserAdmin.html"><i class="fas fa-users"></i> Users</a></li>
                </ul>

                <div class="floating-admin-actions">
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
        const toggleBtn = document.getElementById('floatingAdminToggle');
        const closeBtn = document.getElementById('floatingAdminClose');
        const overlay = document.getElementById('floatingAdminOverlay');
        const panel = document.getElementById('floatingAdminPanel');

        if (!toggleBtn || !closeBtn || !panel) return;

        let isOpen = false;

        function openPanel() {
            panel.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            isOpen = true;
            // OCULTAR BOTÓN FLOTANTE
            toggleBtn.classList.add('menu-open');
        }

        function closePanel() {
            panel.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            isOpen = false;
            // MOSTRAR BOTÓN FLOTANTE
            toggleBtn.classList.remove('menu-open');
        }

        function togglePanel() {
            if (isOpen) {
                closePanel();
            } else {
                openPanel();
            }
        }

        // Event listeners
        toggleBtn.addEventListener('click', togglePanel);
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);

        // Cerrar al hacer clic en enlaces
        const menuLinks = document.querySelectorAll('.floating-admin-menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href !== window.location.pathname.split('/').pop()) {
                    setTimeout(closePanel, 300);
                }
            });
        });

        // Tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closePanel();
            }
        });
    }

    function markActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const menuLinks = document.querySelectorAll('.floating-admin-menu a');
        
        menuLinks.forEach(link => {
            const href = link.getAttribute('href');
            const linkPage = href.split('?')[0];
            if (linkPage === currentPage || 
                (currentPage === '' && linkPage === 'index.html') ||
                (currentPage.includes(linkPage.replace('.html', '')))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async function checkAuthStatus() {
        const userSection = document.getElementById('floatingAdminUser');
        const notLoggedInSection = document.getElementById('notLoggedIn');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        const logoutBtn = document.getElementById('floatingLogoutBtn');
        const adminMenu = document.getElementById('floatingAdminMenu');
        
        if (!userSection || !logoutBtn) return;

        // Función para mostrar SweetAlert2 cuando no hay sesión
        async function showLoginRequiredAlert() {
            // Verificar si SweetAlert2 está disponible
            if (typeof Swal === 'undefined') {
                console.warn('SweetAlert2 no está disponible');
                return;
            }

            // Solo mostrar si no estamos ya en la página de login
            if (!window.location.pathname.includes('/visitors/login/') && 
                !window.location.pathname.includes('login.html')) {
                
                await Swal.fire({
                    icon: 'info',
                    title: '<div style="color: #17a2b8;"><i class="fas fa-sign-in-alt"></i> Login Required</div>',
                    html: `
                        <div style="text-align: center; padding: 10px 0;">
                            <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                                You need to login to access the admin panel.
                            </p>
                            <p style="color: #6c757d; font-size: 0.85rem;">
                                <i class="fas fa-info-circle" style="color: #f5d742;"></i> 
                                You will be redirected to the login page in a few seconds.
                            </p>
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: 'Go to Login',
                    confirmButtonColor: '#f5d742',
                    showCancelButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    timer: 5000,
                    timerProgressBar: true,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                }).then((result) => {
                    if (result.isConfirmed || result.isDismissed) {
                        window.location.href = '/users/visitors/login/login.html';
                    }
                });
            }
        }

        // Función para redirigir al login
        function redirectToLogin() {
            // Solo redirigir si no estamos ya en la página de login
            if (!window.location.pathname.includes('/visitors/login/') && 
                !window.location.pathname.includes('login.html')) {
                console.log('Redirecting to login page...');
                setTimeout(() => {
                    window.location.href = '/visitors/login/login.html';
                }, 1500);
            }
        }

        // Función para actualizar la UI del usuario
        async function updateUserUI(user) {
            if (user) {
                // Mostrar sección de usuario, ocultar mensaje de no logueado
                userSection.classList.add('active');
                if (notLoggedInSection) notLoggedInSection.classList.remove('active');
                if (adminMenu) adminMenu.style.display = 'block';
                logoutBtn.style.display = 'flex';

                // Intentar obtener información adicional de Firestore
                try {
                    if (db && user.uid) {
                        console.log('Fetching user data from Firestore...');
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            console.log('User data found:', userData);

                            // Actualizar nombre
                            if (userName) {
                                userName.textContent = userData.fullName || 
                                                     user.displayName || 
                                                     user.email.split('@')[0] || 
                                                     'User';
                            }

                            // Actualizar email
                            if (userEmail) {
                                userEmail.textContent = user.email || 'No email';
                            }

                            // Actualizar avatar (foto de perfil)
                            if (userAvatar) {
                                if (userData.photo && userData.photo.startsWith('data:image')) {
                                    // Usar la foto en base64 desde Firestore
                                    userAvatar.style.backgroundImage = `url('${userData.photo}')`;
                                    userAvatar.textContent = '';
                                    console.log('Using Firestore photo');
                                } else if (user.photoURL) {
                                    // Usar la foto de Firebase Auth
                                    userAvatar.style.backgroundImage = `url('${user.photoURL}')`;
                                    userAvatar.textContent = '';
                                    console.log('Using Firebase Auth photo');
                                } else {
                                    // Usar inicial como fallback
                                    const firstLetter = (userData.fullName || 
                                                       user.displayName || 
                                                       user.email || 'U')[0].toUpperCase();
                                    userAvatar.style.backgroundImage = 'none';
                                    userAvatar.textContent = firstLetter;
                                    console.log('Using initial as fallback');
                                }
                            }
                        } else {
                            // No hay datos en Firestore, usar datos de Firebase Auth
                            console.log('No user data in Firestore, using Firebase Auth data');
                            updateWithAuthData(user);
                        }
                    } else {
                        // Firestore no disponible, usar datos de Firebase Auth
                        console.log('Firestore not available, using Firebase Auth data');
                        updateWithAuthData(user);
                    }
                } catch (firestoreError) {
                    console.error('Error fetching user data from Firestore:', firestoreError);
                    // Fallback a datos de Firebase Auth
                    updateWithAuthData(user);
                }
            } else {
                // Usuario no autenticado
                console.log('User not authenticated');
                userSection.classList.remove('active');
                if (notLoggedInSection) notLoggedInSection.classList.add('active');
                if (adminMenu) adminMenu.style.display = 'none';
                logoutBtn.style.display = 'none';

                // Mostrar SweetAlert2 para informar que necesita login
                await showLoginRequiredAlert();
                
                // Redirigir al login después de mostrar el mensaje
                setTimeout(redirectToLogin, 2000);
            }
        }

        // Función auxiliar para actualizar con datos de Firebase Auth
        function updateWithAuthData(user) {
            if (userName) {
                userName.textContent = user.displayName || 
                                     user.email.split('@')[0] || 
                                     'User';
            }
            if (userEmail) {
                userEmail.textContent = user.email || 'No email';
            }
            if (userAvatar) {
                if (user.photoURL) {
                    userAvatar.style.backgroundImage = `url('${user.photoURL}')`;
                    userAvatar.textContent = '';
                } else {
                    const firstLetter = (user.displayName || user.email || 'U')[0].toUpperCase();
                    userAvatar.style.backgroundImage = 'none';
                    userAvatar.textContent = firstLetter;
                }
            }
        }

        // Verificar autenticación de Firebase
        if (typeof firebase !== 'undefined' && firebase.auth) {
            console.log('✅ Firebase auth disponible, verificando autenticación...');
            
            firebase.auth().onAuthStateChanged(async (user) => {
                console.log('Auth state changed:', user ? 'Authenticated' : 'Not authenticated');
                await updateUserUI(user);
            });

            // También verificar inmediatamente
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                console.log('Current user found:', currentUser.email);
                await updateUserUI(currentUser);
            } else {
                console.log('No current user found');
                // Esperar un momento para ver si la autenticación cambia
                setTimeout(async () => {
                    const user = firebase.auth().currentUser;
                    if (!user) {
                        await updateUserUI(null);
                    }
                }, 1000);
            }
        } else {
            console.log('⚠️ Firebase auth no disponible, usando localStorage');
            // Fallback a localStorage
            const userData = localStorage.getItem('adminUser');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    await updateUserUI(user);
                } catch (e) {
                    console.error('Error parsing user data:', e);
                    await updateUserUI(null);
                }
            } else {
                await updateUserUI(null);
            }
        }
    }

    function setupThemeIntegration() {
        const themeToggle = document.getElementById('floatingThemeToggle');
        const themeIcon = document.getElementById('themeToggleIcon');
        const themeText = document.getElementById('themeToggleText');
        
        if (!themeToggle) return;

        // Función para actualizar el tema
        function updateTheme() {
            const isDarkMode = document.body.classList.contains('dark-mode');
            
            // Actualizar ícono y texto
            if (themeIcon) {
                themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
            }
            if (themeText) {
                themeText.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
            }
        }

        // Configurar evento del botón
        themeToggle.addEventListener('click', function() {
            console.log('Theme toggle button clicked');
            
            // Verificar si ThemeManager está disponible
            if (window.ThemeManager) {
                console.log('Using ThemeManager');
                const newTheme = window.ThemeManager.toggle();
                console.log('Theme changed to:', newTheme);
                
                // Esperar un momento para que se aplique el tema
                setTimeout(updateTheme, 100);
            } else {
                console.log('Using manual method');
                // Método manual
                const isDarkMode = document.body.classList.contains('dark-mode');
                const newDarkMode = !isDarkMode;
                
                if (newDarkMode) {
                    document.body.classList.add('dark-mode');
                    document.documentElement.classList.add('dark-mode');
                    localStorage.setItem('theme', 'dark');
                    console.log('Dark mode activated');
                } else {
                    document.body.classList.remove('dark-mode');
                    document.documentElement.classList.remove('dark-mode');
                    localStorage.setItem('theme', 'light');
                    console.log('Light mode activated');
                }
                
                updateTheme();
            }
        });

        // Actualizar inicialmente
        updateTheme();

        // Escuchar cambios si ThemeManager está disponible
        if (window.ThemeManager) {
            window.ThemeManager.onThemeChange((isDarkMode) => {
                console.log('ThemeManager detected theme change:', isDarkMode);
                updateTheme();
            });
        }

        // También escuchar cambios en la clase del body
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
                // Verificar si SweetAlert2 está disponible
                if (typeof Swal === 'undefined') {
                    // Fallback a confirm nativo
                    const confirmLogout = confirm('Are you sure you want to logout?');
                    if (!confirmLogout) return;
                } else {
                    // Usar SweetAlert2 para confirmación
                    const result = await Swal.fire({
                        title: '<div style="color: #0a2540;"><i class="fas fa-sign-out-alt"></i> Confirm Logout</div>',
                        html: `
                            <div style="text-align: center; padding: 10px 0;">
                                <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                                    Are you sure you want to logout from the admin panel?
                                </p>
                            </div>
                        `,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: '<i class="fas fa-check"></i> Yes, Logout',
                        cancelButtonText: '<i class="fas fa-times"></i> Cancel',
                        confirmButtonColor: '#dc3545',
                        cancelButtonColor: '#6c757d',
                        reverseButtons: true
                    });

                    if (!result.isConfirmed) {
                        return;
                    }
                }

                console.log('Starting logout...');

                // Firebase logout
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    try {
                        await firebase.auth().signOut();
                        console.log('Firebase logout successful');
                    } catch (firebaseError) {
                        console.error('Firebase logout error:', firebaseError);
                    }
                }

                // Clear localStorage
                localStorage.removeItem('adminUser');
                localStorage.removeItem('userToken');
                localStorage.removeItem('firebase:authUser');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                console.log('LocalStorage cleared');

                // Mostrar mensaje de éxito con SweetAlert2
                if (typeof Swal !== 'undefined') {
                    await Swal.fire({
                        icon: 'success',
                        title: '<div style="color: #28a745;"><i class="fas fa-check-circle"></i> Logout Successful</div>',
                        html: `
                            <div style="text-align: center; padding: 10px 0;">
                                <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                                    You have been successfully logged out.
                                </p>
                                <p style="color: #6c757d; font-size: 0.85rem;">
                                    <i class="fas fa-info-circle" style="color: #f5d742;"></i> 
                                    You will be redirected to the login page.
                                </p>
                            </div>
                        `,
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                } else {
                    alert('Logout successful! Redirecting to login...');
                }

                // Redirect to login
                console.log('Redirecting to login...');
                setTimeout(() => {
                    window.location.href = '/users/visitors/login/login.html';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Logout error:', error);
                
                // Mostrar error con SweetAlert2 si está disponible
                if (typeof Swal !== 'undefined') {
                    await Swal.fire({
                        icon: 'error',
                        title: '<div style="color: #dc3545;"><i class="fas fa-exclamation-circle"></i> Logout Error</div>',
                        text: 'Error during logout. Please try again.',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#dc3545'
                    });
                } else {
                    alert('Error during logout. Please try again.');
                }
            }
        });
    }

    // Public API
    window.FloatingAdminNavbar = {
        open: function() {
            const toggleBtn = document.getElementById('floatingAdminToggle');
            if (toggleBtn) toggleBtn.click();
        },
        close: function() {
            const closeBtn = document.getElementById('floatingAdminClose');
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
        refreshUser: async function() {
            await checkAuthStatus();
        }
    };

    // Load resources
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