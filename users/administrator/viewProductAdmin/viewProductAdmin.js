// viewProductAdmin.js - View product details (read-only)
import { ProductManager } from '/classes/product.js';

const Swal = window.Swal;
const productManager = new ProductManager();

// State
let currentProduct = null;
let currentProductId = null;

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

console.log('=== VIEW PRODUCT INIT ===');
console.log('Document ID from URL:', productId);

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded');
    
    if (!productId) {
        console.error('No product ID provided');
        showNotFound('No product ID provided');
        return;
    }
    
    currentProductId = productId;
    
    try {
        showLoading(true);
        console.log('Starting to load product data for document ID:', productId);
        
        // PASO 1: Cargar marcas, categorías y proveedores
        console.log('Loading brands, categories and providers...');
        await productManager.loadBrandsAndCategoriesAndProviders();
        console.log('Brands loaded:', productManager.brands.length);
        console.log('Categories loaded:', productManager.categories.length);
        console.log('Providers loaded:', productManager.providers.length);
        
        // PASO 2: Cargar TODOS los productos primero
        console.log('Loading all products...');
        await productManager.loadProducts();
        console.log('Total products loaded:', productManager.products.length);
        
        // PASO 3: Buscar el producto por ID
        console.log('Searching for product with document ID:', currentProductId);
        currentProduct = productManager.getProductById(currentProductId);
        
        console.log('Product found:', currentProduct ? 'Yes' : 'No');
        
        if (!currentProduct) {
            console.error('Product not found for document ID:', currentProductId);
            console.log('Available product IDs:', productManager.products.map(p => p.id));
            showNotFound('Product not found');
            return;
        }
        
        console.log('Product loaded successfully:', {
            docId: currentProduct.id,
            Model: currentProduct.Model,
            SKU: currentProduct.SKU,
            unidadesCount: currentProduct.unidades?.length || 0,
            imagesCount: currentProduct.images?.length || 0
        });
        
        // PASO 4: Configurar el botón de editar
        setupEditButton();
        
        // PASO 5: Mostrar los detalles del producto
        displayProductDetails();
        
        // PASO 6: Mostrar el contenedor de detalles
        document.getElementById('productDetails').style.display = 'block';
        console.log('Product details displayed');
        
    } catch (error) {
        console.error('ERROR loading product:', error);
        console.error('Error stack:', error.stack);
        showNotFound('Error loading product: ' + error.message);
    } finally {
        showLoading(false);
        console.log('Loading complete');
    }
});

function setupEditButton() {
    const editBtn = document.getElementById('editProductBtn');
    if (editBtn) {
        editBtn.href = `../editProductAdmin/editProductAdmin.html?id=${currentProductId}`;
        console.log('Edit button configured with URL:', editBtn.href);
    }
}

function displayProductDetails() {
    // Get names from maps
    const brandsMap = productManager.getBrandsMap();
    const categoriesMap = productManager.getCategoriesMap();
    const providersMap = productManager.getProvidersMap();
    
    const brandName = brandsMap[currentProduct.Brand] || 'Unknown Brand';
    const categoryName = categoriesMap[currentProduct.Category] || 'Unknown Category';
    const providerName = providersMap[currentProduct.Provider] || 'Unknown Provider';
    
    // Basic Information
    setTextContent('modelValue', currentProduct.Model || '-');
    setTextContent('skuValue', currentProduct.SKU || '-');
    setTextContent('idInternoValue', currentProduct.idInterno || '-');
    
    // Categorization
    setTextContent('brandValue', brandName);
    setTextContent('categoryValue', categoryName);
    setTextContent('providerValue', providerName);
    setTextContent('subcategoryValue', currentProduct.Subcategory || '-');
    
    // Description
    setTextContent('descriptionValue', currentProduct.ItemDescription || 'No description provided');
    setTextContent('specificationsValue', currentProduct.especificaciones || 'No specifications provided');
    
    // Pricing
    setTextContent('competitorPriceValue', formatCurrency(currentProduct.precioCompetencia || 0));
    setTextContent('ourPriceValue', formatCurrency(currentProduct.nuestroPrecio || 0));
    
    // Physical Inventory
    setTextContent('weightValue', `${currentProduct.UnitWeight || 0} lbs`);
    setTextContent('locationValue', currentProduct.Location || 'No location specified');
    
    // Images
    displayImages();
    
    // Units
    displayUnits();
    
    // Audit Information
    displayAuditInfo();
}

function displayImages() {
    const container = document.getElementById('imagesContainer');
    if (!container) return;
    
    if (!currentProduct.images || currentProduct.images.length === 0) {
        container.innerHTML = `
            <div class="no-images">
                <i class="fas fa-image"></i>
                <p>No images available for this product</p>
            </div>
        `;
        return;
    }
    
    let imagesHTML = '<div class="images-grid">';
    
    currentProduct.images.forEach((image, index) => {
        const imageUrl = currentProduct.getImageUrl(index);
        imagesHTML += `
            <div class="image-item">
                <img src="${imageUrl}" 
                     alt="${currentProduct.Model} - Image ${index + 1}"
                     onclick="openImageModal('${imageUrl}')"
                     loading="lazy">
                <span class="image-number">${index + 1}</span>
            </div>
        `;
    });
    
    imagesHTML += '</div>';
    container.innerHTML = imagesHTML;
}

