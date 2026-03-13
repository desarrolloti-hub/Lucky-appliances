// products.js - Lógica para la página de productos
import { ProductManager } from '/classes/product.js';

// Variables globales
let productManager = null;
let allProducts = [];
let filteredProducts = [];
let currentFilters = {
    search: '',
    brands: [],
    categories: [],
    minPrice: null,
    maxPrice: null,
    inStock: true,
    outOfStock: false,
    sortBy: 'newest'
};
let currentPage = 1;
const productsPerPage = 12;
let currentView = 'grid'; // 'grid' or 'list'

// Obtener parámetros de la URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        category: params.get('category'),
        brand: params.get('brand')
    };
}

// Obtener el ID de la categoría desde la URL
function getCategoryFromUrl() {
    const params = getUrlParams();
    return params.category;
}

// Obtener el ID de la marca desde la URL
function getBrandFromUrl() {
    const params = getUrlParams();
    return params.brand;
}

// Marcar categoría específica en el filtro
function markCategoryInFilter(categoryId) {
    if (!categoryId) return;
    
    // Intentar varias veces con un pequeño delay
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryMarkCategory = () => {
        attempts++;
        
        const checkbox = document.querySelector(`.category-checkbox[value="${categoryId}"]`);
        if (checkbox) {
            checkbox.checked = true;
            // Actualizar el filtro automáticamente
            currentFilters.categories = [categoryId];
            // Aplicar filtros con un pequeño delay
            setTimeout(() => applyFilters(), 50);
        } else if (attempts < maxAttempts) {
            // Intentar de nuevo en 100ms
            setTimeout(tryMarkCategory, 100);
        } else {
            console.warn(`Could not find checkbox for category ID: ${categoryId}`);
        }
    };
    
    // Empezar a intentar
    tryMarkCategory();
}

// Marcar marca específica en el filtro
function markBrandInFilter(brandId) {
    if (!brandId) return;
    
    // Intentar varias veces con un pequeño delay
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryMarkBrand = () => {
        attempts++;
        
        const checkbox = document.querySelector(`.brand-checkbox[value="${brandId}"]`);
        if (checkbox) {
            checkbox.checked = true;
            // Actualizar el filtro automáticamente
            currentFilters.brands = [brandId];
            // Aplicar filtros con un pequeño delay
            setTimeout(() => applyFilters(), 50);
        } else if (attempts < maxAttempts) {
            // Intentar de nuevo en 100ms
            setTimeout(tryMarkBrand, 100);
        } else {
            console.warn(`Could not find checkbox for brand ID: ${brandId}`);
        }
    };
    
    // Empezar a intentar
    tryMarkBrand();
}

// Actualizar título y header según categoría o marca
function updatePageTitleByParams() {
    const categoryId = getCategoryFromUrl();
    const brandId = getBrandFromUrl();
    
    // Si hay marca en la URL
    if (brandId) {
        setTimeout(() => {
            // Buscar el nombre de la marca
            const brand = productManager.brands.find(b => b.id === brandId);
            if (brand) {
                // Actualizar el título de la página
                document.title = `${brand.nombre} | Lucky Appliances`;
                
                // Actualizar el header
                const headerTitle = document.querySelector('.header-content h1');
                if (headerTitle) {
                    headerTitle.innerHTML = `
                        <i class="fas fa-tag"></i>
                        ${brand.nombre}
                    `;
                }
                
                const headerDescription = document.querySelector('.header-description');
                if (headerDescription) {
                    headerDescription.textContent = `Browse ${brand.nombre} products`;
                }
            } else {
                console.warn(`Brand with ID ${brandId} not found`);
            }
        }, 100);
    }
    // Si hay categoría en la URL (y no hay marca)
    else if (categoryId) {
        setTimeout(() => {
            // Buscar el nombre de la categoría
            const category = productManager.categories.find(cat => cat.id === categoryId);
            if (category) {
                // Actualizar el título de la página
                document.title = `${category.nombre} | Lucky Appliances`;
                
                // Actualizar el header
                const headerTitle = document.querySelector('.header-content h1');
                if (headerTitle) {
                    headerTitle.innerHTML = `
                        <i class="fas fa-folder"></i>
                        ${category.nombre}
                    `;
                }
                
                const headerDescription = document.querySelector('.header-description');
                if (headerDescription) {
                    headerDescription.textContent = `Browse our ${category.nombre.toLowerCase()} collection`;
                }
            } else {
                console.warn(`Category with ID ${categoryId} not found`);
            }
        }, 100);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Inicializar manager
        productManager = new ProductManager();
        
        // Cargar datos iniciales
        await loadInitialData();
        
        // Configurar eventos
        setupEventListeners();
        
        // Configurar acordeón
        setupAccordion();
        
        // Manejar sidebar responsive
        handleResponsiveSidebar();
        
        // Aplicar filtros iniciales
        applyFilters();
        
        // Añadir evento resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                handleResponsiveSidebar();
                optimizeCardsForMobile();
            }, 250);
        });
        
    } catch (error) {
        console.error('Error initializing products page:', error);
        showError('Error loading products. Please try again later.');
    }
});

