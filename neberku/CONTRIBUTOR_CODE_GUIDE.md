# Contributor Code System - User Guide

## Overview

The contributor code system allows event hosts to provide a unique 6-character code to their guests, enabling them to access and contribute to specific events without requiring user accounts.

## Features

- **Unique 6-character codes**: Each event gets a unique alphanumeric code (e.g., "ABC123")
- **Automatic generation**: Codes are generated automatically when events are created
- **Secure access**: Contributors must enter the correct code to access events
- **Session-based access**: Once a code is entered, access is maintained for the session
- **Admin management**: Event hosts can regenerate codes through the admin interface

## How It Works

### For Event Hosts

1. **Automatic Code Generation**: When you create an event, a contributor code is automatically generated
2. **Share the Code**: Share the 6-character code with your guests via:
   - Email
   - Text message
   - Social media
   - Printed invitations
   - QR codes (already available)
3. **Manage Codes**: Access your event dashboard to view and manage contributor codes
4. **Regenerate Codes**: If needed, regenerate codes through the admin interface

### For Contributors

1. **Get the Code**: Receive the contributor code from the event host
2. **Access the Event**: Go to `/access/` and enter the code
3. **Start Contributing**: Upload photos, videos, and leave wishes for the event

## Technical Details

### Code Format
- **Length**: 6 characters
- **Characters**: Uppercase letters (A-Z) and numbers (0-9)
- **Uniqueness**: Each code is unique across all events
- **Case-insensitive**: Users can enter codes in any case

### Database Schema
```python
class Event(models.Model):
    # ... other fields ...
    contributor_code = models.CharField(
        max_length=10, 
        unique=True, 
        blank=True, 
        null=True,
        help_text="Unique code for contributors to access this event"
    )
```

### Automatic Generation
Codes are generated automatically in the `Event.save()` method:
```python
def generate_contributor_code(self):
    """Generate a unique contributor code for the event"""
    import random
    import string
    
    if not self.contributor_code:
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not Event.objects.filter(contributor_code=code).exists():
                self.contributor_code = code
                break
```

## Usage Examples

### Creating an Event
```python
# The contributor code is automatically generated
event = Event.objects.create(
    title="My Wedding",
    description="Our special day",
    # ... other fields ...
)
print(f"Contributor code: {event.contributor_code}")
# Output: Contributor code: ABC123
```

### Finding an Event by Code
```python
try:
    event = Event.objects.get(contributor_code="ABC123")
    print(f"Found event: {event.title}")
except Event.DoesNotExist:
    print("Invalid contributor code")
```

### Regenerating a Code
```python
# In admin interface or programmatically
event.regenerate_contributor_code()
event.save()
```

## Management Commands

### Generate Codes for Existing Events
```bash
# Generate codes for events without them
python manage.py generate_contributor_codes

# Force regenerate all codes
python manage.py generate_contributor_codes --force

# Generate code for specific event
python manage.py generate_contributor_codes --event-id <uuid>
```

## Admin Interface

### Event Admin
- **List Display**: Shows contributor codes in the event list
- **Read-only Field**: Contributor code is displayed but not editable
- **Admin Actions**: 
  - Regenerate QR codes
  - Regenerate share links
  - **Regenerate contributor codes** (new)

### Code Display
Codes are displayed in a monospace font with a light background for easy reading.

## Security Considerations

1. **Code Uniqueness**: Each code is unique across all events
2. **Session-based Access**: Access is maintained only for the current session
3. **No User Accounts Required**: Contributors don't need to create accounts
4. **Event Status Check**: Only active events can be accessed with codes

## Testing

### Test Script
Run the test script to verify functionality:
```bash
python test_contributor_code.py
```

### Manual Testing
1. Create an event (code is auto-generated)
2. Go to `/access/` and enter the code
3. Verify access to the event
4. Test with invalid codes
5. Test code regeneration

## Troubleshooting

### Common Issues

1. **Code Not Generated**: Ensure the event is saved properly
2. **Duplicate Code Error**: Regenerate the code using admin actions
3. **Access Denied**: Check if the event status is 'active'
4. **Session Issues**: Clear browser cookies/session data

### Debug Commands
```bash
# Check all events and their codes
python manage.py shell
>>> from core.models import Event
>>> for e in Event.objects.all(): print(f"{e.title}: {e.contributor_code}")
```

## Future Enhancements

- **Code Expiration**: Add expiration dates to codes
- **Usage Tracking**: Track how many times each code is used
- **Bulk Code Generation**: Generate multiple codes for large events
- **Code Sharing**: Built-in sharing mechanisms for codes
- **Access Logs**: Track who accessed events and when

## Support

For technical support or questions about the contributor code system, please refer to the main project documentation or contact the development team.
