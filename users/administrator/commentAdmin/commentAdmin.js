// comment-admin.js - CRUD for comment management with SweetAlert
import { CommentManager } from '/classes/comment.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Create global instance
const commentManager = new CommentManager();

// Variables para manejo de estado
let currentFilter = 'all'; // 'all', 'unread', 'read', 'published', 'not-published', 'archived'

document.addEventListener('DOMContentLoaded', function() {
    // Load comments
    loadComments();
    
    // Configure events
    setupEventListeners();
});

async function loadComments() {
    try {
        showLoading(true);
        
        // Cargar todos los comentarios
        await commentManager.loadComments();
        
        // Actualizar estadísticas
        updateStats();
        
        // Mostrar comentarios
        displayComments();
        
    } catch (error) {
        console.error('Error loading comments:', error);
        showError('Error loading comments: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    // Search input
    document.getElementById('searchInput')?.addEventListener('input', function(e) {
        searchComments(e.target.value);
    });
    
    // Filter buttons
    document.getElementById('filterAll')?.addEventListener('click', () => {
        setFilter('all');
    });
    
    document.getElementById('filterUnread')?.addEventListener('click', () => {
        setFilter('unread');
    });
    
    document.getElementById('filterRead')?.addEventListener('click', () => {
        setFilter('read');
    });
    
    document.getElementById('filterPublished')?.addEventListener('click', () => {
        setFilter('published');
    });
    
    document.getElementById('filterArchived')?.addEventListener('click', () => {
        setFilter('archived');
    });
}

function updateStats() {
    const statsContainer = document.getElementById('statsContainer');
    const totalComments = commentManager.getTotalComments();
    const unreadComments = commentManager.getUnreadComments().length;
    const readComments = commentManager.comments.filter(c => c.status === 'read' && c.status !== 'archived').length;
    const publishedComments = commentManager.getPublishedComments().length;
    const notPublishedComments = commentManager.getNotPublishedComments().length;
    const archivedComments = commentManager.getArchivedComments().length;
    
    statsContainer.innerHTML = `
        <div class="stat-card unread">
            <i class="fas fa-envelope stat-icon"></i>
            <div class="stat-number">${unreadComments}</div>
            <div class="stat-label">Unread</div>
        </div>
        
        <div class="stat-card read">
            <i class="fas fa-envelope-open stat-icon"></i>
            <div class="stat-number">${readComments}</div>
            <div class="stat-label">Read</div>
        </div>
        
        <div class="stat-card published">
            <i class="fas fa-eye stat-icon"></i>
            <div class="stat-number">${publishedComments}</div>
            <div class="stat-label">Published</div>
        </div>
        
        <div class="stat-card not-published">
            <i class="fas fa-eye-slash stat-icon"></i>
            <div class="stat-number">${notPublishedComments}</div>
            <div class="stat-label">Not Published</div>
        </div>
        
        <div class="stat-card archived">
            <i class="fas fa-archive stat-icon"></i>
            <div class="stat-number">${archivedComments}</div>
            <div class="stat-label">Archived</div>
        </div>
    `;
}

function displayComments(searchTerm = '') {
    const container = document.getElementById('commentsContainer');
    const emptyState = document.getElementById('emptyState');
    
    // Asegurar que el contenedor tenga la clase correcta
    container.className = 'comments-grid';
    
    // Filtrar comentarios
    let filteredComments = [];
    
    if (searchTerm) {
        filteredComments = commentManager.searchComments(searchTerm);
    } else if (currentFilter !== 'all') {
        switch (currentFilter) {
            case 'unread':
                filteredComments = commentManager.getUnreadComments();
                break;
            case 'read':
                filteredComments = commentManager.comments.filter(c => 
                    c.status === 'read' && c.status !== 'archived'
                );
                break;
            case 'published':
                filteredComments = commentManager.getPublishedComments();
                break;
            case 'not-published':
                filteredComments = commentManager.getNotPublishedComments();
                break;
            case 'archived':
                filteredComments = commentManager.getArchivedComments();
                break;
            default:
                filteredComments = commentManager.comments;
        }
    } else {
        filteredComments = commentManager.comments;
    }
    
    // Ordenar por fecha (más reciente primero)
    filteredComments.sort((a, b) => {
        const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
        const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
        return dateB - dateA;
    });
    
    // Mostrar resultados
    if (filteredComments.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        
        if (searchTerm) {
            emptyState.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>No comments match "${searchTerm}"</p>
                <p class="text-light">Try a different search term</p>
            `;
        } else {
            emptyState.innerHTML = `
                <i class="fas fa-comments"></i>
                <h3>No comments found</h3>
                <p>There are no ${currentFilter === 'all' ? '' : currentFilter + ' '}comments</p>
                <p class="text-light">Try changing the filter</p>
            `;
        }
        
    } else {
        emptyState.style.display = 'none';
        container.innerHTML = filteredComments.map(comment => {
            // Determinar si el mensaje es largo (más de 300 caracteres)
            const isLongMessage = comment.message.length > 300;
            const displayMessage = isLongMessage ? 
                comment.message.substring(0, 300) + '...' : 
                comment.message;
            
            // Determinar badge de publicación
            const publishBadge = comment.getPublishBadge();
            const statusBadge = comment.getStatusBadge();
            
            // Determinar botones según estado
            let actionButtons = '';
            
            if (comment.status === 'archived') {
                // Comentarios archivados
                actionButtons = `
                    <button class="comment-action-btn btn-unarchive" data-id="${comment.id}">
                        <i class="fas fa-box-open"></i>
                        Unarchive
                    </button>
                    <button class="comment-action-btn btn-delete-comment" data-id="${comment.id}">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                `;
            } else {
                // Comentarios no archivados
                if (comment.published) {
                    // Ya publicado - mostrar botón para despublicar
                    actionButtons = `
                        <button class="comment-action-btn btn-unpublish" data-id="${comment.id}">
                            <i class="fas fa-eye-slash"></i>
                            Unpublish
                        </button>
                        ${comment.status === 'unread' ? `
                            <button class="comment-action-btn btn-mark-read" data-id="${comment.id}">
                                <i class="fas fa-check-circle"></i>
                                Mark as Read
                            </button>
                        ` : ''}
                        <button class="comment-action-btn btn-archive" data-id="${comment.id}">
                            <i class="fas fa-archive"></i>
                            Archive
                        </button>
                    `;
                } else {
                    // No publicado - mostrar botón para publicar
                    actionButtons = `
                        <button class="comment-action-btn btn-publish" data-id="${comment.id}">
                            <i class="fas fa-eye"></i>
                            Publish
                        </button>
                        ${comment.status === 'unread' ? `
                            <button class="comment-action-btn btn-mark-read" data-id="${comment.id}">
                                <i class="fas fa-check-circle"></i>
                                Mark as Read
                            </button>
                        ` : ''}
                        <button class="comment-action-btn btn-archive" data-id="${comment.id}">
                            <i class="fas fa-archive"></i>
                            Archive
                        </button>
                    `;
                }
            }
            
            return `
                <div class="comment-item-card ${comment.status}" data-id="${comment.id}">
                    <div class="comment-header-info">
                        <div class="user-info">
                            <div class="user-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="user-details">
                                <div class="user-name" title="${comment.name}">${comment.name}</div>
                                <div class="user-contact">
                                    <span title="${comment.email}">
                                        <i class="fas fa-envelope"></i> ${comment.email.substring(0, 20)}${comment.email.length > 20 ? '...' : ''}
                                    </span>
                                    ${comment.phone ? `
                                        <span title="${comment.phone}">
                                            <i class="fas fa-phone"></i> ${comment.phone}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="comment-meta">
                            <div>
                                ${statusBadge}
                                ${publishBadge}
                            </div>
                            <div class="comment-date" title="${comment.getFormattedDate()}">
                                ${comment.getTimeAgo()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="comment-content">
                        <div class="comment-message" id="message-${comment.id}">
                            ${displayMessage}
                        </div>
                        ${isLongMessage ? `
                            <button class="read-more-btn" data-id="${comment.id}" onclick="toggleReadMore('${comment.id}')">
                                <i class="fas fa-chevron-down"></i>
                                Read more
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="comment-actions">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach events to buttons
        attachButtonEvents();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)
        ?.classList.add('active');
    
    // Display filtered comments
    displayComments();
}

function searchComments(searchTerm) {
    displayComments(searchTerm);
}

function attachButtonEvents() {
    // Publish buttons
    document.querySelectorAll('.btn-publish').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            publishComment(id);
        });
    });
    
    // Unpublish buttons
    document.querySelectorAll('.btn-unpublish').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            unpublishComment(id);
        });
    });
    
    // Mark as read buttons
    document.querySelectorAll('.btn-mark-read').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            markAsRead(id);
        });
    });
    
    // Archive buttons
    document.querySelectorAll('.btn-archive').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            archiveComment(id);
        });
    });
    
    // Unarchive buttons
    document.querySelectorAll('.btn-unarchive').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            unarchiveComment(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            confirmDeleteComment(id);
        });
    });
}

