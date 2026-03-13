// user.js - Class for user management with Firebase Authentication
import { db, auth } from '/config/firebase-config.js';
import { 
    collection, 
    getDocs, 
    getDoc,
    setDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp,
    orderBy,
    query 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { 
    createUserWithEmailAndPassword,
    updateProfile,
    deleteUser as deleteAuthUser
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

class User {
    constructor(id, data) {
        this.id = id; // UID de Firebase Auth
        this.email = data.email || '';
        this.firstName = data.firstName || '';
        this.lastName = data.lastName || '';
        this.fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
        this.role = data.role || 'user'; // 'admin', 'manager', 'user', etc.
        this.photo = data.photo || ''; // Base64 o URL de la imagen
        this.position = data.position || ''; // Cargo/Posición
        this.active = data.active !== undefined ? data.active : true;
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        this.lastLogin = data.lastLogin || null;
        
        console.log(`User ${id} created:`, {
            email: this.email,
            fullName: this.fullName,
            role: this.role,
            hasPhoto: !!this.photo
        });
    }

    getPhotoUrl() {
        if (!this.photo || this.photo.trim() === '') {
            return 'https://via.placeholder.com/150/0a2540/ffffff?text=No+Photo';
        }
        
        // Si ya es una data URL, retornarla
        if (this.photo.startsWith('data:image')) {
            return this.photo;
        }
        
        // Si es una URL, retornarla
        if (this.photo.startsWith('http')) {
            return this.photo;
        }
        
        // Si es base64 sin prefijo, añadirlo
        if (this.photo.length > 100 && !this.photo.includes('://')) {
            let mimeType = 'image/png';
            if (this.photo.startsWith('/9j/') || this.photo.startsWith('iVBORw')) {
                mimeType = 'image/jpeg';
            } else if (this.photo.startsWith('R0lGOD')) {
                mimeType = 'image/gif';
            }
            
            return `data:${mimeType};base64,${this.photo}`;
        }
        
        return 'https://via.placeholder.com/150/0a2540/ffffff?text=Invalid+Photo';
    }

    getRoleBadge() {
        const roles = {
            'admin': { color: '#dc3545', text: 'Admin', icon: 'fa-crown' },
            'manager': { color: '#0dcaf0', text: 'Manager', icon: 'fa-user-tie' },
            'user': { color: '#6c757d', text: 'User', icon: 'fa-user' }
        };
        
        const roleConfig = roles[this.role] || roles.user;
        return `<span style="background: ${roleConfig.color}; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
            <i class="fas ${roleConfig.icon}"></i> ${roleConfig.text}
        </span>`;
    }

    getStatusBadge() {
        if (this.active) {
            return `<span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-check-circle"></i> Active
            </span>`;
        } else {
            return `<span style="background: #6c757d; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-times-circle"></i> Inactive
            </span>`;
        }
    }

    toAdminHTML() {
        const createdAt = this.createdAt ? 
            this.createdAt.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'No date';
            
        const lastLogin = this.lastLogin ? 
            this.lastLogin.toDate().toLocaleDateString('en-US') : 'Never';

        return `
            <div class="user-item-card" data-id="${this.id}">
                <div class="user-item-image">
                    <img src="${this.getPhotoUrl()}" 
                         alt="${this.fullName}" 
                         data-user-id="${this.id}"
                         onerror="handleUserImageError(this, '${this.id}')"
                         onload="handleUserImageLoad(this, '${this.id}')">
                </div>
                <div class="user-item-content">
                    <div class="user-item-header">
                        <h4>${this.fullName}</h4>
                        <div class="user-meta">
                            ${this.getRoleBadge()}
                            ${this.getStatusBadge()}
                        </div>
                    </div>
                    
                    <div class="user-item-details">
                        <div class="detail-row">
                            <span><i class="fas fa-envelope"></i> ${this.email}</span>
                        </div>
                        <div class="detail-row">
                            <span><i class="fas fa-briefcase"></i> ${this.position || 'No position specified'}</span>
                        </div>
                        <div class="detail-row">
                            <span><i class="fas fa-calendar-plus"></i> Created: ${createdAt}</span>
                            <span><i class="fas fa-sign-in-alt"></i> Last login: ${lastLogin}</span>
                        </div>
                    </div>
                    
                    <div class="user-item-actions">
                        <button class="btn-edit" data-id="${this.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" data-id="${this.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Global image error handler for users
window.handleUserImageError = function(imgElement, userId) {
    console.error(`Image failed to load for user ${userId}`);
    imgElement.src = 'https://via.placeholder.com/150/0a2540/ffffff?text=No+Photo';
};

window.handleUserImageLoad = function(imgElement, userId) {
    console.log(`Image loaded successfully for user ${userId}`);
};

class UserManager {
    constructor() {
        this.users = [];
        console.log('UserManager initialized');
    }

    async loadUsers() {
        try {
            console.log('Starting to load users from Firestore...');
            
            // Get all users from Firestore
            const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            console.log(`Firestore returned ${querySnapshot.size} user documents`);
            
            this.users = [];
            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                console.log(`User ${index + 1} (ID: ${doc.id}):`, {
                    email: data.email,
                    fullName: data.fullName,
                    role: data.role,
                    position: data.position,
                    active: data.active
                });
                
                const user = new User(doc.id, {
                    email: data.email || '',
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    fullName: data.fullName || '',
                    role: data.role || 'user',
                    photo: data.photo || '',
                    position: data.position || '',
                    active: data.active !== undefined ? data.active : true,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    lastLogin: data.lastLogin
                });
                this.users.push(user);
            });
            
            console.log(`Total users loaded: ${this.users.length}`);
            return this.users;
            
        } catch (error) {
            console.error("Error loading users:", error);
            throw error;
        }
    }

    async createUser(userData, password) {
        try {
            console.log('Creating new user with data:', {
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                hasPassword: !!password
            });
            
            // 1. Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                userData.email, 
                password
            );
            const uid = userCredential.user.uid;
            console.log(`User created in Auth with UID: ${uid}`);
            
            // 2. Update display name in Auth
            const fullName = `${userData.firstName} ${userData.lastName}`.trim();
            await updateProfile(userCredential.user, {
                displayName: fullName
            });
            
            // 3. Create user document in Firestore
            const userDocRef = doc(db, "users", uid);
            
            const userFirestoreData = {
                email: userData.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                fullName: fullName,
                role: userData.role || 'user',
                photo: userData.photo || '',
                position: userData.position || '',
                active: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLogin: null
            };
            
            console.log('Saving user data to Firestore:', userFirestoreData);
            await setDoc(userDocRef, userFirestoreData);
            
            // 4. Add to local list
            const newUser = new User(uid, {
                ...userFirestoreData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            this.users.unshift(newUser);
            
            return { 
                id: uid, 
                user: newUser,
                credential: userCredential 
            };
            
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
    }

    async updateUser(id, data) {
        try {
            console.log(`Updating user ${id}:`, data);
            
            const docRef = doc(db, "users", id);
            
            // Prepare update data
            const updateData = {
                updatedAt: serverTimestamp()
            };
            
            // Add only fields that are provided
            if (data.firstName !== undefined) updateData.firstName = data.firstName;
            if (data.lastName !== undefined) updateData.lastName = data.lastName;
            if (data.fullName !== undefined) updateData.fullName = data.fullName;
            if (data.role !== undefined) updateData.role = data.role;
            if (data.photo !== undefined) updateData.photo = data.photo;
            if (data.position !== undefined) updateData.position = data.position;
            if (data.active !== undefined) updateData.active = data.active;
            
            // Ensure fullName is updated if firstName or lastName changed
            if (data.firstName !== undefined || data.lastName !== undefined) {
                const firstName = data.firstName !== undefined ? data.firstName : this.getUserById(id)?.firstName;
                const lastName = data.lastName !== undefined ? data.lastName : this.getUserById(id)?.lastName;
                updateData.fullName = `${firstName || ''} ${lastName || ''}`.trim();
            }
            
            console.log('Update data for Firestore:', updateData);
            await updateDoc(docRef, updateData);
            
            // Update in local list
            const index = this.users.findIndex(user => user.id === id);
            if (index !== -1) {
                Object.keys(updateData).forEach(key => {
                    if (key !== 'updatedAt') {
                        this.users[index][key] = updateData[key];
                    }
                });
                this.users[index].updatedAt = new Date();
            }
            
            return true;
            
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            console.log(`Deleting user ${id}`);
            
            // Note: For security reasons, we might not delete from Auth automatically
            // Usually you would want to disable the account instead
            // If you need to delete from Auth, you need admin privileges
            
            // Delete from Firestore
            await deleteDoc(doc(db, "users", id));
            console.log(`User ${id} deleted from Firestore`);
            
            // Remove from local list
            this.users = this.users.filter(user => user.id !== id);
            
            return true;
            
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    }

    async sendPasswordResetEmail(email) {
        try {
            // Note: This would require Firebase Admin SDK on server-side
            // For now, we'll return a mock function
            console.log(`Password reset requested for: ${email}`);
            
            // In a real implementation, you would:
            // 1. Send reset email using Firebase Admin SDK
            // 2. Or use client-side sendPasswordResetEmail (requires user to be logged out)
            
            return { success: true, message: 'Password reset email sent (simulated)' };
            
        } catch (error) {
            console.error("Error sending password reset:", error);
            throw error;
        }
    }

    getUserById(id) {
        const user = this.users.find(user => user.id === id);
        console.log(`Getting user by ID ${id}:`, user ? 'Found' : 'Not found');
        return user;
    }

    getUserByEmail(email) {
        return this.users.find(user => user.email === email);
    }

    getTotalUsers() {
        return this.users.length;
    }

    getActiveUsers() {
        return this.users.filter(user => user.active).length;
    }

    getAdmins() {
        return this.users.filter(user => user.role === 'admin');
    }

    searchUsers(searchTerm) {
        const term = searchTerm.toLowerCase();
        const results = this.users.filter(user => 
            (user.email && user.email.toLowerCase().includes(term)) ||
            (user.firstName && user.firstName.toLowerCase().includes(term)) ||
            (user.lastName && user.lastName.toLowerCase().includes(term)) ||
            (user.fullName && user.fullName.toLowerCase().includes(term)) ||
            (user.position && user.position.toLowerCase().includes(term))
        );
        console.log(`Search for "${searchTerm}": Found ${results.length} results`);
        return results;
    }

    getUsersByRole(role) {
        return this.users.filter(user => user.role === role);
    }
}

export { User, UserManager };