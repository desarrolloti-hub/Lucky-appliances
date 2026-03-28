// closeSaleAdmin.js - Complete sale logic with discount and payment methods
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

// Discount state
let currentDiscount = {
    amount: 0,
    percentage: 0,
    type: null // 'amount' or 'percentage'
};

// Payment state
let selectedPaymentMethod = 'cash';

// Variables para autocompletado de clientes
let clientSearchTimeout = null;
let currentSuggestedClient = null;
let isClientSelected = false;

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
const additionalChargesContainer = document.getElementById('additionalChargesContainer');
const addChargeBtn = document.getElementById('addChargeBtn');
const completeSaleBtn = document.getElementById('completeSaleBtn');
const backBtn = document.getElementById('backBtn');
const saleNumberEl = document.getElementById('saleNumber');

// Tax Elements
const taxRateInput = document.getElementById('taxRate');
const applyTaxCheckbox = document.getElementById('applyTax');
const taxRow = document.getElementById('taxRow');

// Terms Elements
const applyCustomTerms = document.getElementById('applyCustomTerms');
const termsText = document.getElementById('termsText');
const termsPreview = document.getElementById('termsPreview');
const resetTermsBtn = document.getElementById('resetTermsBtn');

// Discount Elements
const discountAmount = document.getElementById('discountAmount');
const discountPercentage = document.getElementById('discountPercentage');
const applyDiscountBtn = document.getElementById('applyDiscountBtn');
const discountInfo = document.getElementById('discountInfo');
const discountInfoText = document.getElementById('discountInfoText');
const clearDiscountBtn = document.getElementById('clearDiscountBtn');

// Payment Elements
const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
const paymentDetails = document.getElementById('paymentDetails');

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
    }).format(amount || 0);
};

// Get product image
const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
        return product.getImageUrl(0);
    }
    return 'https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image';
};

// ============ LOAD FUNCTIONS ============

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