async function publishComment(id) {
    try {
        const comment = commentManager.getCommentById(id);
        if (!comment) {
            showError('Comment not found');
            return;
        }
        
        if (comment.published) {
            showInfo('Comment is already published');
            return;
        }
        
        Swal.fire({
            title: 'Publish comment?',
            html: `This will make the comment visible on the website.<br><small>Users will be able to see this comment.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, publish',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Show loading
                    Swal.fire({
                        title: 'Publishing...',
                        text: 'Please wait',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    await commentManager.togglePublishStatus(id, true);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Published!',
                        text: 'Comment has been published successfully',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
                    
                    // Refresh display
                    await loadComments();
                    
                } catch (error) {
                    console.error('Error publishing comment:', error);
                    showError('Error publishing comment: ' + error.message);
                }
            }
        });
        
    } catch (error) {
        console.error('Error in publishComment:', error);
        showError('Error: ' + error.message);
    }
}

async function unpublishComment(id) {
    try {
        const comment = commentManager.getCommentById(id);
        if (!comment) {
            showError('Comment not found');
            return;
        }
        
        if (!comment.published) {
            showInfo('Comment is not published');
            return;
        }
        
        Swal.fire({
            title: 'Unpublish comment?',
            html: `This will hide the comment from the website.<br><small>Users will no longer see this comment.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6c757d',
            cancelButtonColor: '#28a745',
            confirmButtonText: 'Yes, unpublish',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Show loading
                    Swal.fire({
                        title: 'Unpublishing...',
                        text: 'Please wait',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    await commentManager.togglePublishStatus(id, false);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Unpublished!',
                        text: 'Comment has been unpublished',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
                    
                    // Refresh display
                    await loadComments();
                    
                } catch (error) {
                    console.error('Error unpublishing comment:', error);
                    showError('Error unpublishing comment: ' + error.message);
                }
            }
        });
        
    } catch (error) {
        console.error('Error in unpublishComment:', error);
        showError('Error: ' + error.message);
    }
}