function displayUnits() {
    const container = document.getElementById('unitsContainer');
    const unitsCountSpan = document.getElementById('unitsCount');
    
    if (!container) return;
    
    const unidades = currentProduct.unidades || [];
    
    // Update count
    if (unitsCountSpan) {
        unitsCountSpan.textContent = `${unidades.length} unit${unidades.length !== 1 ? 's' : ''}`;
    }
    
    if (unidades.length === 0) {
        container.innerHTML = `
            <div class="no-units">
                <i class="fas fa-cube"></i>
                <p>No units registered for this product</p>
            </div>
        `;
        return;
    }
    
    let unitsHTML = '<div class="units-grid">';
    
    unidades.forEach((unit, index) => {
        const firstMovement = unit.historial && unit.historial.length > 0 
            ? formatDate(unit.historial[0].fechaMovimiento)
            : 'N/A';
        
        const lastMovement = unit.historial && unit.historial.length > 0
            ? formatDate(unit.historial[unit.historial.length - 1].fechaMovimiento)
            : 'N/A';
        
        unitsHTML += `
            <div class="unit-card">
                <div class="unit-header">
                    <span class="unit-number">#${index + 1}</span>
                    <span class="unit-serial">${escapeHtml(unit.numeroSerie)}</span>
                </div>
                <div class="unit-details">
                    <div class="unit-detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>First: ${firstMovement}</span>
                    </div>
                    <div class="unit-detail-item">
                        <i class="fas fa-history"></i>
                        <span>Movements: ${unit.historial?.length || 0}</span>
                    </div>
                    <div class="unit-detail-item">
                        <i class="fas fa-clock"></i>
                        <span>Last: ${lastMovement}</span>
                    </div>
                </div>
                <button class="btn-view-history" data-serial="${escapeHtml(unit.numeroSerie)}">
                    <i class="fas fa-eye"></i> View Full History
                </button>
            </div>
        `;
    });
    
    unitsHTML += '</div>';
    container.innerHTML = unitsHTML;
    
    // Add event listeners to history buttons
    container.querySelectorAll('.btn-view-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const serial = btn.getAttribute('data-serial');
            viewUnitHistory(serial);
        });
    });
}

async function viewUnitHistory(serialNumber) {
    const unidad = currentProduct.unidades?.find(u => u.numeroSerie === serialNumber);
    if (!unidad) return;
    
    let historialHTML = '';
    
    if (unidad.historial && unidad.historial.length > 0) {
        historialHTML = unidad.historial.map((mov, index) => `
            <tr>
                <td>${mov.movimiento || index + 1}</td>
                <td>${formatDate(mov.fechaMovimiento)}</td>
                <td>${mov.descripcionMovimiento || 'N/A'}</td>
                <td>${mov.tipoMovimiento || 'N/A'}</td>
                <td>${mov.idUsuario || 'N/A'}</td>
            </tr>
        `).join('');
    } else {
        historialHTML = '<tr><td colspan="5" class="text-center">No movement history</td></tr>';
    }
    
    Swal.fire({
        title: `Unit History - ${serialNumber}`,
        html: `
            <div style="text-align: left;">
                <p><strong>Product:</strong> ${currentProduct.Model}</p>
                <p><strong>SKU:</strong> ${currentProduct.SKU || 'N/A'}</p>
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>Movement</th>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>User</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historialHTML}
                        </tbody>
                    </table>
                </div>
            </div>
        `,
        width: '900px',
        confirmButtonText: 'Close'
    });
}

function displayAuditInfo() {
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleString();
        }
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleString();
        }
        return new Date(timestamp).toLocaleString();
    };
    
    setTextContent('createdDate', formatTimestamp(currentProduct.fechaCreacion));
    setTextContent('createdBy', currentProduct.usuarioCreacion || 'N/A');
    setTextContent('updatedDate', formatTimestamp(currentProduct.fechaActualizacion) || 'N/A');
    setTextContent('updatedBy', currentProduct.usuarioActualizacion || 'N/A');
    setTextContent('entryDate', formatTimestamp(currentProduct.fechaIngreso) || 'N/A');
    setTextContent('entryUser', currentProduct.usuarioIngreso || 'N/A');
}

// Helper Functions
function setTextContent(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value || 0);
}

function formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    
    try {
        if (dateValue.toDate) {
            return dateValue.toDate().toLocaleString();
        }
        if (dateValue.seconds) {
            return new Date(dateValue.seconds * 1000).toLocaleString();
        }
        return new Date(dateValue).toLocaleString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global function for image modal
window.openImageModal = function(imageUrl) {
    Swal.fire({
        imageUrl: imageUrl,
        imageAlt: 'Product Image',
        width: 'auto',
        padding: '2em',
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            image: 'swal-image-modal'
        }
    });
};

function showNotFound(message) {
    showLoading(false);
    const notFound = document.getElementById('notFound');
    const productDetails = document.getElementById('productDetails');
    
    if (notFound) {
        notFound.style.display = 'flex';
        const p = notFound.querySelector('p');
        if (p) p.textContent = message || 'Product not found';
    }
    
    if (productDetails) {
        productDetails.style.display = 'none';
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}