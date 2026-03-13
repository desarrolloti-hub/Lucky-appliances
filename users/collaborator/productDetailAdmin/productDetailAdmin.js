// productDetailAdmin.js - Product Detail Logic
import { ProductManager } from '/classes/product.js';
import { BrandManager } from '/classes/brand.js';
import { CategoryManager } from '/classes/category.js';
import { ProviderManager } from '/classes/provider.js';

// Initialize managers
const productManager = new ProductManager();
const brandManager = new BrandManager();
const categoryManager = new CategoryManager();
const providerManager = new ProviderManager();

// KEY para localStorage
const CART_STORAGE_KEY = 'posCart';

// Current product
let currentProduct = null;

// Maps for names
let brandsMap = {};
let categoriesMap = {};
let providersMap = {};

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const productContent = document.getElementById('productContent');

// Product info elements
const productImage = document.getElementById('productImage');
const imageThumbnails = document.getElementById('imageThumbnails');
const productModel = document.getElementById('productModel');
const productSKU = document.getElementById('productSKU');
const productIdInterno = document.getElementById('productIdInterno');
const productOurPrice = document.getElementById('productOurPrice');
const productCompetitorPrice = document.getElementById('productCompetitorPrice');
const productBrand = document.getElementById('productBrand');
const productCategory = document.getElementById('productCategory');
const productSubcategory = document.getElementById('productSubcategory');
const productProvider = document.getElementById('productProvider');
const productWeight = document.getElementById('productWeight');
const productLocation = document.getElementById('productLocation');
const productDescription = document.getElementById('productDescription');
const productSpecs = document.getElementById('productSpecs');
const totalStock = document.getElementById('totalStock');
const unitsCount = document.getElementById('unitsCount');
const unitsGrid = document.getElementById('unitsGrid');
const noUnitsMessage = document.getElementById('noUnitsMessage');

// Audit elements
const entryDate = document.getElementById('entryDate');
const entryUser = document.getElementById('entryUser');
const createdDate = document.getElementById('createdDate');
const updatedDate = document.getElementById('updatedDate');

// Cart elements
const cartBadge = document.getElementById('cartBadge');
const cartModal = document.getElementById('cartModal');
const cartModalBody = document.getElementById('cartModalBody');
const cartTotalItems = document.getElementById('cartTotalItems');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const checkoutBtn = document.getElementById('checkoutBtn');

// Currency formatter
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

// Date formatter
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Get product image
const getProductImage = (product, index = 0) => {
    if (product.images && product.images.length > 0) {
        return product.getImageUrl(index);
    }
    return 'https://via.placeholder.com/600x400/0a2540/ffffff?text=No+Image';
};

/**
 * Get serial number from unit
 */
function getSerialNumber(unidad) {
    if (!unidad) return '';
    return (unidad.serie || unidad.numeroSerie || unidad.serialNumber || unidad.id || '').toString().trim();
}

/**
 * Get user name by ID (simplified - you might want to load users)
 */
function getUserName(userId) {
    if (!userId) return 'N/A';
    // Aquí podrías cargar usuarios si los tienes
    return userId;
}

/**
 * Load all necessary data
 */
