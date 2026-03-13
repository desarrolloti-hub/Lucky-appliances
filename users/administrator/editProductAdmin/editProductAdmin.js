// editProductAdmin.js - Edit product with units management
import { ProductManager } from '/classes/product.js';

const Swal = window.Swal;
const productManager = new ProductManager();

// State management
let currentImagesBase64 = [];
const MAX_IMAGES = 3;
let newUnitsList = [];
let existingUnits = [];
let currentProduct = null;
let currentProductId = null;

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

console.log('=== EDIT PRODUCT INIT ===');
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
        
        // PASO 3: Ahora buscar el producto por ID en this.products
        console.log('Searching for product with document ID:', currentProductId);
        currentProduct = productManager.getProductById(currentProductId);
        
        console.log('getProductById result:', currentProduct ? 'Found' : 'Not found');
        
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
        
        // PASO 4: Poblar los dropdowns
        console.log('Populating dropdowns...');
        populateDropdowns();
        
        // PASO 5: Llenar el formulario
        console.log('Filling form data...');
        fillFormData();
        
        // PASO 6: Cargar unidades existentes
        existingUnits = currentProduct.unidades || [];
        console.log('Existing units:', existingUnits.length);
        
        // PASO 7: Cargar imágenes
        currentImagesBase64 = currentProduct.images ? [...currentProduct.images] : [];
        console.log('Images loaded:', currentImagesBase64.length);
        
        // PASO 8: Actualizar UI de unidades
        updateExistingUnitsList();
        updateNewUnitsList();
        updateImagePreview();
        
        // PASO 9: Mostrar el formulario
        document.getElementById('formWrapper').style.display = 'block';
        console.log('Form displayed');
        
        // PASO 10: Configurar event listeners
        setupEventListeners();
        console.log('Event listeners configured');
        
    } catch (error) {
        console.error('ERROR loading product:', error);
        console.error('Error stack:', error.stack);
        showNotFound('Error loading product: ' + error.message);
    } finally {
        showLoading(false);
        console.log('Loading complete');
    }
});

function populateDropdowns() {
    const brandSelect = document.getElementById('Brand');
    const categorySelect = document.getElementById('Category');
    const providerSelect = document.getElementById('Provider');
    
    if (!brandSelect || !categorySelect || !providerSelect) {
        console.error('Dropdown elements not found');
        return;
    }
    
    // Limpiar opciones existentes excepto la primera
    while (brandSelect.options.length > 1) brandSelect.remove(1);
    while (categorySelect.options.length > 1) categorySelect.remove(1);
    while (providerSelect.options.length > 1) providerSelect.remove(1);
    
    // Agregar marcas
    productManager.brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.id;
        option.textContent = brand.nombre;
        brandSelect.appendChild(option);
    });
    
    // Agregar categorías
    productManager.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        categorySelect.appendChild(option);
    });
    
    // Agregar proveedores
    productManager.providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = `${provider.nombre} (${provider.idInterno || 'No ID'})`;
        providerSelect.appendChild(option);
    });
    
    console.log('Dropdowns populated');
}

function fillFormData() {
    // Set the document ID in the hidden field
    const itemIdField = document.getElementById('itemId');
    if (itemIdField) {
        itemIdField.value = currentProductId;
        console.log('Setting itemId to document ID:', currentProductId);
    }
    
    const fields = {
        'Model': currentProduct.Model || '',
        'SKU': currentProduct.SKU || '',
        'idInterno': currentProduct.idInterno || '',
        'Brand': currentProduct.Brand || '',
        'Category': currentProduct.Category || '',
        'Provider': currentProduct.Provider || '',
        'Subcategory': currentProduct.Subcategory || '',
        'ItemDescription': currentProduct.ItemDescription || '',
        'especificaciones': currentProduct.especificaciones || '',
        'precioCompetencia': currentProduct.precioCompetencia || 0,
        'nuestroPrecio': currentProduct.nuestroPrecio || 0,
        'UnitWeight': currentProduct.UnitWeight || 0,
        'Location': currentProduct.Location || ''
    };
    
    // Verificar que todos los elementos existan antes de asignar
    for (const [id, value] of Object.entries(fields)) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
            console.log(`Field ${id} set to:`, value);
        } else {
            console.warn(`Element with id ${id} not found`);
        }
    }
    
    fillAuditData();
}

