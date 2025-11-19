/**
 * Event Detail Guest JavaScript
 * Handles guest view of event details and contribution submission
 */

class EventDetailGuestManager {
    constructor() {
        this.currentEvent = null;
        this.selectedFiles = []; // Array to store all selected files
        this.mediaPermissions = {
            photos: true,
            videos: true,
            voice: true,
            wishes: true
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadEventFromURL();
        // Initialize submit button state
        this.updateSubmitButtonState();
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
                
                // The detailed validation will be done in handleFileSelection
                // This is just a quick check to prevent obviously too many files
                const makeValidationPerMedia = this.currentEvent?.make_validation_per_media ?? false;
                const maxPostsPerGuest = this.currentEvent?.max_posts_per_guest ?? 1;
                
                if (!makeValidationPerMedia) {
                    // Quick check: if total files exceed max_posts_per_guest, reject immediately
                    const currentTotal = this.selectedFiles.length;
                    if (currentTotal + newFiles.length > maxPostsPerGuest) {
                        this.showError(`Cannot select ${newFiles.length} files. Maximum ${maxPostsPerGuest} media file${maxPostsPerGuest !== 1 ? 's' : ''} allowed total.`, 'warning');
                        e.target.value = '';
                        return;
                    }
                } else {
                    // Quick check: if files exceed sum of all media type limits, reject immediately
                    const maxImages = this.currentEvent?.guest_max_image_per_post || 3;
                    const maxVideos = this.currentEvent?.guest_max_video_per_post || 3;
                    const maxVoice = this.currentEvent?.guest_max_voice_per_post || 3;
                    const maxCount = maxImages + maxVideos + maxVoice;
                    
                    if (this.selectedFiles.length + newFiles.length > maxCount) {
                        this.showError(`Cannot select ${newFiles.length} files. Maximum ${maxCount} files allowed (${maxImages} images, ${maxVideos} videos, ${maxVoice} voice).`, 'warning');
                        e.target.value = '';
                        return;
                    }
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

        // Apply media/wish permissions to the UI
        this.setMediaPermissions(event);

        // Update page title
        document.title = `${event.title} - Neberku`;
        
        // Update contributor count
        const joinCount = document.getElementById('joinCount');
        if (joinCount) {
            joinCount.textContent = event.total_guest_posts || 0;
        }
    }

    setMediaPermissions(event) {
        this.mediaPermissions = {
            photos: event?.allow_photos !== false,
            videos: event?.allow_videos !== false,
            voice: event?.allow_voice !== false,
            wishes: event?.allow_wishes !== false
        };
        this.updatePermissionUI();
    }

    canUploadAnyMedia() {
        return !!(
            this.mediaPermissions?.photos ||
            this.mediaPermissions?.videos ||
            this.mediaPermissions?.voice
        );
    }

    isMediaTypeAllowed(type) {
        if (!this.mediaPermissions) return true;
        switch (type) {
            case 'photo':
                return this.mediaPermissions.photos;
            case 'video':
                return this.mediaPermissions.videos;
            case 'voice':
                return this.mediaPermissions.voice;
            default:
                return true;
        }
    }

    getMediaLabel(type) {
        switch (type) {
            case 'photo':
                return 'Photos';
            case 'video':
                return 'Videos';
            case 'voice':
                return 'Voice';
            case 'wishes':
                return 'Wishes';
            default:
                return 'Media';
        }
    }

    updatePermissionUI() {
        const allowedMedia = [];
        const disabledMedia = [];

        const mediaKeys = [
            { key: 'photos', label: this.getMediaLabel('photo') },
            { key: 'videos', label: this.getMediaLabel('video') },
            { key: 'voice', label: this.getMediaLabel('voice') }
        ];
        mediaKeys.forEach(item => {
            if (this.mediaPermissions?.[item.key]) {
                allowedMedia.push(item.label);
            } else {
                disabledMedia.push(item.label);
            }
        });

        const maxImages = this.currentEvent?.guest_max_image_per_post ?? 3;
        const maxVideos = this.currentEvent?.guest_max_video_per_post ?? 2;
        const maxVoice = this.currentEvent?.guest_max_voice_per_post ?? 1;
        const uploadLimitText = document.getElementById('uploadLimitText');
        if (uploadLimitText) {
            const makeValidationPerMedia = this.currentEvent?.make_validation_per_media ?? false;
            const maxPostsPerGuest = this.currentEvent?.max_posts_per_guest ?? 1;
            
            let limitLine = '';
            
            if (!this.canUploadAnyMedia()) {
                limitLine = 'Media uploads are currently disabled for this event.';
            } else if (!makeValidationPerMedia) {
                // Show max_posts_per_guest as allowed post when validation is per guest
                limitLine = `You can upload up to <strong>${maxPostsPerGuest}</strong> post${maxPostsPerGuest !== 1 ? 's' : ''} (any combination of photos, videos, or voice recordings).`;
            } else {
                // Show per-media-type limits when validation is per media type
                const allowedLimitParts = [];
                if (this.mediaPermissions?.photos) {
                    allowedLimitParts.push(`<strong>${maxImages}</strong> image${maxImages === 1 ? '' : 's'}`);
                }
                if (this.mediaPermissions?.videos) {
                    allowedLimitParts.push(`<strong>${maxVideos}</strong> video${maxVideos === 1 ? '' : 's'}`);
                }
                if (this.mediaPermissions?.voice) {
                    allowedLimitParts.push(`<strong>${maxVoice}</strong> voice recording${maxVoice === 1 ? '' : 's'}`);
                }

                limitLine = allowedLimitParts.length
                    ? `You can upload up to ${allowedLimitParts.join(', ')} per post.`
                    : 'Media uploads are currently disabled for this event.';
            }

            uploadLimitText.innerHTML = limitLine;
        }

        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.toggle('disabled-upload', !this.canUploadAnyMedia());
        }

        const mediaFilesInput = document.getElementById('mediaFiles');
        if (mediaFilesInput) {
            mediaFilesInput.disabled = !this.canUploadAnyMedia();
        }

        const voiceSection = document.querySelector('.voice-recording-section');
        if (voiceSection) {
            voiceSection.style.display = this.mediaPermissions.voice ? '' : 'none';
        }

        this.updateWishFieldState();
        const shouldForceDisable = !this.canUploadAnyMedia() || !this.mediaPermissions.wishes;
        this.updateSubmitButtonState(shouldForceDisable);
    }

    updateWishFieldState() {
        const wishField = document.querySelector('.wish-field');
        const wishText = document.getElementById('wishText');
        const noticeId = 'wishPermissionNotice';
        let noticeElement = document.getElementById(noticeId);

        if (!this.mediaPermissions.wishes) {
            if (wishField) {
                wishField.classList.add('disabled-field');
            }
            if (wishText) {
                wishText.value = '';
                wishText.setAttribute('disabled', 'disabled');
            }
            if (!noticeElement && wishField && wishField.parentNode) {
                noticeElement = document.createElement('div');
                noticeElement.id = noticeId;
                noticeElement.className = 'alert alert-warning mt-2';
                noticeElement.innerHTML = `
                    <i class="fas fa-info-circle me-2"></i>
                    Wishes are disabled for this event. Contributions cannot be submitted until the host enables them.
                `;
                wishField.parentNode.insertBefore(noticeElement, wishField.nextSibling);
            }
        } else {
            if (wishField) {
                wishField.classList.remove('disabled-field');
            }
            if (wishText) {
                wishText.removeAttribute('disabled');
            }
            if (noticeElement) {
                noticeElement.remove();
            }
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
            const maxImagesPerPost = event.guest_max_image_per_post || 3;
            const maxVideosPerPost = event.guest_max_video_per_post || 3;
            const maxVoicePerPost = event.guest_max_voice_per_post || 3;
            const totalPerPost = maxImagesPerPost + maxVideosPerPost + maxVoicePerPost;
            
            packageLimitsElement.innerHTML = `
                ${maxPhotos} photos + ${maxVideos} videos total • ${maxImagesPerPost} images, ${maxVideosPerPost} videos, ${maxVoicePerPost} voice per post
            `;
        }
        
        // Update the upload area display
        const maxFilesDisplay = document.getElementById('maxFilesDisplay');
        if (maxFilesDisplay) {
            const maxImagesPerPost = event.guest_max_image_per_post || 3;
            const maxVideosPerPost = event.guest_max_video_per_post || 3;
            const maxVoicePerPost = event.guest_max_voice_per_post || 3;
            const totalPerPost = maxImagesPerPost + maxVideosPerPost + maxVoicePerPost;
            maxFilesDisplay.textContent = totalPerPost;
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
                    <video class="media-preview" muted preload="none" poster="${event.event_thumbnail || ''}" data-src="${event.event_video}">
                        <source data-src="${event.event_video}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-overlay">
                        <div class="play-button">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="video-duration" id="videoDuration">Click to load</div>
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
                let isLoaded = false;
                
                // Lazy load video when clicked
                const loadVideo = () => {
                    if (isLoaded) return;
                    
                    const videoSrc = video.getAttribute('data-src');
                    if (videoSrc) {
                        const source = video.querySelector('source');
                        source.src = videoSrc;
                        video.load();
                        isLoaded = true;
                        durationElement.textContent = 'Loading...';
                    }
                };
                
                // Get video duration when metadata loads
                video.addEventListener('loadedmetadata', () => {
                    const duration = video.duration;
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                });
                
                // Handle video loading errors
                video.addEventListener('error', () => {
                    durationElement.textContent = 'Error loading';
                    console.error('Video failed to load:', video.src);
                });
                
                // Add click to play functionality with lazy loading
                item.playVideo = () => {
                    loadVideo();
                    
                    if (video.paused) {
                        video.play().then(() => {
                            overlay.style.opacity = '0';
                            video.muted = false; // Unmute when playing
                        }).catch(error => {
                            console.error('Error playing video:', error);
                            durationElement.textContent = 'Click to play';
                        });
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
                
                // Hide overlay when video starts playing
                video.addEventListener('play', () => {
                    overlay.style.opacity = '0';
                });
                
                // Add click handler to the video item
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    item.playVideo();
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
        
        if (!this.canUploadAnyMedia()) {
            this.showError('Media uploads are disabled for this event.', 'warning');
            return;
        }

        let filesToAdd = Array.from(newFiles);
        console.log('Adding files to selection:', filesToAdd.length);

        const blockedTypeLabels = new Set();
        filesToAdd = filesToAdd.filter(file => {
            if (file.type.startsWith('image/')) {
                if (!this.isMediaTypeAllowed('photo')) {
                    blockedTypeLabels.add(this.getMediaLabel('photo'));
                    return false;
                }
            } else if (file.type.startsWith('video/')) {
                if (!this.isMediaTypeAllowed('video')) {
                    blockedTypeLabels.add(this.getMediaLabel('video'));
                    return false;
                }
            } else if (file.type.startsWith('audio/')) {
                if (!this.isMediaTypeAllowed('voice')) {
                    blockedTypeLabels.add(this.getMediaLabel('voice'));
                    return false;
                }
            }
            return true;
        });

        if (filesToAdd.length === 0) {
            const reason = blockedTypeLabels.size
                ? `${Array.from(blockedTypeLabels).join(', ')} uploads are disabled for this event.`
                : 'This event is not accepting media uploads right now.';
            this.showError(reason, 'warning');
            return;
        } else if (blockedTypeLabels.size > 0) {
            this.showError(`Skipped files: ${Array.from(blockedTypeLabels).join(', ')} are disabled for this event.`, 'warning');
        }
        
        // Check file sizes first (if size limits are available from API)
        const sizeErrors = [];
        
        if (this.currentEvent && (this.currentEvent.max_image_size || this.currentEvent.max_video_size || this.currentEvent.max_voice_size)) {
            filesToAdd.forEach(file => {
                if (file.type.startsWith('image/') && this.currentEvent.max_image_size) {
                    const maxSizeBytes = this.currentEvent.max_image_size * 1024 * 1024; // Convert MB to bytes
                    if (file.size > maxSizeBytes) {
                        sizeErrors.push(`${file.name}: Image too large (${this.formatFileSize(file.size)}). Maximum allowed: ${this.currentEvent.max_image_size}MB`);
                    }
                } else if (file.type.startsWith('video/') && this.currentEvent.max_video_size) {
                    const maxSizeBytes = this.currentEvent.max_video_size * 1024 * 1024; // Convert MB to bytes
                    if (file.size > maxSizeBytes) {
                        sizeErrors.push(`${file.name}: Video too large (${this.formatFileSize(file.size)}). Maximum allowed: ${this.currentEvent.max_video_size}MB`);
                    }
                } else if (file.type.startsWith('audio/') && this.currentEvent.max_voice_size) {
                    const maxSizeBytes = this.currentEvent.max_voice_size * 1024 * 1024; // Convert MB to bytes
                    if (file.size > maxSizeBytes) {
                        sizeErrors.push(`${file.name}: Audio too large (${this.formatFileSize(file.size)}). Maximum allowed: ${this.currentEvent.max_voice_size}MB`);
                    }
                }
            });
            
            if (sizeErrors.length > 0) {
                console.log('❌ File size validation failed:', sizeErrors);
                this.showError(`File size limit exceeded:\n${sizeErrors.join('\n')}`, 'warning');
                return;
            }
        }
        
        // Get validation settings from event
        const makeValidationPerMedia = this.currentEvent?.make_validation_per_media ?? false;
        const maxPostsPerGuest = this.currentEvent?.max_posts_per_guest ?? 1;
        
        // Count current and new files by type
        const currentImages = this.selectedFiles.filter(f => f.type.startsWith('image/')).length;
        const currentVideos = this.selectedFiles.filter(f => f.type.startsWith('video/')).length;
        const currentVoice = this.selectedFiles.filter(f => f.type.startsWith('audio/')).length;
        const currentTotal = this.selectedFiles.length;
        
        const newImages = filesToAdd.filter(f => f.type.startsWith('image/')).length;
        const newVideos = filesToAdd.filter(f => f.type.startsWith('video/')).length;
        const newVoice = filesToAdd.filter(f => f.type.startsWith('audio/')).length;
        const newTotal = filesToAdd.length;
        
        if (!makeValidationPerMedia) {
            // Validation per guest: allow any media type, total media files limited by max_posts_per_guest
            const totalAfterAdd = currentTotal + newTotal;
            
            if (totalAfterAdd > maxPostsPerGuest) {
                const remaining = maxPostsPerGuest - currentTotal;
                const message = remaining > 0 
                    ? `You can only upload ${maxPostsPerGuest} media file${maxPostsPerGuest !== 1 ? 's' : ''} total. You have already selected ${currentTotal} file${currentTotal !== 1 ? 's' : ''}, and you're trying to add ${newTotal} more. You can only add ${remaining} more file${remaining !== 1 ? 's' : ''}.`
                    : `You've already reached the maximum of ${maxPostsPerGuest} media file${maxPostsPerGuest !== 1 ? 's' : ''}.`;
                this.showError(message, 'warning');
                return;
            }
        } else {
            // Validation per media type: validate each media type separately
            const maxImages = this.currentEvent?.guest_max_image_per_post || 3;
            const maxVideos = this.currentEvent?.guest_max_video_per_post || 3;
            const maxVoice = this.currentEvent?.guest_max_voice_per_post || 3;
            
            // Validate each media type
            if (currentImages + newImages > maxImages) {
                const remaining = maxImages - currentImages;
                const message = remaining > 0 
                    ? `You can only upload ${maxImages} image${maxImages !== 1 ? 's' : ''} per post. You have already selected ${currentImages} image${currentImages !== 1 ? 's' : ''}, and you're trying to add ${newImages} more. You can only add ${remaining} more image${remaining !== 1 ? 's' : ''}.`
                    : `You've already reached the maximum of ${maxImages} image${maxImages !== 1 ? 's' : ''} per post.`;
                this.showError(message, 'warning');
                return;
            }
            
            if (currentVideos + newVideos > maxVideos) {
                const remaining = maxVideos - currentVideos;
                const message = remaining > 0 
                    ? `You can only upload ${maxVideos} video${maxVideos !== 1 ? 's' : ''} per post. You have already selected ${currentVideos} video${currentVideos !== 1 ? 's' : ''}, and you're trying to add ${newVideos} more. You can only add ${remaining} more video${remaining !== 1 ? 's' : ''}.`
                    : `You've already reached the maximum of ${maxVideos} video${maxVideos !== 1 ? 's' : ''} per post.`;
                this.showError(message, 'warning');
                return;
            }
            
            if (currentVoice + newVoice > maxVoice) {
                const remaining = maxVoice - currentVoice;
                const message = remaining > 0 
                    ? `You can only upload ${maxVoice} voice recording${maxVoice !== 1 ? 's' : ''} per post. You have already selected ${currentVoice} voice recording${currentVoice !== 1 ? 's' : ''}, and you're trying to add ${newVoice} more. You can only add ${remaining} more voice recording${remaining !== 1 ? 's' : ''}.`
                    : `You've already reached the maximum of ${maxVoice} voice recording${maxVoice !== 1 ? 's' : ''} per post.`;
                this.showError(message, 'warning');
                return;
            }
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
        
        // Update submit button state based on media files
        this.updateSubmitButtonState();
        
        let photoCount = 0;
        let videoCount = 0;
        let voiceCount = 0;
        
        this.selectedFiles.forEach((file, index) => {
            console.log(`Rendering file ${index}:`, file.name, file.type);
            const fileItem = document.createElement('div');
            fileItem.className = 'file-preview-item';
            
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            const isVoice = file.type.startsWith('audio/');
            
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
            } else if (isVoice) {
                previewContent = `
                    <div class="file-preview-icon">
                        <i class="fas fa-microphone"></i>
                    </div>
                `;
                voiceCount++;
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
        
        console.log(`Rendered ${this.selectedFiles.length} files. Photos: ${photoCount}, Videos: ${videoCount}, Voice: ${voiceCount}`);
        
        // Show summary
        if (this.selectedFiles.length > 0) {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'alert alert-primary mt-2';
            summaryDiv.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                <strong>Selected Files:</strong> ${this.selectedFiles.length} total 
                ${photoCount > 0 || videoCount > 0 || voiceCount > 0 ? '(' : ''}${photoCount > 0 ? `${photoCount} photo${photoCount !== 1 ? 's' : ''}` : ''}${photoCount > 0 && (videoCount > 0 || voiceCount > 0) ? ', ' : ''}${videoCount > 0 ? `${videoCount} video${videoCount !== 1 ? 's' : ''}` : ''}${(photoCount > 0 || videoCount > 0) && voiceCount > 0 ? ', ' : ''}${voiceCount > 0 ? `${voiceCount} voice recording${voiceCount !== 1 ? 's' : ''}` : ''}${photoCount > 0 || videoCount > 0 || voiceCount > 0 ? ')' : ''}
            `;
            fileList.appendChild(summaryDiv);
            
            // Show remaining file count - respect make_validation_per_media setting
            const makeValidationPerMedia = this.currentEvent?.make_validation_per_media ?? false;
            const maxPostsPerGuest = this.currentEvent?.max_posts_per_guest ?? 1;
            const maxImages = this.currentEvent?.guest_max_image_per_post || 3;
            const maxVideos = this.currentEvent?.guest_max_video_per_post || 3;
            const maxVoice = this.currentEvent?.guest_max_voice_per_post || 3;
            
            let remainingCount = 0;
            let limitMessage = '';
            let isLimitReached = false;
            
            if (!makeValidationPerMedia) {
                // When validation is per guest, use max_posts_per_guest
                remainingCount = maxPostsPerGuest - this.selectedFiles.length;
                isLimitReached = remainingCount <= 0;
                // Always show remaining count format
                limitMessage = `You can add ${remainingCount} more file${remainingCount !== 1 ? 's' : ''} (${this.selectedFiles.length}/${maxPostsPerGuest} selected)`;
            } else {
                // When validation is per media type, calculate remaining per type
                const remainingImages = maxImages - photoCount;
                const remainingVideos = maxVideos - videoCount;
                const remainingVoice = maxVoice - voiceCount;
                
                // Check if all limits are reached
                isLimitReached = remainingImages <= 0 && remainingVideos <= 0 && remainingVoice <= 0;
                
                if (isLimitReached) {
                    limitMessage = `Maximum file limit reached (${maxImages} images, ${maxVideos} videos, ${maxVoice} voice)`;
                } else {
                    // Show remaining per type (only show types that still have capacity)
                    const remainingParts = [];
                    const limitReachedParts = [];
                    
                    if (remainingImages <= 0) {
                        limitReachedParts.push(`images (${maxImages} max)`);
                    } else {
                        remainingParts.push(`${remainingImages} image${remainingImages !== 1 ? 's' : ''}`);
                    }
                    
                    if (remainingVideos <= 0) {
                        limitReachedParts.push(`videos (${maxVideos} max)`);
                    } else {
                        remainingParts.push(`${remainingVideos} video${remainingVideos !== 1 ? 's' : ''}`);
                    }
                    
                    if (remainingVoice <= 0) {
                        limitReachedParts.push(`voice recordings (${maxVoice} max)`);
                    } else {
                        remainingParts.push(`${remainingVoice} voice recording${remainingVoice !== 1 ? 's' : ''}`);
                    }
                    
                    // Build message showing both reached limits and remaining capacity
                    const messageParts = [];
                    if (limitReachedParts.length > 0) {
                        messageParts.push(`Limit reached: ${limitReachedParts.join(', ')}`);
                    }
                    if (remainingParts.length > 0) {
                        messageParts.push(`You can add: ${remainingParts.join(', ')}`);
                    }
                    
                    if (messageParts.length > 0) {
                        limitMessage = messageParts.join('. ');
                        remainingCount = 1; // Set to 1 to show the message
                    } else {
                        limitMessage = `Maximum file limit reached`;
                        remainingCount = 0;
                    }
                }
            }
            
            // Show appropriate message based on limit status
            if (limitMessage) {
                // Determine alert style and icon based on limit status
                const alertClass = (isLimitReached || remainingCount === 0 || limitMessage.includes('Limit reached')) ? 'alert-warning' : 'alert-success';
                const icon = (isLimitReached || remainingCount === 0 || limitMessage.includes('Limit reached')) ? 'fa-exclamation-triangle' : 'fa-plus-circle';
                
                const messageDiv = document.createElement('div');
                messageDiv.className = `alert ${alertClass} mt-2`;
                messageDiv.innerHTML = `
                    <i class="fas ${icon} me-2"></i>
                    <strong>${limitMessage}</strong>
                `;
                fileList.appendChild(messageDiv);
            }
        }
    }

    async submitContribution() {
        this.clearErrors();
        
        // Validate form data
        const guestName = document.getElementById('guestName').value.trim();
        const guestPhone = document.getElementById('guestPhone').value.trim();
        const wishText = document.getElementById('wishText').value.trim();
        const wishesAllowed = this.mediaPermissions?.wishes !== false;
        
        if (!wishesAllowed) {
            this.showError('This event is not accepting wishes right now. Please contact the event host for access.', 'warning');
            return;
        }
        
        if (!guestName || !guestPhone || (wishesAllowed && !wishText)) {
            this.showError('Please fill in all required fields', 'warning');
            return;
        }

        if (!this.canUploadAnyMedia()) {
            this.showError('Media uploads are disabled for this event.', 'warning');
            return;
        }
        
        // Check if at least one media file is selected
        if (this.selectedFiles.length === 0) {
            this.showError('At least one media file (photo, video, or voice recording) is required', 'warning');
            return;
        }
        
        // Validate media files - use new separate limits
        const maxImages = this.currentEvent.guest_max_image_per_post || 3;
        const maxVideos = this.currentEvent.guest_max_video_per_post || 3;
        const maxVoice = this.currentEvent.guest_max_voice_per_post || 3;
        const guestMaxMediaPerPost = maxImages + maxVideos + maxVoice;
        
        if (this.selectedFiles.length > guestMaxMediaPerPost) {
            this.showError(`Maximum ${guestMaxMediaPerPost} media files allowed per contribution (${maxImages} images, ${maxVideos} videos, ${maxVoice} voice)`, 'warning');
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
        let voiceCount = 0;
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            if (file.type.startsWith('image/')) {
                formData.append('photos', file);
                photoCount++;
            } else if (file.type.startsWith('video/')) {
                formData.append('videos', file);
                videoCount++;
            } else if (file.type.startsWith('audio/')) {
                formData.append('voice_recordings', file);
                voiceCount++;
            }
        }
        
        // Show upload summary
        if (this.selectedFiles.length > 0) {
            this.showTopRightSuccess(`Uploading ${this.selectedFiles.length} files (${photoCount} photos, ${videoCount} videos, ${voiceCount} voice recordings)...`);
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
                // Hide the "Uploading..." notification
                this.hideTopRightNotification();
                
                // Extract error message from API response
                let errorMessage = 'Failed to submit contribution. Please try again.';
                
                // Check if data is an array (some APIs return errors as arrays)
                if (Array.isArray(data) && data.length > 0) {
                    // If it's an array, use the first element or join all elements
                    errorMessage = typeof data[0] === 'string' ? data[0] : data.map(err => typeof err === 'string' ? err : JSON.stringify(err)).join('. ');
                } else if (data.error) {
                    errorMessage = data.error;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.message) {
                    errorMessage = data.message;
                } else if (data.errors) {
                    // Handle field-specific errors - combine them into one message
                    const errorMessages = [];
                    Object.keys(data.errors).forEach(field => {
                        const fieldErrors = data.errors[field];
                        if (Array.isArray(fieldErrors)) {
                            fieldErrors.forEach(error => {
                                errorMessages.push(`${field}: ${error}`);
                            });
                        } else {
                            errorMessages.push(`${field}: ${fieldErrors}`);
                        }
                    });
                    errorMessage = errorMessages.join('. ');
                }
                
                // Show error in top-right notification (stays for 10 seconds)
                this.showTopRightError(errorMessage);
                // Also show error in the error container
                this.showError(errorMessage, 'danger');
            }
        } catch (error) {
            console.error('Error submitting contribution:', error);
            // Hide the "Uploading..." notification
            this.hideTopRightNotification();
            // Show error in top-right notification
            const errorMsg = error.message || 'Error submitting contribution. Please try again.';
            this.showTopRightError(errorMsg);
            // Also show error in the error container
            this.showError(errorMsg, 'danger');
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

        // Auto-remove after 10 seconds (longer so user can read the error message)
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
                // Hide container if no more errors
                if (errorContainer.children.length === 0) {
                    errorContainer.style.display = 'none';
                }
            }
        }, 10000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    addVoiceFileToFiles(audioFile) {
        console.log('=== VOICE FILE ADDITION DEBUG ===');
        console.log('Adding voice file to files:', audioFile.name);
        console.log('Audio file details:', {
            name: audioFile.name,
            size: audioFile.size,
            type: audioFile.type
        });

        if (!this.isMediaTypeAllowed('voice')) {
            this.showError('Voice recordings are disabled for this event.', 'warning');
            return;
        }
        if (!this.canUploadAnyMedia()) {
            this.showError('Media uploads are disabled for this event.', 'warning');
            return;
        }
        
        // Check file size first (if size limits are available from API)
        if (this.currentEvent && this.currentEvent.max_voice_size && audioFile.size > (this.currentEvent.max_voice_size * 1024 * 1024)) {
            const message = `${audioFile.name}: Audio too large (${this.formatFileSize(audioFile.size)}). Maximum allowed: ${this.currentEvent.max_voice_size}MB`;
            console.log('❌ Voice file size exceeded:', message);
            this.showError(message, 'warning');
            return;
        }
        
        // Check voice limit before adding
        const currentVoiceFiles = this.selectedFiles ? this.selectedFiles.filter(f => f.type.startsWith('audio/')).length : 0;
        const maxVoicePerPost = this.currentEvent?.guest_max_voice_per_post || 3;
        
        if (currentVoiceFiles >= maxVoicePerPost) {
            const message = `You've already reached the maximum of ${maxVoicePerPost} voice recordings.`;
            console.log('❌ Voice limit exceeded:', message);
            this.showError(message, 'warning');
            return;
        }
        
        // Add the voice file to selectedFiles
        this.selectedFiles.push(audioFile);
        console.log('✅ Voice file added successfully. Total files:', this.selectedFiles.length);
        
        // Update the file input to reflect all selected files
        this.updateFileInput();
        
        // Render all files
        this.renderFilePreviews();
    }

    updateSubmitButtonState(forceDisabled = false) {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        
        const hasMediaFiles = this.selectedFiles && this.selectedFiles.length > 0;
        const canUploadMedia = this.canUploadAnyMedia();
        const wishesAllowed = this.mediaPermissions?.wishes !== false;
        const shouldEnable = !forceDisabled && canUploadMedia && wishesAllowed && hasMediaFiles;
        
        if (shouldEnable) {
            // Enable submit button
            submitBtn.disabled = false;
            submitBtn.classList.remove('disabled');
            submitBtn.title = 'Ready to submit your contribution';
            
            // Update button text to show file count
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                const fileCount = this.selectedFiles.length;
                btnText.innerHTML = `
                    <i class="fas fa-heart"></i>
                    Share Your Moment (${fileCount} file${fileCount !== 1 ? 's' : ''})
                `;
            }
        } else {
            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.classList.add('disabled');
            if (!canUploadMedia) {
                submitBtn.title = 'Media uploads are disabled for this event';
            } else if (!wishesAllowed) {
                submitBtn.title = 'Wishes are disabled for this event';
            } else {
                submitBtn.title = 'Please add at least one media file (photo, video, or voice recording)';
            }
            
            // Reset button text
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.innerHTML = `
                    <i class="fas fa-heart"></i>
                    Share Your Moment
                `;
            }
        }
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showTopRightSuccess(message) {
        // Use the existing notification element in the HTML
        const notification = document.getElementById('topRightNotification');
        const messageElement = document.getElementById('notificationMessage');
        
        if (notification && messageElement) {
            // Ensure success styling (green)
            notification.style.background = 'linear-gradient(135deg, rgba(34,197,94,.95), rgba(22,163,74,.95))';
            notification.style.borderColor = 'rgba(34,197,94,.3)';
            notification.style.boxShadow = '0 10px 30px rgba(34,197,94,.3)';
            
            messageElement.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
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

    hideTopRightNotification() {
        const notification = document.getElementById('topRightNotification');
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }
    }

    showTopRightError(message) {
        // Use the existing notification element in the HTML
        const notification = document.getElementById('topRightNotification');
        const messageElement = document.getElementById('notificationMessage');
        
        if (notification && messageElement) {
            // Change to error styling
            notification.style.background = 'linear-gradient(135deg, rgba(239,68,68,.95), rgba(220,38,38,.95))';
            notification.style.borderColor = 'rgba(239,68,68,.3)';
            notification.style.boxShadow = '0 10px 30px rgba(239,68,68,.3)';
            
            messageElement.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
            notification.style.display = 'block';
            
            // Animate in
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Auto-remove after 10 seconds (longer for errors so user can read)
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.style.display = 'none';
                    // Reset to success styling
                    notification.style.background = 'linear-gradient(135deg, rgba(34,197,94,.95), rgba(22,163,74,.95))';
                    notification.style.borderColor = 'rgba(34,197,94,.3)';
                    notification.style.boxShadow = '0 10px 30px rgba(34,197,94,.3)';
                }, 300);
            }, 10000);
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
    // Make eventDetailManager globally accessible for voice recording
    window.eventDetailManager = eventDetailManager;
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
        // Show loading state
        modalTitle.textContent = 'Loading Video...';
        modalDescription.textContent = 'Please wait while the video loads';
        
        // Determine video type from file extension
        const videoType = getVideoType(videoSrc);
        
        // Update the source element
        const sourceElement = modalVideo.querySelector('source');
        sourceElement.src = videoSrc;
        sourceElement.type = videoType;
        
        // Add loading event listeners
        const handleLoadedData = () => {
            modalTitle.textContent = title;
            modalDescription.textContent = description;
            modalVideo.removeEventListener('loadeddata', handleLoadedData);
        };
        
        const handleError = () => {
            modalTitle.textContent = 'Error Loading Video';
            modalDescription.textContent = 'Unable to load the video. Please try again.';
            modalVideo.removeEventListener('error', handleError);
        };
        
        modalVideo.addEventListener('loadeddata', handleLoadedData);
        modalVideo.addEventListener('error', handleError);
        
        modalVideo.load(); // Reload the video element
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Auto-play the video in modal (with error handling)
        modalVideo.play().catch(error => {
            console.log('Autoplay prevented by browser:', error);
            modalDescription.textContent = 'Click the play button to start the video';
        });
    }
}

// Helper function to determine video MIME type
function getVideoType(videoSrc) {
    const extension = videoSrc.split('.').pop().toLowerCase();
    const typeMap = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'ogv': 'video/ogg',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'mkv': 'video/x-matroska'
    };
    return typeMap[extension] || 'video/mp4';
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
