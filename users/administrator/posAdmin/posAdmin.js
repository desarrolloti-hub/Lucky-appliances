// posAdmin.js - Point of Sale Logic with Full Search Functionality
import { ProductManager, Product } from '/classes/product.js';
import { db } from '/config/firebase-config.js';
import { 
    collection, 
    getDocs, 
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Initialize product manager
const productManager = new ProductManager();

// Cart state
let cart = [];
let allProducts = []; // Array de instancias de Product
let productsLoaded = false;

// Mapeos para nombres
let brandsMap = new Map();
let categoriesMap = new Map();
let providersMap = new Map();

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

// Variables
let feedbackTimeout;
let canAutoFocus = true;

// =============================================
// FUNCIONES DE NORMALIZACIÓN
// =============================================

function safeToString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return value.join(' ');
    return String(value);
}

function normalizeText(text) {
    if (!text) return '';
    let normalized = safeToString(text);
    normalized = normalized.toLowerCase();
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    normalized = normalized.replace(/[^a-z0-9\s]/g, '');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
}

// =============================================
// CARGA DE DATOS INICIALES
// =============================================

async function loadInitialData() {
    try {
        showLoading(true);
        
        console.log('Loading brands, categories, providers...');
        
        // Cargar marcas
        const brandsSnapshot = await getDocs(collection(db, "marcas"));
        brandsSnapshot.forEach(doc => {
            brandsMap.set(doc.id, doc.data().nombre || doc.id);
        });
        
        // Cargar categorías
        const categoriesSnapshot = await getDocs(collection(db, "categorias"));
        categoriesSnapshot.forEach(doc => {
            categoriesMap.set(doc.id, doc.data().nombre || doc.id);
        });
        
        // Cargar proveedores
        const providersSnapshot = await getDocs(collection(db, "proveedores"));
        providersSnapshot.forEach(doc => {
            providersMap.set(doc.id, doc.data().nombre || doc.id);
        });
        
        console.log(`Loaded: ${brandsMap.size} brands, ${categoriesMap.size} categories, ${providersMap.size} providers`);
        
        // Cargar todos los productos usando ProductManager
        await loadAllProducts();
        
        // Cargar carrito guardado
        await loadCartFromStorage();
        
        // Mostrar estado inicial
        showEmptySearchState();
        updateProductCount(0);
        
        showBarcodeFeedback('Ready - Search by model, SKU, or scan serial', 'success');
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        showBarcodeFeedback('Error loading data', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadAllProducts() {
    try {
        console.log('Loading all products from Firestore...');
        
        // Usar ProductManager para cargar productos (esto les da todos los métodos)
        await productManager.loadBrandsAndCategoriesAndProviders();
        const products = await productManager.loadProducts();
        
        // Enriquecer con nombres de marca, categoría, proveedor
        allProducts = products.map(product => {
            // Agregar nombres para búsqueda
            product.brandName = brandsMap.get(product.Brand) || product.Brand || 'No brand';
            product.categoryName = categoriesMap.get(product.Category) || product.Category || 'No category';
            product.providerName = providersMap.get(product.Provider) || product.Provider || 'No provider';
            
            // Cache de textos normalizados para búsqueda rápida
            product._searchCache = {
                modelNorm: normalizeText(product.Model),
                skuNorm: normalizeText(product.SKU),
                idInternoNorm: normalizeText(product.idInterno),
                brandNorm: normalizeText(product.brandName),
                categoryNorm: normalizeText(product.categoryName),
                descriptionNorm: normalizeText(product.ItemDescription),
                especificacionesNorm: normalizeText(product.especificaciones),
                locationNorm: normalizeText(product.Location)
            };
            
            // Cache de seriales normalizados
            if (product.unidades && Array.isArray(product.unidades)) {
                product._serialNorm = [];
                product.unidades.forEach(unidad => {
                    const serial = unidad.serie || unidad.numeroSerie || unidad.serialNumber;
                    if (serial) {
                        product._serialNorm.push(normalizeText(serial));
                    }
                });
            }
            
            return product;
        });
        
        console.log(`Loaded ${allProducts.length} products with full methods`);
        productsLoaded = true;
        
    } catch (error) {
        console.error('Error loading products:', error);
        throw error;
    }
}

// =============================================
// FUNCIONES DE BÚSQUEDA
// =============================================

function searchProductsLocally(searchTerm) {
    if (!searchTerm || !searchTerm.trim() || !productsLoaded) {
        return [];
    }
    
    const normalizedTerm = normalizeText(searchTerm);
    const searchWords = normalizedTerm.split(/\s+/).filter(w => w.length > 0);
    const isMultiWord = searchWords.length > 1;
    
    console.log(`🔍 Searching: "${searchTerm}" (normalized: "${normalizedTerm}")`);
    
    const results = [];
    
    for (const product of allProducts) {
        let score = 0;
        let matchReason = '';
        
        const cache = product._searchCache;
        
        // 1. BÚSQUEDA EXACTA POR MODELO
        if (cache.modelNorm === normalizedTerm) {
            score = 100;
            matchReason = 'model-exact';
        }
        // 2. MODELO COMIENZA CON EL TÉRMINO
        else if (cache.modelNorm.startsWith(normalizedTerm)) {
            score = 95;
            matchReason = 'model-starts';
        }
        // 3. MODELO CONTIENE EL TÉRMINO
        else if (cache.modelNorm.includes(normalizedTerm)) {
            score = 85;
            matchReason = 'model-contains';
        }
        // 4. BÚSQUEDA MULTI-PALABRA
        else if (isMultiWord) {
            const allWordsMatch = searchWords.every(word => cache.modelNorm.includes(word));
            if (allWordsMatch) {
                score = 90;
                matchReason = 'model-all-words';
            } else {
                const matchingCount = searchWords.filter(word => cache.modelNorm.includes(word)).length;
                if (matchingCount > 0) {
                    score = 60 + (matchingCount * 10);
                    matchReason = `model-${matchingCount}-words`;
                }
            }
        }
        
        // 5. BÚSQUEDA POR SKU
        if (score === 0) {
            if (cache.skuNorm === normalizedTerm) {
                score = 80;
                matchReason = 'sku-exact';
            } else if (cache.skuNorm.includes(normalizedTerm)) {
                score = 70;
                matchReason = 'sku-contains';
            }
        }
        
        // 6. BÚSQUEDA POR ID INTERNO
        if (score === 0 && cache.idInternoNorm) {
            if (cache.idInternoNorm === normalizedTerm) {
                score = 75;
                matchReason = 'id-exact';
            } else if (cache.idInternoNorm.includes(normalizedTerm)) {
                score = 65;
                matchReason = 'id-contains';
            }
        }
        
        // 7. BÚSQUEDA POR MARCA
        if (score === 0) {
            if (cache.brandNorm === normalizedTerm) {
                score = 65;
                matchReason = 'brand-exact';
            } else if (cache.brandNorm.includes(normalizedTerm)) {
                score = 55;
                matchReason = 'brand-contains';
            }
        }
        
        // 8. BÚSQUEDA POR NÚMEROS DE SERIE
        if (score === 0 && product._serialNorm) {
            const serialMatch = product._serialNorm.some(serial => 
                serial === normalizedTerm || serial.includes(normalizedTerm)
            );
            if (serialMatch) {
                score = 70;
                matchReason = 'serial-match';
            }
        }
        
        if (score > 0) {
            results.push({ product, score, matchReason });
        }
    }
    
    results.sort((a, b) => b.score - a.score);
    
    console.log(`✅ Found ${results.length} products`);
    if (results.length > 0) {
        console.log('Top result:', results[0].product.Model, `(score: ${results[0].score})`);
    }
    
    return results.map(r => r.product);
}

function findProductBySerialNumber(serialNumber) {
    if (!serialNumber || !productsLoaded) return null;
    
    const cleanSerial = normalizeText(serialNumber);
    console.log(`🔍 Searching serial: "${cleanSerial}"`);
    
    for (const product of allProducts) {
        if (product.unidades && Array.isArray(product.unidades)) {
            const unidad = product.unidades.find(u => {
                const serial = normalizeText(u.serie || u.numeroSerie || u.serialNumber || '');
                return serial === cleanSerial;
            });
            
            if (unidad) {
                console.log(`✅ Found by serial: ${product.Model}`);
                return { product, unidad };
            }
        }
    }
    
    console.log(`❌ No product found with serial: "${cleanSerial}"`);
    return null;
}

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount || 0);
};

const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
        const image = product.images[0];
        if (image && typeof image === 'string') {
            if (image.startsWith('data:image')) return image;
            if (image.startsWith('http')) return image;
            if (image.length > 100) return `data:image/jpeg;base64,${image}`;
        }
    }
    return 'https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image';
};

