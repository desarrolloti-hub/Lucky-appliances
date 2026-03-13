// closeSaleAdmin.js - Complete sale logic
import { ProductManager } from '/classes/product.js';
import { SalesManager } from '/classes/sale.js';
import { PDFGenerator } from './pdf-generator.js';

// Initialize managers
const productManager = new ProductManager();
const salesManager = new SalesManager();
const pdfGenerator = new PDFGenerator();

// State
let serialNumbers = [];
let products = [];
let allProducts = [];
let saleNumber = '';
let additionalCharges = [];

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

// Load all products
async function loadProducts() {
    try {
        showLoading(true);
        
        await productManager.loadBrandsAndCategoriesAndProviders();
        allProducts = await productManager.loadProducts();
        
        // Create a map to count how many times each serial appears
        const serialCountMap = new Map();
        serialNumbers.forEach(serial => {
            serialCountMap.set(serial, (serialCountMap.get(serial) || 0) + 1);
        });
        
        // Filter products that match serial numbers
        products = [];
        allProducts.forEach(product => {
            if (product.unidades && Array.isArray(product.unidades)) {
                // Find all units that match the serials
                const matchingUnidades = product.unidades.filter(unidad => {
                    const unidadSerial = (unidad.serie || unidad.numeroSerie || unidad.serialNumber || '').toString().trim();
                    return serialNumbers.includes(unidadSerial);
                });
                
                // Add an entry for each found unit
                matchingUnidades.forEach(unidad => {
                    products.push({
                        product: product,
                        unidad: unidad,
                        serial: (unidad.serie || unidad.numeroSerie || unidad.serialNumber || '').toString().trim()
                    });
                });
            }
        });
        
        console.log('Products to sell (with multiples):', products.length);
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
    
    // Group by product to show if there are multiple units
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
        
        // Show all serials for this product
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
    
    // Generate sale number
    saleNumber = generateSaleNumber();
    saleNumberEl.textContent = saleNumber;
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
    const subtotal = productsSubtotal + chargesTotal;
    
    // Check if tax should be applied
    const taxRate = applyTaxCheckbox.checked ? (parseFloat(taxRateInput.value) || 0) / 100 : 0;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    return { productsSubtotal, chargesTotal, subtotal, tax, total, taxRate };
}

// Update summary
function updateSummary() {
    const totals = calculateTotals();
    
    // Update products subtotal
    summaryProductsSubtotal.textContent = formatCurrency(totals.productsSubtotal);
    
    // Update charges summary
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
    
    // Update tax display
    taxRateDisplay.textContent = applyTaxCheckbox.checked ? (parseFloat(taxRateInput.value) || 0) : '0';
    taxRow.style.display = applyTaxCheckbox.checked ? 'flex' : 'none';
    
    // Update totals
    summarySubtotal.textContent = formatCurrency(totals.subtotal);
    summaryTax.textContent = formatCurrency(totals.tax);
    summaryTotal.textContent = formatCurrency(totals.total);
    
    // Validate form
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
    
    // Add event listeners to charge inputs
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
    
    // Add event listeners to remove buttons
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
        
        // Configure metadata
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
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, pdfBlob, metadata);
        console.log('Upload completed:', snapshot);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('PDF URL:', downloadURL);
        
        return downloadURL;
        
    } catch (error) {
        console.error('Detailed upload error:', {
            code: error.code,
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // If CORS error, save locally but continue
        if (error.code === 'storage/unauthorized' || error.message.includes('CORS')) {
            console.warn('Storage error, but sale will continue with local PDF');
            
            // Generate local URL
            const localUrl = URL.createObjectURL(pdfBlob);
            
            // Save reference in localStorage to upload later
            const pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
            
            // Convert blob to base64 to save
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(pdfBlob);
            });
            
            const base64data = await base64Promise;
            
            pendingUploads.push({
                saleId: saleId,
                saleNumber: saleNumber,
                pdfData: base64data,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('pendingUploads', JSON.stringify(pendingUploads));
            
            return localUrl;
        }
        
        throw error;
    }
}

// Remove serial numbers from products
async function removeSerialNumbersFromProducts() {
    try {
        // Group by product to update each product once
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
            
            // Filter out the sold serial numbers from this product
            const remainingUnidades = product.unidades.filter(unidad => {
                const unidadSerial = (unidad.serie || unidad.numeroSerie || unidad.serialNumber || '').toString().trim();
                return !unidadesToRemove.some(removeUnidad => {
                    const removeSerial = (removeUnidad.serie || removeUnidad.numeroSerie || removeUnidad.serialNumber || '').toString().trim();
                    return removeSerial === unidadSerial;
                });
            });
            
            // Update product in Firebase
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
        // Disable button to prevent double submission
        completeSaleBtn.disabled = true;
        completeSaleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        
        // Get customer data
        const customerData = {
            name: customerName.value.trim(),
            address: customerAddress.value.trim(),
            phone: customerPhone.value.trim(),
            email: customerEmail.value.trim()
        };
        
        // Get seller data
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        // Calculate totals
        const totals = calculateTotals();
        
        // Prepare products for PDF
        const pdfProducts = [];
        products.forEach(item => {
            pdfProducts.push({
                serialNumber: item.serial,
                model: item.product.Model || 'N/A',
                sku: item.product.SKU || 'N/A',
                price: item.product.nuestroPrecio || 0
            });
        });
        
        // Prepare additional charges for PDF (filter out empty ones)
        const validCharges = additionalCharges.filter(charge => 
            charge.description.trim() !== '' && charge.amount > 0
        );
        
        // Show progress indicator
        Swal.fire({
            title: 'Processing Sale',
            html: 'Please wait while we process your sale...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Create sale in Firebase
        const saleData = {
            saleNumber: saleNumber,
            terms: applyCustomTerms.checked ? termsText.value : DEFAULT_TERMS,
            // Now we save objects with serial and product ID
            soldItems: products.map(item => ({
                serialNumber: item.serial,
                productId: item.product.id,
                model: item.product.Model,
                sku: item.product.SKU,
                price: item.product.nuestroPrecio
            })),
            // Keep simple serialNumbers for compatibility
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
            taxRate: totals.taxRate // Send the used tax rate
        };
        
        const saleResult = await salesManager.createSale(saleData);
        const saleId = saleResult.id;
        
        // Update Swal message
        Swal.update({
            html: 'Generating PDF...'
        });
        
        // Generate PDF
        console.log('Generating PDF with products:', pdfProducts);
        // Generate PDF
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
            terms: applyCustomTerms.checked ? termsText.value : DEFAULT_TERMS // Add this line
        }, pdfProducts);
        
        console.log('PDF generated, blob size:', pdfBlob.size);
        
        // Update Swal message
        Swal.update({
            html: 'Uploading PDF to cloud...'
        });
        
        // Upload PDF to Storage
        const pdfURL = await uploadPDF(pdfBlob, saleId);
        
        // Update sale with PDF URL
        await salesManager.updateSalePDF(saleId, pdfURL);
        
        // Update Swal message
        Swal.update({
            html: 'Updating inventory...'
        });
        
        // Remove sold serial numbers from products
        await removeSerialNumbersFromProducts();
        
        // Close loading Swal
        Swal.close();
        
        // Create local URL for preview
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Function to download PDF
        window.downloadPDF = function(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        
        // Show success with PDF preview
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
                            <button onclick="window.open('${pdfUrl}', '_blank')" 
                                    style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 8px;">
                                <i class="fas fa-eye"></i> View PDF
                            </button>
                            
                            <button onclick="window.downloadPDF('${pdfUrl}', '${saleNumber}')" 
                                    style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 8px;">
                                <i class="fas fa-download"></i> Download PDF
                            </button>
                        </div>
                        
                        ${pdfURL && pdfURL.startsWith('blob:') ? 
                            '<p style="margin-top: 15px; font-size: 0.85rem; color: #856404; background: #fff3cd; padding: 8px; border-radius: 4px;"><i class="fas fa-info-circle"></i> PDF saved locally. Cloud sync pending.</p>' : 
                            '<p style="margin-top: 15px; font-size: 0.85rem; color: #155724; background: #d4edda; padding: 8px; border-radius: 4px;"><i class="fas fa-cloud-upload-alt"></i> PDF saved to cloud</p>'
                        }
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
                window.location.href = '../sales/sales.html';
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
        
        // Re-enable button
        completeSaleBtn.disabled = false;
        completeSaleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Sale';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Close Sale...');
    // Event listeners for Terms
    if (applyCustomTerms) {
        applyCustomTerms.addEventListener('change', toggleTermsEditor);
    }

    if (termsText) {
        termsText.addEventListener('input', updateTermsPreview);
    }

    if (resetTermsBtn) {
        resetTermsBtn.addEventListener('click', resetTerms);
    }

    // Initialize terms
    if (termsText) {
        termsText.value = DEFAULT_TERMS;
        updateTermsPreview();
    }
    // Load data from URL
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
    
    // Load seller info
    loadSellerInfo();
    
    // Start date/time updates
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load products
    loadProducts();
    
    // Event listeners for Tax
    taxRateInput.addEventListener('input', updateSummary);
    applyTaxCheckbox.addEventListener('change', updateSummary);
    
    // Event listeners
    customerName.addEventListener('input', validateForm);
    
    addChargeBtn.addEventListener('click', addNewCharge);
    
    completeSaleBtn.addEventListener('click', completeSale);
    
    backBtn.addEventListener('click', () => {
        window.location.href = '../posAdmin/posAdmin.html';
    });
});

// Export functions that might be needed globally
window.completeSale = completeSale;