function fillAuditData() {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleString();
        }
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleString();
        }
        return new Date(timestamp).toLocaleString();
    };
    
    const auditFields = {
        'createdDate': formatDate(currentProduct.fechaCreacion),
        'createdBy': currentProduct.usuarioCreacion || 'N/A',
        'updatedDate': formatDate(currentProduct.fechaActualizacion) || 'N/A',
        'updatedBy': currentProduct.usuarioActualizacion || 'N/A',
        'entryDate': formatDate(currentProduct.fechaIngreso) || 'N/A',
        'entryUser': currentProduct.usuarioIngreso || 'N/A'
    };
    
    for (const [id, value] of Object.entries(auditFields)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

function setupEventListeners() {
    // Form submission
    document.getElementById('productForm')?.addEventListener('submit', handleFormSubmit);
    
    // Image upload
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');
    
    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => imageInput.click());
        
        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = '#f5d742';
            imageUploadArea.style.backgroundColor = 'rgba(245, 215, 66, 0.1)';
        });
        
        imageUploadArea.addEventListener('dragleave', () => {
            imageUploadArea.style.borderColor = '#e9ecef';
            imageUploadArea.style.backgroundColor = 'transparent';
        });
        
        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = '#e9ecef';
            imageUploadArea.style.backgroundColor = 'transparent';
            if (e.dataTransfer.files.length > 0) {
                handleImageUpload(e.dataTransfer.files);
            }
        });
    }
    
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageUpload(e.target.files);
            }
        });
    }
    
    // Units management
    document.getElementById('addUnitsBtn')?.addEventListener('click', addUnitsFromTextarea);
    document.getElementById('clearAllUnitsBtn')?.addEventListener('click', clearAllNewUnits);
    
    const serialInput = document.getElementById('serialNumbersInput');
    if (serialInput) {
        serialInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                addUnitsFromTextarea();
            }
        });
    }
}

function addUnitsFromTextarea() {
    const textarea = document.getElementById('serialNumbersInput');
    if (!textarea) return;
    
    const rawText = textarea.value.trim();
    if (!rawText) {
        showWarning('Please enter at least one serial number');
        return;
    }
    
    const newSerials = rawText
        .split('\n')
        .map(line => line.trim())
        .filter(serial => serial.length > 0);
    
    if (newSerials.length === 0) {
        showWarning('No valid serial numbers found');
        return;
    }
    
    const uniqueNewSerials = [...new Set(newSerials)];
    const existingSerials = new Set(existingUnits.map(u => u.numeroSerie));
    const serialsToAdd = uniqueNewSerials.filter(serial => !existingSerials.has(serial) && !newUnitsList.includes(serial));
    
    if (serialsToAdd.length === 0) {
        showWarning('All serial numbers already exist');
        textarea.value = '';
        return;
    }
    
    newUnitsList = [...newUnitsList, ...serialsToAdd];
    updateNewUnitsList();
    textarea.value = '';
    showSuccess(`${serialsToAdd.length} new unit(s) added`);
}

function removeNewUnit(serialToRemove) {
    newUnitsList = newUnitsList.filter(serial => serial !== serialToRemove);
    updateNewUnitsList();
}

