# Neberku - POV Camera App

A simplified version of the POV camera app that allows event hosts to create events and collect photos, videos, and wishes from guests without requiring them to log in.

## 🚀 **Getting Started**

### **Prerequisites**
- Python 3.8+
- Django 5.2+
- SQLite (for development)

### **Installation**
1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run migrations: `python manage.py migrate`
6. Create a superuser: `python manage.py createsuperuser`
7. Create sample data: `python manage.py create_packages` and `python manage.py create_event_types`
8. Generate QR codes for existing events: `python manage.py generate_qr_codes`
9. Start the server: `python manage.py runserver`

### **API Documentation**
The API includes comprehensive Swagger documentation:

- **Swagger UI**: `/swagger/` - Interactive API documentation
- **ReDoc**: `/redoc/` - Alternative documentation view
- **OpenAPI Schema**: `/swagger.json` - Raw API specification

### **API Endpoints**

### Public Endpoints (No Authentication Required)
- `GET /api/event-types/` - List available event types
- `GET /api/event-types/featured/` - Get featured event types
- `GET /api/event-types/{id}/` - Get specific event type details
- `GET /api/packages/` - List available packages
- `GET /api/public-events/` - List live events
- `GET /api/public-events/{id}/` - Get event details
- `GET /api/public-events/{id}/contributions/` - Get event contributions
- `POST /api/contributions/` - Create guest contribution

### Protected Endpoints (Authentication Required)
- `GET /api/events/` - List user's events
- `POST /api/events/` - Create new event
- `GET /api/events/{id}/` - Get event details
- `PUT /api/events/{id}/` - Update event
- `DELETE /api/events/{id}/` - Delete event
- `POST /api/events/{id}/publish/` - Publish event
- `POST /api/events/{id}/activate/` - Activate event
- `GET /api/events/{id}/gallery/` - Get event gallery
- `GET /api/events/{id}/summary/` - Get event summary

### Admin-Only Endpoints (Admin Authentication Required)
- `POST /api/event-types/` - Create new event type
- `PUT /api/event-types/{id}/` - Update event type
- `DELETE /api/event-types/{id}/` - Delete event type
- `POST /api/packages/` - Create new package
- `PUT /api/packages/{id}/` - Update package
- `DELETE /api/packages/{id}/` - Delete package

### Payment Endpoints
- `GET /api/payments/` - List payments
- `POST /api/payments/` - Create payment (amount automatically set from package)
- `POST /api/payments/{id}/confirm/` - Confirm payment

## Event Type Management

### Creating Event Types via API

Event types can be created through the API using admin authentication. Here's how to create a new event type:

```bash
# Create a new event type (Admin only)
POST /api/event-types/
Authorization: Token <your_admin_token>
Content-Type: application/json

{
    "name": "Graduation Party",
    "description": "Celebrate academic achievements with friends and family",
    "icon": "fas fa-graduation-cap",
    "color": "#32CD32",
    "is_active": true,
    "sort_order": 11
}
```

**Required Fields:**
- `name`: Unique name for the event type (required)
- `description`: Description of the event type (optional)
- `icon`: CSS class or icon name (optional)
- `color`: Hex color code (optional)
- `is_active`: Whether the event type is active (default: true)
- `sort_order`: Display order (default: 0)

**Response:**
```json
{
    "id": 11,
    "name": "Graduation Party",
    "description": "Celebrate academic achievements with friends and family",
    "icon": "fas fa-graduation-cap",
    "color": "#32CD32",
    "is_active": true,
    "sort_order": 11
}
```

**Note:** Only users with `is_staff=True` can create, update, or delete event types. Regular users can only view them.

## Package Management

### Creating Packages via API

Packages can be created through the API using admin authentication. Here's how to create a new package:

