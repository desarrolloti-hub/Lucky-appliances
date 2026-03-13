// product.js - Class for product management
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

class Product {
    constructor(id, data) {
        this.id = id;
        this.Brand = data.Brand || ''; // Brand ID
        this.Category = data.Category || ''; // Category ID
        this.Provider = data.Provider || ''; // Provider ID - NUEVO
        this.idInterno = data.idInterno || ''; // NUEVO - ID interno del producto
        this.ItemDescription = data.ItemDescription || '';
        this.especificaciones = data.especificaciones || ''; // NUEVO - Especificaciones
        this.Location = data.Location || '';
        this.Model = data.Model || '';
        this.SKU = data.SKU || '';
        this.Subcategory = data.Subcategory || '';
        this.UnitWeight = data.UnitWeight || 0;
        this.images = data.images || []; // Array de strings base64
        
        // NUEVOS CAMPOS DE PRECIOS
        this.precioCompetencia = data.precioCompetencia || 0;
        this.nuestroPrecio = data.nuestroPrecio || 0;
        
        // NUEVO - Array de unidades con su historial
        this.unidades = data.unidades || []; // Array de objetos con numeroSerie e historial
        
        // NUEVOS CAMPOS DE AUDITORÍA
        this.fechaIngreso = data.fechaIngreso || null; // Fecha de ingreso del producto
        this.usuarioIngreso = data.usuarioIngreso || ''; // ID del usuario que creó el producto
        this.fechaCreacion = data.fechaCreacion || null;
        this.fechaActualizacion = data.fechaActualizacion || null;
        
        // Para almacenar nombres de brand, category y provider
        this.brandName = data.brandName || '';
        this.categoryName = data.categoryName || '';
        this.providerName = data.providerName || ''; // NUEVO - Nombre del proveedor
        
        console.log(`Product ${id} created:`, {
            Model: this.Model,
            SKU: this.SKU,
            idInterno: this.idInterno,
            Brand: this.Brand,
            Category: this.Category,
            Provider: this.Provider,
            unidadesCount: this.unidades ? this.unidades.length : 0,
            hasImages: this.images ? this.images.length : 0
        });
    }

    getImageUrl(index = 0) {
        if (!this.images || this.images.length === 0) {
            console.log(`Product ${this.Model}: No images available`);
            return 'https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image';
        }
        
        const image = this.images[index];
        
        if (!image || image.trim() === '') {
            console.log(`Product ${this.Model}: Image ${index} is empty`);
            return 'https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image';
        }
        
        // Debug: Check what type of string we have
        console.log(`Product ${this.Model} image ${index} analysis:`, {
            length: image.length,
            first50: image.substring(0, 50),
            isBase64: image.startsWith('data:image'),
            isURL: image.startsWith('http')
        });
        
        // If already a data URL, return it
        if (image.startsWith('data:image')) {
            return image;
        }
        
        // If it's a URL, return it
        if (image.startsWith('http')) {
            return image;
        }
        
        // If it's just base64 without data URL prefix, add it
        if (image.length > 100 && !image.includes('://')) {
            // Try to determine image type
            let mimeType = 'image/png';
            if (image.startsWith('/9j/') || image.startsWith('iVBORw')) {
                mimeType = 'image/jpeg';
            } else if (image.startsWith('R0lGOD')) {
                mimeType = 'image/gif';
            } else if (image.startsWith('UklGR')) {
                mimeType = 'image/webp';
            }
            
            const dataUrl = `data:${mimeType};base64,${image}`;
            console.log(`Converted to data URL for ${this.Model}:`, dataUrl.substring(0, 80));
            return dataUrl;
        }
        
        console.warn(`Product ${this.Model}: Unknown image format`);
        return 'https://via.placeholder.com/300x200/0a2540/ffffff?text=Invalid+Image';
    }

    getBrandName() {
        return this.brandName || 'No brand';
    }

    getCategoryName() {
        return this.categoryName || 'No category';
    }

    getProviderName() {
        return this.providerName || 'No provider';
    }

    // NUEVO - Obtener conteo total de unidades
    getTotalUnidades() {
        return this.unidades ? this.unidades.length : 0;
    }

