# JWT Authentication Setup Guide

This guide explains how JWT (JSON Web Token) authentication has been implemented in the Neberku project, replacing the previous session-based authentication.

## Overview

The authentication system has been converted from Django's session-based authentication to JWT-based authentication using `djangorestframework-simplejwt`. This provides better scalability and stateless authentication.

## Changes Made

### 1. Backend Changes

#### Dependencies Added
- `djangorestframework-simplejwt==5.3.0` - JWT token implementation

#### Settings Updated (`neberku/settings.py`)
- Added `rest_framework_simplejwt` to `INSTALLED_APPS`
- Updated `REST_FRAMEWORK` settings to use JWT authentication
- Added comprehensive JWT configuration with `SIMPLE_JWT` settings
- Updated Swagger settings to use JWT instead of session auth

#### API Views Updated (`api/views.py`)
- Created `CustomTokenObtainPairView` that includes user information in token response
- Updated `api_login` to return JWT tokens instead of creating sessions
- Updated `api_logout` to work with stateless JWT tokens
- Updated `api_debug_auth` to check for JWT tokens in Authorization header

#### URL Configuration (`api/urls.py`)
- Added JWT token endpoints:
  - `/api/token/` - Obtain access and refresh tokens
  - `/api/token/refresh/` - Refresh access token
  - `/api/token/verify/` - Verify token validity

### 2. Frontend Changes

#### Authentication (`js/auth.js`)
- Updated login function to store JWT tokens in localStorage
- Updated logout function to clear JWT tokens
- Added token refresh functionality
- Updated authentication checks to verify JWT token presence
- Added automatic token refresh before expiry

#### Configuration (`js/config.js`)
- Updated API utility functions to use JWT tokens
- Added JWT token endpoints to configuration
- Updated default headers to include JWT Authorization header

## JWT Token Structure

### Access Token
- **Lifetime**: 60 minutes
- **Purpose**: Authenticate API requests
- **Storage**: localStorage as `neberku_access_token`

### Refresh Token
- **Lifetime**: 7 days
- **Purpose**: Obtain new access tokens
- **Storage**: localStorage as `neberku_refresh_token`
- **Rotation**: Enabled (new refresh token issued on each refresh)

## API Endpoints

### Authentication Endpoints

#### 1. Obtain JWT Tokens
```http
POST /api/token/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

**Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
        "id": 1,
        "username": "your_username",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe"
    }
}
```

#### 2. Refresh Access Token
```http
POST /api/token/refresh/
Content-Type: application/json

{
    "refresh": "your_refresh_token"
}
```

**Response:**
```json
{
    "access": "new_access_token_here"
}
```

#### 3. Verify Token
```http
POST /api/token/verify/
Content-Type: application/json

{
    "token": "your_access_token"
}
```

#### 4. Custom Login (Alternative)
```http
POST /api/login/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

**Response:** Same as token endpoint

### Authenticated Requests

All authenticated API requests must include the JWT token in the Authorization header:

```http
GET /api/events/
Authorization: Bearer your_access_token_here
Content-Type: application/json
```

## Frontend Usage

### Login Process
1. User submits login form
2. Frontend calls `/api/login/` or `/api/token/`
3. JWT tokens are stored in localStorage
4. User is redirected to dashboard

### Making Authenticated Requests
```javascript
// Using API_UTILS (recommended)
const data = await API_UTILS.request('/api/events/', {
    method: 'GET'
});

// Manual approach
const token = localStorage.getItem('neberku_access_token');
const response = await fetch('/api/events/', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

### Token Refresh
The frontend automatically refreshes tokens before expiry (every 50 minutes). Manual refresh:

```javascript
const newToken = await NEBERKU_AUTH.refreshJWTToken();
```

### Logout Process
1. Frontend calls `/api/logout/` with current token
2. All tokens are removed from localStorage
3. User is redirected to home page

## Testing

### Create Test Users
```bash
cd neberku
python create_jwt_test_user.py
```

### Test JWT Authentication
```bash
cd neberku
python test_jwt_auth.py
```

### Manual Testing with curl

#### 1. Get Tokens
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'
```

#### 2. Use Token for Authenticated Request
```bash
curl -X GET http://localhost:8000/api/debug-auth/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

#### 3. Refresh Token
```bash
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN_HERE"}'
```

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage (client-side). For enhanced security, consider using httpOnly cookies.

2. **Token Expiry**: Access tokens expire in 60 minutes. Refresh tokens expire in 7 days.

3. **Token Rotation**: Refresh tokens are rotated on each refresh for enhanced security.

4. **HTTPS**: In production, ensure all communication happens over HTTPS.

5. **Token Blacklisting**: For immediate logout, implement token blacklisting using `django-rest-framework-simplejwt`'s blacklist feature.

## Migration Notes

### From Session to JWT
- Session cookies are no longer used for authentication
- All API requests now require JWT tokens in Authorization header
- Frontend no longer relies on Django's session middleware for authentication
- CORS settings remain the same but cookies are not needed

### Backward Compatibility
- Session authentication is still available as fallback
- Existing API endpoints work with JWT tokens
- Frontend gracefully handles both authentication methods

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if JWT token is included in Authorization header
2. **Token Expired**: Use refresh token to get new access token
3. **CORS Issues**: Ensure CORS settings allow Authorization header
4. **Frontend Not Authenticated**: Check if tokens are stored in localStorage

### Debug Endpoints
- `/api/debug-auth/` - Check authentication status and token presence

## Production Deployment

1. Update `SECRET_KEY` in settings
2. Set `DEBUG = False`
3. Configure proper CORS origins
4. Use HTTPS
5. Consider implementing token blacklisting
6. Set up proper logging for authentication events

## Benefits of JWT Authentication

1. **Stateless**: No server-side session storage required
2. **Scalable**: Works well with multiple servers/load balancers
3. **Mobile-Friendly**: Easy to implement in mobile apps
4. **Cross-Domain**: Works across different domains
5. **Self-Contained**: Token contains user information
6. **Secure**: Tokens are signed and can be verified

This JWT implementation provides a robust, scalable authentication system suitable for modern web applications.
