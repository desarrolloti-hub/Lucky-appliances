// dashAdmin.js - Admin Dashboard

// All system modules (consistent with floating menu)
const ALL_MODULES = [
    // Sales Group
    { 
        id: 'pos', 
        name: 'Point of Sale', 
        icon: 'fa-cash-register',
        description: 'Process sales and manage transactions.',
        path: '../posAdmin/posAdmin.html',
        badge: 'Sales',
        group: 'sales'
    },
    { 
        id: 'sales', 
        name: 'Sales History', 
        icon: 'fa-chart-line',
        description: 'View and manage all completed sales.',
        path: '../salesAdmin/salesAdmin.html',
        badge: 'Sales',
        group: 'sales'
    },
    { 
        id: 'clients', 
        name: 'Clients', 
        icon: 'fa-users',
        description: 'Manage customer database and purchase history.',
        path: '../clientsAdmin/clientsAdmin.html',
        badge: 'Sales',
        group: 'sales'
    },
    // Catalog Group
    { 
        id: 'products', 
        name: 'Products', 
        icon: 'fa-box',
        description: 'Add, edit, and manage product inventory.',
        path: '../productAdmin/productAdmin.html',
        badge: 'Catalog',
        group: 'catalog'
    },
    { 
        id: 'categories', 
        name: 'Categories', 
        icon: 'fa-tags',
        description: 'Organize products into categories.',
        path: '../categoryAdmin/categoryAdmin.html',
        badge: 'Catalog',
        group: 'catalog'
    },
    { 
        id: 'brands', 
        name: 'Brands', 
        icon: 'fa-tag',
        description: 'Manage product brands and logos.',
        path: '../brandAdmin/brandAdmin.html',
        badge: 'Catalog',
        group: 'catalog'
    },
    // Content Group
    { 
        id: 'comments', 
        name: 'Comments', 
        icon: 'fa-comments',
        description: 'Moderate user comments on products.',
        path: '../commentAdmin/commentAdmin.html',
        badge: 'Content',
        group: 'content'
    },
    { 
        id: 'carousel', 
        name: 'Carousel', 
        icon: 'fa-images',
        description: 'Manage homepage carousel images.',
        path: '../carouselAdmin/carouselAdmin.html',
        badge: 'Content',
        group: 'content'
    },
    // Administration Group
    { 
        id: 'users', 
        name: 'Users', 
        icon: 'fa-users',
        description: 'Create and manage user accounts.',
        path: '../newUserAdmin/newUserAdmin.html',
        badge: 'Admin',
        group: 'administration'
    },
    { 
        id: 'permissions', 
        name: 'Permissions', 
        icon: 'fa-shield-alt',
        description: 'Configure user role permissions.',
        path: '../permissionAdmin/permissionAdmin.html',
        badge: 'Admin',
        group: 'administration'
    }
];

// Group modules by category
function groupModules(modules) {
    const groups = {
        sales: { name: 'Sales', icon: 'fa-chart-line', modules: [] },
        catalog: { name: 'Catalog', icon: 'fa-boxes', modules: [] },
        content: { name: 'Content', icon: 'fa-images', modules: [] },
        administration: { name: 'Administration', icon: 'fa-cog', modules: [] }
    };
    
    modules.forEach(module => {
        if (groups[module.group]) {
            groups[module.group].modules.push(module);
        }
    });
    
    return groups;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await verifyAdminAccess();
        
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        loadUserInfo();
        loadAllModules();
        await loadStatistics();
        await loadRecentActivity();
        
        setInterval(checkAuthStatus, 300000);
        
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        showError('Error loading dashboard. Please refresh the page.');
    }
});

async function verifyAdminAccess() {
    const userData = localStorage.getItem('currentUser');
    
    if (!userData) {
        window.location.href = '/visitor/login/login.html';
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        
        if (!user.role || user.role.toLowerCase() !== 'admin') {
            if (user.role) {
                window.location.href = '/users/collaborator/dashboardGeneral/dashboardGeneral.html';
            } else {
                window.location.href = '/visitor/login/login.html';
            }
            return;
        }
        
        console.log('Admin access verified for user:', user.email);
        
    } catch (error) {
        console.error('Error verifying admin access:', error);
        window.location.href = '/visitor/login/login.html';
    }
}

function loadUserInfo() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const welcomeElement = document.getElementById('welcomeUser');
            const userName = user.fullName || user.displayName || user.email?.split('@')[0] || 'Administrator';
            welcomeElement.textContent = `Welcome, ${userName}`;
            welcomeElement.style.display = 'inline-block';
        } catch (e) {
            console.error('Error loading user info:', e);
        }
    }
}

