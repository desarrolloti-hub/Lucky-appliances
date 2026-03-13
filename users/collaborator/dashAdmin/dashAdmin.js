
// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Set current date
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Load user info
    loadUserInfo();
    
    // Load statistics
    await loadStatistics();
    
    // Load recent activity
    await loadRecentActivity();
    
    // Check auth status periodically
    setInterval(checkAuthStatus, 300000); // Every 5 minutes
});

function loadUserInfo() {
    // Try to get user info from Firebase
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const welcomeElement = document.getElementById('welcomeUser');
                const userName = user.displayName || user.email.split('@')[0] || 'Administrator';
                welcomeElement.textContent = `Welcome, ${userName}`;
                welcomeElement.style.display = 'inline-block';
            }
        });
    } else {
        // Fallback to localStorage
        const userData = localStorage.getItem('adminUser');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                document.getElementById('welcomeUser').textContent = `Welcome, ${user.name || 'Administrator'}`;
            } catch (e) {
                console.error('Error loading user info:', e);
            }
        }
    }
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
        console.log('Loading statistics data...');
        
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
                change: 'Manage comments',
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
                    <div class="stat-change negative">
                        Please try again
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
                text: `Product added: ${product.Model || product.SKU || 'New Product'}`,
                time: product.fechaCreacion ? 
                    timeAgo(product.fechaCreacion.toDate()) : 
                    'Recently'
            });
        });
        
        // Add comment activities
        recentComments.forEach(comment => {
            const statusIcon = comment.status === 'unread' ? 'fa-envelope' : 
                              comment.status === 'read' ? 'fa-envelope-open' : 'fa-archive';
            activities.push({
                icon: statusIcon,
                text: `New ${comment.status} comment from ${comment.name || 'Anonymous'}`,
                time: comment.timestamp ? 
                    timeAgo(comment.timestamp.toDate()) : 
                    'Recently'
            });
        });
        
        // Add system activities
        activities.push({
            icon: 'fa-user',
            text: 'You logged into the admin panel',
            time: 'Just now'
        });
        
        activities.push({
            icon: 'fa-chart-line',
            text: 'Dashboard statistics updated',
            time: 'Just now'
        });
        
        // If no activities, show empty state
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                    <i class="fas fa-history fa-3x" style="margin-bottom: 20px;"></i>
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
            <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px; color: var(--danger);"></i>
                <h3>Failed to Load Activity</h3>
                <p>Please try refreshing the page</p>
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
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user && !window.location.pathname.includes('login.html')) {
                // Redirect to login if not authenticated
                window.location.href = 'login.html';
            }
        });
    } else {
        // Fallback to localStorage check
        const userData = localStorage.getItem('adminUser');
        if (!userData && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
}

// Theme compatibility
if (window.ThemeManager) {
    // Listen for theme changes to update dashboard colors
    window.ThemeManager.onThemeChange((isDarkMode) => {
        // Update any theme-specific elements if needed
        console.log('Dashboard theme updated:', isDarkMode ? 'dark' : 'light');
    });
}

// Keyboard shortcuts for dashboard
document.addEventListener('keydown', (e) => {
    // Alt + P for Products
    if (e.altKey && e.key === 'p') {
        e.preventDefault();
        window.location.href = 'product-manager.html';
    }
    // Alt + C for Categories
    if (e.altKey && e.key === 'c') {
        e.preventDefault();
        window.location.href = 'category-manager.html';
    }
    // Alt + B for Brands
    if (e.altKey && e.key === 'b') {
        e.preventDefault();
        window.location.href = 'brand-manager.html';
    }
    // Alt + D for Dashboard (refresh)
    if (e.altKey && e.key === 'd') {
        e.preventDefault();
        window.location.reload();
    }
});

// Print dashboard
function printDashboard() {
    window.print();
}

// Export dashboard data (placeholder)
function exportDashboardData() {
    alert('Export feature coming soon!');
}

// Make refresh function available
async function refreshDashboardData() {
    await loadStatistics();
    await loadRecentActivity();
    
    // Show notification using SweetAlert2 if available
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        
        Toast.fire({
            icon: 'success',
            title: 'Dashboard refreshed successfully!'
        });
    }
}

// Auto-refresh every 5 minutes
setInterval(async () => {
    if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing dashboard data...');
        await loadStatistics();
    }
}, 300000); // 5 minutes

// Add refresh button to header (optional enhancement)
function addRefreshButton() {
    const header = document.querySelector('.dashboard-header');
    if (header) {
        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        `;
        refreshBtn.onmouseover = () => refreshBtn.style.background = 'rgba(255,255,255,0.3)';
        refreshBtn.onmouseout = () => refreshBtn.style.background = 'rgba(255,255,255,0.2)';
        refreshBtn.onclick = refreshDashboardData;
        
        header.style.position = 'relative';
        header.appendChild(refreshBtn);
    }
}

// Initialize refresh button when DOM is ready
setTimeout(addRefreshButton, 1000);