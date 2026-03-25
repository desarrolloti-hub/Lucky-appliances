// closeSaleAdmin.js - Complete sale logic
import { ProductManager } from '/classes/product.js';
import { SalesManager } from '/classes/sale.js';
import { ClientManager } from '/classes/client.js';
import { PDFGenerator } from './pdf-generator.js';

// Initialize managers
const productManager = new ProductManager();
const salesManager = new SalesManager();
const clientManager = new ClientManager();
const pdfGenerator = new PDFGenerator();

// State
let serialNumbers = [];
let products = [];
let allProducts = [];
let saleNumber = '';
let additionalCharges = [];

// Variables para autocompletado de clientes
let clientSearchTimeout = null;
let currentSuggestedClient = null; // Cliente sugerido
let isClientSelected = false; // Si el usuario aceptó la sugerencia

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const loadingProducts = document.getElementById('loadingProducts');
const productCount = document.getElementById('productCount');
const sellerName = document.getElementById('sellerName');
const sellerEmail = document.getElementById('sellerEmail');
const sellerRole = document.getElementById('sellerRole');
const currentDate = document.getElementById('currentDate');
const currentTime = document.getElementById('currentTime');
const customerName = document.getElementById('customerName');
const customerAddress = document.getElementById('customerAddress');
const customerPhone = document.getElementById('customerPhone');
const customerEmail = document.getElementById('customerEmail');
const summaryProductsSubtotal = document.getElementById('summaryProductsSubtotal');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryTax = document.getElementById('summaryTax');
const summaryTotal = document.getElementById('summaryTotal');
const taxRateDisplay = document.getElementById('taxRateDisplay');
const chargesSummaryContainer = document.getElementById('chargesSummaryContainer');
const additionalChargesContainer = document.getElementById('additionalChargesContainer');
const addChargeBtn = document.getElementById('addChargeBtn');
const completeSaleBtn = document.getElementById('completeSaleBtn');
const backBtn = document.getElementById('backBtn');
const saleNumberEl = document.getElementById('saleNumber');

// New Tax Elements
const taxRateInput = document.getElementById('taxRate');
const applyTaxCheckbox = document.getElementById('applyTax');
const taxRow = document.getElementById('taxRow');

// DOM Elements for Terms
const applyCustomTerms = document.getElementById('applyCustomTerms');
const termsText = document.getElementById('termsText');
const termsPreview = document.getElementById('termsPreview');
const resetTermsBtn = document.getElementById('resetTermsBtn');

// Default terms
const DEFAULT_TERMS = `1. All items are covered by a 90 day warranty and there are new or open box.
2. Our warranty does not cover any damage caused during self-installation.
3. If the customer hired a technician that is not affiliated with Lucky Appliances, we are not responsible for damages caused during installation.
4. Our Warranty does not cover any damage that occurs during transportation by someone other than our technicians. For example if the customer decides to transport items in their own vehicle.
5. Lucky Appliances will only issue an exchange or return if there is a technical issue with the item or was dented/scratched by our technician.
6. After 3 months of keeping items on hold we are not responsible for damages.
7. Restocking fee applies for any returning item, often when the return is for reasons other than product defect or damages.
8. All sales are final.`;

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

// Load products and serial numbers from URL
function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const serialsParam = urlParams.get('serials');
    
    if (serialsParam) {
        try {
            serialNumbers = JSON.parse(decodeURIComponent(serialsParam));
            console.log('Serial numbers loaded:', serialNumbers);
            return true;
        } catch (error) {
            console.error('Error parsing serial numbers:', error);
            return false;
        }
    }
    return false;
}

// Update terms preview
function updateTermsPreview() {
    if (termsPreview) {
        termsPreview.textContent = termsText.value || DEFAULT_TERMS;
    }
}

// Toggle terms editor
function toggleTermsEditor() {
    termsText.disabled = !applyCustomTerms.checked;
    if (!applyCustomTerms.checked) {
        termsText.value = DEFAULT_TERMS;
        updateTermsPreview();
    }
}

