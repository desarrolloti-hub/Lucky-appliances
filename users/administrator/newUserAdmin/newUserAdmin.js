// user-admin.js - CRUD for user management with SweetAlert
import { UserManager } from '/classes/user.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Create global instance
const userManager = new UserManager();

// Variables para manejo de foto
let currentPhotoBase64 = '';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Starting user admin...');
        
        // Load users
        await loadUsers();
        
        // Configure events
        setupEventListeners();
        
        console.log('User admin initialized successfully');
    } catch (error) {
        console.error('Error initializing user admin:', error);
        showError('Failed to initialize: ' + error.message);
    }
});

async function loadUsers() {
    try {
        showLoading(true);
        
        // Cargar usuarios
        const users = await userManager.loadUsers();
        const container = document.getElementById('userContainer');
        
        console.log('Loaded users:', users.length);
        
        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No users added yet</p>
                    <button id="addFirstBtn" class="btn-primary">
                        <i class="fas fa-user-plus"></i> Add first user
                    </button>
                </div>
            `;
            
            // Add event to empty state button
            document.getElementById('addFirstBtn')?.addEventListener('click', () => {
                showForm();
            });
            
        } else {
            container.innerHTML = users.map(user => 
                user.toAdminHTML()
            ).join('');
            
            // Add events to buttons after rendering
            attachButtonEvents();
        }
        
        // Update counters
        updateCounters();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Error loading users: ' + error.message);
        
        // Mostrar estado de error
        const container = document.getElementById('userContainer');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading users</p>
                <p class="text-light">${error.message}</p>
                <button id="retryBtn" class="btn-primary">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
        
        document.getElementById('retryBtn')?.addEventListener('click', loadUsers);
        
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
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchUsers(e.target.value);
        });
    }
    
    // Form buttons
    document.getElementById('cancelBtn')?.addEventListener('click', hideForm);
    document.getElementById('cancelBtn2')?.addEventListener('click', hideForm);
    
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Photo upload area
    const photoUploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    
    if (photoUploadArea) {
        photoUploadArea.addEventListener('click', () => {
            if (photoInput) {
                photoInput.click();
            }
        });
    }
    
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handlePhotoUpload(e.target.files[0]);
            }
        });
    }
    
    // Remove photo button
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentPhotoBase64 = '';
            updatePhotoPreview();
        });
    }
    
    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordField = document.getElementById('Password');
            if (passwordField) {
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            }
        });
    }
    
    // Close form with Escape
    document.addEventListener('keydown', (e) => {
        const formContainer = document.getElementById('formContainer');
        if (e.key === 'Escape' && formContainer && formContainer.style.display === 'block') {
            hideForm();
        }
    });
    
    // Overlay to close form
    const formOverlay = document.getElementById('formOverlay');
    if (formOverlay) {
        formOverlay.addEventListener('click', hideForm);
    }
}

async function handlePhotoUpload(file) {
    // Validate image
    if (!file.type.startsWith('image/')) {
        showWarning('Please select only image files');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showWarning('Image is too large. Maximum 2MB');
        return;
    }
    
    try {
        currentPhotoBase64 = await convertImageToBase64(file);
        updatePhotoPreview();
    } catch (error) {
        console.error('Error processing photo:', error);
        showError('Error processing photo: ' + error.message);
    }
    
    // Reset input
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.value = '';
    }
}

function updatePhotoPreview() {
    const photoPreview = document.getElementById('photoPreview');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const uploadArea = document.getElementById('photoUploadArea');
    
    if (!photoPreview || !uploadArea) return;
    
    if (currentPhotoBase64) {
        photoPreview.innerHTML = `<img src="${currentPhotoBase64}" alt="Photo preview">`;
        if (removePhotoBtn) {
            removePhotoBtn.style.display = 'inline-flex';
        }
        
        // Update upload area text
        const icon = uploadArea.querySelector('i');
        const text = uploadArea.querySelector('p');
        if (icon) {
            icon.className = 'fas fa-user-circle';
        }
        if (text) {
            text.textContent = 'Click to change photo';
        }
    } else {
        photoPreview.innerHTML = `<i class="fas fa-user" style="font-size: 4rem; color: var(--gray);"></i>`;
        if (removePhotoBtn) {
            removePhotoBtn.style.display = 'none';
        }
        
        // Reset upload area text
        const icon = uploadArea.querySelector('i');
        const text = uploadArea.querySelector('p');
        if (icon) {
            icon.className = 'fas fa-cloud-upload-alt';
        }
        if (text) {
            text.textContent = 'Click to upload photo';
        }
    }
}

function searchUsers(searchTerm) {
    const container = document.getElementById('userContainer');
    if (!container) return;
    
    if (searchTerm.trim() === '') {
        // Show all users
        container.innerHTML = userManager.users.map(user => 
            user.toAdminHTML()
        ).join('');
        attachButtonEvents();
        updateCounters();
        return;
    }
    
    const filteredUsers = userManager.searchUsers(searchTerm);
    
    if (filteredUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No users found for "${searchTerm}"</p>
                <p class="text-light">Try a different search term</p>
            </div>
        `;
    } else {
        container.innerHTML = filteredUsers.map(user => 
            user.toAdminHTML()
        ).join('');
        attachButtonEvents();
    }
}

