
// comment-form.js - Lógica para el formulario de comentarios
import { CommentManager } from '/classes/comment.js';

// Variables globales
let commentManager = null;
let isSubmitting = false;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Inicializar manager
        commentManager = new CommentManager();
        
        // Configurar eventos
        setupEventListeners();
        
        // Cargar comentarios recientes
        await loadRecentComments();
        
    } catch (error) {
        console.error('Error initializing comment form:', error);
        showError('Error loading comments. Please try again later.');
    }
});

// Configurar event listeners
function setupEventListeners() {
    const form = document.getElementById('commentForm');
    const messageInput = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    // Contador de caracteres
    messageInput.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = length;
        
        if (length > 1000) {
            charCount.style.color = 'var(--comments-danger)';
        } else if (length > 800) {
            charCount.style.color = 'var(--comments-warning)';
        } else {
            charCount.style.color = 'var(--comments-text)';
        }
    });
    
    // Validación en tiempo real
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
    
    // Envío del formulario
    form.addEventListener('submit', handleSubmit);
    
    // Reset del formulario
    resetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        resetForm();
    });
    
    // Previene múltiples envíos
    submitBtn.addEventListener('click', function(e) {
        if (isSubmitting) {
            e.preventDefault();
        }
    });
}

// Validar campo individual
function validateField(e) {
    const field = e.target;
    const errorElement = document.getElementById(field.id + 'Error');
    
    // Limpiar clases anteriores
    field.classList.remove('error', 'success');
    errorElement.textContent = '';
    
    // Validar campo vacío
    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Validaciones específicas por tipo
    switch (field.type) {
        case 'email':
            if (!isValidEmail(field.value)) {
                showFieldError(field, 'Please enter a valid email address');
                return false;
            }
            break;
            
        case 'tel':
            if (field.value && !isValidPhone(field.value)) {
                showFieldError(field, 'Please enter a valid phone number');
                return false;
            }
            break;
    }
    
    // Validaciones por atributos
    if (field.hasAttribute('minlength')) {
        const minLength = parseInt(field.getAttribute('minlength'));
        if (field.value.trim().length < minLength) {
            showFieldError(field, `Minimum ${minLength} characters required`);
            return false;
        }
    }
    
    if (field.hasAttribute('maxlength')) {
        const maxLength = parseInt(field.getAttribute('maxlength'));
        if (field.value.trim().length > maxLength) {
            showFieldError(field, `Maximum ${maxLength} characters allowed`);
            return false;
        }
    }
    
    // Campo válido
    field.classList.add('success');
    return true;
}

