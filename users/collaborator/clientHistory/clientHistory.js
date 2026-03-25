// clientHistory.js - Client purchase history viewer
import { ClientManager } from '/classes/client.js';
import { SalesManager } from '/classes/sale.js';

// Initialize managers
const clientManager = new ClientManager();
const salesManager = new SalesManager();

// State
let currentClient = null;
let clientSales = [];

// DOM Elements
const loadingState = document.getElementById('loadingState');
const clientInfoCard = document.getElementById('clientInfoCard');
const statsSummary = document.getElementById('statsSummary');
const salesSection = document.getElementById('salesSection');
const salesGrid = document.getElementById('salesGrid');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');

// Client info elements
const clientNameEl = document.getElementById('clientName');
const clientPhoneEl = document.getElementById('clientPhone');
const clientEmailEl = document.getElementById('clientEmail');
const clientAddressEl = document.getElementById('clientAddress');

// Stats elements
const totalPurchasesEl = document.getElementById('totalPurchases');
const totalSpentEl = document.getElementById('totalSpent');
const firstPurchaseEl = document.getElementById('firstPurchase');
const lastPurchaseEl = document.getElementById('lastPurchase');

// Get client ID from URL
function getClientIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('clientId');
}

// Format currency
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
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
};

// Format date for display (with time)
const formatDateTime = (date) => {
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

// Load client information
async function loadClientInfo(clientId) {
    try {
        // Load all clients if not loaded
        if (clientManager.clients.length === 0) {
            await clientManager.loadClients();
        }
        
        currentClient = clientManager.getClientById(clientId);
        
        if (!currentClient) {
            throw new Error('Client not found');
        }
        
        // Display client info
        clientNameEl.textContent = currentClient.name;
        clientPhoneEl.textContent = currentClient.getFormattedPhone();
        clientEmailEl.textContent = currentClient.getFormattedEmail();
        clientAddressEl.textContent = currentClient.getFormattedAddress();
        
        clientInfoCard.style.display = 'block';
        
        return currentClient;
        
    } catch (error) {
        console.error('Error loading client info:', error);
        throw error;
    }
}

// Load sales for the client
async function loadClientSales(clientId) {
    try {
        // Load all sales if not loaded
        if (salesManager.sales.length === 0) {
            await salesManager.loadSales(500);
        }
        
        // Get client's purchase history (array of sale IDs)
        const historyIds = currentClient.getHistory();
        
        if (historyIds.length === 0) {
            emptyState.style.display = 'block';
            return [];
        }
        
        // Find sales that match the IDs
        clientSales = salesManager.sales.filter(sale => 
            historyIds.includes(sale.id)
        );
        
        // Sort by date (newest first)
        clientSales.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return dateB - dateA;
        });
        
        return clientSales;
        
    } catch (error) {
        console.error('Error loading client sales:', error);
        throw error;
    }
}

// Update stats summary
function updateStats(sales) {
    if (sales.length === 0) {
        totalPurchasesEl.textContent = '0';
        totalSpentEl.textContent = formatCurrency(0);
        firstPurchaseEl.textContent = 'N/A';
        lastPurchaseEl.textContent = 'N/A';
        return;
    }
    
    const totalSpent = sales.reduce((sum, sale) => sum + (sale.amounts?.total || 0), 0);
    const firstSale = sales[sales.length - 1];
    const lastSale = sales[0];
    
    totalPurchasesEl.textContent = sales.length;
    totalSpentEl.textContent = formatCurrency(totalSpent);
    firstPurchaseEl.textContent = formatDate(firstSale?.date);
    lastPurchaseEl.textContent = formatDate(lastSale?.date);
    
    statsSummary.style.display = 'grid';
}

// Render sales grid
function renderSales(sales) {
    if (sales.length === 0) {
        emptyState.style.display = 'block';
        salesGrid.style.display = 'none';
        salesSection.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    salesGrid.style.display = 'grid';
    salesSection.style.display = 'block';
    
    salesGrid.innerHTML = sales.map(sale => {
        const pdfUrl = sale.pdfURL;
        const itemsCount = sale.soldItems?.length || 0;
        
        return `
            <div class="sale-card">
                <div class="sale-card-header">
                    <span class="sale-number">${sale.saleNumber}</span>
                    <span class="sale-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${formatDateTime(sale.date)}
                    </span>
                </div>
                <div class="sale-content">
                    <div class="sale-row">
                        <i class="fas fa-boxes"></i>
                        <span class="label">Items:</span>
                        <span class="value">${itemsCount} product(s)</span>
                    </div>
                    <div class="sale-row">
                        <i class="fas fa-tag"></i>
                        <span class="label">Products Subtotal:</span>
                        <span class="value">${formatCurrency(sale.amounts?.productsSubtotal || 0)}</span>
                    </div>
                    ${sale.additionalCharges?.length > 0 ? `
                        <div class="sale-row">
                            <i class="fas fa-plus-circle"></i>
                            <span class="label">Additional Charges:</span>
                            <span class="value">${formatCurrency(sale.amounts?.additionalChargesTotal || 0)}</span>
                        </div>
                    ` : ''}
                    ${sale.amounts?.tax > 0 ? `
                        <div class="sale-row">
                            <i class="fas fa-percent"></i>
                            <span class="label">Tax:</span>
                            <span class="value">${formatCurrency(sale.amounts?.tax || 0)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="sale-total">
                    <span class="sale-total-label">Total:</span>
                    <span class="sale-total-value">${formatCurrency(sale.amounts?.total || 0)}</span>
                </div>
                <div class="sale-actions">
                    ${pdfUrl ? `
                        <button class="btn-view-pdf" onclick="viewPDF('${pdfUrl}', '${sale.saleNumber}')">
                            <i class="fas fa-file-pdf"></i> View Invoice
                        </button>
                    ` : `
                        <span class="no-pdf" style="font-size: 0.7rem; color: var(--text-light);">
                            <i class="fas fa-file-pdf"></i> No PDF available
                        </span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// View PDF
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

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorState.style.display = 'block';
}

// Hide all content
function hideAllContent() {
    clientInfoCard.style.display = 'none';
    statsSummary.style.display = 'none';
    salesSection.style.display = 'none';
    salesGrid.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
}

// Show loading
function showLoading(show) {
    if (loadingState) {
        loadingState.style.display = show ? 'flex' : 'none';
    }
    if (show) {
        hideAllContent();
    }
}

// Initialize
async function init() {
    const clientId = getClientIdFromUrl();
    
    if (!clientId) {
        showError('No client ID provided. Please select a client from the clients page.');
        showLoading(false);
        return;
    }
    
    try {
        showLoading(true);
        
        // Load client information
        await loadClientInfo(clientId);
        
        // Load client sales
        const sales = await loadClientSales(clientId);
        
        // Update stats
        updateStats(sales);
        
        // Render sales
        renderSales(sales);
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showError(error.message || 'An error occurred while loading the client information.');
    } finally {
        showLoading(false);
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Client History...');
    init();
});

// Export functions for global use
window.viewPDF = viewPDF;