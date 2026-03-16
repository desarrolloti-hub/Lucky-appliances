// permissionAdmin.js - CRUD for permission management with SweetAlert
import { PermissionManager } from '/classes/permission.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Create global instance
const permissionManager = new PermissionManager();

// Available modules for permissions (IN ENGLISH)
const MODULES = [
    { id: 'brands', name: 'Brand Management', icon: 'fa-tags' },
    { id: 'categories', name: 'Category Management', icon: 'fa-list' },
    { id: 'comments', name: 'Comments Management', icon: 'fa-comments' },
    { id: 'carousel', name: 'Carousel Management', icon: 'fa-images' },
    { id: 'users', name: 'User Management', icon: 'fa-users' },
    { id: 'products', name: 'Product Management', icon: 'fa-box' },
    { id: 'suppliers', name: 'Supplier Management', icon: 'fa-truck' },
    { id: 'pos', name: 'Point of Sale', icon: 'fa-cash-register' },
    { id: 'permissions', name: 'Permissions Management', icon: 'fa-lock' }
];

// Role icons and colors
const ROLE_CONFIG = {
    admin: { 
        icon: 'fa-crown', 
        color: '#dc3545',
        displayName: 'Administrator',
        description: 'Full system access'
    },
    developer: { 
        icon: 'fa-code', 
        color: '#6f42c1',
        displayName: 'Developer',
        description: 'Technical access'
    },
    auditor: { 
        icon: 'fa-clipboard-check', 
        color: '#17a2b8',
        displayName: 'Auditor',
        description: 'Read-only access'
    },
    sales: { 
        icon: 'fa-chart-line', 
        color: '#28a745',
        displayName: 'Sales',
        description: 'Sales management'
    },
    store: { 
        icon: 'fa-store', 
        color: '#fd7e14',
        displayName: 'Store',
        description: 'Store operations'
    }
};

// Module display names for better readability
const MODULE_DISPLAY_NAMES = {
    brands: 'Brands',
    categories: 'Categories',
    comments: 'Comments',
    carousel: 'Carousel',
    users: 'Users',
    products: 'Products',
    suppliers: 'Suppliers',
    pos: 'POS',
    permissions: 'Permissions'
};

// Status tracking
let roleStatus = {};

document.addEventListener('DOMContentLoaded', function() {
    // Load permissions
    loadPermissions();
    
    // Configure events
    setupEventListeners();
});

