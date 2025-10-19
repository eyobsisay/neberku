class EventDetail {
    constructor() {
        this.eventId = this.getEventIdFromUrl();
        this.event = null;
        this.guestPosts = [];
        this.filteredPosts = [];
        this.currentPage = 1;
        this.postsPerPage = 8;
        this.filters = {
            status: '',
            search: ''
        };
        // Add loading states to prevent duplicate API calls
        this.isLoadingPackages = false;
        this.isLoadingEventTypes = false;
        this.packagesLoaded = false;
        this.eventTypesLoaded = false;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Event Detail Page');
        this.checkAuth();
        if (this.eventId) {
            this.loadEventDetail();
            this.loadEventGuestPosts();
            this.loadEventTypesAndPackages();
            this.bindEvents();
        } else {
            this.showError('No event ID provided');
        }
    }

    getEventIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    checkAuth() {
        const user = localStorage.getItem('neberku_user');
        if (!user) {
            console.log('❌ No user data found, redirecting to login');
            window.location.replace('login.html');
            return;
        }
        console.log('✅ User authenticated');
    }

    bindEvents() {
        // Status filter change
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        // Search filter with debouncing
        let searchTimeout;
        document.getElementById('searchFilter').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300);
        });

        // Tab switching events
        const tabButtons = document.querySelectorAll('#eventTabs button[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (e) => {
                const targetTab = e.target.getAttribute('data-bs-target');
                console.log('📑 Tab switched to:', targetTab);
                
                // Handle specific tab actions
                if (targetTab === '#share') {
                    // Generate QR code when Share tab is activated
                    this.generateQRCode();
                }
            });
        });
    }

    async loadEventDetail() {
        try {
            console.log('📡 Loading event details for ID:', this.eventId);
            
            // Use centralized API request with automatic auth error handling
            this.event = await API_UTILS.request(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_DETAIL.replace('{id}', this.eventId)}`, {
                method: 'GET'
            });

            console.log('✅ Event loaded successfully:', this.event);
            console.log('🖼️ Event banner:', this.event.event_banner);
            console.log('📸 Event thumbnail:', this.event.event_thumbnail);
            this.renderEventDetail();
            
        } catch (error) {
            console.error('❌ Error loading event:', error);
            this.showError('Unable to load event details. Please check your connection and try again.');
        }
    }

    async loadEventGuestPosts() {
        try {
            console.log('📡 Loading guest posts for event:', this.eventId);
            
            // Use centralized API request with automatic auth error handling
            // Use the by_event action with event_id parameter
            const postsData = await API_UTILS.request(`${API_CONFIG.BASE_URL}/api/guest-posts/by_event/?event_id=${this.eventId}`, {
                method: 'GET'
            });

            console.log('✅ Guest posts loaded for event:', postsData);
            
            // Handle paginated response
            this.guestPosts = postsData.results || postsData;
            console.log(`📊 Found ${this.guestPosts.length} posts for this event`);
            
            this.applyFilters();
            
        } catch (error) {
            console.error('❌ Error loading guest posts:', error);
            this.renderGuestPosts([]);
        }
    }

    async loadEventTypesAndPackages() {
        try {
            console.log('📡 Loading event types and packages');
            console.log('🔗 Packages URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PACKAGES}`);
            console.log('🔗 Event Types URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_TYPES}`);
            
            // Check if already loading or loaded to prevent duplicate calls
            if (this.isLoadingPackages || this.isLoadingEventTypes) {
                console.log('⚠️ Already loading packages/event types, skipping duplicate call');
                return;
            }
            
            if (this.packagesLoaded && this.eventTypesLoaded) {
                console.log('✅ Packages and event types already loaded, skipping API calls');
                return;
            }
            
            // Packages and event types are publicly accessible (no authentication required)
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Load packages
            this.isLoadingPackages = true;
            const packagesResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PACKAGES}`, {
                headers: headers
            });
            
            console.log('📦 Packages response status:', packagesResponse.status);
            if (packagesResponse.ok) {
                const packagesData = await packagesResponse.json();
                console.log('📦 Packages response data:', packagesData);
                
                // Handle different response structures
                let packages = packagesData;
                if (packagesData.results) {
                    packages = packagesData.results; // Django REST Framework pagination
                    console.log('📦 Using paginated results:', packages.length, 'packages');
                } else if (packagesData.data) {
                    packages = packagesData.data; // Some APIs wrap in data field
                    console.log('📦 Using data field:', packages.length, 'packages');
                } else if (!Array.isArray(packagesData)) {
                    console.error('❌ Unexpected packages response structure:', packagesData);
                    packages = [];
                } else {
                    console.log('📦 Using direct array:', packages.length, 'packages');
                }
                
                if (Array.isArray(packages)) {
                    console.log('📦 Calling populatePackageDropdown with:', packages);
                    this.populatePackageDropdown(packages);
                    this.packagesLoaded = true;
                } else {
                    console.error('❌ Packages is not an array:', packages);
                }
            } else {
                console.error('❌ Failed to load packages:', packagesResponse.status, packagesResponse.statusText);
                const errorText = await packagesResponse.text();
                console.error('❌ Packages error response:', errorText);
            }
            
            this.isLoadingPackages = false;
            
            // Add a small delay between API calls to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Load event types
            this.isLoadingEventTypes = true;
            const eventTypesResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_TYPES}`, {
                headers: headers
            });
            
            console.log('🎯 Event types response status:', eventTypesResponse.status);
            if (eventTypesResponse.ok) {
                const eventTypesData = await eventTypesResponse.json();
                console.log('🎯 Event types response data:', eventTypesData);
                
                // Handle different response structures
                let eventTypes = eventTypesData;
                if (eventTypesData.results) {
                    eventTypes = eventTypesData.results; // Django REST Framework pagination
                    console.log('🎯 Using paginated results:', eventTypes.length, 'event types');
                } else if (eventTypesData.data) {
                    eventTypes = eventTypesData.data; // Some APIs wrap in data field
                    console.log('🎯 Using data field:', eventTypes.length, 'event types');
                } else if (!Array.isArray(eventTypesData)) {
                    console.error('❌ Unexpected event types response structure:', eventTypesData);
                    eventTypes = [];
                } else {
                    console.log('🎯 Using direct array:', eventTypes.length, 'event types');
                }
                
                if (Array.isArray(eventTypes)) {
                    console.log('🎯 Calling populateEventTypeDropdown with:', eventTypes);
                    this.populateEventTypeDropdown(eventTypes);
                    this.eventTypesLoaded = true;
                } else {
                    console.error('❌ Event types is not an array:', eventTypes);
                }
            } else {
                console.error('❌ Failed to load event types:', eventTypesResponse.status, eventTypesResponse.statusText);
                const errorText = await eventTypesResponse.text();
                console.error('❌ Event types error response:', errorText);
            }
            
            this.isLoadingEventTypes = false;
        } catch (error) {
            console.error('❌ Error loading event types and packages:', error);
            // Reset loading states on error
            this.isLoadingPackages = false;
            this.isLoadingEventTypes = false;
        }
    }

    populateEventTypeDropdown(eventTypes) {
        console.log('🎯 populateEventTypeDropdown called with:', eventTypes);
        const eventTypeSelect = document.getElementById('editEventType');
        if (!eventTypeSelect) {
            console.error('❌ Event type select element not found');
            return;
        }
        
        console.log('🎯 Found event type select element:', eventTypeSelect);
        eventTypeSelect.innerHTML = '<option value="">Select event type</option>';
        
        if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
            console.log('⚠️ No event types available or invalid data');
            eventTypeSelect.innerHTML = '<option value="">No event types available</option>';
            return;
        }
        
        eventTypes.forEach((eventType, index) => {
            console.log(`🎯 Adding event type ${index + 1}:`, eventType);
            const option = document.createElement('option');
            option.value = eventType.id;
            option.textContent = eventType.name;
            eventTypeSelect.appendChild(option);
        });
        
        console.log(`✅ Populated event type dropdown with ${eventTypes.length} event types`);
        console.log('🎯 Final dropdown options:', eventTypeSelect.innerHTML);
    }

    populatePackageDropdown(packages) {
        console.log('📦 populatePackageDropdown called with:', packages);
        const packageSelect = document.getElementById('editPackage');
        if (!packageSelect) {
            console.error('❌ Package select element not found');
            return;
        }
        
        console.log('📦 Found package select element:', packageSelect);
        packageSelect.innerHTML = '<option value="">Select a package</option>';
        
        if (!Array.isArray(packages) || packages.length === 0) {
            console.log('⚠️ No packages available or invalid data');
            packageSelect.innerHTML = '<option value="">No packages available</option>';
            return;
        }
        
        packages.forEach((pkg, index) => {
            console.log(`📦 Adding package ${index + 1}:`, pkg);
            const option = document.createElement('option');
            option.value = pkg.id;
            option.textContent = `${pkg.name} - $${pkg.price}`;
            packageSelect.appendChild(option);
        });
        
        console.log(`✅ Populated package dropdown with ${packages.length} packages`);
        console.log('📦 Final dropdown options:', packageSelect.innerHTML);
    }

    renderEventDetail() {
        if (!this.event) return;

        // Event header
        document.getElementById('eventTitle').textContent = this.event.title;
        document.getElementById('eventDescription').textContent = this.event.description || 'No description available';
        
        // Event status - update both header and detail tab
        const statusBadge = document.getElementById('eventStatus');
        if (this.event.status === 'active') {
            statusBadge.textContent = 'Active';
            statusBadge.className = 'badge bg-success fs-6';
        } else if (this.event.status === 'draft') {
            statusBadge.textContent = 'Draft';
            statusBadge.className = 'badge bg-secondary fs-6';
        } else {
            statusBadge.textContent = this.event.status;
            statusBadge.className = 'badge bg-info fs-6';
        }
        
        // Update Event Details tab status
        const eventStatusDetail = document.getElementById('eventStatusDetail');
        if (eventStatusDetail) {
            if (this.event.status === 'active') {
                eventStatusDetail.textContent = 'Active';
            } else if (this.event.status === 'draft') {
                eventStatusDetail.textContent = 'Draft';
            } else {
                eventStatusDetail.textContent = this.event.status;
            }
        }

        // Event date and location - update both header and detail tab
        document.getElementById('eventDate').textContent = this.formatDate(this.event.event_date);
        document.getElementById('eventLocation').textContent = this.event.location;
        
        // Update Event Details tab with unique IDs
        const eventDateDetail = document.getElementById('eventDateDetail');
        if (eventDateDetail) {
            eventDateDetail.textContent = this.formatDate(this.event.event_date);
        }
        
        const eventLocationDetail = document.getElementById('eventLocationDetail');
        if (eventLocationDetail) {
            eventLocationDetail.textContent = this.event.location;
        }

        // Statistics - update both header and detail tab
        document.getElementById('totalPhotos').textContent = this.event.photo_count || 0;
        document.getElementById('totalVideos').textContent = this.event.video_count || 0;
        document.getElementById('totalVoice').textContent = this.event.voice_count || 0;
        document.getElementById('totalPosts').textContent = this.event.total_guest_posts || 0;
        document.getElementById('totalGuests').textContent = this.event.total_guest_posts || 0; // Using posts as guest count for now
        
        // Use API data for non-approved posts
        const pendingPosts = this.event.non_approved_guest_posts || 0;
        
        document.getElementById('pendingPosts').textContent = pendingPosts;

        // Event details - update detail tab
        document.getElementById('eventType').textContent = this.event.event_type?.name || 'Unknown';
        document.getElementById('eventPackage').textContent = this.event.package?.name || 'Unknown';
        document.getElementById('createdAt').textContent = this.formatDate(this.event.created_at);

        // Enhanced event details for the detail tab
        document.getElementById('eventTitleDetail').textContent = this.event.title;
        document.getElementById('eventDescriptionDetail').textContent = this.event.description || 'No description available';
        document.getElementById('updatedAt').textContent = this.formatDate(this.event.updated_at);
        
        // Payment status - update both header and detail tab
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            const paymentStatusText = this.event.payment_status || 'Unknown';
            paymentStatus.textContent = paymentStatusText.charAt(0).toUpperCase() + paymentStatusText.slice(1);
        }
        
        const paymentStatusDetail = document.getElementById('paymentStatusDetail');
        if (paymentStatusDetail) {
            const paymentStatusText = this.event.payment_status || 'Unknown';
            paymentStatusDetail.textContent = paymentStatusText.charAt(0).toUpperCase() + paymentStatusText.slice(1);
        }
        
        // Published date - update both header and detail tab
        const publishedAt = document.getElementById('publishedAt');
        if (publishedAt) {
            publishedAt.textContent = this.event.published_at ? this.formatDate(this.event.published_at) : 'Not published';
        }
        
        const publishedAtDetail = document.getElementById('publishedAtDetail');
        if (publishedAtDetail) {
            publishedAtDetail.textContent = this.event.published_at ? this.formatDate(this.event.published_at) : 'Not published';
        }
        
        // Privacy settings
        const isPublic = document.getElementById('isPublic');
        if (isPublic) {
            isPublic.textContent = this.event.is_public ? 'Yes' : 'No';
        }
        
        const contributorCodeDetail = document.getElementById('contributorCodeDetail');
        if (contributorCodeDetail) {
            contributorCodeDetail.textContent = this.event.contributor_code || 'Not generated';
        }
        
        // Event media previews
        this.renderEventMediaPreviews();

        // Event banner
        this.renderEventBanner();

        // Event settings - update settings tab
        document.getElementById('photosAllowed').textContent = `Photos: ${this.event.allow_photos ? 'Allowed' : 'Not Allowed'}`;
        document.getElementById('videosAllowed').textContent = `Videos: ${this.event.allow_videos ? 'Allowed' : 'Not Allowed'}`;
        document.getElementById('wishesAllowed').textContent = `Wishes: ${this.event.allow_wishes ? 'Allowed' : 'Not Allowed'}`;
        document.getElementById('autoApprove').textContent = `Auto-approve: ${this.event.auto_approve_posts ? 'Yes' : 'No'}`;

        // Setup QR code and share functionality
        this.setupQRCodeAndShare();

        // Update page title
        document.title = `${this.event.title} - Event Detail - Neberku`;
    }

    applyFilters() {
        console.log('🔍 Applying filters:', this.filters);
        console.log('🔍 Guest posts before filtering:', this.guestPosts);
        
        this.filteredPosts = this.guestPosts.filter(post => {
            // Status filter
            if (this.filters.status && this.filters.status === 'approved' && !post.is_approved) return false;
            if (this.filters.status && this.filters.status === 'pending' && post.is_approved) return false;
            
            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const guestName = (post.guest?.name || '').toLowerCase();
                const wishText = (post.wish_text || '').toLowerCase();
                
                if (!guestName.includes(searchTerm) && !wishText.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });

        console.log('🔍 Filtered posts after applying filters:', this.filteredPosts);
        
        this.currentPage = 1;
        this.renderGuestPosts();
        this.renderPagination();
    }

    renderGuestPosts() {
        const guestPostsList = document.getElementById('guestPostsList');
        
        console.log('🎨 Rendering guest posts:', {
            guestPosts: this.guestPosts,
            filteredPosts: this.filteredPosts,
            guestPostsLength: this.guestPosts?.length,
            filteredPostsLength: this.filteredPosts?.length
        });
        
        if (!this.guestPosts || this.guestPosts.length === 0) {
            console.log('📭 No guest posts to display');
            guestPostsList.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-chat-dots display-1"></i>
                    <h4 class="mt-3">No guest posts yet</h4>
                    <p>When guests contribute to this event, their posts will appear here.</p>
                    <div class="mt-3">
                        <small class="text-muted">
                            Event ID: ${this.eventId}<br>
                            Total posts in system: ${this.guestPosts?.length || 0}
                        </small>
                    </div>
                </div>
            `;
            return;
        }

        if (this.filteredPosts.length === 0) {
            console.log('🔍 No posts match current filters');
            guestPostsList.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-search display-1"></i>
                    <h4 class="mt-3">No posts found</h4>
                    <p>Try adjusting your filters or search terms.</p>
                    <div class="mt-3">
                        <small class="text-muted">
                            Available posts: ${this.guestPosts.length}<br>
                            Filtered posts: ${this.filteredPosts.length}
                        </small>
                    </div>
                </div>
            `;
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.postsPerPage;
        const endIndex = startIndex + this.postsPerPage;
        const currentPosts = this.filteredPosts.slice(startIndex, endIndex);

        guestPostsList.innerHTML = currentPosts.map(post => `
            <div class="col-12 mb-4">
                <div class="card post-card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h6 class="card-title mb-0">${post.guest?.name || 'Anonymous'}</h6>
                                    <span class="badge ${post.is_approved ? 'bg-success' : 'bg-warning'}">
                                        ${post.is_approved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>
                                
                                <p class="card-text text-muted small mb-2">
                                    <i class="bi bi-calendar3"></i> ${this.formatDate(post.created_at)}
                                </p>
                                
                                <p class="card-text">${this.truncateText(post.wish_text, 200)}</p>
                                
                                <div class="row text-center mb-3">
                                    <div class="col-4">
                                        <small class="text-muted">
                                            <i class="bi bi-image"></i> ${post.photo_count || 0} photos
                                        </small>
                                    </div>
                                    <div class="col-4">
                                        <small class="text-muted">
                                            <i class="bi bi-camera-video"></i> ${post.video_count || 0} videos
                                        </small>
                                    </div>
                                    <div class="col-4">
                                        <small class="text-muted">
                                            <i class="bi bi-mic"></i> ${post.voice_count || 0} voice
                                        </small>
                                    </div>
                                </div>
                                
                                <div class="d-grid gap-2 d-md-flex">
                                    <a href="post-detail.html?id=${post.id}" class="btn btn-outline-primary btn-sm">
                                        <i class="bi bi-eye"></i> View Details
                                    </a>
                                    ${!post.is_approved ? `
                                        <button class="btn btn-outline-success btn-sm" onclick="eventDetail.approvePost('${post.id}')">
                                            <i class="bi bi-check-circle"></i> Approve
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="col-md-4">
                                ${this.renderMediaPreview(post)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderMediaPreview(post) {
        if (!post.media_files || post.media_files.length === 0) {
            return `
                <div class="text-center text-muted">
                    <i class="bi bi-image" style="font-size: 2rem;"></i>
                    <p class="small">No media</p>
                </div>
            `;
        }
    
        // Prioritize images for preview - find first image, fallback to first media
        let previewMedia = post.media_files.find(media => media.media_type === 'photo');
        if (!previewMedia) {
            previewMedia = post.media_files[0]; // Fallback to first media if no images
        }
        
        // Helper function to construct full URL using backend base URL
        const getFullUrl = (relativePath) => {
            if (!relativePath) return '';
            if (relativePath.startsWith('http')) return relativePath;
            return `${API_CONFIG.BASE_URL}${relativePath}`;
        };
    
        if (previewMedia.media_type === 'photo') {
            const photoUrl = getFullUrl(previewMedia.media_file);
            return `
                <img src="${photoUrl}" alt="${previewMedia.file_name || 'Photo'}" class="media-preview w-100" style="max-height: 200px; object-fit: cover;">
            `;
        } else if (previewMedia.media_type === 'video') {
            const videoUrl = getFullUrl(previewMedia.media_file);
            // For videos, show a thumbnail if available, otherwise show video controls
            if (previewMedia.media_thumbnail) {
                const thumbnailUrl = getFullUrl(previewMedia.media_thumbnail);
                return `
                    <div class="position-relative">
                        <img src="${thumbnailUrl}" alt="Video thumbnail" class="media-preview w-100" style="max-height: 200px; object-fit: cover;">
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="bi bi-play-circle-fill text-white" style="font-size: 2rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.7);"></i>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <video class="media-preview w-100" controls style="max-height: 200px;">
                        <source src="${videoUrl}" type="${previewMedia.mime_type || 'video/mp4'}">
                        Your browser does not support the video tag.
                    </video>
                `;
            }
        } else if (previewMedia.media_type === 'voice') {
            const audioUrl = getFullUrl(previewMedia.media_file);
            return `
                <div class="text-center text-muted" style="background: linear-gradient(135deg, rgba(139,92,246,.1), rgba(139,92,246,.05)); border-radius: 8px; padding: 2rem; border: 1px solid rgba(139,92,246,.2);">
                    <i class="bi bi-mic" style="font-size: 3rem; color: #8b5cf6; margin-bottom: 1rem;"></i>
                    <p class="mb-2"><strong>Voice Recording</strong></p>
                    <audio controls class="w-100" style="max-width: 200px;">
                        <source src="${audioUrl}" type="${previewMedia.mime_type || 'audio/mp3'}">
                        Your browser does not support the audio tag.
                    </audio>
                </div>
            `;
        }
        
        // Fallback for unknown media types
        return `
            <div class="text-center text-muted">
                <i class="bi bi-file-earmark" style="font-size: 2rem;"></i>
                <p class="small">Media file</p>
            </div>
        `;
    }
    renderPagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredPosts.length / this.postsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="eventDetail.goToPage(${this.currentPage - 1})">Previous</a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="eventDetail.goToPage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="eventDetail.goToPage(${this.currentPage + 1})">Next</a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredPosts.length / this.postsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderGuestPosts();
        this.renderPagination();
        
        // Scroll to posts section
        document.querySelector('.guest-posts-section').scrollIntoView({ behavior: 'smooth' });
    }

    async approvePost(postId) {
        if (!confirm('Are you sure you want to approve this post?')) return;

        try {
            console.log('✅ Approving post:', postId);
            
            // Use centralized API request with automatic auth error handling
            await API_UTILS.request(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POST_DETAIL.replace('{id}', postId)}/approve/`, {
                method: 'POST'
            });

            console.log('✅ Post approved successfully');
            this.showSuccess('Post approved successfully!');
            
            // Update the post in our local array
            const postIndex = this.guestPosts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                this.guestPosts[postIndex].is_approved = true;
            }
            
            // Update statistics after approval
            this.updateStatisticsAfterApproval();
            this.applyFilters();
            
        } catch (error) {
            console.error('❌ Error approving post:', error);
            this.showError('Unable to approve post. Please check your connection and try again.');
        }
    }

    updateStatisticsAfterApproval() {
        // Update non-approved count after a post is approved
        const pendingPosts = this.guestPosts.filter(post => !post.is_approved).length;
        
        document.getElementById('pendingPosts').textContent = pendingPosts;
        
        // Update total posts count
        document.getElementById('totalPosts').textContent = this.guestPosts.length;
        document.getElementById('totalGuests').textContent = this.guestPosts.length;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
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
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    renderEventMediaPreviews() {
        // Event thumbnail preview
        const thumbnailPreview = document.getElementById('eventThumbnailPreview');
        if (thumbnailPreview) {
            if (this.event.event_thumbnail) {
                const thumbnailUrl = this.getFullUrl(this.event.event_thumbnail);
                thumbnailPreview.innerHTML = `
                    <img src="${thumbnailUrl}" alt="Event thumbnail" class="img-fluid" style="max-height: 150px; border-radius: 8px;">
                `;
            } else {
                thumbnailPreview.innerHTML = '<span class="text-muted">No thumbnail uploaded</span>';
            }
        }
        
        // Event banner preview
        const bannerPreview = document.getElementById('eventBannerPreview');
        if (bannerPreview) {
            if (this.event.event_banner) {
                const bannerUrl = this.getFullUrl(this.event.event_banner);
                bannerPreview.innerHTML = `
                    <img src="${bannerUrl}" alt="Event banner" class="img-fluid" style="max-height: 150px; border-radius: 8px;">
                `;
            } else {
                bannerPreview.innerHTML = '<span class="text-muted">No banner uploaded</span>';
            }
        }
        
        // Event video preview
        const videoPreview = document.getElementById('eventVideoPreview');
        if (videoPreview) {
            if (this.event.event_video) {
                const videoUrl = this.getFullUrl(this.event.event_video);
                videoPreview.innerHTML = `
                    <video class="img-fluid" controls style="max-height: 150px; border-radius: 8px;">
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
            } else {
                videoPreview.innerHTML = '<span class="text-muted">No video uploaded</span>';
            }
        }
    }

    renderEventBanner() {
        const eventHeader = document.querySelector('.event-header');
        if (!eventHeader) {
            console.error('❌ Event header container not found');
            return;
        }

        // Use banner image if available, fallback to thumbnail, then default gradient
        let backgroundImage = null;
        let imageSource = '';

        if (this.event.event_banner) {
            backgroundImage = this.getFullUrl(this.event.event_banner);
            imageSource = 'banner';
            console.log('🖼️ Rendering event header with banner background:', backgroundImage);
        } else if (this.event.event_thumbnail) {
            backgroundImage = this.getFullUrl(this.event.event_thumbnail);
            imageSource = 'thumbnail';
            console.log('🖼️ Rendering event header with thumbnail background (fallback):', backgroundImage);
        } else {
            console.log('⚠️ No event banner or thumbnail available, using default gradient');
            // Reset to default gradient background
            eventHeader.style.backgroundImage = '';
            return;
        }

        if (backgroundImage) {
            // Set the background image
            eventHeader.style.backgroundImage = `url('${backgroundImage}')`;
            eventHeader.style.backgroundSize = 'cover';
            eventHeader.style.backgroundPosition = 'center';
            eventHeader.style.backgroundRepeat = 'no-repeat';
            console.log(`✅ Event header background set using ${imageSource} image`);
        }
    }

    getFullUrl(relativePath) {
        if (!relativePath) return '';
        if (relativePath.startsWith('http')) return relativePath;
        return `${API_CONFIG.BASE_URL}${relativePath}`;
    }

    setupQRCodeAndShare() {
        // Set contributor code
        const contributorCodeDisplay = document.getElementById('contributorCodeDisplay');
        if (contributorCodeDisplay && this.event.contributor_code) {
            contributorCodeDisplay.value = this.event.contributor_code;
        }

        // Set share link - always use frontend URL format
        const shareLinkInput = document.getElementById('shareLinkInput');
        if (shareLinkInput) {
            // Always generate frontend URL for consistency
            const shareUrl = `${window.location.origin}/guest-contribution.html?event=${this.event.id}`;
            shareLinkInput.value = shareUrl;
        }

        // Generate QR code (will be triggered when Share tab is activated)
        console.log('🔗 Share setup completed, QR code will generate when Share tab is activated');
    }


    async generateQRCode() {
        try {
            const qrContainer = document.getElementById('qrCodeContainer');
            if (!qrContainer) return;

            // Always generate QR code using frontend URL for consistency
            const shareUrl = document.getElementById('shareLinkInput')?.value || 
                           `${window.location.origin}/guest-contribution.html?event=${this.event.id}`;
            
            // Use QRServer API to generate QR code
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
            console.log('✅ Generated QR code using frontend URL:', shareUrl);
            
            // Create QR code image
            const qrImage = document.createElement('img');
            qrImage.src = qrCodeUrl;
            qrImage.alt = 'Event QR Code';
            qrImage.className = 'img-fluid';
            qrImage.style.maxWidth = '200px';
            
            // Clear loading spinner and add QR code
            qrContainer.innerHTML = '';
            qrContainer.appendChild(qrImage);
            
            console.log('✅ QR code displayed successfully');
        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            const qrContainer = document.getElementById('qrCodeContainer');
            if (qrContainer) {
                qrContainer.innerHTML = `
                    <div class="text-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        <small>Failed to generate QR code</small>
                    </div>
                `;
            }
        }
    }

    // Edit functionality methods
    toggleEditMode() {
        const viewMode = document.getElementById('eventDetailsView');
        const editMode = document.getElementById('eventDetailsEdit');
        const editBtn = document.getElementById('editEventBtn');
        
        if (viewMode.style.display === 'none') {
            // Switch to view mode
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            editBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Edit Event';
        } else {
            // Switch to edit mode
            viewMode.style.display = 'none';
            editMode.style.display = 'block';
            editBtn.innerHTML = '<i class="bi bi-eye"></i> View Event';
            this.populateEditForm();
        }
    }

    populateEditForm() {
        if (!this.event) return;
        
        // Populate form fields with current event data
        document.getElementById('editTitle').value = this.event.title || '';
        document.getElementById('editDescription').value = this.event.description || '';
        document.getElementById('editLocation').value = this.event.location || '';
        
        // Format date for datetime-local input
        if (this.event.event_date) {
            const eventDate = new Date(this.event.event_date);
            const formattedDate = eventDate.toISOString().slice(0, 16);
            document.getElementById('editEventDate').value = formattedDate;
        }
        
        // Set event type and package
        const eventTypeSelect = document.getElementById('editEventType');
        if (eventTypeSelect && this.event.event_type) {
            eventTypeSelect.value = this.event.event_type.id;
        }
        
        const packageSelect = document.getElementById('editPackage');
        if (packageSelect && this.event.package) {
            packageSelect.value = this.event.package.id;
        }
        
        // Populate checkboxes
        document.getElementById('editAllowPhotos').checked = this.event.allow_photos || false;
        document.getElementById('editAllowVideos').checked = this.event.allow_videos || false;
        document.getElementById('editAllowWishes').checked = this.event.allow_wishes || false;
        document.getElementById('editAutoApprove').checked = this.event.auto_approve_posts || false;
        document.getElementById('editIsPublic').checked = this.event.is_public || false;
        
        // Populate privacy settings
        const contributorCodeInput = document.getElementById('editContributorCode');
        if (contributorCodeInput) {
            contributorCodeInput.value = this.event.contributor_code || '';
        }
        
        // Set access control radio buttons
        const privateAccessRadio = document.getElementById('editPrivateAccess');
        const publicAccessRadio = document.getElementById('editPublicAccess');
        if (privateAccessRadio && publicAccessRadio) {
            if (this.event.is_public) {
                publicAccessRadio.checked = true;
            } else {
                privateAccessRadio.checked = true;
            }
        }
        
        // Show current media files
        this.showCurrentMediaFiles();
    }

    showCurrentMediaFiles() {
        // Clear any existing media previews first
        this.clearMediaPreviews();
        
        // Show current thumbnail
        const thumbnailContainer = document.getElementById('editThumbnail').parentNode;
        const currentThumbnailDiv = document.createElement('div');
        currentThumbnailDiv.className = 'mb-2 current-thumbnail-preview';
        currentThumbnailDiv.innerHTML = '<small class="text-muted">Current thumbnail:</small>';
        
        if (this.event.event_thumbnail) {
            const thumbnailUrl = this.getFullUrl(this.event.event_thumbnail);
            currentThumbnailDiv.innerHTML += `
                <div class="mt-1">
                    <img src="${thumbnailUrl}" alt="Current thumbnail" class="img-thumbnail" style="max-width: 150px; max-height: 100px;">
                </div>
            `;
        } else {
            currentThumbnailDiv.innerHTML += '<div class="mt-1 text-muted">No thumbnail uploaded</div>';
        }
        
        thumbnailContainer.insertBefore(currentThumbnailDiv, document.getElementById('editThumbnail'));
        
        // Show current banner
        const bannerContainer = document.getElementById('editBanner').parentNode;
        const currentBannerDiv = document.createElement('div');
        currentBannerDiv.className = 'mb-2 current-banner-preview';
        currentBannerDiv.innerHTML = '<small class="text-muted">Current banner:</small>';
        
        if (this.event.event_banner) {
            const bannerUrl = this.getFullUrl(this.event.event_banner);
            currentBannerDiv.innerHTML += `
                <div class="mt-1">
                    <img src="${bannerUrl}" alt="Current banner" class="img-thumbnail" style="max-width: 150px; max-height: 100px;">
                </div>
            `;
        } else {
            currentBannerDiv.innerHTML += '<div class="mt-1 text-muted">No banner uploaded</div>';
        }
        
        bannerContainer.insertBefore(currentBannerDiv, document.getElementById('editBanner'));
        
        // Show current video
        const videoContainer = document.getElementById('editVideo').parentNode;
        const currentVideoDiv = document.createElement('div');
        currentVideoDiv.className = 'mb-2 current-video-preview';
        currentVideoDiv.innerHTML = '<small class="text-muted">Current video:</small>';
        
        if (this.event.event_video) {
            const videoUrl = this.getFullUrl(this.event.event_video);
            currentVideoDiv.innerHTML += `
                <div class="mt-1">
                    <video controls class="img-thumbnail" style="max-width: 150px; max-height: 100px;">
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        } else {
            currentVideoDiv.innerHTML += '<div class="mt-1 text-muted">No video uploaded</div>';
        }
        
        videoContainer.insertBefore(currentVideoDiv, document.getElementById('editVideo'));
    }

    clearMediaPreviews() {
        // Remove existing media previews
        const existingThumbnailPreview = document.querySelector('.current-thumbnail-preview');
        if (existingThumbnailPreview) {
            existingThumbnailPreview.remove();
        }
        
        const existingBannerPreview = document.querySelector('.current-banner-preview');
        if (existingBannerPreview) {
            existingBannerPreview.remove();
        }
        
        const existingVideoPreview = document.querySelector('.current-video-preview');
        if (existingVideoPreview) {
            existingVideoPreview.remove();
        }
    }

    async updateEvent(eventData, thumbnailFile = null, bannerFile = null, videoFile = null) {
        try {
            console.log('📡 Updating event:', this.eventId);
            
            // Create FormData for multipart/form-data request
            const formData = new FormData();
            
            // Add all the form fields to FormData
            Object.keys(eventData).forEach(key => {
                if (eventData[key] !== null && eventData[key] !== undefined) {
                    formData.append(key, eventData[key]);
                }
            });
            
            // Add file uploads if provided
            if (thumbnailFile) {
                formData.append('event_thumbnail', thumbnailFile);
                console.log('📸 Adding thumbnail file:', thumbnailFile.name);
            }
            
            if (bannerFile) {
                formData.append('event_banner', bannerFile);
                console.log('🖼️ Adding banner file:', bannerFile.name);
            }
            
            if (videoFile) {
                formData.append('event_video', videoFile);
                console.log('🎥 Adding video file:', videoFile.name);
            }
            
            // Debug: Log all form data keys
            console.log('📋 Form data keys:', Array.from(formData.keys()));

            // Use centralized API request with automatic auth error handling
            const updatedEvent = await API_UTILS.request(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_DETAIL.replace('{id}', this.eventId)}`, {
                method: 'PUT',
                body: formData
                // Don't set Content-Type header - let browser set it with boundary for FormData
            });

            console.log('✅ Event updated successfully:', updatedEvent);
            console.log('🖼️ Updated event banner:', updatedEvent.event_banner);
            console.log('📸 Updated event thumbnail:', updatedEvent.event_thumbnail);
            this.event = updatedEvent;
            this.renderEventDetail();
            this.showSuccess('Event updated successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Error updating event:', error);
            this.showError('Unable to update event. Please check your connection and try again.');
            return false;
        }
    }
}

// Global functions
function goBack() {
    window.history.back();
}

function shareEvent() {
    if (window.eventDetail && window.eventDetail.event) {
        // Always use frontend URL format for consistency
        const shareUrl = `${window.location.origin}/guest-contribution.html?event=${window.eventDetail.event.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            window.eventDetail.showSuccess('Event link copied to clipboard!');
        }).catch(() => {
            window.eventDetail.showError('Failed to copy link');
        });
    }
}

function viewAllPosts() {
    if (window.eventDetail && window.eventDetail.event) {
        window.location.href = `guest-posts.html?event=${window.eventDetail.event.id}`;
    }
}

function downloadEventMedia() {
    if (window.eventDetail && window.eventDetail.event) {
        window.eventDetail.showAlert('Download functionality coming soon!', 'info');
    }
}

function debugGuestPosts() {
    if (window.eventDetail) {
        console.log('🐛 Debugging guest posts...');
        console.log('Event ID:', window.eventDetail.eventId);
        console.log('Event object:', window.eventDetail.event);
        console.log('Guest posts:', window.eventDetail.guestPosts);
        console.log('Filtered posts:', window.eventDetail.filteredPosts);
        
        // Get JWT token for authentication
        const token = localStorage.getItem('neberku_access_token');
        if (!token) {
            console.error('❌ No JWT token found for debug call');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // Test API call manually with the correct guest posts endpoint and event filtering
        fetch(`${API_CONFIG.BASE_URL}/api/guest-posts/?event=${window.eventDetail.eventId}`, {
            method: 'GET',
            headers: headers
        })
        .then(response => response.json())
        .then(data => {
            console.log('🐛 Raw API response:', data);
            console.log('🐛 All posts from API:', data.results || data);
            
            // Check if any posts have event information
            const posts = data.results || data;
            if (posts.length > 0) {
                console.log('🐛 Sample post structure:', posts[0]);
                console.log('🐛 Event field in first post:', posts[0].event);
                console.log('🐛 Event ID field in first post:', posts[0].event_id);
            }
        })
        .catch(error => {
            console.error('🐛 Debug API call failed:', error);
        });
        
        window.eventDetail.showAlert('Debug info logged to console. Press F12 to view.', 'info');
    }
}

// QR Code and Share Functions
function copyContributorCode() {
    const contributorCodeInput = document.getElementById('contributorCodeDisplay');
    if (contributorCodeInput && contributorCodeInput.value) {
        navigator.clipboard.writeText(contributorCodeInput.value).then(() => {
            window.eventDetail.showSuccess('Contributor code copied to clipboard!');
        }).catch(() => {
            window.eventDetail.showError('Failed to copy contributor code');
        });
    }
}

function copyShareLink() {
    const shareLinkInput = document.getElementById('shareLinkInput');
    if (shareLinkInput && shareLinkInput.value) {
        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
            window.eventDetail.showSuccess('Share link copied to clipboard!');
        }).catch(() => {
            window.eventDetail.showError('Failed to copy share link');
        });
    }
}

function downloadQRCode() {
    const qrImage = document.querySelector('#qrCodeContainer img');
    if (qrImage && qrImage.src) {
        // Create a temporary link to download the QR code
        const link = document.createElement('a');
        link.href = qrImage.src;
        link.download = `event-qr-${window.eventDetail.eventId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.eventDetail.showSuccess('QR code download started!');
    } else {
        window.eventDetail.showError('QR code not available for download');
    }
}

function shareViaSocial() {
    const shareLinkInput = document.getElementById('shareLinkInput');
    if (shareLinkInput && shareLinkInput.value) {
        const shareUrl = shareLinkInput.value;
        const eventTitle = window.eventDetail.event?.title || 'Event';
        
        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: `Join ${eventTitle}`,
                text: `Check out this event: ${eventTitle}`,
                url: shareUrl
            }).then(() => {
                window.eventDetail.showSuccess('Event shared successfully!');
            }).catch((error) => {
                console.log('Share cancelled or failed:', error);
            });
        } else {
            // Fallback: copy to clipboard
            copyShareLink();
        }
    }
}