// Load all modules grouped
function loadAllModules() {
    const container = document.getElementById('modulesContainer');
    const groupedModules = groupModules(ALL_MODULES);
    
    let modulesHtml = '';
    
    for (const [key, group] of Object.entries(groupedModules)) {
        if (group.modules.length > 0) {
            modulesHtml += `
                <div class="modules-group">
                    <div class="modules-group-header">
                        <i class="fas ${group.icon}"></i>
                        <h4>${group.name}</h4>
                    </div>
                    <div class="actions-grid">
                        ${group.modules.map(module => `
                            <a href="${module.path}" class="action-card">
                                <div class="action-header">
                                    <div class="action-icon">
                                        <i class="fas ${module.icon}"></i>
                                    </div>
                                    <div class="action-info">
                                        <h4 class="action-title">${module.name}</h4>
                                        <p class="action-description">${module.description}</p>
                                    </div>
                                </div>
                                <div class="action-footer">
                                    <span class="action-badge">${module.badge}</span>
                                    <span class="action-cta">
                                        <span>Open</span>
                                        <i class="fas fa-arrow-right"></i>
                                    </span>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    container.innerHTML = modulesHtml;
}

async function loadStatistics() {
    const statsGrid = document.getElementById('statsGrid');
    
    statsGrid.innerHTML = `
        <div class="stat-card loading">
            <div class="stat-icon"><i class="fas fa-spinner fa-spin"></i></div>
            <div class="stat-content">
                <div class="stat-value">---</div>
                <div class="stat-label">Loading...</div>
            </div>
        </div>
    `.repeat(4);
    
    try {
        const { ProductManager } = await import('/classes/product.js');
        const { CategoryManager } = await import('/classes/category.js');
        const { BrandManager } = await import('/classes/brand.js');
        const { CommentManager } = await import('/classes/comment.js');
        const { SalesManager } = await import('/classes/sale.js');
        
        const productManager = new ProductManager();
        const categoryManager = new CategoryManager();
        const brandManager = new BrandManager();
        const commentManager = new CommentManager();
        const salesManager = new SalesManager();
        
        await Promise.all([
            productManager.loadProducts(),
            categoryManager.loadCategories(),
            brandManager.loadBrands(),
            commentManager.loadComments(),
            salesManager.loadSales()
        ]);
        
        const totalProducts = productManager.getTotalProducts();
        const totalCategories = categoryManager.getTotalCategories();
        const totalBrands = brandManager.getTotalBrands();
        const totalComments = commentManager.getTotalComments();
        const totalSales = salesManager.sales.length;
        const totalRevenue = salesManager.sales.reduce((sum, sale) => sum + (sale.amounts?.total || 0), 0);
        const unreadComments = commentManager.getUnreadComments().length;
        const totalQuantity = productManager.getTotalQuantity();
        
        const formatNumber = (num) => num.toLocaleString('en-US');
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        };
        
        const stats = [
            {
                icon: 'fa-box',
                value: formatNumber(totalProducts),
                label: 'Products',
                sublabel: `${formatNumber(totalQuantity)} units`,
                change: `${formatCurrency(productManager.getTotalInventoryValue())} value`,
                changeClass: 'positive'
            },
            {
                icon: 'fa-chart-line',
                value: formatNumber(totalSales),
                label: 'Sales',
                sublabel: `${formatNumber(totalSales)} transactions`,
                change: formatCurrency(totalRevenue),
                changeClass: 'positive'
            },
            {
                icon: 'fa-tags',
                value: `${formatNumber(totalCategories)} | ${formatNumber(totalBrands)}`,
                label: 'Categories | Brands',
                sublabel: 'Product organization',
                change: 'Manage',
                changeClass: 'positive'
            },
            {
                icon: 'fa-comments',
                value: formatNumber(totalComments),
                label: 'Comments',
                sublabel: `${formatNumber(unreadComments)} unread`,
                change: unreadComments > 0 ? `${unreadComments} pending` : 'All moderated',
                changeClass: unreadComments > 0 ? 'negative' : 'positive'
            }
        ];
        
        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas ${stat.icon}"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-sublabel">${stat.sublabel}</div>
                    <div class="stat-change ${stat.changeClass}">${stat.change}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-content">
                    <div class="stat-value">Error</div>
                    <div class="stat-label">Failed to load</div>
                    <div class="stat-change negative" onclick="location.reload()" style="cursor: pointer;">Retry</div>
                </div>
            </div>
        `.repeat(4);
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    
    try {
        const { SalesManager } = await import('/classes/sale.js');
        const salesManager = new SalesManager();
        
        await salesManager.loadSales(10);
        
        const recentSales = salesManager.sales.slice(0, 5);
        
        if (recentSales.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount || 0);
        };
        
        activityList.innerHTML = recentSales.map(sale => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-cash-register"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${sale.saleNumber}</strong> - ${formatCurrency(sale.amounts?.total || 0)}
                    </div>
                    <div class="activity-time">${sale.getShortDate()}</div>
                </div>
                <div class="activity-customer">${sale.customer?.name || 'Guest'}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load activity</p>
            </div>
        `;
    }
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function checkAuthStatus() {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = '/visitor/login/login.html';
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        if (!user.role || user.role.toLowerCase() !== 'admin') {
            window.location.href = '/users/collaborator/dashboardGeneral/dashboardGeneral.html';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        window.location.href = '/visitor/login/login.html';
    }
}

function showError(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000
        });
    } else {
        console.error(message);
    }
}

window.refreshDashboard = async function() {
    await loadStatistics();
    await loadRecentActivity();
};

if (window.ThemeManager) {
    window.ThemeManager.onThemeChange((isDarkMode) => {
        console.log('Admin dashboard theme updated:', isDarkMode ? 'dark' : 'light');
    });
}

// Auto-refresh every 5 minutes
setInterval(async () => {
    if (document.visibilityState === 'visible') {
        await loadStatistics();
    }
}, 300000);