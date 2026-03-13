// product-admin.js - CRUD for product management with pagination and search
import { ProductManager } from '/classes/product.js';

// SweetAlert global
const Swal = window.Swal;

// Create global instance
const productManager = new ProductManager();

// Pagination variables
let currentPage = 1;
const itemsPerPage = 10;
let totalProducts = 0;
let currentSearchTerm = '';

document.addEventListener('DOMContentLoaded', function() {
    // Load initial products
    loadProducts(1);
    
    // Configure events
    setupEventListeners();
});

// Generate PDF Report
async function generateStockReport() {
    try {
        if (productManager.products.length === 0) {
            showWarning('No hay productos para generar el reporte');
            return;
        }

        // Verificar que las librerías estén cargadas
        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            throw new Error('Las librerías de PDF no están cargadas. Recarga la página.');
        }

        // Mostrar opciones de reporte
        const { value: reportType } = await Swal.fire({
            title: 'Generar Reporte PDF',
            text: 'Selecciona el tipo de reporte que deseas generar',
            icon: 'question',
            input: 'select',
            inputOptions: {
                quick: 'Reporte Rápido (Resumen)',
                detailed: 'Reporte Detallado (Completo)'
            },
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
            confirmButtonText: 'Generar',
            cancelButtonText: 'Cancelar'
        });

        if (!reportType) return;

        Swal.fire({
            title: 'Generando reporte...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Cargar el generador de reportes
        await import('./productReport.js');
        
        // Esperar a que la clase esté disponible
        if (!window.ProductReportGenerator) {
            throw new Error('No se pudo cargar el generador de reportes');
        }

        // Crear instancia del generador
        const reportGenerator = new window.ProductReportGenerator();

        // Obtener mapas de nombres
        const brandsMap = productManager.getBrandsMap();
        const categoriesMap = productManager.getCategoriesMap();
        const providersMap = productManager.getProvidersMap();

        // Enriquecer productos
        const enrichedProducts = productManager.products.map(product => ({
            ...product,
            getBrandName: () => brandsMap[product.Brand] || 'N/A',
            getCategoryName: () => categoriesMap[product.Category] || 'N/A',
            getProviderName: () => providersMap[product.Provider] || 'N/A',
            unidades: product.unidades || [],
            nuestroPrecio: product.nuestroPrecio || 0,
            precioCompetencia: product.precioCompetencia || 0
        }));

        // Generar reporte
        if (reportType === 'quick') {
            await reportGenerator.generateQuickReport(enrichedProducts);
        } else {
            await reportGenerator.generateDetailedReport(enrichedProducts);
        }

        Swal.close();
        showSuccess('Reporte generado exitosamente');

    } catch (error) {
        console.error('Error generando reporte:', error);
        Swal.close();
        showError('Error al generar el reporte: ' + error.message);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Add button - Redirige a nueva página
    document.getElementById('addBtn')?.addEventListener('click', () => {
        window.location.href = '../newProductAdmin/newProductAdmin.html';
    });
    
    // Search input with debounce
    let searchTimeout;
    document.getElementById('searchInput')?.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchTerm = e.target.value.trim();
            currentPage = 1; // Reset to first page on new search
            loadProducts(1);
        }, 500); // 500ms debounce
    });
    
    // Generate report button
    document.getElementById('generateReportBtn')?.addEventListener('click', generateStockReport);
}