// Cargar datos iniciales
async function loadInitialData() {
    showLoading(true);
    
    try {
        // Cargar marcas, categorías y proveedores - CORREGIDO: nombre del método
        await productManager.loadBrandsAndCategoriesAndProviders();
        
        // Cargar productos
        await productManager.loadProducts();
        allProducts = productManager.products;
        
        // Cargar filtros de marcas y categorías
        loadBrandsFilter();
        loadCategoriesFilter();
        
        // Verificar si hay parámetros en la URL y marcarlos
        const categoryFromUrl = getCategoryFromUrl();
        const brandFromUrl = getBrandFromUrl();
        
        if (categoryFromUrl) {
            markCategoryInFilter(categoryFromUrl);
        }
        
        if (brandFromUrl) {
            markBrandInFilter(brandFromUrl);
        }
        
        // Actualizar título según parámetros - AHORA DESPUÉS de cargar las categorías/marcas
        updatePageTitleByParams();
        
        // Mostrar estadísticas iniciales
        updateResultsCount();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// Cargar filtro de marcas
function loadBrandsFilter() {
    const container = document.getElementById('brandsFilter');
    if (!container) return;
    
    container.innerHTML = '';
    
    productManager.brands.forEach(brand => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" value="${brand.id}" class="brand-checkbox">
            <span>${brand.nombre}</span>
        `;
        container.appendChild(label);
    });
    
    // Añadir eventos a los checkboxes
    container.querySelectorAll('.brand-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateBrandsFilter);
    });
}

// Cargar filtro de categorías
function loadCategoriesFilter() {
    const container = document.getElementById('categoriesFilter');
    if (!container) return;
    
    container.innerHTML = '';
    
    productManager.categories.forEach(category => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" value="${category.id}" class="category-checkbox">
            <span>${category.nombre}</span>
        `;
        container.appendChild(label);
    });
    
    // Añadir eventos a los checkboxes
    container.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateCategoriesFilter);
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda
    document.getElementById('searchInput').addEventListener('input', function(e) {
        currentFilters.search = e.target.value;
        applyFilters();
    });
    
    // Filtros de precio
    document.getElementById('applyPrice').addEventListener('click', applyPriceFilter);
    
    // Filtros de stock
    document.getElementById('inStock').addEventListener('change', updateStockFilter);
    document.getElementById('outOfStock').addEventListener('change', updateStockFilter);
    
    // Ordenar
    document.getElementById('sortBy').addEventListener('change', function(e) {
        currentFilters.sortBy = e.target.value;
        applyFilters();
    });
    
    // Limpiar filtros
    document.getElementById('clearFilters').addEventListener('click', function() {
        const categoryFromUrl = getCategoryFromUrl();
        const brandFromUrl = getBrandFromUrl();
        
        // Si hay parámetros en la URL, mostrar confirmación específica
        if (categoryFromUrl || brandFromUrl) {
            let message = "Do you want to clear all filters ";
            if (categoryFromUrl && brandFromUrl) {
                message += "except the current category and brand?";
            } else if (categoryFromUrl) {
                message += "except the current category?";
            } else if (brandFromUrl) {
                message += "except the current brand?";
            }
            
            if (confirm(message)) {
                clearAllFilters();
            }
        } else {
            clearAllFilters();
        }
    });
    
    // Botón reset en el mensaje de no resultados
    setTimeout(() => {
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                clearAllFilters();
                // Asegurarse de que el mensaje de no resultados se oculte
                const noResults = document.getElementById('noResults');
                if (noResults) {
                    noResults.style.display = 'none';
                }
            });
        }
    }, 500);
    
    // Cambiar vista
    document.getElementById('gridView').addEventListener('click', () => setView('grid'));
    document.getElementById('listView').addEventListener('click', () => setView('list'));
    
    // Paginación
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('page-btn')) {
            const page = parseInt(e.target.dataset.page);
            if (page && !isNaN(page)) {
                goToPage(page);
            }
        }
    });
    
    // Enter key para aplicar precio
    document.getElementById('minPrice').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') applyPriceFilter();
    });
    
    document.getElementById('maxPrice').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') applyPriceFilter();
    });
}

