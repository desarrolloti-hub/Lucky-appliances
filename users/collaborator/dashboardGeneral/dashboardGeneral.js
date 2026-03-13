// dashboardGeneral.js - Dashboard con validación de permisos
import { PermissionManager } from '/classes/permission.js';

// Definición de módulos disponibles
const AVAILABLE_MODULES = [
    { 
        id: 'brands', 
        name: 'Brand Management', 
        icon: 'fa-tags',
        description: 'Add, edit, and manage appliance brands. Upload brand logos and organize products by manufacturer.',
        path: '../brandAdmin/brandAdmin.html',
        badge: 'Brand Control',
    },
    { 
        id: 'categories', 
        name: 'Category Management', 
        icon: 'fa-list',
        description: 'Organize products into categories and subcategories. Manage category hierarchy and visibility.',
        path: '../categoryAdmin/categoryAdmin.html',
        badge: 'Organization',
    },
    { 
        id: 'comments', 
        name: 'Comments Management', 
        icon: 'fa-comments',
        description: 'Moderate user comments on products. Approve, edit, or delete customer feedback.',
        path: '../commentAdmin/commentAdmin.html',
        badge: 'Moderation',
    },
    { 
        id: 'carousel', 
        name: 'Carousel Management', 
        icon: 'fa-images',
        description: 'Manage and update the images displayed in the home page carousel.',
        path: '../carouselAdmin/carouselAdmin.html',
        badge: 'Visual Content',
    },
    { 
        id: 'users', 
        name: 'User Management', 
        icon: 'fa-users',
        description: 'Create, edit, and manage user accounts. Set permissions, roles, and access levels.',
        path: '../newUserAdmin/newUserAdmin.html',
        badge: 'User Administration',
    },
    { 
        id: 'products', 
        name: 'Product Management', 
        icon: 'fa-box',
        description: 'Add, edit, delete, and manage all products in your inventory.',
        path: '../productAdmin/productAdmin.html',
        badge: 'Inventory Control',
    },
    { 
        id: 'suppliers', 
        name: 'Supplier Management', 
        icon: 'fa-truck',
        description: 'Manage your suppliers and vendor relationships.',
        path: '../providerAdmin/providerAdmin.html', //  ACTUALIZADO
        badge: 'Vendor Control',
    },
    { 
        id: 'pos', 
        name: 'Point of Sale', 
        icon: 'fa-cash-register',
        description: 'Process sales, manage transactions, and handle customer purchases.',
        path: '../posAdmin/posAdmin.html',
        badge: 'Sales',
    },
    { 
        id: 'permissions', 
        name: 'Permissions Management', 
        icon: 'fa-lock',
        description: 'Configure access permissions for user roles.',
        path: '../permissionAdmin/permissionAdmin.html', // CORREGIDO (antes tenía "permisionAdmin.html")
        badge: 'Security',
    }
];

// Mapeo de roles a nombres descriptivos
const ROLE_DISPLAY_NAMES = {
    admin: 'Administrator',
    developer: 'Developer',
    auditor: 'Auditor',
    sales: 'Sales',
    store: 'Store'
};

// Iconos por rol
const ROLE_ICONS = {
    admin: 'fa-crown',
    developer: 'fa-code',
    auditor: 'fa-clipboard-check',
    sales: 'fa-chart-line',
    store: 'fa-store'
};

// Colores por rol
const ROLE_COLORS = {
    admin: '#dc3545',
    developer: '#6f42c1',
    auditor: '#17a2b8',
    sales: '#28a745',
    store: '#fd7e14'
};

let permissionManager = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verificar usuario en localStorage
        await checkCurrentUser();
        
        if (currentUser) {
            // Inicializar PermissionManager
            permissionManager = new PermissionManager();
            
            // Cargar permisos y validar acceso
            await loadPermissionsAndValidate();
            
            // Configurar eventos
            setupEventListeners();
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAccessDenied('Error al cargar el dashboard');
    }
});

function checkCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    
    if (!userData) {
        showAccessDenied('No user session found. Please log in.');
        return false;
    }
    
    try {
        currentUser = JSON.parse(userData);
        
        // Validar que el usuario tenga rol
        if (!currentUser.role) {
            showAccessDenied('User role not defined. Please contact administrator.');
            return false;
        }
        
        // Mostrar información del usuario
        return true;
        
    } catch (error) {
        console.error('Error parsing user data:', error);
        showAccessDenied('Error loading user information.');
        return false;
    }
}




async function loadPermissionsAndValidate() {
    try {
        // Mostrar loading
        const container = document.getElementById('modulesContainer');
        container.innerHTML = `
            <div class="loading-modules">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading your permissions...</p>
            </div>
        `;
        
        // Cargar permisos
        await permissionManager.loadPermissions();
        
        // Verificar permisos del usuario
        const userPermissions = permissionManager.getPermissionByRole(currentUser.role);
        
        if (!userPermissions) {
            console.log(`No permissions found for role: ${currentUser.role}`);
            showNoPermissions();
            return;
        }
        
        // Filtrar módulos accesibles
        const accessibleModules = AVAILABLE_MODULES.filter(module => 
            userPermissions.hasPermission(module.id)
        );
        
        if (accessibleModules.length === 0) {
            showNoModules();
            return;
        }
        
        // Mostrar módulos
        renderModules(accessibleModules, userPermissions);
        
        // Mostrar estadísticas de acceso
        renderAccessStats(accessibleModules, userPermissions);
        
    } catch (error) {
        console.error('Error loading permissions:', error);
        showError('Error loading permissions: ' + error.message);
    }
}

