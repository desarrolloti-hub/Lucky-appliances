// dashboardGeneral.js - Dashboard con validación de permisos
import { PermissionManager } from '/classes/permission.js';

// Definición de módulos disponibles (agrupados como en el navbar)
const AVAILABLE_MODULES = [
    // Sales Group
    { 
        id: 'pos', 
        name: 'Point of Sale', 
        icon: 'fa-cash-register',
        description: 'Process sales, manage transactions, and handle customer purchases.',
        path: '../posAdmin/posAdmin.html',
        badge: 'Sales',
        group: 'sales'
    },
    { 
        id: 'sales', 
        name: 'Sales History', 
        icon: 'fa-chart-line',
        description: 'View and manage all completed sales and generate reports.',
        path: '../salesAdmin/salesAdmin.html',
        badge: 'Sales',
        group: 'sales'
    },
    { 
        id: 'clients', 
        name: 'Clients', 
        icon: 'fa-users',
        description: 'Manage customer database and view purchase history.',
        path: '../clientsAdmin/clientsAdmin.html',
        badge: 'Sales',
        group: 'sales'
    },
    // Catalog Group
    { 
        id: 'products', 
        name: 'Product Management', 
        icon: 'fa-box',
        description: 'Add, edit, delete, and manage all products in your inventory.',
        path: '../productAdmin/productAdmin.html',
        badge: 'Catalog',
        group: 'catalog'
    },
    { 
        id: 'categories', 
        name: 'Category Management', 
        icon: 'fa-tags',
        description: 'Organize products into categories and subcategories.',
        path: '../categoryAdmin/categoryAdmin.html',
        badge: 'Catalog',
        group: 'catalog'
    },
    { 
        id: 'brands', 
        name: 'Brand Management', 
        icon: 'fa-tag',
        description: 'Add and manage appliance brands. Upload brand logos.',
        path: '../brandAdmin/brandAdmin.html',
        badge: 'Catalog',
        group: 'catalog'
    },
    // Content Group
    { 
        id: 'comments', 
        name: 'Comments Management', 
        icon: 'fa-comments',
        description: 'Moderate user comments on products.',
        path: '../commentAdmin/commentAdmin.html',
        badge: 'Content',
        group: 'content'
    },
    { 
        id: 'carousel', 
        name: 'Carousel Management', 
        icon: 'fa-images',
        description: 'Manage and update the images displayed in the home page carousel.',
        path: '../carouselAdmin/carouselAdmin.html',
        badge: 'Content',
        group: 'content'
    },
    // Administration Group
    { 
        id: 'users', 
        name: 'User Management', 
        icon: 'fa-users',
        description: 'Create, edit, and manage user accounts and permissions.',
        path: '../newUserAdmin/newUserAdmin.html',
        badge: 'Admin',
        group: 'administration'
    },
    { 
        id: 'permissions', 
        name: 'Permissions Management', 
        icon: 'fa-shield-alt',
        description: 'Configure access permissions for user roles.',
        path: '../permissionAdmin/permissionAdmin.html',
        badge: 'Admin',
        group: 'administration'
    }
];

// Configuración de grupos (mismo orden que el navbar)
const GROUP_CONFIG = {
    sales: { name: 'Sales', icon: 'fa-chart-line', order: 1, description: 'Manage sales, POS, and clients' },
    catalog: { name: 'Catalog', icon: 'fa-boxes', order: 2, description: 'Manage products, categories, and brands' },
    content: { name: 'Content', icon: 'fa-images', order: 3, description: 'Manage comments and carousel images' },
    administration: { name: 'Administration', icon: 'fa-cog', order: 4, description: 'Manage users and permissions' }
};

// Mapeo de roles a nombres descriptivos
const ROLE_DISPLAY_NAMES = {
    admin: 'Administrator',
    developer: 'Developer',
    auditor: 'Auditor',
    sales: 'Sales',
    store: 'Store'
};

let permissionManager = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await checkCurrentUser();
        
        if (currentUser) {
            permissionManager = new PermissionManager();
            await loadPermissionsAndValidate();
            setupEventListeners();
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAccessDenied('Error loading dashboard');
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
        
        if (!currentUser.role) {
            showAccessDenied('User role not defined. Please contact administrator.');
            return false;
        }
        
        // Actualizar header con información del usuario
        updateHeaderInfo();
        return true;
        
    } catch (error) {
        console.error('Error parsing user data:', error);
        showAccessDenied('Error loading user information.');
        return false;
    }
}

function updateHeaderInfo() {
    const welcomeBadge = document.querySelector('.welcome-badge');
    const roleDisplay = ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role;
    
    if (welcomeBadge) {
        welcomeBadge.innerHTML = `<i class="fas fa-user-check"></i> Welcome, ${currentUser.fullName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User'} (${roleDisplay})`;
    }
    
    // Actualizar título del header si es necesario
    const headerTitle = document.querySelector('.dashboard-header h1');
    if (headerTitle && currentUser.role !== 'admin') {
        headerTitle.innerHTML = `<i class="fas fa-tachometer-alt"></i> Dashboard - ${roleDisplay}`;
    }
}

