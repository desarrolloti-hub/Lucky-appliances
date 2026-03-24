// posAdmin.js - Point of Sale Logic
import { ProductManager } from '/classes/product.js';

// Initialize product manager
const productManager = new ProductManager();

// Cart state
let cart = [];
let products = [];
let filteredProducts = [];

// KEY para localStorage
const CART_STORAGE_KEY = 'posCart';

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const cartSummary = document.querySelector('.cart-summary');
const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const totalEl = document.getElementById('total');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const productCountEl = document.getElementById('productCount');
const searchInput = document.getElementById('posSearchInput');
const loadingEl = document.getElementById('posLoading');

// Barcode elements
const barcodeInput = document.getElementById('barcodeInput');
const addBarcodeBtn = document.getElementById('addBarcodeBtn');
const barcodeFeedback = document.getElementById('barcodeFeedback');

// Variable for feedback timeout
let feedbackTimeout;

// Flag to control auto-focus behavior
let canAutoFocus = true;

// Currency formatter
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

// Get product image
const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
        return product.getImageUrl(0);
    }
    return 'https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image';
};

/**
 * Obtener número de serie limpio de una unidad
 * @param {Object} unidad - Unidad del producto
 * @returns {string} - Número de serie limpio
 */
function getSerialNumber(unidad) {
    if (!unidad) return '';
    return (unidad.serie || unidad.numeroSerie || unidad.serialNumber || '').toString().trim();
}

/**
 * Verificar si un serial ya existe en el carrito
 * @param {string} serialNumber - Número de serie a verificar
 * @returns {boolean} - true si ya existe, false si no
 */
function isSerialInCart(serialNumber) {
    if (!serialNumber) return false;
    
    const cleanSerial = serialNumber.toString().trim().replace(/\s/g, '');
    
    return cart.some(item => {
        if (item.serials && item.serials.length > 0) {
            return item.serials.some(serial => {
                const existingSerial = getSerialNumber(serial).replace(/\s/g, '');
                return existingSerial === cleanSerial;
            });
        }
        return false;
    });
}

/**
 * Obtener todos los seriales del carrito
 * @returns {Array} - Array con todos los números de serie
 */
function getAllSerialsInCart() {
    const serials = [];
    cart.forEach(item => {
        if (item.serials && item.serials.length > 0) {
            item.serials.forEach(serial => {
                const serialNumber = getSerialNumber(serial);
                if (serialNumber) {
                    serials.push(serialNumber);
                }
            });
        }
    });
    return serials;
}

/**
 * Guardar carrito en localStorage
 */
function saveCartToStorage() {
    try {
        // Preparar datos para storage (solo lo necesario)
        const cartData = cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            serials: item.serials ? item.serials.map(s => ({
                serie: s.serie || s.numeroSerie || s.serialNumber,
                id: s.id,
                // Guardar otros campos relevantes de la unidad
                ...(s.estado && { estado: s.estado })
            })) : [],
            // Guardar información básica del producto para acceso rápido
            productInfo: {
                id: item.product.id,
                Model: item.product.Model,
                SKU: item.product.SKU,
                nuestroPrecio: item.product.nuestroPrecio,
                imageUrl: getProductImage(item.product)
            }
        }));
        
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
            items: cartData,
            timestamp: new Date().toISOString(),
            totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: cart.reduce((sum, item) => sum + (item.product.nuestroPrecio * item.quantity), 0),
            serials: getAllSerialsInCart() // Guardar todos los seriales para referencia rápida
        }));
        
        console.log('Cart saved to localStorage:', CART_STORAGE_KEY);
    } catch (error) {
        console.error('Error saving cart to localStorage:', error);
    }
}

/**
 * Cargar carrito desde localStorage
 */
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (!savedCart) return null;
        
        const cartData = JSON.parse(savedCart);
        console.log('Cart loaded from localStorage:', cartData);
        
        return cartData;
    } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        return null;
    }
}

/**
 * Sincronizar carrito con localStorage después de cada modificación
 */
function syncCartWithStorage() {
    renderCart();
    updateCartSummary();
    saveCartToStorage();
    
    // Actualizar UI del botón clear y summary
    if (cart.length > 0) {
        clearCartBtn.style.display = 'inline-flex';
        cartSummary.style.display = 'block';
        checkoutBtn.disabled = false;
    } else {
        clearCartBtn.style.display = 'none';
        cartSummary.style.display = 'none';
        checkoutBtn.disabled = true;
    }
}