// Funcionalidad de acordeón para filtros
function setupAccordion() {
    const filterHeaders = document.querySelectorAll('.filter-header');
    
    filterHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            // Si estamos en desktop (1024px+), no hacer nada (sin acordeón)
            if (window.innerWidth >= 1024) {
                return;
            }
            
            e.stopPropagation();
            const section = header.closest('.filter-section');
            
            // Alternar estado activo
            const isActive = section.classList.contains('active');
            
            // Si estamos en móvil (0-767px) y no es la sección de búsqueda
            if (window.innerWidth <= 767) {
                const isSearchSection = section.getAttribute('data-section') === 'search';
                
                if (!isSearchSection) {
                    // Si se hace click en una sección no activa
                    if (!isActive) {
                        // Cerrar todas las secciones excepto búsqueda
                        const allSections = document.querySelectorAll('.filter-section');
                        allSections.forEach(otherSection => {
                            const isOtherSearch = otherSection.getAttribute('data-section') === 'search';
                            if (!isOtherSearch) {
                                otherSection.classList.remove('active');
                                otherSection.querySelector('.filter-content').style.display = 'none';
                            }
                        });
                        
                        // Abrir la sección clickeada
                        section.classList.add('active');
                        section.querySelector('.filter-content').style.display = 'block';
                    } else {
                        // Si ya está activa, cerrarla
                        section.classList.remove('active');
                        section.querySelector('.filter-content').style.display = 'none';
                    }
                }
            } 
            // Si estamos en tablet (768px-1023px)
            else if (window.innerWidth <= 1023) {
                if (!isActive) {
                    // Cerrar todas las secciones
                    const allSections = document.querySelectorAll('.filter-section');
                    allSections.forEach(otherSection => {
                        otherSection.classList.remove('active');
                        otherSection.querySelector('.filter-content').style.display = 'none';
                    });
                    
                    // Abrir la sección clickeada
                    section.classList.add('active');
                    section.querySelector('.filter-content').style.display = 'block';
                } else {
                    // Si ya está activa, cerrarla
                    section.classList.remove('active');
                    section.querySelector('.filter-content').style.display = 'none';
                }
            }
        });
    });
    
    // Configurar estado inicial según el dispositivo
    initializeAccordionState();
}

// Inicializar estado del acordeón
function initializeAccordionState() {
    const allSections = document.querySelectorAll('.filter-section');
    
    // En desktop (1024px+): todas expandidas, sin acordeón
    if (window.innerWidth >= 1024) {
        allSections.forEach(section => {
            section.classList.add('active');
            const content = section.querySelector('.filter-content');
            if (content) {
                content.style.display = 'block';
                content.style.maxHeight = 'none';
            }
        });
    }
    // En tablet (768px-1023px): todas colapsadas
    else if (window.innerWidth <= 1023 && window.innerWidth > 767) {
        allSections.forEach(section => {
            section.classList.remove('active');
            const content = section.querySelector('.filter-content');
            if (content) {
                content.style.display = 'none';
            }
        });
    }
    // En móvil (0px-767px): solo búsqueda expandida
    else {
        allSections.forEach(section => {
            const isSearchSection = section.getAttribute('data-section') === 'search';
            if (isSearchSection) {
                section.classList.add('active');
                section.querySelector('.filter-content').style.display = 'block';
            } else {
                section.classList.remove('active');
                section.querySelector('.filter-content').style.display = 'none';
            }
        });
    }
}