async function markAsRead(id) {
    try {
        const comment = commentManager.getCommentById(id);
        if (!comment) {
            showError('Comment not found');
            return;
        }
        
        if (comment.status === 'read') {
            showInfo('Comment is already marked as read');
            return;
        }
        
        Swal.fire({
            title: 'Mark as read?',
            text: 'Mark this comment as read?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#007bff',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Mark as Read',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Show loading
                    Swal.fire({
                        title: 'Updating...',
                        text: 'Please wait',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    await commentManager.updateCommentStatus(id, 'read');
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated!',
                        text: 'Comment marked as read',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
                    
                    // Refresh display
                    await loadComments();
                    
                } catch (error) {
                    console.error('Error updating comment:', error);
                    showError('Error updating comment: ' + error.message);
                }
            }
        });
        
    } catch (error) {
        console.error('Error in markAsRead:', error);
        showError('Error: ' + error.message);
    }
}

async function archiveComment(id) {
    try {
        const comment = commentManager.getCommentById(id);
        if (!comment) {
            showError('Comment not found');
            return;
        }
        
        if (comment.status === 'archived') {
            showInfo('Comment is already archived');
            return;
        }
        
        Swal.fire({
            title: 'Archive comment?',
            html: `This will archive the comment.<br><small>Archived comments are hidden and can be restored later.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#17a2b8',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Archive',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Show loading
                    Swal.fire({
                        title: 'Archiving...',
                        text: 'Please wait',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    await commentManager.updateCommentStatus(id, 'archived');
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Archived!',
                        text: 'Comment has been archived',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
                    
                    // Refresh display
                    await loadComments();
                    
                } catch (error) {
                    console.error('Error archiving comment:', error);
                    showError('Error archiving comment: ' + error.message);
                }
            }
        });
        
    } catch (error) {
        console.error('Error in archiveComment:', error);
        showError('Error: ' + error.message);
    }
}

async function unarchiveComment(id) {
    try {
        const comment = commentManager.getCommentById(id);
        if (!comment) {
            showError('Comment not found');
            return;
        }
        
        if (comment.status !== 'archived') {
            showInfo('Comment is not archived');
            return;
        }
        
        Swal.fire({
            title: 'Unarchive comment?',
            html: `This will restore the comment.<br><small>The comment will be moved back to active comments.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6c757d',
            cancelButtonColor: '#17a2b8',
            confirmButtonText: 'Unarchive',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Show loading
                    Swal.fire({
                        title: 'Unarchiving...',
                        text: 'Please wait',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    await commentManager.updateCommentStatus(id, 'read');
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Unarchived!',
                        text: 'Comment has been unarchived',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
                    
                    // Refresh display
                    await loadComments();
                    
                } catch (error) {
                    console.error('Error unarchiving comment:', error);
                    showError('Error unarchiving comment: ' + error.message);
                }
            }
        });
        
    } catch (error) {
        console.error('Error in unarchiveComment:', error);
        showError('Error: ' + error.message);
    }
}

