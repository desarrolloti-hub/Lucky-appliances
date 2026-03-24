// salesAdmin.js - Sales history viewer
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
const salesTableContainer = document.querySelector('.sales-table-container');
const salesTableBody = document.getElementById('salesTableBody');
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

// Format date
const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
        
        // Apply search filter only
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

// Apply search filter only
function applyFilters() {
    let filtered = [...allSales];
    
    // Search filter only (no date filter)
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
    
    // Update stats
    updateStats();
    
    // Reset to first page
    currentPage = 1;
    
    // Render table
    renderTable();
}

// Update statistics
function updateStats() {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.amounts.total, 0);
    const totalItems = filteredSales.reduce((sum, sale) => sum + sale.soldItems.length, 0);
    const uniqueCustomers = new Set(filteredSales.map(sale => sale.customer.email || sale.customer.name)).size;
    
    if (totalSalesEl) totalSalesEl.textContent = totalSales;
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (uniqueCustomersEl) uniqueCustomersEl.textContent = uniqueCustomers;
}

// Render table
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageSales = filteredSales.slice(start, end);
    
    if (pageSales.length === 0) {
        if (salesTableContainer) salesTableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
        return;
    }
    
    if (salesTableContainer) salesTableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    if (pagination) pagination.style.display = 'flex';
    
    if (salesTableBody) {
        salesTableBody.innerHTML = pageSales.map(sale => {
            // Usar la URL del PDF que ya está guardada en la venta
            const pdfUrl = sale.pdfURL;
            
            return `
                <tr>
                    <td><strong>${sale.saleNumber}</strong></td>
                    <td>${formatDate(sale.date)}</td>
                    <td>
                        ${sale.customer.name || 'N/A'}
                        ${sale.customer.email ? `<br><small>${sale.customer.email}</small>` : ''}
                    </td>
                    <td>${sale.seller.displayName || 'N/A'}</td>
                    <td>
                        <span class="product-count">${sale.soldItems.length} item(s)</span>
                        <br>
                        <small>${sale.getUniqueProducts().length} unique</small>
                    </td>
                    <td><strong>${formatCurrency(sale.amounts.total)}</strong></td>
                    <td>
                        <span class="status-badge status-${sale.status}">
                            ${sale.status === 'completed' ? 'Completed' : 
                              sale.status === 'cancelled' ? 'Cancelled' : 
                              sale.status === 'refunded' ? 'Refunded' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${pdfUrl ? `
                                <button class="btn-action btn-view" 
                                        onclick="viewPDF('${pdfUrl}', '${sale.saleNumber}')" 
                                        title="View PDF">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-action btn-download" 
                                        onclick="downloadPDF('${pdfUrl}', '${sale.saleNumber}')" 
                                        title="Download PDF">
                                    <i class="fas fa-download"></i>
                                </button>
                            ` : `
                                <span class="no-pdf" title="No PDF available">
                                    <i class="fas fa-file-pdf"></i> No PDF
                                </span>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Update pagination info
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
}

// View PDF - Usando la URL guardada
window.viewPDF = function(url, saleNumber) {
    if (!url) {
        Swal.fire({
            icon: 'warning',
            title: 'No PDF Available',
            text: `No PDF file found for sale ${saleNumber}`
        });
        return;
    }
    
    // Abrir el PDF en nueva pestaña
    window.open(url, '_blank');
};

// Download PDF - Usando la URL guardada
// Download PDF - Versión con manejo de CORS
window.downloadPDF = async function(url, saleNumber) {
    if (!url) {
        Swal.fire({
            icon: 'warning',
            title: 'No PDF Available',
            text: `No PDF file found for sale ${saleNumber}`
        });
        return;
    }
    
    try {
        Swal.fire({
            title: 'Downloading PDF...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Usar fetch con modo cors
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/pdf'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${saleNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        Swal.close();
        
        Swal.fire({
            icon: 'success',
            title: 'Download Complete',
            text: `PDF for ${saleNumber} has been downloaded`,
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error downloading PDF:', error);
        Swal.close();
        
        // Si falla fetch, intentar abrir en nueva pestaña (funciona sin CORS)
        Swal.fire({
            icon: 'info',
            title: 'Opening PDF',
            text: `The PDF will open in a new tab. You can save it from there.`,
            confirmButtonText: 'Open PDF',
            confirmButtonColor: '#4CAF50'
        }).then((result) => {
            if (result.isConfirmed) {
                window.open(url, '_blank');
            }
        });
    }
};

// Show/hide loading
function showLoading(show) {
    if (loadingSales) {
        loadingSales.style.display = show ? 'flex' : 'none';
    }
    if (salesTableContainer) {
        salesTableContainer.style.display = show ? 'none' : 'block';
    }
    if (emptyState) {
        emptyState.style.display = 'none';
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
        renderTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Sales History...');
    
    // Load sales
    loadSales();
    
    // Event listeners - con verificaciones de existencia
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

// Export functions that might be needed globally
window.viewPDF = viewPDF;
window.downloadPDF = downloadPDF;