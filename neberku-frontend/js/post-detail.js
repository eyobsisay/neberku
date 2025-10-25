class PostDetail {
    constructor() {
        this.postId = this.getPostIdFromUrl();
        this.post = null;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Post Detail Page');
        this.checkAuth();
        if (this.postId) {
            this.loadPostDetail();
        } else {
            this.showError('No post ID provided');
        }
    }

    getPostIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    checkAuth() {
        const user = localStorage.getItem('neberku_user');
        if (!user) {
            console.log('❌ No user data found, redirecting to login');
            window.location.replace('login.html');
            return;
        }
        console.log('✅ User authenticated');
    }

    async loadPostDetail() {
        try {
            console.log('📡 Loading post details for ID:', this.postId);
            
            // Get JWT token for authentication
            const token = localStorage.getItem('neberku_access_token');
            if (!token) {
                console.error('❌ No JWT token found, cannot load post details');
                this.showError('Authentication token not found. Please log in again.');
                setTimeout(() => {
                    window.location.replace('login.html');
                }, 3000);
                return;
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POST_DETAIL.replace('{id}', this.postId)}`, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                this.post = await response.json();
                console.log('✅ Post loaded successfully:', this.post);
                this.renderPostDetail();
            } else {
                const errorData = await response.json();
                console.error('❌ Error loading post:', errorData);
                this.showError(`Error loading post: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error loading post:', error);
            this.showError('Unable to load post details. Please check your connection and try again.');
        }
    }

    renderPostDetail() {
        if (!this.post) return;

        // Post header
        document.getElementById('postTitle').textContent = `Post by ${this.post.guest?.name || 'Unknown Guest'}`;
        document.getElementById('postDate').textContent = this.formatDate(this.post.created_at);
        
        const statusBadge = document.getElementById('postStatus');
        if (this.post.is_approved) {
            statusBadge.textContent = 'Approved';
            statusBadge.className = 'badge bg-success status-badge';
        } else {
            statusBadge.textContent = 'Pending Approval';
            statusBadge.className = 'badge bg-warning status-badge';
        }

        // Guest information
        document.getElementById('guestName').textContent = this.post.guest?.name || 'Unknown';
        document.getElementById('guestPhone').textContent = this.post.guest?.phone || 'Unknown';
        document.getElementById('totalPosts').textContent = this.post.guest?.total_posts || '0';
        document.getElementById('totalMedia').textContent = this.post.total_media_files || '0';

        // Post content
        document.getElementById('wishText').textContent = this.post.wish_text || 'No content';

        // Event information - removed since Event Details section was removed from HTML

        // Post statistics
        document.getElementById('createdAt').textContent = this.formatDate(this.post.created_at);
        document.getElementById('approvedAt').textContent = this.post.approved_at ? this.formatDate(this.post.approved_at) : 'Not approved yet';
        
        // Calculate total file size
        const totalSize = this.calculateTotalFileSize();
        document.getElementById('totalFileSize').textContent = this.formatFileSize(totalSize);

        // Media files
        this.renderMediaFiles();

        // Show/hide action buttons based on user permissions
        this.setupActionButtons();
    }

    renderMediaFiles() {
        const mediaGallery = document.getElementById('mediaGallery');
        const photoCount = document.getElementById('photoCount');
        const videoCount = document.getElementById('videoCount');
        const voiceCount = document.getElementById('voiceCount');

        if (!this.post.media_files || this.post.media_files.length === 0) {
            mediaGallery.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-image" style="font-size: 2rem;"></i>
                    <p>No media files uploaded</p>
                </div>
            `;
            photoCount.textContent = '0';
            videoCount.textContent = '0';
            voiceCount.textContent = '0';
            return;
        }

        // Count photos, videos, and voice recordings
        const photos = this.post.media_files.filter(m => m.media_type === 'photo');
        const videos = this.post.media_files.filter(m => m.media_type === 'video');
        const voices = this.post.media_files.filter(m => m.media_type === 'voice');
        
        // Count approved and pending media files
        const approvedMedia = this.post.media_files.filter(m => m.is_approved);
        const pendingMedia = this.post.media_files.filter(m => !m.is_approved);
        
        photoCount.textContent = photos.length;
        videoCount.textContent = videos.length;
        voiceCount.textContent = voices.length;
        
        // Update approval count elements
        document.getElementById('approvedCount').textContent = approvedMedia.length;
        document.getElementById('pendingCount').textContent = pendingMedia.length;

        // Render media gallery
        let galleryHTML = '';
        
        this.post.media_files.forEach(media => {
            // Create approval status badge
            const approvalBadge = media.is_approved 
                ? '<span class="media-approval-badge bg-success"><i class="bi bi-check-circle"></i> Approved</span>'
                : '<span class="media-approval-badge bg-warning"><i class="bi bi-clock"></i> Pending</span>';
            
            if (media.media_type === 'photo') {
                galleryHTML += `
                    <div class="media-item">
                        <div style="position: relative;">
                            <img src="${media.media_file}" alt="${media.file_name}" 
                                 onclick="openMediaModal('${media.media_file}', '${media.file_name}', 'photo')">
                            <div style="position: absolute; top: 8px; left: 8px;">
                                ${approvalBadge}
                            </div>
                        </div>
                        <div class="media-info">
                            <small class="text-muted">${media.file_name}</small>
                            <br>
                            <small class="text-muted">${this.formatFileSize(media.file_size)}</small>
                        </div>
                    </div>
                `;
            } else if (media.media_type === 'video') {
                galleryHTML += `
                    <div class="media-item">
                        <div style="position: relative;">
                            <video controls>
                                <source src="${media.media_file}" type="${media.mime_type || 'video/mp4'}">
                                Your browser does not support the video tag.
                            </video>
                            <div style="position: absolute; top: 8px; left: 8px;">
                                ${approvalBadge}
                            </div>
                        </div>
                        <div class="media-info">
                            <small class="text-muted">${media.file_name}</small>
                            <br>
                            <small class="text-muted">${this.formatFileSize(media.file_size)}</small>
                        </div>
                    </div>
                `;
            } else if (media.media_type === 'voice') {
                galleryHTML += `
                    <div class="media-item">
                        <div style="position: relative;">
                            <div class="voice-preview-container" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 150px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 15px; position: relative; overflow: hidden; border: 2px solid #2196f3;">
                                <div class="voice-waveform" style="display: flex; align-items: center; justify-content: center; gap: 2px; position: absolute; left: 8px; top: 50%; transform: translateY(-50%);">
                                    <div class="wave-bar" style="width: 2px; background: #1976d2; border-radius: 1px; animation: wave 1.5s ease-in-out infinite; height: 8px; animation-delay: 0s;"></div>
                                    <div class="wave-bar" style="width: 2px; background: #1976d2; border-radius: 1px; animation: wave 1.5s ease-in-out infinite; height: 12px; animation-delay: 0.1s;"></div>
                                    <div class="wave-bar" style="width: 2px; background: #1976d2; border-radius: 1px; animation: wave 1.5s ease-in-out infinite; height: 16px; animation-delay: 0.2s;"></div>
                                    <div class="wave-bar" style="width: 2px; background: #1976d2; border-radius: 1px; animation: wave 1.5s ease-in-out infinite; height: 12px; animation-delay: 0.3s;"></div>
                                    <div class="wave-bar" style="width: 2px; background: #1976d2; border-radius: 1px; animation: wave 1.5s ease-in-out infinite; height: 8px; animation-delay: 0.4s;"></div>
                                </div>
                                <div class="voice-icon" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); color: #1976d2; font-size: 12px; z-index: 2;">
                                    <i class="bi bi-mic"></i>
                                </div>
                                <audio controls style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 90%;">
                                    <source src="${media.media_file}" type="${media.mime_type || 'audio/mp3'}">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            <div style="position: absolute; top: 8px; left: 8px;">
                                ${approvalBadge}
                            </div>
                        </div>
                        <div class="media-info">
                            <small class="text-muted">${media.file_name}</small>
                            <br>
                            <small class="text-muted">${this.formatFileSize(media.file_size)}</small>
                        </div>
                    </div>
                `;
            }
        });

        mediaGallery.innerHTML = galleryHTML;
    }

    setupActionButtons() {
        const approveBtn = document.getElementById('approveBtn');
        const rejectBtn = document.getElementById('rejectBtn');

        // Only show action buttons if post is not approved and user is event host
        if (!this.post.is_approved) {
            approveBtn.style.display = 'block';
            rejectBtn.style.display = 'block';
        } else {
            approveBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
        }
    }

    async approvePost() {
        if (!confirm('Are you sure you want to approve this post?')) return;

        try {
            console.log('✅ Approving post:', this.postId);
            
            // Get JWT token for authentication
            const token = localStorage.getItem('neberku_access_token');
            if (!token) {
                console.error('❌ No JWT token found, cannot approve post');
                this.showError('Authentication token not found. Please log in again.');
                return;
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POST_DETAIL.replace('{id}', this.postId)}/approve/`, {
                method: 'POST',
                headers: headers
            });

            if (response.ok) {
                console.log('✅ Post approved successfully');
                this.showSuccess('Post approved successfully!');
                this.post.is_approved = true;
                this.renderPostDetail();
            } else {
                const errorData = await response.json();
                console.error('❌ Error approving post:', errorData);
                this.showError(`Error approving post: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error approving post:', error);
            this.showError('Unable to approve post. Please check your connection and try again.');
        }
    }

    async rejectPost() {
        if (!confirm('Are you sure you want to reject this post? This action cannot be undone.')) return;

        try {
            console.log('❌ Rejecting post:', this.postId);
            
            // Get JWT token for authentication
            const token = localStorage.getItem('neberku_access_token');
            if (!token) {
                console.error('❌ No JWT token found, cannot reject post');
                this.showError('Authentication token not found. Please log in again.');
                return;
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUEST_POST_DETAIL.replace('{id}', this.postId)}/reject/`, {
                method: 'POST',
                headers: headers
            });

            if (response.ok) {
                console.log('✅ Post rejected successfully');
                this.showSuccess('Post rejected successfully!');
                this.post.is_approved = false;
                this.renderPostDetail();
            } else {
                const errorData = await response.json();
                console.error('❌ Error rejecting post:', errorData);
                this.showError(`Error rejecting post: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error rejecting post:', error);
            this.showError('Unable to reject post. Please check your connection and try again.');
        }
    }

    downloadMedia() {
        if (!this.post.media_files || this.post.media_files.length === 0) {
            this.showError('No media files to download');
            return;
        }

        console.log('📥 Downloading media files...');
        
        // Create a zip file with all media files
        this.post.media_files.forEach((media, index) => {
            const link = document.createElement('a');
            link.href = media.media_file;
            link.download = media.file_name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        this.showSuccess('Download started for all media files');
    }

    calculateTotalFileSize() {
        if (!this.post.media_files) return 0;
        return this.post.media_files.reduce((total, media) => total + (media.file_size || 0), 0);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    showSuccess(message) {
        // Create a temporary success alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 3000);
    }

    showError(message) {
        // Create a temporary error alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Global functions
function goBack() {
    window.history.back();
}

function approvePost() {
    if (window.postDetail) {
        window.postDetail.approvePost();
    }
}

function rejectPost() {
    if (window.postDetail) {
        window.postDetail.rejectPost();
    }
}

function downloadMedia() {
    if (window.postDetail) {
        window.postDetail.downloadMedia();
    }
}

function openMediaModal(mediaUrl, fileName, mediaType) {
    // Create a simple modal for viewing media
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'mediaModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${fileName}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    ${mediaType === 'photo' 
                        ? `<img src="${mediaUrl}" class="img-fluid" alt="${fileName}">`
                        : mediaType === 'video'
                        ? `<video controls class="w-100"><source src="${mediaUrl}" type="video/mp4"></video>`
                        : `<audio controls class="w-100"><source src="${mediaUrl}" type="audio/mp3"></audio>`
                    }
                </div>
                <div class="modal-footer">
                    <a href="${mediaUrl}" download="${fileName}" class="btn btn-primary">Download</a>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal using Bootstrap
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Remove modal from DOM after it's hidden
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.postDetail = new PostDetail();
}); 