function getSerialNumber(unidad) {
    return safeToString(unidad?.serie || unidad?.numeroSerie || unidad?.serialNumber || '');
}

function isSerialInCart(serialNumber) {
    const cleanSerial = normalizeText(serialNumber);
    return cart.some(item => {
        if (item.serials && item.serials.length > 0) {
            return item.serials.some(serial => 
                normalizeText(getSerialNumber(serial)) === cleanSerial
            );
        }
        return false;
    });
}

// =============================================
// CARRITO (PERSISTENCIA)
// =============================================

function saveCartToStorage() {
    try {
        // Guardar solo la información necesaria para restaurar
        const cartData = cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            serials: item.serials ? item.serials.map(s => ({
                serie: s.serie || s.numeroSerie || s.serialNumber,
                id: s.id
            })) : []
        }));
        
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
            items: cartData,
            timestamp: new Date().toISOString(),
            totalItems: cart.reduce((sum, item) => sum + item.quantity, 0)
        }));
        
        console.log('Cart saved to localStorage, items:', cart.length);
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

async function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (!saved) {
            console.log('No saved cart found');
            return;
        }
        
        const cartData = JSON.parse(saved);
        console.log('Loading cart from storage:', cartData.items.length, 'items');
        
        for (const savedItem of cartData.items) {
            // Buscar el producto en allProducts (que ya tiene todos los métodos)
            const product = allProducts.find(p => p.id === savedItem.productId);
            
            if (product) {
                // Verificar stock disponible
                const stock = product.getTotalUnidades();
                
                if (stock >= savedItem.quantity) {
                    // Restaurar las unidades específicas si hay seriales
                    const restoredSerials = [];
                    
                    if (savedItem.serials && savedItem.serials.length > 0) {
                        for (const savedSerial of savedItem.serials) {
                            if (savedSerial.serie && product.unidades) {
                                const unidad = product.unidades.find(u => 
                                    (u.serie || u.numeroSerie || u.serialNumber) === savedSerial.serie
                                );
                                if (unidad) {
                                    restoredSerials.push(unidad);
                                }
                            }
                        }
                    }
                    
                    cart.push({
                        product: product,
                        quantity: savedItem.quantity,
                        serials: restoredSerials
                    });
                    
                    console.log(`Restored ${savedItem.quantity}x ${product.Model}`);
                } else {
                    console.warn(`Cannot restore ${product.Model}: insufficient stock (${stock} available, ${savedItem.quantity} needed)`);
                }
            } else {
                console.warn(`Product not found: ${savedItem.productId}`);
            }
        }
        
        if (cart.length > 0) {
            syncCartWithStorage();
            showBarcodeFeedback(`Cart restored: ${cart.length} item(s)`, 'success');
        }
        
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

