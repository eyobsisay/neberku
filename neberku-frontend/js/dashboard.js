// Dashboard functionality for event owners
class Dashboard {
    constructor() {
        this.events = [];
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
    }

    async loadDashboardData() {
        try {
            await this.loadEvents();
            this.updateStatistics();
            this.updateDashboardHeader(); // Show recent activity ordering
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('Error loading dashboard data', 'danger');
        }
    }

    async loadEvents() {
        try {
            // Get CSRF token if available
            let csrfToken = null;
            try {
                const csrfResponse = await fetch(`${API_CONFIG.BASE_URL}/api/`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (csrfResponse.ok) {
                    // Extract CSRF token from cookies
                    const cookies = document.cookie.split(';');
                    for (let cookie of cookies) {
                        const [name, value] = cookie.trim().split('=');
                        if (name === 'csrftoken') {
                            csrfToken = value;
                            break;
                        }
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
            
            console.log('🌐 Making request to:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`);
            console.log('🔑 Headers:', headers);
            console.log('🍪 Credentials mode: include');
            console.log('🍪 Current cookies:', document.cookie);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'GET',
                headers: headers,
                credentials: 'include',  // Include cookies for session authentication
                mode: 'cors'  // Explicitly set CORS mode
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);

            if (response.ok) {
                const eventsData = await response.json();
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
                
                // Sort events by creation date (newest first) for proper recent activity ordering
                this.events.sort((a, b) => {
                    const dateA = new Date(a.created_at || a.event_date);
                    const dateB = new Date(b.created_at || b.event_date);
                    return dateB - dateA; // Newest first
                });
                
                console.log('📅 Events sorted by creation date for recent activity:', this.events.map(e => ({
                    title: e.title,
                    created_at: e.created_at,
                    event_date: e.event_date
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

        // Ensure events are properly sorted before rendering
        this.ensureProperOrdering();

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

        eventsList.innerHTML = this.events.map(event => {
            const status = this.getEventStatus(event);
            const statusClass = this.getStatusClass(status);
            const statusIcon = this.getStatusIcon(status);
            
            return `
                <div class="col-md-6 col-lg-4 mb-4 event-card" data-event-id="${event.id}">
                    <div class="card h-100 shadow-sm">
                        <div class="card-header bg-transparent border-0 pb-0">
                            <div class="d-flex justify-content-between align-items-start">
                                <span class="badge ${statusClass} rounded-pill">
                                    <i class="bi ${statusIcon}"></i> ${status}
                                </span>
                                <small class="text-muted">${this.formatDate(event.event_date)}</small>
                            </div>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title text-primary">${event.title}</h5>
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
            `;
        }).join('');
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
        formData.append('max_posts_per_guest', document.getElementById('maxPostsPerGuest')?.value || '5');
        formData.append('max_media_per_post', document.getElementById('maxMediaPerPost')?.value || '3');
        
        // Add files if selected
        const thumbnailFile = document.getElementById('eventThumbnail').files[0];
        const videoFile = document.getElementById('eventVideo').files[0];
        
        if (thumbnailFile) {
            formData.append('event_thumbnail', thumbnailFile);
            console.log('📸 Adding thumbnail:', thumbnailFile.name);
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

        if (!formData.get('package_id') || !formData.get('event_type_id')) {
            this.showAlert('Please select both package and event type', 'warning');
            return;
        }
        
        // Validate event settings if they exist
        const maxPostsPerGuest = parseInt(formData.get('max_posts_per_guest'));
        const maxMediaPerPost = parseInt(formData.get('max_media_per_post'));
        
        if (maxPostsPerGuest && (maxPostsPerGuest < 1 || maxPostsPerGuest > 100)) {
            this.showAlert('Max Posts per Guest must be between 1 and 100', 'warning');
            return;
        }
        
        if (maxMediaPerPost && (maxMediaPerPost < 1 || maxMediaPerPost > 50)) {
            this.showAlert('Max Media per Post must be between 1 and 50', 'warning');
            return;
        }

        try {
            // Get CSRF token if available
            let csrfToken = null;
            try {
                const csrfResponse = await fetch(`${API_CONFIG.BASE_URL}/api/`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (csrfResponse.ok) {
                    // Extract CSRF token from cookies
                    const cookies = document.cookie.split(';');
                    for (let cookie of cookies) {
                        const [name, value] = cookie.trim().split('=');
                        if (name === 'csrftoken') {
                            csrfToken = value;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️ Could not get CSRF token');
            }
            
            const headers = {};
            
            // Add CSRF token if available
            if (csrfToken) {
                headers['X-CSRFToken'] = csrfToken;
                console.log('🔑 CSRF token added to headers');
            }
            
            // Note: Don't set Content-Type header when using FormData
            // The browser will set it automatically with the boundary
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'POST',
                headers: headers,
                credentials: 'include',  // Include cookies for session authentication
                body: formData
            });

            console.log('📡 Create event response status:', response.status);

            if (response.ok) {
                const newEvent = await response.json();
                console.log('✅ Event created successfully:', newEvent);
                this.events.push(newEvent);
                
                // Re-sort events to maintain recent activity order
                this.events.sort((a, b) => {
                    const dateA = new Date(a.created_at || a.event_date);
                    const dateB = new Date(b.created_at || b.event_date);
                    return dateB - dateA; // Newest first
                });
                
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
        if (document.getElementById('maxMediaPerPost')) document.getElementById('maxMediaPerPost').value = '3';
        
        // Clear file inputs
        document.getElementById('eventThumbnail').value = '';
        document.getElementById('eventVideo').value = '';
        
        // Hide the form and show the button
        this.hideCreateEventForm();
    }
    
    showCreateEventForm() {
        document.getElementById('createEventButton').style.display = 'none';
        document.getElementById('createEventForm').style.display = 'block';
        
        // Load packages and event types when form is shown
        this.loadPackagesAndEventTypes();
    }
    
    hideCreateEventForm() {
        document.getElementById('createEventForm').style.display = 'none';
        document.getElementById('createEventButton').style.display = 'block';
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

        // Update event status overview using API stats
        this.updateEventStatusOverview();
    }
    
    // Ensure events are always properly sorted by creation date for recent activity
    ensureProperOrdering() {
        if (this.events.length > 0) {
            this.events.sort((a, b) => {
                const dateA = new Date(a.created_at || a.event_date);
                const dateB = new Date(b.created_at || b.event_date);
                return dateB - dateA; // Newest first
            });
            console.log('🔄 Events re-sorted to maintain recent activity order');
        }
    }
    
    // Update dashboard header to show recent activity ordering
    updateDashboardHeader() {
        const headerElement = document.querySelector('.dashboard-header h1, .dashboard-header h2, .dashboard-header h3');
        if (headerElement) {
            const currentText = headerElement.textContent;
            if (!currentText.includes('Recent Activity')) {
                headerElement.innerHTML = `${currentText} <small class="text-muted">(Recent Activity First)</small>`;
            }
        }
    }
    
    // Refresh the event status timeline specifically
    refreshEventStatus() {
        console.log('🔄 Refreshing event status overview...');
        this.updateEventStatusOverview();
        this.updateEventStatusTimeline();
        this.showAlert('Event status refreshed!', 'success');
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
            
            document.getElementById('activeEvents').textContent = this.eventStats.active || 0;
            document.getElementById('pendingEvents').textContent = this.eventStats.pending || 0;
            document.getElementById('completedEvents').textContent = this.eventStats.completed || 0;
            document.getElementById('draftEvents').textContent = this.eventStats.draft || 0;
            document.getElementById('cancelledEvents').textContent = this.eventStats.cancelled || 0;
        } else {
            // Fallback to local calculation if no stats provided
            this.calculateLocalEventStats();
        }
        
        // Update timeline
        this.updateEventStatusTimeline();
    }
    
    calculateLocalEventStats() {
        let activeEvents = 0;
        let pendingEvents = 0;
        let completedEvents = 0;
        let draftEvents = 0;
        let cancelledEvents = 0;
        
        this.events.forEach(event => {
            const status = this.getEventStatus(event);
            const statusLower = status.toLowerCase();
            
            // Use partial matching for more flexible categorization
            if (statusLower.includes('active') || statusLower.includes('today') || statusLower.includes('ongoing')) {
                activeEvents++;
            } else if (statusLower.includes('pending') || statusLower.includes('payment') || 
                       statusLower.includes('tomorrow') || statusLower.includes('scheduled') ||
                       statusLower.includes('future') || statusLower.includes('planned')) {
                pendingEvents++;
            } else if (statusLower.includes('completed') || statusLower.includes('finished') || 
                       statusLower.includes('done')) {
                completedEvents++;
            } else if (statusLower.includes('draft') || statusLower.includes('created') || 
                       statusLower.includes('new')) {
                draftEvents++;
            } else if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
                cancelledEvents++;
            } else {
                // If status doesn't match any category, try to determine from date
                if (!event.event_date) {
                    draftEvents++;
                } else {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const eventDate = new Date(event.event_date);
                    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                    
                    if (eventDay < today) {
                        completedEvents++;
                    } else if (eventDay.getTime() === today.getTime()) {
                        activeEvents++;
                    } else if (eventDay.getTime() >= today.getTime() + (24 * 60 * 60 * 1000)) {
                        pendingEvents++;
                    } else {
                        // Events beyond tomorrow are now considered pending
                        pendingEvents++;
                    }
                }
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
    
    filterEvents(filterType) {
        const eventCards = document.querySelectorAll('.event-card');
        
        eventCards.forEach(card => {
            const eventId = card.dataset.eventId;
            const event = this.events.find(e => e.id == eventId);
            
            if (!event) return;
            
            const status = this.getEventStatus(event);
            let shouldShow = false;
            
            switch (filterType) {
                case 'all':
                    shouldShow = true;
                    break;
                case 'active':
                    shouldShow = status.toLowerCase().includes('active') || 
                                status.toLowerCase().includes('today') || 
                                status.toLowerCase().includes('ongoing');
                    break;
                case 'pending':
                    shouldShow = status.toLowerCase().includes('pending') || 
                                status.toLowerCase().includes('payment') ||
                                status.toLowerCase().includes('tomorrow') || 
                                status.toLowerCase().includes('scheduled') ||
                                status.toLowerCase().includes('future') ||
                                status.toLowerCase().includes('planned');
                    break;
                case 'completed':
                    shouldShow = status.toLowerCase().includes('completed') || 
                                status.toLowerCase().includes('finished') ||
                                status.toLowerCase().includes('done');
                    break;
                case 'cancelled':
                    shouldShow = status.toLowerCase().includes('cancelled') || 
                                status.toLowerCase().includes('canceled');
                    break;
                default:
                    shouldShow = true;
            }
            
            card.style.display = shouldShow ? 'block' : 'none';
        });
        
        // Update active filter button
        document.querySelectorAll('.btn-group .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Log filtering results for debugging
        const visibleCount = Array.from(eventCards).filter(card => card.style.display !== 'none').length;
        console.log(`🔍 Filter '${filterType}' applied: ${visibleCount} events visible out of ${eventCards.length} total`);
    }
    
    updateEventStatusTimeline() {
        const timelineContainer = document.getElementById('eventStatusTimeline');
        
        if (this.events.length === 0) {
            timelineContainer.innerHTML = '<p class="text-muted text-center py-3">No recent activity</p>';
            return;
        }
        
        // Sort events by creation date (most recent first) for proper recent activity ordering
        const sortedEvents = [...this.events].sort((a, b) => {
            const dateA = new Date(a.created_at || a.event_date);
            const dateB = new Date(b.created_at || b.event_date);
            return dateB - dateA; // Newest first
        });
        
        // Take only the last 5 events for timeline
        const recentEvents = sortedEvents.slice(0, 5);
        
        let timelineHTML = '';
        recentEvents.forEach(event => {
            const status = this.getEventStatus(event);
            const statusClass = this.getStatusClass(status);
            const statusIcon = this.getStatusIcon(status);
            
            // Show only the most relevant date information (shorter text)
            let dateInfo = '';
            if (event.created_at) {
                dateInfo = this.formatShortDate(event.created_at);
            } else if (event.event_date) {
                dateInfo = this.formatShortDate(event.event_date);
            } else {
                dateInfo = 'Draft';
            }
            
            timelineHTML += `
                <div class="timeline-item mb-3">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <span class="badge ${statusClass} rounded-pill">
                                <i class="bi ${statusIcon}"></i> ${status}
                            </span>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h6 class="mb-1">${this.truncateText(event.title)}</h6>
                            <p class="mb-0 text-muted small">
                                ${dateInfo}
                                ${event.location ? ` • ${event.location.split(',')[0]}` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        timelineContainer.innerHTML = timelineHTML;
        
        // Add a note about the ordering
        const noteElement = document.createElement('p');
        noteElement.className = 'text-muted small text-center mt-3 mb-0';
        noteElement.innerHTML = '<i class="bi bi-info-circle"></i> Events ordered by creation date (newest first)';
        timelineContainer.appendChild(noteElement);
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
    
    // Format date for timeline (shorter, cleaner text)
    formatShortDate(dateString) {
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
            return `${diffDays}d ago`;
        } else if (diffDays < 30) {
            return `${Math.floor(diffDays / 7)}w ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
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
            // Load packages
            const packagesResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PACKAGES}`, {
                credentials: 'include'
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
            }
            
            // Load event types
            const eventTypesResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_TYPES}`, {
                credentials: 'include'
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