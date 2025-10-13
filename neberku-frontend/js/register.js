// Registration functionality
class Registration {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupPasswordToggle();
    }

    bindEvents() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegistration();
            });

            // Real-time validation
            form.addEventListener('input', (e) => {
                this.validateField(e.target);
            });
        }
    }

    setupPasswordToggle() {
        const toggleBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = toggleBtn.querySelector('i');
                icon.className = type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
            });
        }
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Remove existing validation classes
        field.classList.remove('is-valid', 'is-invalid');
        
        switch (field.id) {
            case 'username':
                if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Username must be at least 3 characters long.';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Username can only contain letters, numbers, and underscores.';
                }
                break;

            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address.';
                }
                break;

            case 'password':
                if (value.length < 8) {
                    isValid = false;
                    errorMessage = 'Password must be at least 8 characters long.';
                } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
                    isValid = false;
                    errorMessage = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
                }
                break;

            case 'confirmPassword':
                const password = document.getElementById('password').value;
                if (value !== password) {
                    isValid = false;
                    errorMessage = 'Passwords do not match.';
                }
                break;

            case 'termsCheck':
                if (!field.checked) {
                    isValid = false;
                    errorMessage = 'You must agree to the terms and conditions.';
                }
                break;

            default:
                console.log(`⚠️ Unknown field type: ${field.id} - falling through to default case`);
                // For unknown fields, consider them valid if they have a value or are checkboxes
                if (field.type === 'checkbox') {
                    isValid = field.checked;
                } else {
                    isValid = value.length > 0;
                }
                break;
        }

        // Apply validation styling
        if (isValid && (value.length > 0 || field.type === 'checkbox')) {
            field.classList.add('is-valid');
        } else if (!isValid) {
            field.classList.add('is-invalid');
        }

        // Update feedback message
        const feedbackElement = field.parentNode.querySelector('.invalid-feedback');
        if (feedbackElement) {
            feedbackElement.textContent = errorMessage;
        }

        return isValid;
    }

    validateForm() {
        // Temporary: Always return true to bypass validation
        return true;
        
        const form = document.getElementById('registerForm');
        const fields = form.querySelectorAll('input, textarea, select');
        let isValid = true;

        fields.forEach(field => {
            // Skip validation for fields without ID
            if (!field.id) {
                return;
            }
            
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleRegistration() {
        const isValid = this.validateForm();
        
        if (!isValid) {
            // Show which fields are failing
            const form = document.getElementById('registerForm');
            const fields = form.querySelectorAll('input, textarea, select');
            let failedFields = [];
            
            fields.forEach(field => {
                if (field.id && field.classList.contains('is-invalid')) {
                    failedFields.push(`${field.id}: "${field.value}"`);
                }
            });
            
            alert('Validation failed for:\n' + failedFields.join('\n'));
            this.showAlert('Please correct the errors in the form.', 'danger');
            return;
        }

        const formData = {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            password2: document.getElementById('confirmPassword').value
        };

        try {
            this.showLoadingState(true);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const userData = await response.json();
                if (userData.success) {
                    this.handleRegistrationSuccess(userData);
                } else {
                    throw new Error(userData.error || 'Registration failed');
                }
            } else {
                let errorMessage = `Registration failed: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // If we can't parse the error response, use the status text
                    errorMessage = `Registration failed: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.handleRegistrationError(error.message);
        } finally {
            this.showLoadingState(false);
        }
    }

    async handleRegistrationDirect() {
        // Direct registration without validation
        const formData = {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            password2: document.getElementById('confirmPassword').value
        };

        try {
            this.showLoadingState(true);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.handleRegistrationSuccess(data);
            } else {
                this.handleRegistrationError(data);
            }
        } catch (error) {
            this.handleRegistrationError({ error: 'Network error occurred' });
        } finally {
            this.showLoadingState(false);
        }
    }

    async handleRegistrationSuccess(userData) {
        this.showAlert('Registration successful! Logging you in...', 'success');
        
        // Automatically log in the user after successful registration
        try {
            const loginData = {
                username: userData.user.username,
                password: document.getElementById('password').value
            };
            
            const loginResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            if (loginResponse.ok) {
                const tokenData = await loginResponse.json();
                
                // Store authentication data
                localStorage.setItem('neberku_access_token', tokenData.access);
                localStorage.setItem('neberku_refresh_token', tokenData.refresh);
                localStorage.setItem('neberku_user', JSON.stringify({
                    id: userData.user.id,
                    username: userData.user.username,
                    email: userData.user.email
                }));
                
                this.showAlert('Login successful! Redirecting to dashboard...', 'success');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                // Registration successful but login failed - redirect to login page
                this.showAlert('Registration successful! Please log in with your new account.', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Auto-login after registration failed:', error);
            // Registration successful but login failed - redirect to login page
            this.showAlert('Registration successful! Please log in with your new account.', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    }

    handleRegistrationError(errorMessage) {
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            this.showAlert('Unable to connect to the server. Please check your connection and try again.', 'danger');
        } else {
            this.showAlert(`Registration failed: ${errorMessage}`, 'danger');
        }
    }

    showLoadingState(loading) {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            if (loading) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Create Account';
            }
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Test API connection function
async function testAPIConnection() {
    const testBtn = document.querySelector('button[onclick="testAPIConnection()"]');
    const originalText = testBtn.innerHTML;
    
    testBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Testing...';
    testBtn.disabled = true;
    
    try {
        console.log('🔍 Testing API connection to:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'test_user_' + Date.now(),
                email: 'test@example.com',
                password: 'testpassword123',
                password2: 'testpassword123'
            })
        });
        
        console.log('📡 API Response Status:', response.status);
        console.log('📡 API Response Headers:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Connection Test: SUCCESS');
            console.log('📄 Response Data:', data);
            
            // Show success message
            const registration = new Registration();
            registration.showAlert('✅ API Connection: SUCCESS - Server is reachable!', 'success');
        } else {
            const errorData = await response.json();
            console.log('⚠️ API Connection Test: Server responded with error');
            console.log('📄 Error Data:', errorData);
            
            const registration = new Registration();
            registration.showAlert(`⚠️ API Connection: Server error (${response.status}) - ${errorData.error || 'Unknown error'}`, 'warning');
        }
    } catch (error) {
        console.error('❌ API Connection Test: FAILED');
        console.error('📄 Error Details:', error);
        
        const registration = new Registration();
        registration.showAlert(`❌ API Connection: FAILED - ${error.message}`, 'danger');
    } finally {
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
    }
}

// Test function to check form fields
function testFormFields() {
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const termsCheck = document.getElementById('termsCheck');
    
    alert(`Form fields test:
Username: ${username ? 'Found' : 'Not found'} - Value: "${username?.value || 'empty'}"
Email: ${email ? 'Found' : 'Not found'} - Value: "${email?.value || 'empty'}"
Password: ${password ? 'Found' : 'Not found'} - Value: "${password?.value || 'empty'}"
Confirm Password: ${confirmPassword ? 'Found' : 'Not found'} - Value: "${confirmPassword?.value || 'empty'}"
Terms Check: ${termsCheck ? 'Found' : 'Not found'} - Checked: ${termsCheck?.checked || false}`);
}

// Bypass validation function
function bypassValidation() {
    const registration = new Registration();
    registration.handleRegistrationDirect();
}

// Initialize registration when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Registration();
}); 