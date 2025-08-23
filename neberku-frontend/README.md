# Neberku Frontend - Event Creation Dashboard

This document describes the fixed event creation functionality in the Neberku dashboard.

## 🚀 Event Creation Features

### ✅ What's Working Now

1. **Form Validation**: Real-time validation with visual feedback
2. **Required Field Checking**: All mandatory fields are properly validated
3. **Date Validation**: Ensures event date is in the future
4. **Loading States**: Shows spinner during form submission
5. **Error Handling**: Comprehensive error messages for various failure scenarios
6. **Success Feedback**: Clear confirmation when events are created
7. **Form Reset**: Automatically resets form after successful creation
8. **File Uploads**: Support for event thumbnails and videos
9. **Dynamic Dropdowns**: Packages and event types loaded from API
10. **File Preview**: Live preview of uploaded images and videos

### 🔧 Technical Improvements

- **CSRF Token Handling**: Proper CSRF token management for Django backend
- **Session Authentication**: Uses Django session cookies for authentication
- **API Error Parsing**: Better error message extraction from API responses
- **Form State Management**: Proper form validation and error clearing
- **Responsive Design**: Mobile-friendly form layout with Bootstrap 5
- **Multipart Form Data**: Proper handling of file uploads
- **Dynamic Data Loading**: Real-time population of packages and event types

## 📋 Event Creation Form Fields

### Required Fields (marked with *)
- **Event Title**: Text input for event name
- **Event Date**: Date picker (must be in the future)
- **Location**: Text input for event location
- **Description**: Textarea for event description
- **Package**: Dropdown populated from API (Basic, Standard, Premium, Enterprise)
- **Event Type**: Dropdown populated from API (Wedding, Birthday, Anniversary, etc.)

### Optional Fields
- **Event Thumbnail**: Image upload (JPG, PNG, GIF, WebP, max 10MB)
- **Event Video**: Video upload (MP4, MOV, AVI, WebM, max 100MB)
- **Allow Photos**: Toggle for photo uploads (default: Yes)
- **Allow Videos**: Toggle for video uploads (default: Yes)
- **Allow Wishes**: Toggle for text wishes (default: Yes)
- **Auto-approve Posts**: Toggle for automatic post approval (default: No)

## 🎯 How to Use

### 1. Access the Dashboard
- Navigate to `dashboard.html`
- Ensure you're logged in (authentication required)

### 2. Fill Out the Form
- All required fields are marked with red asterisks (*)
- Date field automatically defaults to tomorrow
- Boolean fields have sensible defaults
- Package and event type dropdowns are automatically populated

### 3. Upload Files (Optional)
- **Thumbnail**: Select an image file (max 10MB)
- **Video**: Select a video file (max 100MB)
- Live preview shows selected files
- File validation ensures correct formats

### 4. Submit the Form
- Click "Create Event" button
- Form validates all fields before submission
- Loading spinner shows during API call
- Success/error messages appear as notifications

### 5. View Results
- New events appear at the top of the events list
- Statistics update automatically
- Form resets for next event creation

## 🔍 Troubleshooting

### Common Issues

1. **"Unable to connect to the server"**
   - Ensure Django backend is running on `http://localhost:8000`
   - Check if the server is accessible

2. **"Authentication required"**
   - Make sure you're logged in
   - Check if session cookies are being set properly

3. **"Validation errors"**
   - Fill in all required fields
   - Ensure event date is in the future
   - Select both package and event type

4. **"CSRF token missing"**
   - This is handled automatically, but ensure cookies are enabled
   - Check browser console for CSRF-related warnings

### Debug Mode

Open browser console (F12) to see:
- API request/response details
- Authentication status
- Form validation messages
- Error details

## 🛠️ Backend Requirements

The frontend expects the Django backend to have:

1. **Event Types**: Run `python manage.py create_event_types`
2. **Packages**: Run `python manage.py create_packages`
3. **Users**: Create users via Django admin or registration
4. **API Endpoints**: `/api/events/` for event creation

## 📱 Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: Responsive design for mobile devices
- **JavaScript**: ES6+ features required
- **Cookies**: Must be enabled for authentication

## 🎨 Customization

### Styling
- CSS classes in `css/custom.css`
- Bootstrap 5 classes for layout
- Custom validation styles

### Form Behavior
- Validation rules in `js/dashboard.js`
- API configuration in `js/config.js`
- Error handling and user feedback

## 🔐 Security Features

- **CSRF Protection**: Automatic CSRF token handling
- **Session Authentication**: Secure cookie-based sessions
- **Input Validation**: Client-side and server-side validation
- **XSS Prevention**: Proper HTML escaping

## 📊 API Integration

The frontend integrates with Django REST Framework endpoints:

- **POST** `/api/events/` - Create new event
- **GET** `/api/events/` - List user's events
- **GET** `/api/event-types/` - List available event types
- **GET** `/api/packages/` - List available packages

## 🚀 Future Enhancements

Potential improvements for the event creation system:

1. **File Uploads**: Support for event thumbnails and videos
2. **Draft Saving**: Auto-save form data as draft
3. **Event Templates**: Pre-configured event settings
4. **Bulk Operations**: Create multiple events at once
5. **Advanced Validation**: Custom validation rules
6. **Offline Support**: Work offline and sync when connected

## 📞 Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify Django backend is running and accessible
3. Ensure all required data (event types, packages) exists
4. Check authentication status and session cookies
5. Review the API documentation at `/swagger/`

---

**Note**: This frontend is designed to work with the Neberku Django backend. Ensure both systems are properly configured and running. 