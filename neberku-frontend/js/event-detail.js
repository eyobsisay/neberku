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
        this.init();
    }

    init() {
        console.log('🚀 Initializing Event Detail Page');
        this.checkAuth();
        if (this.eventId) {
            this.loadEventDetail();
            this.loadEventGuestPosts();
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
    }

    async loadEventDetail() {
        try {
            console.log('📡 Loading event details for ID:', this.eventId);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_DETAIL.replace('{id}', this.eventId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                this.event = await response.json();
                console.log('✅ Event loaded successfully:', this.event);
                this.renderEventDetail();
            } else {
                const errorData = await response.json();
                console.error('❌ Error loading event:', errorData);
                this.showError(`Error loading event: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error loading event:', error);
            this.showError('Unable to load event details. Please check your connection and try again.');
        }
    }

    async loadEventGuestPosts() {
        try {
            console.log('📡 Loading guest posts for event:', this.eventId);
            
            // Use the by_event action with event_id parameter
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/guest-posts/by_event/?event_id=${this.eventId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const postsData = await response.json();
                console.log('✅ Guest posts loaded for event:', postsData);
                
                // Handle paginated response
                this.guestPosts = postsData.results || postsData;
                console.log(`📊 Found ${this.guestPosts.length} posts for this event`);
                
                this.applyFilters();
            } else {
                console.error('❌ Error loading guest posts:', response.status);
                this.renderGuestPosts([]);
            }
        } catch (error) {
            console.error('❌ Error loading guest posts:', error);
            this.renderGuestPosts([]);
        }
    }

    renderEventDetail() {
        if (!this.event) return;

        // Event header
        document.getElementById('eventTitle').textContent = this.event.title;
        document.getElementById('eventDescription').textContent = this.event.description || 'No description available';
        
        // Event status
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

        // Event date and location
        document.getElementById('eventDate').textContent = this.formatDate(this.event.event_date);
        document.getElementById('eventLocation').textContent = this.event.location;

        // Statistics
        document.getElementById('totalPhotos').textContent = this.event.photo_count || 0;
        document.getElementById('totalVideos').textContent = this.event.video_count || 0;
        document.getElementById('totalPosts').textContent = this.event.total_guest_posts || 0;
        document.getElementById('totalGuests').textContent = this.event.total_guest_posts || 0; // Using posts as guest count for now

        // Event details
        document.getElementById('eventType').textContent = this.event.event_type?.name || 'Unknown';
        document.getElementById('eventPackage').textContent = this.event.package?.name || 'Unknown';
        document.getElementById('createdAt').textContent = this.formatDate(this.event.created_at);

        // Event settings
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
                                    <div class="col-6">
                                        <small class="text-muted">
                                            <i class="bi bi-image"></i> ${post.photo_count || 0} photos
                                        </small>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">
                                            <i class="bi bi-camera-video"></i> ${post.video_count || 0} videos
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
    
        // Show first media file as preview
        const firstMedia = post.media_files[0];
        
        // Helper function to construct full URL using backend base URL
        const getFullUrl = (relativePath) => {
            if (!relativePath) return '';
            if (relativePath.startsWith('http')) return relativePath;
            return `${API_CONFIG.BASE_URL}${relativePath}`;
        };
    
        if (firstMedia.media_type === 'photo') {
            const photoUrl = getFullUrl(firstMedia.media_file);
            return `
                <img src="${photoUrl}" alt="${firstMedia.file_name || 'Photo'}" class="media-preview w-100" style="max-height: 200px; object-fit: cover;">
            `;
        } else if (firstMedia.media_type === 'video') {
            const videoUrl = getFullUrl(firstMedia.media_file);
            // For videos, show a thumbnail if available, otherwise show video controls
            if (firstMedia.media_thumbnail) {
                const thumbnailUrl = getFullUrl(firstMedia.media_thumbnail);
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
                        <source src="${videoUrl}" type="${firstMedia.mime_type || 'video/mp4'}">
                        Your browser does not support the video tag.
                    </video>
                `;
            }
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
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POST_DETAIL.replace('{id}', postId)}/approve/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                console.log('✅ Post approved successfully');
                this.showSuccess('Post approved successfully!');
                
                // Update the post in our local array
                const postIndex = this.guestPosts.findIndex(p => p.id === postId);
                if (postIndex !== -1) {
                    this.guestPosts[postIndex].is_approved = true;
                }
                
                this.applyFilters();
            } else {
                const errorData = await response.json();
                console.error('❌ Error approving post:', errorData);
                this.showError(`Error approving post: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error approving post:', error);
            this.showError('Unable to approve post. Please check your connection and try again.');
        }
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

    setupQRCodeAndShare() {
        // Set contributor code
        const contributorCodeDisplay = document.getElementById('contributorCodeDisplay');
        if (contributorCodeDisplay && this.event.contributor_code) {
            contributorCodeDisplay.value = this.event.contributor_code;
        }

        // Set share link - use backend share_link if available, otherwise generate one
        const shareLinkInput = document.getElementById('shareLinkInput');
        if (shareLinkInput) {
            let shareUrl;
            if (this.event.share_link) {
                // Use backend-generated share link
                shareUrl = this.event.share_link;
            } else {
                // Fallback to frontend-generated link
                shareUrl = `${window.location.origin}/guest-contribution.html?event=${this.event.id}`;
            }
            shareLinkInput.value = shareUrl;
        }

        // Generate QR code
        this.generateQRCode();
    }

    async generateQRCode() {
        try {
            const qrContainer = document.getElementById('qrCodeContainer');
            if (!qrContainer) return;

            let qrCodeUrl;
            
            // Check if backend has generated a QR code
            if (this.event.qr_code) {
                // Use backend-generated QR code
                qrCodeUrl = this.event.qr_code;
                console.log('✅ Using backend-generated QR code');
            } else {
                // Fallback to generating QR code using external service
                const shareUrl = document.getElementById('shareLinkInput')?.value || 
                               `${window.location.origin}/guest-contribution.html?event=${this.event.id}`;
                
                // Use QRServer API as fallback
                qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
                console.log('✅ Generated QR code using external service');
            }
            
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
}

// Global functions
function goBack() {
    window.history.back();
}

function shareEvent() {
    if (window.eventDetail && window.eventDetail.event) {
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
        
        // Test API call manually with the correct guest posts endpoint and event filtering
        fetch(`${API_CONFIG.BASE_URL}/api/guest-posts/?event=${window.eventDetail.eventId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.eventDetail = new EventDetail();
}); 