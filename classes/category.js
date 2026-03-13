// category.js - Class for category management
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
    query 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Category {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.imagen = data.imagen || '';
        this.fechaCreacion = data.fechaCreacion || null;
        this.fechaActualizacion = data.fechaActualizacion || null;
        
        console.log(`Category ${id} created:`, {
            nombre: this.nombre,
            hasImage: !!this.imagen,
            imageType: this.imagen ? typeof this.imagen : 'none',
            imageStartsWith: this.imagen ? this.imagen.substring(0, 50) : 'none'
        });
    }

    getImageUrl() {
        if (!this.imagen || this.imagen.trim() === '') {
            console.log(`Category ${this.nombre}: No image available`);
            return 'https://via.placeholder.com/200x200/0a2540/ffffff?text=No+Image';
        }
        
        // Debug: Check what type of string we have
        console.log(`Category ${this.nombre} image analysis:`, {
            length: this.imagen.length,
            first50: this.imagen.substring(0, 50),
            isBase64: this.imagen.startsWith('data:image'),
            isURL: this.imagen.startsWith('http')
        });
        
        // If already a data URL, return it
        if (this.imagen.startsWith('data:image')) {
            return this.imagen;
        }
        
        // If it's a URL, return it
        if (this.imagen.startsWith('http')) {
            return this.imagen;
        }
        
        // If it's just base64 without data URL prefix, add it
        if (this.imagen.length > 100 && !this.imagen.includes('://')) {
            // Try to determine image type
            let mimeType = 'image/png';
            if (this.imagen.startsWith('/9j/') || this.imagen.startsWith('iVBORw')) {
                mimeType = 'image/jpeg';
            } else if (this.imagen.startsWith('R0lGOD')) {
                mimeType = 'image/gif';
            } else if (this.imagen.startsWith('UklGR')) {
                mimeType = 'image/webp';
            }
            
            const dataUrl = `data:${mimeType};base64,${this.imagen}`;
            console.log(`Converted to data URL for ${this.nombre}:`, dataUrl.substring(0, 80));
            return dataUrl;
        }
        
        console.warn(`Category ${this.nombre}: Unknown image format`);
        return 'https://via.placeholder.com/200x200/0a2540/ffffff?text=Invalid+Image';
    }

    toAdminHTML() {
        const imageUrl = this.getImageUrl();
        const fechaCreacion = this.fechaCreacion ? 
            this.fechaCreacion.toDate().toLocaleDateString('en-US') : 
            'No date';
        
        const fechaActualizacion = this.fechaActualizacion ? 
            this.fechaActualizacion.toDate().toLocaleDateString('en-US') : 
            'Not updated';

        return `
            <div class="category-item-card" data-id="${this.id}" data-image-exists="${!!this.imagen}">
                <div class="category-item-image">
                    <img src="${imageUrl}" 
                         alt="${this.nombre} image" 
                         data-category-id="${this.id}"
                         onerror="handleCategoryImageError(this, '${this.id}')"
                         onload="handleCategoryImageLoad(this, '${this.id}')">
                    ${!this.imagen ? '<div class="no-image-warning">No Image</div>' : ''}
                </div>
                <div class="category-item-content">
                    <h4>${this.nombre}</h4>
                    <div class="category-item-meta">
                        <span><i class="fas fa-calendar-plus"></i> Created: ${fechaCreacion}</span>
                        <span><i class="fas fa-calendar-check"></i> Updated: ${fechaActualizacion}</span>
                        <span class="image-status" id="status-category-${this.id}">
                            <i class="fas fa-image"></i> ${this.imagen ? 'Has image' : 'No image'}
                        </span>
                    </div>
                    <div class="category-item-actions">
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

// Global image error handler for categories
window.handleCategoryImageError = function(imgElement, categoryId) {
    console.error(`Image failed to load for category ${categoryId}:`, {
        src: imgElement.src.substring(0, 100),
        srcLength: imgElement.src.length,
        categoryId: categoryId
    });
    
    imgElement.src = 'https://via.placeholder.com/200x200/0a2540/ffffff?text=Image+Error';
    
    // Update status
    const statusElement = document.getElementById(`status-category-${categoryId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Image error';
    }
};