// Función para manejar el diseño responsive del sidebar
function handleResponsiveSidebar() {
    const sidebar = document.querySelector('.filters-sidebar');
    
    // En desktop (1024px+)
    if (window.innerWidth >= 1024) {
        if (sidebar) {
            sidebar.style.maxHeight = 'none';
            sidebar.style.overflowY = 'visible';
            sidebar.style.position = 'sticky';
            sidebar.style.top = '100px';
        }
        
        // Asegurarse de que todas las secciones estén expandidas
        const allSections = document.querySelectorAll('.filter-section');
        allSections.forEach(section => {
            section.classList.add('active');
            const content = section.querySelector('.filter-content');
            if (content) {
                content.style.display = 'block';
                content.style.maxHeight = 'none';
            }
        });
    }
    // En tablet (768px-1023px)
    else if (window.innerWidth <= 1023 && window.innerWidth > 767) {
        if (sidebar) {
            sidebar.style.maxHeight = '500px';
            sidebar.style.overflowY = 'auto';
            sidebar.style.position = 'relative';
            sidebar.style.top = '0';
        }
        
        // Reconfigurar acordeón
        initializeAccordionState();
    }
    // En móvil (0px-767px)
    else {
        if (sidebar) {
            sidebar.style.maxHeight = '400px';
            sidebar.style.overflowY = 'auto';
            sidebar.style.position = 'relative';
            sidebar.style.top = '0';
        }
        
        // Reconfigurar acordeón
        initializeAccordionState();
        
        // Ocultar botón de vista de lista en móvil muy pequeño
        const listViewBtn = document.getElementById('listView');
        if (listViewBtn && window.innerWidth <= 479) {
            listViewBtn.style.display = 'none';
        } else if (listViewBtn) {
            listViewBtn.style.display = 'flex';
        }
    }
}

// Optimizar tarjetas para móvil
function optimizeCardsForMobile() {
    const cards = document.querySelectorAll('.product-card');
    
    if (window.innerWidth <= 767) {
        cards.forEach(card => {
            // Simplificar contenido en móvil
            const description = card.querySelector('.product-description');
            if (description && window.innerWidth <= 374) {
                description.style.display = 'none';
            } else if (description) {
                description.style.display = '-webkit-box';
            }
            
            // Ajustar detalles del producto
            const details = card.querySelector('.product-details');
            if (details && window.innerWidth <= 479) {
                details.style.gridTemplateColumns = '1fr 1fr';
            } else if (details) {
                details.style.gridTemplateColumns = 'repeat(3, 1fr)';
            }
        });
    } else {
        // Restaurar en desktop y tablet
        cards.forEach(card => {
            const description = card.querySelector('.product-description');
            if (description) {
                description.style.display = '-webkit-box';
            }
            
            const details = card.querySelector('.product-details');
            if (details) {
                details.style.gridTemplateColumns = 'repeat(3, 1fr)';
            }
        });
    }
}

// Actualizar filtro de marcas
function updateBrandsFilter() {
    const checkboxes = document.querySelectorAll('.brand-checkbox:checked');
    currentFilters.brands = Array.from(checkboxes).map(cb => cb.value);
    applyFilters();
}

// Actualizar filtro de categorías
function updateCategoriesFilter() {
    const checkboxes = document.querySelectorAll('.category-checkbox:checked');
    currentFilters.categories = Array.from(checkboxes).map(cb => cb.value);
    applyFilters();
}

// Actualizar filtro de stock
function updateStockFilter() {
    currentFilters.inStock = document.getElementById('inStock').checked;
    currentFilters.outOfStock = document.getElementById('outOfStock').checked;
    applyFilters();
}

// Aplicar filtro de precio
function applyPriceFilter() {
    const minPrice = parseFloat(document.getElementById('minPrice').value);
    const maxPrice = parseFloat(document.getElementById('maxPrice').value);
    
    currentFilters.minPrice = isNaN(minPrice) ? null : minPrice;
    currentFilters.maxPrice = isNaN(maxPrice) ? null : maxPrice;
    
    applyFilters();
}