// Reset terms to default
function resetTerms() {
    termsText.value = DEFAULT_TERMS;
    updateTermsPreview();
    if (!applyCustomTerms.checked) {
        applyCustomTerms.checked = true;
        toggleTermsEditor();
    }
}

// ============ CLIENT MANAGEMENT FUNCTIONS ============

// Crear elemento de sugerencia con botones siempre visibles
function createSuggestionElement(client) {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'client-suggestion';
    suggestionDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--white);
        border: 1px solid var(--gray);
        border-radius: 12px;
        margin-top: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideDown 0.2s ease;
    `;
    
    suggestionDiv.innerHTML = `
        <div style="padding: 12px 15px; background: linear-gradient(135deg, var(--primary-light), var(--primary)); border-radius: 12px 12px 0 0; color: white;">
            <strong><i class="fas fa-user-check"></i> Existing Client Found</strong>
        </div>
        <div style="padding: 15px;">
            <div style="font-weight: 600; font-size: 1rem; margin-bottom: 8px;">${escapeHtml(client.name)}</div>
            ${client.phone ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.85rem;"><i class="fas fa-phone" style="color: var(--accent); width: 20px; flex-shrink: 0;"></i> <span style="word-break: break-word; flex: 1;">${escapeHtml(client.phone)}</span></div>` : ''}
            ${client.email ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.85rem;"><i class="fas fa-envelope" style="color: var(--accent); width: 20px; flex-shrink: 0;"></i> <span style="word-break: break-word; flex: 1;">${escapeHtml(client.email)}</span></div>` : ''}
            ${client.address ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.85rem;"><i class="fas fa-map-marker-alt" style="color: var(--accent); width: 20px; flex-shrink: 0;"></i> <span style="word-break: break-word; flex: 1;">${escapeHtml(client.address)}</span></div>` : ''}
        </div>
        <div style="padding: 12px 15px; border-top: 1px solid var(--gray); display: flex; gap: 12px; background: var(--light); border-radius: 0 0 12px 12px;">
            <button class="accept-suggestion" style="flex: 1; padding: 10px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fas fa-check-circle"></i> Use This Client
            </button>
            <button class="ignore-suggestion" style="flex: 1; padding: 10px; background: var(--danger); border: 1px solid var(--danger); border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; color: white;">
                <i class="fas fa-times-circle"></i> Continue with New Data
            </button>
        </div>
    `;
    
    // Agregar hover effects
    const acceptBtn = suggestionDiv.querySelector('.accept-suggestion');
    const ignoreBtn = suggestionDiv.querySelector('.ignore-suggestion');
    
    acceptBtn.onmouseenter = () => {
        acceptBtn.style.transform = 'translateY(-1px)';
        acceptBtn.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)';
    };
    acceptBtn.onmouseleave = () => {
        acceptBtn.style.transform = 'translateY(0)';
        acceptBtn.style.boxShadow = 'none';
    };
    
    ignoreBtn.onmouseenter = () => {
        ignoreBtn.style.background = '#c82333';
        ignoreBtn.style.transform = 'translateY(-1px)';
        ignoreBtn.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
    };
    ignoreBtn.onmouseleave = () => {
        ignoreBtn.style.background = 'var(--danger)';
        ignoreBtn.style.transform = 'translateY(0)';
        ignoreBtn.style.boxShadow = 'none';
    };
    
    // Event listeners
    acceptBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        acceptClientSuggestion(client);
        suggestionDiv.remove();
    };
    
    ignoreBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentSuggestedClient = null;
        isClientSelected = false;
        suggestionDiv.remove();
        customerName.focus();
    };
    
    return suggestionDiv;
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Aceptar sugerencia de cliente
function acceptClientSuggestion(client) {
    console.log('Accepting client suggestion:', client.name);
    
    // Autocompletar campos
    customerName.value = client.name;
    customerAddress.value = client.address || '';
    customerPhone.value = client.phone || '';
    customerEmail.value = client.email || '';
    
    // Marcar que se ha seleccionado un cliente existente
    currentSuggestedClient = client;
    isClientSelected = true;
    
    // Mostrar feedback
    showTemporaryMessage(`Client "${client.name}" loaded successfully`, 'success');
    
    // Validar formulario
    validateForm();
}

// Buscar cliente por nombre (coincidencia parcial)
function searchClientByName(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return null;
    
    const term = searchTerm.toLowerCase().trim();
    
    // Buscar coincidencia exacta
    let exactMatch = clientManager.clients.find(client => 
        client.name.toLowerCase() === term
    );
    if (exactMatch) return exactMatch;
    
    // Buscar coincidencia que empiece con el término
    let startsWithMatch = clientManager.clients.find(client => 
        client.name.toLowerCase().startsWith(term)
    );
    if (startsWithMatch) return startsWithMatch;
    
    // Buscar coincidencia parcial
    let partialMatch = clientManager.clients.find(client => 
        client.name.toLowerCase().includes(term)
    );
    
    return partialMatch || null;
}

// Eliminar sugerencia existente
function removeExistingSuggestion() {
    const existingSuggestion = document.querySelector('.client-suggestion');
    if (existingSuggestion) {
        existingSuggestion.remove();
    }
}

// Mostrar mensaje temporal
function showTemporaryMessage(message, type = 'success') {
    let messageEl = document.getElementById('tempMessage');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'tempMessage';
        messageEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--accent);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow);
            z-index: 1000;
            font-size: 0.9rem;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(messageEl);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    if (type === 'warning') {
        messageEl.style.background = 'var(--warning)';
        messageEl.style.color = '#333';
    } else if (type === 'error') {
        messageEl.style.background = 'var(--danger)';
    } else {
        messageEl.style.background = 'var(--accent)';
    }
    
    messageEl.innerHTML = `<i class="fas ${type === 'success' ? 'fa-user-check' : 'fa-exclamation-triangle'}"></i> ${message}`;
    messageEl.style.display = 'flex';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// Manejar entrada de nombre del cliente (con debounce)
function handleCustomerNameInput(event) {
    const searchTerm = event.target.value.trim();
    
    // Limpiar timeout anterior
    if (clientSearchTimeout) {
        clearTimeout(clientSearchTimeout);
    }
    
    // Eliminar sugerencia existente
    removeExistingSuggestion();
    
    // Si no hay término de búsqueda o el usuario ya seleccionó un cliente
    if (!searchTerm || isClientSelected) {
        if (!searchTerm) {
            isClientSelected = false;
            currentSuggestedClient = null;
        }
        return;
    }
    
    // Debounce para buscar después de dejar de escribir
    clientSearchTimeout = setTimeout(async () => {
        // Asegurar que los clientes estén cargados
        if (clientManager.clients.length === 0) {
            await clientManager.loadClients();
        }
        
        // Buscar cliente
        const foundClient = searchClientByName(searchTerm);
        
        if (foundClient && foundClient.name.toLowerCase() !== searchTerm.toLowerCase()) {
            // Mostrar sugerencia solo si no es una coincidencia exacta
            currentSuggestedClient = foundClient;
            
            // Crear y mostrar elemento de sugerencia
            const suggestionElement = createSuggestionElement(foundClient);
            const nameInput = event.target;
            const container = nameInput.parentElement;
            container.style.position = 'relative';
            container.appendChild(suggestionElement);
        } else {
            currentSuggestedClient = null;
        }
    }, 500);
}

// Guardar o actualizar cliente después de la venta
async function saveOrUpdateClient(customerData, saleId) {
    try {
        // Si el usuario seleccionó un cliente existente
        if (isClientSelected && currentSuggestedClient) {
            // Verificar si hay datos que actualizar
            let needsUpdate = false;
            const updateData = {};
            
            if (customerData.address && currentSuggestedClient.address !== customerData.address) {
                updateData.address = customerData.address;
                needsUpdate = true;
            }
            if (customerData.phone && currentSuggestedClient.phone !== customerData.phone) {
                updateData.phone = customerData.phone;
                needsUpdate = true;
            }
            if (customerData.email && currentSuggestedClient.email !== customerData.email) {
                updateData.email = customerData.email;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await clientManager.updateClient(currentSuggestedClient.id, updateData);
                console.log('Client updated with new information');
            }
            
            // Agregar venta al historial
            await clientManager.addPurchaseToClient(currentSuggestedClient.id, saleId);
            console.log(`Sale ${saleId} added to client ${currentSuggestedClient.name} history`);
            
            return currentSuggestedClient;
        } 
        // Si es un cliente nuevo
        else if (customerData.name && customerData.name.trim() !== '') {
            // Verificar si ya existe (por si acaso)
            const existingClient = searchClientByName(customerData.name);
            if (existingClient) {
                await clientManager.addPurchaseToClient(existingClient.id, saleId);
                return existingClient;
            } else {
                // Crear nuevo cliente
                const newClientData = {
                    name: customerData.name,
                    address: customerData.address || '',
                    phone: customerData.phone || '',
                    email: customerData.email || '',
                    history: [saleId]
                };
                
                const result = await clientManager.createClient(newClientData);
                console.log('New client created:', result.client.name);
                return result.client;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error saving/updating client:', error);
        throw error;
    }
}

// ============ END CLIENT MANAGEMENT FUNCTIONS ============

// Load all products
async function loadProducts() {
    try {
        showLoading(true);
        
        await productManager.loadBrandsAndCategoriesAndProviders();
        allProducts = await productManager.loadProducts();
        
        // Filter products that match serial numbers
        products = [];
        allProducts.forEach(product => {
            if (product.unidades && Array.isArray(product.unidades)) {
                const matchingUnidades = product.unidades.filter(unidad => {
                    const unidadSerial = (unidad.serie || unidad.numeroSerie || unidad.serialNumber || '').toString().trim();
                    return serialNumbers.includes(unidadSerial);
                });
                
                matchingUnidades.forEach(unidad => {
                    products.push({
                        product: product,
                        unidad: unidad,
                        serial: (unidad.serie || unidad.numeroSerie || unidad.serialNumber || '').toString().trim()
                    });
                });
            }
        });
        
        console.log('Products to sell:', products.length);
        renderProducts();
        updateSummary();
        updateProductCount();
        
    } catch (error) {
        console.error('Error loading products:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not load products: ' + error.message
        });
    } finally {
        showLoading(false);
    }
}

// Render products grid
function renderProducts() {
    if (products.length === 0) {
        productsGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-box-open"></i>
                <p>No products found with the selected serial numbers</p>
            </div>
        `;
        return;
    }
    
    const productGroups = new Map();
    products.forEach(item => {
        const productId = item.product.id;
        if (!productGroups.has(productId)) {
            productGroups.set(productId, []);
        }
        productGroups.get(productId).push(item);
    });
    
    productsGrid.innerHTML = Array.from(productGroups.entries()).map(([productId, items]) => {
        const product = items[0].product;
        const imageUrl = getProductImage(product);
        const quantity = items.length;
        
        const serialsList = items.map(item => 
            `<div class="product-serial"><i class="fas fa-barcode"></i> ${item.serial}</div>`
        ).join('');
        
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="${imageUrl}" 
                         alt="${product.Model}" 
                         onerror="this.src='https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image'">
                </div>
                <div class="product-info">
                    <h4>${product.Model || 'No model'}</h4>
                    <span class="product-sku">SKU: ${product.SKU || 'N/A'}</span>
                    ${quantity > 1 ? `<span class="product-quantity-badge">x${quantity}</span>` : ''}
                    ${serialsList}
                    <div class="product-price">${formatCurrency(product.nuestroPrecio * quantity)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Update product count
function updateProductCount() {
    if (productCount) {
        productCount.textContent = `${products.length} item${products.length !== 1 ? 's' : ''}`;
    }
}

// Load seller info from localStorage
function loadSellerInfo() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            const user = JSON.parse(userData);
            
            sellerName.textContent = user.displayName || user.fullName || 'N/A';
            sellerEmail.textContent = user.email || 'N/A';
            sellerRole.textContent = user.role || 'N/A';
            
            return user;
        }
    } catch (error) {
        console.error('Error loading seller info:', error);
    }
    return null;
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    
    const dateOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    currentDate.textContent = now.toLocaleDateString('en-US', dateOptions);
    currentTime.textContent = now.toLocaleTimeString('en-US', timeOptions);
    
    saleNumber = generateSaleNumber();
    saleNumberEl.textContent = saleNumber;
    
    localStorage.removeItem('selectedProducts');
    localStorage.removeItem('selectedSerials');
    console.log('Products cleared from localStorage');
}

// Generate sale number
function generateSaleNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SALE-${year}${month}${day}-${random}`;
}

// Calculate products subtotal
function calculateProductsSubtotal() {
    return products.reduce((sum, item) => {
        return sum + (item.product.nuestroPrecio || 0);
    }, 0);
}

// Calculate additional charges total
function calculateChargesTotal() {
    return additionalCharges.reduce((sum, charge) => {
        return sum + (parseFloat(charge.amount) || 0);
    }, 0);
}

// Calculate all totals
function calculateTotals() {
    const productsSubtotal = calculateProductsSubtotal();
    const chargesTotal = calculateChargesTotal();
    
    const taxRate = applyTaxCheckbox.checked ? 0.0838 : 0;
    const tax = productsSubtotal * taxRate;
    const total = productsSubtotal + chargesTotal + tax;
    const subtotal = productsSubtotal + chargesTotal;
    
    return { productsSubtotal, chargesTotal, subtotal, tax, total, taxRate };
}

// Update summary
function updateSummary() {
    const totals = calculateTotals();
    
    summaryProductsSubtotal.textContent = formatCurrency(totals.productsSubtotal);
    
    if (additionalCharges.length > 0) {
        chargesSummaryContainer.style.display = 'block';
        let chargesHTML = '';
        additionalCharges.forEach((charge, index) => {
            chargesHTML += `
                <div class="summary-row charge-item-summary" data-charge-index="${index}">
                    <span>${charge.description}:</span>
                    <span>${formatCurrency(charge.amount)}</span>
                </div>
            `;
        });
        chargesSummaryContainer.innerHTML = chargesHTML;
    } else {
        chargesSummaryContainer.style.display = 'none';
        chargesSummaryContainer.innerHTML = '';
    }
    
    taxRateDisplay.textContent = applyTaxCheckbox.checked ? '8.38' : '0';
    taxRow.style.display = applyTaxCheckbox.checked ? 'flex' : 'none';
    
    summarySubtotal.textContent = formatCurrency(totals.subtotal);
    summaryTax.textContent = formatCurrency(totals.tax);
    summaryTotal.textContent = formatCurrency(totals.total);
    
    validateForm();
}

// Render additional charges
function renderAdditionalCharges() {
    if (additionalCharges.length === 0) {
        additionalChargesContainer.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No additional charges</p>';
        return;
    }
    
    additionalChargesContainer.innerHTML = additionalCharges.map((charge, index) => `
        <div class="charge-item" data-charge-index="${index}">
            <input type="text" 
                   class="charge-description" 
                   value="${charge.description}" 
                   placeholder="Description"
                   data-charge-index="${index}"
                   data-field="description">
            <input type="number" 
                   class="charge-amount" 
                   value="${charge.amount}" 
                   placeholder="Amount"
                   min="0"
                   step="0.01"
                   data-charge-index="${index}"
                   data-field="amount">
            <button type="button" class="btn-remove-charge" data-charge-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.charge-description, .charge-amount').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = e.target.dataset.chargeIndex;
            const field = e.target.dataset.field;
            const value = field === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value;
            
            if (index !== undefined) {
                additionalCharges[index][field] = value;
                updateSummary();
            }
        });
    });
    
    document.querySelectorAll('.btn-remove-charge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.chargeIndex;
            if (index !== undefined) {
                additionalCharges.splice(index, 1);
                renderAdditionalCharges();
                updateSummary();
            }
        });
    });
}