async function loadAllData() {
    try {
        console.log('Loading all data for product details...');
        
        // Load brands
        const brands = await brandManager.loadBrands();
        brandsMap = {};
        brands.forEach(brand => {
            brandsMap[brand.id] = brand.nombre;
        });
        console.log('Brands loaded:', Object.keys(brandsMap).length);
        
        // Load categories
        const categories = await categoryManager.loadCategories();
        categoriesMap = {};
        categories.forEach(category => {
            categoriesMap[category.id] = category.nombre;
        });
        console.log('Categories loaded:', Object.keys(categoriesMap).length);
        
        // Load providers
        const providers = await providerManager.loadProviders();
        providersMap = {};
        providers.forEach(provider => {
            providersMap[provider.id] = provider.nombre;
        });
        console.log('Providers loaded:', Object.keys(providersMap).length);
        
        // Load products
        const products = await productManager.loadProducts();
        console.log('Products loaded:', products.length);
        
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

/**
 * Load cart from localStorage
 */
function loadCart() {
    try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (!savedCart) return { items: [] };
        
        return JSON.parse(savedCart);
    } catch (error) {
        console.error('Error loading cart:', error);
        return { items: [] };
    }
}

/**
 * Update cart badge
 */
function updateCartBadge() {
    const cart = loadCart();
    const totalItems = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    cartBadge.textContent = totalItems;
}

/**
 * Check if serial is in cart
 */
function isSerialInCart(serialNumber) {
    if (!serialNumber) return false;
    
    const cart = loadCart();
    const cleanSerial = serialNumber.toString().trim().replace(/\s/g, '');
    
    return cart.items.some(item => {
        if (item.serials && item.serials.length > 0) {
            return item.serials.some(serial => {
                const existingSerial = (serial.serie || serial.numeroSerie || serial.serialNumber || '').toString().trim().replace(/\s/g, '');
                return existingSerial === cleanSerial;
            });
        }
        return false;
    });
}

/**
 * Add unit to cart
 */
async function addUnitToCart(unit) {
    if (!currentProduct) return;
    
    const serialNumber = getSerialNumber(unit);
    
    // Verificar si el serial ya está en el carrito
    if (isSerialInCart(serialNumber)) {
        Swal.fire({
            icon: 'warning',
            title: 'Serial Already in Cart',
            text: `Serial ${serialNumber} is already in your cart`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
        return;
    }
    
    // Cargar carrito actual
    const cart = loadCart();
    if (!cart.items) cart.items = [];
    
    // Crear nuevo item
    const newItem = {
        productId: currentProduct.id,
        quantity: 1,
        serials: [{
            serie: serialNumber,
            id: unit.id,
            estado: unit.estado || 'available',
            numeroSerie: unit.numeroSerie || unit.serie,
            fechaIngreso: unit.fechaIngreso
        }],
        productInfo: {
            id: currentProduct.id,
            Model: currentProduct.Model,
            SKU: currentProduct.SKU,
            idInterno: currentProduct.idInterno,
            nuestroPrecio: currentProduct.nuestroPrecio,
            imageUrl: getProductImage(currentProduct)
        }
    };
    
    // Agregar al carrito
    cart.items.push(newItem);
    
    // Actualizar totales
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.productInfo.nuestroPrecio * item.quantity), 0);
    cart.timestamp = new Date().toISOString();
    
    // Guardar en localStorage
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    // Actualizar UI
    updateCartBadge();
    updateUnitButton(unit.id || serialNumber, true);
    
    Swal.fire({
        icon: 'success',
        title: 'Added to Cart',
        text: `${currentProduct.Model} (Serial: ${serialNumber}) added to cart`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
    });
}

/**
 * Update unit button state
 */
function updateUnitButton(unitId, added) {
    const unitCard = document.querySelector(`.unit-card[data-unit-id="${unitId}"]`);
    if (unitCard) {
        const btn = unitCard.querySelector('.btn-add-unit');
        if (added) {
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            btn.classList.add('added');
            btn.disabled = true;
            unitCard.classList.add('added');
        } else {
            btn.innerHTML = '<i class="fas fa-cart-plus"></i> Add';
            btn.classList.remove('added');
            btn.disabled = false;
            unitCard.classList.remove('added');
        }
    }
}

/**
 * Show unit history
 */
function showUnitHistory(unit) {
    const serialNumber = getSerialNumber(unit);
    const historial = unit.historial || [];
    
    let historyHtml = '';
    if (historial.length === 0) {
        historyHtml = '<p>No history available for this unit</p>';
    } else {
        historyHtml = historial.map(entry => `
            <div style="border-bottom: 1px solid var(--gray); padding: 10px 0;">
                <div><strong>Date:</strong> ${formatDate(entry.fechaMovimiento)}</div>
                <div><strong>Movement:</strong> ${entry.descripcionMovimiento || entry.movimiento}</div>
                <div><strong>Type:</strong> ${entry.tipoMovimiento || 'N/A'}</div>
                <div><strong>User:</strong> ${entry.idUsuario || 'N/A'}</div>
            </div>
        `).join('');
    }
    
    Swal.fire({
        title: `Unit History - ${serialNumber}`,
        html: `<div style="max-height: 400px; overflow-y: auto;">${historyHtml}</div>`,
        icon: 'info',
        confirmButtonText: 'Close',
        confirmButtonColor: '#4CAF50',
        width: '600px'
    });
}

/**
 * Render units grid
 */
function renderUnits() {
    if (!currentProduct || !currentProduct.unidades || currentProduct.unidades.length === 0) {
        unitsGrid.innerHTML = '';
        noUnitsMessage.style.display = 'block';
        unitsCount.textContent = '0 units';
        return;
    }
    
    noUnitsMessage.style.display = 'none';
    unitsCount.textContent = `${currentProduct.unidades.length} units`;
    
    unitsGrid.innerHTML = currentProduct.unidades.map(unit => {
        const serialNumber = getSerialNumber(unit);
        const inCart = isSerialInCart(serialNumber);
        const estado = unit.estado || 'available';
        const estadoClass = estado.toLowerCase();
        const unitId = unit.id || serialNumber;
        
        // Escape para JSON en el onclick
        const unitJson = JSON.stringify(unit).replace(/'/g, "\\'");
        
        return `
            <div class="unit-card ${inCart ? 'added' : ''}" data-unit-id="${unitId}">
                <div class="unit-info">
                    <div class="unit-serial">
                        <i class="fas fa-barcode"></i>
                        ${serialNumber || 'N/A'}
                        <i class="fas fa-history unit-history-btn" onclick='showUnitHistoryFromButton(${unitJson})' title="View history"></i>
                    </div>
                    <span class="unit-status status-${estadoClass}">${estado}</span>
                </div>
                <button class="btn-add-unit" onclick='addUnitToCartFromButton("${unitId}")' ${inCart ? 'disabled' : ''}>
                    <i class="fas ${inCart ? 'fa-check' : 'fa-cart-plus'}"></i>
                    ${inCart ? 'Added' : 'Add'}
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Show cart modal
 */
function showCartModal() {
    const cart = loadCart();
    const modalBody = document.getElementById('cartModalBody');
    
    if (!cart.items || cart.items.length === 0) {
        modalBody.innerHTML = `
            <div class="empty-cart-modal">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <small>Add some products to continue</small>
            </div>
        `;
        cartTotalItems.textContent = '0';
        cartTotalAmount.textContent = formatCurrency(0);
        checkoutBtn.disabled = true;
    } else {
        let totalItems = 0;
        let totalAmount = 0;
        
        modalBody.innerHTML = cart.items.map((item, index) => {
            totalItems += item.quantity;
            totalAmount += item.productInfo.nuestroPrecio * item.quantity;
            
            const serialText = item.serials && item.serials.length > 0
                ? `<div class="cart-modal-item-serial">Serial: ${item.serials.map(s => s.serie || s.numeroSerie).join(', ')}</div>`
                : '';
            
            return `
                <div class="cart-modal-item" data-item-index="${index}">
                    <div class="cart-modal-item-image">
                        <img src="${item.productInfo.imageUrl}" alt="${item.productInfo.Model}">
                    </div>
                    <div class="cart-modal-item-details">
                        <h4>${item.productInfo.Model}</h4>
                        ${serialText}
                        <div class="cart-modal-item-price">
                            ${formatCurrency(item.productInfo.nuestroPrecio)} x ${item.quantity}
                        </div>
                    </div>
                    <div class="cart-modal-item-remove" onclick="removeFromCart(${index})">
                        <i class="fas fa-times"></i>
                    </div>
                </div>
            `;
        }).join('');
        
        cartTotalItems.textContent = totalItems;
        cartTotalAmount.textContent = formatCurrency(totalAmount);
        checkoutBtn.disabled = false;
    }
    
    cartModal.style.display = 'block';
}

/**
 * Close cart modal
 */
function closeCartModal() {
    cartModal.style.display = 'none';
}

/**
 * Remove item from cart
 */
function removeFromCart(index) {
    const cart = loadCart();
    if (!cart.items || !cart.items[index]) return;
    
    const removedItem = cart.items[index];
    cart.items.splice(index, 1);
    
    // Actualizar totales
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.productInfo.nuestroPrecio * item.quantity), 0);
    cart.timestamp = new Date().toISOString();
    
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    // Actualizar UI
    updateCartBadge();
    showCartModal(); // Refrescar modal
    
    // Si había unidades de este producto en el carrito, actualizar sus botones
    if (removedItem.serials && removedItem.serials.length > 0) {
        removedItem.serials.forEach(serial => {
            // Buscar la unidad en el DOM y actualizar su botón
            const serialNumber = serial.serie || serial.numeroSerie;
            const unitCards = document.querySelectorAll('.unit-card');
            unitCards.forEach(card => {
                const serialSpan = card.querySelector('.unit-serial');
                if (serialSpan && serialSpan.textContent.includes(serialNumber)) {
                    const btn = card.querySelector('.btn-add-unit');
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-cart-plus"></i> Add';
                        btn.classList.remove('added');
                        btn.disabled = false;
                        card.classList.remove('added');
                    }
                }
            });
        });
    }
    
    Swal.fire({
        icon: 'info',
        title: 'Item Removed',
        text: 'Item removed from cart',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
    });
}

/**
 * Clear cart from modal
 */
function clearCartFromModal() {
    Swal.fire({
        title: 'Clear Cart?',
        text: 'Remove all items from cart',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, clear cart',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem(CART_STORAGE_KEY);
            updateCartBadge();
            closeCartModal();
            
            // Actualizar todos los botones de unidades
            document.querySelectorAll('.unit-card').forEach(card => {
                const btn = card.querySelector('.btn-add-unit');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-cart-plus"></i> Add';
                    btn.classList.remove('added');
                    btn.disabled = false;
                    card.classList.remove('added');
                }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Cart Cleared',
                text: 'All items have been removed',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        }
    });
}

/**
 * Proceed to checkout
 */
function proceedToCheckout() {
    const cart = loadCart();
    if (!cart.items || cart.items.length === 0) return;
    
    // Recolectar todos los seriales
    const allSerials = [];
    cart.items.forEach(item => {
        if (item.serials && item.serials.length > 0) {
            item.serials.forEach(serial => {
                if (serial.serie || serial.numeroSerie) {
                    allSerials.push(serial.serie || serial.numeroSerie);
                }
            });
        }
    });
    
    // Crear URL con parámetros
    const serialsParam = encodeURIComponent(JSON.stringify(allSerials));
    const redirectUrl = `../closeSaleAdmin/closeSaleAdmin.html?serials=${serialsParam}`;
    
    // Redirigir
    window.location.href = redirectUrl;
}

/**
 * Refresh units (re-check cart status)
 */
function refreshUnits() {
    renderUnits();
    Swal.fire({
        icon: 'success',
        title: 'Units Refreshed',
        text: 'Unit list has been updated',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
    });
}

/**
 * Set main image
 */
function setMainImage(imageUrl) {
    productImage.src = imageUrl;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
        if (thumb.querySelector('img').src === imageUrl) {
            thumb.classList.add('active');
        }
    });
}

/**
 * Render image thumbnails
 */
function renderThumbnails() {
    if (!currentProduct || !currentProduct.images || currentProduct.images.length <= 1) {
        imageThumbnails.innerHTML = '';
        return;
    }
    
    imageThumbnails.innerHTML = currentProduct.images.map((_, index) => {
        const imageUrl = getProductImage(currentProduct, index);
        return `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="setMainImage('${imageUrl}')">
                <img src="${imageUrl}" alt="Thumbnail ${index + 1}">
            </div>
        `;
    }).join('');
}

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener ID de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        errorState.querySelector('p').textContent = 'No product ID provided';
        return;
    }
    
    try {
        // Cargar todos los datos necesarios
        await loadAllData();
        
        // Buscar producto por ID
        currentProduct = productManager.getProductById(productId);
        
        if (!currentProduct) {
            loadingState.style.display = 'none';
            errorState.style.display = 'block';
            return;
        }
        
        // Asignar nombres al producto
        currentProduct.brandName = brandsMap[currentProduct.Brand] || 'No brand';
        currentProduct.categoryName = categoriesMap[currentProduct.Category] || 'No category';
        currentProduct.providerName = providersMap[currentProduct.Provider] || 'No provider';
        
        // Mostrar contenido
        loadingState.style.display = 'none';
        productContent.style.display = 'block';
        
        // Actualizar información del producto
        productImage.src = getProductImage(currentProduct);
        productImage.alt = currentProduct.Model || 'Product';
        productModel.textContent = currentProduct.Model || 'No model';
        productSKU.textContent = `SKU: ${currentProduct.SKU || 'N/A'}`;
        productIdInterno.textContent = `ID: ${currentProduct.idInterno || 'N/A'}`;
        
        // Precios
        productOurPrice.textContent = currentProduct.getNuestroPrecioFormatted();
        productCompetitorPrice.textContent = currentProduct.getPrecioCompetenciaFormatted();
        
        // Atributos (con nombres en lugar de IDs)
        productBrand.textContent = currentProduct.brandName;
        productCategory.textContent = currentProduct.categoryName;
        productSubcategory.textContent = currentProduct.Subcategory || 'N/A';
        productProvider.textContent = currentProduct.providerName;
        productWeight.textContent = currentProduct.UnitWeight ? `${currentProduct.UnitWeight} lbs` : 'N/A';
        productLocation.textContent = currentProduct.Location || 'N/A';
        
        // Descripción y especificaciones
        productDescription.textContent = currentProduct.ItemDescription || 'No description available';
        productSpecs.textContent = currentProduct.especificaciones || 'No specifications available';
        
        // Stock
        const stock = currentProduct.getTotalUnidades();
        totalStock.innerHTML = `<i class="fas fa-cubes"></i> ${stock} unit${stock !== 1 ? 's' : ''} available`;
        
        // Información de auditoría
        entryDate.textContent = formatDate(currentProduct.fechaIngreso);
        entryUser.textContent = getUserName(currentProduct.usuarioIngreso);
        createdDate.textContent = formatDate(currentProduct.fechaCreacion);
        updatedDate.textContent = formatDate(currentProduct.fechaActualizacion);
        
        // Renderizar thumbnails
        renderThumbnails();
        
        // Renderizar unidades
        renderUnits();
        
        // Actualizar badge del carrito
        updateCartBadge();
        
    } catch (error) {
        console.error('Error loading product:', error);
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        errorState.querySelector('p').textContent = error.message || 'Error loading product';
    }
});

// Funciones globales para los onclick
window.addUnitToCartFromButton = async (unitId) => {
    if (!currentProduct || !currentProduct.unidades) return;
    
    const unit = currentProduct.unidades.find(u => (u.id || getSerialNumber(u)) === unitId);
    if (unit) {
        await addUnitToCart(unit);
    }
};

window.showUnitHistoryFromButton = (unit) => {
    showUnitHistory(unit);
};

window.showCartModal = showCartModal;
window.closeCartModal = closeCartModal;
window.removeFromCart = removeFromCart;
window.clearCartFromModal = clearCartFromModal;
window.proceedToCheckout = proceedToCheckout;
window.refreshUnits = refreshUnits;
window.setMainImage = setMainImage;

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        closeCartModal();
    }
});