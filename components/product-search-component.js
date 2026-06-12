// product-search-component.js - Buscador de productos con normalización de textos
(function() {
    'use strict';

    if (window.ProductSearchLoaded) {
        console.log('🔄 Product Search ya cargado, omitiendo...');
        return;
    }
    window.ProductSearchLoaded = true;

    console.log('🚀 Iniciando buscador de productos...');

    let db = null;
    let firebaseInitialized = false;
    let collectionRef = null;
    let getDocsFn = null;
    let queryFn = null;
    let limitFn = null;
    
    // Caches
    let cachedProducts = null;
    let brandsMap = new Map();
    let categoriesMap = new Map();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    async function init() {
        try {
            await initializeFirebase();
            await loadReferences();
            await createSearchComponent();
            setupSearchFunctionality();
            console.log('✅ Buscador de productos inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar buscador:', error);
        }
    }

    async function initializeFirebase() {
        try {
            if (window.db && typeof window.db.collection === 'function') {
                console.log('Usando db global (estilo antiguo)');
                db = window.db;
                firebaseInitialized = true;
                return;
            }

            console.log('Cargando configuración de Firebase desde módulo...');
            
            const configModule = await import('/config/firebase-config.js');
            
            if (configModule.db) {
                if (configModule.db._delegate) {
                    console.log('Firestore modular detectado (v9+)');
                    db = configModule.db;
                    await setupModularFirestore();
                } else if (configModule.db.collection) {
                    console.log('Firestore tradicional detectado');
                    db = configModule.db;
                    firebaseInitialized = true;
                } else {
                    console.log('Configurando Firestore modular...');
                    await setupModularFirestore(configModule.db);
                }
            } else {
                throw new Error('No se pudo obtener db del módulo');
            }
        } catch (error) {
            console.error('Error inicializando Firebase:', error);
            await initializeFirebaseManually();
        }
    }

    async function setupModularFirestore(firestoreDb = null) {
        try {
            const firestoreModule = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
            
            if (firestoreDb) {
                db = firestoreDb;
            }
            
            collectionRef = firestoreModule.collection;
            getDocsFn = firestoreModule.getDocs;
            queryFn = firestoreModule.query;
            limitFn = firestoreModule.limit;
            
            firebaseInitialized = true;
            console.log('✅ Firestore modular configurado correctamente');
        } catch (error) {
            console.error('Error configurando Firestore modular:', error);
            throw error;
        }
    }

    async function initializeFirebaseManually() {
        try {
            console.log('Inicializando Firebase manualmente...');
            
            const firebaseApp = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
            const firestoreModule = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
            
            const firebaseConfig = {
                apiKey: "AIzaSyCshx_L8LxIL0PCp71kIbztppgh_ngXSq0",
                authDomain: "lucky-appliances.firebaseapp.com",
                projectId: "lucky-appliances",
                storageBucket: "lucky-appliances.firebasestorage.app",
                messagingSenderId: "72948063957",
                appId: "1:72948063957:web:0118d92ba1d78c7c788c5c",
                measurementId: "G-QMVW9NR9WZ"
            };

            const app = firebaseApp.initializeApp(firebaseConfig);
            db = firestoreModule.getFirestore(app);
            
            collectionRef = firestoreModule.collection;
            getDocsFn = firestoreModule.getDocs;
            queryFn = firestoreModule.query;
            limitFn = firestoreModule.limit;
            
            firebaseInitialized = true;
            console.log('✅ Firebase inicializado manualmente correctamente');
        } catch (error) {
            console.error('Error en inicialización manual:', error);
            showFirebaseError();
        }
    }

    async function loadReferences() {
        try {
            console.log('Cargando marcas y categorías...');
            
            if (collectionRef && getDocsFn) {
                const brandsCollection = collectionRef(db, "marcas");
                const brandsSnapshot = await getDocsFn(brandsCollection);
                brandsSnapshot.forEach(doc => {
                    const data = doc.data();
                    brandsMap.set(doc.id, data.nombre || doc.id);
                });
                console.log(`✅ ${brandsMap.size} marcas cargadas`);
                
                const categoriesCollection = collectionRef(db, "categorias");
                const categoriesSnapshot = await getDocsFn(categoriesCollection);
                categoriesSnapshot.forEach(doc => {
                    const data = doc.data();
                    categoriesMap.set(doc.id, data.nombre || doc.id);
                });
                console.log(`✅ ${categoriesMap.size} categorías cargadas`);
            } else if (db.collection) {
                const brandsSnapshot = await db.collection("marcas").get();
                brandsSnapshot.forEach(doc => {
                    const data = doc.data();
                    brandsMap.set(doc.id, data.nombre || doc.id);
                });
                
                const categoriesSnapshot = await db.collection("categorias").get();
                categoriesSnapshot.forEach(doc => {
                    const data = doc.data();
                    categoriesMap.set(doc.id, data.nombre || doc.id);
                });
            }
        } catch (error) {
            console.warn('Error cargando referencias:', error);
        }
    }

    async function queryProducts(limit = 100) {
        if (!firebaseInitialized) {
            throw new Error('Firebase no inicializado');
        }

        if (collectionRef && getDocsFn) {
            const productsCollection = collectionRef(db, "products");
            const q = queryFn(productsCollection, limitFn(limit));
            const snapshot = await getDocsFn(q);
            
            const products = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    ...data,
                    BrandName: brandsMap.get(data.Brand) || data.Brand || 'No brand',
                    CategoryName: categoriesMap.get(data.Category) || data.Category || 'No category'
                });
            });
            return products;
        }
        
        if (db.collection) {
            const snapshot = await db.collection("products").limit(limit).get();
            const products = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    ...data,
                    BrandName: brandsMap.get(data.Brand) || data.Brand || 'No brand',
                    CategoryName: categoriesMap.get(data.Category) || data.Category || 'No category'
                });
            });
            return products;
        }
        
        throw new Error('No se puede realizar la consulta a Firestore');
    }

    // =============================================
    // FUNCIONES DE NORMALIZACIÓN DE TEXTO
    // =============================================
    
    function safeToString(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
        if (Array.isArray(value)) return value.join(' ');
        return String(value);
    }

    // Función para normalizar texto (eliminar acentos, espacios extras, convertir a minúsculas)
    function normalizeText(text) {
        if (!text) return '';
        let normalized = safeToString(text);
        
        // Convertir a minúsculas
        normalized = normalized.toLowerCase();
        
        // Eliminar acentos y caracteres especiales
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Eliminar caracteres no alfanuméricos (excepto espacios)
        normalized = normalized.replace(/[^a-z0-9\s]/g, '');
        
        // Eliminar espacios múltiples y trim
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        return normalized;
    }

    // Función para comparar textos normalizados
    function isTextMatch(text1, text2) {
        if (!text1 || !text2) return false;
        const norm1 = normalizeText(text1);
        const norm2 = normalizeText(text2);
        return norm1.includes(norm2) || norm2.includes(norm1);
    }

    // Función de búsqueda mejorada con normalización
    function searchProducts(products, searchTerm) {
        const normalizedTerm = normalizeText(searchTerm);
        
        if (normalizedTerm.length === 0) return [];
        
        // Dividir el término normalizado en palabras
        const searchWords = normalizedTerm.split(/\s+/).filter(word => word.length > 0);
        const isMultiWord = searchWords.length > 1;
        
        const results = [];
        
        products.forEach(product => {
            // Normalizar todos los campos relevantes
            const modelNorm = normalizeText(product.Model);
            const skuNorm = normalizeText(product.SKU);
            const descriptionNorm = normalizeText(product.ItemDescription);
            const especificacionesNorm = normalizeText(product.especificaciones);
            const brandNorm = normalizeText(product.BrandName);
            const categoryNorm = normalizeText(product.CategoryName);
            
            let score = 0;
            let matchDetails = [];
            
            // 1. BÚSQUEDA POR MODELO (prioridad máxima)
            // Coincidencia exacta del término completo normalizado
            if (modelNorm === normalizedTerm) {
                score = 100;
                matchDetails.push('model-exact-full');
            }
            // Coincidencia donde el modelo comienza con el término
            else if (modelNorm.startsWith(normalizedTerm)) {
                score = 95;
                matchDetails.push('model-starts-with');
            }
            // Coincidencia donde el término está contenido en el modelo
            else if (modelNorm.includes(normalizedTerm)) {
                score = 85;
                matchDetails.push('model-contains');
            }
            // Para búsquedas multi-palabra
            else if (isMultiWord) {
                // Verificar si todas las palabras están en el modelo
                const allWordsMatch = searchWords.every(word => modelNorm.includes(word));
                if (allWordsMatch) {
                    score = 90;
                    matchDetails.push('model-all-words');
                }
                else {
                    const matchingWords = searchWords.filter(word => modelNorm.includes(word));
                    if (matchingWords.length > 0) {
                        const matchPercent = matchingWords.length / searchWords.length;
                        score = 70 + Math.floor(matchPercent * 15);
                        matchDetails.push(`model-${matchingWords.length}-of-${searchWords.length}-words`);
                    }
                }
            }
            
            // 2. Búsqueda por palabras individuales en modelo (ignorando orden)
            if (score === 0 && !isMultiWord && searchWords.length === 1) {
                const singleWord = searchWords[0];
                const modelWords = modelNorm.split(/\s+/);
                if (modelWords.includes(singleWord)) {
                    score = 80;
                    matchDetails.push('model-word-exact');
                } else if (modelNorm.includes(singleWord)) {
                    score = 65;
                    matchDetails.push('model-word-partial');
                }
            }
            
            // 3. Buscar en SKU (normalizado)
            if (score === 0) {
                if (skuNorm === normalizedTerm) {
                    score = 80;
                    matchDetails.push('sku-exact');
                } else if (skuNorm.includes(normalizedTerm)) {
                    score = 70;
                    matchDetails.push('sku-contains');
                } else if (isMultiWord && searchWords.some(word => skuNorm.includes(word))) {
                    score = 60;
                    matchDetails.push('sku-partial');
                }
            }
            
            // 4. Buscar en Marca (normalizado)
            if (score === 0) {
                if (brandNorm === normalizedTerm) {
                    score = 65;
                    matchDetails.push('brand-exact');
                } else if (brandNorm.includes(normalizedTerm)) {
                    score = 55;
                    matchDetails.push('brand-contains');
                } else if (isMultiWord && searchWords.some(word => brandNorm.includes(word))) {
                    score = 45;
                    matchDetails.push('brand-partial');
                }
            }
            
            // 5. Buscar en Números de Serie (normalizado)
            if (score === 0 && product.unidades && Array.isArray(product.unidades)) {
                for (const unit of product.unidades) {
                    const serialNorm = normalizeText(unit.numeroSerie);
                    if (serialNorm === normalizedTerm) {
                        score = 75;
                        matchDetails.push('serial-exact');
                        break;
                    } else if (serialNorm.includes(normalizedTerm)) {
                        score = 65;
                        matchDetails.push('serial-contains');
                        break;
                    } else if (isMultiWord && searchWords.some(word => serialNorm.includes(word))) {
                        if (score < 50) {
                            score = 50;
                            matchDetails.push('serial-partial');
                        }
                    }
                }
            }
            
            // 6. Buscar en Categoría (normalizado)
            if (score === 0) {
                if (categoryNorm === normalizedTerm) {
                    score = 50;
                    matchDetails.push('category-exact');
                } else if (categoryNorm.includes(normalizedTerm)) {
                    score = 40;
                    matchDetails.push('category-contains');
                } else if (isMultiWord && searchWords.some(word => categoryNorm.includes(word))) {
                    score = 35;
                    matchDetails.push('category-partial');
                }
            }
            
            // 7. Buscar en Descripción y Especificaciones (normalizado)
            if (score === 0) {
                if (descriptionNorm.includes(normalizedTerm) || especificacionesNorm.includes(normalizedTerm)) {
                    score = 30;
                    matchDetails.push('description-contains');
                } else if (isMultiWord && searchWords.some(word => descriptionNorm.includes(word) || especificacionesNorm.includes(word))) {
                    score = 25;
                    matchDetails.push('description-partial');
                }
            }
            
            if (score > 0) {
                results.push({
                    product,
                    score,
                    matchDetails: matchDetails.join(', ')
                });
            }
        });
        
        // Ordenar por score (mayor a menor)
        results.sort((a, b) => b.score - a.score);
        
        if (results.length > 0) {
            console.log(`🔍 Búsqueda "${searchTerm}" (normalizado: "${normalizedTerm}"): ${results.length} resultados`);
            if (results.length > 0) {
                console.log('🏆 Mejor resultado:', {
                    model: results[0].product.Model,
                    modelNorm: normalizeText(results[0].product.Model),
                    score: results[0].score,
                    match: results[0].matchDetails
                });
            }
        }
        
        return results.map(r => r.product);
    }

    function showFirebaseError() {
        const searchContainer = document.getElementById('product-search-container');
        if (searchContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                background-color: #fee;
                color: #c00;
                padding: 10px;
                text-align: center;
                font-size: 14px;
                border-bottom: 1px solid #fcc;
                position: relative;
                z-index: 1000;
            `;
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> 
                Error connecting to database. Please refresh the page.
                <button onclick="location.reload()" style="margin-left: 10px; padding: 2px 10px; cursor: pointer;">Refresh</button>
            `;
            searchContainer.insertBefore(errorDiv, searchContainer.firstChild);
        }
    }

    async function createSearchComponent() {
        addSearchStyles();
        createSearchHTML();
        await adjustBodyPadding();
    }

    function addSearchStyles() {
        const styleId = 'product-search-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            :root {
                --search-primary: #0a2540;
                --search-accent: #f5d742;
                --search-text: #333333;
                --search-text-light: #6c757d;
                --search-light: #f8f9fa;
                --search-white: #ffffff;
                --search-gray: #e9ecef;
                --search-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                --search-transition: all 0.3s ease-in-out;
            }

            #product-search-container {
                position: fixed;
                top: 70px;
                left: 0;
                width: 100%;
                z-index: 999;
                background-color: var(--search-white);
                box-shadow: var(--search-shadow);
                font-family: 'Poppins', sans-serif;
            }

            .search-wrapper {
                max-width: 1200px;
                margin: 0 auto;
                padding: 15px 20px;
            }

            .search-input-group {
                position: relative;
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
            }

            .search-icon {
                position: absolute;
                left: 15px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--search-text-light);
                font-size: 1.1rem;
                pointer-events: none;
                z-index: 2;
            }

            #product-search-input {
                width: 100%;
                padding: 14px 20px 14px 45px;
                border: 2px solid var(--search-gray);
                border-radius: 50px;
                font-size: 1rem;
                font-family: 'Poppins', sans-serif;
                background-color: var(--search-white);
                color: var(--search-text);
                transition: var(--search-transition);
                outline: none;
            }

            #product-search-input:focus {
                border-color: var(--search-accent);
                box-shadow: 0 2px 15px rgba(245, 215, 66, 0.2);
            }

            .search-loading-indicator {
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
                display: none;
                color: var(--search-accent);
            }

            .search-loading-indicator.active {
                display: block;
            }

            .search-results-count {
                text-align: center;
                margin-top: 10px;
                font-size: 0.85rem;
                color: var(--search-text-light);
            }

            .search-results-container {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--search-white);
                border-radius: 0 0 12px 12px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                max-height: 500px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                border-top: none;
            }

            .search-results-container.active {
                display: block;
                animation: slideDown 0.2s ease-out;
            }

            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .results-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
                padding: 20px;
            }

            .product-card {
                background: var(--search-white);
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                transition: var(--search-transition);
                border: 1px solid var(--search-gray);
                display: flex;
                flex-direction: column;
            }

            .product-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                border-color: var(--search-accent);
            }

            .product-card-image {
                position: relative;
                width: 100%;
                height: 180px;
                background: var(--search-light);
                overflow: hidden;
            }

            .product-card-image img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                transition: transform 0.3s ease;
                background-color: #fafafa;
            }

            .product-card:hover .product-card-image img {
                transform: scale(1.05);
            }

            .product-card-content {
                padding: 15px;
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .product-card-title {
                font-size: 1rem;
                font-weight: 600;
                color: var(--search-primary);
                margin: 0 0 5px 0;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .product-card-sku {
                font-size: 0.75rem;
                color: var(--search-text-light);
                margin-bottom: 8px;
            }

            .product-card-description {
                font-size: 0.85rem;
                color: var(--search-text);
                margin-bottom: 12px;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .product-card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: auto;
                padding-top: 10px;
                border-top: 1px solid var(--search-gray);
            }

            .product-card-price {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--search-primary);
            }

            .product-card-brand {
                font-size: 0.75rem;
                color: var(--search-text-light);
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .search-loading-state,
            .search-error-state,
            .search-empty-state {
                text-align: center;
                padding: 40px 20px;
                color: var(--search-text-light);
            }

            .search-loading-state i,
            .search-error-state i,
            .search-empty-state i {
                font-size: 2rem;
                margin-bottom: 10px;
                display: block;
            }

            .search-error-state {
                color: #e74c3c;
            }

            @media (max-width: 768px) {
                .search-wrapper {
                    padding: 10px 15px;
                }

                .results-grid {
                    grid-template-columns: 1fr;
                    gap: 12px;
                    padding: 15px;
                }

                .product-card-image {
                    height: 150px;
                }

                .search-results-container {
                    max-height: calc(100vh - 120px);
                }
            }

            @media (max-width: 480px) {
                #product-search-input {
                    padding: 12px 15px 12px 40px;
                    font-size: 0.9rem;
                }

                .product-card-title {
                    font-size: 0.9rem;
                }

                .product-card-price {
                    font-size: 1rem;
                }
            }

            .dark-mode #product-search-container {
                background-color: #1a253a;
            }

            .dark-mode #product-search-input {
                background-color: #2d3748;
                border-color: #4a5568;
                color: #e2e8f0;
            }

            .dark-mode #product-search-input:focus {
                border-color: var(--search-accent);
            }

            .dark-mode .search-results-container {
                background-color: #1a253a;
                border-color: #4a5568;
            }

            .dark-mode .product-card {
                background-color: #2d3748;
                border-color: #4a5568;
            }

            .dark-mode .product-card:hover {
                border-color: var(--search-accent);
            }

            .dark-mode .product-card-title {
                color: #e2e8f0;
            }

            .dark-mode .product-card-description {
                color: #a0aec0;
            }

            .dark-mode .product-card-price {
                color: var(--search-accent);
            }

            .dark-mode .product-card-footer {
                border-top-color: #4a5568;
            }
        `;

        document.head.appendChild(styles);
    }

    function createSearchHTML() {
        const searchContainer = document.createElement('div');
        searchContainer.id = 'product-search-container';
        
        searchContainer.innerHTML = /*html*/ `
            <div class="search-wrapper">
                <div class="search-input-group">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" 
                           id="product-search-input" 
                           placeholder="Search by Model, SKU, Description or Serial Number..."
                           autocomplete="off">
                    <div class="search-loading-indicator" id="searchLoadingIndicator">
                        <i class="fas fa-spinner fa-pulse"></i>
                    </div>
                </div>
                <div class="search-results-count" id="searchResultsCount"></div>
                <div class="search-results-container" id="searchResultsContainer">
                    <div class="results-grid" id="resultsGrid"></div>
                </div>
            </div>
        `;
        
        const navbar = document.getElementById('complete-navbar');
        if (navbar && navbar.nextSibling) {
            document.body.insertBefore(searchContainer, navbar.nextSibling);
        } else if (navbar) {
            document.body.appendChild(searchContainer);
        } else {
            document.body.insertBefore(searchContainer, document.body.firstChild);
        }
    }

    async function adjustBodyPadding() {
        const searchContainer = document.getElementById('product-search-container');
        const navbar = document.getElementById('complete-navbar');
        
        if (!searchContainer) return;
        
        function updatePadding() {
            let totalHeight = searchContainer.offsetHeight;
            
            if (navbar && getComputedStyle(navbar).position === 'fixed') {
                totalHeight += navbar.offsetHeight;
            }
            
            document.body.style.paddingTop = totalHeight + 'px';
        }
        
        setTimeout(updatePadding, 100);
        
        const resizeObserver = new ResizeObserver(() => updatePadding());
        resizeObserver.observe(searchContainer);
        if (navbar) resizeObserver.observe(navbar);
        
        window.addEventListener('resize', () => updatePadding());
    }

    function setupSearchFunctionality() {
        const searchInput = document.getElementById('product-search-input');
        const resultsContainer = document.getElementById('searchResultsContainer');
        const resultsGrid = document.getElementById('resultsGrid');
        const resultsCount = document.getElementById('searchResultsCount');
        const loadingIndicator = document.getElementById('searchLoadingIndicator');
        
        if (!searchInput) return;
        
        let debounceTimer;
        let currentSearchTerm = '';
        let currentRequestId = 0;
        let cachedProducts = null;
        const debounceDelay = 300;
        const minSearchLength = 2;
        
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('focus', () => {
            if (resultsGrid.children.length > 0 && resultsGrid.children[0]?.classList?.contains('product-card')) {
                resultsContainer.classList.add('active');
            }
        });
        
        document.addEventListener('click', (e) => {
            const searchContainer = document.getElementById('product-search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                resultsContainer.classList.remove('active');
            }
        });
        
        function handleSearchInput(e) {
            clearTimeout(debounceTimer);
            let searchTerm = e.target.value.trim();
            currentSearchTerm = searchTerm;
            
            searchTerm = searchTerm.replace(/\s+/g, ' ').trim();
            
            if (searchTerm.length < minSearchLength) {
                clearResults();
                return;
            }
            
            debounceTimer = setTimeout(() => {
                performSearch(searchTerm);
            }, debounceDelay);
        }
        
        function clearResults() {
            resultsGrid.innerHTML = '';
            resultsContainer.classList.remove('active');
            resultsCount.textContent = '';
            loadingIndicator.classList.remove('active');
        }
        
        async function performSearch(term) {
            if (!firebaseInitialized) {
                console.error('Firebase no está inicializado');
                resultsGrid.innerHTML = `
                    <div class="search-error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Database not ready. Please refresh the page.</p>
                    </div>
                `;
                resultsContainer.classList.add('active');
                return;
            }
            
            const requestId = ++currentRequestId;
            
            loadingIndicator.classList.add('active');
            resultsGrid.innerHTML = `
                <div class="search-loading-state">
                    <i class="fas fa-spinner fa-pulse"></i>
                    <p>Searching products...</p>
                </div>
            `;
            resultsContainer.classList.add('active');
            resultsCount.textContent = '';
            
            try {
                if (!cachedProducts) {
                    console.log('Cargando productos desde Firebase...');
                    cachedProducts = await queryProducts(100);
                    console.log(`${cachedProducts.length} productos cargados en caché`);
                    
                    if (cachedProducts.length > 0) {
                        console.log('📦 Ejemplo de producto:', {
                            Model: cachedProducts[0].Model,
                            ModelNormalizado: normalizeText(cachedProducts[0].Model),
                            SKU: cachedProducts[0].SKU,
                            BrandName: cachedProducts[0].BrandName
                        });
                    }
                }
                
                const matchedProducts = searchProducts(cachedProducts, term);
                
                if (requestId !== currentRequestId) return;
                
                displayResults(matchedProducts, term);
                
            } catch (error) {
                console.error('Error searching products:', error);
                
                if (requestId === currentRequestId) {
                    resultsGrid.innerHTML = `
                        <div class="search-error-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Error searching products</p>
                            <small>${error.message}</small>
                        </div>
                    `;
                    resultsCount.textContent = '';
                }
            } finally {
                if (requestId === currentRequestId) {
                    loadingIndicator.classList.remove('active');
                }
            }
        }
        
        function displayResults(products, searchTerm) {
            if (!products || products.length === 0) {
                resultsGrid.innerHTML = `
                    <div class="search-empty-state">
                        <i class="fas fa-search"></i>
                        <p>No products found matching "${escapeHtml(searchTerm)}"</p>
                        <small>Try searching by Model, SKU, Description or Serial Number</small>
                    </div>
                `;
                resultsCount.textContent = '0 results found';
                return;
            }
            
            resultsCount.textContent = `${products.length} result${products.length !== 1 ? 's' : ''} found`;
            
            resultsGrid.innerHTML = products.map(product => `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-card-image">
                        <img src="${getProductImage(product)}" 
                             alt="${escapeHtml(safeToString(product.Model))}"
                             onerror="this.src='https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image'">
                    </div>
                    <div class="product-card-content">
                        <h4 class="product-card-title">${escapeHtml(safeToString(product.Model) || 'No model')}</h4>
                        <div class="product-card-sku">
                            SKU: ${escapeHtml(safeToString(product.SKU) || 'N/A')}
                            ${product.idInterno ? `| ID: ${escapeHtml(safeToString(product.idInterno))}` : ''}
                        </div>
                        <p class="product-card-description">${escapeHtml(safeToString(product.ItemDescription) || 'No description')}</p>
                        <div class="product-card-footer">
                            <span class="product-card-price">
                                ${formatPrice(product.nuestroPrecio || product.precioCompetencia || 0)}
                            </span>
                            <span class="product-card-brand">
                                <i class="fas fa-tag"></i> ${escapeHtml(product.BrandName || 'No brand')}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', () => {
                    const productId = card.dataset.productId;
                    if (productId) {
                        window.location.href = `/users/visitors/productDetail/productDetail.html?id=${productId}`;
                    }
                });
            });
        }
        
        function getProductImage(product) {
            if (product.images && product.images.length > 0) {
                const image = product.images[0];
                if (image && typeof image === 'string') {
                    if (image.startsWith('data:image')) return image;
                    if (image.startsWith('http')) return image;
                    if (image.length > 100 && !image.includes('://')) {
                        let mimeType = 'image/jpeg';
                        if (image.startsWith('iVBORw')) mimeType = 'image/png';
                        if (image.startsWith('/9j/')) mimeType = 'image/jpeg';
                        if (image.startsWith('R0lGOD')) mimeType = 'image/gif';
                        return `data:${mimeType};base64,${image}`;
                    }
                }
            }
            return 'https://via.placeholder.com/300x200/0a2540/ffffff?text=No+Image';
        }
        
        function formatPrice(price) {
            if (!price || price === 0) return 'Price N/A';
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(price);
        }
        
        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
    }
    
    window.ProductSearch = {
        search: function(query) {
            const searchInput = document.getElementById('product-search-input');
            if (searchInput) {
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.focus();
            }
        },
        
        clear: function() {
            const searchInput = document.getElementById('product-search-input');
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        },
        
        close: function() {
            const container = document.getElementById('searchResultsContainer');
            if (container) {
                container.classList.remove('active');
            }
        },
        
        isReady: function() {
            return firebaseInitialized;
        }
    };
    
    // Cargar recursos
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fontAwesomeLink);
    }
    
    if (!document.querySelector('link[href*="poppins"]')) {
        const poppinsLink = document.createElement('link');
        poppinsLink.rel = 'stylesheet';
        poppinsLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(poppinsLink);
    }
    
})();