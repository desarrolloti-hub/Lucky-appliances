// carousel-admin.js - CRUD for carousel with SweetAlert
import { CarouselManager } from '/classes/carousel.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Create global instance
const carouselManager = new CarouselManager();

document.addEventListener('DOMContentLoaded', function() {
    // Load items
    loadCarouselItems();
    
    // Configure events
    setupEventListeners();
});

async function loadCarouselItems() {
    try {
        showLoading(true);
        const items = await carouselManager.loadItems();
        const container = document.getElementById('carouselContainer');
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <p>No images in the carousel</p>
                    <button id="addFirstBtn" class="btn-primary">
                        <i class="fas fa-plus"></i> Add first image
                    </button>
                </div>
            `;
            
            // Add event to empty state button
            document.getElementById('addFirstBtn')?.addEventListener('click', () => {
                showForm();
            });
            
        } else {
            container.innerHTML = items.map(item => item.toAdminHTML()).join('');
            
            // Add events to buttons after rendering
            attachButtonEvents();
        }
        
        // Update counter if exists
        updateItemCount();
        
    } catch (error) {
        console.error('Error loading carousel:', error);
        showError('Error loading carousel images');
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    // Add button in header
    document.getElementById('addBtn')?.addEventListener('click', () => {
        showForm();
    });
    
    // Form buttons
    document.getElementById('cancelBtn')?.addEventListener('click', hideForm);
    document.getElementById('cancelBtn2')?.addEventListener('click', hideForm);
    document.getElementById('carouselForm')?.addEventListener('submit', handleFormSubmit);
    
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

function attachButtonEvents() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            editCarouselItem(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            confirmDeleteItem(id);
        });
    });
}

function showForm() {
    document.getElementById('formTitle').textContent = 'Add Image to Carousel';
    document.getElementById('formContainer').style.display = 'block';
    document.getElementById('formOverlay').style.display = 'block';
    document.getElementById('itemId').value = '';
    document.getElementById('carouselForm').reset();
    document.getElementById('imagePreview').innerHTML = '<i class="fas fa-image"></i><span>Image preview</span>';
    document.getElementById('imagePreview').classList.remove('has-image');
    
    // Set image as required for new items
    document.getElementById('imageInput').setAttribute('required', 'required');
    
    // Focus first field
    setTimeout(() => {
        document.getElementById('nombre').focus();
    }, 100);
}

async function editCarouselItem(id) {
    try {
        const item = carouselManager.getItemById(id);
        if (!item) {
            showError('Image not found');
            return;
        }
        
        document.getElementById('formTitle').textContent = 'Edit Carousel Image';
        document.getElementById('formContainer').style.display = 'block';
        document.getElementById('formOverlay').style.display = 'block';
        document.getElementById('itemId').value = id;
        document.getElementById('nombre').value = item.nombre;
        document.getElementById('descripcion').value = item.descripcion;
        
        // Show current image
        if (item.image) {
            document.getElementById('imagePreview').innerHTML = `<img src="${item.image}" alt="Preview">`;
            document.getElementById('imagePreview').classList.add('has-image');
        }
        
        // Image field not required in edit
        document.getElementById('imageInput').removeAttribute('required');
        
        // Focus first field
        setTimeout(() => {
            document.getElementById('nombre').focus();
        }, 100);
        
    } catch (error) {
        console.error('Error loading item for edit:', error);
        showError('Error loading image for edit');
    }
}

function hideForm() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('formOverlay').style.display = 'none';
    document.getElementById('carouselForm').reset();
    
    // Reset required for image
    document.getElementById('imageInput').setAttribute('required', 'required');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('itemId').value;
    const nombre = document.getElementById('nombre').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const imageFile = document.getElementById('imageInput').files[0];
    
    // Basic validations
    if (!nombre) {
        showWarning('Please enter a name for the image');
        document.getElementById('nombre').focus();
        return;
    }
    
    let imageBase64 = '';
    const previewImg = document.getElementById('imagePreview').querySelector('img');
    
    if (imageFile) {
        // Validate image type
        if (!imageFile.type.startsWith('image/')) {
            showWarning('Please select a valid image file');
            return;
        }
        
        // Validate size (max 5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
            showWarning('Image is too large. Maximum 5MB');
            return;
        }
        
        try {
            imageBase64 = await convertToBase64(imageFile);
        } catch (error) {
            showError('Error processing image');
            return;
        }
    } else if (previewImg && previewImg.src && !previewImg.src.includes('placeholder')) {
        // Use existing image if editing
        imageBase64 = previewImg.src;
    } else if (!id) {
        // If new and no image
        showWarning('Please select an image');
        return;
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
    
    const itemData = {
        nombre: nombre,
        descripcion: descripcion,
        image: imageBase64
    };
    
    try {
        if (id) {
            await carouselManager.updateItem(id, itemData);
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Image updated successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } else {
            await carouselManager.addItem(itemData);
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Image added successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        }
        
        // Reload list and hide form
        await loadCarouselItems();
        hideForm();
        
    } catch (error) {
        console.error('Error saving image:', error);
        showError('Error saving image: ' + error.message);
    } finally {
        Swal.close();
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate it's an image
    if (!file.type.startsWith('image/')) {
        showWarning('Please select an image file');
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        preview.classList.add('has-image');
    };
    reader.onerror = function() {
        showError('Error loading image');
        e.target.value = '';
    };
    reader.readAsDataURL(file);
}

function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function confirmDeleteItem(id) {
    const item = carouselManager.getItemById(id);
    if (!item) return;
    
    Swal.fire({
        title: 'Delete image?',
        html: `Are you sure you want to delete <strong>"${item.nombre}"</strong> from the carousel?`,
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
                await carouselManager.deleteItem(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Image deleted successfully!',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                await loadCarouselItems();
            } catch (error) {
                console.error('Error deleting image:', error);
                showError('Error deleting image');
            }
        }
    });
}

function updateItemCount() {
    const countElement = document.getElementById('itemCount');
    if (countElement) {
        countElement.textContent = carouselManager.getTotalItems();
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