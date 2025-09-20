// Neberku Frontend Authentication

// Flag to prevent double redirects during login
let isLoggingIn = false;

// Check if user is already logged in
function checkAuthStatus() {
    // Don't check if we're in the middle of logging in
    if (isLoggingIn) {
        console.log('⏳ Login in progress, skipping auth check...');
        return;
    }
    
    const user = localStorage.getItem('neberku_user');
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('✅ User already logged in:', userData.username);
            
            // Only redirect if we're on the login page
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'login.html') {
                console.log('🔄 Already logged in, redirecting to dashboard...');
                // Small delay to prevent immediate redirect during login process
                setTimeout(() => {
                    window.location.replace('dashboard.html');
                }, 100);
            }
        } catch (e) {
            console.error('❌ Error parsing stored user data:', e);
            localStorage.removeItem('neberku_user');
        }
    } else {
        console.log('⚠️ No user data found, staying on login page');
    }
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const username = formData.get('username');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe');
    
    // Clear previous errors
    clearFormErrors();
    
    // Validate form
    if (!validateLoginForm(username, password)) {
        return;
    }
    
    // Set login flag to prevent auth check interference
    isLoggingIn = true;
    
    // Show loading state
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';
    loginBtn.disabled = true;
    
    // Attempt login
    loginUser(username, password, rememberMe)
        .then(response => {
            console.log('✅ Login successful, response:', response);
            
            // Store user data (no token needed for session-based auth)
            if (response.user) {
                localStorage.setItem('neberku_user', JSON.stringify(response.user));
                console.log('💾 User data stored in localStorage');
                
                // Show success message
                showAlert('Login successful! Redirecting to dashboard...', 'success');
                
                // Redirect to dashboard with a flag to prevent double redirect
                setTimeout(() => {
                    console.log('🚀 Redirecting to dashboard...');
                    // Use replace to prevent back button issues
                    window.location.replace('dashboard.html');
                }, 1500);
            } else {
                throw new Error('No user data received');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            
            // Show error message
            const errorMessage = error.message || 'Login failed. Please check your credentials.';
            showAlert(errorMessage, 'error');
            
            // Restore button
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        })
        .finally(() => {
            // Clear login flag
            isLoggingIn = false;
        });
}

// Validate login form
function validateLoginForm(username, password) {
    let isValid = true;
    
    if (!username || username.trim() === '') {
        showFieldError('username', 'Username is required');
        isValid = false;
    }
    
    if (!password || password.trim() === '') {
        showFieldError('password', 'Password is required');
        isValid = false;
    }
    
    return isValid;
}

// Show field error
function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    const errorDiv = document.getElementById(fieldName + 'Error');
    
    field.classList.add('is-invalid');
    errorDiv.textContent = message;
}

// Clear form errors
function clearFormErrors() {
    const fields = ['username', 'password'];
    fields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        const errorDiv = document.getElementById(fieldName + 'Error');
        
        field.classList.remove('is-invalid');
        errorDiv.textContent = '';
    });
}

