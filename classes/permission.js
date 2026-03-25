// permission.js - Class for permission management
import { db } from '/config/firebase-config.js';
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp,
    orderBy,
    query,
    where 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Permission {
    constructor(id, data) {
        this.id = id;
        this.role = data.role || ''; // Cambiado de rol a role
        this.permisos = data.permisos || {};
        this.fechaCreacion = data.fechaCreacion || null;
        this.fechaActualizacion = data.fechaActualizacion || null;
        
        console.log(`Permission ${id} created:`, {
            role: this.role, // Cambiado
            permisosCount: Object.keys(this.permisos).length
        });
    }

    // Get role display name
    getRoleDisplayName() {
        const roleNames = {
            admin: 'Admin',
            developer: 'Developer',
            auditor: 'Auditor',
            sales: 'Sales',
            store: 'Store'
        };
        return roleNames[this.role] || this.role; // Cambiado
    }

    // Get role icon
    getRoleIcon() {
        const roleIcons = {
            admin: 'fa-crown',
            developer: 'fa-code',
            auditor: 'fa-clipboard-check',
            sales: 'fa-chart-line',
            store: 'fa-store'
        };
        return roleIcons[this.role] || 'fa-user-tag'; // Cambiado
    }

    // Get role color class
    getRoleColorClass() {
        return `role-badge ${this.role}`; // Cambiado
    }

    // Check if has permission for a module
    hasPermission(moduleId) {
        return this.permisos[moduleId] === true;
    }

    // Get all permissions as array (IN ENGLISH)
    getPermissionsArray() {
        const modules = [
            { id: 'brands', name: 'Brand Management', icon: 'fa-tags' },
            { id: 'categories', name: 'Category Management', icon: 'fa-list' },
            { id: 'comments', name: 'Comments Management', icon: 'fa-comments' },
            { id: 'carousel', name: 'Carousel Management', icon: 'fa-images' },
            { id: 'users', name: 'User Management', icon: 'fa-users' },
            { id: 'products', name: 'Product Management', icon: 'fa-box' },
            { id: 'suppliers', name: 'Supplier Management', icon: 'fa-truck' },
            { id: 'pos', name: 'Point of Sale', icon: 'fa-cash-register' },
            { id: 'clients', name: 'Clients Management', icon: 'fas fa-users' },
            { id: 'sales', name: 'Sales History', icon: 'fa-fas fa-chart-line' },
            { id: 'permissions', name: 'Permissions Management', icon: 'fa-lock' }
        ];

        return modules.map(module => ({
            ...module,
            enabled: this.permisos[module.id] === true
        }));
    }
    // Get active modules count
    getActiveModulesCount() {
        return Object.values(this.permisos).filter(v => v === true).length;
    }

    // Get total modules count
    getTotalModulesCount() {
        return 9; // Total number of modules
    }

    toAdminHTML(isActive = true) {
        const permissionsArray = this.getPermissionsArray();
        const enabledCount = this.getActiveModulesCount();
        const totalCount = this.getTotalModulesCount();
        
        const fechaCreacion = this.fechaCreacion ? 
            this.fechaCreacion.toDate().toLocaleDateString('en-US') : 
            'No date';
        
        const fechaActualizacion = this.fechaActualizacion ? 
            this.fechaActualizacion.toDate().toLocaleDateString('en-US') : 
            'Not updated';

        const activeClass = isActive ? 'active' : 'inactive';
        const toggleBtnClass = isActive ? '' : 'inactive';
        const toggleBtnText = isActive ? 'Active' : 'Inactive';

        return `
            <div class="permission-card ${activeClass}" data-id="${this.id}" data-role="${this.role}"> {/* Cambiado */}
                <div class="permission-header-card">
                    <i class="fas ${this.getRoleIcon()}"></i>
                    <h3>${this.getRoleDisplayName()}</h3>
                    <span class="${this.getRoleColorClass()}">${this.role}</span> {/* Cambiado */}
                </div>
                <div class="permission-content">
                    <div class="permission-stats">
                        <span>
                            <i class="fas fa-check-circle"></i>
                            ${enabledCount}/${totalCount} modules
                        </span>
                    </div>
                    
                    <div class="permission-modules-preview">
                        ${permissionsArray.slice(0, 4).map(p => `
                            <span class="module-pill ${p.enabled ? 'active' : 'inactive'}">
                                <i class="fas ${p.icon}"></i>
                                ${p.enabled ? '✓' : '○'}
                            </span>
                        `).join('')}
                        ${totalCount > 4 ? `
                            <span class="module-pill">
                                <i class="fas fa-ellipsis-h"></i>
                                +${totalCount - 4} more
                            </span>
                        ` : ''}
                    </div>

                    <div class="permission-dates">
                        <span><i class="fas fa-calendar-plus"></i> ${fechaCreacion}</span>
                        <span><i class="fas fa-calendar-check"></i> ${fechaActualizacion}</span>
                    </div>
                </div>
                <div class="permission-actions">
                    <button class="btn-toggle ${toggleBtnClass}" data-id="${this.id}">
                        <i class="fas fa-power-off"></i> ${toggleBtnText}
                    </button>
                    <button class="btn-edit" data-id="${this.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-id="${this.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
}

class PermissionManager {
    constructor() {
        this.permissions = [];
        console.log('PermissionManager initialized');
    }

    async loadPermissions() {
        try {
            console.log('Starting to load permissions from Firebase...');
            
            // Order by role name - La colección sigue siendo "permisos"
            const q = query(collection(db, "permisos"), orderBy("role", "asc")); // Cambiado de rol a role
            
            const querySnapshot = await getDocs(q);
            console.log(`Firebase returned ${querySnapshot.size} documents`);
            
            this.permissions = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const permission = new Permission(doc.id, {
                    role: data.role || '', // Cambiado
                    permisos: data.permisos || {},
                    fechaCreacion: data.fechaCreacion,
                    fechaActualizacion: data.fechaActualizacion
                });
                this.permissions.push(permission);
            });
            
            console.log(`Total permissions loaded: ${this.permissions.length}`);
            
            return this.permissions;
        } catch (error) {
            console.error("Error loading permissions:", error);
            throw error;
        }
    }

    async addPermission(data) {
        try {
            console.log('Starting to add permission:', {
                role: data.role, // Cambiado
                permisosCount: Object.keys(data.permisos).length
            });
            
            // Check if role already exists
            const existing = this.getPermissionByRole(data.role); // Cambiado
            if (existing) {
                throw new Error(`Role "${data.role}" already has permissions configured`); // Cambiado
            }
            
            const permissionData = {
                role: data.role, // Cambiado
                permisos: data.permisos,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(db, "permisos"), permissionData);
            console.log(`Permission added with ID: ${docRef.id}`);
            
            // Add to local list
            const newPermission = new Permission(docRef.id, {
                ...permissionData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            this.permissions.push(newPermission);
            
            return { id: docRef.id, permission: newPermission };
        } catch (error) {
            console.error("Error adding permission:", error);
            throw error;
        }
    }

    async updatePermission(id, data) {
        try {
            console.log(`Updating permission ${id}:`, {
                role: data.role, // Cambiado
                permisosCount: Object.keys(data.permisos).length
            });
            
            const docRef = doc(db, "permisos", id);
            const updateData = {
                role: data.role, // Cambiado
                permisos: data.permisos,
                fechaActualizacion: serverTimestamp()
            };
            
            await updateDoc(docRef, updateData);
            console.log(`Permission ${id} updated successfully`);
            
            // Update in local list
            const index = this.permissions.findIndex(p => p.id === id);
            if (index !== -1) {
                this.permissions[index].role = updateData.role; // Cambiado
                this.permissions[index].permisos = updateData.permisos;
                this.permissions[index].fechaActualizacion = new Date();
            }
            
            return true;
        } catch (error) {
            console.error("Error updating permission:", error);
            throw error;
        }
    }

    async deletePermission(id) {
        try {
            console.log(`Deleting permission ${id}`);
            
            await deleteDoc(doc(db, "permisos", id));
            console.log(`Permission ${id} deleted successfully`);
            
            // Remove from local list
            this.permissions = this.permissions.filter(p => p.id !== id);
            
            return true;
        } catch (error) {
            console.error("Error deleting permission:", error);
            throw error;
        }
    }

    getPermissionById(id) {
        return this.permissions.find(p => p.id === id);
    }

    getPermissionByRole(role) { // Cambiado
        return this.permissions.find(p => p.role === role); // Cambiado
    }

    getTotalPermissions() {
        return this.permissions.length;
    }

    searchPermissions(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.permissions.filter(p => 
            p.role.toLowerCase().includes(term) || // Cambiado
            p.getRoleDisplayName().toLowerCase().includes(term)
        );
    }

    // Check if a role has permission for a module
    async checkPermission(role, moduleId) { // Cambiado
        try {
            // First try from loaded permissions
            const permission = this.getPermissionByRole(role); // Cambiado
            if (permission) {
                return permission.hasPermission(moduleId);
            }
            
            // If not loaded, query Firebase
            const q = query(collection(db, "permisos"), where("role", "==", role)); // Cambiado
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log(`No permissions found for role ${role}`); // Cambiado
                return false;
            }
            
            const data = querySnapshot.docs[0].data();
            return data.permisos?.[moduleId] === true;
        } catch (error) {
            console.error("Error checking permission:", error);
            return false;
        }
    }
}

export { Permission, PermissionManager };