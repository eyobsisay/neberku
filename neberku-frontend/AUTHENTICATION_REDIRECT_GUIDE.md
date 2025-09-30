# JWT Authentication Redirect Implementation

## Overview

This implementation provides automatic redirection to the login page when JWT tokens are invalid or expired. The system includes centralized authentication error handling, token validation, and user-friendly notifications.

## Key Features

### 1. Centralized Authentication Error Handling
- **Location**: `neberku-frontend/js/config.js`
- **Function**: `API_UTILS.handleAuthError()`
- **Purpose**: Handles all authentication errors consistently across the application

### 2. Token Validation
- **Location**: `neberku-frontend/js/auth.js`
- **Function**: `validateJWTToken()`
- **Purpose**: Validates JWT token structure and expiration before API calls

### 3. API Request Interceptor
- **Location**: `neberku-frontend/js/config.js`
- **Function**: `API_UTILS.request()`
- **Purpose**: Intercepts all API requests and handles authentication errors automatically

## Implementation Details

### Error Detection

The system detects authentication errors in multiple ways:

1. **HTTP Status Codes**:
   - `401 Unauthorized`: Token invalid or expired
   - `403 Forbidden`: Access denied

2. **JWT-Specific Error Messages**:
   ```json
   {
     "detail": "Given token not valid for any token type",
     "code": "token_not_valid",
     "messages": [
       {
         "token_class": "AccessToken",
         "token_type": "access",
         "message": "Token is invalid or expired"
       }
     ]
   }
   ```

### Token Validation Process

1. **Structure Validation**: Checks if token has 3 parts separated by dots
2. **Expiration Check**: Decodes payload and compares `exp` field with current time
3. **Error Handling**: Returns false for any validation failures

### Automatic Redirect Flow

1. **Error Detection**: API request fails with authentication error
2. **Token Cleanup**: Removes all stored authentication data
3. **User Notification**: Shows friendly error message
4. **Redirect**: Automatically redirects to login page after 2 seconds

## Files Modified

### 1. `config.js`
- Added `handleAuthError()` function
- Added `validateToken()` function
- Added `isProtectedPage()` function
- Enhanced `handleResponse()` with auth error detection
- Enhanced `request()` with token validation

### 2. `dashboard.js`
- Replaced manual auth error handling with centralized `API_UTILS.request()`
- Simplified `loadEvents()` and `createEvent()` methods
- Removed duplicate authentication checks

### 3. `event-detail.js`
- Replaced manual auth error handling with centralized `API_UTILS.request()`
- Simplified `loadEventDetail()`, `loadEventGuestPosts()`, `approvePost()`, and `updateEvent()` methods
- Removed duplicate authentication checks

### 4. `auth.js`
- Enhanced `isAuthenticated()` with token validation
- Added `validateJWTToken()` function
- Updated `requireAuth()` to use centralized error handling
- Enhanced `refreshJWTToken()` to use centralized API handling
- Updated `initAuth()` with better token validation

## Usage Examples

### Basic API Request with Auth Error Handling
```javascript
try {
    const data = await API_UTILS.request(`${API_CONFIG.BASE_URL}/api/events/`, {
        method: 'GET'
    });
    // Handle successful response
} catch (error) {
    // Handle other errors (auth errors are handled automatically)
}
```

### Manual Token Validation
```javascript
if (window.NEBERKU_AUTH && window.NEBERKU_AUTH.validateJWTToken) {
    const isValid = window.NEBERKU_AUTH.validateJWTToken(token);
    if (!isValid) {
        // Token is invalid or expired
    }
}
```

### Protected Page Check
```javascript
if (API_UTILS.isProtectedPage()) {
    // Current page requires authentication
}
```

## Testing

### Test File: `test-auth-redirect.html`

The test file provides interactive testing of the authentication redirect functionality:

1. **Test Invalid Token**: Sets a malformed JWT token
2. **Test Expired Token**: Sets an expired JWT token
3. **Test Valid Token**: Sets a valid JWT token
4. **Clear Tokens**: Removes all authentication data

### Manual Testing Steps

1. Open `test-auth-redirect.html` in a browser
2. Click "Test Invalid Token" or "Test Expired Token"
3. Observe the automatic redirect to login page
4. Check browser console for detailed logs

## Error Messages

### User-Facing Messages
- "Session Expired! Your session has expired or your token is invalid. Please log in again."
- "Token invalid or expired"
- "Access denied"

### Console Logs
- `🔒 Unauthorized (401) - Token invalid or expired`
- `🚫 Forbidden (403) - Access denied`
- `🔒 JWT Token validation failed`
- `🔄 Redirecting to login page...`

## Configuration

### Protected Pages
The following pages require authentication:
- `dashboard.html`
- `event-detail.html`
- `guest-posts.html`
- `post-detail.html`

### Redirect Delay
- **User Notification**: 3 seconds
- **Redirect Delay**: 2 seconds
- **Total Time**: 5 seconds before redirect

## Benefits

1. **Consistent Error Handling**: All authentication errors are handled uniformly
2. **Better User Experience**: Friendly error messages and automatic redirects
3. **Reduced Code Duplication**: Centralized authentication logic
4. **Proactive Token Validation**: Validates tokens before making API requests
5. **Automatic Cleanup**: Clears invalid authentication data automatically

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage (consider httpOnly cookies for production)
2. **Token Validation**: Client-side validation is for UX only; server-side validation is authoritative
3. **Redirect Security**: Uses `window.location.replace()` to prevent back button issues
4. **Error Information**: Avoids exposing sensitive error details to users

## Future Enhancements

1. **Token Refresh**: Automatic token refresh before expiration
2. **Offline Support**: Handle authentication errors when offline
3. **Multiple Tab Sync**: Synchronize authentication state across browser tabs
4. **Remember Me**: Implement persistent login functionality
5. **Session Management**: Add session timeout warnings
