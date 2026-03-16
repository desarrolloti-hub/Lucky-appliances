// dashAdmin.js - Admin Dashboard con acceso a todos los módulos

// Definición de todos los módulos disponibles en el sistema
const ALL_MODULES = [
    { 
        id: 'products', 
        name: 'Product Management', 
        icon: 'fa-box',
        description: 'Add, edit, delete, and manage all products in your inventory.',
        path: '../productAdmin/productAdmin.html',
        badge: 'Inventory Control'
    },
    { 
        id: 'categories', 
        name: 'Category Management', 
        icon: 'fa-tags',
        description: 'Organize products into categories and subcategories.',
        path: '../categoryAdmin/categoryAdmin.html',
        badge: 'Organization'
    },
    { 
        id: 'brands', 
        name: 'Brand Management', 
        icon: 'fa-brands fa-apple',
        description: 'Add and manage appliance brands. Upload brand logos.',
        path: '../brandAdmin/brandAdmin.html',
        badge: 'Brand Control'
    },
    { 
        id: 'comments', 
        name: 'Comments Management', 
        icon: 'fa-comments',
        description: 'Moderate user comments on products.',
        path: '../commentAdmin/commentAdmin.html',
        badge: 'Moderation'
    },
    { 
        id: 'reviews', 
        name: 'Product Reviews', 
        icon: 'fa-star',
        description: 'Monitor and manage customer reviews.',
        path: '../commentAdmin/commentAdmin.html',
        badge: 'Customer Feedback'
    },
    { 
        id: 'users', 
        name: 'User Management', 
        icon: 'fa-users',
        description: 'Create, edit, and manage user accounts and permissions.',
        path: '../newUserAdmin/newUserAdmin.html',
        badge: 'User Administration'
    },
    { 
        id: 'carousel', 
        name: 'Home Carousel', 
        icon: 'fa-images',
        description: 'Manage and update homepage carousel images.',
        path: '../carouselAdmin/carouselAdmin.html',
        badge: 'Visual Content'
    },
    { 
        id: 'suppliers', 
        name: 'Supplier Management', 
        icon: 'fa-truck',
        description: 'Manage suppliers and vendor relationships.',
        path: '../providerAdmin/providerAdmin.html',
        badge: 'Vendor Control'
    },
    { 
        id: 'pos', 
        name: 'Point of Sale', 
        icon: 'fa-cash-register',
        description: 'Process sales and manage transactions.',
        path: '../posAdmin/posAdmin.html',
        badge: 'Sales'
    },
    { 
        id: 'permissions', 
        name: 'Permissions Management', 
        icon: 'fa-lock',
        description: 'Configure access permissions for user roles.',
        path: '../permissionAdmin/permissionAdmin.html',
        badge: 'Security'
    }
];

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verificar que el usuario es admin
        await verifyAdminAccess();
        
        // Set current date
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Load user info
        loadUserInfo();
        
        // Cargar todos los módulos usando los estilos existentes
        loadAllModules();
        
        // Load statistics
        await loadStatistics();
        
        // Load recent activity
        await loadRecentActivity();
        
        // Check auth status periodically
        setInterval(checkAuthStatus, 300000); // Every 5 minutes
        
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        showError('Error loading dashboard. Please refresh the page.');
    }
});

// Verificar que el usuario tiene rol de admin
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

// Cargar todos los módulos usando la estructura de action-card existente
function loadAllModules() {
    const container = document.getElementById('modulesContainer');
    
    const modulesHtml = `
        <div class="actions-grid">
            ${ALL_MODULES.map(module => `
                <a href="${module.path}" class="action-card">
                    <div class="action-header">
                        <div class="action-icon">
                            <i class="fas ${module.icon}"></i>
                        </div>
                        <h3 class="action-title">${module.name}</h3>
                    </div>
                    <p class="action-description">${module.description}</p>
                    <span class="action-badge">${module.badge}</span>
                    <div class="action-cta">
                        <span>Access Module</span>
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </a>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = modulesHtml;
}