function attachButtonEvents() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            if (id) {
                editUser(id);
            }
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            if (id) {
                confirmDeleteUser(id);
            }
        });
    });
}

async function showForm() {
    const formTitle = document.getElementById('formTitle');
    const formContainer = document.getElementById('formContainer');
    const formOverlay = document.getElementById('formOverlay');
    
    if (!formTitle || !formContainer || !formOverlay) return;
    
    formTitle.textContent = 'Add User';
    formContainer.style.display = 'block';
    formOverlay.style.display = 'block';
    
    const userId = document.getElementById('userId');
    const userForm = document.getElementById('userForm');
    
    if (userId) {
        userId.value = '';
    }
    if (userForm) {
        userForm.reset();
    }
    
    // Reset photo preview
    currentPhotoBase64 = '';
    updatePhotoPreview();
    
    // Mostrar campo de contraseña para nuevo usuario
    const passwordField = document.getElementById('passwordField');
    const passwordLabel = document.getElementById('passwordLabel');
    const passwordInput = document.getElementById('Password');
    
    if (passwordField) {
        passwordField.style.display = 'block';
    }
    if (passwordLabel) {
        passwordLabel.innerHTML = '<i class="fas fa-key"></i> Password *';
    }
    if (passwordInput) {
        passwordInput.placeholder = 'Minimum 6 characters';
        passwordInput.setAttribute('required', 'true');
    }
    
    // Focus first field
    setTimeout(() => {
        const firstNameField = document.getElementById('FirstName');
        if (firstNameField) {
            firstNameField.focus();
        }
    }, 100);
}

