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

// Login API call to Django backend
async function simulateLoginAPI(username, password) {
    try {
        console.log('🔍 Calling Django login API...');
        
        // First, get CSRF token if needed
        let csrfToken = null;
        try {
            const csrfResponse = await fetch(`${API_CONFIG.BASE_URL}/api/`, {
                method: 'GET',
                credentials: 'include'
            });
            if (csrfResponse.ok) {
                // Extract CSRF token from cookies
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'csrftoken') {
                        csrfToken = value;
                        break;
                    }
                }
            }
        } catch (e) {
            console.log('⚠️ Could not get CSRF token, proceeding without it');
        }
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add CSRF token if available
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
            console.log('🔑 CSRF token added to headers');
        }
        
        console.log('🌐 Making login request to:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`);
        console.log('🔑 Headers:', headers);
        console.log('🍪 Credentials mode: include');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ username, password }),
            credentials: 'include',  // Important: include cookies for session
            mode: 'cors'  // Explicitly set CORS mode
        });
        
        console.log('📡 Login response status:', response.status);
        console.log('📡 Login response headers:', response.headers);
        console.log('🍪 Response cookies:', document.cookie);
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Login response data:', userData);
            
            if (userData.success && userData.user) {
                // For session-based auth, we don't need a token
                // The session cookie is automatically handled by the browser
                return {
                    success: true,
                    user: userData.user
                };
            } else {
                throw new Error(userData.error || 'Login failed - no user data');
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

// Logout user
async function logoutUser() {
    try {
        // Call Django logout API to clear session
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
            method: 'POST',
            credentials: 'include'
        });
        
        // Clear local storage
        localStorage.removeItem('neberku_user');
        
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
        showAlert('Logged out locally. Redirecting...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Check if user is authenticated
function isAuthenticated() {
    // For session-based authentication, we'll check if we have user data
    // The actual authentication is handled by Django's session middleware
    const user = localStorage.getItem('neberku_user');
    return !!user;
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

// Get auth token
function getAuthToken() {
    return localStorage.getItem('neberku_token');
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

// Auto-logout on token expiry (if implemented)
function setupTokenExpiry() {
    // Check token every 5 minutes
    setInterval(() => {
        const token = getAuthToken();
        if (token) {
            // You could implement token validation here
            // For now, we'll just check if token exists
            console.log('Token check passed');
        }
    }, 5 * 60 * 1000);
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
        requireAuth,
        showAlert
    };
} 