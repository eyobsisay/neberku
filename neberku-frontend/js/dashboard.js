function sanitizeRichText(input) {
    if (!input) return '';
    const temp = document.createElement('div');
    temp.innerHTML = input;
    const allowedTags = new Set(['A','B','BR','EM','I','LI','OL','P','SPAN','STRONG','SUB','SUP','U','UL']);
    const allowedAttrs = {
        'A': ['href', 'title', 'target', 'rel', 'style'],
        'SPAN': ['style'],
        'P': ['style'],
        'EM': ['style'],
        'STRONG': ['style'],
        'B': ['style'],
        'I': ['style'],
        '*': []
    };
    const allowedStyleProps = new Set(['color','background-color','font-weight','font-style','text-decoration','font-size']);
    const sanitizeStyle = (styleValue) => {
        if (!styleValue) return '';
        return styleValue.split(';').map(rule => {
            const [prop, val] = rule.split(':').map(p => p && p.trim());
            if (!prop || !val) return '';
            if (!allowedStyleProps.has(prop.toLowerCase())) return '';
            return `${prop}: ${val}`;
        }).filter(Boolean).join('; ');
    };
    const cleanNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toUpperCase();
            if (!allowedTags.has(tagName)) {
                const parent = node.parentNode;
                while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                parent.removeChild(node);
                return;
            }
            [...node.attributes].forEach(attr => {
                const attrName = attr.name.toLowerCase();
                const tagAllowed = (allowedAttrs[tagName] || allowedAttrs['*'] || []).map(a => a.toLowerCase());
                if (!tagAllowed.includes(attrName)) {
                    node.removeAttribute(attr.name);
                    return;
                }
                if (attrName === 'href') {
                    const value = attr.value.trim().toLowerCase();
                    if (value.startsWith('javascript:')) {
                        node.removeAttribute(attr.name);
                    } else {
                        node.setAttribute('target', '_blank');
                        node.setAttribute('rel', 'noopener noreferrer');
                    }
                } else if (attrName === 'style') {
                    const sanitizedStyle = sanitizeStyle(attr.value);
                    if (sanitizedStyle) {
                        node.setAttribute('style', sanitizedStyle);
                    } else {
                        node.removeAttribute('style');
                    }
                }
            });
        }
        [...node.childNodes].forEach(child => cleanNode(child));
    };
    [...temp.childNodes].forEach(child => cleanNode(child));
    return temp.innerHTML;
}

function stripRichText(input) {
    if (!input) return '';
    const temp = document.createElement('div');
    temp.innerHTML = sanitizeRichText(input);
    return temp.textContent || temp.innerText || '';
}

// Dashboard functionality for event owners
class Dashboard {
    constructor() {
        this.events = [];
        this.currentPage = 1;
        this.eventsPerPage = 6;
        this.filteredEvents = null; // null means no filter applied, [] means filter applied but empty results
        this.packages = []; // Store packages data for validation
        this.selectedPackage = null; // Store selected package data
        this.isSuperuser = false; // Track if user is superuser
        this.paymentMethods = []; // Store all payment methods
        this.paymentCountdownTimers = {}; // Track countdown intervals per payment
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadPackagesAndEventTypes();
        this.loadPaymentMethods();
        this.loadDashboardData();
        // Load pending payments for all users (they can see their own)
        this.loadPendingPayments();
    }
    
