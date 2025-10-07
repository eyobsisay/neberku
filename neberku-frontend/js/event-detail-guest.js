/**
 * Event Detail Guest JavaScript
 * Handles guest view of event details and contribution submission
 */

class EventDetailGuestManager {
    constructor() {
        this.currentEvent = null;
        this.selectedFiles = []; // Array to store all selected files
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadEventFromURL();
    }

    bindEvents() {
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
        const uploadArea = document.getElementById('uploadArea');
        
        if (mediaFilesInput) {
            mediaFilesInput.addEventListener('change', (e) => {
                const newFiles = e.target.files;
                if (newFiles.length === 0) return;
                
                const maxCount = this.currentEvent?.guest_max_media_per_post || 3;
                
                if (newFiles.length > maxCount) {
                    this.showError(`Cannot select ${newFiles.length} files. Maximum ${maxCount} files allowed.`, 'warning');
                    e.target.value = '';
                    return;
                }
                
                this.handleFileSelection(newFiles);
            });
            
            // Click to upload
            if (uploadArea) {
                uploadArea.addEventListener('click', (e) => {
                    // Don't trigger if clicking directly on the file input
                    if (e.target === mediaFilesInput) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Upload area clicked, triggering file input');
                    mediaFilesInput.click();
                });
                
                // Prevent clicks on file input from bubbling up
                mediaFilesInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            // Add drag and drop support
            this.setupDragAndDrop(mediaFilesInput, uploadArea);
        }

        // Enhanced form field interactions
        const formFields = document.querySelectorAll('.form-field');
        formFields.forEach(field => {
            const input = field.querySelector('input, textarea');
            const label = field.querySelector('label');
            
            if (input && label) {
                // Function to update label state
                function updateLabelState() {
                    if (input.value.trim() !== '' || input === document.activeElement) {
                        label.classList.add('active');
                    } else {
                        label.classList.remove('active');
                    }
                }
                
                // Event listeners
                input.addEventListener('focus', updateLabelState);
                input.addEventListener('blur', () => {
                    // Small delay to allow placeholder animation
                    setTimeout(updateLabelState, 50);
                });
                input.addEventListener('input', updateLabelState);
                
                // Initial state - labels should be inactive initially
                label.classList.remove('active');
            }
        });

        // Character counter for textarea
        const wishText = document.getElementById('wishText');
        const charCount = document.getElementById('charCount');
        if (wishText && charCount) {
            wishText.addEventListener('input', () => {
                const count = wishText.value.length;
                charCount.textContent = count;
                
                // Change color when approaching limit
                if (count > 450) {
                    charCount.style.color = '#ef4444';
                } else if (count > 400) {
                    charCount.style.color = '#f59e0b';
                } else {
                    charCount.style.color = 'var(--muted)';
                }
            });
        }
    }

    async loadEventFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        const contributorCode = urlParams.get('code');
        
        if (!eventId) {
            this.showError('No event ID provided in URL', 'danger');
            return;
        }

        try {
            this.showLoading(true);
            
            // If we have a contributor code, use it to access the event
            if (contributorCode) {
                console.log('🔑 Using contributor code to access event:', contributorCode);
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/guest/event/?code=${contributorCode}`);
                
                if (response.ok) {
                    const eventData = await response.json();
                    this.currentEvent = eventData;
                    this.displayEventDetails(eventData);
                    this.showTopRightSuccess('Event loaded successfully!');
                    return;
                } else {
                    const errorData = await response.json();
                    this.showError(errorData.error || 'Invalid contributor code', 'danger');
                    return;
                }
            }
            
            // Try to get event details using the event ID directly (for public events)
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/guest/event-by-id/${eventId}/`);
            
            if (response.ok) {
                const eventData = await response.json();
                this.currentEvent = eventData;
                this.displayEventDetails(eventData);
                this.showTopRightSuccess('Event loaded successfully!');
            } else {
                const errorData = await response.json();
                
                if (response.status === 403 && errorData.error?.includes('private event')) {
                    // Private event - show contributor code form
                    this.showContributorCodeForm();
                    this.showError('This is a private event. Please enter the contributor code to access.', 'info');
                } else {
                    this.showError(errorData.error || 'Failed to load event', 'danger');
                }
            }
        } catch (error) {
            console.error('Error loading event:', error);
            this.showError('Error loading event. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    displayEventDetails(event) {
        // Update event title
        const eventTitle = document.getElementById('eventTitle');
        if (eventTitle) {
            eventTitle.textContent = event.title;
        }

        // Update event description
        const eventDescription = document.getElementById('eventDescription');
        if (eventDescription) {
            eventDescription.textContent = event.description;
        }

        // Update event date
        const eventDate = document.getElementById('eventDate');
        if (eventDate) {
            eventDate.textContent = new Date(event.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Update event location
        const eventLocation = document.getElementById('eventLocation');
        if (eventLocation) {
            eventLocation.textContent = event.location || 'Location not specified';
        }

        // Update event type
        const eventType = document.getElementById('eventType');
        if (eventType) {
            eventType.textContent = event.event_type?.name || 'Event';
        }

        // Update event status
        const eventStatus = document.getElementById('eventStatus');
        if (eventStatus) {
            eventStatus.textContent = event.is_public ? 'Public Event' : 'Private Event';
        }

        // Update stats
        this.updateStats(event);

        // Update package limits
        this.updatePackageLimits(event);

        // Display event banner if available
        this.displayEventBanner(event);
        
        // Display event media (thumbnail and video)
        this.displayEventMedia(event);

        // Update page title
        document.title = `${event.title} - Neberku`;
        
        // Update contributor count
        const joinCount = document.getElementById('joinCount');
        if (joinCount) {
            joinCount.textContent = event.total_guest_posts || 0;
        }
    }

    updateStats(event) {
        // Update all stats from the event data
        const totalPhotos = document.getElementById('totalPhotos');
        const totalVideos = document.getElementById('totalVideos');
        const totalPosts = document.getElementById('totalPosts');
        const totalGuests = document.getElementById('totalGuests');

        if (totalPhotos) totalPhotos.textContent = event.photo_count || 0;
        if (totalVideos) totalVideos.textContent = event.video_count || 0;
        if (totalPosts) totalPosts.textContent = event.total_guest_posts || 0;
        if (totalGuests) totalGuests.textContent = event.total_guest_posts || 0;
    }

    updatePackageLimits(event) {
        const packageLimitsElement = document.getElementById('packageLimits');
        if (packageLimitsElement) {
            const maxPhotos = event.package_max_photos || 3;
            const maxVideos = event.package_max_videos || 3;
            const perGuestLimit = event.guest_max_media_per_post || 3;
            
            packageLimitsElement.innerHTML = `
                ${maxPhotos} photos + ${maxVideos} videos total • ${perGuestLimit} files per guest post
            `;
        }
        
        // Update the upload area display
        const maxFilesDisplay = document.getElementById('maxFilesDisplay');
        if (maxFilesDisplay) {
            const perGuestLimit = event.guest_max_media_per_post || 3;
            maxFilesDisplay.textContent = perGuestLimit;
        }
    }

    displayEventBanner(event) {
        const bannerContainer = document.getElementById('eventBannerContainer');
        if (!bannerContainer) return;

        if (event.event_banner) {
            bannerContainer.innerHTML = `
                <img src="${event.event_banner}" alt="${event.title}" class="event-banner">
            `;
        } else {
            bannerContainer.innerHTML = `
                <div class="event-banner" style="background: linear-gradient(135deg, var(--primary-start), var(--primary-end)); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: 700;">
                    ${event.title}
                </div>
            `;
        }
    }

    displayEventMedia(event) {
        const mediaGrid = document.getElementById('eventMediaGrid');
        if (!mediaGrid) return;

        let mediaHTML = '';

        // Add thumbnail if exists
        if (event.event_thumbnail) {
            mediaHTML += `
                <div class="media-item thumbnail-item" onclick="openImageModal('${event.event_thumbnail}', 'Event Thumbnail', 'Click to view full size')">
                    <img src="${event.event_thumbnail}" alt="Event Thumbnail" class="media-preview">
                    <div class="media-info">
                        <div class="media-label">Thumbnail</div>
                        <div class="media-title">Event Preview</div>
                    </div>
                </div>
            `;
        }

        // Add video if exists
        if (event.event_video) {
            mediaHTML += `
                <div class="media-item video-item" onclick="openVideoModal('${event.event_video}', 'Event Video', 'Click to view full size video')">
                    <video class="media-preview" muted preload="metadata">
                        <source src="${event.event_video}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-overlay">
                        <div class="play-button">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="video-duration" id="videoDuration">Loading...</div>
                    </div>
                    <div class="media-info">
                        <div class="media-label">Video</div>
                        <div class="media-title">Event Video</div>
                    </div>
                </div>
            `;
        }

        // If no media, show a placeholder
        if (!event.event_thumbnail && !event.event_video) {
            mediaHTML = `
                <div class="media-item">
                    <div class="media-preview" style="background: linear-gradient(135deg, var(--panel-1), var(--panel-2)); display: flex; align-items: center; justify-content: center; color: var(--muted);">
                        <i class="fas fa-image" style="font-size: 2rem;"></i>
                    </div>
                    <div class="media-info">
                        <div class="media-label">No Media</div>
                        <div class="media-title">No thumbnail or video available</div>
                    </div>
                </div>
            `;
        }

        mediaGrid.innerHTML = mediaHTML;
        
        // Setup video functionality after HTML is inserted
        this.setupVideoFunctionality();
    }

    setupVideoFunctionality() {
        const videoItems = document.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            const video = item.querySelector('video');
            const durationElement = item.querySelector('.video-duration');
            const overlay = item.querySelector('.video-overlay');
            
            if (video && durationElement) {
                // Get video duration when metadata loads
                video.addEventListener('loadedmetadata', () => {
                    const duration = video.duration;
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                });
                
                // Add click to play functionality
                item.playVideo = () => {
                    if (video.paused) {
                        video.play();
                        overlay.style.opacity = '0';
                        video.muted = false; // Unmute when playing
                    } else {
                        video.pause();
                        overlay.style.opacity = '1';
                    }
                };
                
                // Show overlay when video ends
                video.addEventListener('ended', () => {
                    overlay.style.opacity = '1';
                    video.muted = true; // Mute again when ended
                });
                
                // Show overlay when video is paused
                video.addEventListener('pause', () => {
                    overlay.style.opacity = '1';
                });
            }
        });
    }


    handleFileSelection(newFiles) {
        console.log('handleFileSelection called with:', newFiles);
        const fileList = document.getElementById('fileList');
        if (!fileList) {
            console.error('fileList element not found');
            return;
        }

        const fileInput = document.getElementById('mediaFiles');
        if (!fileInput) {
            console.error('mediaFiles input not found');
            return;
        }
        
        // Add new files to our accumulated list
        const filesToAdd = Array.from(newFiles);
        console.log('Adding files to selection:', filesToAdd.length);
        
        // Check limits before adding
        const maxFiles = this.currentEvent?.guest_max_media_per_post || 6;
        const currentCount = this.selectedFiles.length;
        const remainingSlots = maxFiles - currentCount;
        
        if (filesToAdd.length > remainingSlots) {
            alert(`You can only upload ${maxFiles} files total. You have ${remainingSlots} slots remaining.`);
            return;
        }
        
        // Add files to our accumulated list
        this.selectedFiles = this.selectedFiles.concat(filesToAdd);
        console.log('Total files now:', this.selectedFiles.length);
        
        // Update the file input to reflect all selected files
        this.updateFileInput();
        
        // Render all files
        this.renderFilePreviews();
    }
    
    updateFileInput() {
        const fileInput = document.getElementById('mediaFiles');
        if (!fileInput) return;
        
        // Create a new FileList-like object
        const dt = new DataTransfer();
        this.selectedFiles.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
    }
    
    renderFilePreviews() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;
        
        fileList.innerHTML = '';
        fileList.style.display = this.selectedFiles.length > 0 ? 'block' : 'none';
        
        let photoCount = 0;
        let videoCount = 0;
        
        this.selectedFiles.forEach((file, index) => {
            console.log(`Rendering file ${index}:`, file.name, file.type);
            const fileItem = document.createElement('div');
            fileItem.className = 'file-preview-item';
            
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            
            let previewContent = '';
            if (isImage) {
                previewContent = `
                    <img src="${URL.createObjectURL(file)}" alt="${file.name}" class="file-preview-image">
                `;
                photoCount++;
            } else if (isVideo) {
                previewContent = `
                    <div class="file-preview-icon">
                        <i class="fas fa-video"></i>
                    </div>
                `;
                videoCount++;
            } else {
                previewContent = `
                    <div class="file-preview-icon">
                        <i class="fas fa-file"></i>
                    </div>
                `;
            }
            
            fileItem.innerHTML = `
                ${previewContent}
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${this.formatFileSize(file.size)}</div>
                <button type="button" class="file-remove-btn" onclick="eventDetailManager.removeFile(${index}, this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });
        
        console.log(`Rendered ${this.selectedFiles.length} files. Photos: ${photoCount}, Videos: ${videoCount}`);
        
        // Show summary
        if (this.selectedFiles.length > 0) {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'alert alert-primary mt-2';
            summaryDiv.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                <strong>Selected Files:</strong> ${this.selectedFiles.length} total 
                ${photoCount > 0 || videoCount > 0 ? '(' : ''}${photoCount > 0 ? `${photoCount} photo${photoCount !== 1 ? 's' : ''}` : ''}${photoCount > 0 && videoCount > 0 ? ', ' : ''}${videoCount > 0 ? `${videoCount} video${videoCount !== 1 ? 's' : ''}` : ''}${photoCount > 0 || videoCount > 0 ? ')' : ''}
            `;
            fileList.appendChild(summaryDiv);
            
            // Show remaining file count
            const maxCount = this.currentEvent?.guest_max_media_per_post || 6;
            const remainingCount = maxCount - this.selectedFiles.length;
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
        this.clearErrors();
        
        // Validate form data
        const guestName = document.getElementById('guestName').value.trim();
        const guestPhone = document.getElementById('guestPhone').value.trim();
        const wishText = document.getElementById('wishText').value.trim();
        
        if (!guestName || !guestPhone || !wishText) {
            this.showError('Please fill in all required fields', 'warning');
            return;
        }
        
        // Validate media files
        const guestMaxMediaPerPost = this.currentEvent.guest_max_media_per_post || 6;
        
        if (this.selectedFiles.length > guestMaxMediaPerPost) {
            this.showError(`Maximum ${guestMaxMediaPerPost} media files allowed per contribution`, 'warning');
            return;
        }
        
        // Check file sizes (max 10MB per file)
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            if (file.size > 10 * 1024 * 1024) { // 10MB
                this.showError(`File ${file.name} is too large. Maximum size is 10MB.`, 'warning');
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
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            if (file.type.startsWith('image/')) {
                formData.append('photos', file);
                photoCount++;
            } else if (file.type.startsWith('video/')) {
                formData.append('videos', file);
                videoCount++;
            }
        }
        
        // Show upload summary
        if (this.selectedFiles.length > 0) {
            this.showTopRightSuccess(`Uploading ${this.selectedFiles.length} files (${photoCount} photos, ${videoCount} videos)...`);
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/guest-post-create/`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.showTopRightSuccess('Contribution submitted successfully!');
                
                // Reset form
                document.getElementById('contributionForm').reset();
                document.getElementById('fileList').innerHTML = '';
                this.selectedFiles = []; // Clear accumulated files
                this.updateFileInput(); // Update file input
                this.clearErrors();
                
                // Clear the file input
                const fileInput = document.getElementById('mediaFiles');
                if (fileInput) {
                    fileInput.value = '';
                }
                
            } else {
                // Show API errors
                if (data.error) {
                    this.showError(data.error, 'danger');
                } else if (data.errors) {
                    // Handle field-specific errors
                    Object.keys(data.errors).forEach(field => {
                        const fieldErrors = data.errors[field];
                        if (Array.isArray(fieldErrors)) {
                            fieldErrors.forEach(error => {
                                this.showError(`${field}: ${error}`, 'danger');
                            });
                        } else {
                            this.showError(`${field}: ${fieldErrors}`, 'danger');
                        }
                    });
                } else {
                    this.showError('Failed to submit contribution. Please try again.', 'danger');
                }
            }
        } catch (error) {
            console.error('Error submitting contribution:', error);
            this.showError('Error submitting contribution. Please try again.', 'danger');
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

    removeFile(fileIndex, buttonElement) {
        console.log('Removing file at index:', fileIndex);
        
        // Remove file from our accumulated list
        if (fileIndex >= 0 && fileIndex < this.selectedFiles.length) {
            this.selectedFiles.splice(fileIndex, 1);
            console.log('Files remaining:', this.selectedFiles.length);
            
            // Update the file input to reflect the change
            this.updateFileInput();
            
            // Re-render all file previews
            this.renderFilePreviews();
            
            // Show success message
            this.showTopRightSuccess('File removed successfully');
        }
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

    showError(message, type = 'danger') {
        const errorContainer = document.getElementById('errorContainer');
        if (!errorContainer) return;

        errorContainer.style.display = 'block';

        const errorDiv = document.createElement('div');
        errorDiv.className = `alert alert-${type} alert-dismissible fade show`;
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>${type === 'danger' ? 'Error:' : type === 'warning' ? 'Warning:' : 'Info:'}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        errorContainer.appendChild(errorDiv);

        // Auto-remove after 8 seconds
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

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showTopRightSuccess(message) {
        // Use the existing notification element in the HTML
        const notification = document.getElementById('topRightNotification');
        const messageElement = document.getElementById('notificationMessage');
        
        if (notification && messageElement) {
            messageElement.textContent = message;
            notification.style.display = 'block';
            
            // Animate in
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 300);
            }, 3000);
        } else {
            // Fallback to creating a new notification if elements don't exist
            const newNotification = document.createElement('div');
            newNotification.className = 'top-right-notification';
            newNotification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-check-circle me-2"></i>
                    ${message}
                </div>
            `;
            
            // Add to body
            document.body.appendChild(newNotification);
            
            // Animate in
            setTimeout(() => {
                newNotification.classList.add('show');
            }, 100);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                newNotification.classList.remove('show');
                setTimeout(() => {
                    if (newNotification.parentNode) {
                        newNotification.remove();
                    }
                }, 300);
            }, 3000);
        }
    }

    clearErrors() {
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.innerHTML = '';
            errorContainer.style.display = 'none';
        }
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'block' : 'none';
        }
    }

    showContributorCodeForm() {
        // Hide the main content and show a contributor code form
        const mainContent = document.querySelector('.container');
        if (!mainContent) return;

        // Create contributor code form
        const formHTML = `
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-4">
                    <div class="card">
                        <div class="card-header text-center">
                            <h4 class="mb-0">
                                <i class="fas fa-key text-primary me-2"></i>
                                Private Event Access
                            </h4>
                        </div>
                        <div class="card-body">
                            <p class="text-muted text-center mb-4">
                                This is a private event. Please enter the contributor code provided by the event host.
                            </p>
                            <form id="contributorCodeForm">
                                <div class="mb-3">
                                    <label for="contributorCodeInput" class="form-label">Contributor Code</label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="contributorCodeInput" 
                                           placeholder="Enter contributor code"
                                           required>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-unlock me-2"></i>
                                        Access Event
                                    </button>
                                </div>
                            </form>
                            <div class="text-center mt-3">
                                <a href="guest-contribution.html" class="btn btn-outline-secondary btn-sm">
                                    <i class="fas fa-arrow-left me-1"></i>
                                    Back to Events
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Replace main content with the form
        mainContent.innerHTML = formHTML;

        // Bind form submission
        const form = document.getElementById('contributorCodeForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContributorCodeSubmit();
            });
        }
    }

    async handleContributorCodeSubmit() {
        const contributorCode = document.getElementById('contributorCodeInput').value.trim();
        
        if (!contributorCode) {
            this.showError('Please enter a contributor code', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/guest/event/?code=${contributorCode}`);
            const data = await response.json();

            if (response.ok) {
                this.currentEvent = data;
                // Reload the page with the contributor code in the URL
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('code', contributorCode);
                window.location.href = `${window.location.pathname}?${urlParams.toString()}`;
            } else {
                this.showError(data.error || 'Invalid contributor code', 'danger');
            }
        } catch (error) {
            console.error('Error accessing event:', error);
            this.showError('Error accessing event. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    setupDragAndDrop(fileInput, uploadArea) {
        // Use the upload area if provided, otherwise fall back to fileInput parent
        const container = uploadArea || fileInput.parentElement;
        
        console.log('Setting up drag and drop for:', container);
        
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
            console.log('Drag highlight triggered');
            container.classList.add('dragover');
        }
        
        function unhighlight(e) {
            console.log('Drag unhighlight triggered');
            container.classList.remove('dragover');
        }
        
        // Handle dropped files
        container.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            console.log('Files dropped!');
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                console.log(`${files.length} files dropped`);
                
                // Use the new file selection system
                if (window.eventDetailManager) {
                    window.eventDetailManager.handleFileSelection(files);
                }
            }
        }
    }
}

// Initialize the event detail manager when the page loads
let eventDetailManager;
document.addEventListener('DOMContentLoaded', function() {
    eventDetailManager = new EventDetailGuestManager();
});

// Global functions for image modal
function openImageModal(imageSrc, title, description) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    
    if (modal && modalImage && modalTitle && modalDescription) {
        modalImage.src = imageSrc;
        modalTitle.textContent = title;
        modalDescription.textContent = description;
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Global functions for video modal
function openVideoModal(videoSrc, title, description) {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    const modalTitle = document.getElementById('modalVideoTitle');
    const modalDescription = document.getElementById('modalVideoDescription');
    
    if (modal && modalVideo && modalTitle && modalDescription) {
        modalVideo.querySelector('source').src = videoSrc;
        modalVideo.load(); // Reload the video element
        modalTitle.textContent = title;
        modalDescription.textContent = description;
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    
    if (modal && modalVideo) {
        modal.classList.remove('show');
        modalVideo.pause(); // Pause the video when closing
        modalVideo.currentTime = 0; // Reset to beginning
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Close modals with ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeImageModal();
        closeVideoModal();
    }
});