```bash
# Create a new package (Admin only)
POST /api/packages/
Authorization: Token <your_admin_token>
Content-Type: application/json

{
    "name": "Premium Package",
    "description": "High-end package with generous limits and premium features",
    "price": "49.99",
    "max_guests": 200,
    "max_photos": 1000,
    "max_videos": 100,
    "features": ["QR Code", "Advanced Analytics", "Priority Support", "Custom Branding"],
    "is_active": true
}
```

**Required Fields:**
- `name`: Package name (required)
- `description`: Package description (required)
- `price`: Package price in decimal format (required, must be > 0)
- `max_guests`: Maximum number of guests allowed (required, must be > 0)
- `max_photos`: Maximum number of photos allowed (required, must be >= 0)
- `max_videos`: Maximum number of videos allowed (required, must be >= 0)
- `features`: List of package features (optional, defaults to empty list)
- `is_active`: Whether the package is active (optional, defaults to true)

**Response:**
```json
{
    "id": 2,
    "name": "Premium Package",
    "description": "High-end package with generous limits and premium features",
    "price": "49.99",
    "max_guests": 200,
    "max_photos": 1000,
    "max_videos": 100,
    "features": ["QR Code", "Advanced Analytics", "Priority Support", "Custom Branding"],
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
}
```

**Validation Rules:**
- Price must be greater than zero
- Maximum guests must be greater than zero
- Maximum photos and videos must be non-negative
- Features must be a valid JSON array

**Note:** Only users with `is_staff=True` can create, update, or delete packages. Regular users can only view them.

## Payment Management

### Creating Payments via API

Payments can be created through the API with automatic amount calculation from the event's package. Here's how to create a new payment:

```bash
# Create a new payment (amount automatically set from package)
POST /api/payments/
Authorization: Token <your_auth_token>
Content-Type: application/json

{
    "event_id": "event-uuid-here",
    "payment_method": "stripe",
    "transaction_id": "txn_123456789"
}
```

**Required Fields:**
- `event_id`: Event ID for the payment (required)
- `payment_method`: Payment method (required: 'stripe', 'paypal', 'manual')
- `transaction_id`: External transaction ID (optional)

**Automatically Set Fields:**
- `amount`: Automatically set from the event's package price (read-only)
- `status`: Automatically set to 'pending' (read-only)
- `created_at`: Automatically set to current timestamp (read-only)

**Response:**
```json
{
    "id": 1,
    "event": {
        "id": "event-uuid-here",
        "title": "My Event",
        "description": "Event description",
        "package": {
            "id": 1,
            "name": "Premium Package",
            "price": "49.99"
        }
    },
    "event_id": "event-uuid-here",
    "amount": "49.99",
    "payment_method": "stripe",
    "transaction_id": "txn_123456789",
    "status": "pending",
    "paid_at": null,
    "created_at": "2024-01-15T10:30:00Z"
}
```

**Important Notes:**
- The payment amount is automatically calculated from the event's package price
- You cannot manually set the amount - it's always derived from the package
- The event must have a valid package selected
- Creating a payment automatically updates the event's payment status to 'pending'
- Only authenticated users can create payments for their own events

## Guest Post Creation with Multiple Media Files

### Multiple Media Upload Support

Guest posts now support uploading multiple photos and videos at once, making it easier for guests to share their memories from events.

### API Usage

**Create a guest post with multiple photos:**
```bash
POST /api/guest-post-create/
Content-Type: multipart/form-data

Form Data:
- event: "event-uuid-here"
- guest_name: "John Doe"
- guest_phone: "+1234567890"
- wish_text: "Happy birthday! Here are some photos from the party!"

Files:
- media_files: photo1.jpg
- media_files: photo2.jpg
- media_files: photo3.jpg
```

**Create a guest post with multiple videos:**
```bash
POST /api/guest-post-create/
Content-Type: multipart/form-data

Form Data:
- event: "event-uuid-here"
- guest_name: "Jane Smith"
- guest_phone: "+1234567890"
- wish_text: "Congratulations! Here are the videos from your special day!"

Files:
- media_files: video1.mp4
- media_files: video2.mp4
```

