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

        mediaGallery.innerHTML = approvedMedia.map((media, index) => {
            const fullUrl = this.getFullUrl(media.media_file);
            const thumbnailUrl = media.media_thumbnail ? this.getFullUrl(media.media_thumbnail) : null;

            if (media.media_type === 'photo') {
                return `
                    <div class="media-item" onclick="postView.openMediaModal(${index}, 'photo')">
                        <img src="${fullUrl}" alt="${media.file_name || 'Photo'}" loading="lazy">
                        <span class="media-badge"><i class="bi bi-image"></i> Photo</span>
                    </div>
                `;
            } else if (media.media_type === 'video') {
                return `
                    <div class="media-item" onclick="postView.openMediaModal(${index}, 'video')">
                        ${thumbnailUrl ? 
                            `<img src="${thumbnailUrl}" alt="Video thumbnail">` :
                            `<video src="${fullUrl}" style="width: 100%; height: 100%; object-fit: cover;"></video>`
                        }
                        <span class="media-badge"><i class="bi bi-camera-video"></i> Video</span>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                            <i class="bi bi-play-circle-fill text-white" style="font-size: 3rem; text-shadow: 2px 2px 8px rgba(0,0,0,0.8);"></i>
                        </div>
                    </div>
                `;
            } else if (media.media_type === 'voice') {
                return `
                    <div class="media-item voice">
                        <div style="text-align: center; width: 100%;">
                            <i class="bi bi-mic" style="font-size: 3rem; color: var(--accent); margin-bottom: 1rem;"></i>
                            <p style="color: var(--ink); margin-bottom: 1rem;"><strong>Voice Recording</strong></p>
                            <audio controls style="width: 100%; max-width: 300px;">
                                <source src="${fullUrl}" type="${media.mime_type || 'audio/mp3'}">
                                Your browser does not support the audio tag.
                            </audio>
                        </div>
                    </div>
                `;
            }
            return '';
        }).join('');

        // Store media files for modal
        this.mediaFiles = approvedMedia;
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

