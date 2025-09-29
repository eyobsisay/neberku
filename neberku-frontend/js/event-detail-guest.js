/**
 * Event Detail Guest JavaScript
 * Handles guest view of event details and contribution submission
 */

class EventDetailGuestManager {
    constructor() {
        this.currentEvent = null;
        this.API_BASE_URL = 'http://localhost:8000/api';
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
        
        if (!eventId) {
            this.showError('No event ID provided in URL', 'danger');
            return;
        }

        try {
            this.showLoading(true);
            
            // Try to get event details using the event ID
            const response = await fetch(`${this.API_BASE_URL}/guest/event-by-id/${eventId}/`);
            
            if (response.ok) {
                const eventData = await response.json();
                this.currentEvent = eventData;
                this.displayEventDetails(eventData);
                this.showTopRightSuccess('Event loaded successfully!');
            } else {
                const errorData = await response.json();
                this.showError(errorData.error || 'Failed to load event', 'danger');
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
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        const fileInput = document.getElementById('mediaFiles');
        if (!fileInput) return;
        
        const allFiles = Array.from(fileInput.files);
        
        fileList.innerHTML = '';
        
        let photoCount = 0;
        let videoCount = 0;
        
        allFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            
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
            
            fileItem.className = `alert ${alertClass} d-flex justify-content-between align-items-center file-item`;
            fileItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="${icon} me-2"></i>
                    <span>${file.name}</span>
                    <small class="text-muted ms-2">(${this.formatFileSize(file.size)})</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="eventDetailManager.removeFile(${index}, this)">
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
        const mediaFiles = document.getElementById('mediaFiles').files;
        const guestMaxMediaPerPost = this.currentEvent.guest_max_media_per_post || 3;
        
        if (mediaFiles.length > guestMaxMediaPerPost) {
            this.showError(`Maximum ${guestMaxMediaPerPost} media files allowed per contribution`, 'warning');
            return;
        }
        
        // Check file sizes (max 10MB per file)
        for (let i = 0; i < mediaFiles.length; i++) {
            const file = mediaFiles[i];
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
        
        // Show upload summary
        if (mediaFiles.length > 0) {
            this.showSuccess(`Uploading ${mediaFiles.length} files (${photoCount} photos, ${videoCount} videos)...`);
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.API_BASE_URL}/guest-post-create/`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Contribution submitted successfully!');
                
                // Reset form
                document.getElementById('contributionForm').reset();
                document.getElementById('fileList').innerHTML = '';
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
        
        // Refresh the entire file list display
        this.handleFileSelection([]);
        
        // Show success message
        this.showSuccess('File removed successfully');
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
        // Create a fixed position notification in the top right
        const notification = document.createElement('div');
        notification.className = 'top-right-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle me-2"></i>
                ${message}
            </div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
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
                
                // Get current files and add new ones
                const currentFiles = Array.from(fileInput.files);
                const newFiles = Array.from(files);
                
                // Check if adding new files would exceed the limit
                const guestMaxMedia = window.eventDetailManager?.currentEvent?.guest_max_media_per_post || 3;
                if (currentFiles.length + newFiles.length > guestMaxMedia) {
                    if (window.eventDetailManager) {
                        window.eventDetailManager.showError(`Cannot add ${newFiles.length} files. You currently have ${currentFiles.length} files and maximum ${guestMaxMedia} files allowed.`, 'warning');
                    }
                    return;
                }
                
                // Combine current and new files
                const allFiles = [...currentFiles, ...newFiles];
                
                // Update the file input with combined files
                const dataTransfer = new DataTransfer();
                allFiles.forEach(file => dataTransfer.items.add(file));
                fileInput.files = dataTransfer.files;
                
                // Trigger the change event to process files
                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
                
                // Show success message
                if (window.eventDetailManager) {
                    window.eventDetailManager.showSuccess(`Successfully added ${newFiles.length} file(s)`);
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