async function loadPermissions() {
    try {
        showLoading(true);
        const permissions = await permissionManager.loadPermissions();
        const container = document.getElementById('permissionContainer');
        
        console.log('Loaded permissions:', permissions.length);
        
        if (permissions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <p>No permissions configured yet</p>
                    <button id="addFirstBtn" class="btn-primary">
                        <i class="fas fa-plus"></i> Configure first role
                    </button>
                </div>
            `;
            
            // Add event to empty state button
            document.getElementById('addFirstBtn')?.addEventListener('click', () => {
                showForm();
            });
            
        } else {
            // Initialize status for all roles (default to active)
            permissions.forEach(p => {
                if (roleStatus[p.id] === undefined) {
                    roleStatus[p.id] = true; // true = active
                }
            });
            
            renderPermissionCards(permissions);
        }
        
        // Update counter
        updateItemCount();
        
    } catch (error) {
        console.error('Error loading permissions:', error);
        showError('Error loading permissions: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function renderPermissionCards(permissions) {
    const container = document.getElementById('permissionContainer');
    container.innerHTML = permissions.map(permission => {
        const isActive = roleStatus[permission.id] !== false;
        return createPermissionCard(permission, isActive);
    }).join('');
    
    attachButtonEvents();
}

function createPermissionCard(permission, isActive) {
    const roleConfig = ROLE_CONFIG[permission.role] || { 
        icon: 'fa-user', 
        color: '#6c757d',
        displayName: permission.role.charAt(0).toUpperCase() + permission.role.slice(1),
        description: 'Custom role'
    };
    
    // Get permissions summary
    const permissionsList = permission.permisos || {};
    const totalModules = MODULES.length;
    const activeModules = Object.values(permissionsList).filter(v => v === true).length;
    const activePercentage = Math.round((activeModules / totalModules) * 100);
    
    // Generate module pills (show first 4 active modules)
    const activeModuleIds = Object.entries(permissionsList)
        .filter(([_, value]) => value === true)
        .map(([key]) => key)
        .slice(0, 4);
    
    const modulePills = activeModuleIds.map(moduleId => 
        `<span class="module-pill active" title="${MODULE_DISPLAY_NAMES[moduleId] || moduleId} - Full access">
            <i class="fas fa-check-circle"></i>
            ${MODULE_DISPLAY_NAMES[moduleId] || moduleId}
        </span>`
    ).join('');
    
    // If no active modules
    const modulesDisplay = modulePills || '<span class="module-pill inactive">No modules assigned</span>';
    
    // Access count indicator
    const remainingModules = activeModules > 4 ? activeModules - 4 : 0;
    
    return `
        <div class="permission-card ${isActive ? 'active' : 'inactive'}" data-id="${permission.id}">
            <div class="permission-header-card" style="border-left: 4px solid ${roleConfig.color}">
                <i class="fas ${roleConfig.icon}"></i>
                <div class="header-info-compact">
                    <h3>${roleConfig.displayName}</h3>
                    <span class="role-description">${roleConfig.description}</span>
                </div>
                <span class="role-badge" style="background: ${roleConfig.color}20; color: ${roleConfig.color}">
                    ${permission.role}
                </span>
            </div>
            
            <div class="permission-content">
                <div class="permission-stats">
                    <span>
                        <i class="fas fa-check-circle" style="color: #28a745"></i>
                        ${activeModules}/${totalModules} modules
                    </span>
                    <span class="access-level ${activePercentage >= 70 ? 'high' : activePercentage >= 30 ? 'medium' : 'low'}">
                        <i class="fas fa-signal"></i>
                        ${activePercentage}% access
                    </span>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${activePercentage}%; background: ${roleConfig.color}"></div>
                </div>
                
                <div class="permission-modules-preview">
                    ${modulesDisplay}
                    ${remainingModules > 0 ? 
                        `<span class="module-pill more" title="${activeModules - 4} more modules">+${remainingModules} more</span>` : 
                        ''}
                </div>
                
                <div class="permission-dates">
                    <span title="Date created">
                        <i class="fas fa-calendar-plus"></i>
                        Created: ${formatDate(permission.fechaCreacion)}
                    </span>
                    <span title="Last modified">
                        <i class="fas fa-calendar-check"></i>
                        Updated: ${formatDate(permission.fechaActualizacion)}
                    </span>
                </div>
            </div>
            
            <div class="permission-actions">
                <button class="btn-edit" data-id="${permission.id}" title="Edit permissions">
                    <i class="fas fa-edit"></i>
                    <span>Edit</span>
                </button>
            </div>
        </div>
    `;
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        let date;
        
        // Si es el objeto de Firestore con seconds y nanoseconds
        if (timestamp.seconds && timestamp.nanoseconds !== undefined) {
            // Convertir seconds a milisegundos
            date = new Date(timestamp.seconds * 1000);
        }
        // Si ya es un número (timestamp en milisegundos)
        else if (typeof timestamp === 'number') {
            date = new Date(timestamp);
        }
        // Si es string con formato de fecha
        else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        }
        else {
            console.warn('Formato de timestamp no reconocido:', timestamp);
            return 'N/A';
        }
        
        // Verificar si la fecha es válida
        if (isNaN(date.getTime())) {
            console.warn('Fecha inválida después de conversión:', timestamp);
            return 'N/A';
        }
        
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
}

function attachButtonEvents() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            editPermission(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            confirmDeletePermission(id);
        });
    });
}

function setupEventListeners() {
    // Add button in header
    document.getElementById('addBtn')?.addEventListener('click', () => {
        showForm();
    });
    
    // Search input
    document.getElementById('searchInput')?.addEventListener('input', function(e) {
        searchPermissions(e.target.value);
    });
    
    // Form buttons
    document.getElementById('cancelBtn')?.addEventListener('click', hideForm);
    document.getElementById('cancelBtn2')?.addEventListener('click', hideForm);
    document.getElementById('permissionForm')?.addEventListener('submit', handleFormSubmit);
    
    // Close form with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('formContainer').style.display === 'block') {
            hideForm();
        }
    });
    
    // Overlay to close form
    document.getElementById('formOverlay')?.addEventListener('click', hideForm);
}

function searchPermissions(searchTerm) {
    if (searchTerm.trim() === '') {
        renderPermissionCards(permissionManager.permissions);
        updateItemCount();
        return;
    }
    
    const filteredPermissions = permissionManager.searchPermissions(searchTerm);
    
    if (filteredPermissions.length === 0) {
        document.getElementById('permissionContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No roles found for "${searchTerm}"</p>
                <p class="text-light">Try a different search term</p>
            </div>
        `;
    } else {
        renderPermissionCards(filteredPermissions);
    }
}

function showForm() {
    document.getElementById('formTitle').textContent = 'Configure Role Permissions';
    document.getElementById('formContainer').style.display = 'block';
    document.getElementById('formOverlay').style.display = 'block';
    document.getElementById('itemId').value = '';
    document.getElementById('permissionForm').reset();
    
    // Asegurarse de que el campo role no esté deshabilitado
    document.getElementById('role').disabled = false;
    
    // Load permissions list - ¡ESTA ES LA PARTE IMPORTANTE!
    renderPermissionsList({});
    
    // Focus first field
    setTimeout(() => {
        document.getElementById('role').focus();
    }, 100);
}

// Función para renderizar la lista de módulos con checkboxes
function renderPermissionsList(selectedPermissions = {}) {
    const listContainer = document.getElementById('permissionsList');
    
    if (!listContainer) {
        console.error('Container permissionsList not found');
        return;
    }
    
    listContainer.innerHTML = MODULES.map(module => {
        const isChecked = selectedPermissions[module.id] === true;
        return `
            <div class="permission-checkbox-item">
                <label class="permission-checkbox-label">
                    <i class="fas ${module.icon}"></i>
                    ${module.name}
                </label>
                <input type="checkbox" 
                       class="permission-checkbox" 
                       data-module="${module.id}"
                       ${isChecked ? 'checked' : ''}>
            </div>
        `;
    }).join('');
}

function getSelectedPermissions() {
    const checkboxes = document.querySelectorAll('.permission-checkbox');
    const permissions = {};
    
    checkboxes.forEach(checkbox => {
        permissions[checkbox.dataset.module] = checkbox.checked;
    });
    
    return permissions;
}

async function editPermission(id) {
    try {
        const permission = permissionManager.getPermissionById(id);
        if (!permission) {
            showError('Permission configuration not found');
            return;
        }
        
        document.getElementById('formTitle').textContent = 'Edit Role Permissions';
        document.getElementById('formContainer').style.display = 'block';
        document.getElementById('formOverlay').style.display = 'block';
        document.getElementById('itemId').value = id;
        document.getElementById('role').value = permission.role;
        document.getElementById('role').disabled = true; // Disable role change on edit
        
        // Render permissions with current values - ¡IMPORTANTE!
        renderPermissionsList(permission.permisos || {});
        
    } catch (error) {
        console.error('Error loading permission for edit:', error);
        showError('Error loading permission for edit: ' + error.message);
    }
}

function hideForm() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('formOverlay').style.display = 'none';
    document.getElementById('permissionForm').reset();
    document.getElementById('role').disabled = false; // Re-enable role field
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('itemId').value;
    const role = document.getElementById('role').value;
    const permisos = getSelectedPermissions();
    
    // Basic validations
    if (!role) {
        showWarning('Please select a role');
        document.getElementById('role').focus();
        return;
    }
    
    // Check if at least one permission is selected
    const hasPermissions = Object.values(permisos).some(value => value === true);
    if (!hasPermissions) {
        const confirm = await Swal.fire({
            title: 'No permissions selected',
            text: 'This role will have no access to any module. Are you sure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, continue',
            cancelButtonText: 'No, go back'
        });
        
        if (!confirm.isConfirmed) {
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
    
    const permissionData = {
        role: role,
        permisos: permisos
    };
    
    console.log('Saving permission data:', permissionData);
    
    try {
        if (id) {
            await permissionManager.updatePermission(id, permissionData);
            
            // Initialize status for this role if not exists
            if (roleStatus[id] === undefined) {
                roleStatus[id] = true;
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Permissions updated successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } else {
            // Check if role already has permissions
            const existing = permissionManager.getPermissionByRole(role);
            if (existing) {
                Swal.close();
                showWarning(`Role "${role}" already has permissions configured. Please edit the existing configuration.`);
                return;
            }
            
            const result = await permissionManager.addPermission(permissionData);
            console.log('Permission added successfully:', result.id);
            
            // Initialize status for new role
            roleStatus[result.id] = true;
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Permissions added successfully!',
                timer: 3000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        }
        
        // Reload list and hide form
        await loadPermissions();
        hideForm();
        
    } catch (error) {
        console.error('Error saving permissions:', error);
        showError('Error saving permissions: ' + error.message);
    } finally {
        Swal.close();
    }
}

async function confirmDeletePermission(id) {
    const permission = permissionManager.getPermissionById(id);
    if (!permission) return;
    
    const roleDisplay = ROLE_CONFIG[permission.role]?.displayName || permission.role;
    
    Swal.fire({
        title: 'Delete role permissions?',
        html: `Are you sure you want to delete permissions for <strong>"${roleDisplay}"</strong>?`,
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
                await permissionManager.deletePermission(id);
                
                // Remove from status tracking
                delete roleStatus[id];
                
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Permissions deleted successfully!',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                await loadPermissions();
            } catch (error) {
                console.error('Error deleting permissions:', error);
                showError('Error deleting permissions: ' + error.message);
            }
        }
    });
}

function updateItemCount() {
    const countElement = document.getElementById('itemCount');
    if (countElement) {
        countElement.textContent = permissionManager.getTotalPermissions();
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

// Notification functions
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