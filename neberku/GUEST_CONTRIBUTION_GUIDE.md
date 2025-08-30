# Guest Contribution Guide

This guide explains how to use the guest contribution functionality in the Neberku platform.

## Overview

The guest contribution system allows guests to:
- Access events using a contributor code (no authentication required)
- Submit contributions (wishes, photos, videos) to events
- View event details and contribute to the celebration

## Features

### 1. Event Access Control
- **All Events**: Require a valid contributor code for access
- **Code-Based Security**: Each event has a unique contributor code

### 2. Guest Contribution
- Submit text wishes/messages
- Upload photos and videos
- No account creation required
- Simple form-based submission

### 3. Event Discovery
- Browse public events
- View event details
- See contribution counts

## API Endpoints

### Guest Event Access
```
GET /api/guest/event/?code={contributor_code}
```
- `code`: Required - The contributor code for the event

**Response for Public Events:**
```json
{
  "id": "uuid",
  "title": "Event Title",
  "description": "Event description",
  "event_date": "2024-01-01T12:00:00Z",
  "location": "Event location",
  "event_type": {...},
  "event_thumbnail": "url",
  "package_name": "Package Name",
  "total_guest_posts": 5,
  "total_media_files": 12,
  "is_public": true,
  "is_accessible": true
}
```

**Response for Private Events (with valid code):**
```json
{
  "id": "uuid",
  "title": "Private Event",
  "description": "Private event description",
  "event_date": "2024-01-01T12:00:00Z",
  "location": "Private location",
  "event_type": {...},
  "event_thumbnail": "url",
  "package_name": "Package Name",
  "total_guest_posts": 3,
  "total_media_files": 8,
  "is_public": false,
  "is_accessible": true
}
```

**Error Response (Invalid Code):**
```json
{
  "error": "Access denied. Invalid contributor code or event is private."
}
```

### List Public Events
```
GET /api/guest/public-events/
```
Returns a list of all public events that guests can access without a code.

### Submit Contribution
```
POST /api/guest-post-create/
```
Submit a guest contribution with media files.

## Frontend Usage

### 1. Access Event
1. Navigate to the guest contribution page
2. Enter the contributor code from your event invitation
3. Click "Access Event"

### 2. Browse Public Events
1. View the "Public Events" section
2. Click on any event card to see details
3. Click "Contribute" to submit your contribution

### 3. Submit Contribution
1. Fill in your name and phone number
2. Write your message/wish
3. Optionally upload photos/videos
4. Click "Submit Contribution"

## Event Types

### Event Access
- **All Events**: Require contributor code for access
- **Public Events**: Can be discovered in the public events list
- **Private Events**: Only accessible with the specific contributor code
- **Gallery**: Accessible to anyone with the contributor code
- **Approval**: Depends on event settings (auto or manual)
- **Use Cases**: Weddings, family gatherings, corporate events, private parties

## Security Features

1. **Contributor Code Validation**: All events require valid contributor codes for access
2. **Event Status Check**: Only active, paid events are accessible
3. **File Upload Limits**: Configurable file size and type restrictions
4. **Rate Limiting**: Prevents spam submissions

## Configuration

### Event Settings
```python
# In EventSettings model
public_gallery = models.BooleanField(default=False)
require_approval = models.BooleanField(default=False)
allow_anonymous = models.BooleanField(default=False)
max_posts_per_guest = models.PositiveIntegerField(default=5)
max_media_per_post = models.PositiveIntegerField(default=3)
```

### File Restrictions
```python
# Photo settings
max_photo_size = 10  # MB
allowed_photo_formats = ['jpg', 'png', 'heic']

# Video settings
max_video_size = 100  # MB
max_video_duration = 60  # seconds
allowed_video_formats = ['mp4', 'mov']
```

## Testing

### Create Test Events
Run the test script to create sample events:
```bash
cd neberku
python create_public_event.py
```

This creates:
- A public wedding event (requires contributor code)
- A private family gathering (requires contributor code)

### Test Frontend
1. Open `neberku-frontend/guest-contribution.html` in a browser
2. Test accessing events using contributor codes
3. Submit test contributions
4. Verify file uploads work correctly

## Troubleshooting

### Common Issues

1. **"Invalid contributor code. Event not found."**
   - Verify the contributor code is correct
   - Ensure the event exists and is active

2. **"Access denied"**
   - Verify the contributor code is correct
   - Ensure the event is live (active + paid)

3. **"Event is not live"**
   - Event must have status 'active'
   - Payment status must be 'paid'

4. **File upload failures**
   - Check file size limits
   - Verify file format is supported
   - Ensure event allows the media type

### Debug Mode
Enable debug logging in Django settings:
```python
DEBUG = True
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'core': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## Best Practices

1. **Event Naming**: Use descriptive titles for better guest experience
2. **Contributor Codes**: Use memorable, easy-to-share codes
3. **File Limits**: Set reasonable limits based on your hosting capacity
4. **Approval Process**: Use auto-approval for public events, manual for private
5. **Notifications**: Consider email notifications for new contributions

## Future Enhancements

- Guest authentication system
- Social media sharing
- Contribution moderation tools
- Analytics and reporting
- Mobile app support
- Real-time notifications

## Support

For technical support or questions about the guest contribution system:
- Check the API documentation at `/api/swagger/`
- Review the Django admin interface
- Check server logs for error details
- Contact the development team
