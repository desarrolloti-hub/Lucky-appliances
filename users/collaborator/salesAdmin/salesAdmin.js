// salesAdmin.js - Sales history viewer (solo tarjetas compactas)
import { SalesManager } from '/classes/sale.js';
import { ProductManager } from '/classes/product.js';

// Initialize managers
const salesManager = new SalesManager();
const productManager = new ProductManager();

// State
let allSales = [];
let filteredSales = [];
let currentPage = 1;
const itemsPerPage = 15;

// DOM Elements
const loadingSales = document.getElementById('loadingSales');
const salesCardsContainer = document.getElementById('salesCardsContainer');
const emptyState = document.getElementById('emptyState');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfo = document.getElementById('pageInfo');

// Stats elements
const totalSalesEl = document.getElementById('totalSales');
const totalRevenueEl = document.getElementById('totalRevenue');
const totalItemsEl = document.getElementById('totalItems');
const uniqueCustomersEl = document.getElementById('uniqueCustomers');

// Currency formatter
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

// Format short date for cards
const formatShortDate = (date) => {
    if (!date) return 'N/A';
    try {
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
};

// Load sales from Firebase
async function loadSales() {
    try {
        showLoading(true);
        
        await productManager.loadBrandsAndCategoriesAndProviders();
        allSales = await salesManager.loadSales(500);
        
        console.log(`Loaded ${allSales.length} sales`);
        
        applyFilters();
        
    } catch (error) {
        console.error('Error loading sales:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not load sales: ' + error.message
        });
    } finally {
        showLoading(false);
    }
}

// Apply search filter
function applyFilters() {
    let filtered = [...allSales];
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (searchTerm) {
        filtered = filtered.filter(sale => 
            sale.saleNumber.toLowerCase().includes(searchTerm) ||
            sale.customer.name.toLowerCase().includes(searchTerm) ||
            sale.customer.email.toLowerCase().includes(searchTerm) ||
            sale.seller.displayName.toLowerCase().includes(searchTerm)
        );
    }
    
    filteredSales = filtered;
    
    updateStats();
    currentPage = 1;
    renderCards();
}

// Update statistics
function updateStats() {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.amounts?.total || 0), 0);
    const totalItems = filteredSales.reduce((sum, sale) => sum + (sale.soldItems?.length || 0), 0);
    const uniqueCustomers = new Set(filteredSales.map(sale => sale.customer?.email || sale.customer?.name)).size;
    
    if (totalSalesEl) totalSalesEl.textContent = totalSales;
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (uniqueCustomersEl) uniqueCustomersEl.textContent = uniqueCustomers;
}

// Render cards
function renderCards() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageSales = filteredSales.slice(start, end);
    
    if (pageSales.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
        if (salesCardsContainer) salesCardsContainer.style.display = 'none';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (pagination) pagination.style.display = 'flex';
    if (salesCardsContainer) salesCardsContainer.style.display = 'grid';
    
    if (salesCardsContainer) {
        salesCardsContainer.innerHTML = pageSales.map(sale => {
            const pdfUrl = sale.pdfURL;
            const itemCount = sale.soldItems.length;
            const uniqueCount = sale.getUniqueProducts().length;
            
            return `
                <div class="sale-card">
                    <div class="card-header">
                        <span class="card-sale-number">${sale.saleNumber}</span>
                        <span class="card-status status-badge status-${sale.status}">
                            ${sale.status === 'completed' ? 'Completed' : 
                              sale.status === 'cancelled' ? 'Cancelled' : 
                              sale.status === 'refunded' ? 'Refunded' : 'Pending'}
                        </span>
                    </div>
                    <div class="card-content">
                        <div class="card-row">
                            <i class="fas fa-calendar-alt"></i>
                            <span class="label">Date:</span>
                            <span class="value">${formatShortDate(sale.date)}</span>
                        </div>
                        <div class="card-row">
                            <i class="fas fa-user"></i>
                            <span class="label">Customer:</span>
                            <span class="value">${sale.customer.name || 'N/A'}</span>
                        </div>
                        <div class="card-row">
                            <i class="fas fa-user-tie"></i>
                            <span class="label">Seller:</span>
                            <span class="value">${sale.seller.displayName || 'N/A'}</span>
                        </div>
                        <div class="card-products">
                            <div class="card-products-info">
                                <span><i class="fas fa-box"></i> ${itemCount} item(s)</span>
                                <span><i class="fas fa-tag"></i> ${uniqueCount} unique</span>
                            </div>
                        </div>
                        <div class="card-total">
                            <span class="card-total-label">Total:</span>
                            <span class="card-total-value">${formatCurrency(sale.amounts.total)}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        ${pdfUrl ? `
                            <button class="btn-view-card" onclick="viewPDF('${pdfUrl}', '${sale.saleNumber}')">
                                <i class="fas fa-eye"></i> View Invoice
                            </button>
                        ` : `
                            <span class="no-pdf">
                                <i class="fas fa-file-pdf"></i> No PDF
                            </span>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update pagination info
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
}

// View PDF - Solo ver
window.viewPDF = function(url, saleNumber) {
    if (!url) {
        Swal.fire({
            icon: 'warning',
            title: 'No PDF Available',
            text: `No PDF file found for sale ${saleNumber}`
        });
        return;
    }
    
    window.open(url, '_blank');
};

// Show/hide loading
function showLoading(show) {
    if (loadingSales) {
        loadingSales.style.display = show ? 'flex' : 'none';
    }
    if (salesCardsContainer) {
        salesCardsContainer.style.display = show ? 'none' : 'grid';
    }
}

// Clear search filter
function clearFilters() {
    if (searchInput) searchInput.value = '';
    applyFilters();
}

// Pagination handlers
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCards();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCards();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Sales History...');
    
    loadSales();
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', prevPage);
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', nextPage);
    }
});

// Export functions
window.viewPDF = viewPDF;