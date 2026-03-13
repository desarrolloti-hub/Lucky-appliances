// provider-admin.js - CRUD for provider management with SweetAlert
import { ProviderManager } from '/classes/provider.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Create global instance
const providerManager = new ProviderManager();

// Variables para manejo de imágenes
let currentImageBase64 = '';

document.addEventListener('DOMContentLoaded', function() {
    // Load providers
    loadProviders();
    
    // Configure events
    setupEventListeners();
});

async function loadProviders() {
    try {
        showLoading(true);
        const providers = await providerManager.loadProviders();
        const container = document.getElementById('providerContainer');
        
        console.log('Loaded providers:', providers.length);
        
        if (providers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <p>No providers added yet</p>
                    <button id="addFirstBtn" class="btn-primary">
                        <i class="fas fa-plus"></i> Add first provider
                    </button>
                </div>
            `;
            
            // Add event to empty state button
            document.getElementById('addFirstBtn')?.addEventListener('click', () => {
                showForm();
            });
            
        } else {
            container.innerHTML = providers.map(provider => provider.toAdminHTML()).join('');
            
            // Verify loaded images
            providers.forEach(provider => {
                console.log(`Provider ${provider.nombre} image:`, 
                    provider.imagen ? `Has image (${provider.imagen.length} chars)` : 'No image');
            });
            
            // Add events to buttons after rendering
            attachButtonEvents();
        }
        
        // Update counter
        updateItemCount();
        
    } catch (error) {
        console.error('Error loading providers:', error);
        showError('Error loading providers: ' + error.message);
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
        searchProviders(e.target.value);
    });
    
    // Form buttons
    document.getElementById('cancelBtn')?.addEventListener('click', hideForm);
    document.getElementById('cancelBtn2')?.addEventListener('click', hideForm);
    document.getElementById('providerForm')?.addEventListener('submit', handleFormSubmit);
    
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
    
    // RFC input - solo convertir a mayúsculas, sin validación de formato
    document.getElementById('rfc')?.addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });
}

function searchProviders(searchTerm) {
    const container = document.getElementById('providerContainer');
    
    if (searchTerm.trim() === '') {
        // Show all providers
        container.innerHTML = providerManager.providers.map(provider => provider.toAdminHTML()).join('');
        attachButtonEvents();
        updateItemCount();
        return;
    }
    
    const filteredProviders = providerManager.searchProviders(searchTerm);
    
    if (filteredProviders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No providers found for "${searchTerm}"</p>
                <p class="text-light">Try searching by name, internal ID or RFC</p>
            </div>
        `;
    } else {
        container.innerHTML = filteredProviders.map(provider => provider.toAdminHTML()).join('');
        attachButtonEvents();
    }
}

function attachButtonEvents() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            editProvider(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            confirmDeleteProvider(id);
        });
    });
}

function showForm() {
    document.getElementById('formTitle').textContent = 'Add Provider';
    document.getElementById('formContainer').style.display = 'block';
    document.getElementById('formOverlay').style.display = 'block';
    document.getElementById('itemId').value = '';
    document.getElementById('providerForm').reset();
    
    // Reset image preview
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<i class="fas fa-image"></i><span>Logo preview</span>';
    preview.classList.remove('has-image');
    
    // Reset current image
    currentImageBase64 = '';
    
    // Focus first field
    setTimeout(() => {
        document.getElementById('idInterno').focus();
    }, 100);
}

async function editProvider(id) {
    try {
        const provider = providerManager.getProviderById(id);
        if (!provider) {
            showError('Provider not found');
            return;
        }
        
        document.getElementById('formTitle').textContent = 'Edit Provider';
        document.getElementById('formContainer').style.display = 'block';
        document.getElementById('formOverlay').style.display = 'block';
        document.getElementById('itemId').value = id;
        document.getElementById('idInterno').value = provider.idInterno;
        document.getElementById('nombre').value = provider.nombre;
        document.getElementById('rfc').value = provider.rfc;
        
        // Reset current image
        currentImageBase64 = provider.imagen || '';
        
        // Show current logo
        const preview = document.getElementById('imagePreview');
        if (provider.imagen && provider.imagen.startsWith('data:image')) {
            preview.innerHTML = `<img src="${provider.imagen}" alt="Preview">`;
            preview.classList.add('has-image');
        } else {
            preview.innerHTML = '<i class="fas fa-image"></i><span>Logo preview</span>';
            preview.classList.remove('has-image');
        }
        
        // Focus first field
        setTimeout(() => {
            document.getElementById('idInterno').focus();
        }, 100);
        
    } catch (error) {
        console.error('Error loading provider for edit:', error);
        showError('Error loading provider for edit: ' + error.message);
    }
}

function hideForm() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('formOverlay').style.display = 'none';
    document.getElementById('providerForm').reset();
    
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
    const idInterno = document.getElementById('idInterno').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const rfc = document.getElementById('rfc').value.trim().toUpperCase();
    const imageFile = document.getElementById('imageInput').files[0];
    
    // Basic validations
    if (!idInterno) {
        showWarning('Please enter an internal ID');
        document.getElementById('idInterno').focus();
        return;
    }
    
    if (!nombre) {
        showWarning('Please enter a provider name');
        document.getElementById('nombre').focus();
        return;
    }
    
    if (!rfc) {
        showWarning('Please enter an RFC');
        document.getElementById('rfc').focus();
        return;
    }
    
    // SOLO VALIDACIÓN DE LONGITUD MÍNIMA PARA NO GUARDAR VACÍO
    if (rfc.length < 1) {
        showWarning('RFC cannot be empty');
        document.getElementById('rfc').focus();
        return;
    }
    
    let imageBase64 = currentImageBase64;
    
    // If there's a new file, process it
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
    
    const providerData = {
        idInterno: idInterno,
        nombre: nombre,
        rfc: rfc,
        imagen: imageBase64,
        compras: {},
        tiempos: {}
    };
    
    console.log('Saving provider data:', {
        idInterno: providerData.idInterno,
        nombre: providerData.nombre,
        rfc: providerData.rfc,
        hasImage: !!providerData.imagen,
        imageLength: providerData.imagen ? providerData.imagen.length : 0
    });
    
    try {
        if (id) {
            await providerManager.updateProvider(id, providerData);
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Provider updated successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } else {
            const result = await providerManager.addProvider(providerData);
            console.log('Provider added successfully:', result.id);
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Provider added successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        }
        
        // Reload list and hide form
        await loadProviders();
        hideForm();
        
    } catch (error) {
        console.error('Error saving provider:', error);
        showError('Error saving provider: ' + error.message);
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

async function confirmDeleteProvider(id) {
    const provider = providerManager.getProviderById(id);
    if (!provider) return;
    
    Swal.fire({
        title: 'Delete provider?',
        html: `Are you sure you want to delete <strong>"${provider.nombre}"</strong>?<br>
               <small>ID: ${provider.idInterno}</small><br><br>
               <small class="text-warning">This action cannot be undone.</small>`,
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
                await providerManager.deleteProvider(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Provider deleted successfully!',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                await loadProviders();
            } catch (error) {
                console.error('Error deleting provider:', error);
                showError('Error deleting provider: ' + error.message);
            }
        }
    });
}

function updateItemCount() {
    const countElement = document.getElementById('itemCount');
    if (countElement) {
        countElement.textContent = providerManager.getTotalProviders();
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