async function loadPermissionsAndValidate() {
    try {
        const container = document.getElementById('modulesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-modules">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading your permissions...</p>
                </div>
            `;
        }
        
        await permissionManager.loadPermissions();
        
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
        
        // Agrupar módulos por categoría
        const groupedModules = groupModulesByCategory(accessibleModules);
        
        // Renderizar módulos agrupados
        renderGroupedModules(groupedModules, userPermissions);
        
        // Mostrar estadísticas de acceso
        renderAccessStats(accessibleModules, userPermissions);
        
    } catch (error) {
        console.error('Error loading permissions:', error);
        showError('Error loading permissions: ' + error.message);
    }
}

function groupModulesByCategory(modules) {
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

function renderGroupedModules(groupedModules, userPermissions) {
    const container = document.getElementById('modulesContainer');
    if (!container) return;
    
    const groupOrder = ['sales', 'catalog', 'content', 'administration'];
    let html = '';
    
    for (const groupKey of groupOrder) {
        const modules = groupedModules[groupKey];
        if (modules && modules.length > 0) {
            const groupInfo = GROUP_CONFIG[groupKey] || { 
                name: groupKey.charAt(0).toUpperCase() + groupKey.slice(1), 
                icon: 'fa-folder',
                description: 'Manage related modules'
            };
            
            html += `
                <div class="modules-group">
                    <div class="modules-group-header">
                        <i class="fas ${groupInfo.icon}"></i>
                        <h3>${groupInfo.name}</h3>
                        <span class="group-badge">${modules.length} modules</span>
                    </div>
                    <div class="modules-grid">
                        ${modules.map(module => `
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
                                        <i class="fas fa-check-circle"></i>
                                        ${module.badge}
                                    </span>
                                    <span class="module-link">
                                        Access Module
                                        <i class="fas fa-arrow-right"></i>
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
    
    // Agregar eventos a las tarjetas
    document.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Evitar que el click en el badge o link dispare el evento
            if (e.target.closest('.module-badge') || e.target.closest('.module-link')) {
                e.stopPropagation();
            }
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
    
    // Contar módulos por grupo
    const modulesByGroup = modules.reduce((acc, module) => {
        const groupName = GROUP_CONFIG[module.group]?.name || module.group;
        acc[groupName] = (acc[groupName] || 0) + 1;
        return acc;
    }, {});
    
    const groupNames = Object.keys(modulesByGroup).join(', ');
    
    const stats = [
        {
            icon: 'fa-check-circle',
            value: accessibleModules,
            label: 'Accessible Modules',
            sublabel: `out of ${totalModules} total`
        },
        {
            icon: 'fa-percent',
            value: `${percentage}%`,
            label: 'Coverage',
            sublabel: 'of total modules'
        },
        {
            icon: 'fa-layer-group',
            value: Object.keys(modulesByGroup).length,
            label: 'Categories',
            sublabel: groupNames || 'None'
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
                <div class="stat-sublabel">${stat.sublabel}</div>
            </div>
        </div>
    `).join('');
    
    statsSection.style.display = 'block';
}

function showNoPermissions() {
    const container = document.getElementById('modulesContainer');
    const roleDisplay = ROLE_DISPLAY_NAMES[currentUser?.role] || currentUser?.role || 'User';
    
    if (container) {
        container.innerHTML = `
            <div class="access-denied">
                <i class="fas fa-lock"></i>
                <h2>No Permissions Configured</h2>
                <p>Your role <strong>"${roleDisplay}"</strong> does not have any permissions configured yet.</p>
                <p>Please contact an administrator to set up your access permissions.</p>
                <button class="btn-primary" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Return to Login
                </button>
            </div>
        `;
    }
    
    const summarySection = document.getElementById('accessSummary');
    if (summarySection) summarySection.style.display = 'none';
}

function showNoModules() {
    const container = document.getElementById('modulesContainer');
    const roleDisplay = ROLE_DISPLAY_NAMES[currentUser?.role] || currentUser?.role || 'User';
    
    if (container) {
        container.innerHTML = `
            <div class="access-denied">
                <i class="fas fa-ban"></i>
                <h2>No Accessible Modules</h2>
                <p>Your role <strong>"${roleDisplay}"</strong> has permissions configured, but no modules are accessible.</p>
                <p>Please contact an administrator to review your permissions.</p>
                <button class="btn-primary" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Return to Login
                </button>
            </div>
        `;
    }
    
    const summarySection = document.getElementById('accessSummary');
    if (summarySection) summarySection.style.display = 'none';
}

function showAccessDenied(message) {
    const container = document.getElementById('modulesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="access-denied">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Access Denied</h2>
            <p>${message || 'You do not have permission to access this dashboard.'}</p>
            <button class="btn-primary" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i> Return to Login
            </button>
        </div>
    `;
    
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
            <button class="btn-primary" onclick="window.location.reload()">
                <i class="fas fa-sync-alt"></i> Try Again
            </button>
        </div>
    `;
}

function setupEventListeners() {
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

// Auto-refresh cada 5 minutos
setInterval(async () => {
    if (document.visibilityState === 'visible' && currentUser && permissionManager) {
        console.log('Auto-refreshing permissions...');
        await loadPermissionsAndValidate();
    }
}, 300000);