// Login user with API
async function loginUser(username, password, rememberMe) {
    try {
        // For now, we'll simulate API call
        // Replace this with actual API call to your Django backend
        const response = await simulateLoginAPI(username, password);
        
        if (response.success) {
            return {
                token: response.token,
                user: response.user
            };
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        throw error;
    }
}

// Login API call to Django backend - JWT version
async function simulateLoginAPI(username, password) {
    try {
        console.log('🔍 Calling Django JWT login API...');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        console.log('🌐 Making login request to:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`);
        console.log('🔑 Headers:', headers);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ username, password }),
            mode: 'cors'  // Explicitly set CORS mode
        });
        
        console.log('📡 Login response status:', response.status);
        console.log('📡 Login response headers:', response.headers);
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Login response data:', userData);
            
            if (userData.success && userData.user && userData.access) {
                // Store JWT tokens
                localStorage.setItem('neberku_access_token', userData.access);
                localStorage.setItem('neberku_refresh_token', userData.refresh);
                console.log('🔑 JWT tokens stored in localStorage');
                
                return {
                    success: true,
                    token: userData.access,
                    refresh: userData.refresh,
                    user: userData.user
                };
            } else {
                throw new Error(userData.error || 'Login failed - no user data or token');
            }
        } else {
            const errorData = await response.json();
            console.error('❌ Login failed:', errorData);
            throw new Error(errorData.error || errorData.message || `Login failed: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ API call error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Unable to connect to the server. Please check your connection and try again.');
        }
        throw error;
    }
}

// Logout user - JWT version
async function logoutUser() {
    try {
        // Get the current access token for the logout request
        const accessToken = localStorage.getItem('neberku_access_token');
        
        if (accessToken) {
            // Call Django logout API with JWT token
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Logout response status:', response.status);
        }
        
        // Clear all local storage
        localStorage.removeItem('neberku_user');
        localStorage.removeItem('neberku_access_token');
        localStorage.removeItem('neberku_refresh_token');
        
        // Show logout message
        showAlert('You have been logged out successfully.', 'success');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Logout error:', error);
        // Even if API call fails, clear local data
        localStorage.removeItem('neberku_user');
        localStorage.removeItem('neberku_access_token');
        localStorage.removeItem('neberku_refresh_token');
        showAlert('Logged out locally. Redirecting...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Check if user is authenticated - JWT version
function isAuthenticated() {
    // For JWT authentication, we check if we have both user data and access token
    const user = localStorage.getItem('neberku_user');
    const accessToken = localStorage.getItem('neberku_access_token');
    return !!(user && accessToken);
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('neberku_user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return null;
}

// Get auth token - JWT version
function getAuthToken() {
    return localStorage.getItem('neberku_access_token');
}

// Get refresh token
function getRefreshToken() {
    return localStorage.getItem('neberku_refresh_token');
}

// Require authentication for protected pages
function requireAuth() {
    if (!isAuthenticated()) {
        showAlert('Please log in to access this page.', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

// Refresh JWT token
async function refreshJWTToken() {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        
        console.log('🔄 Refreshing JWT token...');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TOKEN_REFRESH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('neberku_access_token', data.access);
            console.log('✅ JWT token refreshed successfully');
            return data.access;
        } else {
            throw new Error('Token refresh failed');
        }
    } catch (error) {
        console.error('❌ Token refresh error:', error);
        // If refresh fails, logout the user
        logoutUser();
        throw error;
    }
}

// Auto-refresh token before expiry
function setupTokenExpiry() {
    // Check token every 50 minutes (tokens expire in 60 minutes)
    setInterval(async () => {
        const token = getAuthToken();
        if (token) {
            try {
                await refreshJWTToken();
                console.log('🔄 Token auto-refreshed');
            } catch (error) {
                console.error('❌ Auto-refresh failed:', error);
            }
        }
    }, 50 * 60 * 1000); // 50 minutes
}

// Initialize authentication
function initAuth() {
    // Check if we're on a protected page
    const protectedPages = ['dashboard.html', 'profile.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        if (!requireAuth()) {
            return;
        }
    }
    
    // Check if we're on login page and user is already authenticated
    if (currentPage === 'login.html') {
        checkAuthStatus();
    }
    
    // Setup token expiry checking
    setupTokenExpiry();
    
    // Add event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Add logout functionality to any logout buttons
    const logoutButtons = document.querySelectorAll('[data-action="logout"]');
    logoutButtons.forEach(button => {
        button.addEventListener('click', logoutUser);
    });
}

// Show alert message
function showAlert(message, type = 'info') {
    if (window.NEBERKU_UTILS && window.NEBERKU_UTILS.showAlert) {
        window.NEBERKU_UTILS.showAlert(message, type);
    } else {
        // Fallback alert
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
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
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loginUser,
        logoutUser,
        isAuthenticated,
        getCurrentUser,
        getAuthToken,
        getRefreshToken,
        refreshJWTToken,
        requireAuth,
        showAlert
    };
} else {
    window.NEBERKU_AUTH = {
        loginUser,
        logoutUser,
        isAuthenticated,
        getCurrentUser,
        getAuthToken,
        getRefreshToken,
        refreshJWTToken,
        requireAuth,
        showAlert
    };
} 