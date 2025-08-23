# Neberku API Setup Guide

This guide will help you set up and test the Neberku API with the frontend.

## Prerequisites

- Python 3.8+ installed
- Django project set up
- Frontend project (`neberku-frontend`) ready

## Step 1: Start the Django Backend

1. Navigate to the Django project directory:
   ```bash
   cd neberku
   ```

2. Install dependencies (if not already done):
   ```bash
   pip install -r requirements.txt
   ```

3. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

4. Verify the server is running by visiting:
   - http://localhost:8000/ (should show the landing page)
   - http://localhost:8000/api/ (should show the API root)

## Step 2: Test the API Endpoints

1. Run the API test script:
   ```bash
   python test_api_endpoints.py
   ```

2. This will test:
   - Server connectivity
   - User registration
   - User login
   - Events endpoint

## Step 3: Test the Frontend

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd neberku-frontend
   ```

2. Start the frontend development server:
   ```bash
   npm run dev
   ```

3. Open your browser and visit:
   - http://localhost:3000/ (main page)
   - http://localhost:3000/test-config.html (configuration test)

## Step 4: Test API Connection

1. Open the test page: http://localhost:3000/test-config.html
2. Click the "Test API Connection" button
3. Check the results to see if the frontend can connect to the backend

## API Endpoints

### Authentication
- `POST /api/register/` - User registration
- `POST /api/login/` - User login
- `POST /api/logout/` - User logout

### Events
- `GET /api/events/` - List events
- `POST /api/events/` - Create event
- `GET /api/events/{id}/` - Get event details

### Guest Posts
- `GET /api/guest-posts/` - List guest posts
- `POST /api/guest-posts/` - Create guest post

## Troubleshooting

### "Unable to connect to the server" Error

This error occurs when:
1. **Django backend is not running**
   - Solution: Start Django with `python manage.py runserver`

2. **CORS issues**
   - Check that `corsheaders` is installed and configured
   - Verify `CORS_ALLOW_CREDENTIALS = True` in settings

3. **Port conflicts**
   - Ensure Django is running on port 8000
   - Check that no other service is using the port

### Frontend Configuration Issues

1. **API_CONFIG is not defined**
   - Check that `js/config.js` is loaded before other scripts
   - Verify the file path is correct

2. **Script loading order**
   - Ensure `config.js` is loaded first
   - Check browser console for JavaScript errors

### Authentication Issues

1. **Login/Registration fails**
   - Check Django server logs for errors
   - Verify the API endpoints are accessible
   - Test with the API test script

2. **Session authentication problems**
   - Ensure `credentials: 'include'` is set in fetch requests
   - Check that CORS allows credentials

## Testing the Complete Flow

1. **Create a user account**:
   - Visit http://localhost:3000/register.html
   - Fill out the registration form
   - Check Django logs for successful user creation

2. **Login with the account**:
   - Visit http://localhost:3000/login.html
   - Use the credentials from step 1
   - Should redirect to dashboard

3. **Access the dashboard**:
   - Should show user information
   - Events list should be accessible
   - Create event functionality should work

## Development Tips

1. **Check Django logs** for API errors
2. **Use browser developer tools** to monitor network requests
3. **Test API endpoints directly** with tools like Postman or curl
4. **Verify CORS headers** in browser network tab

## Common Issues and Solutions

### Issue: Frontend shows "Unable to connect to server"
**Solution**: Start Django backend with `python manage.py runserver`

### Issue: CORS errors in browser console
**Solution**: Verify `corsheaders` is properly configured in Django settings

### Issue: Authentication not working
**Solution**: Check that API endpoints are accessible and returning proper responses

### Issue: Script loading errors
**Solution**: Ensure proper script loading order in HTML files

## Next Steps

Once the basic setup is working:
1. Test user registration and login
2. Test event creation and listing
3. Test guest contribution functionality
4. Implement additional features as needed

## Support

If you encounter issues:
1. Check the Django server logs
2. Check browser console for JavaScript errors
3. Verify all dependencies are installed
4. Test API endpoints directly with the test script 