function syncCartWithStorage() {
    renderCart();
    updateCartSummary();
    saveCartToStorage();
    
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

// =============================================
// INTERFAZ DE USUARIO
// =============================================

function showBarcodeFeedback(message, type = 'info') {
    if (!barcodeFeedback) return;
    
    const icons = { 
        success: 'check-circle', 
        error: 'exclamation-circle', 
        info: 'info-circle', 
        warning: 'exclamation-triangle' 
    };
    
    barcodeFeedback.innerHTML = `<i class="fas fa-${icons[type]}"></i> ${message}`;
    barcodeFeedback.className = `barcode-feedback ${type}`;
    
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
        barcodeFeedback.innerHTML = '';
        barcodeFeedback.className = 'barcode-feedback';
    }, 3000);
}

function showEmptySearchState() {
    productGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
            <i class="fas fa-search" style="font-size: 3rem; color: var(--text-light); margin-bottom: 15px;"></i>
            <h3 style="color: var(--text); margin-bottom: 10px;">Search for Products</h3>
            <p style="color: var(--text-light); max-width: 500px; margin: 0 auto;">
                Try searching by:<br>
                • <strong>Model</strong> - e.g., "Refrigerator", "Samsung Washer"<br>
                • <strong>SKU</strong> - Product code<br>
                • <strong>ID</strong> - Internal ID<br>
                • <strong>Brand</strong> - Samsung, LG, Whirlpool<br>
                • Or <strong>scan a serial number</strong>
            </p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <span class="scan-indicator"><i class="fas fa-barcode"></i> Scan serial</span>
                <span class="scan-indicator"><i class="fas fa-search"></i> Search by model</span>
                <span class="scan-indicator"><i class="fas fa-tag"></i> Search by SKU</span>
            </div>
        </div>
    `;
}

function renderProducts(productsToRender) {
    if (!productsToRender || productsToRender.length === 0) {
        showEmptySearchState();
        return;
    }
    
    productGrid.innerHTML = productsToRender.map(product => {
        const stock = product.getTotalUnidades();
        const stockClass = stock <= 0 ? 'out-of-stock' : stock <= 5 ? 'low-stock' : '';
        
        return `
            <div class="pos-product-card ${stockClass}" data-product-id="${product.id}">
                <div class="pos-product-image">
                    <img src="${getProductImage(product)}" 
                         alt="${product.Model || 'Product'}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image'">
                </div>
                <div class="pos-product-info">
                    <h4 title="${product.Model || 'No model'}">${product.Model || 'No model'}</h4>
                    <div class="pos-product-meta">
                        <span class="pos-product-sku">SKU: ${product.SKU || 'N/A'}</span>
                        ${product.brandName && product.brandName !== 'No brand' ? 
                            `<span class="pos-product-brand"><i class="fas fa-tag"></i> ${product.brandName}</span>` : ''}
                    </div>
                    ${product.idInterno ? `<span class="pos-product-id">ID: ${product.idInterno}</span>` : ''}
                    <div class="pos-product-price">${product.getNuestroPrecioFormatted()}</div>
                    <div class="pos-product-stock ${stockClass}">
                        <i class="fas fa-cubes"></i>
                        <span>Stock: ${stock} unit${stock !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="pos-product-view-details">
                        <small><i class="fas fa-external-link-alt"></i> Click to view details</small>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.pos-product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            window.location.href = `../productDetailAdmin/productDetailAdmin.html?id=${productId}`;
        });
    });
}

