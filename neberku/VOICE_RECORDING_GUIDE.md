# Voice Recording Support Implementation

This document describes the implementation of voice recording support in the guest post creation endpoint (`api/guest-post-create/`).

## Overview

The voice recording feature allows guests to upload voice recordings along with photos and videos when creating guest posts. This enhances the guest contribution experience by enabling audio messages, voice notes, and spoken wishes.

## Changes Made

### 1. Model Updates (`core/models.py`)

#### MediaFile Model
- Added `'voice'` to `MEDIA_TYPES` choices
- Updated model documentation to include voice recordings

#### Event Model
- Added `allow_voice` boolean field (default: True)
- Added `voice_count` property to count voice recordings

#### GuestPost Model
- Added `voice_count` property to count voice recordings per post

#### EventSettings Model
- Added `max_voice_size` field (default: 10 MB)
- Added `max_voice_duration` field (default: 300 seconds / 5 minutes)
- Added `allowed_voice_formats` field (default: ['mp3', 'wav', 'm4a', 'aac'])

### 2. Serializer Updates (`api/serializers.py`)

#### GuestPostSerializer
- Added `voice_count` field to serialized output

#### GuestPostCreateSerializer
- Updated validation to check `allow_voice` setting
- Updated documentation to mention voice recordings

#### EventSerializer
- Added `allow_voice` field
- Added `voice_count` field
- Added `get_voice_count()` method

#### EventCreateSerializer
- Added `allow_voice` field to creation form

#### EventSummarySerializer
- Added `voice_count` field
- Added `get_voice_count()` method

#### EventGuestAccessSerializer
- Added `voice_count` field

### 3. View Updates (`api/views.py`)

#### GuestPostCreateViewSet
- Added support for `voice_recordings` file uploads
- Updated media limit validation to include voice recordings
- Added voice recording processing logic
- Added error handling for voice recording uploads

## API Usage

### Endpoint
```
POST /api/guest-post-create/
```

### Request Format
Use `multipart/form-data` with the following fields:

**Required Fields:**
- `event`: Event UUID
- `guest_name`: Guest's name
- `guest_phone`: Guest's phone number
- `wish_text`: Wish/message text

**Optional Media Fields:**
- `photos`: Multiple photo files
- `videos`: Multiple video files
- `voice_recordings`: Multiple voice/audio files

### Supported Voice Formats
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- AAC (.aac)

### File Size Limits
- Default maximum voice file size: 10 MB
- Default maximum voice duration: 5 minutes (300 seconds)
- Configurable per event through EventSettings

### Example Request
```bash
curl -X POST http://localhost:8000/api/guest-post-create/ \
  -F "event=123e4567-e89b-12d3-a456-426614174000" \
  -F "guest_name=John Doe" \
  -F "guest_phone=1234567890" \
  -F "wish_text=Happy birthday! Here's a voice message for you." \
  -F "voice_recordings=@voice_message.mp3" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg"
```

### Response Format
```json
{
  "id": "post-uuid",
  "guest": {
    "id": "guest-uuid",
    "name": "John Doe",
    "phone": "1234567890"
  },
  "event": "event-uuid",
  "wish_text": "Happy birthday! Here's a voice message for you.",
  "media_files": [
    {
      "id": "media-uuid",
      "media_type": "voice",
      "media_file": "/media/contributions/voice_message.mp3",
      "file_size": 1024000,
      "file_name": "voice_message.mp3",
      "mime_type": "audio/mp3",
      "is_approved": true,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total_media_files": 3,
  "photo_count": 2,
  "video_count": 0,
  "voice_count": 1,
  "is_approved": true,
  "created_at": "2024-01-01T12:00:00Z"
}
```

## Frontend Integration

### HTML Form Example
```html
<form id="guestPostForm" enctype="multipart/form-data">
  <input type="text" name="event" placeholder="Event ID" required>
  <input type="text" name="guest_name" placeholder="Your name" required>
  <input type="text" name="guest_phone" placeholder="Your phone" required>
  <textarea name="wish_text" placeholder="Your message" required></textarea>
  
  <!-- Voice recording -->
  <input type="file" name="voice_recordings" accept="audio/*" multiple>
  
  <!-- Photos -->
  <input type="file" name="photos" accept="image/*" multiple>
  
  <!-- Videos -->
  <input type="file" name="videos" accept="video/*" multiple>
  
  <button type="submit">Create Post</button>
</form>
```

