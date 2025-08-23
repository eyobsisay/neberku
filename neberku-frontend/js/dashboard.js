// Dashboard functionality for event owners
class Dashboard {
    constructor() {
        this.events = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
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
    }

    async loadDashboardData() {
        try {
            await this.loadEvents();
            this.updateStatistics();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('Error loading dashboard data', 'danger');
        }
    }

    async loadEvents() {
        try {
            console.log('🔍 Attempting to fetch events from:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`);
            
            // Get CSRF token if available
            let csrfToken = null;
            try {
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'csrftoken') {
                        csrfToken = value;
                        break;
                    }
                }
            } catch (e) {
                console.log('⚠️ Could not get CSRF token');
            }
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add CSRF token if available
            if (csrfToken) {
                headers['X-CSRFToken'] = csrfToken;
                console.log('🔑 CSRF token added to headers');
            }
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'GET',
                headers: headers,
                credentials: 'include'  // Include cookies for session authentication
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);

            if (response.ok) {
                const eventsData = await response.json();
                console.log('✅ Events fetched successfully:', eventsData);
                
                // Handle paginated response from Django REST Framework
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
                
                this.renderEvents();
            } else if (response.status === 401) {
                // Unauthorized - redirect to login
                console.log('🔒 Unauthorized - redirecting to login');
                this.showAlert('Unauthorized access. Redirecting to login...', 'warning');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000); // 3 second delay
                return;
            } else if (response.status === 403) {
                // Forbidden - likely session expired or not authenticated
                console.log('🚫 Forbidden - session may have expired');
                const errorText = await response.text();
                console.error('❌ 403 Error Response:', errorText);
                
                // Clear stored user data and redirect to login
                localStorage.removeItem('neberku_user');
                this.showAlert(`Session expired: ${errorText}. Redirecting to login...`, 'warning');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 5000); // 5 second delay to read the error
                return;
            } else if (response.status === 404) {
                console.log('📭 No events found (404)');
                this.events = [];
                this.renderEvents();
                this.showAlert('No events found. Create your first event to get started!', 'info');
            } else {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
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

        if (this.events.length === 0) {
            eventsList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-calendar-x display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">No events yet</h4>
                    <p class="text-muted mb-3">Create your first event to get started!</p>
                    <div class="alert alert-info">
                        <strong>💡 Tip:</strong> If you're not seeing any events, make sure:
                        <ul class="text-start mt-2 mb-0">
                            <li>The Django backend is running on port 8000</li>
                            <li>You're logged in with a valid account</li>
                            <li>There are events in the database</li>
                        </ul>
                    </div>
                    <p class="text-muted mt-3">
                        <small>Check the browser console for connection details</small>
                    </p>
                </div>
            `;
            return;
        }

        eventsList.innerHTML = this.events.map(event => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-primary">${event.title}</h5>
                                                 <p class="card-text text-muted">
                             <i class="bi bi-calendar3"></i> ${this.formatDate(event.event_date)}
                         </p>
                        <p class="card-text text-muted">
                            <i class="bi bi-geo-alt"></i> ${event.location}
                        </p>
                        <p class="card-text">${event.description}</p>
                        
                        <div class="row text-center mb-3">
                            <div class="col-4">
                                <div class="text-primary">
                                    <i class="bi bi-image"></i>
                                    <div class="small">${event.photo_count || 0}</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="text-info">
                                    <i class="bi bi-camera-video"></i>
                                    <div class="small">${event.video_count || 0}</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="text-success">
                                    <i class="bi bi-people"></i>
                                    <div class="small">${event.total_guest_posts || 0}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="dashboard.viewEvent('${event.id}')">
                                <i class="bi bi-eye"></i> View Details
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="dashboard.viewEventPosts('${event.id}')">
                                <i class="bi bi-chat-dots"></i> View Posts
                            </button>
                            <button class="btn btn-outline-success btn-sm" onclick="dashboard.shareEvent('${event.id}')">
                                <i class="bi bi-share"></i> Share Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async createEvent() {
        const formData = {
            title: document.getElementById('eventTitle').value,
            event_date: document.getElementById('eventDate').value,
            location: document.getElementById('eventLocation').value,
            description: document.getElementById('eventDescription').value,
            package_id: parseInt(document.getElementById('eventPackage').value),
            event_type_id: parseInt(document.getElementById('eventType').value),
            allow_photos: document.getElementById('allowPhotos').value === 'true',
            allow_videos: document.getElementById('allowVideos').value === 'true',
            allow_wishes: document.getElementById('allowWishes').value === 'true',
            auto_approve_posts: document.getElementById('autoApprovePosts').value === 'true'
        };

        try {
            console.log('🔍 Creating event with data:', formData);
            
            // Get CSRF token if available
            let csrfToken = null;
            try {
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'csrftoken') {
                        csrfToken = value;
                        break;
                    }
                }
            } catch (e) {
                console.log('⚠️ Could not get CSRF token');
            }
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add CSRF token if available
            if (csrfToken) {
                headers['X-CSRFToken'] = csrfToken;
                console.log('🔑 CSRF token added to headers');
            }
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'POST',
                headers: headers,
                credentials: 'include',  // Include cookies for session authentication
                body: JSON.stringify(formData)
            });

            console.log('📡 Create event response status:', response.status);

            if (response.ok) {
                const newEvent = await response.json();
                console.log('✅ Event created successfully:', newEvent);
                this.events.push(newEvent);
                this.renderEvents();
                this.updateStatistics();
                this.resetForm();
                this.showAlert('Event created successfully!', 'success');
            } else {
                const errorText = await response.text();
                console.error('❌ Create event error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error creating event:', error);
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
        document.getElementById('createEventForm').reset();
    }

    updateStatistics() {
        const totalEvents = this.events.length;
        const totalPhotos = this.events.reduce((sum, event) => sum + (event.photo_count || 0), 0);
        const totalVideos = this.events.reduce((sum, event) => sum + (event.video_count || 0), 0);
        const totalGuests = this.events.reduce((sum, event) => sum + (event.total_guest_posts || 0), 0);

        document.getElementById('totalEvents').textContent = totalEvents;
        document.getElementById('totalPhotos').textContent = totalPhotos;
        document.getElementById('totalVideos').textContent = totalVideos;
        document.getElementById('totalGuests').textContent = totalGuests;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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


}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
}); 