**Create a guest post with mixed media:**
```bash
POST /api/guest-post-create/
Content-Type: multipart/form-data

Form Data:
- event: "event-uuid-here"
- guest_name: "Bob Wilson"
- guest_phone: "+1234567890"
- wish_text: "Amazing celebration! Photos and videos included!"

Files:
- media_files: photo1.jpg
- media_files: photo2.jpg
- media_files: video1.mp4
```

**Create a guest post with just text (no media):**
```bash
POST /api/guest-post-create/
Content-Type: application/json

{
    "event": "event-uuid-here",
    "guest_name": "Alice Johnson",
    "guest_phone": "+1234567890",
    "wish_text": "Happy birthday! Wishing you all the best!"
}
```

### Field Descriptions

- **`event`**: Event ID where the post will be created (required)
- **`guest_name`**: Guest's full name (required)
- **`guest_phone`**: Guest's phone number (required)
- **`wish_text`**: Message or wish text (required)
- **`media_files`**: List of media files (optional, multiple files supported)

### Media Type Detection

The system automatically detects media types based on file extensions:
- **Photos**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
- **Videos**: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`
- **Unknown extensions**: Default to photo type

### Media Limits and Validation

- **Per Post Limit**: Controlled by event settings (`max_media_per_post`)
- **Default Limit**: 3 media files per post if no settings configured
- **Type Validation**: Photos only if `allow_photos=True`, videos only if `allow_videos=True`
- **Guest Limits**: Controlled by event settings (`max_posts_per_guest`)
- **Text-Only Posts**: Supported when no media files are provided

### Response Format

```json
{
    "id": "post-uuid-here",
    "guest": {
        "id": "guest-uuid-here",
        "name": "John Doe",
        "phone": "+1234567890"
    },
    "event": "event-uuid-here",
    "wish_text": "Happy birthday! Here are some photos from the party!",
    "media_files": [
        {
            "id": "media-uuid-1",
            "media_type": "photo",
            "media_file": "/media/contributions/photo1.jpg",
            "is_approved": true
        },
        {
            "id": "media-uuid-2",
            "media_type": "photo",
            "media_file": "/media/contributions/photo2.jpg",
            "is_approved": true
        }
    ],
    "total_media_files": 2,
    "photo_count": 2,
    "video_count": 0,
    "is_approved": true,
    "created_at": "2024-01-15T10:30:00Z"
}
```

### Benefits

1. **Better User Experience**: Guests can upload multiple files in one post
2. **Efficient Sharing**: No need to create multiple posts for related media
3. **Organized Content**: Related photos/videos stay together
4. **Flexible Limits**: Configurable per-event media limits
5. **Type Separation**: Clear distinction between photos and videos
6. **Automatic Detection**: Media types are automatically determined from file extensions
7. **Text-Only Support**: Guests can post wishes without uploading media
8. **Simple API**: Single `media_files` field for all types of media
9. **Swagger Compatible**: Works seamlessly with API documentation tools (drf-yasg compatible)

### Technical Implementation

The multiple media upload feature is implemented using Django's `request.FILES.getlist('media_files')` approach:

- **Serializer**: Uses a `CharField` for Swagger compatibility instead of `ListField(child=FileField())`
- **View Processing**: Media files are processed in the view after post creation
- **File Handling**: Each file uploaded with the `media_files` key is processed individually
- **Type Detection**: Media types are automatically determined from file extensions
- **Error Handling**: Comprehensive validation for media limits and file types
- **Rollback**: If media limits are exceeded, the post is automatically deleted

This approach ensures compatibility with `drf-yasg` while maintaining the same user experience for multiple file uploads.

### Practical Usage Examples

**Frontend Implementation:**
```javascript
// Using FormData for multiple file uploads
const formData = new FormData();
formData.append('event', eventId);
formData.append('guest_name', 'John Doe');
formData.append('guest_phone', '+1234567890');
formData.append('wish_text', 'Happy birthday!');

