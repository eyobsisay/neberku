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
        }

        // Apply validation styling
        if (isValid && value.length > 0) {
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
        const form = document.getElementById('registerForm');
        const fields = form.querySelectorAll('input, textarea, select');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleRegistration() {
        if (!this.validateForm()) {
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
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || `Registration failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.handleRegistrationError(error.message);
        } finally {
            this.showLoadingState(false);
        }
    }

    handleRegistrationSuccess(userData) {
        // Store user data and token
        localStorage.setItem('neberku_user', JSON.stringify({
            id: userData.id,
            username: userData.username,
            email: userData.email
        }));
        
        localStorage.setItem('neberku_token', userData.token || 'demo_token_' + Date.now());

        this.showAlert('Registration successful! Redirecting to dashboard...', 'success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
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

// Initialize registration when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Registration();
}); 