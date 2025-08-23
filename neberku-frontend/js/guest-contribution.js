// Guest contribution functionality
class GuestContribution {
    constructor() {
        this.events = [];
        this.selectedEvent = null;
        this.uploadedFiles = [];
        this.init();
    }

    init() {
        this.loadEvents();
        this.bindEvents();
        this.checkUrlParams();
    }

    bindEvents() {
        // Event selection
        const eventSelect = document.getElementById('eventSelect');
        if (eventSelect) {
            eventSelect.addEventListener('change', (e) => {
                this.handleEventSelection(e.target.value);
            });
        }

        // Load event details button
        const loadBtn = document.getElementById('loadEventDetails');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.loadEventDetails();
            });
        }

        // File uploads
        const photoUpload = document.getElementById('photoUpload');
        const videoUpload = document.getElementById('videoUpload');
        
        if (photoUpload) {
            photoUpload.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files, 'photo');
            });
        }
        
        if (videoUpload) {
            videoUpload.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files, 'video');
            });
        }

        // Form submission
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpload();
            });
        }
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        if (eventId) {
            // Pre-select the event if it's in the URL
            setTimeout(() => {
                const eventSelect = document.getElementById('eventSelect');
                if (eventSelect) {
                    eventSelect.value = eventId;
                    this.handleEventSelection(eventId);
                }
            }, 100);
        }
    }

    async loadEvents() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'  // Include cookies for session authentication
            });

            if (response.ok) {
                this.events = await response.json();
                this.populateEventSelect();
            } else if (response.status === 404) {
                this.showAlert('No events found. Please check back later.', 'info');
                this.events = [];
                this.populateEventSelect();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading events:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showAlert('Unable to connect to the server. Please check your connection and try again.', 'warning');
            } else {
                this.showAlert('Error loading events. Please try again.', 'danger');
            }
            // Show empty state
            this.events = [];
            this.populateEventSelect();
        }
    }

    populateEventSelect() {
        const eventSelect = document.getElementById('eventSelect');
        if (!eventSelect) return;

        // Clear existing options
        eventSelect.innerHTML = '<option value="">Select an event...</option>';
        
        // Add event options
        this.events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.title} - ${this.formatDate(event.date)}`;
            eventSelect.appendChild(option);
        });
    }

    handleEventSelection(eventId) {
        const loadBtn = document.getElementById('loadEventDetails');
        if (loadBtn) {
            loadBtn.disabled = !eventId;
        }
    }

    loadEventDetails() {
        const eventId = document.getElementById('eventSelect').value;
        if (!eventId) return;

        this.selectedEvent = this.events.find(e => e.id == eventId);
        if (!this.selectedEvent) return;

        // Display event details
        document.getElementById('eventTitle').textContent = this.selectedEvent.title;
        document.getElementById('eventDateTime').textContent = this.formatDate(this.selectedEvent.date);
        document.getElementById('eventLocation').textContent = this.selectedEvent.location;
        document.getElementById('eventDescription').textContent = this.selectedEvent.description;

        // Show event details and contribution form
        document.getElementById('eventDetails').style.display = 'block';
        document.getElementById('contributionForm').style.display = 'block';

        // Scroll to contribution form
        document.getElementById('contributionForm').scrollIntoView({ behavior: 'smooth' });
    }

    handleFileSelection(files, type) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (this.validateFile(file, type)) {
                this.uploadedFiles.push({
                    file: file,
                    type: type,
                    id: Date.now() + Math.random()
                });
            }
        });

        this.updatePreview();
    }

    validateFile(file, type) {
        const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for photos, 100MB for videos
        const allowedTypes = type === 'photo' 
            ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            : ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];

        if (file.size > maxSize) {
            this.showAlert(`File ${file.name} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`, 'warning');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showAlert(`File ${file.name} is not a supported ${type} format.`, 'warning');
            return false;
        }

        return true;
    }

    updatePreview() {
        const previewArea = document.getElementById('previewArea');
        const previewContainer = document.getElementById('previewContainer');
        
        if (!previewArea || !previewContainer) return;

        if (this.uploadedFiles.length === 0) {
            previewArea.style.display = 'none';
            return;
        }

        previewArea.style.display = 'block';
        previewContainer.innerHTML = this.uploadedFiles.map(item => `
            <div class="col-md-3 mb-3">
                <div class="card">
                    <div class="card-body p-2 text-center">
                        ${item.type === 'photo' 
                            ? `<img src="${URL.createObjectURL(item.file)}" class="img-fluid rounded" style="max-height: 100px;">`
                            : `<i class="bi bi-camera-video display-4 text-muted"></i>`
                        }
                        <div class="small text-muted mt-2">${item.file.name}</div>
                        <button type="button" class="btn btn-sm btn-outline-danger mt-2" onclick="guestContribution.removeFile(${item.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(item => item.id !== fileId);
        this.updatePreview();
    }

    async handleUpload() {
        if (!this.selectedEvent) {
            this.showAlert('Please select an event first.', 'warning');
            return;
        }

        if (this.uploadedFiles.length === 0) {
            this.showAlert('Please select at least one photo or video to upload.', 'warning');
            return;
        }

        const guestName = document.getElementById('guestName').value.trim();
        if (!guestName) {
            this.showAlert('Please enter your name.', 'warning');
            return;
        }

        try {
            this.showUploadProgress(true);
            
            // Prepare form data for upload
            const formData = new FormData();
            formData.append('event_id', this.selectedEvent.id);
            formData.append('guest_name', guestName);
            
            const guestEmail = document.getElementById('guestEmail').value.trim();
            if (guestEmail) {
                formData.append('guest_email', guestEmail);
            }
            
            const message = document.getElementById('message').value.trim();
            if (message) {
                formData.append('message', message);
            }
            
            // Add files to form data
            this.uploadedFiles.forEach((item, index) => {
                formData.append(`file_${index}`, item.file);
                formData.append(`file_type_${index}`, item.type);
            });
            
            // Upload to API
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POSTS}`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.showUploadProgress(false);
                this.showSuccessMessage();
                this.resetForm();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || `Upload failed: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showAlert('Unable to connect to the server. Please check your connection and try again.', 'danger');
            } else {
                this.showAlert(`Upload failed: ${error.message}`, 'danger');
            }
            this.showUploadProgress(false);
        }
    }

    updateProgress(percentage, status) {
        const progressBar = document.getElementById('progressBar');
        const uploadStatus = document.getElementById('uploadStatus');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
        }
        
        if (uploadStatus) {
            uploadStatus.textContent = status;
        }
    }

    showUploadProgress(show) {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            uploadProgress.style.display = show ? 'block' : 'none';
        }
    }

    showSuccessMessage() {
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
            successMessage.style.display = 'block';
            successMessage.scrollIntoView({ behavior: 'smooth' });
        }
    }

    resetForm() {
        // Reset form fields
        document.getElementById('uploadForm').reset();
        
        // Clear uploaded files
        this.uploadedFiles = [];
        this.updatePreview();
        
        // Hide success message
        document.getElementById('successMessage').style.display = 'none';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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

// Initialize guest contribution when page loads
let guestContribution;
document.addEventListener('DOMContentLoaded', () => {
    guestContribution = new GuestContribution();
});

// Global function for form reset
function resetForm() {
    if (guestContribution) {
        guestContribution.resetForm();
    }
} 