// Add multiple files - each file gets its own 'media_files' key
const fileInput = document.getElementById('media-files');
for (let file of fileInput.files) {
    formData.append('media_files', file);
}

// Send request
fetch('/api/guest-post-create/', {
    method: 'POST',
    body: formData
});
```

**Mobile App Usage:**
```python
# Python example for mobile apps
import requests

# Each file gets its own 'media_files' key for multiple file uploads
files = [
    ('media_files', open('photo1.jpg', 'rb')),
    ('media_files', open('photo2.jpg', 'rb')),
    ('media_files', open('video1.mp4', 'rb'))
]

data = {
    'event': 'event-uuid-here',
    'guest_name': 'John Doe',
    'guest_phone': '+1234567890',
    'wish_text': 'Amazing party!'
}

response = requests.post(
    'http://yourdomain.com/api/guest-post-create/',
    data=data,
    files=files
)
```

## Automatic QR Code and Share Link Generation

### How It Works

When you create an event, the system automatically generates:

1. **QR Code**: A unique QR code image that guests can scan to access the event
2. **Share Link**: A direct URL that can be shared with guests via email, social media, etc.

### Generation Details

- **QR Code**: Generated as a PNG image and stored in the `qr_codes/` directory
- **Share Link**: Format: `{SITE_URL}/event/{event_id}/`
- **Automatic**: Both are generated immediately when the event is created
- **Unique**: Each event gets its own unique QR code and share link

### Admin Management

Administrators can:
- **Regenerate QR Codes**: Use the admin action "Regenerate QR codes for selected events"
- **Regenerate Share Links**: Use the admin action "Regenerate share links for selected events"
- **View Generated Assets**: See QR codes and share links in the event admin interface

### Configuration

The `SITE_URL` setting in `settings.py` controls the base URL for share links:
```python
# Development
SITE_URL = 'http://localhost:8000'

# Production
SITE_URL = 'https://yourdomain.com'
```

## Usage Flow

1. **Event Creation**: Host creates an event and selects a package and event type
2. **Payment**: Host pays for the selected package
3. **Activation**: Event becomes active after payment confirmation
4. **Sharing**: Host shares QR code or link with guests
5. **Contributions**: Guests add photos, videos, and wishes
6. **Moderation**: Host can approve/reject contributions
7. **Gallery**: All approved contributions are visible in the event gallery

## Models

### EventType
- Dynamic event type management
- Customizable names, descriptions, icons, and colors
- Sort order and active status control
- Admin interface for easy management

### Event
- Basic event information (title, description, date, location)
- Event thumbnail image for previews and galleries
- Package selection and payment status
- Event type selection from dynamic options
- Event settings and permissions
- **QR code and sharing links (automatically generated)**

### Package
- Different pricing tiers with feature limits
- Maximum guests, photos, and videos
- Feature lists and pricing

### GuestContribution
- Guest information (name, phone)
- Content type (photo, video, wish)
- Multiple media files per post (photos and videos)
- Media files and metadata
- Approval status

### Payment
- Payment tracking and status
- Transaction details and timestamps

## Security Features

- Guest contributions don't require authentication
- IP address and user agent tracking
- Contribution limits per guest
- Event host-only moderation
- Payment verification before activation

## Development Notes

- Built with Django 5.2 and Django REST Framework
- SQLite database for development
- File upload support for photos and videos
- CORS enabled for frontend integration
- Admin interface for easy management
- Dynamic event types with admin customization

## Future Enhancements

- Real payment gateway integration (Stripe, PayPal)
- Email notifications
- Advanced analytics and reporting
- Mobile app development
- Social media integration
- Automated photo moderation
- Cloud storage integration 