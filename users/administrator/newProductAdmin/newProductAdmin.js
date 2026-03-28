// viewProductAdmin.js - Create new product with units
import { ProductManager } from '/classes/product.js';

const Swal = window.Swal;
const productManager = new ProductManager();

// State management
let currentImagesBase64 = [];
const MAX_IMAGES = 3;
let unitsList = []; // Array to store serial numbers

document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
});

async function initializeForm() {
    try {
        showLoading(true);
        
        // Load brands, categories and providers
        await productManager.loadBrandsAndCategoriesAndProviders();
        
        // Load existing products to check SKU duplicates
        await productManager.loadProducts();
        
        // Populate dropdowns
        populateDropdowns();
        
        // Set up model input to generate SKU automatically
        setupAutoSKUGeneration();
        
        showLoading(false);
    } catch (error) {
        console.error('Error initializing form:', error);
        showError('Error loading form data: ' + error.message);
        showLoading(false);
    }
}

function populateDropdowns() {
    // Populate brands
    const brandSelect = document.getElementById('Brand');
    productManager.brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.id;
        option.textContent = brand.nombre;
        brandSelect.appendChild(option);
    });
    
    // Populate categories
    const categorySelect = document.getElementById('Category');
    productManager.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        categorySelect.appendChild(option);
    });
    
    // Populate providers
    const providerSelect = document.getElementById('Provider');
    productManager.providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = `${provider.nombre} (${provider.idInterno || 'No ID'})`;
        providerSelect.appendChild(option);
    });
}

function setupAutoSKUGeneration() {
    const modelInput = document.getElementById('Model');
    const skuInput = document.getElementById('SKU');
    
    if (!modelInput || !skuInput) return;
    
    // Generate SKU based on model
    function generateSKUFromModel(model) {
        if (!model || model.trim() === '') return '';
        
        // Clean the model: remove special characters, trim spaces, convert to uppercase
        let cleanModel = model.trim().toUpperCase();
        
        // Replace spaces with hyphens
        cleanModel = cleanModel.replace(/\s+/g, '-');
        
        // Remove any characters that might cause issues
        cleanModel = cleanModel.replace(/[^A-Z0-9\-]/g, '');
        
        // Add -1 suffix
        const baseSKU = `${cleanModel}-1`;
        
        // Check if SKU already exists and generate unique version if needed
        return generateUniqueSKU(baseSKU);
    }
    
    // Generate unique SKU by checking existing products
    function generateUniqueSKU(baseSKU) {
        let uniqueSKU = baseSKU;
        let counter = 1;
        
        // Check if SKU exists in loaded products
        while (productManager.products.some(p => p.SKU === uniqueSKU)) {
            counter++;
            uniqueSKU = `${baseSKU.split('-')[0]}-${counter}`;
        }
        
        return uniqueSKU;
    }
    
    // Auto-generate SKU when model changes (with debounce)
    let debounceTimeout;
    modelInput.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const model = modelInput.value;
            if (model && model.trim() !== '') {
                const generatedSKU = generateSKUFromModel(model);
                skuInput.value = generatedSKU;
                skuInput.dispatchEvent(new Event('change'));
            } else {
                skuInput.value = '';
            }
        }, 300);
    });
    
    // Also generate when model loses focus (instant)
    modelInput.addEventListener('blur', function() {
        const model = modelInput.value;
        if (model && model.trim() !== '') {
            const generatedSKU = generateSKUFromModel(model);
            skuInput.value = generatedSKU;
            skuInput.dispatchEvent(new Event('change'));
        }
    });
    
    // Allow manual editing of SKU, but validate
    skuInput.addEventListener('blur', function() {
        const sku = skuInput.value.trim();
        if (sku && sku !== '') {
            // Check if SKU is valid
            if (!/^[A-Z0-9\-]+$/i.test(sku)) {
                showWarning('SKU should contain only letters, numbers, and hyphens');
                return;
            }
            
            // Check if SKU already exists
            const existingProduct = productManager.products.find(p => p.SKU === sku);
            if (existingProduct) {
                showWarning(`SKU "${sku}" already exists for product "${existingProduct.Model}". Please use a different SKU.`);
                skuInput.classList.add('is-invalid');
            } else {
                skuInput.classList.remove('is-invalid');
            }
        }
    });
    
    // Add visual feedback for SKU field
    const style = document.createElement('style');
    style.textContent = `
        .is-invalid {
            border-color: #dc3545 !important;
            background-color: rgba(220, 53, 69, 0.05) !important;
        }
        .sku-auto-generated {
            background-color: rgba(245, 215, 66, 0.1);
            border-color: var(--accent);
        }
    `;
    document.head.appendChild(style);
    
    // Add indicator that SKU is auto-generated
    const skuGroup = skuInput.closest('.form-group');
    if (skuGroup && !skuGroup.querySelector('.sku-hint')) {
        const hint = document.createElement('small');
        hint.className = 'form-hint sku-hint';
        hint.innerHTML = '<i class="fas fa-magic"></i> SKU is automatically generated from the model. You can edit it manually if needed.';
        skuGroup.appendChild(hint);
    }
}

