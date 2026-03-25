// clientsAdmin.js - Clients management page
import { ClientManager } from '/classes/client.js';

// Initialize manager
const clientManager = new ClientManager();

// State
let allClients = [];
let filteredClients = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentClientId = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const clientsGrid = document.getElementById('clientsGrid');
const emptyState = document.getElementById('emptyState');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const addClientBtn = document.getElementById('addClientBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfo = document.getElementById('pageInfo');

// Stats elements
const totalClientsEl = document.getElementById('totalClients');
const totalPurchasesEl = document.getElementById('totalPurchases');
const withEmailEl = document.getElementById('withEmail');
const withPhoneEl = document.getElementById('withPhone');

// Modal elements
const clientModal = document.getElementById('clientModal');
const modalTitle = document.getElementById('modalTitle');
const clientForm = document.getElementById('clientForm');
const clientIdInput = document.getElementById('clientId');
const customerNameInput = document.getElementById('customerName');
const addressInput = document.getElementById('address');
const phoneInput = document.getElementById('phone');
const emailInput = document.getElementById('email');
const closeModalBtn = document.querySelector('.close-modal');
const cancelBtn = document.querySelector('.btn-cancel');

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// Load clients from Firebase
async function loadClients() {
    try {
        showLoading(true);
        
        await clientManager.loadClients();
        allClients = clientManager.clients;
        
        console.log(`Loaded ${allClients.length} clients`);
        
        applyFilters();
        
    } catch (error) {
        console.error('Error loading clients:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not load clients: ' + error.message
        });
    } finally {
        showLoading(false);
    }
}

// Apply search filter
function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    filteredClients = clientManager.searchClients(searchTerm);
    
    updateStats();
    currentPage = 1;
    renderClients();
}

// Update statistics
function updateStats() {
    const stats = clientManager.getStats();
    
    if (totalClientsEl) totalClientsEl.textContent = stats.total;
    if (totalPurchasesEl) totalPurchasesEl.textContent = stats.totalPurchases;
    if (withEmailEl) withEmailEl.textContent = stats.withEmail;
    if (withPhoneEl) withPhoneEl.textContent = stats.withPhone;
}

// Render clients grid
function renderClients() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageClients = filteredClients.slice(start, end);
    
    if (pageClients.length === 0) {
        if (clientsGrid) clientsGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
        return;
    }
    
    if (clientsGrid) clientsGrid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    if (pagination) pagination.style.display = 'flex';
    
    clientsGrid.innerHTML = pageClients.map(client => `
        <div class="client-card" data-id="${client.id}">
            <div class="card-header">
                <span class="client-name">
                    <i class="fas fa-user-circle"></i>
                    ${escapeHtml(client.name)}
                </span>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" onclick="editClient('${client.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteClient('${client.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="client-content">
                <div class="client-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="label">Address:</span>
                    <span class="value">${escapeHtml(client.getFormattedAddress())}</span>
                </div>
                <div class="client-row">
                    <i class="fas fa-phone"></i>
                    <span class="label">Phone:</span>
                    <span class="value">${escapeHtml(client.getFormattedPhone())}</span>
                </div>
                <div class="client-row">
                    <i class="fas fa-envelope"></i>
                    <span class="label">Email:</span>
                    <span class="value">${escapeHtml(client.getFormattedEmail())}</span>
                </div>
            </div>
            <div class="client-footer">
                <div class="purchase-count">
                    <i class="fas fa-shopping-cart"></i>
                    ${client.getHistoryCount()} purchase(s)
                </div>
                <button class="btn-view-purchases" onclick="viewClientHistory('${client.id}')">
                    <i class="fas fa-eye"></i> View History
                </button>
            </div>
        </div>
    `).join('');
    
    // Update pagination info
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
}

// View client history - Redirigir a la página de historial
window.viewClientHistory = function(clientId) {
    if (!clientId) {
        Swal.fire({
            icon: 'warning',
            title: 'Error',
            text: 'Client ID not found'
        });
        return;
    }
    
    // Redirigir a la página de historial con el ID del cliente como parámetro
    window.location.href = `../clientHistory/clientHistory.html?clientId=${clientId}`;
};

// Open modal to add client
function openAddModal() {
    currentClientId = null;
    modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add Client';
    clientIdInput.value = '';
    customerNameInput.value = '';
    addressInput.value = '';
    phoneInput.value = '';
    emailInput.value = '';
    clientModal.classList.add('active');
}

// Open modal to edit client
window.editClient = async function(clientId) {
    const client = clientManager.getClientById(clientId);
    if (!client) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Client not found'
        });
        return;
    }
    
    currentClientId = clientId;
    modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Edit Client';
    clientIdInput.value = client.id;
    customerNameInput.value = client.name;
    addressInput.value = client.address;
    phoneInput.value = client.phone;
    emailInput.value = client.email;
    clientModal.classList.add('active');
};

// Delete client
window.deleteClient = async function(clientId) {
    const client = clientManager.getClientById(clientId);
    if (!client) return;
    
    const result = await Swal.fire({
        title: 'Delete Client',
        text: `Are you sure you want to delete "${client.name}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
        try {
            await clientManager.deleteClient(clientId);
            allClients = clientManager.clients;
            applyFilters();
            
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Client has been deleted.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error deleting client:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not delete client: ' + error.message
            });
        }
    }
};

// Save client (add or edit)
async function saveClient(event) {
    event.preventDefault();
    
    const clientData = {
        name: customerNameInput.value.trim(),
        address: addressInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim()
    };
    
    if (!clientData.name) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Customer name is required'
        });
        return;
    }
    
    try {
        if (currentClientId) {
            // Update existing client
            await clientManager.updateClient(currentClientId, clientData);
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: 'Client has been updated.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Create new client
            await clientManager.createClient(clientData);
            Swal.fire({
                icon: 'success',
                title: 'Created!',
                text: 'Client has been added.',
                timer: 2000,
                showConfirmButton: false
            });
        }
        
        // Reload clients
        allClients = clientManager.clients;
        applyFilters();
        closeModal();
        
    } catch (error) {
        console.error('Error saving client:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not save client: ' + error.message
        });
    }
}

// Close modal
function closeModal() {
    clientModal.classList.remove('active');
    clientForm.reset();
    currentClientId = null;
}

// Show/hide loading
function showLoading(show) {
    if (loadingState) {
        loadingState.style.display = show ? 'flex' : 'none';
    }
    if (clientsGrid) {
        clientsGrid.style.display = show ? 'none' : 'grid';
    }
}

// Pagination handlers
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderClients();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderClients();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Clients Management...');
    
    loadClients();
    
    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    if (addClientBtn) {
        addClientBtn.addEventListener('click', openAddModal);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', prevPage);
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', nextPage);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === clientModal) {
            closeModal();
        }
    });
    
    // Form submit
    if (clientForm) {
        clientForm.addEventListener('submit', saveClient);
    }
});

// Export functions for global use
window.editClient = editClient;
window.deleteClient = deleteClient;
window.viewClientHistory = viewClientHistory;