// Aplicar todos los filtros
function applyFilters() {
    // Filtrar productos
    filteredProducts = allProducts.filter(product => {
        // Búsqueda
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const searchFields = [
                product.Model,
                product.SKU,
                product.ItemDescription,
                product.Location,
                product.especificaciones
            ];
            
            const matchesSearch = searchFields.some(field => 
                field && field.toLowerCase().includes(searchTerm)
            );
            
            if (!matchesSearch) return false;
        }
        
        // Marcas
        if (currentFilters.brands.length > 0) {
            if (!currentFilters.brands.includes(product.Brand)) return false;
        }
        
        // Categorías
        if (currentFilters.categories.length > 0) {
            if (!currentFilters.categories.includes(product.Category)) return false;
        }
        
        // Precio - Usar nuestro precio para filtrar
        const ourPrice = product.nuestroPrecio || 0;
        if (currentFilters.minPrice !== null && ourPrice < currentFilters.minPrice) return false;
        if (currentFilters.maxPrice !== null && ourPrice > currentFilters.maxPrice) return false;
        
        // Stock - Verificar si hay unidades disponibles
        const totalUnits = product.unidades?.length || 0;
        const isInStock = totalUnits > 0;
        if (!currentFilters.inStock && isInStock) return false;
        if (!currentFilters.outOfStock && !isInStock) return false;
        
        return true;
    });
    
    // Ordenar productos
    sortProducts();
    
    // Actualizar UI
    updateResultsCount();
    renderProducts();
    renderPagination();
    
    // Optimizar para móvil después de renderizar
    setTimeout(optimizeCardsForMobile, 100);
}

// Ordenar productos
function sortProducts() {
    filteredProducts.sort((a, b) => {
        switch (currentFilters.sortBy) {
            case 'price-low':
                return (a.nuestroPrecio || 0) - (b.nuestroPrecio || 0);
            case 'price-high':
                return (b.nuestroPrecio || 0) - (a.nuestroPrecio || 0);
            case 'name':
                return (a.Model || '').localeCompare(b.Model || '');
            case 'quantity':
                const aUnits = a.unidades?.length || 0;
                const bUnits = b.unidades?.length || 0;
                return bUnits - aUnits;
            case 'newest':
            default:
                // Ordenar por fecha de creación (nuevos primero)
                const dateA = a.fechaCreacion ? a.fechaCreacion.toDate() : new Date(0);
                const dateB = b.fechaCreacion ? b.fechaCreacion.toDate() : new Date(0);
                return dateB - dateA;
        }
    });
}

// Renderizar productos
function renderProducts() {
    const container = document.getElementById('productsContainer');
    const noResults = document.getElementById('noResults');
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'flex';
        
        // Asegurar que el botón reset funcione
        setTimeout(() => {
            const resetBtn = document.getElementById('resetFilters');
            if (resetBtn) {
                resetBtn.onclick = function() {
                    clearAllFilters();
                    noResults.style.display = 'none';
                };
            }
        }, 50);
        return;
    }
    
    noResults.style.display = 'none';
    
    // Calcular productos para la página actual
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    // Obtener mapas de nombres
    const brandsMap = productManager.getBrandsMap();
    const categoriesMap = productManager.getCategoriesMap();
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Añadir clases según la vista
    container.className = `products-grid ${currentView === 'list' ? 'list-view' : ''}`;
    
    // Crear tarjetas de productos
    productsToShow.forEach((product, index) => {
        const card = createProductCard(product, brandsMap, categoriesMap, index);
        container.appendChild(card);
    });
    
    // Añadir animaciones
    setTimeout(() => {
        const cards = container.querySelectorAll('.product-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 50}ms`;
            card.style.opacity = '1';
        });
    }, 100);
}

