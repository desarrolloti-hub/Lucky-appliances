// carousel.js - Class for the carousel
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

class CarouselItem {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.image = data.image || '';
        this.createdAt = data.createdAt || null;
        this.order = data.order || 0; // For ordering
    }

    getImageUrl() {
        if (!this.image) {
            return 'https://via.placeholder.com/1200x400/0a2540/ffffff?text=No+Image';
        }
        return this.image;
    }

    toAdminHTML() {
        const imageUrl = this.getImageUrl();
        const fecha = this.createdAt ? 
            this.createdAt.toDate().toLocaleDateString('en-US') : 
            'No date';

        return `
            <div class="carousel-item-card" data-id="${this.id}">
                <div class="carousel-item-image">
                    <img src="${imageUrl}" alt="${this.nombre}" 
                         onerror="this.src='https://via.placeholder.com/1200x400/0a2540/ffffff?text=Image+Error'">
                </div>
                <div class="carousel-item-content">
                    <h4>${this.nombre}</h4>
                    <p>${this.descripcion || 'No description'}</p>
                    <div class="carousel-item-meta">
                        <span><i class="fas fa-calendar"></i> ${fecha}</span>
                    </div>
                    <div class="carousel-item-actions">
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

class CarouselManager {
    constructor() {
        this.items = [];
    }

    async loadItems() {
        try {
            // Order by creation date (newest first)
            const q = query(collection(db, "carousel"), orderBy("createdAt", "asc"));
            const querySnapshot = await getDocs(q);
            
            this.items = [];
            querySnapshot.forEach(doc => {
                const item = new CarouselItem(doc.id, doc.data());
                this.items.push(item);
            });
            
            return this.items;
        } catch (error) {
            console.error("Error loading carousel:", error);
            throw error;
        }
    }

    async addItem(data) {
        try {
            const itemData = {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion.trim(),
                image: data.image,
                order: data.order || 0,
                createdAt: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(db, "carousel"), itemData);
            
            // Add to local list
            const newItem = new CarouselItem(docRef.id, {
                ...itemData,
                createdAt: new Date()
            });
            this.items.unshift(newItem); // Add to beginning
            
            return docRef.id;
        } catch (error) {
            console.error("Error adding item:", error);
            throw error;
        }
    }

    async updateItem(id, data) {
        try {
            const docRef = doc(db, "carousel", id);
            const updateData = {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion.trim(),
                image: data.image
            };
            
            await updateDoc(docRef, updateData);
            
            // Update in local list
            const index = this.items.findIndex(item => item.id === id);
            if (index !== -1) {
                this.items[index].nombre = updateData.nombre;
                this.items[index].descripcion = updateData.descripcion;
                this.items[index].image = updateData.image;
            }
            
            return true;
        } catch (error) {
            console.error("Error updating item:", error);
            throw error;
        }
    }

    async deleteItem(id) {
        try {
            await deleteDoc(doc(db, "carousel", id));
            
            // Remove from local list
            this.items = this.items.filter(item => item.id !== id);
            
            return true;
        } catch (error) {
            console.error("Error deleting item:", error);
            throw error;
        }
    }

    getItemById(id) {
        return this.items.find(item => item.id === id);
    }

    getTotalItems() {
        return this.items.length;
    }
}

export { CarouselItem, CarouselManager };