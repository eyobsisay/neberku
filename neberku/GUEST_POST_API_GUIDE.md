# Guest Post Creation API Guide

## Overview

The Guest Post Creation API allows guests to create posts with multiple media files (photos and videos) for events. This API is designed to handle multiple file uploads efficiently and automatically detects media types based on file extensions.

## API Endpoint

```
POST /api/guest-post-create/
```

**Content-Type:** `multipart/form-data`

## Request Format

### Form Data Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | Yes | Event UUID where the post will be created |
| `guest_name` | string | Yes | Guest's full name |
| `guest_phone` | string | Yes | Guest's phone number |
| `wish_text` | string | Yes | Message or wish text |
| `photos` | file | No | Photo file (JPG, PNG, GIF, BMP, WebP) |
| `videos` | file | No | Video file (MP4, AVI, MOV, WMV, FLV, WebM) |

### Media Files

- **Photos**: Upload photos using the `photos` field
- **Videos**: Upload videos using the `videos` field
- **Multiple Files**: To upload multiple files, use multiple `photos` and `videos` keys in form-data
- **File Types**: 
  - Photos: JPG, PNG, GIF, BMP, WebP
  - Videos: MP4, AVI, MOV, WMV, FLV, WebM
- **Swagger Support**: File upload fields are properly documented in the API documentation

## Usage Examples

### 1. Create a Guest Post with Multiple Photos

```bash
curl -X POST http://localhost:8000/api/guest-post-create/ \
  -F "event=your-event-uuid-here" \
  -F "guest_name=John Doe" \
  -F "guest_phone=+1234567890" \
  -F "wish_text=Happy birthday! Here are some photos from the party!" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg" \
  -F "photos=@photo3.jpg"
```

**Note**: Each photo gets its own `photos` key in the form-data.

### 2. Create a Guest Post with Multiple Videos

```bash
curl -X POST http://localhost:8000/api/guest-post-create/ \
  -F "event=your-event-uuid-here" \
  -F "guest_name=Jane Smith" \
  -F "guest_phone=+1987654321" \
  -F "wish_text=Congratulations! Here are the videos from your special day!" \
  -F "videos=@video1.mp4" \
  -F "videos=@video2.mp4"
```

**Note**: Each video gets its own `videos` key in the form-data.

### 3. Create a Guest Post with Mixed Media

```bash
curl -X POST http://localhost:8000/api/guest-post-create/ \
  -F "event=your-event-uuid-here" \
  -F "guest_name=Bob Wilson" \
  -F "guest_phone=+1555123456" \
  -F "wish_text=Amazing celebration! Photos and videos included!" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg" \
  -F "videos=@video1.mp4"
```

**Note**: Multiple files of the same type use multiple keys with the same name.

### 4. Create a Guest Post with Just Text (No Media)

```bash
curl -X POST http://localhost:8000/api/guest-post-create/ \
  -F "event=your-event-uuid-here" \
  -F "guest_name=Alice Johnson" \
  -F "guest_phone=+1555987654" \
  -F "wish_text=Happy birthday! Wishing you all the best!"
```

## Frontend Implementation

### JavaScript (FormData)

```javascript
const formData = new FormData();
formData.append('event', eventId);
formData.append('guest_name', 'John Doe');
formData.append('guest_phone', '+1234567890');
formData.append('wish_text', 'Happy birthday!');

// Add multiple photos - each photo gets its own 'photos' key
const photoInput = document.getElementById('photos');
for (let file of photoInput.files) {
    formData.append('photos', file);  // Same key name for multiple files
}

// Add multiple videos - each video gets its own 'videos' key
const videoInput = document.getElementById('videos');
for (let file of videoInput.files) {
    formData.append('videos', file);  // Same key name for multiple files
}

// Send request
fetch('/api/guest-post-create/', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

### HTML Form

```html
<form enctype="multipart/form-data">
    <input type="text" name="event" placeholder="Event UUID" required>
    <input type="text" name="guest_name" placeholder="Guest Name" required>
    <input type="tel" name="guest_phone" placeholder="Phone Number" required>
    <textarea name="wish_text" placeholder="Your message" required></textarea>
    
    <!-- Multiple photo input - each selected file will be sent with 'photos' key -->
    <input type="file" name="photos" multiple accept="image/*">
    
    <!-- Multiple video input - each selected file will be sent with 'videos' key -->
    <input type="file" name="videos" multiple accept="video/*">
    
    <button type="submit">Create Post</button>