// ============ BARCODE SCANNER FUNCTIONS ============

/**
 * Show feedback message in barcode scanner
 * @param {string} message - Message to display
 * @param {string} type - Type of message (success, error, info)
 */
function showBarcodeFeedback(message, type = 'info') {
    if (!barcodeFeedback) return;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle',
        warning: 'exclamation-triangle'
    };
    
    barcodeFeedback.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i> ${message}`;
    barcodeFeedback.className = `barcode-feedback ${type}`;
    
    // Clear feedback after 3 seconds
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
        barcodeFeedback.innerHTML = '';
        barcodeFeedback.className = 'barcode-feedback';
    }, 3000);
}

/**
 * Find product by serial number
 * @param {string} serialNumber - Serial number to search
 * @returns {Object|null} - Found product or null
 */
function findProductBySerialNumber(serialNumber) {
    if (!serialNumber || !products.length) return null;
    
    // Clean the serial number (remove spaces and special characters)
    const cleanSerial = serialNumber.toString().trim().replace(/\s/g, '');
    
    console.log('Searching for serial number:', cleanSerial);
    
    // Search in all products by checking their unidades (serial numbers)
    for (const product of products) {
        // Check if the product has unidades array
        if (product.unidades && Array.isArray(product.unidades)) {
            // Look for the serial number in the unidades
            const unidadEncontrada = product.unidades.find(unidad => {
                // Check different possible serial number fields
                const unidadSerial = unidad.serie || unidad.numeroSerie || unidad.serialNumber || unidad.id || '';
                return unidadSerial.toString().trim().replace(/\s/g, '') === cleanSerial;
            });
            
            if (unidadEncontrada) {
                console.log('Product found by serial number:', product.Model, product.id);
                return {
                    product: product,
                    unidad: unidadEncontrada
                };
            }
        }
        
        // Also check if the product has a direct serial number field
        if (product.serialNumber && product.serialNumber.toString().trim().replace(/\s/g, '') === cleanSerial) {
            console.log('Product found by direct serial number:', product.Model, product.id);
            return {
                product: product,
                unidad: null
            };
        }
    }
    
    console.log('No product found with serial number:', cleanSerial);
    return null;
}

/**
 * Process scanned barcode (serial number)
 * @param {string} barcode - Barcode/serial number to process
 */
function processBarcode(barcode) {
    if (!barcode) {
        showBarcodeFeedback('Please enter a serial number', 'error');
        return;
    }
    
    // Show scanning indicator
    barcodeInput.classList.add('scanning');
    
    const cleanSerial = barcode.toString().trim().replace(/\s/g, '');
    
    // Verificar si el serial ya existe en el carrito
    if (isSerialInCart(cleanSerial)) {
        showBarcodeFeedback(`✗ Serial ${barcode} is already in cart`, 'error');
        barcodeInput.classList.remove('scanning');
        barcodeInput.value = '';
        barcodeInput.focus();
        return;
    }
    
    const result = findProductBySerialNumber(barcode);
    
    if (result) {
        // Mostrar SOLO el producto encontrado en la grid
        filteredProducts = [result.product];
        renderProducts(filteredProducts);
        updateProductCount(1);
        
        // Add product to cart
        addToCart(result.product.id, result.unidad);
        showBarcodeFeedback(`✓ ${result.product.Model} added to cart`, 'success');
        
        // Clear input after scanning
        barcodeInput.value = '';
    } else {
        showBarcodeFeedback(`✗ No product found with serial: ${barcode}`, 'error');
        
        // Keep the invalid barcode for correction
        barcodeInput.select();
    }
    
    // Remove scanning indicator
    setTimeout(() => {
        barcodeInput.classList.remove('scanning');
    }, 500);
    
    // Keep focus on input for next scan
    barcodeInput.focus();
}

// ============ PRODUCT LOADING AND RENDERING ============

/**
 * Load initial products
 */
async function loadProducts() {
    try {
        showLoading(true);
        
        // Load products and related data (brands, categories, providers)
        await productManager.loadBrandsAndCategoriesAndProviders();
        products = await productManager.loadProducts();
        
        console.log('Products loaded for POS:', products.length);
        
        // Intentar cargar carrito guardado
        const savedCartData = loadCartFromStorage();
        if (savedCartData && savedCartData.items && savedCartData.items.length > 0) {
            await restoreCartFromStorage(savedCartData);
        }
        
        // Log sample of unidades to see structure
        if (products.length > 0 && products[0].unidades) {
            console.log('Sample product unidades:', products[0].unidades);
        }
        
        // MODIFICADO: No mostrar productos inicialmente, mostrar mensaje de búsqueda
        showEmptySearchState();
        
        // Update counter - mostrar 0 inicialmente
        updateProductCount(0);
        
        // Show message in barcode scanner
        if (products.length > 0) {
            showBarcodeFeedback(`${products.length} products available - Search or scan serial`, 'info');
        } else {
            showBarcodeFeedback('No products loaded', 'warning');
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Loading Products',
            text: error.message || 'Could not load products. Please try again.',
            confirmButtonColor: '#4CAF50'
        });
        
        showBarcodeFeedback('Error loading products', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Restaurar carrito desde localStorage
 * @param {Object} savedCartData - Datos guardados del carrito
 */
async function restoreCartFromStorage(savedCartData) {
    try {
        console.log('Restoring cart from storage...');
        
        for (const savedItem of savedCartData.items) {
            const product = productManager.getProductById(savedItem.productId);
            
            if (product) {
                // Verificar stock actual
                const availableStock = product.getTotalUnidades();
                
                if (availableStock >= savedItem.quantity) {
                    // Buscar las unidades específicas si hay seriales guardados
                    const unidadesARestaurar = [];
                    
                    if (savedItem.serials && savedItem.serials.length > 0) {
                        // Intentar encontrar las unidades específicas por su serie
                        for (const savedSerial of savedItem.serials) {
                            if (savedSerial.serie && product.unidades) {
                                const unidad = product.unidades.find(u => 
                                    (u.serie || u.numeroSerie || u.serialNumber) === savedSerial.serie
                                );
                                if (unidad) {
                                    unidadesARestaurar.push(unidad);
                                }
                            }
                        }
                    }
                    
                    // Crear item en el carrito
                    cart.push({
                        product: product,
                        quantity: savedItem.quantity,
                        serials: unidadesARestaurar.length > 0 ? unidadesARestaurar : []
                    });
                    
                    console.log(`Restored ${savedItem.quantity}x ${product.Model} to cart`);
                } else {
                    console.warn(`Cannot restore ${product.Model}: insufficient stock (${availableStock} available, ${savedItem.quantity} needed)`);
                }
            }
        }
        
        if (cart.length > 0) {
            syncCartWithStorage();
            showBarcodeFeedback(`Cart restored: ${cart.length} item(s)`, 'success');
        }
        
    } catch (error) {
        console.error('Error restoring cart:', error);
    }
}

/**
 * Mostrar estado vacío para búsqueda
 */
function showEmptySearchState() {
    productGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
            <i class="fas fa-search" style="font-size: 3rem; color: var(--text-light); margin-bottom: 15px;"></i>
            <h3 style="color: var(--text); margin-bottom: 10px;">Search for Products</h3>
            <p style="color: var(--text-light); max-width: 400px; margin: 0 auto;">
                Use the search bar above to find products by model, SKU, or ID, 
                or scan a serial number to add items directly to cart.
            </p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <span class="scan-indicator">
                    <i class="fas fa-barcode"></i> Scan serial
                </span>
                <span class="scan-indicator">
                    <i class="fas fa-search"></i> Search text
                </span>
            </div>
        </div>
    `;
}