function renderCart() {
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>The cart is empty</p>
                <small>Scan a serial number or search to add items</small>
            </div>
        `;
        return;
    }
    
    cartItems.innerHTML = cart.map((item, index) => {
        const product = item.product;
        const subtotal = product.nuestroPrecio * item.quantity;
        const serialsText = item.serials && item.serials.length > 0 
            ? `<small class="cart-item-serials"><i class="fas fa-barcode"></i> ${item.serials.map(s => s.serie || s.numeroSerie).join(', ')}</small>`
            : '';
        const canChangeQuantity = !(item.serials && item.serials.length > 0);
        
        return `
            <div class="cart-item" data-cart-index="${index}">
                <div class="cart-item-image">
                    <img src="${getProductImage(product)}" alt="${product.Model}" 
                         onerror="this.src='https://via.placeholder.com/60x60/0a2540/ffffff?text=No+Image'">
                </div>
                <div class="cart-item-details">
                    <h4>${product.Model || 'No model'}</h4>
                    <div class="cart-item-sku">${product.SKU || 'N/A'}</div>
                    <div class="cart-item-price">${formatCurrency(subtotal)}</div>
                    ${serialsText}
                    <div class="cart-item-quantity">
                        ${canChangeQuantity ? `
                            <button class="quantity-btn decrease-btn" data-index="${index}"><i class="fas fa-minus"></i></button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn increase-btn" data-index="${index}"><i class="fas fa-plus"></i></button>
                        ` : `
                            <span class="quantity-value">${item.quantity}</span>
                        `}
                    </div>
                </div>
                <div class="cart-item-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </div>
            </div>
        `;
    }).join('');
    
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

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.nuestroPrecio * item.quantity), 0);
    const tax = subtotal * 0.0838;
    const total = subtotal + tax;
    
    subtotalEl.textContent = formatCurrency(subtotal);
    taxEl.textContent = formatCurrency(tax);
    totalEl.textContent = formatCurrency(total);
}

function updateProductCount(count) {
    if (productCountEl) productCountEl.textContent = count;
}

function showLoading(show) {
    if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
    if (productGrid) productGrid.style.display = show ? 'none' : 'grid';
}

// =============================================
// ACCIONES DEL CARRITO
// =============================================

function addToCart(productId, specificUnidad = null) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showBarcodeFeedback('Product not found', 'error');
        return;
    }
    
    const stock = product.getTotalUnidades();
    
    if (stock <= 0) {
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
    
    // Con serial específico (desde escáner)
    if (specificUnidad) {
        const serialNumber = getSerialNumber(specificUnidad);
        
        if (isSerialInCart(serialNumber)) {
            showBarcodeFeedback(`Serial ${serialNumber} is already in cart`, 'error');
            return;
        }
        
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
    // Sin serial específico (desde búsqueda)
    else {
        const existingItem = cart.find(item => 
            item.product.id === productId && (!item.serials || item.serials.length === 0)
        );
        
        if (existingItem) {
            if (existingItem.quantity < stock) {
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
                    text: `Only ${stock} units available`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                return;
            }
        } else {
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
    
    syncCartWithStorage();
}

function removeFromCart(index) {
    const removedItem = cart[index];
    cart.splice(index, 1);
    syncCartWithStorage();
    
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

function updateQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    const item = cart[index];
    
    if (item.serials && item.serials.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Cannot Change Quantity',
            text: 'Items with specific serial numbers must be added individually.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        return;
    }
    
    const stock = item.product.getTotalUnidades();
    
    if (newQuantity > stock) {
        Swal.fire({
            icon: 'warning',
            title: 'Insufficient Stock',
            text: `Only ${stock} units available`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        return;
    }
    
    item.quantity = newQuantity;
    syncCartWithStorage();
}

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
            syncCartWithStorage();
            
            Swal.fire({
                icon: 'success',
                title: 'Cart Cleared',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            
            barcodeInput.focus();
        }
    });
}

function checkout() {
    if (cart.length === 0) return;
    
    // Guardar carrito antes de redirigir
    saveCartToStorage();
    
    // Recolectar todos los seriales
    const allSerials = [];
    
    cart.forEach(item => {
        if (item.serials && item.serials.length > 0) {
            item.serials.forEach(serial => {
                const serialNumber = serial.serie || serial.numeroSerie || serial.serialNumber || '';
                if (serialNumber) {
                    allSerials.push(serialNumber);
                }
            });
        } else {
            for (let i = 0; i < item.quantity; i++) {
                allSerials.push(`TEMP-${item.product.id}-${i + 1}`);
            }
        }
    });
    
    console.log('Serials to sell:', allSerials);
    
    // Guardar seriales para la página de cierre
    localStorage.setItem('checkoutSerials', JSON.stringify(allSerials));
    
    // Redirigir
    window.location.href = '../closeSaleAdmin/closeSaleAdmin.html';
}

// =============================================
// BÚSQUEDA PRINCIPAL
// =============================================

function performSearch(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) {
        showEmptySearchState();
        updateProductCount(0);
        return;
    }
    
    if (!productsLoaded) {
        showBarcodeFeedback('Loading products, please wait...', 'info');
        return;
    }
    
    const results = searchProductsLocally(searchTerm);
    
    if (results.length > 0) {
        renderProducts(results);
        updateProductCount(results.length);
        showBarcodeFeedback(`Found ${results.length} product${results.length !== 1 ? 's' : ''}`, 'success');
    } else {
        productGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--warning); margin-bottom: 15px;"></i>
                <h3 style="color: var(--text); margin-bottom: 10px;">No Products Found</h3>
                <p style="color: var(--text-light); max-width: 400px; margin: 0 auto;">
                    No products match "${searchTerm}".<br>
                    Try searching by model name, SKU, or brand.
                </p>
            </div>
        `;
        updateProductCount(0);
        showBarcodeFeedback(`No results for "${searchTerm}"`, 'info');
    }
}