function clearAllNewUnits() {
    if (newUnitsList.length === 0) return;
    
    Swal.fire({
        title: 'Clear new units?',
        text: `Remove all ${newUnitsList.length} new units?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, clear all'
    }).then((result) => {
        if (result.isConfirmed) {
            newUnitsList = [];
            updateNewUnitsList();
        }
    });
}

function updateExistingUnitsList() {
    const container = document.getElementById('existingUnitsContainer');
    if (!container) return;
    
    if (existingUnits.length === 0) {
        container.innerHTML = '<div class="empty-existing"><i class="fas fa-cube"></i><p>No units registered yet</p></div>';
        return;
    }
    
    let html = '<div class="existing-units-grid">';
    existingUnits.forEach((unit, index) => {
        const firstMovement = unit.historial?.[0]?.fechaMovimiento 
            ? new Date(unit.historial[0].fechaMovimiento).toLocaleDateString() 
            : 'N/A';
        
        html += `
            <div class="existing-unit-item">
                <div class="existing-unit-header">
                    <span class="unit-index">#${index + 1}</span>
                    <span class="unit-serial">${escapeHtml(unit.numeroSerie)}</span>
                </div>
                <div class="existing-unit-details">
                    <div class="detail-item"><i class="fas fa-calendar-alt"></i> First: ${firstMovement}</div>
                    <div class="detail-item"><i class="fas fa-history"></i> ${unit.historial?.length || 0} movements</div>
                </div>
                <button type="button" class="btn-view-history" data-serial="${escapeHtml(unit.numeroSerie)}">
                    <i class="fas fa-eye"></i> View History
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    container.querySelectorAll('.btn-view-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            viewUnitHistory(btn.getAttribute('data-serial'));
        });
    });
}