// Crear tarjeta de producto - VERSIÓN CORREGIDA sin Total Inventory Value
function createProductCard(product, brandsMap, categoriesMap, index) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${index * 50}ms`;
    
    const brandName = brandsMap[product.Brand] || 'Unknown Brand';
    const categoryName = categoriesMap[product.Category] || 'Unknown Category';
    const mainImage = product.getImageUrl(0);
    
    // Calcular unidades disponibles (solo mostrar el conteo, no los números de serie)
    const totalUnits = product.unidades?.length || 0;
    
    // Formatear precios - Usar los nuevos campos
    const ourPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(product.nuestroPrecio || 0);
    
    const competitorPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(product.precioCompetencia || 0);
    
    // Determinar estado de stock
    const stockStatus = totalUnits > 0 ? 'in-stock' : 'out-of-stock';
    const stockText = totalUnits > 0 ? `${totalUnits} Available` : 'Out of Stock';
    const stockIcon = totalUnits > 0 ? 'fa-check' : 'fa-times';
    
    card.innerHTML = `
        <div class="product-card-inner">
            <!-- Badge de estado con cantidad -->
            <div class="product-badge ${stockStatus}">
                <i class="fas ${stockIcon}"></i> ${stockText}
            </div>
            
            <!-- Imagen del producto -->
            <div class="product-image">
                <img src="${mainImage}" 
                     alt="${product.Model || 'Product'}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image'">
                ${product.images?.length > 1 ? `
                    <div class="image-count">
                        <i class="fas fa-camera"></i> ${product.images.length}
                    </div>
                ` : ''}
            </div>
            
            <!-- Contenido de la tarjeta -->
            <div class="product-content">
                <!-- Marca y categoría -->
                <div class="product-meta">
                    <span class="product-brand">
                        <i class="fas fa-tag"></i> ${brandName}
                    </span>
                    <span class="product-category">
                        <i class="fas fa-folder"></i> ${categoryName}
                    </span>
                </div>
                
                <!-- Nombre del producto -->
                <h3 class="product-title">${product.Model || 'No Model'}</h3>
                
                <!-- Descripción -->
                <p class="product-description">
                    ${product.ItemDescription ? 
                      product.ItemDescription.substring(0, 80) + (product.ItemDescription.length > 80 ? '...' : '') : 
                      'No description available'}
                </p>
                
                <!-- Detalles del producto -->
                <div class="product-details">
                    <div class="detail-item">
                        <i class="fas fa-cubes"></i>
                        <span>Units: ${totalUnits}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-weight"></i>
                        <span>${product.UnitWeight || 0} lbs</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${product.Location || 'N/A'}</span>
                    </div>
                </div>
                
                <!-- SECCIÓN DE PRECIOS - Sin Total Inventory Value -->
                <div class="product-price-section" style="margin: 10px 0; padding: 10px 0; border-top: 1px solid var(--products-card-border); border-bottom: 1px solid var(--products-card-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="color: var(--products-gray);">Competitor Price:</span>
                        <span style="color: var(--products-gray); text-decoration: line-through;">${competitorPrice}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600;">Our Price:</span>
                        <span style="font-size: 1.4rem; font-weight: 700; color: var(--products-price);">${ourPrice}</span>
                    </div>
                </div>
                
                <!-- Especificaciones si existen -->
                ${product.especificaciones ? `
                    <div class="product-specs" style="margin-bottom: 10px; font-size: 0.85rem; color: var(--products-gray);">
                        <i class="fas fa-info-circle"></i> ${product.especificaciones.substring(0, 50)}${product.especificaciones.length > 50 ? '...' : ''}
                    </div>
                ` : ''}
                
                <!-- Botón de acción -->
                <div class="product-footer" style="margin-top: 10px;">
                    <button class="view-detail-btn" data-product-id="${product.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Añadir evento click al botón de detalle
    const detailBtn = card.querySelector('.view-detail-btn');
    detailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewProductDetail(product.id);
    });
    
    return card;
}

// Ver detalle del producto
function viewProductDetail(productId) {
    window.location.href = `../productDetail/productDetail.html?id=${productId}`;
}

// Renderizar paginación
function renderPagination() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    
    let paginationHTML = '';
    
    // Botón anterior
    paginationHTML += `
        <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Números de página
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // Botón siguiente
    paginationHTML += `
        <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    container.innerHTML = paginationHTML;
}

// Ir a página específica
function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    renderProducts();
    renderPagination();
    
    // Scroll al inicio de los productos
    const productsSection = document.querySelector('.products-grid-section');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Establecer vista (grid o list)
