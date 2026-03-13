// comment.js - Class for comment management
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
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Comment {
    constructor(id, data) {
        this.id = id;
        this.email = data.email || '';
        this.name = data.name || '';
        this.message = data.message || '';
        this.phone = data.phone || '';
        this.status = data.status || 'unread'; // 'unread', 'read', 'archived'
        this.published = data.published || false; // true = publicado, false = no publicado
        this.timestamp = data.timestamp || null;
        this.lastUpdated = data.lastUpdated || null;
        
        console.log(`Comment ${id} created:`, {
            name: this.name,
            email: this.email,
            status: this.status,
            published: this.published,
            messagePreview: this.message.substring(0, 50) + (this.message.length > 50 ? '...' : '')
        });
    }

    getFormattedDate(dateField = 'timestamp') {
        const date = this[dateField];
        if (!date) return 'No date';
        
        try {
            const jsDate = date.toDate ? date.toDate() : new Date(date);
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(jsDate);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    }

    getTimeAgo(dateField = 'timestamp') {
        const date = this[dateField];
        if (!date) return '';
        
        try {
            const jsDate = date.toDate ? date.toDate() : new Date(date);
            const now = new Date();
            const seconds = Math.floor((now - jsDate) / 1000);
            
            if (seconds < 60) return 'Just now';
            
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            
            const days = Math.floor(hours / 24);
            if (days < 7) return `${days}d ago`;
            
            const weeks = Math.floor(days / 7);
            if (weeks < 4) return `${weeks}w ago`;
            
            const months = Math.floor(days / 30);
            if (months < 12) return `${months}mo ago`;
            
            const years = Math.floor(days / 365);
            return `${years}y ago`;
        } catch (error) {
            return '';
        }
    }

    getStatusBadge() {
        const statusConfig = {
            'unread': { class: 'badge-unread', text: 'Unread', icon: 'fa-envelope' },
            'read': { class: 'badge-read', text: 'Read', icon: 'fa-envelope-open' },
            'archived': { class: 'badge-archived', text: 'Archived', icon: 'fa-archive' }
        };
        
        const config = statusConfig[this.status] || statusConfig.unread;
        return `<span class="comment-badge ${config.class}">
            <i class="fas ${config.icon}"></i> ${config.text}
        </span>`;
    }

    getPublishBadge() {
        if (this.published) {
            return `<span class="comment-badge badge-published">
                <i class="fas fa-eye"></i> Published
            </span>`;
        } else {
            return `<span class="comment-badge badge-not-published">
                <i class="fas fa-eye-slash"></i> Not Published
            </span>`;
        }
    }

    static validateFormData(formData) {
        const errors = [];
        
        // Required fields
        if (!formData.name?.trim()) errors.push('Name is required');
        if (!formData.email?.trim()) errors.push('Email is required');
        if (!formData.message?.trim()) errors.push('Message is required');
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email.trim())) {
            errors.push('Please enter a valid email address');
        }
        
        // Phone validation (if provided)
        if (formData.phone && formData.phone.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(formData.phone.trim())) {
                errors.push('Please enter a valid phone number');
            }
        }
        
        // Message length
        if (formData.message && formData.message.trim().length > 1000) {
            errors.push('Message should be less than 1000 characters');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            cleanedData: {
                name: formData.name?.trim() || '',
                email: formData.email?.trim() || '',
                message: formData.message?.trim() || '',
                phone: formData.phone?.trim() || '',
                status: 'unread',
                published: false,
                timestamp: serverTimestamp(),
                lastUpdated: serverTimestamp()
            }
        };
    }
}

class CommentManager {
    constructor() {
        this.comments = [];
        console.log('CommentManager initialized');
    }

    async loadComments(options = {}) {
        try {
            console.log('Starting to load comments from Firebase...');
            console.log('Options:', options);
            
            let q = collection(db, "comments");
            const constraints = [];
            
            // Ordenar por timestamp
            constraints.push(orderBy("timestamp", "desc"));
            
            // Aplicar límite si está especificado
            if (options.limit) {
                constraints.push(limit(options.limit));
            }
            
            q = query(q, ...constraints);
            console.log('Firebase query created');
            
            const querySnapshot = await getDocs(q);
            console.log(`Firebase returned ${querySnapshot.size} documents`);
            
            this.comments = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                const comment = new Comment(doc.id, {
                    email: data.email || '',
                    name: data.name || '',
                    message: data.message || '',
                    phone: data.phone || '',
                    status: data.status || 'unread',
                    published: data.published || false,
                    timestamp: data.timestamp,
                    lastUpdated: data.lastUpdated
                });
                this.comments.push(comment);
            });
            