// Preview functionality global functions
function openGuestView() {
    if (window.eventDetail && window.eventDetail.event) {
        let guestUrl;
        
        // Check if event is public or private
        if (window.eventDetail.event.is_public) {
            // Public event - just need event ID
            guestUrl = `${window.location.origin}/event-detail-guest.html?event=${window.eventDetail.event.id}`;
            console.log('👁️ Opening public event guest view:', guestUrl);
        } else {
            // Private event - need both event ID and contributor code
            if (window.eventDetail.event.contributor_code) {
                guestUrl = `${window.location.origin}/event-detail-guest.html?event=${window.eventDetail.event.id}&code=${window.eventDetail.event.contributor_code}`;
                console.log('👁️ Opening private event guest view with code:', guestUrl);
            } else {
                // No contributor code available - show error
                window.eventDetail.showError('Cannot preview private event: No contributor code available. Please generate a contributor code first.');
                return;
            }
        }
        
        // Open in new tab
        window.open(guestUrl, '_blank', 'noopener,noreferrer');
        
        // Show success message
        const eventType = window.eventDetail.event.is_public ? 'public' : 'private';
        window.eventDetail.showSuccess(`${eventType.charAt(0).toUpperCase() + eventType.slice(1)} event guest view opened in new tab!`);
    } else {
        console.error('❌ EventDetail instance or event not found');
        if (window.eventDetail) {
            window.eventDetail.showError('Event information not available');
        }
    }
}