    // NUEVO - Agregar una nueva unidad con su historial inicial
    agregarUnidad(numeroSerie, usuarioId) {
        if (!this.unidades) {
            this.unidades = [];
        }
        
        const nuevaUnidad = {
            numeroSerie: numeroSerie,
            historial: [
                {
                    fechaMovimiento: new Date(),
                    movimiento: 1, // Primer movimiento
                    descripcionMovimiento: 'Warehouse entry',
                    idUsuario: usuarioId,
                    tipoMovimiento: 'entrada'
                }
            ]
        };
        
        this.unidades.push(nuevaUnidad);
        return nuevaUnidad;
    }

    // NUEVO - Obtener historial completo de una unidad
    getHistorialUnidad(numeroSerie) {
        const unidad = this.unidades?.find(u => u.numeroSerie === numeroSerie);
        return unidad?.historial || [];
    }

    // NUEVO - Obtener todas las unidades
    getUnidades() {
        return this.unidades || [];
    }

    // NUEVO - Calcular precio con formato
    getPrecioCompetenciaFormatted() {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(this.precioCompetencia || 0);
    }

    getNuestroPrecioFormatted() {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(this.nuestroPrecio || 0);
    }

    toAdminHTML(brandsMap = {}, categoriesMap = {}, providersMap = {}) {
        const brandName = brandsMap[this.Brand] || this.getBrandName();
        const categoryName = categoriesMap[this.Category] || this.getCategoryName();
        const providerName = providersMap[this.Provider] || this.getProviderName(); // NUEVO
        const mainImage = this.getImageUrl(0);
        
        // Fechas
        const fechaIngreso = this.fechaIngreso ? 
            this.fechaIngreso.toDate().toLocaleDateString('en-US') : 
            'No date';
        
        const fechaCreacion = this.fechaCreacion ? 
            this.fechaCreacion.toDate().toLocaleDateString('en-US') : 
            'No date';
        
        const fechaActualizacion = this.fechaActualizacion ? 
            this.fechaActualizacion.toDate().toLocaleDateString('en-US') : 
            'Not updated';

        // Formato de precios
        const precioCompetencia = this.getPrecioCompetenciaFormatted();
        const nuestroPrecio = this.getNuestroPrecioFormatted();

        // Conteo de unidades
        const totalUnidades = this.getTotalUnidades();

        return `
            <div class="product-item-card" data-id="${this.id}" data-images-count="${this.images?.length || 0}">
                <div class="product-item-image">
                    <img src="${mainImage}" 
                         alt="${this.Model}" 
                         data-product-id="${this.id}"
                         onerror="handleProductImageError(this, '${this.id}')"
                         onload="handleProductImageLoad(this, '${this.id}')">
                    ${this.images?.length === 0 ? '<div class="no-image-warning">No Images</div>' : ''}
                    ${this.images?.length > 1 ? `<div class="image-count">+${this.images.length - 1}</div>` : ''}
                </div>
                <div class="product-item-content">
                    <div class="product-item-header">
                        <h4>${this.Model || 'No Model'}</h4>
                        <span class="sku">SKU: ${this.SKU || 'N/A'}</span>
                        <span class="id-interno">ID: ${this.idInterno || 'N/A'}</span>
                    </div>
                    
                    <div class="product-item-description">
                        <p><strong>Description:</strong> ${this.ItemDescription || 'No description'}</p>
                        <p><strong>Specs:</strong> ${this.especificaciones || 'No specs'}</p>
                    </div>
                    
                    <div class="product-item-details">
                        <div class="detail-row">
                            <span><i class="fas fa-tag"></i> ${brandName}</span>
                            <span><i class="fas fa-folder"></i> ${categoryName}</span>
                        </div>
                        <div class="detail-row">
                            <span><i class="fas fa-truck"></i> ${providerName}</span>
                            <span><i class="fas fa-cubes"></i> Units: ${totalUnidades}</span>
                        </div>
                        <div class="detail-row pricing-row">
                            <span><i class="fas fa-tag"></i> Competitor: ${precioCompetencia}</span>
                            <span><i class="fas fa-dollar-sign"></i> Our Price: ${nuestroPrecio}</span>
                        </div>
                        <div class="detail-row">
                            <span><i class="fas fa-weight"></i> ${this.UnitWeight || 0} lbs</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${this.Location || 'No location'}</span>
                        </div>
                        <div class="detail-row audit-row">
                            <span><i class="fas fa-calendar-alt"></i> Entry: ${fechaIngreso}</span>
                            <span><i class="fas fa-user"></i> User: ${this.usuarioIngreso || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="product-item-actions">
                        <button class="btn-edit" data-id="${this.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-view" data-id="${this.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn-unidades" data-id="${this.id}">
                            <i class="fas fa-cubes"></i> Units (${totalUnidades})
                        </button>
                        <button class="btn-delete" data-id="${this.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    toSelectOption() {
        return `<option value="${this.id}">${this.Model} (${this.SKU}) - ${this.idInterno || ''}</option>`;
    }
}

// Global image error handler for products
window.handleProductImageError = function(imgElement, productId) {
    console.error(`Image failed to load for product ${productId}:`, {
        src: imgElement.src.substring(0, 100),
        srcLength: imgElement.src.length,
        productId: productId
    });
    
    imgElement.src = 'https://via.placeholder.com/300x200/0a2540/ffffff?text=Image+Error';
    
    // Update status if exists
    const statusElement = document.getElementById(`status-product-${productId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Image error';
    }
};

window.handleProductImageLoad = function(imgElement, productId) {
    console.log(`Image loaded successfully for product ${productId}`);
    
    // Update status if exists
    const statusElement = document.getElementById(`status-product-${productId}`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-check-circle text-success"></i> Image loaded';
    }
};

class ProductManager {
    constructor() {
        this.products = [];
        this.brands = [];
        this.categories = [];
        this.providers = []; // NUEVO - Para almacenar proveedores
        console.log('ProductManager initialized');
    }

