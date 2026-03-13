// category-admin.js - CRUD for category management with SweetAlert
import { CategoryManager } from '/classes/category.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Create global instance
const categoryManager = new CategoryManager();

// Variables para manejo de imágenes
let currentImageBase64 = '';

document.addEventListener('DOMContentLoaded', function() {
    // Load categories
    loadCategories();
    
    // Configure events
    setupEventListeners();
});

async function loadCategories() {
    try {
        showLoading(true);
        const categories = await categoryManager.loadCategories();
        const container = document.getElementById('categoryContainer');
        
        console.log('Loaded categories:', categories.length);
        
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder"></i>
                    <p>No categories added yet</p>
                    <button id="addFirstBtn" class="btn-primary">
                        <i class="fas fa-plus"></i> Add first category
                    </button>
                </div>
            `;
            
            // Add event to empty state button
            document.getElementById('addFirstBtn')?.addEventListener('click', () => {
                showForm();
            });
            
        } else {
            container.innerHTML = categories.map(category => category.toAdminHTML()).join('');
            
            // Verificar imágenes cargadas
            categories.forEach(category => {
                console.log(`Category ${category.nombre} image:`, 
                    category.imagen ? `Has image (${category.imagen.length} chars)` : 'No image');
            });
            
            // Add events to buttons after rendering
            attachButtonEvents();
        }
        
        // Update counter if exists
        updateItemCount();
        
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Error loading categories: ' + error.message);
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
        searchCategories(e.target.value);
    });
    
    // Form buttons
    document.getElementById('cancelBtn')?.addEventListener('click', hideForm);
    document.getElementById('cancelBtn2')?.addEventListener('click', hideForm);
    document.getElementById('categoryForm')?.addEventListener('submit', handleFormSubmit);
    
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

function searchCategories(searchTerm) {
    const container = document.getElementById('categoryContainer');
    
    if (searchTerm.trim() === '') {
        // Show all categories
        container.innerHTML = categoryManager.categories.map(category => category.toAdminHTML()).join('');
        attachButtonEvents();
        updateItemCount();
        return;
    }
    
    const filteredCategories = categoryManager.searchCategories(searchTerm);
    
    if (filteredCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No categories found for "${searchTerm}"</p>
                <p class="text-light">Try a different search term</p>
            </div>
        `;
    } else {
        container.innerHTML = filteredCategories.map(category => category.toAdminHTML()).join('');
        attachButtonEvents();
    }
}

function attachButtonEvents() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            editCategory(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            confirmDeleteCategory(id);
        });
    });
}

function showForm() {
    document.getElementById('formTitle').textContent = 'Add Category';
    document.getElementById('formContainer').style.display = 'block';
    document.getElementById('formOverlay').style.display = 'block';
    document.getElementById('itemId').value = '';
    document.getElementById('categoryForm').reset();
    
    // Reset image preview
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<i class="fas fa-image"></i><span>Image preview</span>';
    preview.classList.remove('has-image');
    
    // Reset current image
    currentImageBase64 = '';
    
    // Focus first field
    setTimeout(() => {
        document.getElementById('nombre').focus();
    }, 100);
}

async function editCategory(id) {
    try {
        const category = categoryManager.getCategoryById(id);
        if (!category) {
            showError('Category not found');
            return;
        }
        
        document.getElementById('formTitle').textContent = 'Edit Category';
        document.getElementById('formContainer').style.display = 'block';
        document.getElementById('formOverlay').style.display = 'block';
        document.getElementById('itemId').value = id;
        document.getElementById('nombre').value = category.nombre;
        
        // Reset current image
        currentImageBase64 = category.imagen || '';
        
        // Show current image
        const preview = document.getElementById('imagePreview');
        if (category.imagen && category.imagen.startsWith('data:image')) {
            preview.innerHTML = `<img src="${category.imagen}" alt="Preview">`;
            preview.classList.add('has-image');
        } else {
            preview.innerHTML = '<i class="fas fa-image"></i><span>Image preview</span>';
            preview.classList.remove('has-image');
        }
        
        // Focus first field
        setTimeout(() => {
            document.getElementById('nombre').focus();
        }, 100);
        
    } catch (error) {
        console.error('Error loading category for edit:', error);
        showError('Error loading category for edit: ' + error.message);
    }
}

function hideForm() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('formOverlay').style.display = 'none';
    document.getElementById('categoryForm').reset();
    
    // Reset image preview
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<i class="fas fa-image"></i><span>Image preview</span>';
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
        showWarning('Please enter a category name');
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
        
        // Validate size (max 2MB for images)
        if (imageFile.size > 2 * 1024 * 1024) {
            showWarning('Image is too large. Maximum 2MB for category images');
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
    
    const categoryData = {
        nombre: nombre,
        imagen: imageBase64 // Guardar como base64
    };
    
    console.log('Saving category data:', {
        nombre: categoryData.nombre,
        hasImage: !!categoryData.imagen,
        imageLength: categoryData.imagen ? categoryData.imagen.length : 0
    });
    
    try {
        if (id) {
            await categoryManager.updateCategory(id, categoryData);
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Category updated successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } else {
            const result = await categoryManager.addCategory(categoryData);
            console.log('Category added successfully:', result.id);
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Category added successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        }
        
        // Reload list and hide form
        await loadCategories();
        hideForm();
        
    } catch (error) {
        console.error('Error saving category:', error);
        showError('Error saving category: ' + error.message);
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

async function confirmDeleteCategory(id) {
    const category = categoryManager.getCategoryById(id);
    if (!category) return;
    
    Swal.fire({
        title: 'Delete category?',
        html: `Are you sure you want to delete <strong>"${category.nombre}"</strong>?<br><small>This will not delete products in this category.</small>`,
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
                await categoryManager.deleteCategory(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Category deleted successfully!',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                await loadCategories();
            } catch (error) {
                console.error('Error deleting category:', error);
                showError('Error deleting category: ' + error.message);
            }
        }
    });
}

function updateItemCount() {
    const countElement = document.getElementById('itemCount');
    if (countElement) {
        countElement.textContent = categoryManager.getTotalCategories();
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