/**
 * Render products in grid
 * @param {Array} productsToRender - Products to display
 */
function renderProducts(productsToRender) {
    if (!productsToRender || productsToRender.length === 0) {
        showEmptySearchState();
        return;
    }
    
    productGrid.innerHTML = productsToRender.map(product => {
        const imageUrl = getProductImage(product);
        const stock = product.getTotalUnidades();
        const stockClass = stock <= 0 ? 'out-of-stock' : stock <= 5 ? 'low-stock' : '';
        
        // Get first few serial numbers for display (if available)
        const serialNumbers = product.unidades && Array.isArray(product.unidades) 
            ? product.unidades.slice(0, 3).map(u => u.serie || u.numeroSerie || 'N/A').join(', ')
            : 'No serials';
        
        return `
            <div class="pos-product-card ${stockClass}" data-product-id="${product.id}">
                <div class="pos-product-image">
                    <img src="${imageUrl}" 
                         alt="${product.Model || 'Product'}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image'">
                </div>
                <div class="pos-product-info">
                    <h4 title="${product.Model || 'No model'}">${product.Model || 'No model'}</h4>
                    <span class="pos-product-sku">SKU: ${product.SKU || 'N/A'}</span>
                    <div class="pos-product-price">${product.getNuestroPrecioFormatted()}</div>
                    <div class="pos-product-stock ${stockClass}">
                        <i class="fas fa-cubes"></i>
                        <span>Stock: ${stock} unit${stock !== 1 ? 's' : ''}</span>
                    </div>
                    ${stock > 0 ? `
                        <div class="pos-product-serials" title="Serial numbers: ${serialNumbers}">
                            <i class="fas fa-barcode"></i>
                            <small>${stock} serials available</small>
                        </div>
                    ` : ''}
                    <div class="pos-product-view-details">
                        <small><i class="fas fa-external-link-alt"></i> Click to view details</small>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to cards - REDIRECT TO DETAIL PAGE INSTEAD OF ADDING TO CART
    document.querySelectorAll('.pos-product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            // Redirect to product detail page
            window.location.href = `../productDetailAdmin/productDetailAdmin.html?id=${productId}`;
        });
    });
}

// ============ CART FUNCTIONS ============

/**
 * Add product to cart
 * @param {string} productId - Product ID to add
 * @param {Object} specificUnidad - Specific unit/serial to add (optional)
 */
function addToCart(productId, specificUnidad = null) {
    const product = productManager.getProductById(productId);
    if (!product) {
        showBarcodeFeedback('Product not found', 'error');
        return;
    }
    
    // Check stock
    const availableStock = product.getTotalUnidades();
    if (availableStock <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Out of Stock',
            text: `${product.Model} has no units available`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        return;
    }
    
    // CASO 1: Agregar con serial específico (desde escáner)
    if (specificUnidad) {
        const serialNumber = getSerialNumber(specificUnidad);
        
        // Verificar si el serial ya existe en el carrito
        if (isSerialInCart(serialNumber)) {
            showBarcodeFeedback(`Serial ${serialNumber} is already in cart`, 'error');
            return;
        }
        
        // Agregar como nuevo item individual
        cart.push({
            product: product,
            quantity: 1,
            serials: [specificUnidad]
        });
        
        Swal.fire({
            icon: 'success',
            title: 'Product Added',
            text: `${product.Model} (Serial: ${serialNumber}) added`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    } 
    // CASO 2: Agregar sin serial específico (desde búsqueda)
    else {
        // Buscar si ya existe un item de este producto SIN seriales
        const existingItem = cart.find(item => 
            item.product.id === productId && item.serials.length === 0
        );
        
        if (existingItem) {
            // Incrementar cantidad del item existente
            if (existingItem.quantity < availableStock) {
                existingItem.quantity++;
                
                Swal.fire({
                    icon: 'success',
                    title: 'Quantity Updated',
                    text: `${product.Model} quantity: ${existingItem.quantity}`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Insufficient Stock',
                    text: `Only ${availableStock} units available`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                return;
            }
        } else {
            // Crear nuevo item sin seriales
            cart.push({
                product: product,
                quantity: 1,
                serials: []
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Product Added',
                text: `${product.Model} added to cart`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        }
    }
    
    // Sync with storage
    syncCartWithStorage();
}

/**
 * Remove item from cart
 * @param {number} index - Index of item to remove
 */
function removeFromCart(index) {
    const removedItem = cart[index];
    cart.splice(index, 1);
    
    // Sync with storage
    syncCartWithStorage();
    
    // Show feedback
    Swal.fire({
        icon: 'info',
        title: 'Product Removed',
        text: `${removedItem.product.Model} removed from cart`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
    });
}

/**
 * Update item quantity
 * @param {number} index - Index of item to update
 * @param {number} newQuantity - New quantity
 */
function updateQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    const item = cart[index];
    
    // Si el item tiene seriales específicos, no permitimos cambiar la cantidad
    if (item.serials && item.serials.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Cannot Change Quantity',
            text: 'Items with specific serial numbers must be added individually. Please add another unit separately.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        return;
    }
    
    const availableStock = item.product.getTotalUnidades();
    
    if (newQuantity > availableStock) {
        Swal.fire({
            icon: 'warning',
            title: 'Insufficient Stock',
            text: `Only ${availableStock} units available`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        return;
    }
    
    item.quantity = newQuantity;
    
    // Sync with storage
    syncCartWithStorage();
}

/**
 * Clear all items from cart
 */
function clearCart() {
    if (cart.length === 0) return;
    
    Swal.fire({
        title: 'Clear Cart?',
        text: `Remove ${cart.length} item${cart.length !== 1 ? 's' : ''} from cart`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, clear cart',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            cart = [];
            
            // Sync with storage
            syncCartWithStorage();
            
            Swal.fire({
                icon: 'success',
                title: 'Cart Cleared',
                text: 'All items have been removed',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            
            // Focus barcode input for next scan
            barcodeInput.focus();
        }
    });
}

/**
 * Render cart items
 */
function renderCart() {
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>The cart is empty</p>
                <small>Scan a serial number to add items</small>
            </div>
        `;
        return;
    }
    
    cartItems.innerHTML = cart.map((item, index) => {
        const product = item.product;
        const imageUrl = getProductImage(product);
        const subtotal = product.nuestroPrecio * item.quantity;
        
        // Get serial numbers if available
        const serialsText = item.serials && item.serials.length > 0 
            ? `<small class="cart-item-serials">Serial: ${item.serials.map(s => s.serie || s.numeroSerie || 'N/A').join(', ')}</small>`
            : '';
        
        // Determinar si se pueden cambiar la cantidad (solo si no tiene seriales específicos)
        const canChangeQuantity = !(item.serials && item.serials.length > 0);
        
        return `
            <div class="cart-item" data-cart-index="${index}">
                <div class="cart-item-image">
                    <img src="${imageUrl}" alt="${product.Model || 'Product'}" 
                         onerror="this.src='https://via.placeholder.com/60x60/0a2540/ffffff?text=No+Image'">
                </div>
                <div class="cart-item-details">
                    <h4 title="${product.Model || 'No model'}">${product.Model || 'No model'}</h4>
                    <div class="cart-item-price">${formatCurrency(subtotal)}</div>
                    ${serialsText}
                    <div class="cart-item-quantity">
                        ${canChangeQuantity ? `
                            <button class="quantity-btn decrease-btn" data-index="${index}" title="Decrease quantity">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn increase-btn" data-index="${index}" title="Increase quantity">
                                <i class="fas fa-plus"></i>
                            </button>
                        ` : `
                            <span class="quantity-value">${item.quantity}</span>
                        `}
                    </div>
                </div>
                <div class="cart-item-remove" data-index="${index}" title="Remove from cart">
                    <i class="fas fa-times"></i>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for cart buttons
    document.querySelectorAll('.decrease-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            updateQuantity(index, cart[index].quantity - 1);
        });
    });
    
    document.querySelectorAll('.increase-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            updateQuantity(index, cart[index].quantity + 1);
        });
    });
    
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeFromCart(index);
        });
    });
}

/**
 * Update cart summary (subtotal, tax, total)
 */
function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => {
        return sum + (item.product.nuestroPrecio * item.quantity);
    }, 0);
    
    const tax = subtotal * 0.0838; // 8.38% Tax
    const total = subtotal + tax;
    
    subtotalEl.textContent = formatCurrency(subtotal);
    taxEl.textContent = formatCurrency(tax);
    totalEl.textContent = formatCurrency(total);
}

// ============ SEARCH FUNCTIONS ============

/**
 * Search products
 * @param {string} searchTerm - Search term
 */
function searchProducts(searchTerm) {
    if (!searchTerm.trim()) {
        // Si el término de búsqueda está vacío, mostrar estado vacío
        showEmptySearchState();
        filteredProducts = [];
        updateProductCount(0);
        return;
    }
    
    // Buscar productos que coincidan con el término
    const filtered = productManager.searchProducts(searchTerm);
    filteredProducts = filtered;
    
    if (filtered.length > 0) {
        // Mostrar SOLO los productos encontrados
        renderProducts(filtered);
        updateProductCount(filtered.length);
        showBarcodeFeedback(`Found ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`, 'success');
    } else {
        // No se encontraron productos
        productGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--warning); margin-bottom: 15px;"></i>
                <h3 style="color: var(--text); margin-bottom: 10px;">No Products Found</h3>
                <p style="color: var(--text-light); max-width: 400px; margin: 0 auto;">
                    No products match "${searchTerm}". Try a different search term or scan a serial number.
                </p>
            </div>
        `;
        updateProductCount(0);
        showBarcodeFeedback(`No products found for "${searchTerm}"`, 'info');
    }
}

/**
 * Update product counter
 * @param {number} count - Number of products
 */
function updateProductCount(count) {
    if (productCountEl) {
        productCountEl.textContent = count;
    }
}

/**
 * Show/hide loading
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
    if (loadingEl) {
        loadingEl.style.display = show ? 'flex' : 'none';
    }
    if (productGrid) {
        productGrid.style.display = show ? 'none' : 'grid';
    }
}

// ============ CHECKOUT FUNCTION ============

/**
 * Complete sale - Redirect to close sale page with serial numbers
 */
function checkout() {
    if (cart.length === 0) return;
    
    // Guardar carrito antes de redirigir (por si acaso)
    saveCartToStorage();
    
    // Collect all serial numbers from cart
    const allSerials = [];
    
    cart.forEach(item => {
        if (item.serials && item.serials.length > 0) {
            // Add each serial number
            item.serials.forEach(serial => {
                const serialNumber = serial.serie || serial.numeroSerie || serial.serialNumber || '';
                if (serialNumber) {
                    allSerials.push(serialNumber);
                }
            });
        } else {
            // If no specific serials, we need to handle this case
            // For now, we'll add placeholder serials based on quantity
            for (let i = 0; i < item.quantity; i++) {
                allSerials.push(`TEMP-${item.product.id}-${i + 1}`);
            }
        }
    });
    
    console.log('Serials to sell:', allSerials);
    
    // Create URL with serial numbers as parameters
    const serialsParam = encodeURIComponent(JSON.stringify(allSerials));
    const redirectUrl = `../closeSaleAdmin/closeSaleAdmin.html?serials=${serialsParam}`;
    
    // Redirect to close sale page
    window.location.href = redirectUrl;
}

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing POS...');
    loadProducts();
    
    // Event Listeners
    checkoutBtn.addEventListener('click', checkout);
    clearCartBtn.addEventListener('click', clearCart);
    
    // Search with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchProducts(e.target.value);
        }, 300);
    });
    
    // Clear search on Escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchProducts('');
        }
    });
    
    // ============ BARCODE EVENT LISTENERS ============
    
    // Scan on Enter key
    barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processBarcode(barcodeInput.value.trim());
        }
    });
    
    // Scan on button click
    addBarcodeBtn.addEventListener('click', () => {
        processBarcode(barcodeInput.value.trim());
    });

    // When clicking on search input, disable auto-focus temporarily
    searchInput.addEventListener('click', () => {
        canAutoFocus = false;
    });
    
    // When clicking on barcode input, enable auto-focus
    barcodeInput.addEventListener('click', () => {
        canAutoFocus = true;
    });
    
    // When search input loses focus, re-enable auto-focus after a delay
    searchInput.addEventListener('blur', () => {
        // Don't immediately re-enable to avoid stealing focus from other elements
        setTimeout(() => {
            // Check if no other input is focused
            if (document.activeElement !== barcodeInput && document.activeElement !== searchInput) {
                canAutoFocus = true;
            }
        }, 200);
    });
    
    // Clear feedback when typing
    barcodeInput.addEventListener('input', () => {
        if (feedbackTimeout) clearTimeout(feedbackTimeout);
        barcodeFeedback.innerHTML = '';
        barcodeFeedback.className = 'barcode-feedback';
        
        // Remove scanning class
        barcodeInput.classList.remove('scanning');
    });
    
    // Focus barcode input on page load only if no other input is focused
    setTimeout(() => {
        if (document.activeElement !== searchInput) {
            barcodeInput.focus();
        }
    }, 500);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            canAutoFocus = false;
            searchInput.focus();
        }
        
        // Ctrl/Cmd + B to focus barcode
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            canAutoFocus = true;
            barcodeInput.focus();
            barcodeInput.select();
        }
        
        // Escape to clear barcode input
        if (e.key === 'Escape' && document.activeElement === barcodeInput) {
            barcodeInput.value = '';
            showBarcodeFeedback('Input cleared', 'info');
        }
    });
});

// Export functions that might be needed globally
window.addToCart = addToCart;
window.processBarcode = processBarcode;
window.clearCart = clearCart;