async function loadProducts() {
    try {
        showLoading(true);
        
        await productManager.loadBrandsAndCategoriesAndProviders();
        allProducts = await productManager.loadProducts();
        
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
        }).then(() => {
            window.location.href = '../posAdmin/posAdmin.html';
        });
    } finally {
        showLoading(false);
    }
}

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
            `<div class="product-serial"><i class="fas fa-barcode"></i> ${escapeHtml(item.serial)}</div>`
        ).join('');
        
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="${imageUrl}" 
                         alt="${product.Model}" 
                         onerror="this.src='https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image'">
                </div>
                <div class="product-info">
                    <h4>${escapeHtml(product.Model || 'No model')}</h4>
                    <span class="product-sku">SKU: ${escapeHtml(product.SKU || 'N/A')}</span>
                    ${quantity > 1 ? `<span class="product-quantity-badge">x${quantity}</span>` : ''}
                    ${serialsList}
                    <div class="product-price">${formatCurrency(product.nuestroPrecio * quantity)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateProductCount() {
    if (productCount) {
        productCount.textContent = `${products.length} item${products.length !== 1 ? 's' : ''}`;
    }
}

// ============ CALCULATION FUNCTIONS ============

function calculateProductsSubtotal() {
    return products.reduce((sum, item) => {
        return sum + (item.product.nuestroPrecio || 0);
    }, 0);
}

function calculateChargesTotal() {
    return additionalCharges.reduce((sum, charge) => {
        return sum + (parseFloat(charge.amount) || 0);
    }, 0);
}

function calculateDiscount() {
    const productsSubtotal = calculateProductsSubtotal();
    
    let discountValue = 0;
    
    if (currentDiscount.type === 'amount') {
        discountValue = Math.min(currentDiscount.amount, productsSubtotal);
        currentDiscount.amount = discountValue;
        currentDiscount.percentage = productsSubtotal > 0 ? (discountValue / productsSubtotal) * 100 : 0;
    } else if (currentDiscount.type === 'percentage') {
        discountValue = productsSubtotal * (currentDiscount.percentage / 100);
        currentDiscount.amount = discountValue;
    } else {
        currentDiscount.amount = 0;
        currentDiscount.percentage = 0;
    }
    
    return { discountValue, productsSubtotal };
}

function calculateTotals() {
    const productsSubtotal = calculateProductsSubtotal();
    const chargesTotal = calculateChargesTotal();
    const { discountValue } = calculateDiscount();
    
    // Paso 1: Aplicar descuento al subtotal de productos
    const discountedProductsSubtotal = productsSubtotal - discountValue;
    
    // Paso 2: Subtotal = productos con descuento + cargos adicionales
    const subtotal = discountedProductsSubtotal + chargesTotal;
    
    // Paso 3: Impuesto calculado sobre el subtotal de productos con descuento (NO sobre cargos adicionales)
    const taxRate = applyTaxCheckbox.checked ? 0.0838 : 0;
    const tax = discountedProductsSubtotal * taxRate;
    
    // Paso 4: Total final
    const total = subtotal + tax;
    
    return { 
        productsSubtotal, 
        discountedProductsSubtotal,
        chargesTotal, 
        subtotal, 
        tax, 
        total, 
        taxRate,
        discountValue 
    };
}

// ============ DISCOUNT FUNCTIONS ============

function applyDiscount() {
    const amount = parseFloat(discountAmount.value) || 0;
    const percentage = parseFloat(discountPercentage.value) || 0;
    
    if (amount > 0 && percentage > 0) {
        showTemporaryMessage('Please enter only one discount type', 'warning');
        return;
    }
    
    if (amount > 0) {
        currentDiscount = {
            amount: amount,
            percentage: 0,
            type: 'amount'
        };
        discountAmount.value = amount;
        discountPercentage.value = '';
    } else if (percentage > 0) {
        if (percentage > 100) {
            showTemporaryMessage('Discount percentage cannot exceed 100%', 'warning');
            return;
        }
        currentDiscount = {
            amount: 0,
            percentage: percentage,
            type: 'percentage'
        };
        discountPercentage.value = percentage;
        discountAmount.value = '';
    } else {
        showTemporaryMessage('Please enter a discount amount or percentage', 'warning');
        return;
    }
    
    updateDiscountInfo();
    updateSummary();
    showTemporaryMessage(`Discount applied: ${currentDiscount.type === 'amount' ? `$${currentDiscount.amount.toFixed(2)}` : `${currentDiscount.percentage}%`}`, 'success');
}

function updateDiscountInfo() {
    if (currentDiscount.type && (currentDiscount.amount > 0 || currentDiscount.percentage > 0)) {
        discountInfo.style.display = 'flex';
        const totals = calculateTotals();
        
        discountInfoText.innerHTML = `
            <i class="fas fa-tag"></i>
            <strong>Discount Applied:</strong> 
            ${currentDiscount.type === 'amount' ? `$${currentDiscount.amount.toFixed(2)}` : `${currentDiscount.percentage}%`}
            (${formatCurrency(totals.discountValue)})
        `;
    } else {
        discountInfo.style.display = 'none';
    }
}

function clearDiscount() {
    currentDiscount = {
        amount: 0,
        percentage: 0,
        type: null
    };
    discountAmount.value = '0';
    discountPercentage.value = '0';
    discountInfo.style.display = 'none';
    updateSummary();
    showTemporaryMessage('Discount removed', 'success');
}

// ============ PAYMENT FUNCTIONS ============

function handlePaymentMethodChange() {
    const selected = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!selected) return;
    
    selectedPaymentMethod = selected;
    paymentDetails.style.display = 'none';
}

function getPaymentData() {
    const paymentMethod = selectedPaymentMethod;
    const paymentDetailsData = {};
    
    if (paymentMethod === 'card') {
        paymentDetailsData.type = 'card';
    } else if (paymentMethod === 'transfer') {
        paymentDetailsData.type = 'transfer';
    } else {
        paymentDetailsData.type = 'cash';
    }
    
    return { paymentMethod, paymentDetails: paymentDetailsData };
}

function validatePayment() {
    return { valid: true };
}

// ============ CLIENT FUNCTIONS ============

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
    
    const acceptBtn = suggestionDiv.querySelector('.accept-suggestion');
    const ignoreBtn = suggestionDiv.querySelector('.ignore-suggestion');
    
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

function acceptClientSuggestion(client) {
    console.log('Accepting client suggestion:', client.name);
    
    customerName.value = client.name;
    customerAddress.value = client.address || '';
    customerPhone.value = client.phone || '';
    customerEmail.value = client.email || '';
    
    currentSuggestedClient = client;
    isClientSelected = true;
    
    showTemporaryMessage(`Client "${client.name}" loaded successfully`, 'success');
    validateForm();
}

function searchClientByName(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return null;
    
    const term = searchTerm.toLowerCase().trim();
    
    let exactMatch = clientManager.clients.find(client => 
        client.name.toLowerCase() === term
    );
    if (exactMatch) return exactMatch;
    
    let startsWithMatch = clientManager.clients.find(client => 
        client.name.toLowerCase().startsWith(term)
    );
    if (startsWithMatch) return startsWithMatch;
    
    let partialMatch = clientManager.clients.find(client => 
        client.name.toLowerCase().includes(term)
    );
    
    return partialMatch || null;
}