    async loadPaymentMethods() {
        try {
            console.log('💳 Loading payment methods...');
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PAYMENT_METHODS}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Handle different response structures
                let methods = data;
                if (data.results && Array.isArray(data.results)) {
                    methods = data.results;
                } else if (data.data && Array.isArray(data.data)) {
                    methods = data.data;
                }
                
                // Filter only active payment methods
                this.paymentMethods = Array.isArray(methods) ? methods.filter(m => m.is_active !== false) : [];
                console.log(`✅ Loaded ${this.paymentMethods.length} payment methods`);
            } else {
                console.error('❌ Failed to load payment methods:', response.status);
                this.paymentMethods = [];
            }
        } catch (error) {
            console.error('❌ Error loading payment methods:', error);
            this.paymentMethods = [];
        }
    }
    
    updateCartVisibility() {
        // Cart is visible to all users, but actions are restricted to superusers
        const cartDropdown = document.getElementById('cartDropdown');
        const cartParent = cartDropdown ? cartDropdown.closest('.nav-item') : null;
        
        if (cartParent) {
            // Always show cart - all users can see their pending payments
            cartParent.style.display = 'block';
        }
    }

    checkAuth() {
        console.log('🔍 Checking authentication status...');
        
        // Check if we have user data in localStorage
        const userData = localStorage.getItem('neberku_user');
        console.log('📦 localStorage user data:', userData);
        
        if (!isAuthenticated()) {
            console.log('🔒 User not authenticated, redirecting to login');
            this.showAlert('Authentication required. Redirecting to login...', 'warning');
            setTimeout(() => {
                window.location.replace('login.html');
            }, 3000); // 3 second delay to see the error
            return;
        }
        
        // Update user display name
        const user = getCurrentUser();
        if (user) {
            document.getElementById('userDisplayName').textContent = user.username;
            // Check if user is superuser
            this.isSuperuser = user.is_superuser === true || user.is_superuser === 'true';
            console.log('✅ User authenticated:', user.username);
            console.log('👤 Is Superuser:', this.isSuperuser);
            console.log('🔑 Session cookies should be available for API calls');
            console.log('🎯 Ready to load dashboard data');
            
            // Hide cart if not superuser
            this.updateCartVisibility();
        } else {
            console.log('❌ User data not found, redirecting to login');
            this.showAlert('User data not found. Redirecting to login...', 'warning');
            setTimeout(() => {
                window.location.replace('login.html');
            }, 3000); // 3 second delay to see the error
            return;
        }
    }

    bindEvents() {
        // Create event form submission
        document.getElementById('createEventForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createEvent();
        });

        // Package selection change event
        document.addEventListener('change', (e) => {
            if (e.target.id === 'eventPackage') {
                this.onPackageChange(e.target.value);
            }
        });

        // Event settings validation on input
        document.addEventListener('input', (e) => {
            if (['maxImagePerPost', 'maxVideoPerPost', 'maxVoicePerPost'].includes(e.target.id)) {
                this.validateEventSettings();
            }
        });
    }

    async loadDashboardData() {
        try {
            await this.loadEvents();
            this.updateStatistics();
            // Initialize filtered events to null (no filter applied initially)
            this.filteredEvents = null;
            // Apply active filter by default (without showing alert)
            this.filterEvents('active', false);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('Error loading dashboard data', 'danger');
        }
    }

    async loadEvents() {
        try {
            console.log('🌐 Making request to:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`);
            
            // Use centralized API request with automatic auth error handling
            const eventsData = await API_UTILS.request(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'GET',
                mode: 'cors'
            });

            console.log('✅ Events fetched successfully:', eventsData);
            
            // Extract events and stats from the response
            if (eventsData.results && Array.isArray(eventsData.results)) {
                this.events = eventsData.results;
                console.log('📊 Extracted events from paginated response:', this.events.length);
            } else if (Array.isArray(eventsData)) {
                // Direct array response
                this.events = eventsData;
                console.log('📊 Direct events array response:', this.events.length);
            } else {
                console.warn('⚠️ Unexpected response format:', eventsData);
                this.events = [];
            }
            
            // Sort events to show active events first, then by creation date
            this.events.sort((a, b) => {
                const statusA = this.getEventStatus(a).toLowerCase();
                const statusB = this.getEventStatus(b).toLowerCase();
                
                // Active events first
                if (statusA.includes('active') && !statusB.includes('active')) return -1;
                if (!statusA.includes('active') && statusB.includes('active')) return 1;
                
                // Then sort by creation date (newest first)
                const dateA = new Date(a.created_at || a.event_date);
                const dateB = new Date(b.created_at || b.event_date);
                return dateB - dateA;
            });
            
            console.log('📅 Events sorted with active events first:', this.events.map(e => ({
                title: e.title,
                status: this.getEventStatus(e),
                created_at: e.created_at
            })));
            
            // Extract stats from the API response
            this.eventStats = eventsData.stats || eventsData.counts || null;
            if (this.eventStats) {
                console.log('📈 API provided event stats:', this.eventStats);
            } else {
                console.log('📊 No stats provided by API, will calculate locally');
            }
            
            this.renderEvents();
            this.updateStatistics();
            
        } catch (error) {
            console.error('❌ Error loading events:', error);
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showAlert(`
                    <strong>Unable to connect to the server!</strong><br>
                    Please make sure:<br>
                    1. The Django backend is running on ${API_CONFIG.BASE_URL}<br>
                    2. You're running the frontend on a different port (e.g., 3000)<br>
                    3. Check the browser console for more details
                `, 'warning');
            } else {
                this.showAlert(`Error loading events: ${error.message}`, 'danger');
            }
            
            // Show empty state with helpful message
            this.events = [];
            this.renderEvents();
        }
    }

    renderEvents() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        // Use filteredEvents if filtering is active, otherwise use all events
        const eventsToRender = this.filteredEvents !== null ? this.filteredEvents : this.events;
        
        
        if (eventsToRender.length === 0) {
            eventsList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-calendar-x display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">No events found</h4>
                    <p class="text-muted mb-3">No events match the current filter criteria.</p>
                    <div class="alert" style="background: linear-gradient(135deg, var(--muted) 0%, #f3e8ff 100%); border: 2px solid var(--accent); color: #000;">
                        <strong style="color: #000;">💡 Tip:</strong> <span style="color: #000;">Try selecting a different filter or create a new event!</span>
                    </div>
                </div>
            `;
            this.renderPagination(0);
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(eventsToRender.length / this.eventsPerPage);
        const startIndex = (this.currentPage - 1) * this.eventsPerPage;
        const endIndex = startIndex + this.eventsPerPage;
        const eventsForCurrentPage = eventsToRender.slice(startIndex, endIndex);

        // Render events for current page
        eventsList.innerHTML = eventsForCurrentPage.map(event => {
            const status = this.getEventStatus(event);
            const statusClass = this.getStatusClass(status);
            const statusIcon = this.getStatusIcon(status);
            
            return `
                <div class="col-md-6 col-lg-4 mb-2 event-card" data-event-id="${event.id}">
                    <div class="card h-100 shadow-sm" role="button" tabindex="0" style="cursor: pointer;" onclick="dashboard.viewEvent('${event.id}')">
                        ${event.event_thumbnail ? `
                            <div class="card-img-top-container" style="height: 200px; overflow: hidden;">
                                <img src="${this.getFullUrl(event.event_thumbnail)}" 
                                     class="card-img-top" 
                                     alt="${event.title}" 
                                     style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : `
                            <div class="card-img-top-container bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                                <div class="text-center text-muted">
                                    <i class="bi bi-image" style="font-size: 2rem;"></i>
                                    <div class="small mt-2">No thumbnail</div>
                                </div>
                            </div>
                        `}
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge ${statusClass} rounded-pill" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">
                                    <i class="bi ${statusIcon}" style="font-size: 0.7rem;"></i> ${status}
                                </span>
                                <small class="text-muted" style="font-size: 0.75rem;">${this.formatDate(event.event_date)}</small>
                            </div>
                            <h6 class="card-title mb-2" style="font-size: 0.9rem; line-height: 1.2; color: var(--primary-start);">${this.truncateText(event.title, 30)}</h6>
                            <p class="card-text text-muted mb-2" style="font-size: 0.8rem;">
                                <i class="bi bi-geo-alt"></i> ${this.truncateText(event.location || 'N/A', 20)}
                            </p>
                            
                            <div class="row text-center mb-2">
                                <div class="col-3">
                                    <div style="color: var(--primary-start);">
                                        <i class="bi bi-image" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.photo_count || 0}</div>
                                    </div>
                                </div>
                                <div class="col-3">
                                    <div style="color: var(--primary-end);">
                                        <i class="bi bi-camera-video" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.video_count || 0}</div>
                                    </div>
                                </div>
                                <div class="col-3">
                                    <div style="color: var(--accent);">
                                        <i class="bi bi-mic" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.voice_count || 0}</div>
                                    </div>
                                </div>
                                <div class="col-3">
                                    <div style="color: var(--confetti-2);">
                                        <i class="bi bi-people" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.total_guest_posts || 0}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm flex-fill" onclick="event.stopPropagation(); dashboard.viewEvent('${event.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.4rem; border: 1px solid var(--primary-start); color: var(--primary-start); background: transparent;">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                <button class="btn btn-sm flex-fill" onclick="event.stopPropagation(); dashboard.viewEventPosts('${event.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.4rem; border: 1px solid var(--primary-end); color: var(--primary-end); background: transparent;">
                                    <i class="bi bi-chat-dots"></i> Posts
                                </button>
                                <button class="btn btn-sm flex-fill" onclick="event.stopPropagation(); dashboard.shareEvent('${event.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.4rem; border: 1px solid var(--confetti-2); color: var(--confetti-2); background: transparent;">
                                    <i class="bi bi-share"></i> Share
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Render pagination controls
        this.renderPagination(eventsToRender.length);
    }

    renderPagination(totalEvents) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(totalEvents / this.eventsPerPage);
        
        // Only show pagination if there are more than 6 events
        if (totalEvents <= this.eventsPerPage) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="pagination-info">
                    <small class="text-muted">
                        Showing ${((this.currentPage - 1) * this.eventsPerPage) + 1} to ${Math.min(this.currentPage * this.eventsPerPage, totalEvents)} of ${totalEvents} events
                    </small>
                </div>
                <nav aria-label="Events pagination">
                    <ul class="pagination pagination-sm mb-0">
        `;

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="dashboard.goToPage(${this.currentPage - 1})" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                    </button>
                </li>
            `;
        } else {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                    </span>
                </li>
            `;
        }

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page
        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="dashboard.goToPage(1)">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            if (i === this.currentPage) {
                paginationHTML += `
                    <li class="page-item active">
                        <span class="page-link">${i}</span>
                    </li>
                `;
            } else {
                paginationHTML += `
                    <li class="page-item">
                        <button class="page-link" onclick="dashboard.goToPage(${i})">${i}</button>
                    </li>
                `;
            }
        }

        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="dashboard.goToPage(${totalPages})">${totalPages}</button>
                </li>
            `;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="dashboard.goToPage(${this.currentPage + 1})" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                    </button>
                </li>
            `;
        } else {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                    </span>
                </li>
            `;
        }

        paginationHTML += `
                    </ul>
                </nav>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(pageNumber) {
        const totalEvents = this.filteredEvents !== null ? this.filteredEvents.length : this.events.length;
        const totalPages = Math.ceil(totalEvents / this.eventsPerPage);
        
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            this.currentPage = pageNumber;
            this.renderEvents();
            
            // Scroll to top of events list
            const eventsList = document.getElementById('eventsList');
            if (eventsList) {
                eventsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    async createEvent() {
        // Create FormData for file uploads
        const formData = new FormData();
        
        // Add text fields
        formData.append('title', document.getElementById('eventTitle').value.trim());
        formData.append('event_date', document.getElementById('eventDate').value);
        formData.append('location', document.getElementById('eventLocation').value.trim());
        formData.append('description', document.getElementById('eventDescription').value.trim());
        formData.append('package_id', document.getElementById('eventPackage').value);
        formData.append('event_type_id', document.getElementById('eventType').value);
        formData.append('allow_photos', document.getElementById('allowPhotos').value === 'true');
        formData.append('allow_videos', document.getElementById('allowVideos').value === 'true');
        formData.append('allow_wishes', document.getElementById('allowWishes').value === 'true');
        formData.append('auto_approve_posts', document.getElementById('autoApprovePosts').value === 'true');
        formData.append('is_public', document.getElementById('isPublic').value === 'true');
        
        // Add event settings fields
        const formMaxPostsPerGuest = document.getElementById('maxPostsPerGuest')?.value || '5';
        const formMaxImagePerPost = document.getElementById('maxImagePerPost')?.value || '3';
        const formMaxVideoPerPost = document.getElementById('maxVideoPerPost')?.value || '2';
        const formMaxVoicePerPost = document.getElementById('maxVoicePerPost')?.value || '1';
        
        // Debug: Log the values being retrieved from form
        console.log('🔍 Form field values:');
        console.log(`  maxPostsPerGuest: ${formMaxPostsPerGuest}`);
        console.log(`  maxImagePerPost: ${formMaxImagePerPost}`);
        console.log(`  maxVideoPerPost: ${formMaxVideoPerPost}`);
        console.log(`  maxVoicePerPost: ${formMaxVoicePerPost}`);
        
        formData.append('max_posts_per_guest', formMaxPostsPerGuest);
        formData.append('max_image_per_post', formMaxImagePerPost);
        formData.append('max_video_per_post', formMaxVideoPerPost);
        formData.append('max_voice_per_post', formMaxVoicePerPost);
        
        // Add files if selected
        const thumbnailFile = document.getElementById('eventThumbnail').files[0];
        const bannerFile = document.getElementById('eventBanner').files[0];
        const videoFile = document.getElementById('eventVideo').files[0];
        
        if (thumbnailFile) {
            formData.append('event_thumbnail', thumbnailFile);
            console.log('📸 Adding thumbnail:', thumbnailFile.name);
        }
        
        if (bannerFile) {
            formData.append('event_banner', bannerFile);
            console.log('🖼️ Adding banner:', bannerFile.name);
        }
        
        if (videoFile) {
            formData.append('event_video', videoFile);
            console.log('🎥 Adding video:', videoFile.name);
        }

        // Enhanced validation
        if (!formData.get('title') || !formData.get('event_date') || !formData.get('location') || !formData.get('description')) {
            this.showAlert('Please fill in all required fields', 'warning');
            return;
        }
        
        // Validate file uploads
        if (thumbnailFile) {
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedImageTypes.includes(thumbnailFile.type)) {
                this.showAlert('Thumbnail must be a valid image file (JPEG, PNG, GIF, or WebP)', 'warning');
                return;
            }
            
            const maxImageSize = 10 * 1024 * 1024; // 10MB
            if (thumbnailFile.size > maxImageSize) {
                this.showAlert('Thumbnail file size must be less than 10MB', 'warning');
                return;
            }
        }
        
        if (bannerFile) {
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedImageTypes.includes(bannerFile.type)) {
                this.showAlert('Banner must be a valid image file (JPEG, PNG, GIF, or WebP)', 'warning');
                return;
            }
            
            const maxImageSize = 10 * 1024 * 1024; // 10MB
            if (bannerFile.size > maxImageSize) {
                this.showAlert('Banner file size must be less than 10MB', 'warning');
                return;
            }
        }
        
        if (videoFile) {
            const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
            if (!allowedVideoTypes.includes(videoFile.type)) {
                this.showAlert('Video must be a valid video file (MP4, MOV, AVI, or WebM)', 'warning');
                return;
            }
            
            const maxVideoSize = 100 * 1024 * 1024; // 100MB
            if (videoFile.size > maxVideoSize) {
                this.showAlert('Video file size must be less than 100MB', 'warning');
                return;
            }
        }

        if (!formData.get('package_id') || !formData.get('event_type_id')) {
            this.showAlert('Please select both package and event type', 'warning');
            return;
        }
        
        // Validate event settings if they exist
        const maxPostsPerGuest = parseInt(formData.get('max_posts_per_guest'));
        const maxImagePerPost = parseInt(formData.get('max_image_per_post'));
        const maxVideoPerPost = parseInt(formData.get('max_video_per_post'));
        const maxVoicePerPost = parseInt(formData.get('max_voice_per_post'));
        
        if (maxPostsPerGuest && (maxPostsPerGuest < 1 || maxPostsPerGuest > 100)) {
            this.showAlert('Max Posts per Guest must be between 1 and 100', 'warning');
            return;
        }
        
        // Validate against package limits using field validation
        if (!this.validateEventSettings()) {
            this.showAlert('Please fix the validation errors above before creating the event', 'warning');
            return;
        }
        
        // General validation (fallback if no package selected)
        if (maxImagePerPost && (maxImagePerPost < 1 || maxImagePerPost > 50)) {
            this.showAlert('Max Images per Post must be between 1 and 50', 'warning');
            return;
        }
        
        if (maxVideoPerPost && (maxVideoPerPost < 1 || maxVideoPerPost > 50)) {
            this.showAlert('Max Videos per Post must be between 1 and 50', 'warning');
            return;
        }
        
        if (maxVoicePerPost && (maxVoicePerPost < 1 || maxVoicePerPost > 50)) {
            this.showAlert('Max Voice per Post must be between 1 and 50', 'warning');
            return;
        }

        try {
            console.log('📡 Creating event with FormData...');
            
            // Debug: Log all form data being sent
            console.log('📋 Form data being sent:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }
            
            // Use centralized API request with automatic auth error handling
            const newEvent = await API_UTILS.request(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'POST',
                body: formData
                // Note: Don't set Content-Type header when using FormData
                // The browser will set it automatically with the boundary
            });

            console.log('✅ Event created successfully:', newEvent);
            // Notify listeners (e.g., dashboard.html wizard) with raw API response
            if (typeof window !== 'undefined' && typeof window.onEventCreated === 'function') {
                try { window.onEventCreated(newEvent); } catch (e) { console.warn('onEventCreated handler error', e); }
            }
            this.events.push(newEvent);
            
            this.renderEvents();
            this.updateStatistics();
            this.resetForm();
            // Reload pending payments to show the new payment
            this.loadPendingPayments();
            this.showAlert('Event created successfully! Payment has been added to your cart.', 'success');
            
        } catch (error) {
            console.error('❌ Error creating event:', error);
            if (typeof window !== 'undefined' && typeof window.onEventCreateError === 'function') {
                try { window.onEventCreateError(error); } catch (e) { console.warn('onEventCreateError handler error', e); }
            }
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showAlert(`
                    <strong>Unable to connect to the server!</strong><br>
                    Please make sure the Django backend is running on ${API_CONFIG.BASE_URL}
                `, 'danger');
            } else {
                this.showAlert(`Error creating event: ${error.message}`, 'danger');
            }
        }
    }

    resetForm() {
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventLocation').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventPackage').value = '';
        document.getElementById('eventType').value = '';
        document.getElementById('allowPhotos').value = 'true';
        document.getElementById('allowVideos').value = 'true';
        document.getElementById('allowWishes').value = 'true';
        document.getElementById('autoApprovePosts').value = 'false';
        document.getElementById('isPublic').value = 'false';
        
        // Reset event settings fields
        if (document.getElementById('maxPostsPerGuest')) document.getElementById('maxPostsPerGuest').value = '5';
        if (document.getElementById('maxImagePerPost')) document.getElementById('maxImagePerPost').value = '3';
        if (document.getElementById('maxVideoPerPost')) document.getElementById('maxVideoPerPost').value = '2';
        if (document.getElementById('maxVoicePerPost')) document.getElementById('maxVoicePerPost').value = '1';
        
        // Reset package selection and limits
        this.selectedPackage = null;
        this.updatePackageLimitsDisplay();
        
        // Clear file inputs
        document.getElementById('eventThumbnail').value = '';
        document.getElementById('eventVideo').value = '';
        
        // Hide the form and show the button
        this.hideCreateEventForm();
    }
    
    showCreateEventForm() {
        // Hide the centered button
        document.getElementById('floatingCreateButton').style.display = 'none';
        
        // Show the hidden card with form
        const createEventCard = document.querySelector('.row.mb-4[style*="display: none"]');
        if (createEventCard) {
            createEventCard.style.display = 'block';
        }
        
        // Hide the button and show the form
        document.getElementById('createEventButton').style.display = 'none';
        document.getElementById('createEventForm').style.display = 'block';
        
        // Scroll to form smoothly without jumping to bottom
        setTimeout(() => {
            const formCard = createEventCard || document.querySelector('.row.mb-4');
            if (formCard) {
                formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
        
        // Load packages and event types when form is shown
        this.loadPackagesAndEventTypes();
        
        // Hide other dashboard sections for focused form experience
        document.body.classList.add('creating-event');
    }
    
    hideCreateEventForm() {
        // Hide the form and show the button
        document.getElementById('createEventForm').style.display = 'none';
        document.getElementById('createEventButton').style.display = 'block';
        
        // Hide the card again
        const createEventCard = document.querySelector('.row.mb-4[style*="display: block"]');
        if (createEventCard) {
            createEventCard.style.display = 'none';
        }
        
        // Show centered button again
        document.getElementById('floatingCreateButton').style.display = 'block';
        
        // Restore dashboard sections
        document.body.classList.remove('creating-event');
    }

    updateStatistics() {
        const totalEvents = this.events.length;
        const totalPhotos = this.events.reduce((sum, event) => sum + (event.photo_count || 0), 0);
        const totalVideos = this.events.reduce((sum, event) => sum + (event.video_count || 0), 0);
        const totalVoice = this.events.reduce((sum, event) => sum + (event.voice_count || 0), 0);
        const totalGuests = this.events.reduce((sum, event) => sum + (event.total_guest_posts || 0), 0);

        console.log('📊 Updating statistics:', {
            totalEvents: totalEvents,
            eventsArray: this.events.length,
            eventsData: this.events.map(e => ({ id: e.id, title: e.title, status: e.status }))
        });

        document.getElementById('totalEvents').textContent = totalEvents;
        document.getElementById('totalPhotos').textContent = totalPhotos;
        document.getElementById('totalVideos').textContent = totalVideos;
        document.getElementById('totalVoice').textContent = totalVoice;
        document.getElementById('totalGuests').textContent = totalGuests;

        // Update event status overview - this will handle allEventsCount
        this.updateEventStatusOverview();
        
        console.log('📊 Status counts updated, checking DOM elements...');
        console.log('allEventsCount element:', document.getElementById('allEventsCount'));
        console.log('activeEvents element:', document.getElementById('activeEvents'));
    }
    
    
    
    
    debugEventData() {
        console.log('🐛 Debug: Current events data with status categorization:');
        
        const statusCategories = {
            active: [],
            pending: [],
            completed: [],
            draft: [],
            cancelled: []
        };
        
        this.events.forEach((event, index) => {
            const status = this.getEventStatus(event);
            const statusLower = status.toLowerCase();
            
            // Categorize the event
            let category = 'unknown';
            if (statusLower.includes('active') || statusLower.includes('today') || statusLower.includes('ongoing')) {
                category = 'active';
                statusCategories.active.push(event.title);
            } else if (statusLower.includes('pending') || statusLower.includes('payment') || 
                       statusLower.includes('tomorrow') || statusLower.includes('scheduled') ||
                       statusLower.includes('future') || statusLower.includes('planned')) {
                category = 'pending';
                statusCategories.pending.push(event.title);
            } else if (statusLower.includes('completed') || statusLower.includes('finished') || 
                       statusLower.includes('done')) {
                category = 'completed';
                statusCategories.completed.push(event.title);
            } else if (statusLower.includes('draft') || statusLower.includes('created') || 
                       statusLower.includes('new')) {
                category = 'draft';
                statusCategories.draft.push(event.title);
            } else if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
                category = 'cancelled';
                statusCategories.cancelled.push(event.title);
            }
            
            console.log(`Event ${index + 1}:`, {
                id: event.id,
                title: event.title,
                event_date: event.event_date,
                model_status: event.status,
                calculated_status: status,
                category: category,
                parsed_date: event.event_date ? new Date(event.event_date).toDateString() : 'No date'
            });
        });
        
        console.log('📊 Status categorization summary:', statusCategories);
        
        // Show in alert for easy viewing
        const debugInfo = this.events.map((event, index) => 
            `${index + 1}. ${event.title}\n   Model Status: ${event.status || 'None'}\n   Calculated: ${this.getEventStatus(event)}`
        ).join('\n\n');
        
        const categoryInfo = Object.entries(statusCategories)
            .map(([category, events]) => `${category.toUpperCase()}: ${events.length} events`)
            .join('\n');
        
        this.showAlert(`<strong>Debug Info - Status Categorization:</strong><br><pre>${debugInfo}</pre><br><strong>Categories:</strong><br><pre>${categoryInfo}</pre>`, 'info');
    }
    
    updateEventStatusOverview() {
        // Check if API response includes stats
        if (this.eventStats) {
            console.log('📊 Using API stats for event status counts:', this.eventStats);
            
            const totalEvents = this.eventStats.active + this.eventStats.pending + this.eventStats.completed + this.eventStats.draft + this.eventStats.cancelled;
            
            document.getElementById('allEventsCount').textContent = totalEvents;
            document.getElementById('activeEvents').textContent = this.eventStats.active || 0;
            document.getElementById('pendingEvents').textContent = this.eventStats.pending || 0;
            document.getElementById('completedEvents').textContent = this.eventStats.completed || 0;
            document.getElementById('draftEvents').textContent = this.eventStats.draft || 0;
            document.getElementById('cancelledEvents').textContent = this.eventStats.cancelled || 0;
        } else {
            // Fallback to local calculation if no stats provided
            this.calculateLocalEventStats();
        }
    }
    
    calculateLocalEventStats() {
        let activeEvents = 0;
        let pendingEvents = 0;
        let completedEvents = 0;
        let draftEvents = 0;
        let cancelledEvents = 0;
        
        this.events.forEach(event => {
            const category = this.getEventCategory(event);
            
            switch (category) {
                case 'active':
                    activeEvents++;
                    break;
                case 'pending':
                    pendingEvents++;
                    break;
                case 'completed':
                    completedEvents++;
                    break;
                case 'draft':
                    draftEvents++;
                    break;
                case 'cancelled':
                    cancelledEvents++;
                    break;
            }
        });
        
        console.log('📊 Local event stats calculated:', {
            active: activeEvents,
            pending: pendingEvents,
            completed: completedEvents,
            draft: draftEvents,
            cancelled: cancelledEvents,
            total: this.events.length
        });
        
        const totalEvents = activeEvents + pendingEvents + completedEvents + draftEvents + cancelledEvents;
        
        document.getElementById('allEventsCount').textContent = totalEvents;
        document.getElementById('activeEvents').textContent = activeEvents;
        document.getElementById('pendingEvents').textContent = pendingEvents;
        document.getElementById('completedEvents').textContent = completedEvents;
        document.getElementById('draftEvents').textContent = draftEvents;
        document.getElementById('cancelledEvents').textContent = cancelledEvents;
    }
    
    getEventStatus(event) {
        // Use the status field from the model if available
        if (event.status) {
            return event.status;
        }
        
        // Fallback to date-based calculation if no status field
        if (!event.event_date) return 'Draft';
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDate = new Date(event.event_date);
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        if (eventDay < today) return 'Completed';
        if (eventDay.getTime() === today.getTime()) return 'Active';
        if (eventDay.getTime() >= today.getTime() + (24 * 60 * 60 * 1000)) return 'Pending';
        return 'Pending'; // Default to pending for any future events
    }
    
    // Centralized function to categorize events by status
    getEventCategory(event) {
        const status = this.getEventStatus(event);
        const statusLower = status.toLowerCase();
        
        // Use the same logic for both counting and filtering
        if (statusLower.includes('active') || statusLower.includes('today') || statusLower.includes('ongoing')) {
            return 'active';
        } else if (statusLower.includes('pending') || statusLower.includes('payment') || 
                   statusLower.includes('tomorrow') || statusLower.includes('scheduled') ||
                   statusLower.includes('future') || statusLower.includes('planned')) {
            return 'pending';
        } else if (statusLower.includes('completed') || statusLower.includes('finished') || 
                   statusLower.includes('done')) {
            return 'completed';
        } else if (statusLower.includes('draft') || statusLower.includes('created') || 
                   statusLower.includes('new')) {
            return 'draft';
        } else if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
            return 'cancelled';
        } else {
            // If status doesn't match any category, try to determine from date
            if (!event.event_date) {
                return 'draft';
            } else {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const eventDate = new Date(event.event_date);
                const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                
                if (eventDay < today) {
                    return 'completed';
                } else if (eventDay.getTime() === today.getTime()) {
                    return 'active';
                } else if (eventDay.getTime() >= today.getTime() + (24 * 60 * 60 * 1000)) {
                    return 'pending';
                } else {
                    return 'pending';
                }
            }
        }
    }
    
    getStatusClass(status) {
        const statusLower = status.toLowerCase();
        
        switch (statusLower) {
            case 'active':
            case 'today':
            case 'ongoing':
                return 'bg-success';
            case 'pending':
            case 'tomorrow':
            case 'scheduled':
                return 'bg-warning';
            case 'completed':
            case 'finished':
            case 'done':
                return 'bg-success';
            case 'draft':
            case 'created':
            case 'new':
                return 'bg-info';
            case 'cancelled':
            case 'canceled':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }
    
    getStatusIcon(status) {
        const statusLower = status.toLowerCase();
        
        switch (statusLower) {
            case 'active':
            case 'today':
            case 'ongoing':
                return 'bi-calendar-check';
            case 'pending':
            case 'tomorrow':
            case 'scheduled':
                return 'bi-clock';
            case 'completed':
            case 'finished':
            case 'done':
                return 'bi-check-circle';
            case 'draft':
            case 'created':
            case 'new':
                return 'bi-calendar-plus';
            case 'cancelled':
            case 'canceled':
                return 'bi-exclamation-triangle';
            default:
                return 'bi-calendar';
        }
    }
    
    filterEvents(filterType, showAlert = true) {
        // Use centralized categorization logic to ensure consistency with counting
        this.filteredEvents = this.events.filter(event => {
            if (filterType === 'all') {
                return true;
            }
            return this.getEventCategory(event) === filterType;
        });
        
        // Reset to first page when filtering
        this.currentPage = 1;
        
        // Update filter button visual feedback
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add visual feedback to clicked filter button
        const clickedBtn = document.querySelector(`.filter-btn[data-filter="${filterType}"]`);
        if (clickedBtn) {
            clickedBtn.classList.add('active');
        }
        
        // Render the filtered events with pagination
        this.renderEvents();
        
        // Show feedback message only if showAlert is true
        if (showAlert) {
            this.showAlert(`Showing ${filterType} events (${this.filteredEvents.length} found)`, 'info');
        }
    }
    

    formatDate(dateString) {
        if (!dateString) return 'No date';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    getFullUrl(relativePath) {
        if (!relativePath) return '';
        if (relativePath.startsWith('http')) return relativePath;
        return `${API_CONFIG.BASE_URL}${relativePath}`;
    }
    
    formatDateTime(dateString) {
        if (!dateString) return 'No date';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let datePart = '';
        if (diffDays === 0) {
            datePart = 'Today';
        } else if (diffDays === 1) {
            datePart = 'Yesterday';
        } else if (diffDays < 7) {
            datePart = `${diffDays} days ago`;
        } else {
            datePart = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
        
        const timePart = date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `${datePart} at ${timePart}`;
    }
    
    
    // Truncate long text for cleaner display
    truncateText(text, maxLength = 30) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    viewEvent(eventId) {
        console.log('🔍 Viewing event details:', eventId);
        // Navigate to event detail page
        window.location.href = `event-detail.html?id=${eventId}`;
    }

    viewEventPosts(eventId) {
        console.log('🔍 Viewing posts for event:', eventId);
        // Navigate to guest posts page with event filter
        window.location.href = `guest-posts.html?event=${eventId}`;
    }

    shareEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            const shareUrl = `${window.location.origin}/guest-contribution.html?event=${eventId}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showAlert('Event link copied to clipboard!', 'success');
            }).catch(() => {
                this.showAlert('Failed to copy link', 'danger');
            });
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async loadPackagesAndEventTypes() {
        try {
            // Packages and event types are publicly accessible (no authentication required)
            const headers = {
                'Content-Type': 'application/json'
            };

            // Load packages
            const packagesResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PACKAGES}`, {
                headers: headers
            });
            if (packagesResponse.ok) {
                const packagesData = await packagesResponse.json();
                console.log('📦 Packages response:', packagesData);
                
                // Handle different response structures
                let packages = packagesData;
                if (packagesData.results) {
                    packages = packagesData.results; // Django REST Framework pagination
                } else if (packagesData.data) {
                    packages = packagesData.data; // Some APIs wrap in data field
                } else if (!Array.isArray(packagesData)) {
                    console.error('❌ Unexpected packages response structure:', packagesData);
                    packages = [];
                }
                
                if (Array.isArray(packages)) {
                    this.populatePackageDropdown(packages);
                } else {
                    console.error('❌ Packages is not an array:', packages);
                }
            } else {
                console.error('❌ Failed to load packages:', packagesResponse.status, packagesResponse.statusText);
            }
            
            // Load event types
            const eventTypesResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_TYPES}`, {
                headers: headers
            });
            if (eventTypesResponse.ok) {
                const eventTypesData = await eventTypesResponse.json();
                console.log('🎯 Event types response:', eventTypesData);
                
                // Handle different response structures
                let eventTypes = eventTypesData;
                if (eventTypesData.results) {
                    eventTypes = eventTypesData.results; // Django REST Framework pagination
                } else if (eventTypesData.data) {
                    eventTypes = eventTypesData.data; // Some APIs wrap in data field
                } else if (!Array.isArray(eventTypesData)) {
                    console.error('❌ Unexpected event types response structure:', eventTypesData);
                    eventTypes = [];
                }
                
                if (Array.isArray(eventTypes)) {
                    this.populateEventTypeDropdown(eventTypes);
                } else {
                    console.error('❌ Event types is not an array:', eventTypes);
                }
            } else {
                console.error('❌ Failed to load event types:', eventTypesResponse.status, eventTypesResponse.statusText);
            }
        } catch (error) {
            console.error('Error loading packages and event types:', error);
        }
    }
    
    populatePackageDropdown(packages) {
        const packageSelect = document.getElementById('eventPackage');
        if (!packageSelect) {
            console.error('❌ Package select element not found');
            return;
        }
        
        // Store packages data for validation
        this.packages = packages;
        
        packageSelect.innerHTML = '<option value="">Select a package</option>';
        
        if (!Array.isArray(packages) || packages.length === 0) {
            console.log('⚠️ No packages available or invalid data');
            packageSelect.innerHTML = '<option value="">No packages available</option>';
            return;
        }
        
        packages.forEach(pkg => {
            const option = document.createElement('option');
            option.value = pkg.id;
            option.textContent = `${pkg.name} - $${pkg.price}`;
            packageSelect.appendChild(option);
        });
        
        console.log(`✅ Populated package dropdown with ${packages.length} packages`);
    }

    onPackageChange(packageId) {
        if (!packageId) {
            this.selectedPackage = null;
            this.updatePackageLimitsDisplay();
            return;
        }

        // Find the selected package
        this.selectedPackage = this.packages.find(pkg => pkg.id == packageId);
        
        if (this.selectedPackage) {
            console.log('📦 Selected package:', this.selectedPackage);
            this.updatePackageLimitsDisplay();
            this.validateEventSettings();
        } else {
            console.error('❌ Package not found:', packageId);
            this.selectedPackage = null;
        }
    }

    updatePackageLimitsDisplay() {
        const maxImageInput = document.getElementById('maxImagePerPost');
        const maxVideoInput = document.getElementById('maxVideoPerPost');
        const maxVoiceInput = document.getElementById('maxVoicePerPost');

        if (!this.selectedPackage) {
            // Reset to defaults when no package selected
            if (maxImageInput) maxImageInput.max = '50';
            if (maxVideoInput) maxVideoInput.max = '50';
            if (maxVoiceInput) maxVoiceInput.max = '50';
            
            // Clear hints
            this.updateFieldHint('maxImagePerPost', '');
            this.updateFieldHint('maxVideoPerPost', '');
            this.updateFieldHint('maxVoicePerPost', '');
            return;
        }

        // Update max values based on package limits
        const maxPhotos = this.selectedPackage.max_photos;
        const maxVideos = this.selectedPackage.max_videos;
        const maxVoice = this.selectedPackage.max_voice;

        if (maxImageInput) {
            maxImageInput.max = maxPhotos || '50';
            maxImageInput.title = maxPhotos ? `Total package support: ${maxPhotos} photos` : 'No package limit';
        }

        if (maxVideoInput) {
            maxVideoInput.max = maxVideos || '50';
            maxVideoInput.title = maxVideos ? `Total package support: ${maxVideos} videos` : 'No package limit';
        }

        if (maxVoiceInput) {
            maxVoiceInput.max = maxVoice || '50';
            maxVoiceInput.title = maxVoice ? `Total package support: ${maxVoice} voice recordings` : 'No package limit';
        }

        // Update hints for all fields
        this.updateFieldHint('maxImagePerPost', '');
        this.updateFieldHint('maxVideoPerPost', '');
        this.updateFieldHint('maxVoicePerPost', '');

        // Show package limits info
        this.showPackageLimitsInfo();
    }

    showPackageLimitsInfo() {
        if (!this.selectedPackage) return;

        const maxPhotos = this.selectedPackage.max_photos;
        const maxVideos = this.selectedPackage.max_videos;
        const maxVoice = this.selectedPackage.max_voice;

        let limitsText = 'Total Package Support: ';
        const limits = [];
        
        if (maxPhotos) limits.push(`${maxPhotos} photos`);
        if (maxVideos) limits.push(`${maxVideos} videos`);
        if (maxVoice) limits.push(`${maxVoice} voice recordings`);
        
        if (limits.length > 0) {
            limitsText += limits.join(', ');
        } else {
            limitsText += 'No limits';
        }

        // Update the info text in the form
        const infoElement = document.querySelector('.form-text.text-muted');
        if (infoElement) {
            infoElement.innerHTML = `
                <i class="bi bi-info-circle"></i> 
                <strong>Media Limits:</strong> These settings control how many media files guests can upload per post. 
                <br><strong>${limitsText}</strong> - Values cannot exceed total package support.
            `;
        }
    }

    validateEventSettings() {
        if (!this.selectedPackage) {
            this.clearFieldErrors();
            return true;
        }

        const maxImagePerPost = parseInt(document.getElementById('maxImagePerPost')?.value || '3');
        const maxVideoPerPost = parseInt(document.getElementById('maxVideoPerPost')?.value || '2');
        const maxVoicePerPost = parseInt(document.getElementById('maxVoicePerPost')?.value || '1');

        const maxPhotos = this.selectedPackage.max_photos;
        const maxVideos = this.selectedPackage.max_videos;
        const maxVoice = this.selectedPackage.max_voice;

        let isValid = true;

        // Clear previous errors
        this.clearFieldErrors();

        // Check photo limit
        if (maxPhotos && maxImagePerPost > maxPhotos) {
            isValid = false;
            this.showFieldError('maxImagePerPost', `Cannot exceed total package support of ${maxPhotos} photos`);
        }

        // Check video limit
        if (maxVideos && maxVideoPerPost > maxVideos) {
            isValid = false;
            this.showFieldError('maxVideoPerPost', `Cannot exceed total package support of ${maxVideos} videos`);
        }

        // Check voice limit
        if (maxVoice && maxVoicePerPost > maxVoice) {
            isValid = false;
            this.showFieldError('maxVoicePerPost', `Cannot exceed total package support of ${maxVoice} voice recordings`);
        }

        return isValid;
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Add error styling
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');

        // Create or update error message
        let errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            field.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;

        // Add hint
        this.updateFieldHint(fieldId, message);
    }

    clearFieldErrors() {
        const fields = ['maxImagePerPost', 'maxVideoPerPost', 'maxVoicePerPost'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.remove('is-invalid', 'is-valid');
                
                // Remove error messages
                const errorDiv = field.parentNode.querySelector('.invalid-feedback');
                if (errorDiv) {
                    errorDiv.remove();
                }
                
                // Clear hints
                this.updateFieldHint(fieldId, '');
            }
        });
    }

    updateFieldHint(fieldId, errorMessage) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Find or create hint element
        let hintElement = field.parentNode.querySelector('.form-hint');
        if (!hintElement) {
            hintElement = document.createElement('div');
            hintElement.className = 'form-hint text-muted small mt-1';
            field.parentNode.appendChild(hintElement);
        }

        if (errorMessage) {
            hintElement.innerHTML = `<i class="bi bi-exclamation-triangle"></i> <strong>${errorMessage}</strong>`;
            hintElement.className = 'form-hint text-warning small mt-1';
        } else {
            // Show package limit as hint
            if (this.selectedPackage) {
                const maxPhotos = this.selectedPackage.max_photos;
                const maxVideos = this.selectedPackage.max_videos;
                const maxVoice = this.selectedPackage.max_voice;
                
                let hintText = '';
                if (fieldId === 'maxImagePerPost' && maxPhotos) {
                    hintText = `<i class="bi bi-info-circle"></i> <strong>Total package support: ${maxPhotos} photos</strong>`;
                } else if (fieldId === 'maxVideoPerPost' && maxVideos) {
                    hintText = `<i class="bi bi-info-circle"></i> <strong>Total package support: ${maxVideos} videos</strong>`;
                } else if (fieldId === 'maxVoicePerPost' && maxVoice) {
                    hintText = `<i class="bi bi-info-circle"></i> <strong>Total package support: ${maxVoice} voice recordings</strong>`;
                } else {
                    hintText = `<i class="bi bi-check-circle"></i> <strong>No package limit</strong>`;
                }
                
                hintElement.innerHTML = hintText;
                hintElement.className = 'form-hint small mt-1';
                hintElement.style.color = 'var(--primary-end)';
            } else {
                hintElement.innerHTML = `<i class="bi bi-info-circle"></i> <strong>Enter value between 1-50</strong>`;
                hintElement.className = 'form-hint text-muted small mt-1';
            }
        }
    }
    
    populateEventTypeDropdown(eventTypes) {
        const eventTypeSelect = document.getElementById('eventType');
        if (!eventTypeSelect) {
            console.error('❌ Event type select element not found');
            return;
        }
        
        eventTypeSelect.innerHTML = '<option value="">Select event type</option>';
        
        if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
            console.log('⚠️ No event types available or invalid data');
            eventTypeSelect.innerHTML = '<option value="">No event types available</option>';
            return;
        }
        
        eventTypes.forEach(eventType => {
            const option = document.createElement('option');
            option.value = eventType.id;
            option.textContent = eventType.name;
            eventTypeSelect.appendChild(option);
        });
        
        console.log(`✅ Populated event type dropdown with ${eventTypes.length} event types`);
    }

    async loadPendingPayments() {
        // All users can load their pending payments
        try {
            console.log('🛒 Loading pending payments...');
            
            // Load payments with pending status
            const paymentsData = await API_UTILS.request(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PAYMENTS}`, {
                method: 'GET',
                mode: 'cors'
            });

            console.log('✅ Payments fetched successfully:', paymentsData);
            
            // Extract payments from response
            let payments = [];
            if (paymentsData.results && Array.isArray(paymentsData.results)) {
                payments = paymentsData.results;
            } else if (Array.isArray(paymentsData)) {
                payments = paymentsData;
            } else {
                console.warn('⚠️ Unexpected payments response format:', paymentsData);
                payments = [];
            }
            
            // Filter only pending payments
            // Superusers see all pending payments, regular users see only their own
            const pendingPayments = payments.filter(payment => 
                payment.status === 'pending' && 
                payment.event && 
                payment.event.payment_status === 'pending'
            );
            
            console.log(`📊 Found ${pendingPayments.length} pending payments`);
            
            // Store payments for modal access
            this.pendingPayments = pendingPayments;
            
            this.renderPendingPayments(pendingPayments);
            
        } catch (error) {
            console.error('❌ Error loading pending payments:', error);
            // Don't show alert for payment loading errors, just log
            const paymentsList = document.getElementById('pendingPaymentsList');
            if (paymentsList) {
                paymentsList.innerHTML = `
                    <div class="alert" style="background-color: var(--confetti-3); border-left: 4px solid var(--confetti-3); color: #000;">
                        <i class="bi bi-exclamation-triangle"></i> 
                        <span style="color: #000;">Unable to load pending payments. Please try again later.</span>
                    </div>
                `;
            }
        }
    }

    renderPendingPayments(payments) {
        const paymentsSection = document.getElementById('pendingPaymentsSection');
        const paymentsList = document.getElementById('pendingPaymentsList');
        const paymentsCount = document.getElementById('pendingPaymentsCount');
        const navbarCartBadge = document.getElementById('navbarCartBadge');
        const cartDropdownContent = document.getElementById('cartDropdownContent');
        const cartDropdownCount = document.getElementById('cartDropdownCount');
        const cartDropdownFooter = document.getElementById('cartDropdownFooter');
        
        // Update navbar badge
        if (navbarCartBadge) {
            if (payments.length > 0) {
                navbarCartBadge.textContent = payments.length;
                navbarCartBadge.style.display = 'block';
            } else {
                navbarCartBadge.style.display = 'none';
            }
        }
        
        // Update dropdown count
        if (cartDropdownCount) {
            cartDropdownCount.textContent = payments.length;
        }
        
        // Render dropdown cart (e-commerce style)
        if (cartDropdownContent) {
            if (payments.length === 0) {
                cartDropdownContent.innerHTML = `
                    <div class="text-center py-3" style="color: #000;">
                        <i class="bi bi-cart-x" style="font-size: 2rem; color: var(--primary-start);"></i>
                        <p class="mt-2 mb-0 small" style="color: #000;">No pending payments</p>
                    </div>
                `;
                if (cartDropdownFooter) cartDropdownFooter.style.display = 'none';
            } else {
                // Show all payments in dropdown with details
                cartDropdownContent.innerHTML = payments.map(payment => {
                    const event = payment.event || {};
                    const paymentMethod = payment.payment_method || {};
                    const amount = parseFloat(payment.amount || 0);
                    const createdDate = payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A';
                    const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A';
                    const eventTitle = stripRichText(event.title || 'Untitled Event');
                    const packageName = stripRichText(event.package?.name || 'N/A');
                    
                    return `
                        <div class="mb-3 pb-3" style="color: #000; border-bottom: 2px solid var(--primary-start);">
                            <div class="d-flex align-items-start">
                                <div class="flex-grow-1" style="color: #000;">
                                    <h6 class="mb-1 small fw-bold" style="color: #000 !important;" title="${eventTitle}">
                                        ${eventTitle}
                                    </h6>
                                    <div class="small mb-1" style="color: var(--primary-start);">
                                        <i class="bi bi-calendar"></i> Event: ${eventDate}
                                    </div>
                                    <div class="small mb-1" style="color: var(--primary-end);">
                                        <i class="bi bi-box"></i> ${packageName}
                                    </div>
                                    <div class="mt-2 mb-2">
                                        <strong style="color: #000; font-size: 1rem;">${amount.toLocaleString()} ETB</strong>
                                        <small class="ms-2" style="color: var(--accent);">Created: ${createdDate}</small>
                                        <div class="small mt-1" id="paymentCountdown-${payment.id}" style="color: var(--confetti-1); font-weight: 600;">
                                            <!-- countdown populated via JS -->
                                        </div>
                                    </div>
                                    ${payment.transaction_id ? `
                                        <div class="small mt-1" style="color: var(--primary-start);">
                                            <i class="bi bi-receipt"></i> Transaction: <code style="color: #000;">${payment.transaction_id}</code>
                                        </div>
                                    ` : ''}
                                </div>
                                ${this.isSuperuser && payment.status === 'pending' ? `
                                <div class="ms-2">
                                    <button class="btn btn-sm" style="background: linear-gradient(135deg, var(--confetti-2) 0%, #16a34a 100%); color: white; border: none;" onclick="dashboard.confirmPayment('${payment.id}'); event.stopPropagation();" title="Mark as Paid">
                                        <i class="bi bi-check-circle"></i>
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                            <div class="mt-2">
                                <button class="btn btn-sm w-100" type="button" data-bs-toggle="collapse" data-bs-target="#paymentInstructions${payment.id}" aria-expanded="false" onclick="event.stopPropagation();" style="background: linear-gradient(135deg, var(--primary-start) 0%, var(--primary-end) 100%); color: white; border: none; font-weight: 600; box-shadow: 0 4px 15px rgba(146, 64, 14, 0.3);">
                                    <i class="bi bi-wallet2 payment-method-icon"></i> How to Pay
                                    <span class="badge ms-2" style="background: var(--confetti-3); color: #000;">${this.paymentMethods.length} Methods</span>
                                    <i class="bi bi-chevron-down ms-1"></i>
                                </button>
                                <div class="collapse mt-2" id="paymentInstructions${payment.id}">
                                    <div class="how-to-pay-container" style="border: 2px solid var(--primary-start); border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 8px 30px rgba(146, 64, 14, 0.2);">
                                        ${this.paymentMethods.length > 0 ? `
                                            <div class="text-center mb-4">
                                                <div class="mb-2" style="font-size: 2rem;">
                                                    <i class="bi bi-credit-card-2-front" style="background: linear-gradient(135deg, var(--primary-start), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"></i>
                                                </div>
                                                <h6 class="fw-bold mb-1" style="color: #000; font-size: 1.1rem;">
                                                    Choose Your Payment Method
                                                </h6>
                                                <small style="color: #000; opacity: 0.7; font-size: 0.85rem;">Select any method below to complete your payment</small>
                                            </div>
                                            <div class="row g-3">
                                                ${this.paymentMethods.map((method, index) => {
                                                    // Use project color scheme
                                                    const projectColors = [
                                                        { bg: 'var(--primary-start)', dark: '#7a350b', light: '#fef3c7', icon: 'bi-bank', rgb: '146, 64, 14' },
                                                        { bg: 'var(--primary-end)', dark: '#db2777', light: '#fce7f3', icon: 'bi-phone', rgb: '236, 72, 153' },
                                                        { bg: 'var(--accent)', dark: '#9333ea', light: '#f3e8ff', icon: 'bi-wallet', rgb: '168, 85, 247' },
                                                        { bg: 'var(--confetti-1)', dark: '#e11d48', light: '#ffe4e6', icon: 'bi-credit-card', rgb: '244, 63, 94' },
                                                        { bg: 'var(--confetti-2)', dark: '#16a34a', light: '#dcfce7', icon: 'bi-paypal', rgb: '34, 197, 94' },
                                                        { bg: 'var(--confetti-3)', dark: '#eab308', light: '#fefce8', icon: 'bi-cash-coin', rgb: '253, 224, 71' }
                                                    ];
                                                    const color = projectColors[index % projectColors.length];
                                                    const isSelected = paymentMethod.id === method.id;
                                                    const safeMethodName = stripRichText(method.name || 'Payment Method');
                                                    const safeMethodDescription = sanitizeRichText(method.description || '');
                                                    
                                                    return `
                                                        <div class="col-12">
                                                            <div class="payment-method-card card border-0 shadow-sm mb-0" style="border-left: 5px solid ${color.bg} !important; ${isSelected ? 'border: 3px solid ' + color.bg + ' !important; box-shadow: 0 8px 25px rgba(' + color.rgb + ', 0.3) !important;' : ''}">
                                                                <div class="payment-method-header card-header py-3" style="background: linear-gradient(135deg, ${color.bg} 0%, ${color.dark} 100%); color: white; border: none;">
                                                                    <div class="d-flex align-items-center justify-content-between">
                                                                        <div class="d-flex align-items-center">
                                                                            <div class="me-3" style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                                                                <i class="bi ${color.icon}" style="font-size: 1.3rem;"></i>
                                                                            </div>
                                                                            <div>
                                                                                <strong style="font-size: 1rem; display: block; color: white;">${safeMethodName}</strong>
                                                                                <small style="opacity: 0.9; font-size: 0.75rem; color: white;">Click to view details</small>
                                                                            </div>
                                                                        </div>
                                                                        ${isSelected ? `
                                                                            <span class="selected-badge-payment badge" style="background: var(--confetti-3); color: #000; font-size: 0.75rem; padding: 0.4rem 0.6rem;">
                                                                                <i class="bi bi-check-circle-fill"></i> Selected
                                                                            </span>
                                                                        ` : `
                                                                            <i class="bi bi-chevron-right" style="opacity: 0.7; color: white;"></i>
                                                                        `}
                                                                    </div>
                                                                </div>
                                                                <div class="card-body py-3" style="background: linear-gradient(135deg, #ffffff 0%, ${color.light} 100%);">
                                                                    ${method.account_number ? `
                                                                        <div class="mb-3">
                                                                            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                                                                <div class="flex-grow-1">
                                                                                    <div class="d-flex align-items-center mb-2">
                                                                                        <i class="bi bi-bank me-2" style="color: ${color.bg}; font-size: 1.1rem;"></i>
                                                                                        <small class="fw-bold" style="color: #000; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                                                                            Account Number
                                                                                        </small>
                                                                                    </div>
                                                                                    <div class="payment-account-code" style="border-color: ${color.bg}; padding: 0.75rem 1rem; border-radius: 0.5rem; color: #000; font-size: 1.1rem; font-weight: bold; text-align: center; cursor: pointer;" onclick="navigator.clipboard.writeText('${method.account_number}'); dashboard.showAlert('Account number copied!', 'success'); event.stopPropagation();">
                                                                                        <i class="bi bi-clipboard-check me-2" style="color: ${color.bg};"></i>
                                                                                        ${method.account_number}
                                                                                    </div>
                                                                                </div>
                                                                                <button class="copy-btn-payment btn btn-sm" style="background: linear-gradient(135deg, ${color.bg} 0%, ${color.dark} 100%); color: white; border: none; min-width: 80px; box-shadow: 0 4px 15px rgba(${color.rgb}, 0.3);" onclick="navigator.clipboard.writeText('${method.account_number}'); dashboard.showAlert('Account number copied!', 'success'); event.stopPropagation();">
                                                                                    <i class="bi bi-clipboard"></i> Copy
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ` : ''}
                                                                    ${safeMethodDescription ? `
                                                                        <div class="mt-3">
                                                                            <div class="d-flex align-items-center mb-2">
                                                                                <i class="bi bi-info-circle-fill me-2" style="color: ${color.bg}; font-size: 1.1rem;"></i>
                                                                                <strong style="color: #000; font-size: 0.9rem;">Payment Instructions</strong>
                                                                            </div>
                                                                            <div class="payment-instructions-box p-3 rounded" style="border-left-color: ${color.bg}; color: #000; font-size: 0.85rem; line-height: 1.6;">
${safeMethodDescription}
                                                                            </div>
                                                                        </div>
                                                                    ` : `
                                                                        <div class="alert mb-0 py-2" style="font-size: 0.8rem; border-left: 3px solid ${color.bg}; background-color: ${color.light}; color: #000;">
                                                                            <i class="bi bi-info-circle me-2" style="color: #000;"></i> <span style="color: #000;">Contact support for payment instructions.</span>
                                                                        </div>
                                                                    `}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                            <div class="mt-4 p-3 rounded" style="background: linear-gradient(135deg, var(--muted) 0%, #f3e8ff 100%); border: 2px solid var(--accent); box-shadow: 0 4px 15px rgba(168, 85, 247, 0.2);">
                                                <div class="d-flex align-items-start">
                                                    <div class="me-3" style="width: 45px; height: 45px; background: linear-gradient(135deg, var(--primary-start) 0%, var(--primary-end) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                                        <i class="bi bi-lightbulb-fill" style="font-size: 1.5rem; color: white;"></i>
                                                    </div>
                                                    <div>
                                                        <strong style="color: #000; font-size: 0.95rem; display: block; margin-bottom: 0.5rem;">
                                                            💡 Payment Tip
                                                        </strong>
                                                        <div style="color: #000; font-size: 0.85rem; line-height: 1.6;">
                                                            You can use <strong style="color: #000;">any</strong> of the payment methods above. After completing the payment, ${this.isSuperuser ? 'click <strong style="color: #000;">"Mark as Paid"</strong> to activate your event.' : 'contact a superuser to confirm the payment and activate your event.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ` : `
                                            <div class="alert mb-0 py-3" style="border-left: 4px solid var(--confetti-3); background-color: #fefce8; color: #000;">
                                                <div class="d-flex align-items-center">
                                                    <i class="bi bi-exclamation-triangle-fill me-2" style="font-size: 1.5rem; color: #000;"></i>
                                                    <div>
                                                        <strong style="color: #000;">No payment methods available</strong>
                                                        <div class="small" style="color: #000;">Please contact support for assistance.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Always hide footer (total is not shown)
                if (cartDropdownFooter) {
                    cartDropdownFooter.style.display = 'none';
                }
            }
            
            // Setup countdown timers for each payment
            this.initializePaymentCountdowns(payments);
        }
        
        // Full section is no longer used - all details shown in modal
        // Just update count if elements exist
        if (paymentsSection && paymentsList && paymentsCount) {
            paymentsCount.textContent = payments.length;
            paymentsSection.style.display = 'none'; // Always hide the full section
        }
    }
    
    initializePaymentCountdowns(payments = []) {
        // Clear existing timers
        if (this.paymentCountdownTimers && typeof this.paymentCountdownTimers === 'object') {
            Object.values(this.paymentCountdownTimers).forEach(intervalId => clearInterval(intervalId));
        }
        this.paymentCountdownTimers = {};
        
        payments.forEach(payment => this.startPaymentCountdown(payment));
    }
    
    startPaymentCountdown(payment) {
        const countdownEl = document.getElementById(`paymentCountdown-${payment.id}`);
        if (!countdownEl || !payment?.created_at) {
            return;
        }
        
        const createdTime = new Date(payment.created_at).getTime();
        const expiryTime = createdTime + (10 * 60 * 1000); // 10 minutes
        
        const updateCountdown = () => {
            const now = Date.now();
            const remaining = expiryTime - now;
            
            if (remaining <= 0) {
                countdownEl.textContent = '⏰ Confirmation window expired';
                countdownEl.classList.remove('text-warning');
                countdownEl.classList.add('text-danger', 'fw-bold');
                clearInterval(this.paymentCountdownTimers[payment.id]);
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            countdownEl.textContent = `Confirm within ${minutes}:${seconds.toString().padStart(2, '0')} min`;
            
            if (remaining <= 2 * 60 * 1000) {
                countdownEl.classList.add('text-warning', 'fw-bold');
            } else {
                countdownEl.classList.remove('text-warning');
            }
        };
        
        updateCountdown();
        this.paymentCountdownTimers[payment.id] = setInterval(updateCountdown, 1000);
    }
    
    viewPaymentDetails(paymentId) {
        // Find the payment from the loaded payments (handle both string and number IDs)
        const payment = this.pendingPayments?.find(p => p.id == paymentId || String(p.id) === String(paymentId));
        if (!payment) {
            console.error('Payment not found:', paymentId, 'Available payments:', this.pendingPayments?.map(p => p.id));
            this.showAlert('Payment not found', 'warning');
            return;
        }
        
        // Close the dropdown
        const dropdown = document.getElementById('cartDropdown');
        if (dropdown) {
            const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
            if (bsDropdown) bsDropdown.hide();
        }
        
        // Show payment details in modal
        const modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
        const modalContent = document.getElementById('paymentDetailsContent');
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        
        const event = payment.event || {};
        const paymentMethod = payment.payment_method || {};
        const amount = parseFloat(payment.amount || 0);
        const createdDate = payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A';
        const eventDate = event.event_date ? new Date(event.event_date).toLocaleString() : 'N/A';
        const safePaymentInstructions = sanitizeRichText(paymentMethod.description || '');
        const safeEventDescription = sanitizeRichText(event.description || '');
        
        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <h6 class="mb-2" style="color: #000;">Event Information</h6>
                    <p class="mb-1" style="color: #000;"><strong>Title:</strong> ${event.title || 'N/A'}</p>
                    <p class="mb-1" style="color: #000;"><strong>Date:</strong> ${eventDate}</p>
                    <p class="mb-1" style="color: #000;"><strong>Location:</strong> ${event.location || 'N/A'}</p>
                    <p class="mb-1" style="color: #000;"><strong>Package:</strong> ${event.package?.name || 'N/A'}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <h6 class="mb-2" style="color: #000;">Payment Information</h6>
                    <p class="mb-1" style="color: #000;"><strong>Amount:</strong> <span class="fw-bold" style="color: #000;">${amount.toLocaleString()} ETB</span></p>
                    <p class="mb-1" style="color: #000;"><strong>Status:</strong> <span class="badge bg-warning text-dark">${payment.status || 'Pending'}</span></p>
                    <p class="mb-1" style="color: #000;"><strong>Created:</strong> ${createdDate}</p>
                    ${payment.transaction_id ? `
                        <p class="mb-1" style="color: #000;"><strong>Transaction ID:</strong> <code style="color: #000;">${payment.transaction_id}</code></p>
                    ` : ''}
                </div>
            </div>
            <div class="row">
                <div class="col-12 mb-3">
                    <div class="card" style="border: 2px solid var(--primary-start);">
                        <div class="card-header text-white" style="background: linear-gradient(135deg, var(--primary-start) 0%, var(--primary-end) 100%);">
                            <h6 class="mb-0">
                                <i class="bi bi-info-circle"></i> How to Pay
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6 class="fw-bold mb-2" style="color: #000;">
                                    <i class="bi bi-credit-card"></i> Payment Method: ${paymentMethod.name || 'N/A'}
                                </h6>
                                ${paymentMethod.account_number ? `
                                    <div class="alert alert-light border mb-3">
                                        <div class="d-flex align-items-center mb-2">
                                            <strong class="me-2" style="color: #000;">Account Number:</strong>
                                            <code class="fs-5 fw-bold" style="color: #000;">${paymentMethod.account_number}</code>
                                            <button class="btn btn-sm ms-2" style="background: linear-gradient(135deg, var(--primary-start) 0%, var(--primary-end) 100%); color: white; border: none;" onclick="navigator.clipboard.writeText('${paymentMethod.account_number}'); dashboard.showAlert('Account number copied!', 'success');">
                                                <i class="bi bi-clipboard"></i> Copy
                                            </button>
                                        </div>
                                    </div>
                                ` : ''}
                                ${safePaymentInstructions ? `
                                    <div class="mb-3">
                                        <strong style="color: #000;">Payment Instructions:</strong>
                                        <div class="mt-2 p-3 bg-light rounded" style="color: #000;">
${safePaymentInstructions}
                                        </div>
                                    </div>
                                ` : `
                                    <div class="alert mb-0" style="color: #000; background-color: var(--confetti-3); border-left: 4px solid var(--confetti-3);">
                                        <i class="bi bi-exclamation-triangle"></i> <span style="color: #000;">No payment instructions available. Please contact support for payment details.</span>
                                    </div>
                                `}
                            </div>
                            <div class="alert mb-0" style="color: #000; background: linear-gradient(135deg, var(--muted) 0%, #f3e8ff 100%); border: 2px solid var(--accent);">
                                <i class="bi bi-lightbulb"></i> <strong style="color: #000;">Note:</strong> <span style="color: #000;">After completing the payment, ${this.isSuperuser ? 'click "Mark as Paid" to activate your event.' : 'contact a superuser to confirm the payment and activate your event.'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${safeEventDescription ? `
                <div class="row">
                    <div class="col-12">
                        <h6 class="mb-2" style="color: #000;">Event Description</h6>
                        <p style="color: #000;">${safeEventDescription}</p>
                    </div>
                </div>
            ` : ''}
        `;
        
        // Show confirm button only if payment is pending AND user is superuser
        if (payment.status === 'pending' && this.isSuperuser) {
            confirmBtn.style.display = 'block';
            confirmBtn.setAttribute('data-payment-id', paymentId);
        } else {
            confirmBtn.style.display = 'none';
        }
        
        modal.show();
    }
    
    confirmPaymentFromModal() {
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const paymentId = confirmBtn.getAttribute('data-payment-id');
        if (paymentId) {
            // Close modal first
            const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
            if (modal) modal.hide();
            // Then confirm payment
            this.confirmPayment(paymentId);
        }
    }
    
    viewAllPendingPayments() {
        // This function is no longer needed - removed
    }

    async confirmPayment(paymentId) {
        if (!confirm('Have you completed the payment? This will mark the payment as completed and activate the event.')) {
            return;
        }
        
        try {
            console.log(`💳 Confirming payment: ${paymentId}`);
            
            const response = await API_UTILS.request(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PAYMENTS}${paymentId}/confirm/`, {
                method: 'POST',
                mode: 'cors'
            });
            
            console.log('✅ Payment confirmed successfully:', response);
            
            this.showAlert('Payment confirmed! Event has been activated.', 'success');
            
            // Reload pending payments and events
            this.loadPendingPayments();
            this.loadEvents();
            
        } catch (error) {
            console.error('❌ Error confirming payment:', error);
            if (error.message && error.message.includes('superuser')) {
                this.showAlert('Only superusers can confirm payments.', 'warning');
            } else {
                this.showAlert(`Error confirming payment: ${error.message}`, 'danger');
            }
        }
    }

    async showProfileModal() {
        try {
            // Load user profile data
            const token = localStorage.getItem('neberku_access_token');
            if (!token) {
                this.showAlert('Authentication required', 'danger');
                return;
            }

            const response = await fetch(`${API_CONFIG.BASE_URL}/api/user/profile/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                
                // Populate form fields (with null checks for safety)
                const usernameEl = document.getElementById('profileUsername');
                const emailEl = document.getElementById('profileEmail');
                const firstNameEl = document.getElementById('profileFirstName');
                const lastNameEl = document.getElementById('profileLastName');
                const phoneEl = document.getElementById('profilePhoneNumber');
                
                if (usernameEl) usernameEl.value = userData.username || '';
                if (emailEl) emailEl.value = userData.email || '';
                if (firstNameEl) firstNameEl.value = userData.first_name || '';
                if (lastNameEl) lastNameEl.value = userData.last_name || '';
                if (phoneEl) phoneEl.value = userData.phone_number || '';
                
                // Account type
                let accountType = 'Standard User';
                if (userData.is_superuser) accountType = 'Superuser';
                else if (userData.is_staff) accountType = 'Staff';
                const accountTypeEl = document.getElementById('profileAccountType');
                if (accountTypeEl) {
                    accountTypeEl.value = accountType;
                }
                
                // Date joined (optional field - may not exist in compact modal)
                if (userData.date_joined) {
                    const dateJoinedEl = document.getElementById('profileDateJoined');
                    if (dateJoinedEl) {
                        const date = new Date(userData.date_joined);
                        dateJoinedEl.value = date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }
                }
                
                // Clear validation states (with null checks)
                if (emailEl) emailEl.classList.remove('is-invalid', 'is-valid');
                if (firstNameEl) firstNameEl.classList.remove('is-invalid', 'is-valid');
                if (lastNameEl) lastNameEl.classList.remove('is-invalid', 'is-valid');
                if (phoneEl) phoneEl.classList.remove('is-invalid', 'is-valid');
                
                // Clear password fields (with null checks)
                const currentPasswordEl = document.getElementById('currentPassword');
                const newPasswordEl = document.getElementById('newPassword');
                const confirmPasswordEl = document.getElementById('confirmNewPassword');
                
                if (currentPasswordEl) {
                    currentPasswordEl.value = '';
                    currentPasswordEl.classList.remove('is-invalid', 'is-valid');
                }
                if (newPasswordEl) {
                    newPasswordEl.value = '';
                    newPasswordEl.classList.remove('is-invalid', 'is-valid');
                }
                if (confirmPasswordEl) {
                    confirmPasswordEl.value = '';
                    confirmPasswordEl.classList.remove('is-invalid', 'is-valid');
                }
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('profileModal'));
                modal.show();
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.showAlert(`Failed to load profile: ${errorData.error || 'Unknown error'}`, 'danger');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showAlert('Failed to load profile. Please try again.', 'danger');
        }
    }

    async updateProfile() {
        const updateBtn = document.getElementById('updateProfileBtn');
        const originalText = updateBtn.innerHTML;
        
        try {
            // Validate form
            const email = document.getElementById('profileEmail').value.trim();
            const firstName = document.getElementById('profileFirstName').value.trim();
            const lastName = document.getElementById('profileLastName').value.trim();
            const phoneNumber = document.getElementById('profilePhoneNumber').value.trim();
            
            // Clear previous validation
            document.getElementById('profileEmail').classList.remove('is-invalid', 'is-valid');
            document.getElementById('profileFirstName').classList.remove('is-invalid', 'is-valid');
            document.getElementById('profileLastName').classList.remove('is-invalid', 'is-valid');
            document.getElementById('profilePhoneNumber').classList.remove('is-invalid', 'is-valid');
            
            // Validate required fields
            if (!email || !firstName || !lastName) {
                this.showAlert('Please fill in all required fields', 'warning');
                if (!email) document.getElementById('profileEmail').classList.add('is-invalid');
                if (!firstName) document.getElementById('profileFirstName').classList.add('is-invalid');
                if (!lastName) document.getElementById('profileLastName').classList.add('is-invalid');
                return;
            }
            
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                document.getElementById('profileEmail').classList.add('is-invalid');
                this.showAlert('Please enter a valid email address', 'warning');
                return;
            }
            
            // Validate phone number if provided
            if (phoneNumber) {
                const phoneRegex = /^09\d{8}$/;
                if (!phoneRegex.test(phoneNumber)) {
                    document.getElementById('profilePhoneNumber').classList.add('is-invalid');
                    this.showAlert('Phone number must be in format: 09xxxxxxxx (10 digits starting with 09)', 'warning');
                    return;
                }
            }
            
            // Show loading state
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
            
            const token = localStorage.getItem('neberku_access_token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/user/profile/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: email,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.showAlert('Profile updated successfully!', 'success');
                
                // Update user data in localStorage
                const currentUser = getCurrentUser();
                if (currentUser) {
                    currentUser.email = data.user.email;
                    currentUser.first_name = data.user.first_name;
                    currentUser.last_name = data.user.last_name;
                    localStorage.setItem('neberku_user', JSON.stringify(currentUser));
                    
                    // Update display name
                    const displayName = `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username;
                    document.getElementById('userDisplayName').textContent = displayName;
                }
                
                // Close modal after a short delay
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
                    if (modal) modal.hide();
                }, 1500);
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.showAlert(`Failed to update profile: ${errorData.error || 'Unknown error'}`, 'danger');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showAlert('Failed to update profile. Please try again.', 'danger');
        } finally {
            updateBtn.disabled = false;
            updateBtn.innerHTML = originalText;
        }
    }

    async changePassword() {
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const originalText = changePasswordBtn.innerHTML;
        
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            // Clear previous validation
            document.getElementById('currentPassword').classList.remove('is-invalid', 'is-valid');
            document.getElementById('newPassword').classList.remove('is-invalid', 'is-valid');
            document.getElementById('confirmNewPassword').classList.remove('is-invalid', 'is-valid');
            
            // Validate fields
            if (!currentPassword) {
                document.getElementById('currentPassword').classList.add('is-invalid');
                this.showAlert('Please enter your current password', 'warning');
                return;
            }
            
            if (!newPassword) {
                document.getElementById('newPassword').classList.add('is-invalid');
                this.showAlert('Please enter a new password', 'warning');
                return;
            }
            
            if (newPassword.length < 8) {
                document.getElementById('newPassword').classList.add('is-invalid');
                this.showAlert('Password must be at least 8 characters long', 'warning');
                return;
            }
            
            if (newPassword !== confirmNewPassword) {
                document.getElementById('confirmNewPassword').classList.add('is-invalid');
                this.showAlert('New passwords do not match', 'warning');
                return;
            }
            
            // Show loading state
            changePasswordBtn.disabled = true;
            changePasswordBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Changing...';
            
            const token = localStorage.getItem('neberku_access_token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/user/change-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    old_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmNewPassword
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.showAlert('Password changed successfully!', 'success');
                
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmNewPassword').value = '';
                document.getElementById('currentPassword').classList.remove('is-invalid', 'is-valid');
                document.getElementById('newPassword').classList.remove('is-invalid', 'is-valid');
                document.getElementById('confirmNewPassword').classList.remove('is-invalid', 'is-valid');
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || 'Unknown error';
                this.showAlert(`Failed to change password: ${errorMessage}`, 'danger');
                
                // Mark invalid fields
                if (errorMessage.includes('Current password') || errorMessage.includes('current password')) {
                    document.getElementById('currentPassword').classList.add('is-invalid');
                }
                if (errorMessage.includes('at least 8')) {
                    document.getElementById('newPassword').classList.add('is-invalid');
                }
                if (errorMessage.includes('do not match')) {
                    document.getElementById('confirmNewPassword').classList.add('is-invalid');
                }
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showAlert('Failed to change password. Please try again.', 'danger');
        } finally {
            changePasswordBtn.disabled = false;
            changePasswordBtn.innerHTML = originalText;
        }
    }

}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});

// Global refresh function to maintain proper ordering
function refreshEvents() {
    if (dashboard) {
        dashboard.loadEvents();
    }
}

// Global function to view event details
function viewEvent(eventId) {
    if (dashboard) {
        dashboard.viewEvent(eventId);
    }
} 