async function editUser(id) {
    try {
        const user = userManager.getUserById(id);
        if (!user) {
            showError('User not found');
            return;
        }
        
        const formTitle = document.getElementById('formTitle');
        const formContainer = document.getElementById('formContainer');
        const formOverlay = document.getElementById('formOverlay');
        
        if (!formTitle || !formContainer || !formOverlay) return;
        
        formTitle.textContent = 'Edit User';
        formContainer.style.display = 'block';
        formOverlay.style.display = 'block';
        
        const userId = document.getElementById('userId');
        if (userId) {
            userId.value = id;
        }
        
        // Set form values
        const firstName = document.getElementById('FirstName');
        const lastName = document.getElementById('LastName');
        const email = document.getElementById('Email');
        const position = document.getElementById('Position');
        const role = document.getElementById('Role');
        const active = document.getElementById('Active');
        
        if (firstName) firstName.value = user.firstName || '';
        if (lastName) lastName.value = user.lastName || '';
        if (email) email.value = user.email || '';
        if (position) position.value = user.position || '';
        if (role) role.value = user.role || 'user';
        if (active) active.checked = user.active !== false;
        
        // Set photo
        currentPhotoBase64 = user.photo || '';
        updatePhotoPreview();
        
        // MOSTRAR campo de contraseña para edición también
        const passwordField = document.getElementById('passwordField');
        const passwordLabel = document.getElementById('passwordLabel');
        const passwordInput = document.getElementById('Password');
        
        if (passwordField) {
            passwordField.style.display = 'block';
        }
        if (passwordLabel) {
            passwordLabel.innerHTML = '<i class="fas fa-key"></i> Password <small>(Leave empty to keep current)</small>';
        }
        if (passwordInput) {
            passwordInput.placeholder = 'Leave empty to keep current password';
            passwordInput.removeAttribute('required'); // No requerido en edición
        }
        
        // Focus first field
        setTimeout(() => {
            const firstNameField = document.getElementById('FirstName');
            if (firstNameField) {
                firstNameField.focus();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showError('Error loading user for edit: ' + error.message);
    }
}

function hideForm() {
    const formContainer = document.getElementById('formContainer');
    const formOverlay = document.getElementById('formOverlay');
    
    if (formContainer) {
        formContainer.style.display = 'none';
    }
    if (formOverlay) {
        formOverlay.style.display = 'none';
    }
    
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.reset();
    }
    
    // Reset photo preview
    currentPhotoBase64 = '';
    updatePhotoPreview();
    
    // Restablecer campo de contraseña a estado original
    const passwordField = document.getElementById('passwordField');
    const passwordLabel = document.getElementById('passwordLabel');
    const passwordInput = document.getElementById('Password');
    
    if (passwordField) {
        passwordField.style.display = 'block';
    }
    if (passwordLabel) {
        passwordLabel.innerHTML = '<i class="fas fa-key"></i> Password *';
    }
    if (passwordInput) {
        passwordInput.placeholder = 'Minimum 6 characters';
        passwordInput.setAttribute('required', 'true');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('userId')?.value || '';
    const isEdit = !!id;
    
    const firstName = document.getElementById('FirstName')?.value.trim() || '';
    const lastName = document.getElementById('LastName')?.value.trim() || '';
    const email = document.getElementById('Email')?.value.trim() || '';
    const position = document.getElementById('Position')?.value.trim() || '';
    const role = document.getElementById('Role')?.value || 'user';
    const active = document.getElementById('Active')?.checked || false;
    const password = document.getElementById('Password')?.value || '';
    
    // Basic validations
    if (!firstName) {
        showWarning('Please enter first name');
        const firstNameField = document.getElementById('FirstName');
        if (firstNameField) firstNameField.focus();
        return;
    }
    
    if (!lastName) {
        showWarning('Please enter last name');
        const lastNameField = document.getElementById('LastName');
        if (lastNameField) lastNameField.focus();
        return;
    }
    
    if (!email) {
        showWarning('Please enter email address');
        const emailField = document.getElementById('Email');
        if (emailField) emailField.focus();
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showWarning('Please enter a valid email address');
        const emailField = document.getElementById('Email');
        if (emailField) emailField.focus();
        return;
    }
    
    // Validación de contraseña MODIFICADA:
    if (!isEdit && !password) {
        // Para nuevo usuario, contraseña es requerida
        showWarning('Please enter a password for the new user');
        const passwordField = document.getElementById('Password');
        if (passwordField) passwordField.focus();
        return;
    }
    
    // Solo validar longitud si se proporciona una contraseña (en nuevo usuario o cuando se cambia)
    if (password && password.length < 6) {
        showWarning('Password must be at least 6 characters long');
        const passwordField = document.getElementById('Password');
        if (passwordField) passwordField.focus();
        return;
    }
    
    // Show loading
    Swal.fire({
        title: isEdit ? 'Updating...' : 'Creating...',
        text: 'Please wait',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        if (isEdit) {
            // Update existing user - AHORA INCLUYE CONTRASEÑA SI SE PROPORCIONA
            const userData = {
                firstName: firstName,
                lastName: lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                email: email,
                position: position,
                role: role,
                photo: currentPhotoBase64,
                active: active
            };
            
            // Añadir contraseña solo si se proporcionó una nueva
            if (password) {
                userData.password = password;
            }
            
            await userManager.updateUser(id, userData);
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: password ? 'User and password updated successfully!' : 'User updated successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
            
        } else {
            // Create new user (contraseña ya validada como requerida)
            const userData = {
                firstName: firstName,
                lastName: lastName,
                email: email,
                position: position,
                role: role,
                photo: currentPhotoBase64
            };
            
            const result = await userManager.createUser(userData, password);
            console.log('User created successfully:', result.id);
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'User created successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        }
        
        // Reload list and hide form
        await loadUsers();
        hideForm();
        
    } catch (error) {
        console.error('Error saving user:', error);
        showError('Error saving user: ' + error.message);
    } finally {
        Swal.close();
    }
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                console.log('Converted photo to base64, length:', reader.result.length);
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert image to base64 string'));
            }
        };
        
        reader.onerror = error => {
            console.error('Error converting photo:', error);
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}
async function confirmDeleteUser(id) {
    const user = userManager.getUserById(id);
    if (!user) return;
    
    Swal.fire({
        title: 'Delete user?',
        html: `Are you sure you want to delete <strong>"${user.fullName}"</strong> (${user.email})?<br>
               <small>This will remove the user from the system. This action cannot be undone.</small>`,
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
                await userManager.deleteUser(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'User deleted successfully!',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                await loadUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                showError('Error deleting user: ' + error.message);
            }
        }
    });
}

function updateCounters() {
    const countElement = document.getElementById('itemCount');
    const activeElement = document.getElementById('activeCount');
    const adminElement = document.getElementById('adminCount');
    
    if (countElement) {
        countElement.textContent = userManager.getTotalUsers();
    }
    
    if (activeElement) {
        activeElement.textContent = userManager.getActiveUsers();
    }
    
    if (adminElement) {
        adminElement.textContent = userManager.getAdmins().length;
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
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

// Export functions if needed
export { loadUsers, showForm, hideForm };