    // NUEVO - Obtener usuario del localStorage
    getCurrentUserId() {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                return user.uid || user.id || 'unknown-user';
            }
        } catch (error) {
            console.error('Error getting user from localStorage:', error);
        }
        return 'system';
    }

    async loadProducts() {
        try {
            console.log('Starting to load products from Firebase...');
            
            // Order by creation date (newest first)
            const q = query(collection(db, "products"), orderBy("fechaCreacion", "desc"));
            console.log('Firebase query created');
            
            const querySnapshot = await getDocs(q);
            console.log(`Firebase returned ${querySnapshot.size} documents`);
            
            this.products = [];
            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                console.log(`Product ${index + 1} (ID: ${doc.id}):`, {
                    Model: data.Model,
                    SKU: data.SKU,
                    idInterno: data.idInterno,
                    Brand: data.Brand,
                    Category: data.Category,
                    Provider: data.Provider,
                    unidadesCount: data.unidades ? data.unidades.length : 0,
                    imagesCount: data.images ? data.images.length : 0,
                    precioCompetencia: data.precioCompetencia,
                    nuestroPrecio: data.nuestroPrecio,
                    usuarioIngreso: data.usuarioIngreso
                });
                
                const product = new Product(doc.id, {
                    Brand: data.Brand || '',
                    Category: data.Category || '',
                    Provider: data.Provider || '', // NUEVO
                    idInterno: data.idInterno || '', // NUEVO
                    ItemDescription: data.ItemDescription || '',
                    especificaciones: data.especificaciones || '', // NUEVO
                    Location: data.Location || '',
                    Model: data.Model || '',
                    SKU: data.SKU || '',
                    Subcategory: data.Subcategory || '',
                    UnitWeight: data.UnitWeight || 0,
                    images: data.images || [],
                    precioCompetencia: data.precioCompetencia || 0, // NUEVO
                    nuestroPrecio: data.nuestroPrecio || 0, // NUEVO
                    unidades: data.unidades || [], // NUEVO
                    fechaIngreso: data.fechaIngreso || null, // NUEVO
                    usuarioIngreso: data.usuarioIngreso || '', // NUEVO
                    fechaCreacion: data.fechaCreacion,
                    fechaActualizacion: data.fechaActualizacion
                });
                this.products.push(product);
            });
            
            console.log(`Total products loaded: ${this.products.length}`);
            
            return this.products;
        } catch (error) {
            console.error("Error loading products:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    // Agregar este método a la clase ProductManager en product.js
// Colócalo después del método loadProducts()

    /**
     * Carga productos con paginación y búsqueda
     * @param {number} page - Número de página (1-based)
     * @param {number} itemsPerPage - Cantidad de items por página
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Promise<{products: Array, total: number}>}
     */
    async loadProductsPaginated(page = 1, itemsPerPage = 10, searchTerm = '') {
        try {
            console.log(`Loading paginated products - Page: ${page}, Items per page: ${itemsPerPage}, Search: "${searchTerm}"`);
            
            // Primero aseguramos que tenemos los productos cargados
            await this.loadProducts();
            
            // Filtramos por término de búsqueda si existe
            let filteredProducts = this.products;
            
            if (searchTerm && searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase().trim();
                
                filteredProducts = this.products.filter(product => {
                    // Buscar en campos principales
                    const modelMatch = product.Model?.toLowerCase().includes(term);
                    const skuMatch = product.SKU?.toLowerCase().includes(term);
                    const idInternoMatch = product.idInterno?.toLowerCase().includes(term);
                    const descriptionMatch = product.ItemDescription?.toLowerCase().includes(term);
                    const specsMatch = product.especificaciones?.toLowerCase().includes(term);
                    const locationMatch = product.Location?.toLowerCase().includes(term);
                    
                    // Buscar en números de serie de unidades
                    let serialMatch = false;
                    if (product.unidades && Array.isArray(product.unidades)) {
                        serialMatch = product.unidades.some(u => 
                            u.numeroSerie?.toLowerCase().includes(term)
                        );
                    }
                    
                    return modelMatch || skuMatch || idInternoMatch || descriptionMatch || 
                        specsMatch || locationMatch || serialMatch;
                });
                
                console.log(`Search found ${filteredProducts.length} products matching "${searchTerm}"`);
            }
            
            // Calcular paginación
            const total = filteredProducts.length;
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedProducts = filteredProducts.slice(start, end);
            
            console.log(`Returning ${paginatedProducts.length} products (page ${page} of ${Math.ceil(total / itemsPerPage)})`);
            
            return {
                products: paginatedProducts,
                total: total
            };
            
        } catch (error) {
            console.error('Error loading paginated products:', error);
            throw error;
        }
    }

    // NUEVO - Cargar proveedores
    async loadProviders() {
        try {
            console.log('Loading providers for products...');
            
            const providersQuery = query(collection(db, "proveedores"), orderBy("nombre", "asc"));
            const providersSnapshot = await getDocs(providersQuery);
            this.providers = [];
            providersSnapshot.forEach((doc) => {
                const data = doc.data();
                this.providers.push({
                    id: doc.id,
                    nombre: data.nombre || '',
                    idInterno: data.idInterno || ''
                });
            });
            console.log(`Providers loaded: ${this.providers.length}`);
            
            return this.providers;
        } catch (error) {
            console.error("Error loading providers:", error);
            throw error;
        }
    }

    // Método para cargar marcas, categorías y proveedores
    async loadBrandsAndCategoriesAndProviders() {
        try {
            console.log('Loading brands, categories and providers for products...');
            
            // Cargar marcas
            const brandsQuery = query(collection(db, "marcas"), orderBy("nombre", "asc"));
            const brandsSnapshot = await getDocs(brandsQuery);
            this.brands = [];
            brandsSnapshot.forEach((doc) => {
                const data = doc.data();
                this.brands.push({
                    id: doc.id,
                    nombre: data.nombre || '',
                    imagen: data.imagen || ''
                });
            });
            console.log(`Brands loaded: ${this.brands.length}`);
            
            // Cargar categorías
            const categoriesQuery = query(collection(db, "categorias"), orderBy("nombre", "asc"));
            const categoriesSnapshot = await getDocs(categoriesQuery);
            this.categories = [];
            categoriesSnapshot.forEach((doc) => {
                const data = doc.data();
                this.categories.push({
                    id: doc.id,
                    nombre: data.nombre || '',
                    imagen: data.imagen || ''
                });
            });
            console.log(`Categories loaded: ${this.categories.length}`);
            
            // Cargar proveedores
            await this.loadProviders();
            
            return {
                brands: this.brands,
                categories: this.categories,
                providers: this.providers
            };
        } catch (error) {
            console.error("Error loading brands, categories and providers:", error);
            throw error;
        }
    }

    async addProduct(data) {
        try {
            console.log('Starting to add product:', {
                Model: data.Model,
                SKU: data.SKU,
                idInterno: data.idInterno,
                Brand: data.Brand,
                Category: data.Category,
                Provider: data.Provider,
                unidadesCount: data.unidades ? data.unidades.length : 0,
                imagesCount: data.images ? data.images.length : 0
            });
            
            // Obtener usuario actual
            const usuarioId = this.getCurrentUserId();
            
            const productData = {
                Brand: data.Brand || '',
                Category: data.Category || '',
                Provider: data.Provider || '', // NUEVO
                idInterno: data.idInterno || '', // NUEVO
                ItemDescription: data.ItemDescription || '',
                especificaciones: data.especificaciones || '', // NUEVO
                Location: data.Location || '',
                Model: data.Model || '',
                SKU: data.SKU || '',
                Subcategory: data.Subcategory || '',
                UnitWeight: data.UnitWeight || 0,
                images: data.images || [],
                precioCompetencia: data.precioCompetencia || 0, // NUEVO
                nuestroPrecio: data.nuestroPrecio || 0, // NUEVO
                unidades: data.unidades || [], // NUEVO
                fechaIngreso: data.fechaIngreso || serverTimestamp(), // NUEVO
                usuarioIngreso: data.usuarioIngreso || usuarioId, // NUEVO
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            console.log('Product data for Firebase:', {
                ...productData,
                imagesCount: productData.images.length,
                unidadesCount: productData.unidades.length,
                firstImagePreview: productData.images[0] ? 
                    productData.images[0].substring(0, 100) : 'No image',
                usuarioIngreso: productData.usuarioIngreso
            });
            
            const docRef = await addDoc(collection(db, "products"), productData);
            console.log(`Product added with ID: ${docRef.id}`);
            
            // Add to local list
            const newProduct = new Product(docRef.id, {
                ...productData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                fechaIngreso: new Date()
            });
            this.products.unshift(newProduct);
            
            return { id: docRef.id, product: newProduct };
        } catch (error) {
            console.error("Error adding product:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    // NUEVO - Agregar unidad a un producto existente
    async addProductUnit(productId, numeroSerie) {
        try {
            const product = this.getProductById(productId);
            if (!product) {
                throw new Error('Product not found');
            }
            
            const usuarioId = this.getCurrentUserId();
            const nuevaUnidad = product.agregarUnidad(numeroSerie, usuarioId);
            
            // Actualizar en Firebase
            const docRef = doc(db, "products", productId);
            await updateDoc(docRef, {
                unidades: product.unidades,
                fechaActualizacion: serverTimestamp()
            });
            
            console.log(`Unit added to product ${productId}:`, nuevaUnidad);
            return nuevaUnidad;
        } catch (error) {
            console.error("Error adding product unit:", error);
            throw error;
        }
    }

    async updateProduct(id, data) {
        try {
            console.log(`Updating product ${id}:`, {
                Model: data.Model,
                SKU: data.SKU,
                idInterno: data.idInterno,
                Brand: data.Brand,
                Category: data.Category,
                Provider: data.Provider,
                unidadesCount: data.unidades ? data.unidades.length : 0,
                imagesCount: data.images ? data.images.length : 0
            });
            
            const docRef = doc(db, "products", id);
            
            const updateData = {
                fechaActualizacion: serverTimestamp()
            };
            
            // Add only fields that are provided
            if (data.Brand !== undefined) updateData.Brand = data.Brand;
            if (data.Category !== undefined) updateData.Category = data.Category;
            if (data.Provider !== undefined) updateData.Provider = data.Provider; // NUEVO
            if (data.idInterno !== undefined) updateData.idInterno = data.idInterno; // NUEVO
            if (data.ItemDescription !== undefined) updateData.ItemDescription = data.ItemDescription;
            if (data.especificaciones !== undefined) updateData.especificaciones = data.especificaciones; // NUEVO
            if (data.Location !== undefined) updateData.Location = data.Location;
            if (data.Model !== undefined) updateData.Model = data.Model;
            if (data.SKU !== undefined) updateData.SKU = data.SKU;
            if (data.Subcategory !== undefined) updateData.Subcategory = data.Subcategory;
            if (data.UnitWeight !== undefined) updateData.UnitWeight = data.UnitWeight;
            if (data.images !== undefined) updateData.images = data.images;
            if (data.precioCompetencia !== undefined) updateData.precioCompetencia = data.precioCompetencia; // NUEVO
            if (data.nuestroPrecio !== undefined) updateData.nuestroPrecio = data.nuestroPrecio; // NUEVO
            if (data.unidades !== undefined) updateData.unidades = data.unidades; // NUEVO
            
            console.log('Update data for Firebase:', updateData);
            
            await updateDoc(docRef, updateData);
            console.log(`Product ${id} updated successfully`);
            
            // Update in local list
            const index = this.products.findIndex(product => product.id === id);
            if (index !== -1) {
                Object.keys(updateData).forEach(key => {
                    if (key !== 'fechaActualizacion') {
                        this.products[index][key] = updateData[key];
                    }
                });
                this.products[index].fechaActualizacion = new Date();
            }
            
            return true;
        } catch (error) {
            console.error("Error updating product:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async deleteProduct(id) {
        try {
            console.log(`Deleting product ${id}`);
            
            await deleteDoc(doc(db, "products", id));
            console.log(`Product ${id} deleted successfully`);
            
            // Remove from local list
            this.products = this.products.filter(product => product.id !== id);
            
            return true;
        } catch (error) {
            console.error("Error deleting product:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    getProductById(id) {
        const product = this.products.find(product => product.id === id);
        console.log(`Getting product by ID ${id}:`, product ? 'Found' : 'Not found');
        return product;
    }

    getTotalProducts() {
        return this.products.length;
    }

    // NUEVO - Valor total del inventario basado en nuestro precio
    getTotalInventoryValue() {
        return this.products.reduce((total, product) => {
            return total + ((product.nuestroPrecio || 0) * (product.unidades?.length || 0));
        }, 0);
    }

    // NUEVO - Total de unidades
    getTotalQuantity() {
        return this.products.reduce((total, product) => {
            return total + (product.unidades?.length || 0);
        }, 0);
    }

    searchProducts(searchTerm) {
        const term = searchTerm.toLowerCase();
        const results = this.products.filter(product => 
            (product.Model && product.Model.toLowerCase().includes(term)) ||
            (product.SKU && product.SKU.toLowerCase().includes(term)) ||
            (product.idInterno && product.idInterno.toLowerCase().includes(term)) || // NUEVO
            (product.ItemDescription && product.ItemDescription.toLowerCase().includes(term)) ||
            (product.especificaciones && product.especificaciones.toLowerCase().includes(term)) || // NUEVO
            (product.Location && product.Location.toLowerCase().includes(term)) ||
            (product.unidades?.some(u => u.numeroSerie && u.numeroSerie.toLowerCase().includes(term))) // NUEVO
        );
        console.log(`Search for "${searchTerm}": Found ${results.length} results`);
        return results;
    }

    getProductsByBrand(brandId) {
        return this.products.filter(product => product.Brand === brandId);
    }

    getProductsByCategory(categoryId) {
        return this.products.filter(product => product.Category === categoryId);
    }

    getProductsByProvider(providerId) {
        return this.products.filter(product => product.Provider === providerId);
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

    // Helper para obtener mapa de nombres de marcas, categorías y proveedores
    getBrandsMap() {
        const map = {};
        this.brands.forEach(brand => {
            map[brand.id] = brand.nombre;
        });
        return map;
    }

    getCategoriesMap() {
        const map = {};
        this.categories.forEach(category => {
            map[category.id] = category.nombre;
        });
        return map;
    }

    getProvidersMap() { // NUEVO
        const map = {};
        this.providers.forEach(provider => {
            map[provider.id] = provider.nombre;
        });
        return map;
    }
}

export { Product, ProductManager };