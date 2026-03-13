// productDetail.js - Lógica para la página de detalle de producto
import { ProductManager } from '/classes/product.js';

// Variables globales
let productManager = null;
let currentProduct = null;
let allProducts = [];
let currentImageIndex = 0;
let productImages = [];

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Obtener ID del producto de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (!productId) {
            showProductNotFound();
            return;
        }
        
        // Inicializar manager
        productManager = new ProductManager();
        
        // Cargar datos iniciales
        await loadInitialData(productId);
        
        // Configurar eventos
        setupEventListeners();
        
        // Cargar producto
        await loadProductDetails(productId);
        
        // Cargar productos relacionados
        loadRelatedProducts();
        
    } catch (error) {
        console.error('Error initializing product detail page:', error);
        showError('Error loading product details. Please try again later.');
    }
});

// Cargar datos iniciales
async function loadInitialData(productId) {
    showLoading(true);
    
    try {
        // Cargar marcas, categorías y proveedores
        await productManager.loadBrandsAndCategoriesAndProviders();
        
        // Cargar productos
        await productManager.loadProducts();
        allProducts = productManager.products;
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// Cargar detalles del producto
async function loadProductDetails(productId) {
    showLoading(true);
    
    try {
        // Buscar producto por ID
        currentProduct = allProducts.find(product => product.id === productId);
        
        if (!currentProduct) {
            showProductNotFound();
            return;
        }
        
        // Mostrar contenido
        document.getElementById('productDetailContent').style.display = 'block';
        
        // Actualizar breadcrumb
        document.getElementById('breadcrumbProduct').textContent = currentProduct.Model || 'Product Details';
        
        // Actualizar información básica
        updateBasicInfo();
        
        // Actualizar imágenes
        updateProductImages();
        
        // Actualizar precios y stock
        updatePricingAndStock();
        
        // Actualizar descripción y especificaciones
        updateDescriptionAndSpecs();
        
        // Actualizar estadísticas rápidas
        updateQuickStats();
        
        // Actualizar tags
        updateTags();
        
    } catch (error) {
        console.error('Error loading product details:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// Actualizar información básica
function updateBasicInfo() {
    // Título
    document.getElementById('productTitle').textContent = currentProduct.Model || 'No Model';
    
    // Marca - NOMBRE REAL
    const brandsMap = productManager.getBrandsMap();
    const brandName = brandsMap[currentProduct.Brand] || currentProduct.Brand || 'Unknown Brand';
    document.getElementById('productBrand').innerHTML = `<i class="fas fa-tag"></i> <span>${brandName}</span>`;
    
    // Categoría - NOMBRE REAL
    const categoriesMap = productManager.getCategoriesMap();
    const categoryName = categoriesMap[currentProduct.Category] || currentProduct.Category || 'Unknown Category';
    document.getElementById('productCategory').innerHTML = `<i class="fas fa-folder"></i> <span>${categoryName}</span>`;
    
    // SKU
    document.getElementById('productSKU').innerHTML = `<i class="fas fa-barcode"></i> <span>${currentProduct.SKU || 'N/A'}</span>`;
    
    // Stock badge usando unidades
    const totalUnits = currentProduct.unidades?.length || 0;
    const stockBadge = document.getElementById('stockBadge');
    if (totalUnits > 0) {
        stockBadge.className = 'stock-badge';
        stockBadge.innerHTML = `<i class="fas fa-check"></i> In Stock (${totalUnits} available)`;
    } else {
        stockBadge.className = 'stock-badge out-of-stock';
        stockBadge.innerHTML = '<i class="fas fa-times"></i> Out of Stock';
    }
}

// Actualizar imágenes del producto - MÁXIMO 3
function updateProductImages() {
    const mainImage = document.getElementById('mainImage');
    const thumbnailsContainer = document.getElementById('thumbnailsContainer');
    
    // Obtener imágenes del producto - MÁXIMO 3
    productImages = [];
    
    if (currentProduct.getImageUrl && typeof currentProduct.getImageUrl === 'function') {
        for (let i = 0; i < 3; i++) {
            const imageUrl = currentProduct.getImageUrl(i);
            if (imageUrl && imageUrl !== '' && 
                !imageUrl.includes('placeholder') && 
                !imageUrl.includes('No+Image')) {
                productImages.push(imageUrl);
            }
        }
    }
    
    // Si no hay imágenes, usar placeholder
    if (productImages.length === 0) {
        productImages.push('https://via.placeholder.com/600x400/0a2540/ffffff?text=No+Image');
    }
    
    // Actualizar imagen principal
    mainImage.src = productImages[0];
    mainImage.alt = currentProduct.Model || 'Product Image';
    currentImageIndex = 0;
    
    // Limpiar thumbnails
    thumbnailsContainer.innerHTML = '';
    
    // Si solo hay una imagen, ocultar thumbnails
    if (productImages.length <= 1) {
        thumbnailsContainer.style.display = 'none';
        return;
    }
    
    thumbnailsContainer.style.display = 'grid';
    
    // Crear thumbnails
    productImages.forEach((imageUrl, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        thumbnail.dataset.index = index;
        
        thumbnail.innerHTML = `
            <img src="${imageUrl}" 
                 alt="Thumbnail ${index + 1}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/100x100/0a2540/ffffff?text=Error'">
        `;
        
        thumbnail.addEventListener('click', () => {
            changeMainImage(index);
        });
        
        thumbnailsContainer.appendChild(thumbnail);
    });
}

// Cambiar imagen principal
function changeMainImage(index) {
    if (index < 0 || index >= productImages.length) return;
    
    currentImageIndex = index;
    const mainImage = document.getElementById('mainImage');
    mainImage.src = productImages[index];
    
    // Actualizar thumbnails activos
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// Actualizar precios y stock
function updatePricingAndStock() {
    // Calcular unidades disponibles
    const totalUnits = currentProduct.unidades?.length || 0;
    
    // Formatear precios - USAR LOS NUEVOS CAMPOS
    const competitorPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(currentProduct.precioCompetencia || 0);

    const ourPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(currentProduct.nuestroPrecio || 0);
    
    // Actualizar precios
    const priceSection = document.querySelector('.price-section');
    if (priceSection) {
        priceSection.innerHTML = `
            <div class="price-display" style="margin-bottom: 10px;">
                <span class="price-label">Competitor Price:</span>
                <span class="price-value" style="color: var(--products-gray); text-decoration: line-through; font-size: 1rem;">${competitorPrice}</span>
            </div>
            <div class="price-display">
                <span class="price-label">Our Price:</span>
                <span class="price-value" style="font-size: 2rem; color: var(--products-price);">${ourPrice}</span>
            </div>
        `;
    }
    
    // Actualizar stock
    document.getElementById('stockQuantity').textContent = totalUnits;
    document.getElementById('productLocation').textContent = currentProduct.Location || 'Not specified';
}

// Actualizar descripción y especificaciones
function updateDescriptionAndSpecs() {
    // Descripción
    const description = currentProduct.ItemDescription || 
                       'No description available for this product.';
    document.getElementById('productDescription').textContent = description;
    
    // Especificaciones - SOLO DATOS RELEVANTES PARA USUARIO
    const specsGrid = document.getElementById('specsGrid');
    specsGrid.innerHTML = '';
    
    // Obtener mapas de nombres
    const brandsMap = productManager.getBrandsMap();
    const categoriesMap = productManager.getCategoriesMap();
    
    // Especificaciones para el usuario
    const userSpecs = [
        { label: 'Model', value: currentProduct.Model || 'N/A' },
        { label: 'SKU', value: currentProduct.SKU || 'N/A' },
        { label: 'Brand', value: brandsMap[currentProduct.Brand] || currentProduct.Brand || 'N/A' },
        { label: 'Category', value: categoriesMap[currentProduct.Category] || currentProduct.Category || 'N/A' },
        { label: 'Location', value: currentProduct.Location || 'N/A' },
        { label: 'Weight', value: currentProduct.UnitWeight ? `${currentProduct.UnitWeight} lbs` : 'N/A' }
    ];
    
    // Añadir especificaciones adicionales relevantes
    if (currentProduct.especificaciones) {
        userSpecs.push({ 
            label: 'Specifications', 
            value: currentProduct.especificaciones 
        });
    }
    
    // Crear elementos de especificaciones
    userSpecs.forEach(spec => {
        if (spec.value && spec.value !== 'N/A') {
            const specItem = document.createElement('div');
            specItem.className = 'spec-item';
            specItem.innerHTML = `
                <span class="spec-label">${spec.label}:</span>
                <span class="spec-value">${spec.value}</span>
            `;
            specsGrid.appendChild(specItem);
        }
    });
}

// Actualizar estadísticas rápidas
function updateQuickStats() {
    const totalUnits = currentProduct.unidades?.length || 0;
    
    // Our Price
    document.getElementById('unitCost').textContent = formatCurrency(currentProduct.nuestroPrecio || 0);
    
    // Ahorro vs Competencia
    if (currentProduct.precioCompetencia && currentProduct.nuestroPrecio) {
        const savings = currentProduct.precioCompetencia - currentProduct.nuestroPrecio;
        const savingsPercent = (savings / currentProduct.precioCompetencia * 100).toFixed(1);
        document.getElementById('margin').innerHTML = `
            <div style="color: var(--products-price);">
                Save ${formatCurrency(savings)} (${savingsPercent}%)
            </div>
        `;
    } else {
        document.getElementById('margin').textContent = 'Best Price';
    }
    
    // Weight
    document.getElementById('productWeight').textContent = 
        currentProduct.UnitWeight ? `${currentProduct.UnitWeight} lbs` : 'N/A';
}

// Actualizar tags
function updateTags() {
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = '';
    
    // Obtener mapas de nombres
    const brandsMap = productManager.getBrandsMap();
    const categoriesMap = productManager.getCategoriesMap();
    
    const tags = [];
    
    // Marca
    const brandName = brandsMap[currentProduct.Brand];
    if (brandName) tags.push(brandName);
    
    // Categoría
    const categoryName = categoriesMap[currentProduct.Category];
    if (categoryName) tags.push(categoryName);
    
    // Ubicación
    if (currentProduct.Location) tags.push(currentProduct.Location);
    
    // Tags basados en stock
    const totalUnits = currentProduct.unidades?.length || 0;
    if (totalUnits > 10) tags.push('High Stock');
    if (totalUnits > 0 && totalUnits <= 5) tags.push('Limited Stock');
    if (totalUnits === 0) tags.push('Out of Stock');
    
    // Tags basados en precio
    if (currentProduct.nuestroPrecio > 1000) tags.push('Premium');
    if (currentProduct.nuestroPrecio < 100) tags.push('Budget Friendly');
    
    // Comparación con competencia
    if (currentProduct.precioCompetencia && currentProduct.nuestroPrecio) {
        if (currentProduct.nuestroPrecio < currentProduct.precioCompetencia) {
            tags.push('Best Price');
            const savingsPercent = ((currentProduct.precioCompetencia - currentProduct.nuestroPrecio) / 
                                   currentProduct.precioCompetencia * 100).toFixed(0);
            if (parseInt(savingsPercent) > 20) {
                tags.push(`${savingsPercent}% Cheaper`);
            }
        }
    }
    
    // Crear elementos de tag
    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
    });
    
    // Si no hay tags, mostrar mensaje
    if (tags.length === 0) {
        tagsContainer.innerHTML = '<span class="no-tags">No tags available</span>';
    }
}

// Cargar productos relacionados
function loadRelatedProducts() {
    if (!currentProduct) return;
    
    // Mostrar sección
    document.getElementById('relatedProductsSection').style.display = 'block';
    
    const totalUnits = currentProduct.unidades?.length || 0;
    
    // Productos de misma categoría
    const sameCategoryProducts = allProducts.filter(product => 
        product.id !== currentProduct.id && 
        product.Category === currentProduct.Category &&
        (product.unidades?.length || 0) > 0
    ).slice(0, 4);
    
    // Productos de misma marca
    const sameBrandProducts = allProducts.filter(product => 
        product.id !== currentProduct.id && 
        product.Brand === currentProduct.Brand &&
        (product.unidades?.length || 0) > 0
    ).slice(0, 4);
    
    // Actualizar pestañas
    updateRelatedProductsTab('sameCategoryProducts', sameCategoryProducts, 'noCategoryProducts');
    updateRelatedProductsTab('sameBrandProducts', sameBrandProducts, 'noBrandProducts');
}

// Actualizar pestaña de productos relacionados
function updateRelatedProductsTab(containerId, products, noProductsId) {
    const container = document.getElementById(containerId);
    const noProducts = document.getElementById(noProductsId);
    
    if (products.length === 0) {
        container.style.display = 'none';
        noProducts.style.display = 'flex';
        return;
    }
    
    container.style.display = 'grid';
    noProducts.style.display = 'none';
    container.innerHTML = '';
    
    const brandsMap = productManager.getBrandsMap();
    const categoriesMap = productManager.getCategoriesMap();
    
    products.forEach(product => {
        const card = createRelatedProductCard(product, brandsMap, categoriesMap);
        container.appendChild(card);
    });
}

// Crear tarjeta de producto relacionado
function createRelatedProductCard(product, brandsMap, categoriesMap) {
    const card = document.createElement('div');
    card.className = 'related-product-card';
    
    // Obtener nombres reales
    const brandName = brandsMap[product.Brand] || product.Brand || 'Unknown Brand';
    const categoryName = categoriesMap[product.Category] || product.Category || 'Unknown Category';
    const totalUnits = product.unidades?.length || 0;
    
    // Obtener imagen
    let mainImage = '';
    if (product.getImageUrl && typeof product.getImageUrl === 'function') {
        for (let i = 0; i < 3; i++) {
            const imageUrl = product.getImageUrl(i);
            if (imageUrl && imageUrl !== '' && !imageUrl.includes('placeholder')) {
                mainImage = imageUrl;
                break;
            }
        }
    }
    
    if (!mainImage) {
        mainImage = 'https://via.placeholder.com/250x150/0a2540/ffffff?text=No+Image';
    }
    
    const ourPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(product.nuestroPrecio || 0);
    
    card.innerHTML = `
        <div class="related-product-image">
            <img src="${mainImage}" 
                 alt="${product.Model || 'Product'}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/250x150/0a2540/ffffff?text=No+Image'">
        </div>
        <div class="related-product-content">
            <h3 class="related-product-title">${product.Model || 'No Model'}</h3>
            <div class="related-product-price">${ourPrice}</div>
            <div class="related-product-meta">
                <span><i class="fas fa-tag"></i> ${brandName}</span>
                <span><i class="fas fa-box"></i> ${totalUnits} units</span>
            </div>
            <button class="view-detail-btn" onclick="viewRelatedProduct('${product.id}')">
                <i class="fas fa-search"></i>
                View Details
            </button>
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.view-detail-btn')) {
            viewRelatedProduct(product.id);
        }
    });
    
    return card;
}

// Ver producto relacionado
function viewRelatedProduct(productId) {
    window.location.href = `productDetail.html?id=${productId}`;
}

// Configurar event listeners
function setupEventListeners() {
    // Botones de imagen
    document.getElementById('zoomBtn').addEventListener('click', openImageModal);
    document.getElementById('fullscreenBtn').addEventListener('click', openImageModal);
    
    // Botón de compartir
    document.getElementById('shareBtn').addEventListener('click', shareProduct);
    
    // Botón de contacto
    document.getElementById('contactBtn').addEventListener('click', contactAboutProduct);
    
    // Tabs de productos relacionados
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchRelatedTab(tabId);
        });
    });
    
    // Modal de imagen
    document.getElementById('closeModal').addEventListener('click', closeImageModal);
    document.getElementById('prevImage').addEventListener('click', showPrevImage);
    document.getElementById('nextImage').addEventListener('click', showNextImage);
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
    
    // Cerrar modal haciendo click fuera
    document.getElementById('imageModal').addEventListener('click', (e) => {
        if (e.target.id === 'imageModal') {
            closeImageModal();
        }
    });
}

// Cambiar pestaña de productos relacionados
function switchRelatedTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });
}

// Abrir modal de imagen
function openImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageCounter = document.getElementById('imageCounter');
    
    if (productImages.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Images',
            text: 'No images available for this product'
        });
        return;
    }
    
    modalImage.src = productImages[currentImageIndex];
    imageCounter.textContent = `${currentImageIndex + 1} / ${productImages.length}`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Cerrar modal de imagen
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Mostrar imagen anterior
function showPrevImage() {
    if (productImages.length === 0) return;
    
    if (currentImageIndex > 0) {
        currentImageIndex--;
    } else {
        currentImageIndex = productImages.length - 1;
    }
    
    document.getElementById('modalImage').src = productImages[currentImageIndex];
    document.getElementById('imageCounter').textContent = `${currentImageIndex + 1} / ${productImages.length}`;
}

// Mostrar siguiente imagen
function showNextImage() {
    if (productImages.length === 0) return;
    
    if (currentImageIndex < productImages.length - 1) {
        currentImageIndex++;
    } else {
        currentImageIndex = 0;
    }
    
    document.getElementById('modalImage').src = productImages[currentImageIndex];
    document.getElementById('imageCounter').textContent = `${currentImageIndex + 1} / ${productImages.length}`;
}

// Compartir producto
function shareProduct() {
    if (!currentProduct) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Product information not available'
        });
        return;
    }
    
    const productTitle = currentProduct.Model || 'Check out this product';
    const productUrl = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: `${productTitle} - Lucky Appliances`,
            text: `Check out this product from Lucky Appliances: ${productTitle}`,
            url: productUrl
        }).catch(() => {
            fallbackShare(productUrl);
        });
    } else {
        fallbackShare(productUrl);
    }
}

// Fallback para compartir
function fallbackShare(url) {
    navigator.clipboard.writeText(url).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Link Copied!',
            text: 'Product link copied to clipboard',
            timer: 2000,
            showConfirmButton: false
        });
    }).catch(() => {
        Swal.fire({
            icon: 'info',
            title: 'Share Product',
            html: `<p>Copy this link to share:</p><p style="word-break: break-all;">${url}</p>`,
            showConfirmButton: true,
            confirmButtonText: 'OK'
        });
    });
}

// Contactar sobre producto
function contactAboutProduct() {
    if (!currentProduct) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Product information not available'
        });
        return;
    }
    
    const productTitle = currentProduct.Model || 'Product';
    const productSKU = currentProduct.SKU || 'N/A';
    const totalUnits = currentProduct.unidades?.length || 0;
    const location = currentProduct.Location || 'Not specified';
    
    // Obtener nombres reales
    const brandsMap = productManager.getBrandsMap();
    const categoriesMap = productManager.getCategoriesMap();
    const brandName = brandsMap[currentProduct.Brand] || currentProduct.Brand || 'N/A';
    const categoryName = categoriesMap[currentProduct.Category] || currentProduct.Category || 'N/A';
    
    const ourPrice = formatCurrency(currentProduct.nuestroPrecio || 0);
    const competitorPrice = formatCurrency(currentProduct.precioCompetencia || 0);
    const productUrl = window.location.href;
    
    const productInfo = `📦 PRODUCT INFORMATION
• Product: ${productTitle}
• SKU: ${productSKU}
• Brand: ${brandName}
• Category: ${categoryName}
• Our Price: ${ourPrice}
• Competitor Price: ${competitorPrice}
• Available Units: ${totalUnits}
• Location: ${location}
• Product Link: ${productUrl}`;
    
    Swal.fire({
        title: 'Contact About This Product',
        html: `
        <div style="text-align: left;">
            <div style="background: var(--product-light-gray); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px;">${productTitle}</h4>
                <p><strong>SKU:</strong> ${productSKU}</p>
                <p><strong>Brand:</strong> ${brandName}</p>
                <p><strong>Our Price:</strong> ${ourPrice}</p>
                <p><strong>Available:</strong> ${totalUnits} units</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="contact-option-btn" style="background: #25d366; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer;" id="whatsappBtn">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button class="contact-option-btn" style="background: #0084ff; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer;" id="messengerBtn">
                    <i class="fab fa-facebook-messenger"></i> Messenger
                </button>
            </div>
        </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            document.getElementById('whatsappBtn').addEventListener('click', () => {
                const whatsappMessage = encodeURIComponent(`Hello! I'm interested in this product:\n\n${productInfo}`);
                window.open(`https://wa.me/17147279106?text=${whatsappMessage}`, '_blank');
                Swal.close();
            });
            
            document.getElementById('messengerBtn').addEventListener('click', () => {
                window.open('https://www.facebook.com/share/1B7jKatnwR/?mibextid=wwXIfr', '_blank');
                Swal.close();
            });
        }
    });
}

// Mostrar producto no encontrado
function showProductNotFound() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('productNotFound').style.display = 'flex';
}

// Mostrar error
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('productDetailContent').style.display = 'none';
    
    const content = document.querySelector('.product-detail-main .container');
    content.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Error Loading Product</h2>
            <p>${message}</p>
            <button onclick="location.reload()" class="btn-primary">
                <i class="fas fa-redo"></i>
                Try Again
            </button>
        </div>
    `;
}

// Mostrar/ocultar loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

// Función auxiliar para formatear moneda
function formatCurrency(value) {
    if (!value && value !== 0) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

// Hacer funciones disponibles globalmente
window.viewRelatedProduct = viewRelatedProduct;