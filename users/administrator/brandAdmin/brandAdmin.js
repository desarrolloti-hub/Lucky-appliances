// brand-admin.js - CRUD for brand management with SweetAlert
import { BrandManager } from '/classes/brand.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Create global instance
const brandManager = new BrandManager();

// Variables para manejo de imágenes
let currentImageBase64 = '';

document.addEventListener('DOMContentLoaded', function() {
    // Load brands
    loadBrands();
    
    // Configure events
    setupEventListeners();
});

async function loadBrands() {
    try {
        showLoading(true);
        const brands = await brandManager.loadBrands();
        const container = document.getElementById('brandContainer');
        
        console.log('Loaded brands:', brands.length);
        
        if (brands.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>No brands added yet</p>
                    <button id="addFirstBtn" class="btn-primary">
                        <i class="fas fa-plus"></i> Add first brand
                    </button>
                </div>
            `;
            
            // Add event to empty state button
            document.getElementById('addFirstBtn')?.addEventListener('click', () => {
                showForm();
            });
            
        } else {
            container.innerHTML = brands.map(brand => brand.toAdminHTML()).join('');
            
            // Verificar imágenes cargadas
            brands.forEach(brand => {
                console.log(`Brand ${brand.nombre} image:`, 
                    brand.imagen ? `Has image (${brand.imagen.length} chars)` : 'No image');
            });
            
            // Add events to buttons after rendering
            attachButtonEvents();
        }
        
        // Update counter if exists
        updateItemCount();
        
    } catch (error) {
        console.error('Error loading brands:', error);
        showError('Error loading brands: ' + error.message);
    } finally {
        showLoading(false);
    }
    
}

function setupEventListeners() {
    // Add button in header
    document.getElementById('addBtn')?.addEventListener('click', () => {
        showForm();
    });
    
    // Search input
    document.getElementById('searchInput')?.addEventListener('input', function(e) {
        searchBrands(e.target.value);
    });
    
    // Form buttons
    document.getElementById('cancelBtn')?.addEventListener('click', hideForm);
    document.getElementById('cancelBtn2')?.addEventListener('click', hideForm);
    document.getElementById('brandForm')?.addEventListener('submit', handleFormSubmit);
    
    // Image input
    document.getElementById('imageInput')?.addEventListener('change', handleImagePreview);
    
    // Close form with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('formContainer').style.display === 'block') {
            hideForm();
        }
    });
    
    // Overlay to close form
    document.getElementById('formOverlay')?.addEventListener('click', hideForm);
}

function searchBrands(searchTerm) {
    const container = document.getElementById('brandContainer');
    
    if (searchTerm.trim() === '') {
        // Show all brands
        container.innerHTML = brandManager.brands.map(brand => brand.toAdminHTML()).join('');
        attachButtonEvents();
        updateItemCount();
        return;
    }
    
    const filteredBrands = brandManager.searchBrands(searchTerm);
    
    if (filteredBrands.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No brands found for "${searchTerm}"</p>
                <p class="text-light">Try a different search term</p>
            </div>
        `;
    } else {
        container.innerHTML = filteredBrands.map(brand => brand.toAdminHTML()).join('');
        attachButtonEvents();
    }
}

function attachButtonEvents() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            editBrand(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            confirmDeleteBrand(id);
        });
    });
}

function showForm() {
    document.getElementById('formTitle').textContent = 'Add Brand';
    document.getElementById('formContainer').style.display = 'block';
    document.getElementById('formOverlay').style.display = 'block';
    document.getElementById('itemId').value = '';
    document.getElementById('brandForm').reset();
    
    // Reset image preview
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<i class="fas fa-image"></i><span>Logo preview</span>';
    preview.classList.remove('has-image');
    
    // Reset current image
    currentImageBase64 = '';
    
    // Focus first field
    setTimeout(() => {
        document.getElementById('nombre').focus();
    }, 100);
}

