// Dashboard functionality for event owners
class Dashboard {
    constructor() {
        this.events = [];
        this.currentPage = 1;
        this.eventsPerPage = 6;
        this.filteredEvents = null; // null means no filter applied, [] means filter applied but empty results
        this.packages = []; // Store packages data for validation
        this.selectedPackage = null; // Store selected package data
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadPackagesAndEventTypes();
        this.loadDashboardData();
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
            console.log('✅ User authenticated:', user.username);
            console.log('🔑 Session cookies should be available for API calls');
            console.log('🎯 Ready to load dashboard data');
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
                    <div class="alert alert-info">
                        <strong>💡 Tip:</strong> Try selecting a different filter or create a new event!
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
                    <div class="card h-100 shadow-sm">
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
                            <h6 class="card-title text-primary mb-2" style="font-size: 0.9rem; line-height: 1.2;">${this.truncateText(event.title, 30)}</h6>
                            <p class="card-text text-muted mb-2" style="font-size: 0.8rem;">
                                <i class="bi bi-geo-alt"></i> ${this.truncateText(event.location || 'N/A', 20)}
                            </p>
                            
                            <div class="row text-center mb-2">
                                <div class="col-3">
                                    <div class="text-primary">
                                        <i class="bi bi-image" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.photo_count || 0}</div>
                                    </div>
                                </div>
                                <div class="col-3">
                                    <div class="text-info">
                                        <i class="bi bi-camera-video" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.video_count || 0}</div>
                                    </div>
                                </div>
                                <div class="col-3">
                                    <div class="text-secondary">
                                        <i class="bi bi-mic" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.voice_count || 0}</div>
                                    </div>
                                </div>
                                <div class="col-3">
                                    <div class="text-success">
                                        <i class="bi bi-people" style="font-size: 0.8rem;"></i>
                                        <div style="font-size: 0.75rem;">${event.total_guest_posts || 0}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-flex gap-1">
                                <button class="btn btn-outline-primary btn-sm flex-fill" onclick="dashboard.viewEvent('${event.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.4rem;">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                <button class="btn btn-outline-info btn-sm flex-fill" onclick="dashboard.viewEventPosts('${event.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.4rem;">
                                    <i class="bi bi-chat-dots"></i> Posts
                                </button>
                                <button class="btn btn-outline-success btn-sm flex-fill" onclick="dashboard.shareEvent('${event.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.4rem;">
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
            this.showAlert('Event created successfully!', 'success');
            
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
        
        // Load packages and event types when form is shown
        this.loadPackagesAndEventTypes();
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
                hintElement.className = 'form-hint text-info small mt-1';
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