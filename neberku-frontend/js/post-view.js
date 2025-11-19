class PostView {
    constructor() {
        this.postId = this.getPostIdFromUrl();
        this.post = null;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Post View Page');
        if (this.postId) {
            this.loadPost();
        } else {
            this.showError('No post ID provided');
        }
    }

    getPostIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadPost() {
        try {
            console.log('📡 Loading post for ID:', this.postId);
            
            // Load without authentication (public view)
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POST_DETAIL.replace('{id}', this.postId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.post = await response.json();
                console.log('✅ Post loaded successfully:', this.post);
                this.renderPost();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error loading post:', errorData);
                
                // Check if it's a 401/403 error (authentication required)
                if (response.status === 401 || response.status === 403) {
                    this.showError('This post is not publicly available. It may require authentication or the post may not be approved yet.');
                } else if (response.status === 404) {
                    this.showError('Post not found. The post may have been removed or does not exist.');
                } else {
                    this.showError(`Unable to load post: ${errorData.detail || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.error('❌ Error loading post:', error);
            this.showError('Unable to load post. Please check your connection and try again.');
        }
    }

    renderPost() {
        if (!this.post) return;

        console.log('📝 Rendering post:', this.post);
        console.log('📅 Event data:', this.post.event);

        // Hide loading state
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('postContent').style.display = 'block';
        document.getElementById('shareButton').style.display = 'flex';

        // Guest name
        const guestName = this.post.guest?.name || 'Anonymous';
        document.getElementById('guestName').innerHTML = `<i class="bi bi-person-circle"></i> ${guestName}`;

        // Event title - check if event is an object or just an ID
        let eventTitle = 'Event';
        if (this.post.event) {
            if (typeof this.post.event === 'object' && this.post.event.title) {
                eventTitle = this.post.event.title;
            } else if (typeof this.post.event === 'string') {
                // Event is just an ID, use default
                eventTitle = 'Event';
            }
        }
        document.getElementById('eventTitle').textContent = eventTitle;

        // Post date
        document.getElementById('postDate').innerHTML = `<i class="bi bi-calendar3"></i> ${this.formatDate(this.post.created_at)}`;

        // Wish text
        const wishText = this.post.wish_text || 'No message provided';
        document.getElementById('wishText').textContent = wishText;

        // Render media files
        this.renderMediaFiles();

        // Event info - show if event is an object with details
        if (this.post.event && typeof this.post.event === 'object') {
            document.getElementById('eventInfo').style.display = 'block';
            document.getElementById('eventName').textContent = this.post.event.title || 'Event';
            document.getElementById('eventDescription').textContent = this.post.event.description || 'No description available';
        } else {
            // Hide event info if event is not available or just an ID
            document.getElementById('eventInfo').style.display = 'none';
        }

        // Update page title
        document.title = `Post by ${guestName} - ${eventTitle} - Neberku`;

        // Update meta description for sharing
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = `${guestName} shared: "${wishText.substring(0, 150)}..."`;
        }
    }

    renderMediaFiles() {
        const mediaGallery = document.getElementById('mediaGallery');
        
        if (!this.post.media_files || this.post.media_files.length === 0) {
            mediaGallery.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-image"></i>
                    <p>No media files in this post</p>
                </div>
            `;
            return;
        }

        // Filter only approved media files for public view
        const approvedMedia = this.post.media_files.filter(m => m.is_approved !== false);
        
        if (approvedMedia.length === 0) {
            mediaGallery.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-image"></i>
                    <p>No approved media files in this post</p>
                </div>
            `;
            return;
        }

        // Sort media: photos first, then videos, then voice
        // STRICT ORDERING: photos -> videos -> voice (voice NEVER first)
        const photos = [];
        const videos = [];
        const voices = [];
        
        approvedMedia.forEach(media => {
            const mediaType = String(media.media_type || '').toLowerCase().trim();
            if (mediaType === 'photo') {
                photos.push(media);
            } else if (mediaType === 'video') {
                videos.push(media);
            } else if (mediaType === 'voice') {
                voices.push(media);
            } else {
                console.warn('Unknown media type:', mediaType, media);
                // Default to photos for unknown types
                photos.push(media);
            }
        });
        
        // FORCE CORRECT ORDER: photos first, videos second, voices LAST
        // Create new array to ensure proper order
        const sortedMedia = [];
        
        // Add all photos first
        sortedMedia.push(...photos);
        
        // Add all videos second
        sortedMedia.push(...videos);
        
        // Add all voices LAST
        sortedMedia.push(...voices);
        
        // Final verification: ensure voice is NEVER first
        if (sortedMedia.length > 0) {
            const firstItem = sortedMedia[0];
            const firstType = String(firstItem.media_type || '').toLowerCase().trim();
            
            if (firstType === 'voice') {
                console.error('CRITICAL ERROR: Voice detected as first item!', {
                    firstItem,
                    allMedia: sortedMedia.map(m => ({ type: m.media_type, name: m.file_name }))
                });
                
                // Force reorder: remove all voices, add them at the end
                const allVoices = sortedMedia.filter(m => {
                    const type = String(m.media_type || '').toLowerCase().trim();
                    return type === 'voice';
                });
                const nonVoices = sortedMedia.filter(m => {
                    const type = String(m.media_type || '').toLowerCase().trim();
                    return type !== 'voice';
                });
                
                // Clear and rebuild
                sortedMedia.length = 0;
                sortedMedia.push(...nonVoices, ...allVoices);
                
                console.log('FORCED REORDER COMPLETE:', sortedMedia.map(m => ({ 
                    type: m.media_type, 
                    name: m.file_name 
                })));
            }
        }
        
        console.log('Final media order:', {
            photos: photos.length,
            videos: videos.length,
            voices: voices.length,
            total: sortedMedia.length,
            firstItem: sortedMedia[0] ? { type: sortedMedia[0].media_type, name: sortedMedia[0].file_name } : 'none',
            order: sortedMedia.map((m, idx) => `${idx + 1}. ${m.media_type} - ${m.file_name}`)
        });

        // Store media files for modal
        this.mediaFiles = sortedMedia;

        // Verify first item is a photo before building carousel
        if (sortedMedia.length > 0) {
            const firstType = String(sortedMedia[0].media_type || '').toLowerCase().trim();
            if (firstType === 'voice') {
                console.error('CRITICAL: First item is voice! Reordering immediately...');
                // Last resort: filter and reorder
                const photosOnly = sortedMedia.filter(m => String(m.media_type || '').toLowerCase().trim() === 'photo');
                const videosOnly = sortedMedia.filter(m => String(m.media_type || '').toLowerCase().trim() === 'video');
                const voicesOnly = sortedMedia.filter(m => String(m.media_type || '').toLowerCase().trim() === 'voice');
                sortedMedia.length = 0;
                sortedMedia.push(...photosOnly, ...videosOnly, ...voicesOnly);
                console.log('Emergency reorder complete:', sortedMedia.map(m => m.media_type));
            }
        }
        
        // Build carousel HTML
        const carouselId = 'post-media-carousel';
        const carouselItems = sortedMedia.map((media, index) => {
            const fullUrl = this.getFullUrl(media.media_file);
            // Only first item (should be photo) gets active class
            const activeClass = index === 0 ? 'active' : '';
            
            // Use case-insensitive comparison
            const mediaType = String(media.media_type || '').toLowerCase().trim();
            
            // Log if voice is being rendered as first item
            if (index === 0 && mediaType === 'voice') {
                console.error('ERROR: Voice item is being rendered as first carousel item!', media);
            }
            
            let mediaContent = '';
            let mediaLabel = '';
            let mediaIcon = '';

            if (mediaType === 'photo') {
                mediaContent = `<img src="${fullUrl}" alt="${media.file_name || 'Photo'}" loading="lazy">`;
                mediaLabel = 'Photo';
                mediaIcon = 'bi-image';
            } else if (mediaType === 'video') {
                mediaContent = `
                    <video controls>
                        <source src="${fullUrl}" type="${media.mime_type || 'video/mp4'}">
                        Your browser does not support the video tag.
                    </video>
                `;
                mediaLabel = 'Video';
                mediaIcon = 'bi-camera-video';
            } else if (mediaType === 'voice') {
                mediaContent = `
                    <audio controls>
                        <source src="${fullUrl}" type="${media.mime_type || 'audio/mpeg'}">
                        Your browser does not support the audio tag.
                    </audio>
                `;
                mediaLabel = 'Voice';
                mediaIcon = 'bi-mic';
            }

            const audioWrapperClass = mediaType === 'voice' ? 'audio-wrapper' : '';

            return `
                <div class="carousel-item ${activeClass} ${audioWrapperClass}">
                    ${mediaContent}
                </div>
            `;
        }).join('');

        const indicators = sortedMedia.length > 1 ? sortedMedia.map((_, idx) => `
            <button type="button"
                data-bs-target="#${carouselId}"
                data-bs-slide-to="${idx}"
                class="${idx === 0 ? 'active' : ''}"
                aria-current="${idx === 0 ? 'true' : 'false'}"
                aria-label="Slide ${idx + 1}">
            </button>
        `).join('') : '';

        const controls = sortedMedia.length > 1 ? `
            <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
            </button>
        ` : '';

        mediaGallery.innerHTML = `
            <div id="${carouselId}" class="carousel slide media-carousel" data-bs-interval="false" data-bs-touch="true" data-bs-wrap="true">
                ${indicators ? `<div class="carousel-indicators">${indicators}</div>` : ''}
                <div class="carousel-inner">
                    ${carouselItems}
                </div>
                ${controls}
            </div>
        `;

        // Initialize Bootstrap carousel after DOM insertion (manual control only, no auto-slide)
        setTimeout(() => {
            const carouselElement = document.getElementById(carouselId);
            if (carouselElement && sortedMedia.length > 1) {
                const carousel = new bootstrap.Carousel(carouselElement, {
                    interval: false,
                    ride: false,
                    touch: true,
                    wrap: true
                });
                carousel.to(0);
            }
        }, 100);
    }

    openMediaModal(index, type) {
        if (!this.mediaFiles || !this.mediaFiles[index]) return;

        const media = this.mediaFiles[index];
        const fullUrl = this.getFullUrl(media.media_file);

        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="mediaModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content" style="background: transparent; border: none;">
                        <div class="modal-header" style="border: none; justify-content: flex-end;">
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-0">
                            ${type === 'photo' ? 
                                `<img src="${fullUrl}" alt="${media.file_name || 'Photo'}" style="width: 100%; border-radius: 16px;">` :
                                `<video src="${fullUrl}" controls style="width: 100%; border-radius: 16px;">Your browser does not support the video tag.</video>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('mediaModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('mediaModal'));
        modal.show();

        // Clean up when modal is hidden
        document.getElementById('mediaModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    getFullUrl(relativePath) {
        if (!relativePath) return '';
        if (relativePath.startsWith('http')) return relativePath;
        return `${API_CONFIG.BASE_URL}${relativePath}`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        
        const errorMessage = document.querySelector('#errorState p');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }

    createDecorativeDots() {
        const dotsContainer = document.getElementById('decorativeDots');
        if (!dotsContainer) return;
        
        const colors = ['var(--confetti-1)', 'var(--confetti-2)', 'var(--confetti-3)', 'var(--primary-end)', 'var(--accent)'];
        
        for (let i = 0; i < 20; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.style.left = Math.random() * 100 + '%';
            dot.style.animationDelay = Math.random() * 15 + 's';
            dot.style.animationDuration = (10 + Math.random() * 10) + 's';
            dot.style.background = colors[Math.floor(Math.random() * colors.length)];
            dot.style.width = (3 + Math.random() * 3) + 'px';
            dot.style.height = dot.style.width;
            dotsContainer.appendChild(dot);
        }
    }
}

// Share function
function sharePost() {
    if (!window.postView || !window.postView.post) {
        return;
    }

    const post = window.postView.post;
    const shareUrl = window.location.href;
    const guestName = post.guest?.name || 'Guest';
    const wishText = post.wish_text ? post.wish_text.substring(0, 100) : 'Check out this post';
    const eventTitle = post.event?.title || 'Event';
    const shareText = `${guestName} shared: "${wishText}" - ${eventTitle}`;

    // Use Web Share API if available (mobile devices)
    if (navigator.share) {
        navigator.share({
            title: `Post by ${guestName} - ${eventTitle}`,
            text: shareText,
            url: shareUrl
        }).then(() => {
            console.log('Post shared successfully');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                copyPostLink();
            }
        });
    } else {
        // Fallback: copy link to clipboard
        copyPostLink();
    }
}

function copyPostLink() {
    const shareUrl = window.location.href;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        // Show success message
        const alert = document.createElement('div');
        alert.className = 'alert alert-success position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = '<i class="bi bi-check-circle"></i> Link copied to clipboard!';
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Link copied to clipboard!');
        } catch (err) {
            alert('Failed to copy link. Please copy manually: ' + shareUrl);
        }
        document.body.removeChild(textArea);
    });
}

function showShareSuccess() {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; background: linear-gradient(135deg, var(--confetti-2), var(--confetti-3)); border: none; color: white; font-weight: 600;';
    alert.innerHTML = '<i class="bi bi-check-circle-fill"></i> Shared successfully!';
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.3s';
        setTimeout(() => alert.remove(), 300);
    }, 2000);
}