function renderModules(modules, userPermissions) {
    const container = document.getElementById('modulesContainer');
    
    container.innerHTML = modules.map(module => {
        const hasAccess = userPermissions.hasPermission(module.id);
        
        return `
            <div class="module-card" data-module="${module.id}" data-path="${module.path}">
                <div class="module-header">
                    <div class="module-icon">
                        <i class="fas ${module.icon}"></i>
                    </div>
                    <div class="module-info">
                        <h3>${module.name}</h3>
                        <p>${module.description}</p>
                    </div>
                </div>
                                
                <div class="module-footer">
                    <span class="module-badge">
                        <i class="fas ${hasAccess ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                        ${hasAccess ? 'Access Granted' : 'No Access'}
                    </span>
                    <span class="module-link">
                        Access Module
                        <i class="fas fa-arrow-right"></i>
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    // Agregar eventos a las tarjetas
    document.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', () => {
            const path = card.dataset.path;
            if (path) {
                window.location.href = path;
            }
        });
    });
}

function renderAccessStats(modules, userPermissions) {
    const statsSection = document.getElementById('accessSummary');
    const statsGrid = document.getElementById('accessStats');
    
    if (!statsSection || !statsGrid) return;
    
    const totalModules = AVAILABLE_MODULES.length;
    const accessibleModules = modules.length;
    const percentage = Math.round((accessibleModules / totalModules) * 100);
    
    // Contar módulos por categoría (basado en badges)
    const modulesByBadge = modules.reduce((acc, module) => {
        acc[module.badge] = (acc[module.badge] || 0) + 1;
        return acc;
    }, {});
    
    // Crear estadísticas
    const stats = [
        {
            icon: 'fa-check-circle',
            value: accessibleModules,
            label: 'Accessible Modules'
        },
        {
            icon: 'fa-percent',
            value: `${percentage}%`,
            label: 'Coverage'
        },
        {
            icon: 'fa-layer-group',
            value: Object.keys(modulesByBadge).length,
            label: 'Categories'
        }
    ];
    
    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card-small">
            <div class="stat-icon-small">
                <i class="fas ${stat.icon}"></i>
            </div>
            <div class="stat-content-small">
                <div class="stat-value-small">${stat.value}</div>
                <div class="stat-label-small">${stat.label}</div>
            </div>
        </div>
    `).join('');
    
    statsSection.style.display = 'block';
}

function showNoPermissions() {
    const container = document.getElementById('modulesContainer');
    const roleDisplay = ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role;
    
    container.innerHTML = `
        <div class="access-denied">
            <i class="fas fa-lock"></i>
            <h2>No Permissions Configured</h2>
            <p>Your role <strong>"${roleDisplay}"</strong> does not have any permissions configured yet.</p>
            <p>Please contact an administrator to set up your access permissions.</p>
            <button class="btn-logout" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i>
                Return to Login
            </button>
        </div>
    `;
}

function showNoModules() {
    const container = document.getElementById('modulesContainer');
    const roleDisplay = ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role;
    
    container.innerHTML = `
        <div class="access-denied">
            <i class="fas fa-ban"></i>
            <h2>No Accessible Modules</h2>
            <p>Your role <strong>"${roleDisplay}"</strong> has permissions configured, but no modules are accessible.</p>
            <p>Please contact an administrator to review your permissions.</p>
            <button class="btn-logout" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i>
                Return to Login
            </button>
        </div>
    `;
}

function showAccessDenied(message) {
    const container = document.getElementById('modulesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="access-denied">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Access Denied</h2>
            <p>${message || 'You do not have permission to access this dashboard.'}</p>
            <button class="btn-logout" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i>
                Return to Login
            </button>
        </div>
    `;
    
    // Ocultar otras secciones
    const summarySection = document.getElementById('accessSummary');
    if (summarySection) summarySection.style.display = 'none';
}

function showError(message) {
    const container = document.getElementById('modulesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="access-denied">
            <i class="fas fa-exclamation-circle"></i>
            <h2>Error</h2>
            <p>${message}</p>
            <button class="btn-logout" onclick="window.location.reload()">
                <i class="fas fa-sync-alt"></i>
                Try Again
            </button>
        </div>
    `;
}

function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshModules');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await loadPermissionsAndValidate();
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        });
    }
}

// Función global para logout
window.handleLogout = function() {
    localStorage.removeItem('currentUser');
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Logged Out',
            text: 'You have been successfully logged out.',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = '/login.html';
        });
    } else {
        window.location.href = '/login.html';
    }
};

// Auto-refresh cada 5 minutos si la pestaña está activa
setInterval(async () => {
    if (document.visibilityState === 'visible' && currentUser && permissionManager) {
        console.log('Auto-refreshing permissions...');
        await loadPermissionsAndValidate();
    }
}, 300000); // 5 minutos