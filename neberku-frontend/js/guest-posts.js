class GuestPostsManager {
    constructor() {
        this.posts = [];
        this.filteredPosts = [];
        this.currentPage = 1;
        this.postsPerPage = 12;
        this.filters = {
            status: '',
            event: '',
            search: ''
        };
        this.init();
    }

    init() {
        console.log('🚀 Initializing Guest Posts Manager');
        this.checkAuth();
        this.bindEvents();
        this.loadEvents();
        this.loadPosts();
        this.handleUrlParams();
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        
        if (eventId) {
            console.log('🔍 Event filter from URL:', eventId);
            this.filters.event = eventId;
            // Set the event filter dropdown
            setTimeout(() => {
                const eventFilter = document.getElementById('eventFilter');
                if (eventFilter) {
                    eventFilter.value = eventId;
                }
            }, 1000); // Wait for events to load
        }
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
        // Search input with debouncing
        let searchTimeout;
        document.getElementById('searchFilter').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300);
        });

        // Status filter change
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        // Event filter change
        document.getElementById('eventFilter').addEventListener('change', (e) => {
            this.filters.event = e.target.value;
            this.applyFilters();
        });
    }

    async loadEvents() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const eventsData = await response.json();
                const events = eventsData.results || eventsData;
                this.populateEventFilter(events);
            }
        } catch (error) {
            console.error('❌ Error loading events:', error);
        }
    }

    populateEventFilter(events) {
        const eventFilter = document.getElementById('eventFilter');
        eventFilter.innerHTML = '<option value="">All Events</option>';
        
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.title;
            eventFilter.appendChild(option);
        });
    }

    async loadPosts() {
        try {
            console.log('📡 Loading guest posts...');
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POSTS}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const postsData = await response.json();
                console.log('✅ Posts loaded successfully:', postsData);
                
                // Handle paginated response
                this.posts = postsData.results || postsData;
                this.applyFilters();
            } else {
                console.error('❌ Error loading posts:', response.status);
                this.showError('Error loading posts');
            }
        } catch (error) {
            console.error('❌ Error loading posts:', error);
            this.showError('Unable to load posts. Please check your connection and try again.');
        }
    }

    applyFilters() {
        console.log('🔍 Applying filters:', this.filters);
        
        this.filteredPosts = this.posts.filter(post => {
            // Status filter
            if (this.filters.status && this.filters.status === 'approved' && !post.is_approved) return false;
            if (this.filters.status && this.filters.status === 'pending' && post.is_approved) return false;
            
            // Event filter - try multiple ways to match event ID
            if (this.filters.event) {
                const postEventId = post.event?.id || post.event_id || post.event;
                const filterEventId = this.filters.event;
                
                // Try exact match first, then string comparison
                if (postEventId !== filterEventId && 
                    postEventId !== filterEventId.toString() &&
                    postEventId !== filterEventId.toString().replace(/['"]/g, '')) {
                    return false;
                }
            }
            
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

        this.currentPage = 1;
        this.renderPosts();
        this.updateStatistics();
        this.renderPagination();
    }

    renderPosts() {
        const postsList = document.getElementById('postsList');
        
        if (this.filteredPosts.length === 0) {
            postsList.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="bi bi-search display-1"></i>
                    <h4 class="mt-3">No posts found</h4>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.postsPerPage;
        const endIndex = startIndex + this.postsPerPage;
        const currentPosts = this.filteredPosts.slice(startIndex, endIndex);

        postsList.innerHTML = currentPosts.map(post => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 post-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${post.guest?.name || 'Anonymous'}</h6>
                            <span class="badge ${post.is_approved ? 'bg-success' : 'bg-warning'} status-badge">
                                ${post.is_approved ? 'Approved' : 'Pending'}
                            </span>
                        </div>
                        
                        <p class="card-text text-muted small mb-2">
                            <i class="bi bi-calendar3"></i> ${this.formatDate(post.created_at)}
                        </p>
                        
                        <p class="card-text">${this.truncateText(post.wish_text, 120)}</p>
                        
                        <div class="row text-center mb-3">
                            <div class="col-6">
                                <small class="text-muted">
                                    <i class="bi bi-image"></i> ${post.photo_count || 0}
                                </small>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">
                                    <i class="bi bi-camera-video"></i> ${post.video_count || 0}
                                </small>
                            </div>
                        </div>
                        
                        <div class="d-grid gap-2">
                            <a href="post-detail.html?id=${post.id}" class="btn btn-outline-primary btn-sm">
                                <i class="bi bi-eye"></i> View Details
                            </a>
                            ${!post.is_approved ? `
                                <button class="btn btn-outline-success btn-sm" onclick="guestPostsManager.approvePost('${post.id}')">
                                    <i class="bi bi-check-circle"></i> Approve
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
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
                <a class="page-link" href="#" onclick="guestPostsManager.goToPage(${this.currentPage - 1})">Previous</a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="guestPostsManager.goToPage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="guestPostsManager.goToPage(${this.currentPage + 1})">Next</a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredPosts.length / this.postsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderPosts();
        this.renderPagination();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateStatistics() {
        const totalPosts = this.filteredPosts.length;
        const approvedPosts = this.filteredPosts.filter(post => post.is_approved).length;
        const pendingPosts = totalPosts - approvedPosts;
        const totalMedia = this.filteredPosts.reduce((sum, post) => sum + (post.total_media_files || 0), 0);

        document.getElementById('totalPosts').textContent = totalPosts;
        document.getElementById('approvedPosts').textContent = approvedPosts;
        document.getElementById('pendingPosts').textContent = pendingPosts;
        document.getElementById('totalMedia').textContent = totalMedia;
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
                const postIndex = this.posts.findIndex(p => p.id === postId);
                if (postIndex !== -1) {
                    this.posts[postIndex].is_approved = true;
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
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
}

// Global functions
function applyFilters() {
    if (window.guestPostsManager) {
        window.guestPostsManager.applyFilters();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.guestPostsManager = new GuestPostsManager();
}); 