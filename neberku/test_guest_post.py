#!/usr/bin/env python
"""
Simple test script to verify guest post creation with media files
"""
import os
import sys
import django
from django.core.files.uploadedfile import SimpleUploadedFile

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import EventType, Package, Event, EventSettings, Guest, GuestPost, MediaFile
from decimal import Decimal
from django.utils import timezone

def test_guest_post_creation():
    """Test creating a guest post with media files"""
    print("Testing guest post creation...")
    
    # Create test user
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'is_staff': True
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"Created test user: {user.username}")
    
    # Create event type
    event_type, created = EventType.objects.get_or_create(
        name="Test Event Type",
        defaults={
            'description': "A test event type"
        }
    )
    if created:
        print(f"Created event type: {event_type.name}")
    
    # Create package
    package, created = Package.objects.get_or_create(
        name="Test Package",
        defaults={
            'description': "A test package",
            'price': Decimal('19.99'),
            'max_guests': 100,
            'max_photos': 500,
            'max_videos': 50
        }
    )
    if created:
        print(f"Created package: {package.name}")
    
    # Create event
    event, created = Event.objects.get_or_create(
        title="Test Event for Media",
        defaults={
            'description': "A test event for media uploads",
            'host': user,
            'package': package,
            'event_type': event_type,
            'event_date': timezone.now() + timezone.timedelta(days=1),
            'location': 'Test Location',
            'allow_photos': True,
            'allow_videos': True,
            'status': 'active',
            'payment_status': 'paid'
        }
    )
    if created:
        print(f"Created event: {event.title}")
    
    # Create event settings
    settings, created = EventSettings.objects.get_or_create(
        event=event,
        defaults={
            'max_media_per_post': 5
        }
    )
    if created:
        print(f"Created event settings with max_media_per_post: {settings.max_media_per_post}")
    
    # Create test media files
    photo1 = SimpleUploadedFile("photo1.jpg", b"fake photo 1", content_type="image/jpeg")
    photo2 = SimpleUploadedFile("photo2.jpg", b"fake photo 2", content_type="image/jpeg")
    video1 = SimpleUploadedFile("video1.mp4", b"fake video 1", content_type="video/mp4")
    
    print(f"Created test files: {photo1.name}, {photo2.name}, {video1.name}")
    
    # Test guest post creation (simulating the view logic)
    try:
        # Create guest
        guest, created = Guest.objects.get_or_create(
            event=event,
            phone='+1234567890',
            defaults={
                'name': 'Test Guest',
                'ip_address': '127.0.0.1',
                'user_agent': 'Test Script'
            }
        )
        if created:
            print(f"Created guest: {guest.name}")
        
        # Create post
        post = GuestPost.objects.create(
            guest=guest,
            event=event,
            wish_text='Happy birthday! Here are some photos and videos!'
        )
        print(f"Created post: {post.id}")
        
        # Create media files
        media_files = [photo1, photo2, video1]
        
        for media_file in media_files:
            # Determine media type based on file extension
            file_name = media_file.name.lower()
            if file_name.endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')):
                media_type = 'photo'
            elif file_name.endswith(('.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm')):
                media_type = 'video'
            else:
                media_type = 'photo'
            
            # Get file size and MIME type
            file_size = media_file.size
            mime_type = media_file.content_type or 'application/octet-stream'
            
            # Create the media file
            media = MediaFile.objects.create(
                post=post,
                guest=guest,
                event=event,
                media_type=media_type,
                media_file=media_file,
                file_size=file_size,
                file_name=media_file.name,
                mime_type=mime_type
            )
            print(f"Created media file: {media.id} - {media.media_type} - {media.file_name}")
        
        # Verify the results
        print(f"\nVerification:")
        print(f"Post ID: {post.id}")
        print(f"Guest: {post.guest.name} ({post.guest.phone})")
        print(f"Event: {post.event.title}")
        print(f"Wish text: {post.wish_text}")
        print(f"Total media files: {post.media_files.count()}")
        print(f"Photos: {post.photo_count}")
        print(f"Videos: {post.video_count}")
        
        # List all media files
        print(f"\nMedia files:")
        for media in post.media_files.all():
            print(f"  - {media.file_name} ({media.media_type}) - {media.file_size} bytes - {media.mime_type}")
        
        print("\n✅ Guest post creation test PASSED!")
        return True
        
    except Exception as e:
        print(f"\n❌ Guest post creation test FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_guest_post_creation()
    sys.exit(0 if success else 1) 