function setupEventListeners() {
    // Form submission
    document.getElementById('productForm')?.addEventListener('submit', handleFormSubmit);
    
    // Image upload
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');
    
    imageUploadArea?.addEventListener('click', () => {
        imageInput.click();
    });
    
    imageUploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#f5d742';
        imageUploadArea.style.backgroundColor = 'rgba(245, 215, 66, 0.1)';
    });
    
    imageUploadArea?.addEventListener('dragleave', () => {
        imageUploadArea.style.borderColor = '#e9ecef';
        imageUploadArea.style.backgroundColor = 'transparent';
    });
    
    imageUploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#e9ecef';
        imageUploadArea.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files.length > 0) {
            handleImageUpload(e.dataTransfer.files);
        }
    });
    
    imageInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files);
        }
    });
    
    // Units management
    document.getElementById('addUnitsBtn')?.addEventListener('click', addUnitsFromTextarea);
    document.getElementById('clearAllUnitsBtn')?.addEventListener('click', clearAllUnits);
    
    // Optional: Auto-clear textarea after adding
    const serialInput = document.getElementById('serialNumbersInput');
    serialInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            addUnitsFromTextarea();
        }
    });
}

// Units Management Functions
function addUnitsFromTextarea() {
    const textarea = document.getElementById('serialNumbersInput');
    const rawText = textarea.value.trim();
    
    if (!rawText) {
        showWarning('Please enter at least one serial number');
        return;
    }
    
    // Split by new lines and filter empty lines
    const newSerials = rawText
        .split('\n')
        .map(line => line.trim())
        .filter(serial => serial.length > 0);
    
    if (newSerials.length === 0) {
        showWarning('No valid serial numbers found');
        return;
    }
    
    // Check for duplicates within the new list
    const uniqueNewSerials = [...new Set(newSerials)];
    if (uniqueNewSerials.length !== newSerials.length) {
        showWarning('Duplicate serial numbers in the list were removed');
    }
    
    // Check for duplicates with existing units
    const existingSerials = new Set(unitsList);
    const duplicates = uniqueNewSerials.filter(serial => existingSerials.has(serial));
    
    if (duplicates.length > 0) {
        showWarning(`${duplicates.length} duplicate serial number(s) were skipped`);
    }
    
    // Add only non-duplicate serials
    const serialsToAdd = uniqueNewSerials.filter(serial => !existingSerials.has(serial));
    
    if (serialsToAdd.length === 0) {
        showWarning('All serial numbers already exist in the list');
        textarea.value = '';
        return;
    }
    
    // Add to units list
    unitsList = [...unitsList, ...serialsToAdd];
    
    // Update UI
    updateUnitsList();
    
    // Clear textarea
    textarea.value = '';
    
    // Show success message
    showSuccess(`${serialsToAdd.length} unit(s) added successfully`);
}

function removeUnit(serialToRemove) {
    unitsList = unitsList.filter(serial => serial !== serialToRemove);
    updateUnitsList();
}

