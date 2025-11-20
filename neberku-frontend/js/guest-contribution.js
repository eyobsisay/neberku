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
        this.bindAuthControls();
        this.bindContributorLogin();
        this.updateAuthNav();
        this.loadPublicEvents();
        
        // Check if user accessed via share link or QR code
        this.checkDirectAccess();
    }

    checkDirectAccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        const contributorCode = urlParams.get('code');
        
        console.log('🔍 Checking for direct access...');
        console.log('🔍 URL parameters:', Object.fromEntries(urlParams.entries()));
        
        if (eventId && contributorCode) {
            // QR code or share link with code - automatically access with the code
            console.log('🔗 QR code/share link detected with contributor code');
            this.handleDirectAccessWithCode(eventId, contributorCode);
        } else if (eventId) {
            // Direct access without code - try to access directly
            console.log('🔗 Direct access detected for event:', eventId);
            this.handleDirectAccess(eventId);
        } else {
            console.log('🔍 No direct access detected - showing normal access form');
        }
    }

    async handleDirectAccessWithCode(eventId, contributorCode) {
        try {
            this.showLoading(true);
            this.showAlert('Loading event details...', 'info');
            
            // Pre-fill the contributor code in the form
            const codeInput = document.getElementById('contributorCode');
            if (codeInput) {
                codeInput.value = contributorCode;
            }
            
            // Use the contributor code to access the event
            const url = `${API_CONFIG.BASE_URL}/api/guest/event/?code=${contributorCode}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                // Verify the event ID matches
                if (data.id === eventId) {
                    this.currentEvent = data;
                    this.showEventDetails(data);
                } else {
                    this.showAlert('Event mismatch. Please try again.', 'warning');
                    this.showAccessForm();
                }
            } else {
                this.showAlert(data.error || 'Failed to access event', 'danger');
                this.showAccessForm();
            }
        } catch (error) {
            console.error('Error with direct access using code:', error);
            this.showAlert('Unable to load event. Please try again.', 'danger');
            this.showAccessForm();
        } finally {
            this.showLoading(false);
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

    bindAuthControls() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.logoutGuestUser();
            });
        }
    }

    bindContributorLogin() {
        const loginBtn = document.getElementById('loginBtn');
        const contributorLoginModal = document.getElementById('contributorLoginModal');
        const contributorModalClose = document.getElementById('contributorModalClose');
        const contributorModalCancel = document.getElementById('contributorModalCancel');
        const contributorLoginForm = document.getElementById('contributorLoginForm');
        const contributorOtpForm = document.getElementById('contributorOtpForm');
        const contributorNameInput = document.getElementById('contributorNameInput');
        const contributorPhoneInput = document.getElementById('contributorPhoneInput');
        const contributorOtpInput = document.getElementById('contributorOtpInput');
        const contributorInfoError = document.getElementById('contributorInfoError');
        const contributorOtpError = document.getElementById('contributorOtpError');
        const contributorOtpSuccess = document.getElementById('contributorOtpSuccess');
        const contributorInfoSubmitBtn = document.getElementById('contributorInfoSubmitBtn');
        const contributorOtpVerifyBtn = document.getElementById('contributorOtpVerifyBtn');
        const contributorResendOtpBtn = document.getElementById('contributorResendOtpBtn');
        const contributorOtpBackBtn = document.getElementById('contributorOtpBackBtn');
        const contributorLoginStep1 = document.getElementById('contributorLoginStep1');
        const contributorLoginStep2 = document.getElementById('contributorLoginStep2');
        
        if (!contributorLoginModal || !contributorLoginForm || !contributorOtpForm) {
            return;
        }
        
        let isModalOpen = false;
        let currentContributorName = '';
        let currentContributorPhone = '';
        
        // Helper functions
        const showError = (element, message) => {
            if (element) {
                element.textContent = message;
                element.style.display = 'block';
            }
        };
        
        const hideError = (element) => {
            if (element) {
                element.style.display = 'none';
            }
        };
        
        const showModal = () => {
            contributorLoginModal.classList.add('show');
            contributorLoginModal.setAttribute('aria-hidden', 'false');
            isModalOpen = true;
            document.body.style.overflow = 'hidden';
        };
        
        const closeModal = () => {
            contributorLoginModal.classList.remove('show');
            contributorLoginModal.setAttribute('aria-hidden', 'true');
            isModalOpen = false;
            document.body.style.overflow = '';
            // Reset to step 1
            contributorLoginStep1.style.display = 'block';
            contributorLoginStep2.style.display = 'none';
            contributorLoginForm.reset();
            contributorOtpForm.reset();
            hideError(contributorInfoError);
            hideError(contributorOtpError);
            contributorOtpSuccess.style.display = 'none';
            currentContributorName = '';
            currentContributorPhone = '';
        };
        
        const showStep2 = () => {
            contributorLoginStep1.style.display = 'none';
            contributorLoginStep2.style.display = 'block';
            contributorOtpSuccess.style.display = 'block';
            hideError(contributorOtpError);
        };
        
        const resetToStep1 = () => {
            contributorLoginStep1.style.display = 'block';
            contributorLoginStep2.style.display = 'none';
            contributorOtpForm.reset();
            hideError(contributorOtpError);
            contributorOtpSuccess.style.display = 'none';
        };
        
        // Open modal when login button is clicked
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showModal();
            });
        }
        
        // Close modal handlers
        if (contributorModalClose) {
            contributorModalClose.addEventListener('click', closeModal);
        }
        
        if (contributorModalCancel) {
            contributorModalCancel.addEventListener('click', closeModal);
        }
        
        // Close modal when clicking outside
        contributorLoginModal.addEventListener('click', (e) => {
            if (e.target === contributorLoginModal && isModalOpen) {
                closeModal();
            }
        });
        
        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                closeModal();
            }
        });
        
        // Send OTP
        if (contributorLoginForm) {
            contributorLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = contributorNameInput.value.trim();
                const phone = contributorPhoneInput.value.trim();
                
                // Validate phone format
                if (!phone.match(/^09\d{8}$/)) {
                    showError(contributorInfoError, 'Phone number must be in format: 09xxxxxxxx (10 digits starting with 09)');
                    return;
                }
                
                try {
                    contributorInfoSubmitBtn.disabled = true;
                    contributorInfoSubmitBtn.querySelector('.btn-text').style.display = 'none';
                    contributorInfoSubmitBtn.querySelector('.btn-loading').style.display = 'inline-flex';
                    hideError(contributorInfoError);
                    
                    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/phone/send-otp/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone_number: phone,
                            name: name
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        currentContributorName = name;
                        currentContributorPhone = phone;
                        showStep2();
                        
                        // In development, show OTP in console
                        if (data.otp_code) {
                            console.log(`OTP for ${phone}: ${data.otp_code}`);
                        }
                    } else {
                        showError(contributorInfoError, data.error || 'Failed to send OTP. Please try again.');
                    }
                } catch (error) {
                    console.error('Error sending OTP:', error);
                    showError(contributorInfoError, 'Network error. Please check your connection and try again.');
                } finally {
                    contributorInfoSubmitBtn.disabled = false;
                    contributorInfoSubmitBtn.querySelector('.btn-text').style.display = 'inline';
                    contributorInfoSubmitBtn.querySelector('.btn-loading').style.display = 'none';
                }
            });
        }
        
        // Verify OTP
        if (contributorOtpForm) {
            contributorOtpForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const otpCode = contributorOtpInput.value.trim();
                
                if (otpCode.length !== 6) {
                    showError(contributorOtpError, 'Please enter a 6-digit OTP code.');
                    return;
                }
                
                try {
                    contributorOtpVerifyBtn.disabled = true;
                    contributorOtpVerifyBtn.querySelector('.btn-text').style.display = 'none';
                    contributorOtpVerifyBtn.querySelector('.btn-loading').style.display = 'inline-flex';
                    hideError(contributorOtpError);
                    
                    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/phone/verify-otp/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone_number: currentContributorPhone,
                            otp_code: otpCode,
                            name: currentContributorName
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        // Check if there's an existing event owner session - clear it
                        const existingUserStr = localStorage.getItem('neberku_user');
                        if (existingUserStr) {
                            try {
                                const existingUser = JSON.parse(existingUserStr);
                                if (existingUser.role === 'event_owner') {
                                    console.log('🔄 Clearing existing event owner session before contributor OTP login');
                                    localStorage.removeItem('neberku_user');
                                    localStorage.removeItem('neberku_access_token');
                                    localStorage.removeItem('neberku_refresh_token');
                                }
                            } catch (e) {
                                console.error('Error parsing existing user:', e);
                            }
                        }
                        
                        // Store JWT tokens for contributor
                        if (data.access && data.refresh) {
                            localStorage.setItem('neberku_access_token', data.access);
                            localStorage.setItem('neberku_refresh_token', data.refresh);
                            if (data.user) {
                                localStorage.setItem('neberku_user', JSON.stringify(data.user));
                            }
                        }
                        
                        this.showAlert('Login successful! You are now authenticated.', 'success');
                        this.updateAuthNav();
                        closeModal();
                    } else {
                        showError(contributorOtpError, data.error || 'Invalid OTP code. Please try again.');
                    }
                } catch (error) {
                    console.error('Error verifying OTP:', error);
                    showError(contributorOtpError, 'Network error. Please check your connection and try again.');
                } finally {
                    contributorOtpVerifyBtn.disabled = false;
                    contributorOtpVerifyBtn.querySelector('.btn-text').style.display = 'inline';
                    contributorOtpVerifyBtn.querySelector('.btn-loading').style.display = 'none';
                }
            });
        }
        
        // Resend OTP
        if (contributorResendOtpBtn) {
            contributorResendOtpBtn.addEventListener('click', async () => {
                if (!currentContributorPhone || !currentContributorName) {
                    showError(contributorOtpError, 'Please enter your name and phone number first.');
                    return;
                }
                
                try {
                    contributorResendOtpBtn.disabled = true;
                    
                    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/phone/send-otp/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone_number: currentContributorPhone,
                            name: currentContributorName
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        contributorOtpSuccess.style.display = 'block';
                        hideError(contributorOtpError);
                    } else {
                        showError(contributorOtpError, data.error || 'Failed to resend OTP. Please try again.');
                    }
                } catch (error) {
                    console.error('Error resending OTP:', error);
                    showError(contributorOtpError, 'Network error. Please check your connection and try again.');
                } finally {
                    contributorResendOtpBtn.disabled = false;
                }
            });
        }
        
        // Back to step 1
        if (contributorOtpBackBtn) {
            contributorOtpBackBtn.addEventListener('click', resetToStep1);
        }
    }

    updateAuthNav() {
        const loginNavItem = document.getElementById('loginNavItem');
        const myPostsNavItem = document.getElementById('myPostsNavItem');
        const logoutNavItem = document.getElementById('logoutNavItem');
        const token = localStorage.getItem('neberku_access_token');
        const user = localStorage.getItem('neberku_user');
        const isAuthenticated = Boolean(token && user);

        const toggleItem = (item, show) => {
            if (!item) return;
            if (show) {
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
            }
        };

        // Show login button when not authenticated, hide when authenticated
        toggleItem(loginNavItem, !isAuthenticated);
        toggleItem(myPostsNavItem, isAuthenticated);
        toggleItem(logoutNavItem, isAuthenticated);
    }

    logoutGuestUser() {
        localStorage.removeItem('neberku_access_token');
        localStorage.removeItem('neberku_refresh_token');
        localStorage.removeItem('neberku_user');
        this.updateAuthNav();
        this.showAlert('You have been signed out.', 'info');
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
                        ${event.public_gallery ? `
                            <div class="mt-3 text-end">
                                <button class="btn btn-outline-primary btn-sm" onclick="event.stopPropagation(); guestManager.viewGuestPosts('${event.id}')">
                                    <i class="fas fa-images me-1"></i> Guest Posts
                                </button>
                            </div>
                        ` : ''}
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

    viewGuestPosts(eventId) {
        window.location.href = `guest-my-posts.html?event=${eventId}&public=1`;
    }

    showEventDetails(event) {
        this.currentEvent = event;
        
        // Get the contributor code from URL parameters first, then from form input
        const urlParams = new URLSearchParams(window.location.search);
        let contributorCode = urlParams.get('code');
        
        if (!contributorCode) {
            // Fall back to form input if not in URL
            const codeInput = document.getElementById('contributorCode');
            if (codeInput) {
                contributorCode = codeInput.value.trim();
            }
        }
        
        // Always redirect to the event detail page with the contributor code
        const redirectUrl = `event-detail-guest.html?event=${event.id}${contributorCode ? `&code=${contributorCode}` : ''}`;
        
        if (event.public_gallery) {
            this.showPublicGalleryActions(event, redirectUrl);
        } else {
            console.log('🔗 Redirecting to event detail with code:', redirectUrl);
            window.location.href = redirectUrl;
        }
    }

    showPublicGalleryActions(event, redirectUrl) {
        const alertBox = document.getElementById('publicGalleryActions');
        const postsBtn = document.getElementById('publicGalleryViewPostsBtn');
        const continueBtn = document.getElementById('publicGalleryContinueBtn');

        if (!alertBox || !postsBtn || !continueBtn) {
            window.location.href = redirectUrl;
            return;
        }

        const postsUrl = `guest-my-posts.html?event=${event.id}&public=1`;
        postsBtn.href = postsUrl;
        continueBtn.onclick = () => window.location.href = redirectUrl;

        alertBox.classList.remove('d-none');
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.showAlert('Public gallery is enabled. You can browse guest posts or continue to the event.', 'info');
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


 