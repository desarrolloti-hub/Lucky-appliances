// brand.js - Class for brand management
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

class Brand {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.imagen = data.imagen || '';
        this.fechaCreacion = data.fechaCreacion || null;
        this.fechaActualizacion = data.fechaActualizacion || null;
        
        console.log(`Brand ${id} created:`, {
            nombre: this.nombre,
            hasImage: !!this.imagen,
            imageType: this.imagen ? typeof this.imagen : 'none',
            imageStartsWith: this.imagen ? this.imagen.substring(0, 50) : 'none'
        });
    }

    getImageUrl() {
        if (!this.imagen || this.imagen.trim() === '') {
            console.log(`Brand ${this.nombre}: No image available`);
            return 'https://via.placeholder.com/200x200/0a2540/ffffff?text=No+Logo';
        }
        
        // Debug: Check what type of string we have
        console.log(`Brand ${this.nombre} image analysis:`, {
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
        
        console.warn(`Brand ${this.nombre}: Unknown image format`);
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
            <div class="brand-item-card" data-id="${this.id}" data-image-exists="${!!this.imagen}">
                <div class="brand-item-logo">
                    <img src="${imageUrl}" 
                         alt="${this.nombre} logo" 
                         data-brand-id="${this.id}"
                         onerror="handleImageError(this, '${this.id}')"
                         onload="handleImageLoad(this, '${this.id}')">
                    ${!this.imagen ? '<div class="no-image-warning">No Logo</div>' : ''}
                </div>
                <div class="brand-item-content">
                    <h4>${this.nombre}</h4>
                    <div class="brand-item-meta">
                        <span><i class="fas fa-calendar-plus"></i> Created: ${fechaCreacion}</span>
                        <span><i class="fas fa-calendar-check"></i> Updated: ${fechaActualizacion}</span>
                        <span class="image-status" id="status-${this.id}">
                            <i class="fas fa-image"></i> ${this.imagen ? 'Has logo' : 'No logo'}
                        </span>
                    </div>
                    <div class="brand-item-actions">
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

// Global image error handler
window.handleImageError = function(imgElement, brandId) {
    console.error(`Image failed to load for brand ${brandId}:`, {
        src: imgElement.src.substring(0, 100),
        srcLength: imgElement.src.length,
        brandId: brandId
    });
    
    imgElement.src = 'https://via.placeholder.com/200x200/0a2540/ffffff?text=Image+Error';
    
    // Update status
    const statusElement = document.getElementById(`status-${brandId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Image error';
    }
};

window.handleImageLoad = function(imgElement, brandId) {
    console.log(`Image loaded successfully for brand ${brandId}`);
    
    // Update status
    const statusElement = document.getElementById(`status-${brandId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-check-circle text-success"></i> Image loaded';
    }
};

class BrandManager {
    constructor() {
        this.brands = [];
        console.log('BrandManager initialized');
    }

    async loadBrands() {
        try {
            console.log('Starting to load brands from Firebase...');
            
            // Order by creation date (newest first)
            const q = query(collection(db, "marcas"), orderBy("fechaCreacion", "desc"));
            console.log('Firebase query created');
            
            const querySnapshot = await getDocs(q);
            console.log(`Firebase returned ${querySnapshot.size} documents`);
            
            this.brands = [];
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
                const brand = new Brand(doc.id, {
                    nombre: data.nombre || '',
                    imagen: data.imagen || '',
                    fechaCreacion: data.fechaCreacion,
                    fechaActualizacion: data.fechaActualizacion
                });
                this.brands.push(brand);
            });
            
            console.log(`Total brands loaded: ${this.brands.length}`);
            
            return this.brands;
        } catch (error) {
            console.error("Error loading brands:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async addBrand(data) {
        try {
            console.log('Starting to add brand:', {
                nombre: data.nombre,
                hasImage: !!data.imagen,
                imageLength: data.imagen ? data.imagen.length : 0
            });
            
            const brandData = {
                nombre: data.nombre.trim(),
                imagen: data.imagen || '', // Guardar base64
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            console.log('Brand data for Firebase:', {
                ...brandData,
                imagenPreview: brandData.imagen ? brandData.imagen.substring(0, 100) : 'No image'
            });
            
            const docRef = await addDoc(collection(db, "marcas"), brandData);
            console.log(`Brand added with ID: ${docRef.id}`);
            
            // Add to local list
            const newBrand = new Brand(docRef.id, {
                ...brandData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            this.brands.unshift(newBrand);
            
            return { id: docRef.id, brand: newBrand };
        } catch (error) {
            console.error("Error adding brand:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async updateBrand(id, data) {
        try {
            console.log(`Updating brand ${id}:`, {
                nombre: data.nombre,
                hasImage: !!data.imagen,
                imageLength: data.imagen ? data.imagen.length : 0
            });
            
            const docRef = doc(db, "marcas", id);
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
            console.log(`Brand ${id} updated successfully`);
            
            // Update in local list
            const index = this.brands.findIndex(brand => brand.id === id);
            if (index !== -1) {
                this.brands[index].nombre = updateData.nombre;
                if (data.imagen) {
                    this.brands[index].imagen = data.imagen;
                }
                this.brands[index].fechaActualizacion = new Date();
            }
            
            return true;
        } catch (error) {
            console.error("Error updating brand:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async deleteBrand(id) {
        try {
            console.log(`Deleting brand ${id}`);
            
            await deleteDoc(doc(db, "marcas", id));
            console.log(`Brand ${id} deleted successfully`);
            
            // Remove from local list
            this.brands = this.brands.filter(brand => brand.id !== id);
            
            return true;
        } catch (error) {
            console.error("Error deleting brand:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    getBrandById(id) {
        const brand = this.brands.find(brand => brand.id === id);
        console.log(`Getting brand by ID ${id}:`, brand ? 'Found' : 'Not found');
        return brand;
    }

    getTotalBrands() {
        return this.brands.length;
    }

    searchBrands(searchTerm) {
        const term = searchTerm.toLowerCase();
        const results = this.brands.filter(brand => 
            brand.nombre.toLowerCase().includes(term)
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

export { Brand, BrandManager };