function setView(view) {
    if (currentView === view) return;
    
    currentView = view;
    
    // Actualizar botones
    document.getElementById('gridView').classList.toggle('active', view === 'grid');
    document.getElementById('listView').classList.toggle('active', view === 'list');
    
    // Re-renderizar productos
    renderProducts();
}

// Limpiar todos los filtros
function clearAllFilters() {
    const categoryFromUrl = getCategoryFromUrl();
    const brandFromUrl = getBrandFromUrl();
    
    // Resetear filtros, manteniendo los parámetros de la URL si existen
    currentFilters = {
        search: '',
        brands: brandFromUrl ? [brandFromUrl] : [],
        categories: categoryFromUrl ? [categoryFromUrl] : [],
        minPrice: null,
        maxPrice: null,
        inStock: true,
        outOfStock: false,
        sortBy: 'newest'
    };
    currentPage = 1;
    
    // Resetear UI
    document.getElementById('searchInput').value = '';
    document.getElementById('inStock').checked = true;
    document.getElementById('outOfStock').checked = false;
    document.getElementById('sortBy').value = 'newest';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    
    // Resetear checkboxes, excepto los parámetros de la URL
    document.querySelectorAll('.brand-checkbox').forEach(cb => {
        const brandId = cb.value;
        cb.checked = brandId === brandFromUrl;
    });
    
    document.querySelectorAll('.category-checkbox').forEach(cb => {
        const categoryId = cb.value;
        cb.checked = categoryId === categoryFromUrl;
    });
    
    // Aplicar filtros
    applyFilters();
    
    // Reconfigurar estado del acordeón según dispositivo
    initializeAccordionState();
    
    // Expandir las secciones relevantes si hay parámetros en la URL
    if (window.innerWidth < 1024) {
        if (categoryFromUrl) {
            const categoriesSection = document.querySelector('.filter-section[data-section="categories"]');
            if (categoriesSection) {
                categoriesSection.classList.add('active');
                const content = categoriesSection.querySelector('.filter-content');
                if (content) {
                    content.style.display = 'block';
                }
            }
        }
        
        if (brandFromUrl) {
            const brandsSection = document.querySelector('.filter-section[data-section="brands"]');
            if (brandsSection) {
                brandsSection.classList.add('active');
                const content = brandsSection.querySelector('.filter-content');
                if (content) {
                    content.style.display = 'block';
                }
            }
        }
    }
    
    // Mostrar feedback visual
    showTemporaryMessage('Filters have been reset');
}

// Función para mostrar mensaje temporal
function showTemporaryMessage(message) {
    // Crear elemento de mensaje si no existe
    let messageEl = document.getElementById('tempMessage');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'tempMessage';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--products-accent);
            color: var(--products-header-bg);
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--products-card-shadow);
            z-index: 1000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(messageEl);
        
        // Añadir animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Mostrar mensaje
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// Actualizar contador de resultados
function updateResultsCount() {
    const countElement = document.getElementById('resultsCount');
    if (countElement) {
        countElement.textContent = filteredProducts.length;
    }
}

// Mostrar/ocultar loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

// Mostrar error
function showError(message) {
    const container = document.getElementById('productsContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Products</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-primary">
                    <i class="fas fa-redo"></i>
                    Try Again
                </button>
            </div>
        `;
    }
}

// Función para expandir todos los filtros (útil para debugging)
function expandAllFilters() {
    if (window.innerWidth >= 1024) return; // En desktop ya están expandidos
    
    const allSections = document.querySelectorAll('.filter-section');
    allSections.forEach(section => {
        section.classList.add('active');
        const content = section.querySelector('.filter-content');
        if (content) {
            content.style.display = 'block';
        }
    });
}

// Función para colapsar todos los filtros
function collapseAllFilters() {
    if (window.innerWidth >= 1024) return; // En desktop no se pueden colapsar
    
    const allSections = document.querySelectorAll('.filter-section');
    allSections.forEach(section => {
        const isSearchSection = section.getAttribute('data-section') === 'search';
        
        // En móvil, mantener búsqueda expandida
        if (window.innerWidth <= 767 && isSearchSection) {
            return;
        }
        
        section.classList.remove('active');
        const content = section.querySelector('.filter-content');
        if (content) {
            content.style.display = 'none';
        }
    });
}