async function loadStatistics() {
    const statsGrid = document.getElementById('statsGrid');
    
    // Show loading state
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div class="stat-content">
                <div class="stat-value">Loading...</div>
                <div class="stat-label">Please wait</div>
            </div>
        </div>
    `.repeat(4);
    
    try {
        // Import the managers dynamically
        const { ProductManager } = await import('/classes/product.js');
        const { CategoryManager } = await import('/classes/category.js');
        const { BrandManager } = await import('/classes/brand.js');
        const { CommentManager } = await import('/classes/comment.js');
        
        // Initialize managers
        const productManager = new ProductManager();
        const categoryManager = new CategoryManager();
        const brandManager = new BrandManager();
        const commentManager = new CommentManager();
        
        // Load data from each manager
        await Promise.all([
            productManager.loadProducts(),
            categoryManager.loadCategories(),
            brandManager.loadBrands(),
            commentManager.loadComments()
        ]);
        
        // Calculate totals from managers
        const totalProducts = productManager.getTotalProducts();
        const totalCategories = categoryManager.getTotalCategories();
        const totalBrands = brandManager.getTotalBrands();
        const totalComments = commentManager.getTotalComments();
        const unreadComments = commentManager.getUnreadComments().length;
        
        // Calculate inventory value
        const inventoryValue = productManager.getTotalInventoryValue();
        const totalQuantity = productManager.getTotalQuantity();
        
        // Format inventory value as currency
        const formattedInventoryValue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(inventoryValue);
        
        // Format numbers with commas
        const formatNumber = (num) => num.toLocaleString('en-US');
        
        // Create stats data
        const stats = [
            {
                icon: 'fa-box',
                value: formatNumber(totalProducts),
                label: 'Total Products',
                sublabel: `${formatNumber(totalQuantity)} units in stock`,
                change: `Value: ${formattedInventoryValue}`,
                changeClass: 'positive'
            },
            {
                icon: 'fa-tags',
                value: formatNumber(totalCategories),
                label: 'Categories',
                sublabel: 'Product Groups',
                change: 'View all categories',
                changeClass: 'positive'
            },
            {
                icon: 'fa-brands fa-apple',
                value: formatNumber(totalBrands),
                label: 'Brands',
                sublabel: 'Manufacturers',
                change: 'Manage brands',
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
        
        // Render stats
        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas ${stat.icon}"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-sublabel" style="font-size: 0.85rem; color: var(--text-light); margin: 5px 0;">
                        ${stat.sublabel}
                    </div>
                    <div class="stat-change ${stat.changeClass}">
                        ${stat.change}
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        
        // Show error state
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">Error</div>
                    <div class="stat-label">Failed to load data</div>
                    <div class="stat-change negative" onclick="location.reload()" style="cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Click to retry
                    </div>
                </div>
            </div>
        `.repeat(4);
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    
    try {
        // Import the managers dynamically
        const { ProductManager } = await import('/classes/product.js');
        const { CommentManager } = await import('/classes/comment.js');
        
        // Initialize managers
        const productManager = new ProductManager();
        const commentManager = new CommentManager();
        
        // Load data
        await Promise.all([
            productManager.loadProducts(),
            commentManager.loadComments()
        ]);
        
        // Get recent data from managers
        const recentProducts = productManager.products.slice(0, 3);
        const recentComments = commentManager.comments.slice(0, 2);
        
        // Create activity items
        const activities = [];
        
        // Add product activities
        recentProducts.forEach(product => {
            activities.push({
                icon: 'fa-box',
                text: `Product ${product.id ? 'updated' : 'added'}: ${product.Model || product.SKU || 'New Product'}`,
                time: product.fechaCreacion ? 
                    timeAgo(product.fechaCreacion.toDate()) : 
                    'Recently'
            });
        });
        
        // Add comment activities
        recentComments.forEach(comment => {
            const statusIcon = comment.status === 'unread' ? 'fa-envelope' : 
                              comment.status === 'read' ? 'fa-envelope-open' : 'fa-archive';
            const statusText = comment.status === 'unread' ? 'New' : 
                              comment.status === 'read' ? 'Read' : 'Archived';
            
            activities.push({
                icon: statusIcon,
                text: `${statusText} comment from ${comment.name || 'Anonymous'}`,
                time: comment.timestamp ? 
                    timeAgo(comment.timestamp.toDate()) : 
                    'Recently'
            });
        });
        
        // Add system activities
        activities.push({
            icon: 'fa-user-shield',
            text: 'Admin logged into the dashboard',
            time: 'Just now'
        });
        
        activities.push({
            icon: 'fa-chart-line',
            text: 'Dashboard statistics updated',
            time: 'Just now'
        });
        
        // Sort by time (most recent first)
        activities.sort((a, b) => {
            if (a.time === 'Just now') return -1;
            if (b.time === 'Just now') return 1;
            return 0;
        });
        
        // If no activities, show empty state
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Recent Activity</h3>
                    <p>Activity will appear here as you manage your store</p>
                </div>
            `;
            return;
        }
        
        // Render activities
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        
        // Show error state
        activityList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to Load Activity</h3>
                <p>Please try refreshing the page</p>
                <div class="action-cta" onclick="location.reload()" style="cursor: pointer; justify-content: center; margin-top: 20px;">
                    <i class="fas fa-sync-alt"></i>
                    <span>Refresh Page</span>
                </div>
            </div>
        `;
    }
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
    
    return 'Just now';
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

// Refresh dashboard data
window.refreshDashboard = async function() {
    await loadStatistics();
    await loadRecentActivity();
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Dashboard Refreshed',
            text: 'All data has been updated',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
};

// Theme compatibility
if (window.ThemeManager) {
    window.ThemeManager.onThemeChange((isDarkMode) => {
        console.log('Admin dashboard theme updated:', isDarkMode ? 'dark' : 'light');
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Alt + R to refresh
    if (e.altKey && e.key === 'r') {
        e.preventDefault();
        window.refreshDashboard();
    }
    // Alt + H for home (dashboard)
    if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/users/administrator/dashAdmin/dashAdmin.html';
    }
});

// Auto-refresh every 5 minutes if tab is active
setInterval(async () => {
    if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing admin dashboard...');
        await loadStatistics();
    }
}, 300000); // 5 minutes