function removeExistingSuggestion() {
    const existingSuggestion = document.querySelector('.client-suggestion');
    if (existingSuggestion) {
        existingSuggestion.remove();
    }
}

function handleCustomerNameInput(event) {
    const searchTerm = event.target.value.trim();
    
    if (clientSearchTimeout) {
        clearTimeout(clientSearchTimeout);
    }
    
    removeExistingSuggestion();
    
    if (!searchTerm || isClientSelected) {
        if (!searchTerm) {
            isClientSelected = false;
            currentSuggestedClient = null;
        }
        return;
    }
    
    clientSearchTimeout = setTimeout(async () => {
        if (clientManager.clients.length === 0) {
            await clientManager.loadClients();
        }
        
        const foundClient = searchClientByName(searchTerm);
        
        if (foundClient && foundClient.name.toLowerCase() !== searchTerm.toLowerCase()) {
            currentSuggestedClient = foundClient;
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

async function saveOrUpdateClient(customerData, saleId) {
    try {
        if (isClientSelected && currentSuggestedClient) {
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
            
            await clientManager.addPurchaseToClient(currentSuggestedClient.id, saleId);
            console.log(`Sale ${saleId} added to client ${currentSuggestedClient.name} history`);
            
            return currentSuggestedClient;
        } 
        else if (customerData.name && customerData.name.trim() !== '') {
            const existingClient = searchClientByName(customerData.name);
            if (existingClient) {
                await clientManager.addPurchaseToClient(existingClient.id, saleId);
                return existingClient;
            } else {
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

// ============ ADDITIONAL CHARGES FUNCTIONS ============

function renderAdditionalCharges() {
    if (additionalCharges.length === 0) {
        additionalChargesContainer.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No additional charges</p>';
        return;
    }
    
    additionalChargesContainer.innerHTML = additionalCharges.map((charge, index) => `
        <div class="charge-item" data-charge-index="${index}">
            <input type="text" 
                   class="charge-description" 
                   value="${escapeHtml(charge.description)}" 
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

function addNewCharge() {
    const chargeDescriptionInput = document.querySelector('.charge-description:last-of-type');
    const chargeAmountInput = document.querySelector('.charge-amount:last-of-type');
    
    if (chargeDescriptionInput && (!chargeDescriptionInput.value.trim() || chargeAmountInput.value === '0')) {
        showTemporaryMessage('Please complete the current charge before adding a new one', 'warning');
        return;
    }
    
    additionalCharges.push({
        description: 'Additional charge',
        amount: 0
    });
    renderAdditionalCharges();
    updateSummary();
    
    setTimeout(() => {
        const newDescriptionInput = document.querySelector('.charge-description:last-of-type');
        if (newDescriptionInput) newDescriptionInput.focus();
    }, 100);
}

// ============ SUMMARY FUNCTIONS ============

function updateSummary() {
    const totals = calculateTotals();
    
    // Actualizar productos subtotal
    summaryProductsSubtotal.textContent = formatCurrency(totals.productsSubtotal);
    
    // Mostrar descuento aplicado
    let discountRow = document.querySelector('.summary-row.discount-row');
    if (totals.discountValue > 0) {
        if (!discountRow) {
            discountRow = document.createElement('div');
            discountRow.className = 'summary-row discount-row';
            const summaryRows = document.querySelector('.sale-summary');
            if (summaryRows) {
                const productsRow = document.querySelector('.summary-row:first-child');
                if (productsRow) {
                    productsRow.insertAdjacentElement('afterend', discountRow);
                }
            }
        }
        discountRow.innerHTML = `
            <span><i class="fas fa-tag"></i> Discount (on products):</span>
            <span>-${formatCurrency(totals.discountValue)}</span>
        `;
    } else if (discountRow) {
        discountRow.remove();
    }
    
    // Mostrar productos con descuento
    let discountedProductsRow = document.querySelector('.summary-row.discounted-products');
    if (totals.discountedProductsSubtotal !== totals.productsSubtotal) {
        if (!discountedProductsRow) {
            discountedProductsRow = document.createElement('div');
            discountedProductsRow.className = 'summary-row discounted-products';
            discountedProductsRow.style.fontSize = '0.9rem';
            discountedProductsRow.style.color = 'var(--accent)';
            const productsRow = document.querySelector('.summary-row:first-child');
            if (productsRow && discountRow) {
                discountRow.insertAdjacentElement('afterend', discountedProductsRow);
            } else if (productsRow) {
                productsRow.insertAdjacentElement('afterend', discountedProductsRow);
            }
        }
        discountedProductsRow.innerHTML = `
            <span>Products after discount:</span>
            <span>${formatCurrency(totals.discountedProductsSubtotal)}</span>
        `;
    } else if (discountedProductsRow) {
        discountedProductsRow.remove();
    }
    
    // Mostrar cargos adicionales
    let chargesContainer = document.getElementById('chargesSummaryContainer');
    if (!chargesContainer) {
        chargesContainer = document.createElement('div');
        chargesContainer.id = 'chargesSummaryContainer';
        const afterProducts = discountedProductsRow || discountRow || document.querySelector('.summary-row:first-child');
        if (afterProducts) {
            afterProducts.insertAdjacentElement('afterend', chargesContainer);
        }
    }
    
    if (additionalCharges.length > 0) {
        chargesContainer.style.display = 'block';
        let chargesHTML = '';
        additionalCharges.forEach((charge, index) => {
            chargesHTML += `
                <div class="summary-row charge-item-summary" data-charge-index="${index}">
                    <span>${escapeHtml(charge.description)}:</span>
                    <span>${formatCurrency(charge.amount)}</span>
                </div>
            `;
        });
        chargesContainer.innerHTML = chargesHTML;
    } else {
        chargesContainer.style.display = 'none';
        chargesContainer.innerHTML = '';
    }
    
    // Actualizar impuestos
    taxRateDisplay.textContent = applyTaxCheckbox.checked ? '8.38' : '0';
    taxRow.style.display = applyTaxCheckbox.checked ? 'flex' : 'none';
    
    // Actualizar subtotal, tax y total
    summarySubtotal.textContent = formatCurrency(totals.subtotal);
    summaryTax.textContent = formatCurrency(totals.tax);
    summaryTotal.textContent = formatCurrency(totals.total);
    
    validateForm();
}

// ============ SELLER & DATE FUNCTIONS ============

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

function generateSaleNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SALE-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

// ============ TERMS FUNCTIONS ============

function updateTermsPreview() {
    if (termsPreview) {
        termsPreview.textContent = termsText.value || DEFAULT_TERMS;
    }
}

function toggleTermsEditor() {
    termsText.disabled = !applyCustomTerms.checked;
    if (!applyCustomTerms.checked) {
        termsText.value = DEFAULT_TERMS;
        updateTermsPreview();
    }
}

function resetTerms() {
    termsText.value = DEFAULT_TERMS;
    updateTermsPreview();
    if (!applyCustomTerms.checked) {
        applyCustomTerms.checked = true;
        toggleTermsEditor();
    }
}

// ============ VALIDATION FUNCTIONS ============

function validateForm() {
    const isValid = customerName.value.trim() !== '';
    completeSaleBtn.disabled = !isValid;
}

function showLoading(show) {
    if (loadingProducts) {
        loadingProducts.style.display = show ? 'flex' : 'none';
    }
    if (productsGrid) {
        productsGrid.style.display = show ? 'none' : 'grid';
    }
}

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
        messageEl.style.background = '#ffc107';
        messageEl.style.color = '#333';
    } else if (type === 'error') {
        messageEl.style.background = '#dc3545';
    } else {
        messageEl.style.background = '#4CAF50';
    }
    
    messageEl.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${message}`;
    messageEl.style.display = 'flex';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// ============ PDF UPLOAD ============

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

// ============ COMPLETE SALE ============

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
        const paymentData = getPaymentData();
        
        // Validate payment (always valid since we don't process payments)
        const paymentValidation = validatePayment();
        if (!paymentValidation.valid) {
            showTemporaryMessage(paymentValidation.message, 'warning');
            completeSaleBtn.disabled = false;
            completeSaleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Sale';
            return;
        }
        
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
            discount: {
                amount: totals.discountValue,
                type: currentDiscount.type,
                value: currentDiscount.type === 'amount' ? currentDiscount.amount : currentDiscount.percentage
            },
            paymentMethod: paymentData.paymentMethod,
            paymentDetails: paymentData.paymentDetails,
            seller: {
                uid: userData.uid || '',
                displayName: userData.displayName || userData.fullName || '',
                email: userData.email || '',
                role: userData.role || ''
            },
            productsSubtotal: totals.productsSubtotal,
            discountedProductsSubtotal: totals.discountedProductsSubtotal,
            additionalChargesTotal: totals.chargesTotal,
            discountValue: totals.discountValue,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            taxRate: totals.taxRate
        };
        
        const saleResult = await salesManager.createSale(saleData);
        const saleId = saleResult.id;
        console.log('Sale created with ID:', saleId);
        
        Swal.update({ html: 'Saving client information...' });
        
        try {
            const savedClient = await saveOrUpdateClient(customerData, saleId);
            if (savedClient) {
                console.log('Client saved/updated successfully:', savedClient.name);
            }
        } catch (clientError) {
            console.error('Error saving client:', clientError);
        }
        
        Swal.update({ html: 'Generating PDF...' });
        
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
                discountedProductsSubtotal: totals.discountedProductsSubtotal,
                chargesTotal: totals.chargesTotal,
                subtotal: totals.subtotal,
                tax: totals.tax,
                total: totals.total,
                taxRate: totals.taxRate,
                discountValue: totals.discountValue
            },
            additionalCharges: validCharges,
            discount: currentDiscount,
            terms: applyCustomTerms.checked ? termsText.value : DEFAULT_TERMS,
            paymentMethod: paymentData.paymentMethod,
            paymentDetails: paymentData.paymentDetails
        }, pdfProducts);
        
        console.log('PDF generated, blob size:', pdfBlob.size);
        
        Swal.update({ html: 'Uploading PDF to cloud...' });
        
        const pdfURL = await uploadPDF(pdfBlob, saleId);
        console.log('✅ PDF uploaded to Storage, URL:', pdfURL);
        
        await salesManager.updateSalePDF(saleId, pdfURL);
        console.log('✅ Sale updated with Storage URL');
        
        Swal.update({ html: 'Updating inventory...' });
        
        await removeSerialNumbersFromProducts();
        
        // Clear localStorage
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
                    ${totals.discountValue > 0 ? `<p style="margin: 5px 0; color: #28a745;">Discount: -${formatCurrency(totals.discountValue)}</p>` : ''}
                    <p style="margin: 5px 0;">Payment Method: ${paymentData.paymentMethod.toUpperCase()}</p>
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
                window.location.href = '../salesAdmin/salesAdmin.html';
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                window.location.href = '../posAdmin/posAdmin.html';
            }
        });
        
    } catch (error) {
        console.error('Error completing sale:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            html: `<p>Could not complete sale: ${error.message}</p>`,
            confirmButtonColor: '#4CAF50'
        });
        
        completeSaleBtn.disabled = false;
        completeSaleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Sale';
    }
}

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Close Sale...');
    
    // Tax setup
    if (taxRateInput) {
        taxRateInput.value = "8.38";
        taxRateInput.readOnly = true;
    }
    
    // Terms setup
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
    
    // Load products from URL
    if (!loadFromURL()) {
        Swal.fire({
            icon: 'error',
            title: 'No Products Selected',
            text: 'No products were selected for sale. Redirecting to POS...',
            timer: 2000,
            showConfirmButton: true
        }).then(() => {
            window.location.href = '../posAdmin/posAdmin.html';
        });
        return;
    }
    
    // Load seller info and date/time
    loadSellerInfo();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load products
    await loadProducts();
    
    // Load clients for suggestions
    try {
        await clientManager.loadClients();
        console.log(`Loaded ${clientManager.clients.length} clients for suggestions`);
    } catch (error) {
        console.error('Error loading clients for suggestions:', error);
    }
    
    // Client suggestion listener
    if (customerName) {
        customerName.addEventListener('input', handleCustomerNameInput);
        customerName.addEventListener('blur', () => {
            setTimeout(() => {
                removeExistingSuggestion();
            }, 300);
        });
    }
    
    // Discount listeners
    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', applyDiscount);
    }
    if (clearDiscountBtn) {
        clearDiscountBtn.addEventListener('click', clearDiscount);
    }
    
    // Payment listeners
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', handlePaymentMethodChange);
    });
    
    // Tax listener
    if (applyTaxCheckbox) {
        applyTaxCheckbox.addEventListener('change', updateSummary);
    }
    
    // Customer name validation
    if (customerName) {
        customerName.addEventListener('input', validateForm);
    }
    
    // Additional charges
    if (addChargeBtn) {
        addChargeBtn.addEventListener('click', addNewCharge);
    }
    
    // Complete sale button
    if (completeSaleBtn) {
        completeSaleBtn.addEventListener('click', completeSale);
    }
    
    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '../posAdmin/posAdmin.html';
        });
    }
    
    console.log('Close Sale initialized successfully');
});