/**
 * Guest Contribution JavaScript
 * Handles guest access to events and contribution submission
 */

class GuestContributionManager {
    constructor() {
        this.currentEvent = null;
        this.wasDirectAccess = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPublicEvents();
        
        // Check if user accessed via share link or QR code
        this.checkDirectAccess();
    }

    checkDirectAccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        
        console.log('🔍 Checking for direct access...');
        console.log('🔍 URL parameters:', Object.fromEntries(urlParams.entries()));
        
        if (eventId) {
            console.log('🔗 Direct access detected for event:', eventId);
            this.handleDirectAccess(eventId);
        } else {
            console.log('🔍 No direct access detected - showing normal access form');
        }
    }

    async handleDirectAccess(eventId) {
        try {
            this.showLoading(true);
            this.showAlert('Loading event details...', 'info');
            
            // Try to get event details using the event ID
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/guest/event-by-id/${eventId}/`);
            
            if (response.ok) {
                const eventData = await response.json();
                this.currentEvent = eventData;
                this.showEventDetails(eventData);
            } else {
                const errorData = await response.json();
                
                if (response.status === 403 && errorData.error?.includes('private event')) {
                    // Private event - show access form with explanation
                    this.showAlert('This is a private event. Please enter the contributor code to access.', 'info');
                    this.showAccessForm();
                    
                    // Update the access form message
                    this.updateAccessFormMessage('This is a private event. Please enter the contributor code provided by the event host.');
                } else {
                    // Other errors - show access form with generic message
                    this.showAlert('Please enter the contributor code to access this event.', 'warning');
                    this.showAccessForm();
                }
            }
        } catch (error) {
            console.error('Error with direct access:', error);
            this.showAlert('Unable to load event directly. Please enter the contributor code.', 'warning');
            this.showAccessForm();
        } finally {
            this.showLoading(false);
        }
    }

    updateAccessFormMessage(message) {
        const accessForm = document.getElementById('accessEventForm');
        if (accessForm) {
            // Add or update the message below the form
            let messageDiv = accessForm.querySelector('.access-message');
            if (!messageDiv) {
                messageDiv = document.createElement('div');
                messageDiv.className = 'alert alert-info mt-3 access-message';
                accessForm.appendChild(messageDiv);
            }
            messageDiv.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
        }
    }

    hideAccessForm() {
        const accessSection = document.querySelector('.row.mb-5');
        if (accessSection) {
            accessSection.style.display = 'none';
        }
        
        // Add a back button to return to the access form
        this.addBackToAccessButton();
    }

    showAccessForm() {
        const accessSection = document.querySelector('.row.mb-5');
        if (accessSection) {
            accessSection.style.display = 'block';
        }
        
        // Remove the back button if it exists
        this.removeBackToAccessButton();
        
        // Reset page to original state
        this.resetPage();
    }

    resetPage() {
        // Reset page header to original state
        const pageTitle = document.querySelector('.display-4');
        const pageSubtitle = document.querySelector('.lead');
        
        if (pageTitle) {
            pageTitle.innerHTML = `
                <i class="fas fa-gift text-primary me-3"></i>
                Guest Contribution
            `;
        }
        
        if (pageSubtitle) {
            pageSubtitle.innerHTML = `
                Share your memories, wishes, and media with event hosts
            `;
        }
        
        // Remove event thumbnail
        const existingThumbnail = document.querySelector('.event-thumbnail');
        if (existingThumbnail) {
            existingThumbnail.remove();
        }
        
        // Clear access form message
        const accessForm = document.getElementById('accessEventForm');
        if (accessForm) {
            const messageDiv = accessForm.querySelector('.access-message');
            if (messageDiv) {
                messageDiv.remove();
            }
        }
        
        // Reset current event and direct access flag
        this.currentEvent = null;
        this.wasDirectAccess = false;
    }

    addBackToAccessButton() {
        // Remove existing back button if any
        this.removeBackToAccessButton();
        
        // Add back button after the page header
        const pageHeader = document.querySelector('.row.mb-4');
        if (pageHeader) {
            const backButton = document.createElement('div');
            backButton.className = 'row mb-3';
            backButton.innerHTML = `
                <div class="col-12 text-center">
                    <button class="btn btn-outline-secondary" onclick="guestManager.showAccessForm()">
                        <i class="fas fa-arrow-left me-2"></i>Back to Access Form
                    </button>
                    <small class="text-muted d-block mt-2">
                        Or continue with the current event below
                    </small>
                </div>
            `;
            pageHeader.parentNode.insertBefore(backButton, pageHeader.nextSibling);
        }
    }

    removeBackToAccessButton() {
        const existingBackButton = document.querySelector('.row.mb-3 .btn-outline-secondary');
        if (existingBackButton) {
            const backButtonRow = existingBackButton.closest('.row.mb-3');
            if (backButtonRow) {
                backButtonRow.remove();
            }
        }
    }

    bindEvents() {
        // Event access form
        const accessForm = document.getElementById('accessEventForm');
        if (accessForm) {
            accessForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.accessEvent();
            });
        }

    }

    async accessEvent() {
        const contributorCode = document.getElementById('contributorCode').value.trim();

        if (!contributorCode) {
            this.showAlert('Please enter a contributor code', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            
            const url = `${API_CONFIG.BASE_URL}/api/guest/event/?code=${contributorCode}`;
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                this.currentEvent = data;
                this.showEventDetails(data);
            } else {
                this.showAlert(data.error || 'Failed to access event', 'danger');
            }
        } catch (error) {
            console.error('Error accessing event:', error);
            this.showAlert('Error accessing event. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async loadPublicEvents() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/guest/public-events/`);
            const data = await response.json();

            if (response.ok) {
                this.displayPublicEvents(data);
            } else {
                console.error('Failed to load public events:', data.error);
                this.showAlert('Failed to load public events', 'warning');
            }
        } catch (error) {
            console.error('Error loading public events:', error);
            this.showAlert('Error loading public events', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    displayPublicEvents(events) {
        const container = document.getElementById('publicEvents');
        if (!container) return;
        
        if (events.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No public events available at the moment.
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(event => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card event-card h-100" 
                     data-event-id="${event.id}"
                     data-event-data='${JSON.stringify(event).replace(/'/g, "&#39;")}'
                     onclick="guestManager.viewPublicEvent('${event.id}')">
                    <img src="${event.event_thumbnail || 'https://via.placeholder.com/300x200?text=Event'}" 
                         class="card-img-top" alt="${event.title}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h5 class="card-title">${event.title}</h5>
                        <p class="card-text text-muted">
                            ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>
                                ${new Date(event.event_date).toLocaleDateString()}
                            </small>
                            <span class="badge bg-primary">${event.event_type.name}</span>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <small class="text-muted">
                            <i class="fas fa-users me-1"></i> ${event.total_guest_posts} contributions
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async viewPublicEvent(eventId) {
        try {
            this.showLoading(true);
            
            // For public events, we don't need a contributor code
            // Redirect to the event detail page
            window.location.href = `event-detail-guest.html?event=${eventId}`;
            
        } catch (error) {
            console.error('Error loading event:', error);
            this.showAlert('Error loading event. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    showEventDetails(event) {
        this.currentEvent = event;
        
        // Get the contributor code that was used to access this event
        const contributorCode = document.getElementById('contributorCode').value.trim();
        
        // Always redirect to the event detail page with the contributor code
        const redirectUrl = `event-detail-guest.html?event=${event.id}&code=${contributorCode}`;
        
        console.log('🔗 Redirecting to event detail with code:', redirectUrl);
        window.location.href = redirectUrl;
    }



    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }



    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'block' : 'none';
        }
    }
    
}

// Initialize the guest contribution manager when the page loads
let guestManager;
document.addEventListener('DOMContentLoaded', function() {
    guestManager = new GuestContributionManager();
});


 