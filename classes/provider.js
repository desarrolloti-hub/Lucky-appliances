// provider.js - Class for provider management
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

class Provider {
    constructor(id, data) {
        this.id = id;
        this.idInterno = data.idInterno || '';
        this.nombre = data.nombre || '';
        this.rfc = data.rfc || '';
        this.imagen = data.imagen || '';
        this.compras = data.compras || {}; // Map para futuras compras
        this.tiempos = data.tiempos || {}; // Map para futuros tiempos
        this.fechaCreacion = data.fechaCreacion || null;
        this.fechaActualizacion = data.fechaActualizacion || null;
        
        console.log(`Provider ${id} created:`, {
            idInterno: this.idInterno,
            nombre: this.nombre,
            rfc: this.rfc,
            hasImage: !!this.imagen,
            imageType: this.imagen ? typeof this.imagen : 'none'
        });
    }

    getImageUrl() {
        if (!this.imagen || this.imagen.trim() === '') {
            console.log(`Provider ${this.nombre}: No image available`);
            return 'https://via.placeholder.com/200x200/0a2540/ffffff?text=No+Logo';
        }
        
        console.log(`Provider ${this.nombre} image analysis:`, {
            length: this.imagen.length,
            first50: this.imagen.substring(0, 50),
            isBase64: this.imagen.startsWith('data:image'),
            isURL: this.imagen.startsWith('http')
        });
        
        if (this.imagen.startsWith('data:image')) {
            return this.imagen;
        }
        
        if (this.imagen.startsWith('http')) {
            return this.imagen;
        }
        
        if (this.imagen.length > 100 && !this.imagen.includes('://')) {
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
        
        console.warn(`Provider ${this.nombre}: Unknown image format`);
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
            <div class="provider-item-card" data-id="${this.id}" data-image-exists="${!!this.imagen}">
                <div class="provider-item-logo">
                    <img src="${imageUrl}" 
                         alt="${this.nombre} logo" 
                         data-provider-id="${this.id}"
                         onerror="handleProviderImageError(this, '${this.id}')"
                         onload="handleProviderImageLoad(this, '${this.id}')">
                    ${!this.imagen ? '<div class="no-image-warning">No Logo</div>' : ''}
                </div>
                <div class="provider-item-content">
                    <h4>${this.nombre}</h4>
                    <div class="provider-item-meta">
                        <span><i class="fas fa-hashtag"></i> ID: ${this.idInterno}</span>
                        <span><i class="fas fa-id-card"></i> RFC: ${this.rfc}</span>
                        <span><i class="fas fa-calendar-plus"></i> Created: ${fechaCreacion}</span>
                        <span><i class="fas fa-calendar-check"></i> Updated: ${fechaActualizacion}</span>
                        <span class="image-status" id="status-${this.id}">
                            <i class="fas fa-image"></i> ${this.imagen ? 'Has logo' : 'No logo'}
                        </span>
                    </div>
                    <div class="provider-item-actions">
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
window.handleProviderImageError = function(imgElement, providerId) {
    console.error(`Image failed to load for provider ${providerId}:`, {
        src: imgElement.src.substring(0, 100),
        srcLength: imgElement.src.length,
        providerId: providerId
    });
    
    imgElement.src = 'https://via.placeholder.com/200x200/0a2540/ffffff?text=Image+Error';
    
    const statusElement = document.getElementById(`status-${providerId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Image error';
    }
};

window.handleProviderImageLoad = function(imgElement, providerId) {
    console.log(`Image loaded successfully for provider ${providerId}`);
    
    const statusElement = document.getElementById(`status-${providerId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-check-circle text-success"></i> Image loaded';
    }
};

class ProviderManager {
    constructor() {
        this.providers = [];
        console.log('ProviderManager initialized');
    }

    async loadProviders() {
        try {
            console.log('Starting to load providers from Firebase...');
            
            const q = query(collection(db, "proveedores"), orderBy("fechaCreacion", "desc"));
            console.log('Firebase query created');
            
            const querySnapshot = await getDocs(q);
            console.log(`Firebase returned ${querySnapshot.size} documents`);
            
            this.providers = [];
            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                console.log(`Document ${index + 1} (ID: ${doc.id}):`, {
                    idInterno: data.idInterno,
                    nombre: data.nombre,
                    rfc: data.rfc,
                    imagenExists: !!data.imagen,
                    imagenLength: data.imagen ? data.imagen.length : 0,
                    hasCompras: !!data.compras,
                    hasTiempos: !!data.tiempos,
                    fechaCreacion: data.fechaCreacion ? 'Has timestamp' : 'No timestamp'
                });
                
                const provider = new Provider(doc.id, {
                    idInterno: data.idInterno || '',
                    nombre: data.nombre || '',
                    rfc: data.rfc || '',
                    imagen: data.imagen || '',
                    compras: data.compras || {},
                    tiempos: data.tiempos || {},
                    fechaCreacion: data.fechaCreacion,
                    fechaActualizacion: data.fechaActualizacion
                });
                this.providers.push(provider);
            });
            
            console.log(`Total providers loaded: ${this.providers.length}`);
            return this.providers;
            
        } catch (error) {
            console.error("Error loading providers:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async addProvider(data) {
        try {
            console.log('Starting to add provider:', {
                idInterno: data.idInterno,
                nombre: data.nombre,
                rfc: data.rfc,
                hasImage: !!data.imagen,
                imageLength: data.imagen ? data.imagen.length : 0
            });
            
            const providerData = {
                idInterno: data.idInterno.trim(),
                nombre: data.nombre.trim(),
                rfc: data.rfc.trim(),
                imagen: data.imagen || '',
                compras: data.compras || {},
                tiempos: data.tiempos || {},
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            console.log('Provider data for Firebase:', {
                ...providerData,
                imagenPreview: providerData.imagen ? providerData.imagen.substring(0, 100) : 'No image'
            });
            
            const docRef = await addDoc(collection(db, "proveedores"), providerData);
            console.log(`Provider added with ID: ${docRef.id}`);
            
            const newProvider = new Provider(docRef.id, {
                ...providerData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            this.providers.unshift(newProvider);
            
            return { id: docRef.id, provider: newProvider };
            
        } catch (error) {
            console.error("Error adding provider:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async updateProvider(id, data) {
        try {
            console.log(`Updating provider ${id}:`, {
                idInterno: data.idInterno,
                nombre: data.nombre,
                rfc: data.rfc,
                hasImage: !!data.imagen,
                imageLength: data.imagen ? data.imagen.length : 0
            });
            
            const docRef = doc(db, "proveedores", id);
            const updateData = {
                idInterno: data.idInterno.trim(),
                nombre: data.nombre.trim(),
                rfc: data.rfc.trim(),
                fechaActualizacion: serverTimestamp()
            };
            
            if (data.imagen) {
                updateData.imagen = data.imagen;
                console.log('Adding image to update:', data.imagen.substring(0, 100));
            }
            
            console.log('Update data for Firebase:', updateData);
            await updateDoc(docRef, updateData);
            console.log(`Provider ${id} updated successfully`);
            
            const index = this.providers.findIndex(provider => provider.id === id);
            if (index !== -1) {
                this.providers[index].idInterno = updateData.idInterno;
                this.providers[index].nombre = updateData.nombre;
                this.providers[index].rfc = updateData.rfc;
                if (data.imagen) {
                    this.providers[index].imagen = data.imagen;
                }
                this.providers[index].fechaActualizacion = new Date();
            }
            
            return true;
            
        } catch (error) {
            console.error("Error updating provider:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async deleteProvider(id) {
        try {
            console.log(`Deleting provider ${id}`);
            await deleteDoc(doc(db, "proveedores", id));
            console.log(`Provider ${id} deleted successfully`);
            
            this.providers = this.providers.filter(provider => provider.id !== id);
            return true;
            
        } catch (error) {
            console.error("Error deleting provider:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    getProviderById(id) {
        const provider = this.providers.find(provider => provider.id === id);
        console.log(`Getting provider by ID ${id}:`, provider ? 'Found' : 'Not found');
        return provider;
    }

    getTotalProviders() {
        return this.providers.length;
    }

    searchProviders(searchTerm) {
        const term = searchTerm.toLowerCase();
        const results = this.providers.filter(provider => 
            provider.nombre.toLowerCase().includes(term) ||
            provider.idInterno.toLowerCase().includes(term) ||
            provider.rfc.toLowerCase().includes(term)
        );
        console.log(`Search for "${searchTerm}": Found ${results.length} results`);
        return results;
    }

    validateImageBase64(base64String) {
        if (!base64String || base64String.trim() === '') {
            return { valid: false, error: 'Empty string' };
        }
        
        console.log('Validating base64 string:', {
            length: base64String.length,
            first100: base64String.substring(0, 100)
        });
        
        if (base64String.startsWith('data:image')) {
            return { 
                valid: true, 
                type: 'data-url',
                mimeType: base64String.split(';')[0].replace('data:', '')
            };
        }
        
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
    
    convertToDataUrl(base64String, mimeType = 'image/png') {
        if (base64String.startsWith('data:image')) {
            console.log('Already a data URL, returning as-is');
            return base64String;
        }
        
        console.log(`Converting to data URL with mime type: ${mimeType}`);
        return `data:${mimeType};base64,${base64String}`;
    }
}

export { Provider, ProviderManager };