window.handleCategoryImageLoad = function(imgElement, categoryId) {
    console.log(`Image loaded successfully for category ${categoryId}`);
    
    // Update status
    const statusElement = document.getElementById(`status-category-${categoryId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-check-circle text-success"></i> Image loaded';
    }
};

class CategoryManager {
    constructor() {
        this.categories = [];
        console.log('CategoryManager initialized');
    }

    async loadCategories() {
        try {
            console.log('Starting to load categories from Firebase...');
            
            // Order by creation date (newest first)
            const q = query(collection(db, "categorias"), orderBy("fechaCreacion", "desc"));
            console.log('Firebase query created');
            
            const querySnapshot = await getDocs(q);
            console.log(`Firebase returned ${querySnapshot.size} documents`);
            
            this.categories = [];
            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                console.log(`Document ${index + 1} (ID: ${doc.id}):`, {
                    nombre: data.nombre,
                    imagenExists: !!data.imagen,
                    imagenLength: data.imagen ? data.imagen.length : 0,
                    imagenPreview: data.imagen ? data.imagen.substring(0, 100) : 'No image',
                    fechaCreacion: data.fechaCreacion ? 'Has timestamp' : 'No timestamp',
                    fechaActualizacion: data.fechaActualizacion ? 'Has timestamp' : 'No timestamp'
                });
                
                // Asegurarse de que los timestamps se conviertan correctamente
                const category = new Category(doc.id, {
                    nombre: data.nombre || '',
                    imagen: data.imagen || '',
                    fechaCreacion: data.fechaCreacion,
                    fechaActualizacion: data.fechaActualizacion
                });
                this.categories.push(category);
            });
            
            console.log(`Total categories loaded: ${this.categories.length}`);
            
            return this.categories;
        } catch (error) {
            console.error("Error loading categories:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async addCategory(data) {
        try {
            console.log('Starting to add category:', {
                nombre: data.nombre,
                hasImage: !!data.imagen,
                imageLength: data.imagen ? data.imagen.length : 0
            });
            
            const categoryData = {
                nombre: data.nombre.trim(),
                imagen: data.imagen || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            console.log('Category data for Firebase:', {
                ...categoryData,
                imagenPreview: categoryData.imagen ? categoryData.imagen.substring(0, 100) : 'No image'
            });
            
            const docRef = await addDoc(collection(db, "categorias"), categoryData);
            console.log(`Category added with ID: ${docRef.id}`);
            
            // Add to local list
            const newCategory = new Category(docRef.id, {
                ...categoryData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            this.categories.unshift(newCategory);
            
            return { id: docRef.id, category: newCategory };
        } catch (error) {
            console.error("Error adding category:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async updateCategory(id, data) {
        try {
            console.log(`Updating category ${id}:`, {
                nombre: data.nombre,
                hasImage: !!data.imagen,
                imageLength: data.imagen ? data.imagen.length : 0
            });
            
            const docRef = doc(db, "categorias", id);
            const updateData = {
                nombre: data.nombre.trim(),
                fechaActualizacion: serverTimestamp()
            };
            
            // Solo actualizar imagen si se proporciona una nueva
            if (data.imagen) {
                updateData.imagen = data.imagen;
                console.log('Adding image to update:', data.imagen.substring(0, 100));
            }
            
            console.log('Update data for Firebase:', updateData);
            
            await updateDoc(docRef, updateData);
            console.log(`Category ${id} updated successfully`);
            
            // Update in local list
            const index = this.categories.findIndex(category => category.id === id);
            if (index !== -1) {
                this.categories[index].nombre = updateData.nombre;
                if (data.imagen) {
                    this.categories[index].imagen = data.imagen;
                }
                this.categories[index].fechaActualizacion = new Date();
            }
            
            return true;
        } catch (error) {
            console.error("Error updating category:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async deleteCategory(id) {
        try {
            console.log(`Deleting category ${id}`);
            
            await deleteDoc(doc(db, "categorias", id));
            console.log(`Category ${id} deleted successfully`);
            
            // Remove from local list
            this.categories = this.categories.filter(category => category.id !== id);
            
            return true;
        } catch (error) {
            console.error("Error deleting category:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    getCategoryById(id) {
        const category = this.categories.find(category => category.id === id);
        console.log(`Getting category by ID ${id}:`, category ? 'Found' : 'Not found');
        return category;
    }

    getTotalCategories() {
        return this.categories.length;
    }

    searchCategories(searchTerm) {
        const term = searchTerm.toLowerCase();
        const results = this.categories.filter(category => 
            category.nombre.toLowerCase().includes(term)
        );
        console.log(`Search for "${searchTerm}": Found ${results.length} results`);
        return results;
    }

    // Helper para validar base64
    validateImageBase64(base64String) {
        if (!base64String || base64String.trim() === '') {
            return { valid: false, error: 'Empty string' };
        }
        
        console.log('Validating base64 string:', {
            length: base64String.length,
            first100: base64String.substring(0, 100)
        });
        
        // Check if it's already a data URL
        if (base64String.startsWith('data:image')) {
            return { 
                valid: true, 
                type: 'data-url',
                mimeType: base64String.split(';')[0].replace('data:', '') 
            };
        }
        
        // Check if it might be raw base64
        const isPossibleBase64 = base64String.length > 20 && 
                               /^[A-Za-z0-9+/=]+$/.test(base64String);
        
        if (isPossibleBase64) {
            return { 
                valid: true, 
                type: 'raw-base64',
                needsConversion: true 
            };
        }
        
        return { valid: false, error: 'Not a valid image format' };
    }
    
    // Convert raw base64 to data URL
    convertToDataUrl(base64String, mimeType = 'image/png') {
        if (base64String.startsWith('data:image')) {
            console.log('Already a data URL, returning as-is');
            return base64String;
        }
        
        console.log(`Converting to data URL with mime type: ${mimeType}`);
        return `data:${mimeType};base64,${base64String}`;
    }
}

export { Category, CategoryManager };