</form>
```

**Important**: The `multiple` attribute allows users to select multiple files, and each file will be sent with the same field name (`photos` or `videos`).

## Python Implementation

### Using requests library

```python
import requests

# Prepare data
data = {
    'event': 'your-event-uuid-here',
    'guest_name': 'John Doe',
    'guest_phone': '+1234567890',
    'wish_text': 'Happy birthday!'
}

# Prepare photos - each photo gets its own 'photos' key
photos = [
    ('photos', open('photo1.jpg', 'rb')),
    ('photos', open('photo2.jpg', 'rb')),
    ('photos', open('photo3.jpg', 'rb'))
]

# Prepare videos - each video gets its own 'videos' key
videos = [
    ('videos', open('video1.mp4', 'rb')),
    ('videos', open('video2.mp4', 'rb'))
]

# Combine all files - requests will handle multiple keys with same name
files = photos + videos

# Send request
response = requests.post(
    'http://localhost:8000/api/guest-post-create/',
    data=data,
    files=files
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Close all files
for _, file_obj in files:
    file_obj.close()
```

**Important**: Each file gets its own key name (`photos` or `videos`) in the files list. The requests library will send multiple keys with the same name, which is exactly what we need for multiple file uploads.

## Response Format

### Success Response (201 Created)

```json
{
    "id": "post-uuid-here",
    "guest": {
        "id": "guest-uuid-here",
        "name": "John Doe",
        "phone": "+1234567890",
        "total_posts": 1,
        "total_media_files": 3
    },
    "event": "event-uuid-here",
    "wish_text": "Happy birthday! Here are some photos from the party!",
    "media_files": [
        {
            "id": "media-uuid-1",
            "media_type": "photo",
            "media_file": "/media/contributions/photo1.jpg",
            "media_thumbnail": null,
            "file_size": 1024000,
            "file_name": "photo1.jpg",
            "mime_type": "image/jpeg",
            "is_approved": true,
            "created_at": "2024-01-15T10:30:00Z"
        },
        {
            "id": "media-uuid-2",
            "media_type": "photo",
            "media_file": "/media/contributions/photo2.jpg",
            "media_thumbnail": null,
            "file_size": 2048000,
            "file_name": "photo2.jpg",
            "mime_type": "image/jpeg",
            "is_approved": true,
            "created_at": "2024-01-15T10:30:00Z"
        }
    ],
    "total_media_files": 2,
    "photo_count": 2,
    "video_count": 0,
    "is_approved": true,
    "created_at": "2024-01-15T10:30:00Z"
}
```

### Error Response (400 Bad Request)

```json
{
    "non_field_errors": [
        "Maximum media files per post (3) exceeded. You uploaded 5 files."
    ]
}
```

## Validation Rules

### Media Limits

- **Per Post Limit**: Controlled by event settings (`max_media_per_post`)
- **Default Limit**: 3 media files per post if no settings configured
- **Validation**: Checked after post creation, post is deleted if limit exceeded

### Event Requirements

- Event must have `status='active'` and `payment_status='paid'`
- Event must allow media uploads (`allow_photos=True` or `allow_videos=True`)
- Event must allow wishes (`allow_wishes=True`)

### Guest Limits

- **Posts per guest**: Controlled by event settings (`max_posts_per_guest`)
  - When limit is exceeded, posts are created but marked as `is_approved=False`
  - Event hosts can manually approve these posts if desired
- **Guests per event**: Controlled by package (`package.max_guests`)
  - When the package guest cap is reached, NEW guest submissions still create posts
    but these posts are marked as `is_approved=False`
  - Existing guests can continue posting; this cap applies only to creation by new guests
- **Phone number**: Must be unique per event

## Error Handling

### Common Error Scenarios

1. **Media Limit Exceeded**
   - Error: "Maximum media files per post (X) exceeded. You uploaded Y files."
   - Action: Post is automatically deleted, no partial creation

2. **Event Not Found or Invalid**
   - Error: "Invalid pk \"invalid-uuid\" - object does not exist."
   - Action: Check event UUID and ensure event exists

3. **Event Not Active**
   - Error: "This event does not allow media uploads."
   - Action: Ensure event status is 'active' and payment_status is 'paid'

4. **File Processing Error**
   - Error: "Error processing media file filename: error details"
   - Action: Post is deleted, check file format and size

## Testing

### Test Files

Use the provided test files:
- `test_guest_post.py` - Python test script
- `test_guest_post.html` - HTML test page
- `test_api.py` - Python API testing script

### Manual Testing

1. **Start Django server**: `python manage.py runserver`
2. **Open test page**: Navigate to `test_guest_post.html`
3. **Enter event UUID**: Use an existing event UUID
4. **Upload files**: Select multiple photos/videos
5. **Submit**: Check console for debug output

## Debugging

The API includes comprehensive debugging output:

```
DEBUG: Creating guest post with data: {...}
DEBUG: Files: {...}
DEBUG: Serializer validated successfully
DEBUG: Post created with ID: ...
DEBUG: Found X media files
DEBUG: Processing media file 1: filename.jpg
DEBUG: Media type: photo, Size: 1024000, MIME: image/jpeg
DEBUG: Created media file with ID: ...
```

## Technical Details

### File Processing

1. **Post Creation**: Guest post is created first
2. **Media Processing**: Media files are processed after post creation
3. **Type Detection**: Automatic based on file extensions
4. **Metadata**: File size, name, and MIME type are extracted
5. **Rollback**: Post is deleted if any media file fails

### Database Relations

- **GuestPost** → **Guest** (ForeignKey)
- **GuestPost** → **Event** (ForeignKey)
- **MediaFile** → **GuestPost** (ForeignKey)
- **MediaFile** → **Guest** (ForeignKey)
- **MediaFile** → **Event** (ForeignKey)

### File Storage

- **Upload Path**: `contributions/` directory
- **File Naming**: Django's default file naming
- **Storage**: Uses Django's configured storage backend

## Security Features

- **No Authentication Required**: Guests can post without accounts
- **IP Tracking**: Guest IP addresses are recorded
- **User Agent Tracking**: Browser/device information is recorded
- **File Validation**: File types and sizes are validated
- **Event Restrictions**: Only active, paid events accept posts

## Performance Considerations

- **Batch Processing**: Multiple files are processed in sequence
- **Transaction Safety**: Post creation and media processing are atomic
- **Error Recovery**: Failed uploads don't leave orphaned posts
- **File Size**: Consider server limits for large file uploads

## Troubleshooting

### Common Issues

1. **"Event does not allow media uploads"**
   - Check event `allow_photos` and `allow_videos` settings
   - Ensure event status is 'active'

2. **"Maximum media files per post exceeded"**
   - Check event settings `max_media_per_post`
   - Reduce number of uploaded files

3. **"Event does not allow wishes"**
   - Check event `allow_wishes` setting

4. **File upload fails**
   - Check file format and size
   - Ensure proper multipart/form-data encoding
   - Verify file permissions

### Debug Steps

1. Check Django server console for debug output
2. Verify event exists and has correct status
3. Check file formats and sizes
4. Ensure proper form encoding
5. Test with single file first, then multiple files 