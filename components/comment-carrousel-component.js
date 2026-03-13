// comment-carousel-component.js - Autonomous component to display comments in a carousel
(function() {
    'use strict';
    
    // =============================================
    // CONFIGURATION
    // =============================================
    
    // Prevent double execution
    if (window.CommentCarouselLoaded) {
        console.log('🔄 Comment Carousel already loaded, skipping...');
        return;
    }
    window.CommentCarouselLoaded = true;
    
    // Default configuration
    const DEFAULT_CONFIG = {
        containerId: 'comment-carousel-container', // Container ID
        autoplay: true,                           // Auto-play
        interval: 1000,                           // Interval in ms (5 seconds)
        showArrows: true,                         // Show navigation arrows
        pauseOnHover: true,                       // Pause on hover
        animationDuration: 400,                   // Animation duration in ms
        itemsPerView: 3,                          // Comments visible at once
        mobileItemsPerView: 1,                    // Comments visible on mobile
        tabletItemsPerView: 2,                    // Comments visible on tablet
        loop: true,                               // Infinite carousel
        height: 'auto',                           // Auto height
        maxComments: 30,                          // Maximum comments to show
        showOnlyPublished: true,                  // Show only published comments
        maxTextLength: 120,                       // Max text length before truncating
        showDate: true,                           // Show comment date
        showReadMore: true,                       // Show "Read more" button
        autoInit: true                            // Auto initialize on load
    };
    
    // =============================================
    // LOAD DEPENDENCIES
    // =============================================
    
    async function loadDependencies() {
        try {
            // Load SweetAlert if needed
            if (typeof Swal === 'undefined') {
                console.log('📦 Loading SweetAlert...');
                await loadScript('https://cdn.jsdelivr.net/npm/sweetalert2@11');
            }
            
            // Load CommentManager
            const { CommentManager } = await import('/classes/comment.js');
            window.CommentManagerClass = CommentManager;
            
            console.log('✅ Dependencies loaded');
            return true;
        } catch (error) {
            console.error('❌ Error loading dependencies:', error);
            return false;
        }
    }
    
    // Helper function to load scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // =============================================
    // COMMENT CAROUSEL CLASS
    // =============================================
    
    class CommentCarousel {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.currentIndex = 0;
            this.comments = [];
            this.isPlaying = true;
            this.intervalId = null;
            this.container = null;
            this.isInitialized = false;
            this.commentManager = null;
            this.totalSlides = 0;
            this.slidesContainer = null;
            this.resizeObserver = null;
            this.touchStartX = 0;
            this.touchEndX = 0;
        }
        
        // Initialize carousel
        async init() {
            if (this.isInitialized) {
                console.log('⚠️ Comment Carousel already initialized');
                return;
            }
            
            try {
                // Find container
                this.container = document.getElementById(this.config.containerId);
                
                if (!this.container) {
                    console.error(`❌ Container not found with ID: ${this.config.containerId}`);
                    return;
                }
                
                console.log(`🎨 Initializing Comment Carousel in: ${this.config.containerId}`);
                
                // Load dependencies
                const dependenciesLoaded = await loadDependencies();
                if (!dependenciesLoaded) {
                    this.showErrorState('Failed to load required dependencies');
                    return;
                }
                
                // Create CommentManager instance
                this.commentManager = new window.CommentManagerClass();
                
                // Load comments
                await this.loadComments();
                
                if (this.comments.length === 0) {
                    this.showEmptyState();
                    return;
                }
                
                // Calculate number of slides
                this.calculateSlides();
                
                // Render carousel
                this.render();
                
                // Start autoplay if enabled
                if (this.config.autoplay && this.comments.length > this.getCurrentItemsPerView()) {
                    this.startAutoplay();
                }
                
                // Add event listeners
                this.setupEventListeners();
                
                // Apply responsive styles
                this.applyResponsiveStyles();
                
                // Setup resize observer
                this.setupResizeObserver();
                
                this.isInitialized = true;
                console.log('✅ Comment Carousel initialized successfully');
                
            } catch (error) {
                console.error('❌ Error initializing Comment Carousel:', error);
                this.showErrorState('Error initializing comment carousel');
            }
        }
        
        // Load comments using CommentManager
        async loadComments() {
            try {
                if (!this.commentManager) {
                    throw new Error('CommentManager not available');
                }
                
                // Use CommentManager's loadComments method
                const loadedComments = await this.commentManager.loadComments();
                
                // Filter only published comments if configured
                let filteredComments = loadedComments;
                if (this.config.showOnlyPublished) {
                    filteredComments = loadedComments.filter(comment => comment.published === true);
                    console.log(`📝 Filtered ${filteredComments.length} published comments from ${loadedComments.length} total`);
                }
                
                // Limit number of comments if needed
                const limitedComments = filteredComments.slice(0, this.config.maxComments);
                
                // Convert to carousel format
                this.comments = limitedComments.map(comment => ({
                    id: comment.id,
                    name: comment.name || 'Anonymous',
                    message: comment.message || '',
                    timestamp: comment.timestamp,
                    formattedDate: comment.getFormattedDate ? comment.getFormattedDate() : '',
                    timeAgo: comment.getTimeAgo ? comment.getTimeAgo() : '',
                    isLongText: comment.message && comment.message.length > this.config.maxTextLength
                }));
                
                console.log(`💬 Loaded ${this.comments.length} comments from Firebase`);
                
            } catch (error) {
                console.error('❌ Error loading comments:', error);
                this.comments = [];
                throw error;
            }
        }
        
        // Calculate number of slides needed
        calculateSlides() {
            const itemsPerView = this.getCurrentItemsPerView();
            if (this.comments.length <= itemsPerView) {
                this.totalSlides = 1;
            } else {
                this.totalSlides = this.comments.length - itemsPerView + 1;
                if (this.config.loop && this.comments.length > itemsPerView) {
                    this.totalSlides += itemsPerView;
                }
            }
        }
        
        // Render carousel
        render() {
            // Clear container
            this.container.innerHTML = '';
            
            // Add styles
            this.addStyles();
            
            // Create carousel structure
            const carouselHTML = `
                <div class="comment-carousel" data-items-per-view="${this.config.itemsPerView}">
                    <div class="comment-carousel-wrapper">
                        <!-- Carousel header -->
                        <div class="comment-carousel-header">
                            <h2 class="comment-carousel-title">
                                <i class="fas fa-comments"></i> Customer Reviews
                            </h2>
                            <div class="comment-carousel-subtitle">
                                What our customers say about us
                            </div>
                        </div>
                        
                        <!-- Main container -->
                        <div class="comment-carousel-main">
                            <!-- Previous button -->
                            ${this.config.showArrows && this.comments.length > this.getCurrentItemsPerView() ? `
                                <button class="comment-carousel-btn comment-carousel-prev" aria-label="Previous comments">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                            ` : ''}
                            
                            <!-- Slides container -->
                            <div class="comment-carousel-slides-container">
                                <div class="comment-carousel-slides">
                                    ${this.createCommentsHTML()}
                                </div>
                            </div>
                            
                            <!-- Next button -->
                            ${this.config.showArrows && this.comments.length > this.getCurrentItemsPerView() ? `
                                <button class="comment-carousel-btn comment-carousel-next" aria-label="Next comments">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            ` : ''}
                        </div>
                        
                        <!-- Bottom controls -->
                        <div class="comment-carousel-controls">
                            <!-- Dots indicators -->
                            ${this.comments.length > this.getCurrentItemsPerView() ? `
                                <div class="comment-carousel-dots">
                                    ${Array.from({length: Math.min(this.totalSlides, 8)}).map((_, i) => `
                                        <button class="comment-carousel-dot ${i === 0 ? 'active' : ''}" 
                                                data-index="${i}" 
                                                aria-label="Go to comment ${i + 1}"></button>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            this.container.innerHTML = carouselHTML;
            this.slidesContainer = this.container.querySelector('.comment-carousel-slides');
            
            // Update slide position
            this.updateSlidePosition();
            
            // Apply styles immediately
            this.updateArrowsVisibility();
            
            // Add events to "Read more" buttons
            this.setupReadMoreButtons();
        }
        
        // Create HTML for comments
        createCommentsHTML() {
            let commentsToShow = this.comments;
            const itemsPerView = this.getCurrentItemsPerView();
            
            // If loop, duplicate comments at beginning and end
            if (this.config.loop && this.comments.length > itemsPerView) {
                const startClones = this.comments.slice(-itemsPerView);
                const endClones = this.comments.slice(0, itemsPerView);
                commentsToShow = [...startClones, ...this.comments, ...endClones];
            }
            
            return commentsToShow.map((comment, index) => {
                // Truncate text if too long
                let displayText = comment.message;
                let isTruncated = false;
                
                if (comment.isLongText && this.config.showReadMore) {
                    displayText = comment.message.substring(0, this.config.maxTextLength) + '...';
                    isTruncated = true;
                }
                
                return `
                    <div class="comment-carousel-item" data-id="${comment.id}" data-index="${index}">
                        <div class="comment-card">
                            <!-- Comment header -->
                            <div class="comment-header">
                                <div class="comment-avatar">
                                    ${this.getAvatarInitials(comment.name)}
                                </div>
                                <div class="comment-user-info">
                                    <h3 class="comment-user-name">${this.escapeHtml(comment.name)}</h3>
                                    ${this.config.showDate && comment.timeAgo ? `
                                        <div class="comment-date">
                                            <i class="far fa-clock"></i> ${comment.timeAgo}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Comment body -->
                            <div class="comment-body">
                                <div class="comment-text">
                                    ${this.formatCommentText(displayText)}
                                </div>
                                
                                <!-- "Read more" button for long texts -->
                                ${isTruncated ? `
                                    <button class="comment-read-more-btn" data-id="${comment.id}">
                                        <i class="fas fa-expand-alt"></i> Read more
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Get avatar initials
        getAvatarInitials(name) {
            if (!name) return '<i class="fas fa-user"></i>';
            
            const initials = name
                .split(' ')
                .map(word => word.charAt(0))
                .slice(0, 2)
                .join('')
                .toUpperCase();
            
            return initials || '<i class="fas fa-user"></i>';
        }
        
        // Escape HTML for security
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Format comment text
        formatCommentText(text) {
            return this.escapeHtml(text)
                .replace(/\n/g, '<br>')
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        }
        
        // Add CSS styles
        addStyles() {
            const styleId = 'comment-carousel-styles';
            if (document.getElementById(styleId)) return;
            
            const styles = document.createElement('style');
            styles.id = styleId;
            styles.textContent = this.getCarouselStyles();
            
            document.head.appendChild(styles);
        }
        
        // Get carousel styles as string
        getCarouselStyles() {
            return /*css*/ `
                /* ====== COMMENT CAROUSEL BASE STYLES ====== */
                .comment-carousel {
                    width: 100%;
                    margin: 2rem auto;
                    padding: 0 15px;
                    position: relative;
                    isolation: isolate;
                    box-sizing: border-box;
                }
                
                .comment-carousel-wrapper {
                    width: 100%;
                    position: relative;
                }
                
                /* Carousel header */
                .comment-carousel-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .comment-carousel-title {
                    color: var(--primary, #0a2540);
                    font-size: 1.8rem;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                }
                
                .dark-mode .comment-carousel-title {
                    color: var(--text, #e2e8f0);
                }
                
                .comment-carousel-title i {
                    color: var(--accent, #f5d742);
                    margin-right: 10px;
                }
                
                .comment-carousel-subtitle {
                    color: var(--text-light, #6c757d);
                    font-size: 1rem;
                    max-width: 500px;
                    margin: 0 auto;
                }
                
                .dark-mode .comment-carousel-subtitle {
                    color: var(--text-light, #a0aec0);
                }
                
                /* Main container */
                .comment-carousel-main {
                    position: relative;
                    display: flex;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                /* Slides container */
                .comment-carousel-slides-container {
                    width: 100%;
                    overflow: hidden;
                }
                
                .comment-carousel-slides {
                    width: 100%;
                    display: flex;
                    transition: transform ${this.config.animationDuration}ms ease-in-out;
                    will-change: transform;
                    gap: 20px;
                    box-sizing: border-box;
                }
                
                /* Comment items */
                .comment-carousel-item {
                    flex: 0 0 calc((100% - (${this.config.itemsPerView} - 1) * 20px) / ${this.config.itemsPerView});
                    min-width: 0;
                    transition: transform 0.3s ease;
                    box-sizing: border-box;
                }
                
                /* Comment card */
                .comment-card {
                    width: 100%;
                    height: 100%;
                    min-height: 220px;
                    background: var(--white, #ffffff);
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    transition: all 0.3s ease;
                    border: 1px solid var(--gray, #e9ecef);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                }
                
                .dark-mode .comment-card {
                    background: var(--light, #2d3748);
                    border-color: var(--gray, #4a5568);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                
                .comment-carousel-item:hover .comment-card {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.12);
                    border-color: var(--accent, #f5d742);
                }
                
                .dark-mode .comment-carousel-item:hover .comment-card {
                    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                }
                
                /* Card header */
                .comment-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--gray-light, #f1f3f5);
                }
                
                .dark-mode .comment-header {
                    border-bottom-color: var(--gray, #4a5568);
                }
                
                .comment-avatar {
                    width: 45px;
                    height: 45px;
                    background: linear-gradient(135deg, var(--accent, #f5d742), var(--primary, #0a2540));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    flex-shrink: 0;
                    color: var(--white, #ffffff);
                    font-weight: 600;
                    font-size: 1rem;
                }
                
                .comment-avatar i {
                    font-size: 1.2rem;
                }
                
                .comment-user-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .comment-user-name {
                    color: var(--primary, #0a2540);
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 4px;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .dark-mode .comment-user-name {
                    color: var(--text, #e2e8f0);
                }
                
                .comment-date {
                    color: var(--text-light, #6c757d);
                    font-size: 0.8rem;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .dark-mode .comment-date {
                    color: var(--text-light, #a0aec0);
                }
                
                .comment-date i {
                    font-size: 0.7rem;
                }
                
                /* Card body */
                .comment-body {
                    flex: 1;
                    position: relative;
                }
                
                .comment-text {
                    color: var(--text, #333333);
                    font-size: 0.9rem;
                    line-height: 1.5;
                    margin-bottom: 12px;
                    display: -webkit-box;
                    -webkit-line-clamp: 4;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .dark-mode .comment-text {
                    color: var(--text, #e2e8f0);
                }
                
                .comment-text a {
                    color: var(--accent, #f5d742);
                    text-decoration: underline;
                }
                
                /* "Read more" button */
                .comment-read-more-btn {
                    background: transparent;
                    color: var(--accent, #f5d742);
                    border: 1px solid var(--accent, #f5d742);
                    padding: 5px 12px;
                    border-radius: 16px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .comment-read-more-btn:hover {
                    background: var(--accent, #f5d742);
                    color: var(--primary, #0a2540);
                    transform: translateY(-1px);
                }
                
                .comment-read-more-btn:active {
                    transform: translateY(0);
                }
                
                /* Navigation buttons */
                .comment-carousel-btn {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    background-color: var(--white, #ffffff);
                    color: var(--primary, #0a2540);
                    border: 2px solid var(--gray, #e9ecef);
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    transition: all 0.2s ease;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                    top: 50%;
                    transform: translateY(-50%);
                }
                
                .dark-mode .comment-carousel-btn {
                    background-color: var(--light, #2d3748);
                    color: var(--text, #e2e8f0);
                    border-color: var(--gray, #4a5568);
                    box-shadow: 0 3px 10px rgba(0,0,0,0.2);
                }
                
                .comment-carousel-btn:hover {
                    background-color: var(--accent, #f5d742);
                    color: var(--primary, #0a2540);
                    border-color: var(--accent, #f5d742);
                    transform: translateY(-50%) scale(1.05);
                }
                
                .comment-carousel-btn:active {
                    transform: translateY(-50%) scale(0.95);
                }
                
                .comment-carousel-prev {
                    left: -20px;
                }
                
                .comment-carousel-next {
                    right: -20px;
                }
                
                /* Bottom controls */
                .comment-carousel-controls {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                }
                
                /* Dots indicators */
                .comment-carousel-dots {
                    display: flex;
                    gap: 8px;
                }
                
                .comment-carousel-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--gray, #e9ecef);
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    transition: all 0.2s ease;
                }
                
                .dark-mode .comment-carousel-dot {
                    background-color: var(--gray, #4a5568);
                }
                
                .comment-carousel-dot.active {
                    background-color: var(--accent, #f5d742);
                    transform: scale(1.3);
                }
                
                .comment-carousel-dot:hover:not(.active) {
                    background-color: var(--primary, #0a2540);
                }
                
                .dark-mode .comment-carousel-dot:hover:not(.active) {
                    background-color: var(--accent, #f5d742);
                }
                
                /* Empty state */
                .comment-carousel-empty {
                    width: 100%;
                    padding: 3rem 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--light, #f8f9fa);
                    color: var(--text-light, #6c757d);
                    border-radius: 12px;
                    text-align: center;
                }
                
                .dark-mode .comment-carousel-empty {
                    background-color: var(--light, #2d3748);
                    color: var(--text-light, #a0aec0);
                }
                
                .comment-carousel-empty i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    color: var(--gray, #e9ecef);
                }
                
                .dark-mode .comment-carousel-empty i {
                    color: var(--gray, #4a5568);
                }
                
                .comment-carousel-empty h3 {
                    font-size: 1.3rem;
                    margin-bottom: 0.5rem;
                    color: var(--primary, #0a2540);
                }
                
                .dark-mode .comment-carousel-empty h3 {
                    color: var(--text, #e2e8f0);
                }
                
                .comment-carousel-empty p {
                    font-size: 1rem;
                    max-width: 400px;
                }
                
                /* Error state */
                .comment-carousel-error {
                    width: 100%;
                    padding: 3rem 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(220, 53, 69, 0.05);
                    color: var(--danger, #dc3545);
                    border: 2px dashed var(--danger, #dc3545);
                    border-radius: 12px;
                    text-align: center;
                }
                
                .dark-mode .comment-carousel-error {
                    background-color: rgba(229, 62, 62, 0.05);
                    color: var(--danger, #e53e3e);
                    border-color: var(--danger, #e53e3e);
                }
                
                .comment-carousel-error i {
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                }
                
                .comment-carousel-error h3 {
                    font-size: 1.3rem;
                    margin-bottom: 0.5rem;
                }
                
                .comment-carousel-error p {
                    font-size: 1rem;
                    max-width: 400px;
                }
                
                /* ====== RESPONSIVE BREAKPOINTS ====== */
                /* Mobile First Approach */
                
                /* Default: Mobile (320px - 767px) */
                .comment-carousel-item {
                    flex: 0 0 calc(100% - 20px);
                    max-width: calc(100% - 20px);
                }
                
                .comment-card {
                    min-height: 200px;
                    padding: 16px;
                }
                
                .comment-avatar {
                    width: 40px;
                    height: 40px;
                    font-size: 0.9rem;
                    margin-right: 10px;
                }
                
                .comment-user-name {
                    font-size: 0.95rem;
                }
                
                .comment-text {
                    font-size: 0.85rem;
                    -webkit-line-clamp: 3;
                }
                
                .comment-carousel-btn {
                    width: 35px;
                    height: 35px;
                    font-size: 0.9rem;
                }
                
                .comment-carousel-prev {
                    left: -15px;
                }
                
                .comment-carousel-next {
                    right: -15px;
                }
                
                /* Tablet (768px - 1023px) */
                @media (min-width: 768px) {
                    .comment-carousel {
                        padding: 0 20px;
                        margin: 2.5rem auto;
                    }
                    
                    .comment-carousel-item {
                        flex: 0 0 calc((100% - (${this.config.tabletItemsPerView} - 1) * 20px) / ${this.config.tabletItemsPerView});
                        max-width: calc((100% - (${this.config.tabletItemsPerView} - 1) * 20px) / ${this.config.tabletItemsPerView});
                    }
                    
                    .comment-card {
                        min-height: 220px;
                        padding: 18px;
                    }
                    
                    .comment-avatar {
                        width: 42px;
                        height: 42px;
                    }
                    
                    .comment-user-name {
                        font-size: 1rem;
                    }
                    
                    .comment-text {
                        font-size: 0.88rem;
                        -webkit-line-clamp: 4;
                    }
                    
                    .comment-carousel-btn {
                        width: 38px;
                        height: 38px;
                    }
                }
                
                /* Desktop (1024px - 1439px) */
                @media (min-width: 1024px) {
                    .comment-carousel {
                        max-width: 1200px;
                        padding: 0 30px;
                        margin: 3rem auto;
                    }
                    
                    .comment-carousel-item {
                        flex: 0 0 calc((100% - (${this.config.itemsPerView} - 1) * 20px) / ${this.config.itemsPerView});
                        max-width: calc((100% - (${this.config.itemsPerView} - 1) * 20px) / ${this.config.itemsPerView});
                    }
                    
                    .comment-card {
                        min-height: 240px;
                        padding: 20px;
                    }
                    
                    .comment-avatar {
                        width: 45px;
                        height: 45px;
                    }
                    
                    .comment-user-name {
                        font-size: 1rem;
                    }
                    
                    .comment-text {
                        font-size: 0.9rem;
                    }
                    
                    .comment-carousel-btn {
                        width: 40px;
                        height: 40px;
                        font-size: 1rem;
                    }
                    
                    .comment-carousel-prev {
                        left: -20px;
                    }
                    
                    .comment-carousel-next {
                        right: -20px;
                    }
                }
                
                /* Large Desktop (1440px and up) */
                @media (min-width: 1440px) {
                    .comment-carousel {
                        max-width: 1400px;
                    }
                    
                    .comment-carousel-slides {
                        gap: 25px;
                    }
                    
                    .comment-carousel-item {
                        flex: 0 0 calc((100% - (${this.config.itemsPerView} - 1) * 25px) / ${this.config.itemsPerView});
                        max-width: calc((100% - (${this.config.itemsPerView} - 1) * 25px) / ${this.config.itemsPerView});
                    }
                    
                    .comment-card {
                        min-height: 250px;
                        padding: 22px;
                    }
                }
                
                /* Small mobile devices */
                @media (max-width: 374px) {
                    .comment-carousel {
                        padding: 0 10px;
                    }
                    
                    .comment-carousel-slides {
                        gap: 15px;
                    }
                    
                    .comment-card {
                        min-height: 180px;
                        padding: 14px;
                    }
                    
                    .comment-avatar {
                        width: 36px;
                        height: 36px;
                        font-size: 0.85rem;
                        margin-right: 8px;
                    }
                    
                    .comment-user-name {
                        font-size: 0.9rem;
                    }
                    
                    .comment-text {
                        font-size: 0.82rem;
                        -webkit-line-clamp: 2;
                    }
                    
                    .comment-carousel-btn {
                        display: none;
                    }
                }
                
                /* Landscape orientation */
                @media (max-height: 500px) and (orientation: landscape) {
                    .comment-card {
                        min-height: 180px;
                    }
                    
                    .comment-text {
                        -webkit-line-clamp: 2;
                    }
                }
                
                /* Animations */
                @keyframes fadeInUp {
                    from { 
                        opacity: 0; 
                        transform: translateY(15px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }
                
                .comment-carousel {
                    animation: fadeInUp 0.4s ease-out;
                }
                
                .comment-card {
                    animation: fadeInUp 0.3s ease-out;
                }
                
                /* Accessibility improvements */
                .comment-carousel-btn:focus,
                .comment-read-more-btn:focus,
                .comment-carousel-dot:focus {
                    outline: 2px solid var(--accent, #f5d742);
                    outline-offset: 2px;
                }
                
                /* No slide class for few comments */
                .comment-carousel.no-slide .comment-carousel-slides {
                    justify-content: center;
                    transform: none !important;
                    gap: 20px;
                }
                
                .comment-carousel.no-slide .comment-carousel-item {
                    flex: 0 0 auto;
                    max-width: 320px;
                }
            `;
        }
        
        // Apply responsive styles
        applyResponsiveStyles() {
            const updateItemsPerView = () => {
                const carousel = this.container.querySelector('.comment-carousel');
                if (!carousel) return;
                
                let itemsPerView = this.config.itemsPerView;
                
                if (window.innerWidth >= 1440) {
                    itemsPerView = this.config.itemsPerView;
                } else if (window.innerWidth >= 1024) {
                    itemsPerView = this.config.itemsPerView;
                } else if (window.innerWidth >= 768) {
                    itemsPerView = this.config.tabletItemsPerView;
                } else {
                    itemsPerView = this.config.mobileItemsPerView;
                }
                
                // Update data attribute
                carousel.setAttribute('data-items-per-view', itemsPerView);
                
                // Recalculate slides
                this.calculateSlides();
                this.updateSlidePosition();
                
                // Show/hide arrows
                this.updateArrowsVisibility();
                
                // Update dots indicators
                this.updateDots();
                
                // Force reflow
                this.updateLayout();
            };
            
            updateItemsPerView();
            window.addEventListener('resize', updateItemsPerView);
        }
        
        // Setup resize observer
        setupResizeObserver() {
            if ('ResizeObserver' in window) {
                this.resizeObserver = new ResizeObserver(() => {
                    this.applyResponsiveStyles();
                });
                
                this.resizeObserver.observe(this.container);
            }
        }
        
        // Update arrows visibility
        updateArrowsVisibility() {
            const prevBtn = this.container.querySelector('.comment-carousel-prev');
            const nextBtn = this.container.querySelector('.comment-carousel-next');
            const carousel = this.container.querySelector('.comment-carousel');
            
            if (this.comments.length <= this.getCurrentItemsPerView()) {
                // Hide arrows and disable sliding
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
                if (carousel) carousel.classList.add('no-slide');
            } else {
                // Show arrows
                if (prevBtn) prevBtn.style.display = 'flex';
                if (nextBtn) nextBtn.style.display = 'flex';
                if (carousel) carousel.classList.remove('no-slide');
            }
        }
        
        // Get current items per view
        getCurrentItemsPerView() {
            const carousel = this.container.querySelector('.comment-carousel');
            if (!carousel) return this.config.mobileItemsPerView;
            
            const itemsPerView = parseInt(carousel.getAttribute('data-items-per-view'));
            return itemsPerView || this.config.mobileItemsPerView;
        }
        
        // Update dots indicators
        updateDots() {
            const dotsContainer = this.container.querySelector('.comment-carousel-dots');
            if (!dotsContainer) return;
            
            const dots = dotsContainer.querySelectorAll('.comment-carousel-dot');
            const visibleDots = Math.min(this.totalSlides, 8);
            
            // Update number of dots if needed
            if (dots.length !== visibleDots) {
                dotsContainer.innerHTML = Array.from({length: visibleDots}).map((_, i) => `
                    <button class="comment-carousel-dot ${i === this.currentIndex ? 'active' : ''}" 
                            data-index="${i}" 
                            aria-label="Go to comment ${i + 1}"></button>
                `).join('');
                
                // Reattach events
                dotsContainer.addEventListener('click', (e) => {
                    if (e.target.classList.contains('comment-carousel-dot')) {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        this.goToSlide(index);
                    }
                });
            } else {
                dots.forEach(dot => {
                    const index = parseInt(dot.getAttribute('data-index'));
                    dot.classList.toggle('active', index === this.currentIndex);
                });
            }
        }
        
        // Update layout
        updateLayout() {
            requestAnimationFrame(() => {
                if (this.container && this.slidesContainer) {
                    this.slidesContainer.style.transform = '';
                    void this.container.offsetWidth;
                }
            });
        }
        
        // Setup event listeners
        setupEventListeners() {
            // Navigation buttons
            const prevBtn = this.container.querySelector('.comment-carousel-prev');
            const nextBtn = this.container.querySelector('.comment-carousel-next');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => this.prevSlide());
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextSlide());
            }
            
            // Dots indicators
            const dotsContainer = this.container.querySelector('.comment-carousel-dots');
            if (dotsContainer) {
                dotsContainer.addEventListener('click', (e) => {
                    if (e.target.classList.contains('comment-carousel-dot')) {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        this.goToSlide(index);
                    }
                });
            }
            
            // Pause on hover
            if (this.config.pauseOnHover) {
                const carousel = this.container.querySelector('.comment-carousel');
                if (carousel) {
                    carousel.addEventListener('mouseenter', () => this.pauseAutoplay());
                    carousel.addEventListener('mouseleave', () => this.resumeAutoplay());
                }
            }
            
            // Keyboard navigation
            this.setupKeyboardNavigation();
            
            // Touch events
            this.setupTouchEvents();
        }
        
        // Setup keyboard navigation
        setupKeyboardNavigation() {
            document.addEventListener('keydown', (e) => {
                // Only if carousel is focused
                if (!this.container.contains(document.activeElement)) return;
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.prevSlide();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextSlide();
                        break;
                    case 'Home':
                        e.preventDefault();
                        this.goToSlide(0);
                        break;
                    case 'End':
                        e.preventDefault();
                        this.goToSlide(this.totalSlides - 1);
                        break;
                }
            });
        }
        
        // Setup "Read more" buttons
        setupReadMoreButtons() {
            this.container.querySelectorAll('.comment-read-more-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const commentId = e.target.getAttribute('data-id');
                    this.showFullComment(commentId);
                });
            });
        }
        
        // Setup touch events
        setupTouchEvents() {
            const carousel = this.container.querySelector('.comment-carousel');
            if (!carousel) return;
            
            carousel.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
                this.pauseAutoplay();
            }, { passive: true });
            
            carousel.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            carousel.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
                
                setTimeout(() => {
                    if (this.config.autoplay) {
                        this.resumeAutoplay();
                    }
                }, 2000);
            }, { passive: true });
        }
        
        // Handle swipe gestures
        handleSwipe() {
            if (this.comments.length <= this.getCurrentItemsPerView()) return;
            
            const minSwipeDistance = 50;
            const distance = this.touchStartX - this.touchEndX;
            
            if (Math.abs(distance) < minSwipeDistance) return;
            
            if (distance > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
        
        // Show full comment in modal
        showFullComment(commentId) {
            try {
                const comment = this.comments.find(c => c.id === commentId);
                if (!comment || typeof Swal === 'undefined') {
                    // Simple fallback
                    const comment = this.comments.find(c => c.id === commentId);
                    if (comment) {
                        alert(`Full comment from ${comment.name}:\n\n${comment.message}`);
                    }
                    return;
                }
                
                Swal.fire({
                    title: `Comment from ${comment.name}`,
                    html: `
                        <div class="comment-modal">
                            <div class="comment-modal-header">
                                <div class="comment-modal-avatar">
                                    ${this.getAvatarInitials(comment.name)}
                                </div>
                                <div class="comment-modal-user">
                                    <h4>${this.escapeHtml(comment.name)}</h4>
                                    ${comment.formattedDate ? `<p class="comment-modal-date">
                                        <i class="far fa-clock"></i> ${comment.formattedDate}
                                    </p>` : ''}
                                </div>
                            </div>
                            <div class="comment-modal-body">
                                <div class="comment-modal-text">
                                    ${this.formatCommentText(comment.message)}
                                </div>
                            </div>
                        </div>
                    `,
                    width: '90%',
                    maxWidth: '500px',
                    padding: '1.5rem',
                    showCloseButton: true,
                    showConfirmButton: false,
                    background: 'var(--white, #ffffff)',
                    customClass: {
                        popup: 'comment-modal-popup'
                    },
                    didOpen: () => {
                        if (document.body.classList.contains('dark-mode')) {
                            Swal.getPopup().style.background = 'var(--light, #2d3748)';
                        }
                    }
                });
                
            } catch (error) {
                console.error('Error showing full comment:', error);
            }
        }
        
        // =============================================
        // NAVIGATION FUNCTIONS
        // =============================================
        
        // Go to specific slide
        goToSlide(index) {
            if (this.comments.length <= this.getCurrentItemsPerView()) return;
            
            this.currentIndex = Math.max(0, Math.min(index, this.totalSlides - 1));
            this.updateSlidePosition();
            this.updateDots();
            this.restartAutoplay();
        }
        
        // Go to previous slide
        prevSlide() {
            if (this.comments.length <= this.getCurrentItemsPerView()) return;
            
            this.currentIndex--;
            
            if (this.config.loop && this.currentIndex < 0) {
                this.currentIndex = this.totalSlides - 1;
            } else if (this.currentIndex < 0) {
                this.currentIndex = 0;
                return;
            }
            
            this.updateSlidePosition();
            this.updateDots();
            this.restartAutoplay();
        }
        
        // Go to next slide
        nextSlide() {
            if (this.comments.length <= this.getCurrentItemsPerView()) return;
            
            this.currentIndex++;
            
            if (this.config.loop && this.currentIndex >= this.totalSlides) {
                this.currentIndex = 0;
            } else if (this.currentIndex >= this.totalSlides) {
                this.currentIndex = this.totalSlides - 1;
                return;
            }
            
            this.updateSlidePosition();
            this.updateDots();
            this.restartAutoplay();
        }
        
        // Update slide position
        updateSlidePosition() {
            if (!this.slidesContainer || this.comments.length <= this.getCurrentItemsPerView()) return;
            
            const itemsPerView = this.getCurrentItemsPerView();
            const itemWidth = 100 / itemsPerView;
            const translateX = -this.currentIndex * itemWidth;
            
            this.slidesContainer.style.transform = `translateX(${translateX}%)`;
        }
        
        // =============================================
        // AUTOPLAY FUNCTIONS
        // =============================================
        
        // Start autoplay
        startAutoplay() {
            if (this.comments.length <= this.getCurrentItemsPerView() || !this.config.autoplay) return;
            
            this.stopAutoplay();
            this.isPlaying = true;
            
            this.intervalId = setInterval(() => {
                this.nextSlide();
            }, this.config.interval);
            
            console.log('▶️ Autoplay started');
        }
        
        // Stop autoplay
        stopAutoplay() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.isPlaying = false;
        }
        
        // Pause autoplay
        pauseAutoplay() {
            if (this.isPlaying) {
                this.stopAutoplay();
            }
        }
        
        // Resume autoplay
        resumeAutoplay() {
            if (this.config.autoplay && !this.isPlaying) {
                this.startAutoplay();
            }
        }
        
        // Restart autoplay
        restartAutoplay() {
            if (this.config.autoplay) {
                this.stopAutoplay();
                this.startAutoplay();
            }
        }
        
        // =============================================
        // STATE FUNCTIONS
        // =============================================
        
        // Show empty state
        showEmptyState() {
            this.container.innerHTML = `
                <div class="comment-carousel-empty">
                    <i class="fas fa-comment-slash"></i>
                    <h3>No Published Reviews</h3>
                    <p>Customer reviews will appear here once they have been approved and published.</p>
                </div>
            `;
        }
        
        // Show error state
        showErrorState(message = 'Error loading comments') {
            this.container.innerHTML = `
                <div class="comment-carousel-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Oops! Something went wrong</h3>
                    <p>${message}</p>
                </div>
            `;
        }
        
        // =============================================
        // PUBLIC API
        // =============================================
        
        // Refresh carousel (reload comments)
        async refresh() {
            try {
                await this.loadComments();
                
                if (this.comments.length === 0) {
                    this.showEmptyState();
                    return false;
                }
                
                this.calculateSlides();
                
                if (this.isInitialized) {
                    this.render();
                    this.updateArrowsVisibility();
                    
                    if (this.config.autoplay && this.comments.length > this.getCurrentItemsPerView()) {
                        this.startAutoplay();
                    }
                }
                
                console.log('🔄 Comment Carousel updated');
                return true;
            } catch (error) {
                console.error('❌ Error updating Comment Carousel:', error);
                return false;
            }
        }
        
        // Destroy carousel
        destroy() {
            this.stopAutoplay();
            
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            
            // Remove event listeners
            window.removeEventListener('resize', this.applyResponsiveStyles);
            
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            const styles = document.getElementById('comment-carousel-styles');
            if (styles) {
                styles.remove();
            }
            
            this.isInitialized = false;
            this.commentManager = null;
            console.log('🗑️ Comment Carousel destroyed');
        }
    }
    
    // =============================================
    // AUTO INITIALIZATION
    // =============================================
    
    async function initCommentCarousel() {
        const carouselContainers = document.querySelectorAll('[data-comment-carousel]');
        
        if (carouselContainers.length === 0) {
            console.log('ℹ️ No containers found with data-comment-carousel');
            return;
        }
        
        console.log(`🎯 Found ${carouselContainers.length} comment carousel containers`);
        
        for (const container of carouselContainers) {
            try {
                const config = {
                    containerId: container.id || `comment-carousel-${Date.now()}`,
                    autoplay: container.dataset.autoplay !== 'false',
                    interval: parseInt(container.dataset.interval) || DEFAULT_CONFIG.interval,
                    showArrows: container.dataset.arrows !== 'false',
                    pauseOnHover: container.dataset.pauseOnHover !== 'false',
                    itemsPerView: parseInt(container.dataset.itemsPerView) || DEFAULT_CONFIG.itemsPerView,
                    mobileItemsPerView: parseInt(container.dataset.mobileItemsPerView) || DEFAULT_CONFIG.mobileItemsPerView,
                    tabletItemsPerView: parseInt(container.dataset.tabletItemsPerView) || DEFAULT_CONFIG.tabletItemsPerView,
                    loop: container.dataset.loop !== 'false',
                    height: container.dataset.height || DEFAULT_CONFIG.height,
                    maxComments: parseInt(container.dataset.maxComments) || DEFAULT_CONFIG.maxComments,
                    showOnlyPublished: container.dataset.showOnlyPublished !== 'false',
                    maxTextLength: parseInt(container.dataset.maxTextLength) || DEFAULT_CONFIG.maxTextLength,
                    showDate: container.dataset.showDate !== 'false',
                    showReadMore: container.dataset.showReadMore !== 'false',
                    autoInit: container.dataset.autoInit !== 'false'
                };
                
                // Assign ID if doesn't have one
                if (!container.id) {
                    container.id = config.containerId;
                }
                
                // Check if auto-init is disabled
                if (!config.autoInit) {
                    console.log(`⏸️ Auto-init disabled for: ${config.containerId}`);
                    continue;
                }
                
                const carousel = new CommentCarousel(config);
                await carousel.init();
                
                container._commentCarouselInstance = carousel;
                
                console.log(`✅ Carousel initialized in: ${config.containerId}`);
            } catch (error) {
                console.error(`❌ Error initializing carousel in container:`, container, error);
            }
        }
    }
    
    // Main initialization function
    async function initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initCommentCarousel);
            } else {
                await initCommentCarousel();
            }
        } catch (error) {
            console.error('❌ Error initializing Comment Carousel:', error);
        }
    }
    
    // Initialize when script loads
    if (DEFAULT_CONFIG.autoInit) {
        initialize();
    }
    
    // =============================================
    // GLOBAL API
    // =============================================
    
    window.CommentCarousel = {
        create: function(config) {
            const carousel = new CommentCarousel(config);
            return carousel;
        },
        
        getInstance: function(containerId) {
            const container = document.getElementById(containerId);
            return container?._commentCarouselInstance || null;
        },
        
        refreshAll: function() {
            document.querySelectorAll('[data-comment-carousel]').forEach(async container => {
                const instance = container._commentCarouselInstance;
                if (instance && typeof instance.refresh === 'function') {
                    await instance.refresh();
                }
            });
        },
        
        refreshById: function(containerId) {
            const instance = this.getInstance(containerId);
            if (instance && typeof instance.refresh === 'function') {
                return instance.refresh();
            }
            return Promise.resolve(false);
        },
        
        destroyAll: function() {
            document.querySelectorAll('[data-comment-carousel]').forEach(container => {
                const instance = container._commentCarouselInstance;
                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }
            });
        },
        
        startAllAutoplay: function() {
            document.querySelectorAll('[data-comment-carousel]').forEach(container => {
                const instance = container._commentCarouselInstance;
                if (instance && typeof instance.startAutoplay === 'function') {
                    instance.startAutoplay();
                }
            });
        },
        
        stopAllAutoplay: function() {
            document.querySelectorAll('[data-comment-carousel]').forEach(container => {
                const instance = container._commentCarouselInstance;
                if (instance && typeof instance.stopAutoplay === 'function') {
                    instance.stopAutoplay();
                }
            });
        },
        
        defaultConfig: DEFAULT_CONFIG
    };
    
    console.log('✅ Comment Carousel loaded and ready');
    
})();