async function editBrand(id) {
    try {
        const brand = brandManager.getBrandById(id);
        if (!brand) {
            showError('Brand not found');
            return;
        }
        
        document.getElementById('formTitle').textContent = 'Edit Brand';
        document.getElementById('formContainer').style.display = 'block';
        document.getElementById('formOverlay').style.display = 'block';
        document.getElementById('itemId').value = id;
        document.getElementById('nombre').value = brand.nombre;
        
        // Reset current image
        currentImageBase64 = brand.imagen || '';
        
        // Show current logo
        const preview = document.getElementById('imagePreview');
        if (brand.imagen && brand.imagen.startsWith('data:image')) {
            preview.innerHTML = `<img src="${brand.imagen}" alt="Preview">`;
            preview.classList.add('has-image');
        } else {
            preview.innerHTML = '<i class="fas fa-image"></i><span>Logo preview</span>';
            preview.classList.remove('has-image');
        }
        
        // Focus first field
        setTimeout(() => {
            document.getElementById('nombre').focus();
        }, 100);
        
    } catch (error) {
        console.error('Error loading brand for edit:', error);
        showError('Error loading brand for edit: ' + error.message);
    }
}

function hideForm() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('formOverlay').style.display = 'none';
    document.getElementById('brandForm').reset();
    
    // Reset image preview
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<i class="fas fa-image"></i><span>Logo preview</span>';
    preview.classList.remove('has-image');
    
    // Reset current image
    currentImageBase64 = '';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('itemId').value;
    const nombre = document.getElementById('nombre').value.trim();
    const imageFile = document.getElementById('imageInput').files[0];
    
    // Basic validations
    if (!nombre) {
        showWarning('Please enter a brand name');
        document.getElementById('nombre').focus();
        return;
    }
    
    let imageBase64 = currentImageBase64;
    
    // Si hay un nuevo archivo, procesarlo
    if (imageFile) {
        // Validate image type
        if (!imageFile.type.startsWith('image/')) {
            showWarning('Please select a valid image file');
            return;
        }
        
        // Validate size (max 2MB for logos)
        if (imageFile.size > 2 * 1024 * 1024) {
            showWarning('Image is too large. Maximum 2MB for logos');
            return;
        }
        
        try {
            imageBase64 = await convertImageToBase64(imageFile);
        } catch (error) {
            showError('Error processing image: ' + error.message);
            return;
        }
    }
    
    // Show loading
    Swal.fire({
        title: id ? 'Updating...' : 'Adding...',
        text: 'Please wait',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    const brandData = {
        nombre: nombre,
        imagen: imageBase64 // Guardar como base64
    };
    
    console.log('Saving brand data:', {
        nombre: brandData.nombre,
        hasImage: !!brandData.imagen,
        imageLength: brandData.imagen ? brandData.imagen.length : 0
    });
    
    try {
        if (id) {
            await brandManager.updateBrand(id, brandData);
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Brand updated successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } else {
            const result = await brandManager.addBrand(brandData);
            console.log('Brand added successfully:', result.id);
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Brand added successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        }
        
        // Reload list and hide form
        await loadBrands();
        hideForm();
        
    } catch (error) {
        console.error('Error saving brand:', error);
        showError('Error saving brand: ' + error.message);
    } finally {
        Swal.close();
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) {
        currentImageBase64 = '';
        return;
    }
    
    // Validate it's an image
    if (!file.type.startsWith('image/')) {
        showWarning('Please select an image file');
        e.target.value = '';
        currentImageBase64 = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const preview = document.getElementById('imagePreview');
            currentImageBase64 = event.target.result;
            
            // Verificar que sea base64 válido
            console.log('Image loaded as base64 (first 100 chars):', 
                       currentImageBase64.substring(0, 100));
            
            preview.innerHTML = `<img src="${currentImageBase64}" alt="Preview">`;
            preview.classList.add('has-image');
        } catch (error) {
            console.error('Error processing image:', error);
            showError('Error processing image');
            e.target.value = '';
            currentImageBase64 = '';
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        showError('Error loading image');
        e.target.value = '';
        currentImageBase64 = '';
    };
    
    reader.readAsDataURL(file);
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                console.log('Converted to base64, length:', reader.result.length);
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert image to base64 string'));
            }
        };
        
        reader.onerror = error => {
            console.error('Error converting image:', error);
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

async function confirmDeleteBrand(id) {
    const brand = brandManager.getBrandById(id);
    if (!brand) return;
    
    Swal.fire({
        title: 'Delete brand?',
        html: `Are you sure you want to delete <strong>"${brand.nombre}"</strong>?<br><small>This will not delete products associated with this brand.</small>`,
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
                await brandManager.deleteBrand(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Brand deleted successfully!',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                await loadBrands();
            } catch (error) {
                console.error('Error deleting brand:', error);
                showError('Error deleting brand: ' + error.message);
            }
        }
    });
}

function updateItemCount() {
    const countElement = document.getElementById('itemCount');
    if (countElement) {
        countElement.textContent = brandManager.getTotalBrands();
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
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