# JWT Authentication Troubleshooting Guide

## Current Issue: 401 Unauthorized Errors

You're seeing repeated 401 Unauthorized errors in the Django server logs:
```
[20/Sep/2025 15:52:15] "GET /api/packages/ HTTP/1.1" 401 58
[20/Sep/2025 15:52:15] "GET /api/event-types/ HTTP/1.1" 401 58
[20/Sep/2025 15:52:15] "GET /api/events/ HTTP/1.1" 401 58
```

This indicates that the frontend is still trying to access protected endpoints without proper authentication.

## Step-by-Step Resolution

### Step 1: Install JWT Package
```bash
cd neberku
pip install djangorestframework-simplejwt==5.3.0
```

### Step 2: Check JWT Setup
```bash
cd neberku
python check_jwt_setup.py
```

This will verify:
- JWT package installation
- Django settings configuration
- URL configuration
- API views setup

### Step 3: Restart Django Server
```bash
cd neberku
python manage.py runserver
```

**Important**: The Django server must be restarted after installing new packages and changing settings.

### Step 4: Create Test User
```bash
cd neberku
python create_jwt_test_user.py
```

This creates:
- Username: `testuser`, Password: `testpass123`
- Username: `admin`, Password: `admin123`

### Step 5: Test Authentication
1. Open `neberku-frontend/test-jwt-auth.html` in your browser
2. Try logging in with the test user
3. Test the API endpoints

## Expected Behavior After Fix

### Public Endpoints (No Authentication Required)
- `/api/packages/` - Should return 200 OK
- `/api/event-types/` - Should return 200 OK

### Protected Endpoints (Authentication Required)
- `/api/events/` - Should return 401 without token, 200 with valid JWT token
- `/api/token/` - Should return JWT tokens on successful login

## Common Issues and Solutions

### Issue 1: JWT Package Not Installed
**Symptoms**: ImportError when importing rest_framework_simplejwt
**Solution**: 
```bash
pip install djangorestframework-simplejwt==5.3.0
```

### Issue 2: Django Server Not Restarted
**Symptoms**: Settings changes not taking effect
**Solution**: Restart Django server
```bash
python manage.py runserver
```

### Issue 3: Frontend Still Using Session Auth
**Symptoms**: 401 errors continue after backend fix
**Solution**: Clear browser cache and refresh the frontend

### Issue 4: CORS Issues
**Symptoms**: CORS errors in browser console
**Solution**: Check CORS settings in `neberku/settings.py`

## Testing Commands

### Test JWT Token Endpoint
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'
```

### Test Authenticated Request
```bash
curl -X GET http://localhost:8000/api/debug-auth/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### Test Public Endpoints
```bash
curl -X GET http://localhost:8000/api/packages/
curl -X GET http://localhost:8000/api/event-types/
```

## Frontend Changes Made

The following files have been updated to use JWT authentication:

1. **`neberku-frontend/js/auth.js`**
   - Updated login to store JWT tokens
   - Updated logout to clear JWT tokens
   - Added token refresh functionality

2. **`neberku-frontend/js/config.js`**
   - Updated API utilities to use JWT tokens
   - Added JWT endpoints to configuration

3. **`neberku-frontend/js/dashboard.js`**
   - Updated API calls to use JWT authentication
   - Removed session-based authentication

4. **`neberku-frontend/test-jwt-auth.html`**
   - Created test page for JWT authentication

## Verification Checklist

- [ ] JWT package installed
- [ ] Django server restarted
- [ ] Test user created
- [ ] JWT token endpoint working (`/api/token/`)
- [ ] Public endpoints accessible (`/api/packages/`, `/api/event-types/`)
- [ ] Protected endpoints require authentication (`/api/events/`)
- [ ] Frontend can login and get JWT tokens
- [ ] Frontend can make authenticated requests

## If Issues Persist

1. **Check Django logs** for any import errors or configuration issues
2. **Clear browser cache** and refresh the frontend
3. **Check browser console** for JavaScript errors
4. **Verify CORS settings** allow the frontend domain
5. **Test with curl** to isolate frontend vs backend issues

## Success Indicators

When everything is working correctly, you should see:
- ✅ No 401 errors for public endpoints
- ✅ JWT tokens returned on login
- ✅ Authenticated requests working with JWT tokens
- ✅ Frontend dashboard loading without errors
- ✅ User can login/logout successfully

The JWT authentication system provides better security, scalability, and user experience compared to session-based authentication.