// Validar formulario completo
function validateForm() {
    const form = document.getElementById('commentForm');
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField({ target: input })) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Manejar envío del formulario
async function handleSubmit(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validar formulario
    if (!validateForm()) {
        return;
    }
    
    // Obtener datos del formulario
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        message: document.getElementById('message').value.trim()
    };
    
    // Configurar estado de envío
    setSubmittingState(true);
    
    try {
        // Enviar comentario
        const result = await commentManager.addComment(formData);
        
        // Mostrar mensaje de éxito
        showSuccessMessage();
        
        // Resetear formulario
        resetForm();
        
        // Recargar comentarios (añadir el nuevo al inicio)
        await loadRecentComments();
        
        // Scroll al nuevo comentario
        setTimeout(() => {
            const newComment = document.querySelector(`[data-id="${result.id}"]`);
            if (newComment) {
                newComment.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 500);
        
    } catch (error) {
        console.error('Error submitting comment:', error);
        showError('Error submitting comment. Please try again.');
    } finally {
        setSubmittingState(false);
    }
}

// Cargar comentarios recientes
async function loadRecentComments() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('commentsContainer');
    const noComments = document.getElementById('noComments');
    
    try {
        loading.style.display = 'flex';
        container.innerHTML = '';
        noComments.style.display = 'none';
        
        // Intentar cargar comentarios usando el método disponible
        if (typeof commentManager.loadComments === 'function') {
            await commentManager.loadComments();
        }
        else if (typeof commentManager.getAllComments === 'function') {
            await commentManager.getAllComments();
        }
        else {
            console.warn('No load method found, using direct access');
        }
        
        // Obtener todos los comentarios del manager
        let allComments = [];
        if (typeof commentManager.getComments === 'function') {
            allComments = commentManager.getComments();
        } else if (commentManager.comments) {
            allComments = commentManager.comments;
        } else {
            throw new Error('No se pudieron obtener los comentarios');
        }
        
        // Filtrar solo comentarios publicados (published: true) y con status "read"
        const publicComments = allComments.filter(comment => {
            const isPublished = comment.published !== undefined ? 
                comment.published === true : true;
            
            const isRead = comment.status !== undefined ? 
                comment.status === 'read' : true;
            
            return isPublished && isRead;
        });
        
        // Mostrar comentarios
        if (publicComments.length === 0) {
            noComments.style.display = 'flex';
        } else {
            // Mostrar máximo 10 comentarios, ordenados por fecha (más recientes primero)
            const commentsToShow = publicComments
                .sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                })
                .slice(0, 10);
            
            commentsToShow.forEach(comment => {
                const commentElement = createPublicCommentElement(comment);
                container.appendChild(commentElement);
            });
            
            // Añadir animaciones
            const comments = container.querySelectorAll('.public-comment');
            comments.forEach(comment => {
                comment.style.animation = 'fadeInUp 0.5s ease-out forwards';
                comment.style.opacity = '1';
            });
        }
        
    } catch (error) {
        console.error('Error loading comments:', error);
        noComments.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error loading comments</h3>
            <p>${error.message || 'Please try again later'}</p>
        `;
        noComments.style.display = 'flex';
    } finally {
        loading.style.display = 'none';
    }
}

// Crear elemento de comentario público con "Leer más"
function createPublicCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'public-comment';
    div.dataset.id = comment.id || comment._id || Math.random().toString(36).substr(2, 9);
    div.style.opacity = '0';
    
    // Formatear nombre
    const name = comment.name || 'Anonymous';
    
    // Formatear fecha
    const date = comment.createdAt ? 
        new Date(comment.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 
        'Recently';
    
    // Truncar mensaje si es muy largo
    const message = comment.message || '';
    const maxLength = 200; // Máximo caracteres antes de mostrar "Leer más"
    const isLongMessage = message.length > maxLength;
    const displayMessage = isLongMessage ? 
        message.substring(0, maxLength) + '...' : 
        message;
    const fullMessage = message;
    
    div.innerHTML = `
        <div class="public-comment-header">
            <div class="public-comment-user">
                <div class="public-comment-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="public-comment-info">
                    <h4>${name}</h4>
                    <div class="public-comment-date">
                        <i class="far fa-clock"></i>
                        ${date}
                    </div>
                </div>
            </div>
        </div>
        <div class="public-comment-content">
            <p class="comment-text">${displayMessage}</p>
            ${isLongMessage ? 
                `<button class="read-more-btn" data-full="${encodeURIComponent(fullMessage)}" data-truncated="${encodeURIComponent(displayMessage)}">
                    <i class="fas fa-chevron-down"></i> Read More
                </button>` 
                : ''}
        </div>
    `;
    
    // Añadir evento al botón "Leer más"
    if (isLongMessage) {
        const readMoreBtn = div.querySelector('.read-more-btn');
        const commentText = div.querySelector('.comment-text');
        const commentContent = div.querySelector('.public-comment-content');
        
        readMoreBtn.addEventListener('click', function() {
            if (this.classList.contains('expanded')) {
                // Volver al texto truncado
                commentText.textContent = decodeURIComponent(this.dataset.truncated);
                this.innerHTML = '<i class="fas fa-chevron-down"></i> Read More';
                this.classList.remove('expanded');
                commentContent.classList.remove('expanded');
                
                // Restaurar altura fija
                div.style.height = '280px';
                div.style.overflow = 'hidden';
            } else {
                // Mostrar texto completo
                commentText.textContent = decodeURIComponent(this.dataset.full);
                this.innerHTML = '<i class="fas fa-chevron-up"></i> Read Less';
                this.classList.add('expanded');
                commentContent.classList.add('expanded');
                
                // Ajustar altura automáticamente
                div.style.height = 'auto';
                div.style.overflow = 'visible';
                
                // Asegurar que la tarjeta se expanda completamente
                setTimeout(() => {
                    div.style.minHeight = '280px';
                }, 10);
            }
        });
    }
    
    return div;
}

// Mostrar mensaje de éxito
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.add('show');
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 5000);
}

// Resetear formulario
function resetForm() {
    const form = document.getElementById('commentForm');
    const inputs = form.querySelectorAll('input, textarea');
    const errorElements = form.querySelectorAll('.form-error');
    const charCount = document.getElementById('charCount');
    
    // Resetear valores
    form.reset();
    
    // Limpiar errores
    inputs.forEach(input => {
        input.classList.remove('error', 'success');
    });
    
    errorElements.forEach(error => {
        error.textContent = '';
    });
    
    // Resetear contador
    charCount.textContent = '0';
    charCount.style.color = 'var(--comments-text)';
    
    // Enfocar el primer campo
    document.getElementById('name').focus();
}

// Mostrar error en campo
function showFieldError(field, message) {
    field.classList.add('error');
    field.classList.remove('success');
    
    const errorElement = document.getElementById(field.id + 'Error');
    if (errorElement) {
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }
}

// Limpiar error del campo
function clearFieldError(e) {
    const field = e.target;
    const errorElement = document.getElementById(field.id + 'Error');
    
    if (errorElement) {
        errorElement.textContent = '';
        field.classList.remove('error');
    }
}

// Mostrar error general
function showError(message) {
    const container = document.getElementById('commentsContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--comments-danger); margin-bottom: 20px;"></i>
                <h3 style="color: var(--comments-danger); margin-bottom: 10px;">Error</h3>
                <p style="color: var(--comments-text); margin-bottom: 20px;">${message}</p>
                <button onclick="location.reload()" class="btn-submit" style="margin: 0 auto;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Configurar estado de envío
function setSubmittingState(submitting) {
    isSubmitting = submitting;
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitting) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
    } else {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Comment';
        submitBtn.disabled = false;
    }
}

// Funciones de validación
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone);
}

// Función para recargar comentarios (pública para debugging)
window.reloadComments = async function() {
    await loadRecentComments();
};

// Añadir animación CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .error-state {
        text-align: center;
        padding: 40px;
    }
    
    .form-counter {
        text-align: right;
        font-size: 0.85rem;
        color: var(--comments-gray);
        margin-top: 5px;
    }
    
    /* Estilos para el botón "Leer más" */
    .read-more-btn {
        background: transparent;
        color: var(--comments-accent);
        border: none;
        padding: 8px 12px;
        font-size: 0.9rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: var(--comments-transition);
        border-radius: 4px;
        margin-top: 10px;
    }
    
    .read-more-btn:hover {
        background: rgba(245, 215, 66, 0.1);
    }
    
    .read-more-btn i {
        font-size: 0.8rem;
        transition: transform 0.3s ease;
    }
    
    .read-more-btn.expanded i {
        transform: rotate(180deg);
    }
    
    /* Animación suave para expandir */
    .public-comment {
        transition: height 0.3s ease, min-height 0.3s ease;
    }
`;
document.head.appendChild(style);