// Load products with pagination and search
async function loadProducts(page = 1) {
    try {
        showLoading(true);
        
        // Cargar marcas, categorías y proveedores primero
        await productManager.loadBrandsAndCategoriesAndProviders();
        
        // Luego cargar productos con paginación y búsqueda
        const result = await productManager.loadProductsPaginated(
            page, 
            itemsPerPage, 
            currentSearchTerm
        );
        
        const products = result.products;
        totalProducts = result.total;
        currentPage = page;
        
        const container = document.getElementById('productContainer');
        
        console.log('Loaded products:', products.length, 'Total:', totalProducts);
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box"></i>
                    <p>${currentSearchTerm ? 'No products found matching your search' : 'No products added yet'}</p>
                    ${!currentSearchTerm ? `
                        <button id="addFirstBtn" class="btn-primary">
                            <i class="fas fa-plus"></i> Add first product
                        </button>
                    ` : ''}
                </div>
            `;
            
            // Add event to empty state button if exists
            document.getElementById('addFirstBtn')?.addEventListener('click', () => {
                window.location.href = '../newProductAdmin/newProductAdmin.html';
            });
            
        } else {
            // Obtener mapas de nombres
            const brandsMap = productManager.getBrandsMap();
            const categoriesMap = productManager.getCategoriesMap();
            const providersMap = productManager.getProvidersMap();
            
            container.innerHTML = products.map(product => 
                product.toAdminHTML(brandsMap, categoriesMap, providersMap)
            ).join('');
            
            // Add events to buttons after rendering
            attachButtonEvents();
        }
        
        // Update counters
        updateCounters();
        
        // Render pagination
        renderPagination();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Error loading products: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Render pagination controls
function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const totalPages = Math.ceil(totalProducts / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <div class="pagination">
            <button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
    `;
    
    // Calculate page range to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Always show first page
    if (startPage > 1) {
        paginationHTML += `
            <button class="page-btn ${currentPage === 1 ? 'active' : ''}" data-page="1">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    // Show pages around current page
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>
        `;
    }
    
    // Always show last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
        paginationHTML += `
            <button class="page-btn ${currentPage === totalPages ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>
        `;
    }
    
    paginationHTML += `
            <button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // Add event listeners to pagination buttons
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            
            if (page === 'prev' && currentPage > 1) {
                loadProducts(currentPage - 1);
            } else if (page === 'next' && currentPage < totalPages) {
                loadProducts(currentPage + 1);
            } else if (page !== 'prev' && page !== 'next') {
                loadProducts(parseInt(page));
            }
        });
    });
}

// Attach button events to product cards
function attachButtonEvents() {
    // Edit buttons - Redirige a página de edición
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            window.location.href = `../editProductAdmin/editProductAdmin.html?id=${id}`;
        });
    });
    
    // View buttons - Redirige a página de visualización
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            window.location.href = `../viewProductAdmin/viewProductAdmin.html?id=${id}`;
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            confirmDeleteProduct(id);
        });
    });
}

// Confirm delete product
async function confirmDeleteProduct(id) {
    const product = productManager.getProductById(id);
    if (!product) return;
    
    // Verificar si tiene unidades antes de eliminar
    const unidadesCount = product.unidades?.length || 0;
    let warningMessage = `Are you sure you want to delete <strong>"${product.Model}"</strong> (SKU: ${product.SKU})?<br><small>This action cannot be undone.</small>`;
    
    if (unidadesCount > 0) {
        warningMessage = `Are you sure you want to delete <strong>"${product.Model}"</strong> (SKU: ${product.SKU})?<br>
                          <span style="color: #dc3545;"><strong>⚠️ This product has ${unidadesCount} unit(s) registered.</strong></span><br>
                          <small>All units and their history will be permanently deleted. This action cannot be undone.</small>`;
    }
    
    Swal.fire({
        title: 'Delete product?',
        html: warningMessage,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await productManager.deleteProduct(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Product deleted successfully!',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                // Reload current page
                await loadProducts(currentPage);
            } catch (error) {
                console.error('Error deleting product:', error);
                showError('Error deleting product: ' + error.message);
            }
        }
    });
}

// Update counters
function updateCounters() {
    const countElement = document.getElementById('itemCount');
    const totalValueElement = document.getElementById('totalValue');
    const totalQtyElement = document.getElementById('totalQty');
    
    if (countElement) {
        countElement.textContent = productManager.getTotalProducts();
    }
    
    if (totalValueElement) {
        const totalValue = productManager.getTotalInventoryValue();
        totalValueElement.textContent = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(totalValue);
    }
    
    if (totalQtyElement) {
        totalQtyElement.textContent = productManager.getTotalQuantity();
    }
}

// Show/hide loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

// Notification functions with SweetAlert
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
    });
}

function showWarning(message) {
    Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}