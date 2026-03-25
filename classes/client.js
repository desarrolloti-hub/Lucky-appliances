// client.js - Class for client management
import { db } from '/config/firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,           
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Client {
    constructor(id, data) {
        this.id = id;
        this.name = data.name || '';
        this.address = data.address || '';
        this.phone = data.phone || '';
        this.email = data.email || '';
        this.history = data.history || [];
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        this.createdBy = data.createdBy || '';
    }

    // Getters
    getName() {
        return this.name;
    }

    getAddress() {
        return this.address;
    }

    getPhone() {
        return this.phone;
    }

    getEmail() {
        return this.email;
    }

    getHistory() {
        return this.history;
    }

    getHistoryCount() {
        return this.history.length;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    // Setters
    setName(name) {
        this.name = name;
    }

    setAddress(address) {
        this.address = address;
    }

    setPhone(phone) {
        this.phone = phone;
    }

    setEmail(email) {
        this.email = email;
    }

    // Métodos de historial
    addToHistory(saleId) {
        if (!this.history.includes(saleId)) {
            this.history.push(saleId);
            return true;
        }
        return false;
    }

    removeFromHistory(saleId) {
        const index = this.history.indexOf(saleId);
        if (index !== -1) {
            this.history.splice(index, 1);
            return true;
        }
        return false;
    }

    // Validaciones
    isValid() {
        return this.name && this.name.trim() !== '';
    }

    hasEmail() {
        return this.email && this.email.trim() !== '';
    }

    hasPhone() {
        return this.phone && this.phone.trim() !== '';
    }

    // Formatear para mostrar
    getFormattedAddress() {
        return this.address || 'No address provided';
    }

    getFormattedPhone() {
        return this.phone || 'No phone';
    }

    getFormattedEmail() {
        return this.email || 'No email';
    }

    // Convertir a objeto para Firestore
    toFirestore() {
        return {
            name: this.name,
            address: this.address,
            phone: this.phone,
            email: this.email,
            history: this.history,
            createdAt: this.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: this.createdBy
        };
    }

    // Convertir a JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            address: this.address,
            phone: this.phone,
            email: this.email,
            history: this.history,
            historyCount: this.getHistoryCount(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

class ClientManager {
    constructor() {
        this.clients = [];
        this.listeners = [];
        console.log('ClientManager initialized');
    }

    // Obtener usuario actual
    getCurrentUserId() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                return user.uid || user.id || 'unknown-user';
            }
        } catch (error) {
            console.error('Error getting user from localStorage:', error);
        }
        return 'system';
    }

    // Crear nuevo cliente
    async createClient(clientData) {
        try {
            console.log('Creating new client:', clientData);
            
            const currentUserId = this.getCurrentUserId();
            
            const client = {
                name: clientData.name || '',
                address: clientData.address || '',
                phone: clientData.phone || '',
                email: clientData.email || '',
                history: clientData.history || [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: currentUserId
            };

            const docRef = await addDoc(collection(db, "clients"), client);
            console.log(`Client created with ID: ${docRef.id}`);
            
            const newClient = new Client(docRef.id, client);
            this.clients.unshift(newClient);
            
            this.notifyListeners('create', newClient);
            
            return { id: docRef.id, client: newClient };
            
        } catch (error) {
            console.error("Error creating client:", error);
            throw error;
        }
    }

    // Actualizar cliente
    async updateClient(clientId, clientData) {
        try {
            console.log(`Updating client ${clientId}:`, clientData);
            
            const docRef = doc(db, "clients", clientId);
            
            const updateData = {
                updatedAt: serverTimestamp()
            };
            
            if (clientData.name !== undefined) updateData.name = clientData.name;
            if (clientData.address !== undefined) updateData.address = clientData.address;
            if (clientData.phone !== undefined) updateData.phone = clientData.phone;
            if (clientData.email !== undefined) updateData.email = clientData.email;
            if (clientData.history !== undefined) updateData.history = clientData.history;
            
            await updateDoc(docRef, updateData);
            console.log(`Client ${clientId} updated successfully`);
            
            // Actualizar en caché
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
                Object.keys(updateData).forEach(key => {
                    if (key !== 'updatedAt') {
                        this.clients[index][key] = updateData[key];
                    }
                });
                this.clients[index].updatedAt = new Date();
            }
            
            this.notifyListeners('update', { id: clientId, data: updateData });
            
            return true;
            
        } catch (error) {
            console.error("Error updating client:", error);
            throw error;
        }
    }

    // Eliminar cliente
    async deleteClient(clientId) {
        try {
            console.log(`Deleting client ${clientId}`);
            
            await deleteDoc(doc(db, "clients", clientId));
            console.log(`Client ${clientId} deleted successfully`);
            
            // Eliminar de caché
            this.clients = this.clients.filter(client => client.id !== clientId);
            
            this.notifyListeners('delete', clientId);
            
            return true;
            
        } catch (error) {
            console.error("Error deleting client:", error);
            throw error;
        }
    }

    // Agregar compra al historial del cliente
    async addPurchaseToClient(clientId, saleId) {
        try {
            const client = this.getClientById(clientId);
            if (!client) {
                throw new Error('Client not found');
            }
            
            if (client.addToHistory(saleId)) {
                await this.updateClient(clientId, { history: client.history });
                return true;
            }
            return false;
            
        } catch (error) {
            console.error("Error adding purchase to client:", error);
            throw error;
        }
    }

    // Obtener cliente por ID
    getClientById(id) {
        return this.clients.find(client => client.id === id);
    }

    // Obtener cliente por email
    getClientByEmail(email) {
        return this.clients.find(client => client.email === email);
    }

    // Obtener cliente por teléfono
    getClientByPhone(phone) {
        return this.clients.find(client => client.phone === phone);
    }

    // Buscar clientes
    searchClients(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return this.clients;
        
        return this.clients.filter(client => 
            client.name.toLowerCase().includes(term) ||
            client.email.toLowerCase().includes(term) ||
            client.phone.includes(term)
        );
    }

    // Cargar todos los clientes
    async loadClients(limitCount = 500) {
        try {
            console.log('Loading clients from Firebase...');
            
            const q = query(
                collection(db, "clients"),
                orderBy("createdAt", "desc"),
                limit(limitCount)  // Ahora limit está definido
            );
            
            const querySnapshot = await getDocs(q);
            
            this.clients = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const client = new Client(doc.id, {
                    name: data.name || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    history: data.history || [],
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    createdBy: data.createdBy
                });
                this.clients.push(client);
            });
            
            console.log(`Loaded ${this.clients.length} clients`);
            return this.clients;
            
        } catch (error) {
            console.error("Error loading clients:", error);
            throw error;
        }
    }

    // Obtener estadísticas
    getStats() {
        const total = this.clients.length;
        const withEmail = this.clients.filter(c => c.hasEmail()).length;
        const withPhone = this.clients.filter(c => c.hasPhone()).length;
        const totalPurchases = this.clients.reduce((sum, c) => sum + c.getHistoryCount(), 0);
        
        return {
            total,
            withEmail,
            withPhone,
            totalPurchases
        };
    }

    // Agregar listener
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notificar listeners
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
        this.clients = [];
        console.log('Clients cache cleared');
    }
}

export { Client, ClientManager };