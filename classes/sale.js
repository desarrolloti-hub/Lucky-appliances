// sale.js - Class for sales management
import { db, storage } from '/config/firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

class Sale {
    constructor(id, data) {
        this.id = id;
        this.saleNumber = data.saleNumber || this.generateSaleNumber();
        
        // Array de objetos con detalles completos de cada ítem vendido
        this.soldItems = (data.soldItems || []).map(item => ({
            serialNumber: item.serialNumber || '',
            productId: item.productId || null,
            model: item.model || 'Unknown',
            sku: item.sku || 'N/A',
            price: parseFloat(item.price) || 0,
            brand: item.brand || '',
            category: item.category || '',
            provider: item.provider || '',
            warranty: item.warranty || null,
            condition: item.condition || 'new',
            fechaVenta: item.fechaVenta || null
        }));
        
        // Mantener serialNumbers para compatibilidad con datos antiguos
        this.serialNumbers = data.serialNumbers || [];
        
        // Si no hay soldItems pero hay serialNumbers, crear soldItems básicos
        if (this.soldItems.length === 0 && this.serialNumbers.length > 0) {
            this.soldItems = this.serialNumbers.map(serial => ({
                serialNumber: serial,
                productId: null,
                model: 'Unknown',
                sku: 'N/A',
                price: 0,
                brand: '',
                category: '',
                provider: '',
                warranty: null,
                condition: 'unknown',
                fechaVenta: null
            }));
        }
        
        // Información del cliente
        this.customer = {
            name: data.customer?.name || data.customerName || '',
            address: data.customer?.address || data.customerAddress || '',
            phone: data.customer?.phone || data.customerPhone || '',
            email: data.customer?.email || data.customerEmail || '',
            rfc: data.customer?.rfc || data.customerRFC || '',
            taxId: data.customer?.taxId || data.customerTaxId || ''
        };
        
        // Información del vendedor
        this.seller = {
            uid: data.seller?.uid || data.sellerUid || '',
            displayName: data.seller?.displayName || data.sellerName || '',
            email: data.seller?.email || data.sellerEmail || '',
            role: data.seller?.role || data.sellerRole || ''
        };
        
        // Montos y cargos adicionales
        this.additionalCharges = (data.additionalCharges || []).map(charge => ({
            description: charge.description || 'Cargo adicional',
            amount: parseFloat(charge.amount) || 0,
            type: charge.type || 'other' // shipping, installation, discount, etc
        }));
        
        // Totales
        this.amounts = {
            productsSubtotal: parseFloat(data.amounts?.productsSubtotal || data.subtotal || 0),
            additionalChargesTotal: parseFloat(data.amounts?.additionalChargesTotal || data.additionalChargesTotal || 0),
            subtotal: parseFloat(data.amounts?.subtotal || data.totalSubtotal || 0),
            tax: parseFloat(data.amounts?.tax || data.tax || 0),
            total: parseFloat(data.amounts?.total || data.total || 0),
            taxRate: parseFloat(data.amounts?.taxRate || 0.16) // 16% por defecto
        };
        
        // Si no hay subtotal pero hay productsSubtotal, calcular
        if (this.amounts.subtotal === 0 && this.amounts.productsSubtotal > 0) {
            this.amounts.subtotal = this.amounts.productsSubtotal + this.amounts.additionalChargesTotal;
        }
        
        // Si no hay total pero hay subtotal y tax, calcular
        if (this.amounts.total === 0 && this.amounts.subtotal > 0) {
            this.amounts.total = this.amounts.subtotal + this.amounts.tax;
        }
        
        // Documentos y metadata
        this.pdfURL = data.pdfURL || '';
        this.invoiceURL = data.invoiceURL || ''; // Para factura electrónica
        this.notes = data.notes || '';
        this.paymentMethod = data.paymentMethod || 'cash'; // cash, card, transfer, mixed
        this.paymentDetails = data.paymentDetails || {}; // Detalles específicos del pago
        this.status = data.status || 'completed'; // completed, cancelled, refunded, pending
        
        // Fechas
        this.date = data.date || null;
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        this.cancelledAt = data.cancelledAt || null;
        this.cancelledBy = data.cancelledBy || null;
    }

