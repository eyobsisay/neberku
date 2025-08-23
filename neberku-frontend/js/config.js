// Neberku Frontend Configuration
const API_CONFIG = {
    // Base URL for the Django backend
    BASE_URL: 'http://localhost:8000',
    
    // API endpoints
    ENDPOINTS: {
        // Authentication
        LOGIN: '/api/login/',
        REGISTER: '/api/register/',
        LOGOUT: '/api/logout/',
        
        // Events
        EVENTS: '/api/events/',
        EVENT_DETAIL: '/api/events/{id}/',
        
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
        API_URL: 'http://localhost:8000',
        DEBUG: false,
        LOG_LEVEL: 'error'
    }
};

// Get current environment
const currentEnv = window.location.hostname === 'localhost' ? 'development' : 'production';

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
    
    // Get default headers for API requests
    getDefaultHeaders: (includeAuth = true) => {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth) {
            const token = localStorage.getItem('neberku_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    },
    
    // Handle API response
    handleResponse: async (response) => {
        if (response.ok) {
            try {
                return await response.json();
            } catch (error) {
                // Response is empty or not JSON
                return { success: true };
            }
        } else {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.detail || errorMessage;
            } catch (error) {
                // Could not parse error response
            }
            
            throw new Error(errorMessage);
        }
    },
    
    // Make API request with error handling
    request: async (url, options = {}) => {
        try {
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
} 