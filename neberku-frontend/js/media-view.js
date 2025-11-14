class MediaView {
    constructor() {
        this.postId = this.getPostIdFromUrl();
        this.mediaId = this.getMediaIdFromUrl();
        this.post = null;
        this.media = null;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Media View Page');
        console.log('📋 Post ID:', this.postId);
        console.log('📋 Media ID:', this.mediaId);
        
        if (this.postId && this.mediaId) {
            this.loadPostAndMedia();
        } else {
            this.showError('Post ID or Media ID not provided');
        }
    }

    getPostIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('post');
    }

    getMediaIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('media');
    }

    async loadPostAndMedia() {
        try {
            console.log('📡 Loading post and media');
            
            // Load post without authentication (public view)
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POST_DETAIL.replace('{id}', this.postId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.post = await response.json();
                console.log('✅ Post loaded successfully:', this.post);
                
                // Find the specific media item
                if (this.post.media_files && this.post.media_files.length > 0) {
                    this.media = this.post.media_files.find(m => m.id === this.mediaId);
                    
                    if (this.media) {
                        console.log('✅ Media found:', this.media);
                        this.renderMedia();
                    } else {
                        this.showError('Media item not found in this post');
                    }
                } else {
                    this.showError('No media files found in this post');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error loading post:', errorData);
                
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
            this.showError('Unable to load media. Please check your connection and try again.');
        }
    }

    renderMedia() {
        if (!this.post || !this.media) return;

        console.log('📝 Rendering media:', this.media);

        // Hide loading state
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('mediaContent').style.display = 'block';
        document.getElementById('shareButton').style.display = 'flex';

        // Guest name
        const guestName = this.post.guest?.name || 'Anonymous';
        document.getElementById('guestName').innerHTML = `<i class="bi bi-person-circle"></i> ${guestName}`;

        // Event title
        let eventTitle = 'Event';
        if (this.post.event && typeof this.post.event === 'object' && this.post.event.title) {
            eventTitle = this.post.event.title;
        }
        document.getElementById('eventTitle').textContent = eventTitle;

        // Media date
        document.getElementById('mediaDate').innerHTML = `<i class="bi bi-calendar3"></i> ${this.formatDate(this.post.created_at)}`;

        // Wish text
        const wishText = this.post.wish_text || 'No message provided';
        document.getElementById('wishText').textContent = wishText;

        // Render media
        this.renderMediaDisplay();

        // Event info
        if (this.post.event && typeof this.post.event === 'object') {
            document.getElementById('eventInfo').style.display = 'block';
            document.getElementById('eventName').textContent = this.post.event.title || 'Event';
            document.getElementById('eventDescription').textContent = this.post.event.description || 'No description available';
        }

        // Update page title
        const mediaTypeName = this.media.media_type === 'photo' ? 'Photo' : 
                             this.media.media_type === 'video' ? 'Video' : 'Voice Recording';
        document.title = `${mediaTypeName} by ${guestName} - ${eventTitle} - Neberku`;

        // Update meta description for sharing
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = `${guestName} shared a ${this.media.media_type} from ${eventTitle}`;
        }
    }

    renderMediaDisplay() {
        const mediaDisplay = document.getElementById('mediaDisplay');
        const fullUrl = this.getFullUrl(this.media.media_file);
        const thumbnailUrl = this.media.media_thumbnail ? this.getFullUrl(this.media.media_thumbnail) : null;

        let mediaTypeName = '';
        let mediaIcon = '';
        
        if (this.media.media_type === 'photo') {
            mediaTypeName = 'Photo';
            mediaIcon = 'bi-image';
            mediaDisplay.className = 'media-display';
            mediaDisplay.innerHTML = `
                <img src="${fullUrl}" alt="${this.media.file_name || 'Photo'}" loading="lazy">
                <div class="media-type-badge">
                    <i class="bi ${mediaIcon}"></i> ${mediaTypeName}
                </div>
            `;
        } else if (this.media.media_type === 'video') {
            mediaTypeName = 'Video';
            mediaIcon = 'bi-camera-video';
            mediaDisplay.className = 'media-display';
            mediaDisplay.innerHTML = `
                <video controls style="width: 100%;">
                    <source src="${fullUrl}" type="${this.media.mime_type || 'video/mp4'}">
                    Your browser does not support the video tag.
                </video>
                <div class="media-type-badge">
                    <i class="bi ${mediaIcon}"></i> ${mediaTypeName}
                </div>
            `;
        } else if (this.media.media_type === 'voice') {
            mediaTypeName = 'Voice Recording';
            mediaIcon = 'bi-mic';
            mediaDisplay.className = 'media-display voice';
            mediaDisplay.innerHTML = `
                <i class="bi ${mediaIcon}"></i>
                <p style="color: var(--ink); margin-bottom: 2rem; font-size: 1.2rem;"><strong>Voice Recording</strong></p>
                <audio controls>
                    <source src="${fullUrl}" type="${this.media.mime_type || 'audio/mp3'}">
                    Your browser does not support the audio tag.
                </audio>
            `;
        }
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
function shareMedia() {
    if (!window.mediaView || !window.mediaView.post || !window.mediaView.media) {
        return;
    }

    const post = window.mediaView.post;
    const media = window.mediaView.media;
    const shareUrl = window.location.href;
    const guestName = post.guest?.name || 'Guest';
    const wishText = post.wish_text ? post.wish_text.substring(0, 100) : 'Check out this media';
    let eventTitle = 'Event';
    if (post.event && typeof post.event === 'object' && post.event.title) {
        eventTitle = post.event.title;
    }
    
    const mediaTypeName = media.media_type === 'photo' ? 'photo' : 
                         media.media_type === 'video' ? 'video' : 'voice recording';
    const shareText = `${guestName} shared a ${mediaTypeName} from ${eventTitle}`;

    // Use Web Share API if available (mobile devices)
    if (navigator.share) {
        navigator.share({
            title: `${mediaTypeName.charAt(0).toUpperCase() + mediaTypeName.slice(1)} by ${guestName} - ${eventTitle}`,
            text: shareText,
            url: shareUrl
        }).then(() => {
            console.log('Media shared successfully');
            showShareSuccess();
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                copyMediaLink();
            }
        });
    } else {
        // Fallback: copy link to clipboard
        copyMediaLink();
    }
}

function copyMediaLink() {
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.mediaView = new MediaView();
    window.mediaView.createDecorativeDots();
});