            console.log(`Total comments loaded: ${this.comments.length}`);
            
            return this.comments;
        } catch (error) {
            console.error("Error loading comments:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async addComment(data) {
        try {
            console.log('Starting to add comment:', {
                name: data.name,
                email: data.email,
                messageLength: data.message?.length || 0
            });
            
            // Validate data
            const validation = Comment.validateFormData(data);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            const commentData = validation.cleanedData;
            
            console.log('Comment data for Firebase:', {
                name: commentData.name,
                email: commentData.email,
                messageLength: commentData.message.length,
                phone: commentData.phone || 'Not provided',
                published: commentData.published
            });
            
            const docRef = await addDoc(collection(db, "comments"), commentData);
            console.log(`Comment added with ID: ${docRef.id}`);
            
            // Add to local list
            const newComment = new Comment(docRef.id, {
                ...commentData,
                timestamp: new Date(),
                lastUpdated: new Date()
            });
            this.comments.unshift(newComment);
            
            return { id: docRef.id, comment: newComment };
        } catch (error) {
            console.error("Error adding comment:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            throw error;
        }
    }

    async updateCommentStatus(id, status) {
        try {
            console.log(`Updating comment ${id} status to: ${status}`);
            
            const validStatuses = ['unread', 'read', 'archived'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }
            
            const docRef = doc(db, "comments", id);
            
            await updateDoc(docRef, {
                status: status,
                lastUpdated: serverTimestamp()
            });
            
            console.log(`Comment ${id} status updated successfully`);
            
            // Update in local list
            const index = this.comments.findIndex(comment => comment.id === id);
            if (index !== -1) {
                this.comments[index].status = status;
                this.comments[index].lastUpdated = new Date();
            }
            
            return true;
        } catch (error) {
            console.error("Error updating comment status:", error);
            throw error;
        }
    }

    async togglePublishStatus(id, publish) {
        try {
            console.log(`Setting comment ${id} published to: ${publish}`);
            
            const docRef = doc(db, "comments", id);
            
            await updateDoc(docRef, {
                published: publish,
                lastUpdated: serverTimestamp()
            });
            
            console.log(`Comment ${id} publish status updated to: ${publish}`);
            
            // Update in local list
            const index = this.comments.findIndex(comment => comment.id === id);
            if (index !== -1) {
                this.comments[index].published = publish;
                this.comments[index].lastUpdated = new Date();
            }
            
            return true;
        } catch (error) {
            console.error("Error updating publish status:", error);
            throw error;
        }
    }

    async deleteComment(id) {
        try {
            console.log(`Deleting comment ${id}`);
            
            await deleteDoc(doc(db, "comments", id));
            console.log(`Comment ${id} deleted successfully`);
            
            // Remove from local list
            this.comments = this.comments.filter(comment => comment.id !== id);
            
            return true;
        } catch (error) {
            console.error("Error deleting comment:", error);
            throw error;
        }
    }

    getCommentById(id) {
        const comment = this.comments.find(comment => comment.id === id);
        console.log(`Getting comment by ID ${id}:`, comment ? 'Found' : 'Not found');
        return comment;
    }

    getTotalComments() {
        return this.comments.length;
    }

    getUnreadComments() {
        return this.comments.filter(comment => comment.status === 'unread');
    }

    getPublishedComments() {
        return this.comments.filter(comment => comment.published === true);
    }

    getNotPublishedComments() {
        return this.comments.filter(comment => comment.published === false);
    }

    getArchivedComments() {
        return this.comments.filter(comment => comment.status === 'archived');
    }

    searchComments(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.comments.filter(comment => 
            (comment.name && comment.name.toLowerCase().includes(term)) ||
            (comment.email && comment.email.toLowerCase().includes(term)) ||
            (comment.message && comment.message.toLowerCase().includes(term)) ||
            (comment.phone && comment.phone.toLowerCase().includes(term))
        );
    }
}

export { Comment, CommentManager };