async function confirmDeleteComment(id) {
    const comment = commentManager.getCommentById(id);
    if (!comment) return;
    
    Swal.fire({
        title: 'Delete comment?',
        html: `Are you sure you want to delete this comment?<br><small>This action cannot be undone.</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Show loading
                Swal.fire({
                    title: 'Deleting...',
                    text: 'Please wait',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                await commentManager.deleteComment(id);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Comment deleted successfully',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
                
                // Refresh display
                await loadComments();
                
            } catch (error) {
                console.error('Error deleting comment:', error);
                showError('Error deleting comment: ' + error.message);
            }
        }
    });
}

// Función para expandir/contraer mensajes largos
window.toggleReadMore = function(commentId) {
    const messageElement = document.getElementById(`message-${commentId}`);
    const button = document.querySelector(`.read-more-btn[data-id="${commentId}"]`);
    
    if (!messageElement || !button) return;
    
    if (messageElement.classList.contains('expanded')) {
        // Contraer
        const fullMessage = commentManager.getCommentById(commentId)?.message || '';
        const shortMessage = fullMessage.length > 300 ? 
            fullMessage.substring(0, 300) + '...' : 
            fullMessage;
        
        messageElement.innerHTML = shortMessage;
        messageElement.classList.remove('expanded');
        button.innerHTML = '<i class="fas fa-chevron-down"></i> Read more';
        button.title = 'Show full message';
    } else {
        // Expandir
        const fullMessage = commentManager.getCommentById(commentId)?.message || '';
        messageElement.innerHTML = fullMessage;
        messageElement.classList.add('expanded');
        button.innerHTML = '<i class="fas fa-chevron-up"></i> Show less';
        button.title = 'Show less';
        
        // Scroll suave al mensaje expandido
        setTimeout(() => {
            messageElement.scrollIntoView({ 
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 100);
    }
};

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

// Notification functions with SweetAlert
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
    });
}

function showInfo(message) {
    Swal.fire({
        icon: 'info',
        title: 'Info',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

function showWarning(message) {
    Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// Función para actualizar comentarios manualmente
window.refreshComments = async function() {
    await loadComments();
};