function processBarcode(barcode) {
    if (!barcode || !barcode.trim()) {
        showBarcodeFeedback('Please enter a serial number', 'error');
        return;
    }
    
    if (!productsLoaded) {
        showBarcodeFeedback('Loading products, please wait...', 'info');
        return;
    }
    
    barcodeInput.classList.add('scanning');
    const cleanBarcode = barcode.trim();
    
    if (isSerialInCart(cleanBarcode)) {
        showBarcodeFeedback(`Serial ${cleanBarcode} is already in cart`, 'error');
        barcodeInput.value = '';
        barcodeInput.classList.remove('scanning');
        barcodeInput.focus();
        return;
    }
    
    const result = findProductBySerialNumber(cleanBarcode);
    
    if (result) {
        renderProducts([result.product]);
        updateProductCount(1);
        addToCart(result.product.id, result.unidad);
        showBarcodeFeedback(`✓ ${result.product.Model} added to cart`, 'success');
        barcodeInput.value = '';
    } else {
        showBarcodeFeedback(`✗ No product found with serial: ${cleanBarcode}`, 'error');
        barcodeInput.select();
    }
    
    setTimeout(() => {
        barcodeInput.classList.remove('scanning');
    }, 500);
    
    barcodeInput.focus();
}

// =============================================
// INICIALIZACIÓN
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing POS...');
    loadInitialData();
    
    checkoutBtn.addEventListener('click', checkout);
    clearCartBtn.addEventListener('click', clearCart);
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            performSearch('');
        }
    });
    
    barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processBarcode(barcodeInput.value.trim());
        }
    });
    
    addBarcodeBtn.addEventListener('click', () => {
        processBarcode(barcodeInput.value.trim());
    });
    
    barcodeInput.addEventListener('input', () => {
        if (feedbackTimeout) clearTimeout(feedbackTimeout);
        barcodeFeedback.innerHTML = '';
        barcodeFeedback.className = 'barcode-feedback';
        barcodeInput.classList.remove('scanning');
    });
    
    setTimeout(() => {
        if (document.activeElement !== searchInput) {
            barcodeInput.focus();
        }
    }, 500);
    
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            barcodeInput.focus();
            barcodeInput.select();
        }
        if (e.key === 'Escape' && document.activeElement === barcodeInput) {
            barcodeInput.value = '';
            showBarcodeFeedback('Input cleared', 'info');
        }
    });
});

window.addToCart = addToCart;
window.processBarcode = processBarcode;
window.clearCart = clearCart;