# Neberku Bootstrap Templates Usage Guide

This guide explains how to use the Bootstrap templates that integrate with your Neberku API endpoints.

## Overview

The templates are designed to provide a complete user experience for both event owners and guests:

1. **Landing Page** (`landing.html`) - Marketing page for the platform
2. **Login Page** (`login.html`) - User authentication
3. **Registration Page** (`register.html`) - User account creation
4. **Event Owner Dashboard** (`event_owner_dashboard.html`) - Management interface for event hosts
5. **Guest Contribution Page** (`guest_contribution.html`) - Interface for guests to contribute content

## Template Structure

```
neberku/core/templates/core/
├── base.html                    # Base template with Bootstrap 5
├── landing.html                 # Landing page
├── login.html                   # User login form
├── register.html                # User registration form
├── event_owner_dashboard.html   # Event owner dashboard
└── guest_contribution.html      # Guest contribution interface
```

## Features

### Base Template (`base.html`)
- Bootstrap 5.3.0 integration
- Bootstrap Icons
- Responsive navigation
- Custom CSS for enhanced styling
- jQuery for AJAX functionality
- Modular design with template inheritance

### Landing Page (`landing.html`)
- Hero section with call-to-action
- Features overview
- How it works explanation
- Pricing information
- Contact form
- Smooth scrolling navigation

### Authentication Pages
- **Login** (`login.html`): User sign-in with form validation
- **Register** (`register.html`): User account creation with password strength indicator
- Both pages include error handling and success messages

### Event Owner Dashboard (`event_owner_dashboard.html`)
- Dashboard overview with statistics
- Event management (create, view, edit)
- Guest post moderation
- Media file management
- Real-time data loading from API
- Modal forms for data entry
- **Requires authentication**

### Guest Contribution Page (`guest_contribution.html`)
- Event information display
- Photo and video upload (drag & drop)
- Wish/message submission
- Gallery view of approved content
- Mobile-responsive design
- File validation and preview

## Authentication System

The platform now uses **Django's built-in session authentication** instead of token-based authentication:

### How It Works
1. **User Registration**: Users create accounts via `/register/`
2. **User Login**: Users authenticate via `/login/`
3. **Session Management**: Django handles sessions automatically
4. **Protected Routes**: Dashboard requires authentication
5. **Logout**: Users can sign out via `/logout/`

### Authentication URLs
- **Login**: `/login/`
- **Register**: `/register/`
- **Logout**: `/logout/`
- **Dashboard**: `/dashboard/` (protected)

## API Integration

### Event Owner Dashboard Endpoints

The dashboard integrates with these API endpoints using session authentication:

- **GET** `/api/events/` - Load user's events
- **POST** `/api/events/` - Create new event
- **GET** `/api/event-types/` - Load event types
- **GET** `/api/guest-posts/` - Load guest contributions
- **POST** `/api/guest-posts/{id}/approve/` - Approve guest post
- **POST** `/api/guest-posts/{id}/reject/` - Reject guest post
- **GET** `/api/media-files/` - Load media files
- **POST** `/api/media-files/{id}/approve/` - Approve media
- **POST** `/api/media-files/{id}/reject/` - Reject media

### Guest Contribution Endpoints

The guest page uses these endpoints:

- **GET** `/api/public-events/{id}/` - Load event details
- **GET** `/api/public-events/{id}/posts/` - Load approved posts
- **POST** `/api/guest-post-create/` - Submit guest contribution

## Usage Instructions

### 1. Accessing the Templates

#### Landing Page
```
http://yourdomain.com/
```

#### Authentication
```
http://yourdomain.com/login/      # User login
http://yourdomain.com/register/   # User registration
```

#### Event Owner Dashboard
```
http://yourdomain.com/dashboard/
```
*Requires user authentication - redirects to login if not authenticated*

#### Guest Contribution
```
http://yourdomain.com/contribute/
```

#### Specific Event Gallery
```
http://yourdomain.com/event/{event_id}/
```

### 2. Setting Up Authentication

The authentication system is now fully implemented:

1. ✅ **User Registration**: Users can create accounts
2. ✅ **User Login**: Users can authenticate
3. ✅ **Session Management**: Django handles sessions automatically
4. ✅ **Protected Routes**: Dashboard requires authentication
5. ✅ **Logout**: Users can sign out

**No additional setup required!** The system uses Django's built-in authentication.

### 3. Customizing the Templates

#### Colors and Branding
Modify the CSS variables in `base.html`:
```css
.hero-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

#### API Base URL
Update API calls if your endpoints are different:
```javascript
const response = await fetch('/api/events/', {
    credentials: 'include'  // Include cookies for session authentication
});
```

#### File Upload Limits
Adjust file size limits in `guest_contribution.html`:
```javascript
if (file.size > 50 * 1024 * 1024) { // 50MB limit
    showError(`Photo ${file.name} is too large. Maximum size is 50MB.`);
    return;
}
```

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features Used**: ES6+, Fetch API, File API, Drag & Drop, Session Cookies

## Responsive Design

The templates are fully responsive and work on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## Security Considerations

1. **CSRF Protection**: Forms include CSRF tokens
2. **Session Security**: Django's built-in session security
3. **File Validation**: Client and server-side file validation
4. **Authentication**: Protected routes require login
5. **Input Sanitization**: All user inputs are properly escaped

## Performance Features

- Lazy loading of images
- Efficient DOM manipulation
- Minimal external dependencies
- Optimized CSS and JavaScript
- Session-based authentication (no token management)

## Testing

### Run Authentication Tests
```bash
cd neberku
python test_auth.py
```

### Run Template Tests
```bash
cd neberku
python test_templates.py
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure Django's authentication middleware is enabled
   - Check that users exist in the database
   - Verify login/logout URLs are accessible

2. **API Endpoints Not Found**
   - Check that your Django URLs are properly configured
   - Verify the API base path in the templates

3. **File Upload Issues**
   - Verify file size limits in Django settings
   - Check media file configuration
   - Ensure proper permissions on media directories

4. **Template Not Found**
   - Verify template directory structure
   - Check Django template settings
   - Ensure templates are in the correct app directory

### Debug Mode

Enable Django debug mode to see detailed error messages:
```python
# settings.py
DEBUG = True
```

## Customization Examples

### Adding New Features

To add a new feature to the dashboard:

1. Add the HTML structure to the template
2. Create corresponding JavaScript functions
3. Integrate with your API endpoints
4. Test thoroughly

### Styling Modifications

To change the appearance:

1. Modify CSS in `base.html`
2. Add custom classes to elements
3. Override Bootstrap defaults
4. Test across different screen sizes

## Support

For issues or questions:
1. Check the Django debug output
2. Review browser console for JavaScript errors
3. Verify API endpoint responses
4. Check Django logs for server-side errors
5. Run the test scripts to verify functionality

## Future Enhancements

Potential improvements:
- Real-time notifications
- Advanced filtering and search
- Bulk operations
- Export functionality
- Analytics dashboard
- Multi-language support
- Dark mode theme
- Progressive Web App features
- Two-factor authentication
- Social login integration 