    // Generar número de venta único
    generateSaleNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `VTA-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
    }

    // Obtener fecha formateada
    getDateFormatted(locale = 'es-MX', options = {}) {
        if (!this.date) return 'N/A';
        
        const date = this.date.toDate ? this.date.toDate() : new Date(this.date);
        
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        
        return date.toLocaleString(locale, { ...defaultOptions, ...options });
    }

    // Obtener fecha corta (solo fecha)
    getShortDate() {
        if (!this.date) return 'N/A';
        const date = this.date.toDate ? this.date.toDate() : new Date(this.date);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // Obtener productos vendidos con detalles formateados
    getSoldItemsWithDetails() {
        return this.soldItems.map(item => ({
            ...item,
            priceFormatted: this.formatCurrency(item.price),
            hasProductId: !!item.productId,
            productLink: item.productId ? `/productos/product.html?id=${item.productId}` : '#',
            warrantyInfo: item.warranty ? 
                `Garantía: ${item.warranty} meses` : 'Sin garantía'
        }));
    }

    // Obtener productos únicos (agrupados por modelo)
    getUniqueProducts() {
        const productMap = new Map();
        
        this.soldItems.forEach(item => {
            const key = item.productId || item.model;
            if (!key) return;
            
            if (!productMap.has(key)) {
                productMap.set(key, {
                    productId: item.productId,
                    model: item.model,
                    sku: item.sku,
                    brand: item.brand,
                    category: item.category,
                    quantity: 0,
                    totalAmount: 0,
                    serials: [],
                    price: item.price
                });
            }
            
            const productData = productMap.get(key);
            productData.quantity++;
            productData.totalAmount += item.price;
            productData.serials.push(item.serialNumber);
        });
        
        return Array.from(productMap.values()).map(p => ({
            ...p,
            totalAmountFormatted: this.formatCurrency(p.totalAmount),
            priceFormatted: this.formatCurrency(p.price)
        }));
    }

    // Agrupar ventas por producto (para estadísticas)
    getSalesByProduct() {
        return this.getUniqueProducts();
    }

    // Obtener cargos adicionales formateados
    getAdditionalChargesFormatted() {
        return this.additionalCharges.map(charge => ({
            ...charge,
            amountFormatted: this.formatCurrency(charge.amount),
            typeLabel: this.getChargeTypeLabel(charge.type)
        }));
    }

    // Obtener label para tipo de cargo
    getChargeTypeLabel(type) {
        const labels = {
            shipping: 'Envío',
            installation: 'Instalación',
            discount: 'Descuento',
            warranty: 'Garantía extendida',
            other: 'Otro'
        };
        return labels[type] || type;
    }

    // Calcular total de productos
    calculateProductsTotal() {
        return this.soldItems.reduce((sum, item) => sum + item.price, 0);
    }

    // Calcular total de cargos adicionales
    calculateChargesTotal() {
        return this.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
    }

    // Recalcular todos los montos
    recalculateAmounts() {
        const productsSubtotal = this.calculateProductsTotal();
        const chargesTotal = this.calculateChargesTotal();
        const subtotal = productsSubtotal + chargesTotal;
        const tax = subtotal * this.amounts.taxRate;
        const total = subtotal + tax;

        this.amounts = {
            ...this.amounts,
            productsSubtotal,
            additionalChargesTotal: chargesTotal,
            subtotal,
            tax,
            total
        };

        return this.amounts;
    }

    // Formatear moneda
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    }

    // Obtener todos los montos formateados
    getAmountsFormatted() {
        return {
            productsSubtotal: this.formatCurrency(this.amounts.productsSubtotal),
            additionalChargesTotal: this.formatCurrency(this.amounts.additionalChargesTotal),
            subtotal: this.formatCurrency(this.amounts.subtotal),
            tax: this.formatCurrency(this.amounts.tax),
            total: this.formatCurrency(this.amounts.total),
            taxRate: (this.amounts.taxRate * 100) + '%'
        };
    }

    // Verificar si tiene factura
    hasInvoice() {
        return !!this.invoiceURL;
    }

    // Verificar si tiene PDF
    hasPDF() {
        return !!this.pdfURL;
    }

    // Verificar si está cancelada
    isCancelled() {
        return this.status === 'cancelled';
    }

    // Verificar si está completada
    isCompleted() {
        return this.status === 'completed';
    }

    // Verificar si está pendiente
    isPending() {
        return this.status === 'pending';
    }

    // Verificar si tiene garantías activas
    hasActiveWarranties() {
        if (!this.date) return false;
        
        const saleDate = this.date.toDate ? this.date.toDate() : new Date(this.date);
        const now = new Date();
        
        return this.soldItems.some(item => {
            if (!item.warranty) return false;
            const warrantyEnd = new Date(saleDate);
            warrantyEnd.setMonth(warrantyEnd.getMonth() + item.warranty);
            return warrantyEnd > now;
        });
    }

    // Obtener productos con garantía activa
    getItemsWithActiveWarranty() {
        if (!this.date) return [];
        
        const saleDate = this.date.toDate ? this.date.toDate() : new Date(this.date);
        const now = new Date();
        
        return this.soldItems.filter(item => {
            if (!item.warranty) return false;
            const warrantyEnd = new Date(saleDate);
            warrantyEnd.setMonth(warrantyEnd.getMonth() + item.warranty);
            return warrantyEnd > now;
        }).map(item => ({
            ...item,
            warrantyEnd: this.getWarrantyEndDate(item.warranty),
            warrantyEndFormatted: this.getWarrantyEndDate(item.warranty, true),
            daysRemaining: this.getWarrantyDaysRemaining(item.warranty)
        }));
    }

    // Obtener fecha de fin de garantía
    getWarrantyEndDate(warrantyMonths, formatted = false) {
        if (!this.date || !warrantyMonths) return formatted ? 'N/A' : null;
        
        const saleDate = this.date.toDate ? this.date.toDate() : new Date(this.date);
        const endDate = new Date(saleDate);
        endDate.setMonth(endDate.getMonth() + warrantyMonths);
        
        if (formatted) {
            return endDate.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }
        
        return endDate;
    }

    // Obtener días restantes de garantía
    getWarrantyDaysRemaining(warrantyMonths) {
        if (!this.date || !warrantyMonths) return 0;
        
        const endDate = this.getWarrantyEndDate(warrantyMonths);
        const now = new Date();
        
        if (endDate <= now) return 0;
        
        const diffTime = endDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    // Método para exportar a formato simple
    toJSON() {
        return {
            id: this.id,
            saleNumber: this.saleNumber,
            soldItems: this.soldItems,
            serialNumbers: this.serialNumbers,
            customer: this.customer,
            seller: this.seller,
            amounts: this.amounts,
            additionalCharges: this.additionalCharges,
            pdfURL: this.pdfURL,
            invoiceURL: this.invoiceURL,
            notes: this.notes,
            paymentMethod: this.paymentMethod,
            paymentDetails: this.paymentDetails,
            status: this.status,
            date: this.date,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            cancelledAt: this.cancelledAt,
            cancelledBy: this.cancelledBy
        };
    }

    // Preparar para guardar en Firestore
    toFirestore() {
        const data = {
            saleNumber: this.saleNumber,
            soldItems: this.soldItems,
            serialNumbers: this.serialNumbers,
            customer: this.customer,
            seller: this.seller,
            amounts: this.amounts,
            additionalCharges: this.additionalCharges,
            pdfURL: this.pdfURL,
            invoiceURL: this.invoiceURL,
            notes: this.notes,
            paymentMethod: this.paymentMethod,
            paymentDetails: this.paymentDetails,
            status: this.status,
            date: this.date || serverTimestamp(),
            createdAt: this.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Solo incluir campos de cancelación si existen
        if (this.cancelledAt) {
            data.cancelledAt = this.cancelledAt;
            data.cancelledBy = this.cancelledBy;
        }

        return data;
    }

    // Crear una copia de la venta
    clone() {
        return new Sale(this.id, this.toJSON());
    }

    // Método para cancelar la venta
    cancel(cancelledBy) {
        this.status = 'cancelled';
        this.cancelledAt = new Date();
        this.cancelledBy = cancelledBy;
    }

    // Método para reembolsar
    refund() {
        this.status = 'refunded';
    }

    // Método para agregar nota
    addNote(note) {
        this.notes = this.notes 
            ? `${this.notes}\n${new Date().toLocaleString()}: ${note}`
            : `${new Date().toLocaleString()}: ${note}`;
    }

    // Estadísticas de la venta
    getStats() {
        return {
            totalItems: this.soldItems.length,
            uniqueProducts: this.getUniqueProducts().length,
            totalCharges: this.additionalCharges.length,
            hasWarranty: this.soldItems.some(i => i.warranty),
            activeWarranties: this.getItemsWithActiveWarranty().length,
            averagePrice: this.soldItems.length > 0 
                ? this.amounts.productsSubtotal / this.soldItems.length 
                : 0
        };
    }
}

class SalesManager {
    constructor() {
        this.sales = [];
        this.listeners = [];
        console.log('SalesManager initialized');
    }

    // Obtener usuario actual del localStorage
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                return JSON.parse(userData);
            }
        } catch (error) {
            console.error('Error getting user from localStorage:', error);
        }
        return null;
    }

    // Crear una nueva venta
    async createSale(saleData) {
        try {
            console.log('Creating new sale:', saleData);
            
            const currentUser = this.getCurrentUser();
            
            // Preparar soldItems
            let soldItems = saleData.soldItems || [];
            
            // Si tenemos productos del formato antiguo, convertir
            if (soldItems.length === 0 && saleData.products) {
                soldItems = saleData.products.map(p => ({
                    serialNumber: p.serialNumber || p.serial || '',
                    productId: p.productId || p.id || null,
                    model: p.model || 'Unknown',
                    sku: p.sku || 'N/A',
                    price: parseFloat(p.price) || 0,
                    brand: p.brand || '',
                    category: p.category || '',
                    provider: p.provider || '',
                    warranty: p.warranty || null,
                    condition: p.condition || 'new'
                }));
            }
            
            // Si tenemos serialNumbers pero no soldItems
            if (soldItems.length === 0 && saleData.serialNumbers) {
                soldItems = saleData.serialNumbers.map(serial => ({
                    serialNumber: serial,
                    productId: null,
                    model: 'Unknown',
                    sku: 'N/A',
                    price: 0
                }));
            }
            
            // Calcular montos si no vienen
            const productsSubtotal = soldItems.reduce((sum, item) => sum + (item.price || 0), 0);
            const chargesTotal = (saleData.additionalCharges || [])
                .reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);
            const subtotal = productsSubtotal + chargesTotal;
            const taxRate = saleData.taxRate || 0.16;
            const tax = subtotal * taxRate;
            const total = subtotal + tax;
            
            const sale = {
                saleNumber: saleData.saleNumber || this.generateSaleNumber(),
                soldItems: soldItems,
                serialNumbers: soldItems.map(item => item.serialNumber),
                customer: {
                    name: saleData.customerName || saleData.customer?.name || '',
                    address: saleData.customerAddress || saleData.customer?.address || '',
                    phone: saleData.customerPhone || saleData.customer?.phone || '',
                    email: saleData.customerEmail || saleData.customer?.email || '',
                    rfc: saleData.customerRFC || saleData.customer?.rfc || '',
                    taxId: saleData.customerTaxId || saleData.customer?.taxId || ''
                },
                seller: {
                    uid: currentUser?.uid || saleData.seller?.uid || '',
                    displayName: currentUser?.displayName || currentUser?.fullName || saleData.seller?.displayName || '',
                    email: currentUser?.email || saleData.seller?.email || '',
                    role: currentUser?.role || saleData.seller?.role || ''
                },
                amounts: {
                    productsSubtotal: saleData.productsSubtotal || productsSubtotal,
                    additionalChargesTotal: saleData.additionalChargesTotal || chargesTotal,
                    subtotal: saleData.subtotal || subtotal,
                    tax: saleData.tax || tax,
                    total: saleData.total || total,
                    taxRate: saleData.taxRate || taxRate
                },
                additionalCharges: saleData.additionalCharges || [],
                pdfURL: saleData.pdfURL || '',
                invoiceURL: saleData.invoiceURL || '',
                notes: saleData.notes || '',
                paymentMethod: saleData.paymentMethod || 'cash',
                paymentDetails: saleData.paymentDetails || {},
                status: saleData.status || 'completed',
                date: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "sales"), sale);
            console.log(`Sale created with ID: ${docRef.id}`);
            
            const newSale = new Sale(docRef.id, sale);
            this.sales.unshift(newSale);
            
            // Notificar a listeners
            this.notifyListeners('create', newSale);
            
            return { id: docRef.id, sale: newSale };
        } catch (error) {
            console.error("Error creating sale:", error);
            throw error;
        }
    }

    // Actualizar URL del PDF
    async updateSalePDF(saleId, pdfURL) {
        try {
            const docRef = doc(db, "sales", saleId);
            await updateDoc(docRef, {
                pdfURL: pdfURL,
                updatedAt: serverTimestamp()
            });
            
            // Actualizar en caché
            const sale = this.sales.find(s => s.id === saleId);
            if (sale) {
                sale.pdfURL = pdfURL;
                sale.updatedAt = new Date();
            }
            
            console.log(`Sale ${saleId} PDF URL updated`);
            return true;
        } catch (error) {
            console.error("Error updating sale PDF:", error);
            throw error;
        }
    }

    // Actualizar URL de factura
    async updateSaleInvoice(saleId, invoiceURL) {
        try {
            const docRef = doc(db, "sales", saleId);
            await updateDoc(docRef, {
                invoiceURL: invoiceURL,
                updatedAt: serverTimestamp()
            });
            
            // Actualizar en caché
            const sale = this.sales.find(s => s.id === saleId);
            if (sale) {
                sale.invoiceURL = invoiceURL;
                sale.updatedAt = new Date();
            }
            
            console.log(`Sale ${saleId} invoice URL updated`);
            return true;
        } catch (error) {
            console.error("Error updating sale invoice:", error);
            throw error;
        }
    }

    // Cancelar venta
    async cancelSale(saleId, cancelledBy) {
        try {
            const docRef = doc(db, "sales", saleId);
            const cancelledAt = new Date();
            
            await updateDoc(docRef, {
                status: 'cancelled',
                cancelledAt: cancelledAt,
                cancelledBy: cancelledBy,
                updatedAt: serverTimestamp()
            });
            
            // Actualizar en caché
            const sale = this.sales.find(s => s.id === saleId);
            if (sale) {
                sale.status = 'cancelled';
                sale.cancelledAt = cancelledAt;
                sale.cancelledBy = cancelledBy;
                sale.updatedAt = new Date();
            }
            
            console.log(`Sale ${saleId} cancelled`);
            return true;
        } catch (error) {
            console.error("Error cancelling sale:", error);
            throw error;
        }
    }

    // Obtener ventas por fecha
    async getSalesByDateRange(startDate, endDate) {
        try {
            const q = query(
                collection(db, "sales"),
                where("date", ">=", startDate),
                where("date", "<=", endDate),
                orderBy("date", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            const sales = [];
            querySnapshot.forEach((doc) => {
                sales.push(new Sale(doc.id, doc.data()));
            });
            
            return sales;
        } catch (error) {
            console.error("Error getting sales by date:", error);
            throw error;
        }
    }

    // Obtener ventas por vendedor
    async getSalesBySeller(sellerUid) {
        try {
            const q = query(
                collection(db, "sales"),
                where("seller.uid", "==", sellerUid),
                orderBy("date", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            const sales = [];
            querySnapshot.forEach((doc) => {
                sales.push(new Sale(doc.id, doc.data()));
            });
            
            return sales;
        } catch (error) {
            console.error("Error getting sales by seller:", error);
            throw error;
        }
    }

    // Obtener ventas por producto
    async getSalesByProduct(productId) {
        try {
            // Nota: Esta consulta requiere un índice compuesto en Firestore
            const q = query(
                collection(db, "sales"),
                where("soldItems.productId", "==", productId),
                orderBy("date", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            const sales = [];
            querySnapshot.forEach((doc) => {
                sales.push(new Sale(doc.id, doc.data()));
            });
            
            return sales;
        } catch (error) {
            console.error("Error getting sales by product:", error);
            throw error;
        }
    }

    // Obtener venta por número de serie
    async getSaleBySerialNumber(serialNumber) {
        try {
            const q = query(
                collection(db, "sales"),
                where("serialNumbers", "array-contains", serialNumber)
            );
            
            const querySnapshot = await getDocs(q);
            const sales = [];
            querySnapshot.forEach((doc) => {
                sales.push(new Sale(doc.id, doc.data()));
            });
            
            return sales;
        } catch (error) {
            console.error("Error getting sale by serial:", error);
            throw error;
        }
    }

    // Obtener venta por ID
    async getSaleById(saleId) {
        try {
            const docRef = doc(db, "sales", saleId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const sale = new Sale(docSnap.id, docSnap.data());
                
                // Actualizar caché
                const index = this.sales.findIndex(s => s.id === saleId);
                if (index >= 0) {
                    this.sales[index] = sale;
                } else {
                    this.sales.unshift(sale);
                }
                
                return sale;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error getting sale:", error);
            throw error;
        }
    }

    // Obtener todas las ventas
    async loadSales(limitCount = 100) {
        try {
            const q = query(
                collection(db, "sales"), 
                orderBy("date", "desc"),
                limit(limitCount)
            );
            
            const querySnapshot = await getDocs(q);
            
            this.sales = [];
            querySnapshot.forEach((doc) => {
                this.sales.push(new Sale(doc.id, doc.data()));
            });
            
            return this.sales;
        } catch (error) {
            console.error("Error loading sales:", error);
            throw error;
        }
    }

    // Cargar más ventas (paginación)
    async loadMoreSales(lastSale, limitCount = 20) {
        try {
            if (!lastSale || !lastSale.date) return [];
            
            const q = query(
                collection(db, "sales"),
                orderBy("date", "desc"),
                startAfter(lastSale.date),
                limit(limitCount)
            );
            
            const querySnapshot = await getDocs(q);
            const newSales = [];
            querySnapshot.forEach((doc) => {
                const sale = new Sale(doc.id, doc.data());
                newSales.push(sale);
                this.sales.push(sale);
            });
            
            return newSales;
        } catch (error) {
            console.error("Error loading more sales:", error);
            throw error;
        }
    }

    // Buscar ventas
    async searchSales(searchTerm) {
        try {
            // Búsqueda simple por número de venta o nombre de cliente
            // Para búsquedas más complejas, considera usar Algolia o similar
            const term = searchTerm.toLowerCase();
            
            return this.sales.filter(sale => 
                sale.saleNumber.toLowerCase().includes(term) ||
                sale.customer.name.toLowerCase().includes(term) ||
                sale.customer.email.toLowerCase().includes(term) ||
                sale.seller.displayName.toLowerCase().includes(term)
            );
        } catch (error) {
            console.error("Error searching sales:", error);
            throw error;
        }
    }

    // Obtener estadísticas de ventas
    async getSalesStats(startDate, endDate) {
        try {
            let sales = this.sales;
            
            if (startDate && endDate) {
                sales = await this.getSalesByDateRange(startDate, endDate);
            }
            
            const stats = {
                totalSales: sales.length,
                totalAmount: 0,
                averageAmount: 0,
                byStatus: {
                    completed: 0,
                    cancelled: 0,
                    refunded: 0,
                    pending: 0
                },
                byPaymentMethod: {},
                topSellers: new Map(),
                topProducts: new Map(),
                dailyTotals: new Map()
            };
            
            sales.forEach(sale => {
                // Total amount
                stats.totalAmount += sale.amounts.total;
                
                // By status
                if (stats.byStatus[sale.status] !== undefined) {
                    stats.byStatus[sale.status]++;
                }
                
                // By payment method
                stats.byPaymentMethod[sale.paymentMethod] = 
                    (stats.byPaymentMethod[sale.paymentMethod] || 0) + 1;
                
                // Top sellers
                if (sale.seller.displayName) {
                    const sellerKey = sale.seller.displayName;
                    if (!stats.topSellers.has(sellerKey)) {
                        stats.topSellers.set(sellerKey, {
                            name: sellerKey,
                            count: 0,
                            amount: 0
                        });
                    }
                    const seller = stats.topSellers.get(sellerKey);
                    seller.count++;
                    seller.amount += sale.amounts.total;
                }
                
                // Top products
                sale.soldItems.forEach(item => {
                    if (item.productId) {
                        const productKey = item.productId;
                        if (!stats.topProducts.has(productKey)) {
                            stats.topProducts.set(productKey, {
                                productId: item.productId,
                                model: item.model,
                                sku: item.sku,
                                count: 0,
                                amount: 0
                            });
                        }
                        const product = stats.topProducts.get(productKey);
                        product.count++;
                        product.amount += item.price;
                    }
                });
                
                // Daily totals
                const date = sale.getShortDate();
                stats.dailyTotals.set(date, 
                    (stats.dailyTotals.get(date) || 0) + sale.amounts.total);
            });
            
            stats.averageAmount = stats.totalSales > 0 
                ? stats.totalAmount / stats.totalSales 
                : 0;
            
            // Convertir Maps a arrays ordenados
            stats.topSellers = Array.from(stats.topSellers.values())
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10);
            
            stats.topProducts = Array.from(stats.topProducts.values())
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10);
            
            stats.dailyTotals = Array.from(stats.dailyTotals.entries())
                .sort((a, b) => a[0].localeCompare(b[0]));
            
            return stats;
        } catch (error) {
            console.error("Error getting sales stats:", error);
            throw error;
        }
    }

    // Generar número de venta
    generateSaleNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `VTA-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
    }

    // Agregar listener para cambios
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notificar a listeners
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in listener:', error);
            }
        });
    }

    // Limpiar caché
    clearCache() {
        this.sales = [];
        console.log('Sales cache cleared');
    }
}

export { Sale, SalesManager };