### JavaScript Example
```javascript
const formData = new FormData();
formData.append('event', eventId);
formData.append('guest_name', guestName);
formData.append('guest_phone', guestPhone);
formData.append('wish_text', wishText);

// Add voice recordings
const voiceFiles = document.getElementById('voice_recordings').files;
for (let file of voiceFiles) {
  formData.append('voice_recordings', file);
}

// Add photos
const photoFiles = document.getElementById('photos').files;
for (let file of photoFiles) {
  formData.append('photos', file);
}

// Add videos
const videoFiles = document.getElementById('videos').files;
for (let file of videoFiles) {
  formData.append('videos', file);
}

fetch('/api/guest-post-create/', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Post created:', data);
  console.log(`Voice recordings: ${data.voice_count}`);
});
```

## Testing

### Test Files Created
1. `test_voice_recording.py` - Python test script
2. `test-voice-recording.html` - HTML test page with voice recording functionality

### Running Tests
1. **Python Test Script:**
   ```bash
   cd neberku
   python test_voice_recording.py
   ```

2. **HTML Test Page:**
   - Open `neberku-frontend/test-voice-recording.html` in a browser
   - Enter an event ID
   - Record voice or upload audio files
   - Test the complete functionality

### Test Scenarios
1. **Voice-only upload**: Upload only voice recordings
2. **Mixed media upload**: Upload photos, videos, and voice recordings together
3. **File format validation**: Test different audio formats
4. **File size limits**: Test with files exceeding size limits
5. **Media count limits**: Test with files exceeding per-post limits

## Database Migration

Run the following command to apply the database changes:

```bash
python manage.py makemigrations core --name add_voice_recording_support
python manage.py migrate
```

## Configuration

### Event Settings
Voice recording settings can be configured per event through the EventSettings model:

```python
# Example: Configure voice settings for an event
event_settings = EventSettings.objects.get(event=event)
event_settings.max_voice_size = 20  # 20 MB
event_settings.max_voice_duration = 600  # 10 minutes
event_settings.allowed_voice_formats = ['mp3', 'wav', 'ogg']
event_settings.save()
```

### Default Settings
- Maximum voice file size: 10 MB
- Maximum voice duration: 5 minutes (300 seconds)
- Allowed formats: MP3, WAV, M4A, AAC
- Voice recordings enabled by default for all events

## Security Considerations

1. **File Validation**: Voice files are validated for format and size
2. **Content Type Checking**: MIME type validation for uploaded files
3. **File Size Limits**: Configurable limits to prevent abuse
4. **Duration Limits**: Maximum recording duration to prevent excessive uploads

## Performance Considerations

1. **File Storage**: Voice files are stored in the `contributions/` directory
2. **Database Indexing**: Media files are indexed by media type for efficient queries
3. **Streaming**: Large voice files can be streamed for playback
4. **Compression**: Consider implementing audio compression for storage optimization

## Future Enhancements

1. **Audio Compression**: Automatic compression of uploaded voice files
2. **Transcription**: Automatic speech-to-text conversion
3. **Audio Processing**: Noise reduction and audio enhancement
4. **Playback Controls**: Advanced audio player with seek, speed controls
5. **Voice Clips**: Short voice clips for quick messages
6. **Audio Effects**: Basic audio effects and filters

## Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file format is supported
   - Verify file size is within limits
   - Ensure proper multipart/form-data encoding

2. **Voice Recording Not Working**
   - Check browser microphone permissions
   - Verify HTTPS connection for microphone access
   - Test with different browsers

3. **Database Errors**
   - Run migrations: `python manage.py migrate`
   - Check database permissions
   - Verify model field types

### Debug Mode
Enable debug logging to troubleshoot issues:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Support

For issues or questions regarding the voice recording functionality:
1. Check the test files for examples
2. Review the API documentation
3. Test with the provided HTML test page
4. Check server logs for error messages