function clearAllUnits() {
    if (unitsList.length === 0) return;
    
    Swal.fire({
        title: 'Clear all units?',
        text: `Are you sure you want to remove all ${unitsList.length} units from the list?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, clear all',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            unitsList = [];
            updateUnitsList();
            showSuccess('All units removed');
        }
    });
}

function updateUnitsList() {
    const container = document.getElementById('unitsListContainer');
    const totalCountSpan = document.getElementById('totalUnitsCount');
    const unitsCountSpan = document.getElementById('unitsCount');
    const clearAllBtn = document.getElementById('clearAllUnitsBtn');
    
    // Update counts
    totalCountSpan.textContent = unitsList.length;
    unitsCountSpan.textContent = `${unitsList.length} unit${unitsList.length !== 1 ? 's' : ''}`;
    
    // Show/hide clear all button
    if (clearAllBtn) {
        clearAllBtn.style.display = unitsList.length > 0 ? 'flex' : 'none';
    }
    
    if (unitsList.length === 0) {
        container.innerHTML = `
            <div class="empty-units">
                <i class="fas fa-cube"></i>
                <p>No units added yet. Add serial numbers above.</p>
            </div>
        `;
        return;
    }
    
    // Create units list HTML
    let unitsHTML = '<div class="units-grid">';
    
    unitsList.forEach((serial, index) => {
        unitsHTML += `
            <div class="unit-item">
                <div class="unit-info">
                    <span class="unit-number">#${index + 1}</span>
                    <span class="unit-serial">${escapeHtml(serial)}</span>
                </div>
                <button type="button" class="btn-remove-unit" data-serial="${escapeHtml(serial)}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    unitsHTML += '</div>';
    container.innerHTML = unitsHTML;
    
    // Add event listeners to remove buttons
    container.querySelectorAll('.btn-remove-unit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const serial = btn.getAttribute('data-serial');
            removeUnit(serial);
        });
    });
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Image Management Functions
async function handleImageUpload(files) {
    const filesArray = Array.from(files).slice(0, MAX_IMAGES - currentImagesBase64.length);
    
    if (filesArray.length === 0) {
        if (currentImagesBase64.length >= MAX_IMAGES) {
            showWarning(`Maximum ${MAX_IMAGES} images allowed`);
        }
        return;
    }
    
    for (const file of filesArray) {
        if (currentImagesBase64.length >= MAX_IMAGES) {
            showWarning(`Maximum ${MAX_IMAGES} images allowed`);
            break;
        }
        
        // Validate image
        if (!file.type.startsWith('image/')) {
            showWarning('Please select only image files');
            continue;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            showWarning('Image is too large. Maximum 2MB per image');
            continue;
        }
        
        try {
            const base64 = await convertImageToBase64(file);
            currentImagesBase64.push(base64);
            updateImagePreview();
        } catch (error) {
            console.error('Error processing image:', error);
            showError('Error processing image: ' + error.message);
        }
    }
    
    // Reset input
    document.getElementById('imageInput').value = '';
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert image to base64 string'));
            }
        };
        
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const imagesCountSpan = document.getElementById('imagesCount');
    
    container.innerHTML = '';
    
    if (currentImagesBase64.length > 0) {
        currentImagesBase64.forEach((base64, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
                <img src="${base64}" alt="Preview ${index + 1}">
                <button type="button" class="remove-image" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(previewItem);
        });
    }
    
    // Update counter
    imagesCountSpan.textContent = `${currentImagesBase64.length}/${MAX_IMAGES}`;
    
    // Add event to remove buttons
    container.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            currentImagesBase64.splice(index, 1);
            updateImagePreview();
        });
    });
}

// Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const Model = document.getElementById('Model').value.trim();
    const SKU = document.getElementById('SKU').value.trim();
    const idInterno = document.getElementById('idInterno').value.trim();
    const Brand = document.getElementById('Brand').value;
    const Category = document.getElementById('Category').value;
    const Provider = document.getElementById('Provider').value;
    const Subcategory = document.getElementById('Subcategory').value.trim();
    const ItemDescription = document.getElementById('ItemDescription').value.trim();
    const especificaciones = document.getElementById('especificaciones').value.trim();
    const UnitWeight = parseFloat(document.getElementById('UnitWeight').value) || 0;
    const Location = document.getElementById('Location').value.trim();
    const precioCompetencia = parseFloat(document.getElementById('precioCompetencia').value) || 0;
    const nuestroPrecio = parseFloat(document.getElementById('nuestroPrecio').value) || 0;
    
    // Validations
    if (!Model) {
        showWarning('Please enter a product model');
        document.getElementById('Model').focus();
        return;
    }
    
    if (!SKU) {
        showWarning('Please enter a SKU');
        document.getElementById('SKU').focus();
        return;
    }
    
    // Validate SKU format
    if (!/^[A-Z0-9\-]+$/i.test(SKU)) {
        showWarning('SKU should contain only letters, numbers, and hyphens');
        document.getElementById('SKU').focus();
        return;
    }
    
    // Check if SKU already exists
    const existingProduct = productManager.products.find(p => p.SKU === SKU);
    if (existingProduct) {
        showWarning(`SKU "${SKU}" already exists for product "${existingProduct.Model}". Please use a different SKU.`);
        document.getElementById('SKU').focus();
        document.getElementById('SKU').classList.add('is-invalid');
        return;
    } else {
        document.getElementById('SKU').classList.remove('is-invalid');
    }
    
    if (!Brand) {
        showWarning('Please select a brand');
        document.getElementById('Brand').focus();
        return;
    }
    
    if (!Category) {
        showWarning('Please select a category');
        document.getElementById('Category').focus();
        return;
    }
    
    if (!Provider) {
        showWarning('Please select a provider');
        document.getElementById('Provider').focus();
        return;
    }
    
    if (nuestroPrecio < 0) {
        showWarning('Our price cannot be negative');
        document.getElementById('nuestroPrecio').focus();
        return;
    }
    
    // Check if we have at least one unit
    if (unitsList.length === 0) {
        const confirmResult = await Swal.fire({
            title: 'No units added',
            text: 'You haven\'t added any serial numbers. Do you want to continue without units?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, continue',
            cancelButtonText: 'Add units'
        });
        
        if (!confirmResult.isConfirmed) {
            document.getElementById('serialNumbersInput').focus();
            return;
        }
    }
    
    // Prepare product data
    const productData = {
        Model: Model,
        SKU: SKU,
        idInterno: idInterno || null,
        Brand: Brand,
        Category: Category,
        Provider: Provider,
        Subcategory: Subcategory || null,
        ItemDescription: ItemDescription || null,
        especificaciones: especificaciones || null,
        UnitWeight: UnitWeight,
        Location: Location || null,
        precioCompetencia: precioCompetencia,
        nuestroPrecio: nuestroPrecio,
        images: currentImagesBase64,
        unidades: [] // Will be populated with units
    };
    
    // Create unit objects with initial history
    if (unitsList.length > 0) {
        const currentUser = localStorage.getItem('userEmail') || 'system';
        const now = new Date();
        
        productData.unidades = unitsList.map(serialNumber => ({
            numeroSerie: serialNumber,
            historial: [{
                movimiento: 1,
                fechaMovimiento: now.toISOString(),
                descripcionMovimiento: 'Initial inventory entry',
                tipoMovimiento: 'Ingreso Inicial',
                idUsuario: currentUser
            }]
        }));
    }
    
    // Show loading
    Swal.fire({
        title: 'Creating product...',
        text: 'Please wait',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        console.log('Creating product with data:', {
            Model: productData.Model,
            SKU: productData.SKU,
            unitsCount: productData.unidades.length,
            imagesCount: productData.images.length
        });
        
        const result = await productManager.addProduct(productData);
        
        console.log('Product created successfully:', result.id);
        
        // Show success message with option to add another or view products
        const { isConfirmed } = await Swal.fire({
            icon: 'success',
            title: 'Success!',
            html: `Product <strong>${escapeHtml(Model)}</strong> created successfully with ${unitsList.length} unit(s)<br>
                   <small>SKU: ${escapeHtml(SKU)}</small>`,
            showCancelButton: true,
            confirmButtonText: 'Create Another',
            cancelButtonText: 'View Products',
            reverseButtons: true
        });
        
        if (isConfirmed) {
            // Reset form for another product
            resetForm();
        } else {
            // Redirect to products list
            window.location.href = '../productAdmin/productAdmin.html';
        }
        
    } catch (error) {
        console.error('Error creating product:', error);
        showError('Error creating product: ' + error.message);
    } finally {
        Swal.close();
    }
}

function resetForm() {
    // Reset form fields
    document.getElementById('productForm').reset();
    
    // Reset state
    currentImagesBase64 = [];
    unitsList = [];
    
    // Update UI
    updateImagePreview();
    updateUnitsList();
    
    // Reset counts
    document.getElementById('imagesCount').textContent = `0/${MAX_IMAGES}`;
    
    // Remove invalid class from SKU
    document.getElementById('SKU').classList.remove('is-invalid');
    
    // Focus first field
    document.getElementById('Model').focus();
    
    showSuccess('Form reset. You can add another product.');
}

// UI Utilities
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

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