// Edit functionality global functions
function toggleEditMode() {
    if (window.eventDetail) {
        window.eventDetail.toggleEditMode();
    }
}

function cancelEdit() {
    if (window.eventDetail) {
        window.eventDetail.toggleEditMode();
    }
}

async function handleEditFormSubmit(event) {
    event.preventDefault();
    
    if (!window.eventDetail) {
        console.error('EventDetail instance not found');
        return;
    }
    
    // Collect form data
    const formData = {
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        location: document.getElementById('editLocation').value,
        event_date: document.getElementById('editEventDate').value,
        package_id: document.getElementById('editPackage').value,
        event_type_id: document.getElementById('editEventType').value,
        allow_photos: document.getElementById('editAllowPhotos').checked,
        allow_videos: document.getElementById('editAllowVideos').checked,
        allow_wishes: document.getElementById('editAllowWishes').checked,
        auto_approve_posts: document.getElementById('editAutoApprove').checked,
        is_public: document.getElementById('editIsPublic').checked
    };
    
    // Handle privacy settings
    const contributorCode = document.getElementById('editContributorCode').value.trim();
    const accessControl = document.querySelector('input[name="editAccessControl"]:checked');
    
    // Set privacy settings based on radio button selection
    if (accessControl) {
        formData.is_public = accessControl.value === 'public';
    }
    
    // Add contributor code if provided
    if (contributorCode) {
        // Validate contributor code
        if (contributorCode.length > 10) {
            window.eventDetail.showError('Contributor code must be 10 characters or less');
            return;
        }
        
        // Check for valid characters (alphanumeric only)
        if (!/^[a-zA-Z0-9]+$/.test(contributorCode)) {
            window.eventDetail.showError('Contributor code can only contain letters and numbers');
            return;
        }
        
        formData.contributor_code = contributorCode;
    }
    
    // Handle file uploads
    const thumbnailFile = document.getElementById('editThumbnail').files[0];
    const bannerFile = document.getElementById('editBanner').files[0];
    const videoFile = document.getElementById('editVideo').files[0];
    
    // Validate file uploads
    if (thumbnailFile) {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedImageTypes.includes(thumbnailFile.type)) {
            window.eventDetail.showError('Thumbnail must be a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }
        
        const maxImageSize = 10 * 1024 * 1024; // 10MB
        if (thumbnailFile.size > maxImageSize) {
            window.eventDetail.showError('Thumbnail file size must be less than 10MB');
            return;
        }
    }
    
    if (bannerFile) {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedImageTypes.includes(bannerFile.type)) {
            window.eventDetail.showError('Banner must be a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }
        
        const maxImageSize = 10 * 1024 * 1024; // 10MB
        if (bannerFile.size > maxImageSize) {
            window.eventDetail.showError('Banner file size must be less than 10MB');
            return;
        }
    }
    
    if (videoFile) {
        const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
        if (!allowedVideoTypes.includes(videoFile.type)) {
            window.eventDetail.showError('Video must be a valid video file (MP4, MOV, AVI, or WebM)');
            return;
        }
        
        const maxVideoSize = 100 * 1024 * 1024; // 100MB
        if (videoFile.size > maxVideoSize) {
            window.eventDetail.showError('Video file size must be less than 100MB');
            return;
        }
    }
    
    // Validate required fields
    if (!formData.title.trim()) {
        window.eventDetail.showError('Event title is required');
        return;
    }
    
    if (!formData.description.trim()) {
        window.eventDetail.showError('Event description is required');
        return;
    }
    
    if (!formData.event_date) {
        window.eventDetail.showError('Event date is required');
        return;
    }
    
    if (!formData.package_id) {
        window.eventDetail.showError('Package is required');
        return;
    }
    
    if (!formData.event_type_id) {
        window.eventDetail.showError('Event type is required');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const success = await window.eventDetail.updateEvent(formData, thumbnailFile, bannerFile, videoFile);
        if (success) {
            // Switch back to view mode
            window.eventDetail.toggleEditMode();
        }
    } catch (error) {
        console.error('Error updating event:', error);
        window.eventDetail.showError('Failed to update event');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.eventDetail = new EventDetail();
    
    // Add form event listener for edit form
    const editForm = document.getElementById('editEventForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditFormSubmit);
    }
}); 