// Share function
function sharePost() {
    if (!window.postView || !window.postView.post) {
        return;
    }

    const post = window.postView.post;
    const shareUrl = window.location.href;
    const guestName = post.guest?.name || 'Guest';
    const wishText = post.wish_text ? post.wish_text.substring(0, 100) : 'Check out this post';
    let eventTitle = 'Event';
    if (post.event && typeof post.event === 'object' && post.event.title) {
        eventTitle = post.event.title;
    }
    const shareText = `${guestName} shared: "${wishText}" - ${eventTitle}`;

    // Use Web Share API if available (mobile devices)
    if (navigator.share) {
        navigator.share({
            title: `Post by ${guestName} - ${eventTitle}`,
            text: shareText,
            url: shareUrl
        }).then(() => {
            console.log('Post shared successfully');
            showShareSuccess();
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                copyPostLink();
            }
        });
    } else {
        // Fallback: copy link to clipboard
        copyPostLink();
    }
}

function copyPostLink() {
    const shareUrl = window.location.href;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        showShareSuccess();
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showShareSuccess();
        } catch (err) {
            alert('Failed to copy link. Please copy manually: ' + shareUrl);
        }
        document.body.removeChild(textArea);
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.postView = new PostView();
    window.postView.createDecorativeDots();
});