function updateNewUnitsList() {
    const container = document.getElementById('newUnitsListContainer');
    const emptyDiv = document.getElementById('emptyNewUnits');
    const totalCountSpan = document.getElementById('totalUnitsCount');
    const unitsCountSpan = document.getElementById('unitsCount');
    const clearAllBtn = document.getElementById('clearAllUnitsBtn');
    
    const totalUnits = existingUnits.length + newUnitsList.length;
    if (totalCountSpan) totalCountSpan.textContent = totalUnits;
    if (unitsCountSpan) unitsCountSpan.textContent = `${totalUnits} unit${totalUnits !== 1 ? 's' : ''}`;
    
    if (clearAllBtn) {
        clearAllBtn.style.display = newUnitsList.length > 0 ? 'flex' : 'none';
    }
    
    if (newUnitsList.length === 0) {
        if (emptyDiv) emptyDiv.style.display = 'flex';
        if (container) container.innerHTML = '';
        return;
    }
    
    if (emptyDiv) emptyDiv.style.display = 'none';
    
    let html = '<div class="units-grid">';
    newUnitsList.forEach((serial) => {
        html += `
            <div class="unit-item new-unit">
                <div class="unit-info">
                    <span class="unit-number new">NEW</span>
                    <span class="unit-serial">${escapeHtml(serial)}</span>
                </div>
                <button type="button" class="btn-remove-unit" data-serial="${escapeHtml(serial)}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    container.querySelectorAll('.btn-remove-unit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            removeNewUnit(btn.getAttribute('data-serial'));
        });
    });
}

async function viewUnitHistory(serialNumber) {
    const unidad = existingUnits.find(u => u.numeroSerie === serialNumber);
    if (!unidad) return;
    
    let historialHTML = '';
    if (unidad.historial?.length > 0) {
        historialHTML = unidad.historial.map(mov => `
            <tr>
                <td>${mov.movimiento}</td>
                <td>${mov.fechaMovimiento ? new Date(mov.fechaMovimiento).toLocaleString() : 'N/A'}</td>
                <td>${mov.descripcionMovimiento || 'N/A'}</td>
                <td>${mov.tipoMovimiento || 'N/A'}</td>
                <td>${mov.idUsuario || 'N/A'}</td>
            </tr>
        `).join('');
    } else {
        historialHTML = '<tr><td colspan="5" style="text-align: center;">No movement history</td></tr>';
    }
    
    Swal.fire({
        title: `Unit History - ${serialNumber}`,
        html: `
            <div style="text-align: left;">
                <p><strong>Product:</strong> ${currentProduct.Model}</p>
                <p><strong>SKU:</strong> ${currentProduct.SKU || 'N/A'}</p>
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="history-table">
                        <thead><tr><th>Movement</th><th>Date</th><th>Description</th><th>Type</th><th>User</th></tr></thead>
                        <tbody>${historialHTML}</tbody>
                    </table>
                </div>
            </div>
        `,
        width: '900px'
    });
}

async function handleImageUpload(files) {
    const filesArray = Array.from(files).slice(0, MAX_IMAGES - currentImagesBase64.length);
    
    for (const file of filesArray) {
        if (!file.type.startsWith('image/')) {
            showWarning('Please select only image files');
            continue;
        }
        if (file.size > 2 * 1024 * 1024) {
            showWarning('Image too large. Max 2MB');
            continue;
        }
        
        try {
            const base64 = await convertImageToBase64(file);
            currentImagesBase64.push(base64);
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }
    
    updateImagePreview();
    document.getElementById('imageInput').value = '';
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const imagesCountSpan = document.getElementById('imagesCount');
    
    if (!container) return;
    
    container.innerHTML = '';
    currentImagesBase64.forEach((base64, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
            <img src="${base64}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" data-index="${index}"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(previewItem);
    });
    
    if (imagesCountSpan) {
        imagesCountSpan.textContent = `${currentImagesBase64.length}/${MAX_IMAGES}`;
    }
    
    container.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            currentImagesBase64.splice(index, 1);
            updateImagePreview();
        });
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const productData = {
        Model: document.getElementById('Model').value.trim(),
        SKU: document.getElementById('SKU').value.trim(),
        idInterno: document.getElementById('idInterno').value.trim() || null,
        Brand: document.getElementById('Brand').value,
        Category: document.getElementById('Category').value,
        Provider: document.getElementById('Provider').value,
        Subcategory: document.getElementById('Subcategory').value.trim() || null,
        ItemDescription: document.getElementById('ItemDescription').value.trim() || null,
        especificaciones: document.getElementById('especificaciones').value.trim() || null,
        UnitWeight: parseFloat(document.getElementById('UnitWeight').value) || 0,
        Location: document.getElementById('Location').value.trim() || null,
        precioCompetencia: parseFloat(document.getElementById('precioCompetencia').value) || 0,
        nuestroPrecio: parseFloat(document.getElementById('nuestroPrecio').value) || 0,
        images: currentImagesBase64,
        unidades: [...existingUnits]
    };
    
    if (!productData.Model || !productData.SKU || !productData.Brand || !productData.Category || !productData.Provider) {
        showWarning('Please fill in all required fields');
        return;
    }
    
    if (newUnitsList.length > 0) {
        const currentUser = localStorage.getItem('userEmail') || 'system';
        const now = new Date();
        
        const newUnits = newUnitsList.map(serialNumber => ({
            numeroSerie: serialNumber,
            historial: [{
                movimiento: 1,
                fechaMovimiento: now.toISOString(),
                descripcionMovimiento: 'Added during product edit',
                tipoMovimiento: 'Adición Manual',
                idUsuario: currentUser
            }]
        }));
        
        productData.unidades = [...productData.unidades, ...newUnits];
    }
    
    Swal.fire({
        title: 'Updating product...',
        text: 'Please wait',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        console.log('Updating product with document ID:', currentProductId);
        console.log('Product data:', {
            ...productData,
            imagesCount: productData.images.length,
            unidadesCount: productData.unidades.length
        });
        
        await productManager.updateProduct(currentProductId, productData);
        
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Product updated with ${productData.unidades.length} total unit(s)`,
            timer: 2000,
            showConfirmButton: false
        });
        
        setTimeout(() => {
            window.location.href = '../productAdmin/productAdmin.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error updating product:', error);
        showError('Error updating product: ' + error.message);
        Swal.close();
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

function showNotFound(message) {
    showLoading(false);
    const notFound = document.getElementById('notFound');
    const formWrapper = document.getElementById('formWrapper');
    
    if (notFound) {
        notFound.style.display = 'flex';
        const p = notFound.querySelector('p');
        if (p) p.textContent = message || 'Product not found';
    }
    
    if (formWrapper) {
        formWrapper.style.display = 'none';
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function showSuccess(message) {
    Swal.fire({ icon: 'success', title: 'Success!', text: message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
}

function showError(message) {
    Swal.fire({ icon: 'error', title: 'Error', text: message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
}

function showWarning(message) {
    Swal.fire({ icon: 'warning', title: 'Warning', text: message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
}