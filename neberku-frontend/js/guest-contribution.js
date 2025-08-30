/**
 * Guest Contribution JavaScript
 * Handles guest access to events and contribution submission
 */

class GuestContributionManager {
    constructor() {
        this.currentEvent = null;
        this.API_BASE_URL = 'http://localhost:8000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPublicEvents();
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

        // Contribution form
        const contributionForm = document.getElementById('contributionForm');
        if (contributionForm) {
            contributionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitContribution();
            });
        }

        // File input change
        const mediaFilesInput = document.getElementById('mediaFiles');
        if (mediaFilesInput) {
            mediaFilesInput.addEventListener('change', (e) => {
                // Get the new files that were just selected
                const newFiles = e.target.files;
                
                if (newFiles.length === 0) return;
                
                // Check if the selected files exceed the limit
                const maxCount = this.currentEvent?.guest_max_media_per_post || 3;
                
                console.log(`File input change - Selected: ${newFiles.length}, Max: ${maxCount}`);
                
                // Check if the number of selected files exceeds the limit
                if (newFiles.length > maxCount) {
                    this.showModalError(`Cannot select ${newFiles.length} files. Maximum ${maxCount} files allowed.`, 'warning');
                    // Reset the file input to prevent exceeding limits
                    e.target.value = '';
                    return;
                }
                
                // Process the files
                this.handleFileSelection(newFiles);
            });
            
            // Add drag and drop support
            this.setupDragAndDrop(mediaFilesInput);
        }

        // Clear errors when form inputs change
        const formInputs = document.querySelectorAll('#contributionForm input, #contributionForm textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearModalErrors();
            });
        });
    }

    async accessEvent() {
        const contributorCode = document.getElementById('contributorCode').value.trim();

        if (!contributorCode) {
            this.showAlert('Please enter a contributor code', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            
            const url = `${this.API_BASE_URL}/guest/event/?code=${contributorCode}`;
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                this.currentEvent = data;
                this.showEventDetails(data);
                this.showAlert('Event accessed successfully!', 'success');
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
            
            const response = await fetch(`${this.API_BASE_URL}/guest/public-events/`);
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
            
            // For public events, we already have the event data
            // Just show the event details directly
            if (this.currentEvent && this.currentEvent.id === eventId) {
                this.showEventDetails(this.currentEvent);
                return;
            }
            
            // If we don't have the event data, try to get it from the public events list
            const publicEventsContainer = document.getElementById('publicEvents');
            if (publicEventsContainer) {
                const eventElement = publicEventsContainer.querySelector(`[data-event-id="${eventId}"]`);
                if (eventElement && eventElement.dataset.eventData) {
                    const eventData = JSON.parse(eventElement.dataset.eventData);
                    this.currentEvent = eventData;
                    this.showEventDetails(eventData);
                    return;
                }
            }
            
            this.showAlert('Event not found', 'danger');
        } catch (error) {
            console.error('Error loading event:', error);
            this.showAlert('Error loading event. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    showEventDetails(event) {
        const modalTitle = document.getElementById('eventModalTitle');
        const modalBody = document.getElementById('eventModalBody');
        
        if (modalTitle) modalTitle.textContent = event.title;
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <img src="${event.event_thumbnail || 'https://via.placeholder.com/400x300?text=Event'}" 
                             class="img-fluid rounded" alt="${event.title}">
                    </div>
                    <div class="col-md-6">
                        <h4>${event.title}</h4>
                        <p class="text-muted">${event.description}</p>
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <strong><i class="fas fa-calendar me-1"></i> Date:</strong><br>
                                <span class="text-muted">${new Date(event.event_date).toLocaleDateString()}</span>
                            </div>
                            <div class="col-6">
                                <strong><i class="fas fa-map-marker-alt me-1"></i> Location:</strong><br>
                                <span class="text-muted">${event.location || 'Not specified'}</span>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <strong><i class="fas fa-tag me-1"></i> Type:</strong><br>
                                <span class="badge bg-primary">${event.event_type.name}</span>
                            </div>
                            <div class="col-6">
                                <strong><i class="fas fa-box me-1"></i> Package:</strong><br>
                                <span class="text-muted">${event.package_name}</span>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <strong><i class="fas fa-comments me-1"></i> Posts:</strong><br>
                                <span class="text-muted">${event.total_guest_posts}</span>
                            </div>
                            <div class="col-6">
                                <strong><i class="fas fa-images me-1"></i> Media:</strong><br>
                                <span class="text-muted">${event.total_media_files}</span>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <strong><i class="fas fa-user me-1"></i> Per Guest Limit:</strong><br>
                                <span class="text-muted">${event.guest_max_media_per_post || 3} media files per post</span>
                            </div>
                            <div class="col-6">
                                <strong><i class="fas fa-images me-1"></i> Event Total:</strong><br>
                                <span class="text-muted">${event.package_max_photos || 3} photos + ${event.package_max_videos || 3} videos</span>
                            </div>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Access:</strong> ${event.is_public ? 'Public Event' : 'Private Event (Code Required)'}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Show the modal
        const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
        eventModal.show();
    }

    contributeToEvent() {
        if (!this.currentEvent) {
            this.showAlert('No event selected', 'warning');
            return;
        }
        
        // Update package limits display
        this.updatePackageLimitsDisplay();
        
        // Clear any previous errors
        this.clearModalErrors();
        
        // Clear any previous files
        const fileInput = document.getElementById('mediaFiles');
        if (fileInput) {
            fileInput.value = '';
        }
        document.getElementById('fileList').innerHTML = '';
        
        // Hide event modal and show contribution modal
        const eventModal = bootstrap.Modal.getInstance(document.getElementById('eventModal'));
        if (eventModal) eventModal.hide();
        
        const contributionModal = new bootstrap.Modal(document.getElementById('contributionModal'));
        contributionModal.show();
    }
    
    updatePackageLimitsDisplay() {
        const packageLimitsElement = document.getElementById('packageLimits');
        if (packageLimitsElement && this.currentEvent) {
            const guestMaxMedia = this.currentEvent.guest_max_media_per_post || 3;
            const packageMaxPhotos = this.currentEvent.package_max_photos || 3;
            const packageMaxVideos = this.currentEvent.package_max_videos || 3;
            
            packageLimitsElement.innerHTML = `${guestMaxMedia} per guest post (Event total: ${packageMaxPhotos} photos + ${packageMaxVideos} videos)`;
        }
    }

    handleFileSelection(newFiles) {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        // Get current files from the file input
        const fileInput = document.getElementById('mediaFiles');
        if (!fileInput) return;
        
        // Get all current files (existing + new)
        const allFiles = Array.from(fileInput.files);
        
        // Clear the file list display
        fileList.innerHTML = '';
        
        let photoCount = 0;
        let videoCount = 0;
        
        // Display all files with proper indexing
        allFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            
            // Determine icon and color based on file type
            let icon = 'fas fa-file';
            let alertClass = 'alert-info';
            
            if (isImage) {
                icon = 'fas fa-image';
                alertClass = 'alert-success';
                photoCount++;
            } else if (isVideo) {
                icon = 'fas fa-video';
                alertClass = 'alert-warning';
                videoCount++;
            }
            
            fileItem.className = `alert ${alertClass} d-flex justify-content-between align-items-center`;
            fileItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="${icon} me-2"></i>
                    <span>${file.name}</span>
                    <small class="text-muted ms-2">(${this.formatFileSize(file.size)})</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="guestManager.removeFile(${index}, this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });
        
        // Show summary
        if (allFiles.length > 0) {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'alert alert-primary mt-2';
            summaryDiv.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                <strong>Selected Files:</strong> ${allFiles.length} total 
                ${photoCount > 0 || videoCount > 0 ? '(' : ''}${photoCount > 0 ? `${photoCount} photo${photoCount !== 1 ? 's' : ''}` : ''}${photoCount > 0 && videoCount > 0 ? ', ' : ''}${videoCount > 0 ? `${videoCount} video${videoCount !== 1 ? 's' : ''}` : ''}${photoCount > 0 || videoCount > 0 ? ')' : ''}
            `;
            fileList.appendChild(summaryDiv);
            
            // Show remaining file count
            const maxCount = this.currentEvent?.guest_max_media_per_post || 3;
            const remainingCount = maxCount - allFiles.length;
            if (remainingCount > 0) {
                const remainingDiv = document.createElement('div');
                remainingDiv.className = 'alert alert-success mt-2';
                remainingDiv.innerHTML = `
                    <i class="fas fa-plus-circle me-2"></i>
                    <strong>You can add ${remainingCount} more file${remainingCount !== 1 ? 's' : ''}</strong>
                `;
                fileList.appendChild(remainingDiv);
            } else {
                const limitReachedDiv = document.createElement('div');
                limitReachedDiv.className = 'alert alert-warning mt-2';
                limitReachedDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Maximum file limit reached (${maxCount} files)</strong>
                `;
                fileList.appendChild(limitReachedDiv);
            }
        }
    }

    async submitContribution() {
        // Clear any previous errors
        this.clearModalErrors();
        
        // Validate form data
        const guestName = document.getElementById('guestName').value.trim();
        const guestPhone = document.getElementById('guestPhone').value.trim();
        const wishText = document.getElementById('wishText').value.trim();
        
        if (!guestName || !guestPhone || !wishText) {
            this.showModalError('Please fill in all required fields', 'warning');
            return;
        }
        
        // Validate media files using per-guest limits from EventSettings
        const mediaFiles = document.getElementById('mediaFiles').files;
        const guestMaxMediaPerPost = this.currentEvent.guest_max_media_per_post || 3;
        
        if (mediaFiles.length > guestMaxMediaPerPost) {
            this.showModalError(`Maximum ${guestMaxMediaPerPost} media files allowed per contribution`, 'warning');
            return;
        }
        
        // Check file sizes (max 10MB per file)
        for (let i = 0; i < mediaFiles.length; i++) {
            const file = mediaFiles[i];
            if (file.size > 10 * 1024 * 1024) { // 10MB
                this.showModalError(`File ${file.name} is too large. Maximum size is 10MB.`, 'warning');
                return;
            }
        }
        
        const formData = new FormData();
        formData.append('event', this.currentEvent.id);
        formData.append('guest_name', guestName);
        formData.append('guest_phone', guestPhone);
        formData.append('wish_text', wishText);

        // Process media files
        let photoCount = 0;
        let videoCount = 0;
        
        for (let i = 0; i < mediaFiles.length; i++) {
            const file = mediaFiles[i];
            if (file.type.startsWith('image/')) {
                formData.append('photos', file);
                photoCount++;
            } else if (file.type.startsWith('video/')) {
                formData.append('videos', file);
                videoCount++;
            }
        }
        
        // Note: Individual photo/video limits are not enforced per guest
        // Only total media limit per post is enforced
        
        // Show upload summary
        if (mediaFiles.length > 0) {
            this.showAlert(`Uploading ${mediaFiles.length} files (${photoCount} photos, ${videoCount} videos)...`, 'info');
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.API_BASE_URL}/guest-post-create/`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.showAlert('Contribution submitted successfully!', 'success');
                
                // Hide contribution modal
                const contributionModal = bootstrap.Modal.getInstance(document.getElementById('contributionModal'));
                if (contributionModal) contributionModal.hide();
                
                // Reset form
                document.getElementById('contributionForm').reset();
                document.getElementById('fileList').innerHTML = '';
                this.clearModalErrors();
                
                // Clear the file input
                const fileInput = document.getElementById('mediaFiles');
                if (fileInput) {
                    fileInput.value = '';
                }
                
                // Refresh event details
                if (this.currentEvent) {
                    await this.viewPublicEvent(this.currentEvent.id);
                }
            } else {
                // Show API errors in the modal
                if (data.error) {
                    this.showModalError(data.error, 'danger');
                } else if (data.errors) {
                    // Handle field-specific errors
                    Object.keys(data.errors).forEach(field => {
                        const fieldErrors = data.errors[field];
                        if (Array.isArray(fieldErrors)) {
                            fieldErrors.forEach(error => {
                                this.showModalError(`${field}: ${error}`, 'danger');
                            });
                        } else {
                            this.showModalError(`${field}: ${fieldErrors}`, 'danger');
                        }
                    });
                } else {
                    this.showModalError('Failed to submit contribution. Please try again.', 'danger');
                }
            }
        } catch (error) {
            console.error('Error submitting contribution:', error);
            this.showModalError('Error submitting contribution. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
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

    showModalError(message, type = 'danger') {
        const errorContainer = document.getElementById('modalErrorContainer');
        if (!errorContainer) return;

        // Don't clear previous errors - allow multiple errors to be shown
        errorContainer.style.display = 'block';

        const errorDiv = document.createElement('div');
        errorDiv.className = `alert alert-${type} alert-dismissible fade show`;
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>${type === 'danger' ? 'Error:' : type === 'warning' ? 'Warning:' : 'Info:'}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        errorContainer.appendChild(errorDiv);

        // Auto-remove after 8 seconds (longer for modal errors)
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
                // Hide container if no more errors
                if (errorContainer.children.length === 0) {
                    errorContainer.style.display = 'none';
                }
            }
        }, 8000);
    }

    clearModalErrors() {
        const errorContainer = document.getElementById('modalErrorContainer');
        if (errorContainer) {
            errorContainer.innerHTML = '';
            errorContainer.style.display = 'none';
        }
    }

    showModalSuccess(message) {
        const errorContainer = document.getElementById('modalErrorContainer');
        if (!errorContainer) return;

        errorContainer.style.display = 'block';

        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            <strong>Success:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        errorContainer.appendChild(successDiv);

        // Auto-remove after 5 seconds for success messages
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
                // Hide container if no more messages
                if (errorContainer.children.length === 0) {
                    errorContainer.style.display = 'none';
                }
            }
        }, 5000);
    }

    removeFile(fileIndex, buttonElement) {
        const fileInput = document.getElementById('mediaFiles');
        if (!fileInput) return;

        // Get current files
        const currentFiles = Array.from(fileInput.files);
        
        // Remove the file at the specified index
        currentFiles.splice(fileIndex, 1);
        
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        currentFiles.forEach(file => dataTransfer.items.add(file));
        
        // Update the file input
        fileInput.files = dataTransfer.files;
        
        // Refresh the entire file list display to update counts and summary
        this.handleFileSelection([]);
        
        // Show success message in modal
        this.showModalSuccess('File removed successfully');
    }

    getCurrentFileCount() {
        const fileInput = document.getElementById('mediaFiles');
        return fileInput ? fileInput.files.length : 0;
    }

    canAddMoreFiles() {
        const currentCount = this.getCurrentFileCount();
        const maxCount = this.currentEvent?.guest_max_media_per_post || 3;
        return currentCount < maxCount;
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'block' : 'none';
        }
    }
    
    setupDragAndDrop(fileInput) {
        const container = fileInput.parentElement;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            container.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight(e) {
            container.classList.add('drag-over');
        }
        
        function unhighlight(e) {
            container.classList.remove('drag-over');
        }
        
        // Handle dropped files
        container.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                // Get current files and add new ones
                const currentFiles = Array.from(fileInput.files);
                const newFiles = Array.from(files);
                
                // Check if adding new files would exceed the limit
                const guestMaxMedia = window.guestManager?.currentEvent?.guest_max_media_per_post || 3;
                if (currentFiles.length + newFiles.length > guestMaxMedia) {
                    if (window.guestManager) {
                        window.guestManager.showModalError(`Cannot add ${newFiles.length} files. You currently have ${currentFiles.length} files and maximum ${guestMaxMedia} files allowed.`, 'warning');
                    }
                    return;
                }
                
                // Combine current and new files
                const allFiles = [...currentFiles, ...newFiles];
                
                // Update the file input with combined files
                const dataTransfer = new DataTransfer();
                allFiles.forEach(file => dataTransfer.items.add(file));
                fileInput.files = dataTransfer.files;
                
                // Process the files to update the display
                if (window.guestManager) {
                    window.guestManager.handleFileSelection([]);
                }
                
                // Show success message in modal
                if (window.guestManager) {
                    window.guestManager.showModalSuccess(`Successfully added ${newFiles.length} file(s)`);
                }
            }
        }
    }
}

// Initialize the guest contribution manager when the page loads
let guestManager;
document.addEventListener('DOMContentLoaded', function() {
    guestManager = new GuestContributionManager();
});

// Global function for onclick events
function contributeToEvent() {
    if (guestManager) {
        guestManager.contributeToEvent();
    }
}

 