// Add new charge
function addNewCharge() {
    additionalCharges.push({
        description: 'Additional charge',
        amount: 0
    });
    renderAdditionalCharges();
    updateSummary();
}

// Validate form
function validateForm() {
    const isValid = customerName.value.trim() !== '';
    completeSaleBtn.disabled = !isValid;
}

// Show/hide loading
function showLoading(show) {
    if (loadingProducts) {
        loadingProducts.style.display = show ? 'flex' : 'none';
    }
    if (productsGrid) {
        productsGrid.style.display = show ? 'none' : 'grid';
    }
}

// Upload PDF to Firebase Storage
async function uploadPDF(pdfBlob, saleId) {
    try {
        const { storage } = await import('/config/firebase-config.js');
        const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js");
        
        const fileName = `sales/${saleId}/${saleNumber}.pdf`;
        const storageRef = ref(storage, fileName);
        
        const metadata = {
            contentType: 'application/pdf',
            customMetadata: {
                'saleNumber': saleNumber,
                'saleId': saleId,
                'timestamp': new Date().toISOString()
            }
        };
        
        console.log('Uploading PDF to:', fileName);
        console.log('PDF Blob size:', pdfBlob.size, 'bytes');
        
        const snapshot = await uploadBytes(storageRef, pdfBlob, metadata);
        console.log('Upload completed:', snapshot);
        
        const downloadURL = await getDownloadURL(storageRef);
        console.log('✅ PDF URL from Storage:', downloadURL);
        
        return downloadURL;
        
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload PDF to storage: ${error.message}`);
    }
}

// Remove serial numbers from products
async function removeSerialNumbersFromProducts() {
    try {
        const productUpdates = new Map();
        
        products.forEach(item => {
            const productId = item.product.id;
            if (!productUpdates.has(productId)) {
                productUpdates.set(productId, []);
            }
            productUpdates.get(productId).push(item.unidad);
        });
        
        for (const [productId, unidadesToRemove] of productUpdates) {
            const product = productManager.getProductById(productId);
            
            const remainingUnidades = product.unidades.filter(unidad => {
                const unidadSerial = (unidad.serie || unidad.numeroSerie || unidad.serialNumber || '').toString().trim();
                return !unidadesToRemove.some(removeUnidad => {
                    const removeSerial = (removeUnidad.serie || removeUnidad.numeroSerie || removeUnidad.serialNumber || '').toString().trim();
                    return removeSerial === unidadSerial;
                });
            });
            
            await productManager.updateProduct(productId, {
                unidades: remainingUnidades
            });
            
            console.log(`Updated product ${productId}: Removed ${unidadesToRemove.length} sold serials`);
        }
        return true;
    } catch (error) {
        console.error('Error removing serial numbers:', error);
        throw error;
    }
}

// Complete sale
async function completeSale() {
    try {
        completeSaleBtn.disabled = true;
        completeSaleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const customerData = {
            name: customerName.value.trim(),
            address: customerAddress.value.trim(),
            phone: customerPhone.value.trim(),
            email: customerEmail.value.trim()
        };
        
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const totals = calculateTotals();
        
        const pdfProducts = [];
        products.forEach(item => {
            pdfProducts.push({
                serialNumber: item.serial,
                description: item.product.ItemDescription || item.product.Model || 'N/A',
                model: item.product.Model || 'N/A',
                sku: item.product.SKU || 'N/A',
                price: item.product.nuestroPrecio || 0
            });
        });
        
        const validCharges = additionalCharges.filter(charge => 
            charge.description.trim() !== '' && charge.amount > 0
        );
        
        Swal.fire({
            title: 'Processing Sale',
            html: 'Creating sale record...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // Crear venta
        const saleData = {
            saleNumber: saleNumber,
            terms: applyCustomTerms.checked ? termsText.value : DEFAULT_TERMS,
            soldItems: products.map(item => ({
                serialNumber: item.serial,
                productId: item.product.id,
                model: item.product.Model,
                sku: item.product.SKU,
                price: item.product.nuestroPrecio,
                description: item.product.ItemDescription || item.product.Model
            })),
            serialNumbers: products.map(item => item.serial),
            customerName: customerData.name,
            customerAddress: customerData.address,
            customerPhone: customerData.phone,
            customerEmail: customerData.email,
            additionalCharges: validCharges,
            seller: {
                uid: userData.uid || '',
                displayName: userData.displayName || userData.fullName || '',
                email: userData.email || '',
                role: userData.role || ''
            },
            productsSubtotal: totals.productsSubtotal,
            additionalChargesTotal: totals.chargesTotal,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            taxRate: totals.taxRate
        };
        
        const saleResult = await salesManager.createSale(saleData);
        const saleId = saleResult.id;
        console.log('Sale created with ID:', saleId);
        
        // ============ GUARDAR CLIENTE Y AGREGAR AL HISTORIAL ============
        Swal.update({ html: 'Saving client information...' });
        
        try {
            const savedClient = await saveOrUpdateClient(customerData, saleId);
            if (savedClient) {
                console.log('Client saved/updated successfully:', savedClient.name);
                console.log(`Sale ${saleId} added to client history`);
            }
        } catch (clientError) {
            console.error('Error saving client:', clientError);
            // Continuamos con el proceso
        }
        
        Swal.update({ html: 'Generating PDF...' });
        
        // Generar PDF
        const pdfBlob = await pdfGenerator.generateSalePDF({
            saleNumber: saleNumber,
            customer: customerData,
            seller: {
                displayName: userData.displayName || userData.fullName || '',
                email: userData.email || '',
                role: userData.role || ''
            },
            amounts: {
                productsSubtotal: totals.productsSubtotal,
                chargesTotal: totals.chargesTotal,
                subtotal: totals.subtotal,
                tax: totals.tax,
                total: totals.total,
                taxRate: totals.taxRate
            },
            additionalCharges: validCharges,
            terms: applyCustomTerms.checked ? termsText.value : DEFAULT_TERMS
        }, pdfProducts);
        
        console.log('PDF generated, blob size:', pdfBlob.size);
        
        Swal.update({ html: 'Uploading PDF to cloud...' });
        
        const pdfURL = await uploadPDF(pdfBlob, saleId);
        console.log('✅ PDF uploaded to Storage, URL:', pdfURL);
        
        await salesManager.updateSalePDF(saleId, pdfURL);
        console.log('✅ Sale updated with Storage URL');
        
        Swal.update({ html: 'Updating inventory...' });
        
        await removeSerialNumbersFromProducts();
        
        // Limpiar localStorage
        localStorage.removeItem('selectedProducts');
        localStorage.removeItem('selectedSerials');
        localStorage.removeItem('posCart');
        localStorage.removeItem('tempCart');
        localStorage.removeItem('currentCart');
        localStorage.removeItem('cartItems');
        localStorage.removeItem('tempSerials');
        localStorage.removeItem('selectedItems');
        
        console.log('✅ All cart data cleared');
        
        Swal.close();
        
        window.downloadPDF = function(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        
        Swal.fire({
            icon: 'success',
            title: 'Sale Completed!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #4CAF50; margin-bottom: 15px;"></i>
                    <h3>Sale #: ${saleNumber}</h3>
                    <p style="margin: 5px 0;">Products: ${products.length}</p>
                    <p style="margin: 5px 0;">Additional Charges: ${validCharges.length}</p>
                    <p style="margin: 5px 0; font-size: 1.2rem; font-weight: bold;">Total: ${formatCurrency(totals.total)}</p>
                    
                    <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                        <p style="margin-bottom: 15px; color: #495057;">
                            <i class="fas fa-file-pdf" style="color: #dc3545; margin-right: 8px;"></i>
                            Your invoice is ready
                        </p>
                        
                        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="window.open('${pdfURL}', '_blank')" 
                                    style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 8px;">
                                <i class="fas fa-eye"></i> View PDF
                            </button>
                            
                            <button onclick="window.downloadPDF('${pdfURL}', '${saleNumber}')" 
                                    style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 8px;">
                                <i class="fas fa-download"></i> Download PDF
                            </button>
                        </div>
                        
                        <p style="margin-top: 15px; font-size: 0.85rem; color: #155724; background: #d4edda; padding: 8px; border-radius: 4px;">
                            <i class="fas fa-cloud-upload-alt"></i> PDF saved to cloud storage
                        </p>
                    </div>
                </div>
            `,
            width: '700px',
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: '🛒 New Sale',
            cancelButtonColor: '#6c757d',
            showDenyButton: true,
            denyButtonText: '📋 View Sales',
            denyButtonColor: '#28a745'
        }).then((result) => {
            if (result.isDenied) {
                window.location.href = '../sales/salesAdmin.html';
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                window.location.href = '../posAdmin/posAdmin.html';
            }
        });
        
    } catch (error) {
        console.error('Error completing sale:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            html: `
                <p>Could not complete sale: ${error.message}</p>
                <p style="font-size: 0.9rem; color: #666; margin-top: 10px;">Please try again or contact support.</p>
            `,
            confirmButtonColor: '#4CAF50'
        });
        
        completeSaleBtn.disabled = false;
        completeSaleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Sale';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Close Sale...');
    
    if (taxRateInput) {
        taxRateInput.value = "8.38";
        taxRateInput.readOnly = true;
    }
    
    if (applyCustomTerms) {
        applyCustomTerms.addEventListener('change', toggleTermsEditor);
    }

    if (termsText) {
        termsText.addEventListener('input', updateTermsPreview);
    }

    if (resetTermsBtn) {
        resetTermsBtn.addEventListener('click', resetTerms);
    }

    if (termsText) {
        termsText.value = DEFAULT_TERMS;
        updateTermsPreview();
    }
    
    if (!loadFromURL()) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No products selected for sale'
        }).then(() => {
            window.location.href = '../posAdmin/posAdmin.html';
        });
        return;
    }
    
    loadSellerInfo();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadProducts();
    
    // ============ CARGAR CLIENTES PARA SUGERENCIAS ============
    try {
        await clientManager.loadClients();
        console.log(`Loaded ${clientManager.clients.length} clients for suggestions`);
    } catch (error) {
        console.error('Error loading clients for suggestions:', error);
    }
    
    // Event listener para sugerencias de cliente
    if (customerName) {
        customerName.addEventListener('input', handleCustomerNameInput);
        // También limpiar sugerencia cuando el campo pierde foco
        customerName.addEventListener('blur', () => {
            setTimeout(() => {
                removeExistingSuggestion();
            }, 300);
        });
    }
    
    applyTaxCheckbox.addEventListener('change', updateSummary);
    customerName.addEventListener('input', validateForm);
    addChargeBtn.addEventListener('click', addNewCharge);
    completeSaleBtn.addEventListener('click', completeSale);
    backBtn.addEventListener('click', () => {
        window.location.href = '../posAdmin/posAdmin.html';
    });
});

window.completeSale = completeSale;