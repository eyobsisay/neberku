// Neberku Frontend Configuration
const API_CONFIG = {
    // Base URL for the Django backend
    BASE_URL: 'https://api.koshkoshe.com',
    
    // API endpoints
    ENDPOINTS: {
        // JWT Authentication
        TOKEN: '/api/token/',
        TOKEN_REFRESH: '/api/token/refresh/',
        TOKEN_VERIFY: '/api/token/verify/',
        
        // Custom Authentication
        LOGIN: '/api/login/',
        REGISTER: '/api/register/',
        LOGOUT: '/api/logout/',
        
        // Events
        EVENTS: '/api/events/',
        EVENT_DETAIL: '/api/events/{id}/',
        
        // Packages and Event Types
        PACKAGES: '/api/packages/',
        EVENT_TYPES: '/api/event-types/',
        
        // Guest contributions
        GUEST_POSTS: '/api/guest-posts/',
        GUEST_POST_DETAIL: '/api/guest-posts/{id}/',
        
        // Media uploads
        UPLOAD_PHOTO: '/api/upload-photo/',
        UPLOAD_VIDEO: '/api/upload-video/',
        
        // User management
        USER_PROFILE: '/api/user/profile/',
        USER_EVENTS: '/api/user/events/',
        
        // Contact and support
        CONTACT: '/api/contact/',
        SUPPORT: '/api/support/'
    },
    
    // Upload settings
    UPLOAD: {
        MAX_PHOTO_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
        ALLOWED_PHOTO_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mov', 'video/avi', 'video/webm']
    },
    
    // UI settings
    UI: {
        ALERT_TIMEOUT: 5000, // 5 seconds
        REDIRECT_DELAY: 1500, // 1.5 seconds
        PROGRESS_UPDATE_INTERVAL: 100 // 100ms
    },
    
    // Feature flags
    FEATURES: {
        ENABLE_FILE_PREVIEW: true,
        ENABLE_PROGRESS_BAR: true,
        ENABLE_REAL_TIME_VALIDATION: true,
        ENABLE_AUTO_SAVE: false
    }
};

// Environment-specific configuration
const ENV_CONFIG = {
    development: {
        API_URL: 'http://localhost:8000',
        DEBUG: true,
        LOG_LEVEL: 'debug'
    },
    production: {
        API_URL: 'https://api.koshkoshe.com',
        DEBUG: false,
        LOG_LEVEL: 'error'
    }
};

// Get current environment
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.startsWith('192.168.') ||
                     window.location.hostname.startsWith('10.') ||
                     window.location.hostname.endsWith('.local') ||
                     window.location.port === '3000' ||
                     window.location.port === '8080' ||
                     window.location.port === '5000';

const currentEnv = isDevelopment ? 'development' : 'production';

// Override base URL if environment-specific config exists
if (ENV_CONFIG[currentEnv]) {
    API_CONFIG.BASE_URL = ENV_CONFIG[currentEnv].API_URL;
}

// Utility functions for API calls
const API_UTILS = {
    // Build full URL for an endpoint
    buildUrl: (endpoint, params = {}) => {
        let url = API_CONFIG.BASE_URL + endpoint;
        
        // Replace path parameters
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    },
    
    // Get default headers for API requests - JWT version
    getDefaultHeaders: (includeAuth = true) => {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth) {
            const token = localStorage.getItem('neberku_access_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    },
    
    // Handle API response with authentication error handling
    handleResponse: async (response) => {
        if (response.ok) {
            try {
                return await response.json();
            } catch (error) {
                // Response is empty or not JSON
                return { success: true };
            }
        } else {
            // Handle authentication errors
            if (response.status === 401) {
                console.log('🔒 Unauthorized (401) - Token invalid or expired');
                API_UTILS.handleAuthError('Token invalid or expired');
                return;
            }
            
            if (response.status === 403) {
                console.log('🚫 Forbidden (403) - Access denied');
                API_UTILS.handleAuthError('Access denied');
                return;
            }
            
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.detail || errorMessage;
                
                // Check for specific JWT token errors
                if (errorData.code === 'token_not_valid' || 
                    errorData.detail === 'Given token not valid for any token type' ||
                    (errorData.messages && errorData.messages.some(msg => 
                        msg.message === 'Token is invalid or expired'))) {
                    console.log('🔒 JWT Token validation failed');
                    API_UTILS.handleAuthError('Token is invalid or expired');
                    return;
                }
            } catch (error) {
                // Could not parse error response
            }
            
            throw new Error(errorMessage);
        }
    },
    
    // Handle authentication errors and redirect to login
    handleAuthError: (message) => {
        console.log('🔒 Authentication error detected:', message);
        
        // Clear stored authentication data
        localStorage.removeItem('neberku_user');
        localStorage.removeItem('neberku_access_token');
        localStorage.removeItem('neberku_refresh_token');
        
        // Show user-friendly message
        const alertMessage = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <strong>Session Expired!</strong><br>
                Your session has expired or your token is invalid. Please log in again.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Add alert to page if possible
        const alertContainer = document.getElementById('alertContainer') || document.body;
        if (alertContainer) {
            const alertDiv = document.createElement('div');
            alertDiv.innerHTML = alertMessage;
            alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alertContainer.appendChild(alertDiv);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 3000);
        }
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            console.log('🔄 Redirecting to login page...');
            window.location.replace('login.html');
        }, 2000);
    },
    
    // Check if current page requires authentication
    isProtectedPage: () => {
        const protectedPages = ['dashboard.html', 'event-detail.html', 'guest-posts.html', 'post-detail.html'];
        const currentPage = window.location.pathname.split('/').pop();
        return protectedPages.includes(currentPage);
    },
    
    // Validate JWT token before making requests
    validateToken: () => {
        const token = localStorage.getItem('neberku_access_token');
        if (!token) {
            console.log('❌ No access token found');
            return false;
        }
        
        try {
            // Basic JWT structure validation (check if it has 3 parts separated by dots)
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.log('❌ Invalid JWT token structure');
                return false;
            }
            
            // Decode payload to check expiration
            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
                console.log('❌ JWT token has expired');
                return false;
            }
            
            console.log('✅ JWT token is valid');
            return true;
        } catch (error) {
            console.log('❌ Error validating JWT token:', error);
            return false;
        }
    },
    
    // Make API request with error handling and token validation
    request: async (url, options = {}) => {
        try {
            // Validate token before making request if authentication is required
            if (options.includeAuth !== false && !API_UTILS.validateToken()) {
                API_UTILS.handleAuthError('Invalid or expired token');
                return;
            }
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...API_UTILS.getDefaultHeaders(options.includeAuth !== false),
                    ...options.headers
                }
            });
            
            return await API_UTILS.handleResponse(response);
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Unable to connect to the server. Please check your connection and try again.');
            }
            throw error;
        }
    }
};

// Export configuration for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, ENV_CONFIG, API_UTILS };
} else {
    window.API_CONFIG = API_CONFIG;
    window.ENV_CONFIG = ENV_CONFIG;
    window.API_UTILS = API_UTILS;
    
    // Debug logging
    console.log('🚀 Neberku Frontend Configuration Loaded Successfully!');
    console.log('📍 Base URL:', API_CONFIG.BASE_URL);
    console.log('🔑 Available Endpoints:', Object.keys(API_CONFIG.ENDPOINTS));
    console.log('🌍 Environment:', currentEnv);
    console.log('🏠 Hostname:', window.location.hostname);
    console.log('🔌 Port:', window.location.port);
    console.log('🔍 Is Development:', isDevelopment);
} 