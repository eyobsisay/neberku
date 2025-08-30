#!/usr/bin/env python
"""
Script to create a test public event for testing guest contribution functionality
"""

import os
import sys
import django
from django.utils import timezone
from datetime import timedelta

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from core.models import Event, EventType, Package, User, EventSettings

def create_public_event():
    """Create a test public event"""
    
    # Get or create a test user
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✅ Created test user: {user.username}")
    else:
        print(f"✅ Using existing test user: {user.username}")
    
    # Get or create an event type
    event_type, created = EventType.objects.get_or_create(
        name='Wedding',
        defaults={
            'description': 'Wedding celebrations and ceremonies',
            'icon': 'fas fa-heart',
            'color': '#FF69B4',
            'is_active': True,
            'sort_order': 1
        }
    )
    
    if created:
        print(f"✅ Created event type: {event_type.name}")
    else:
        print(f"✅ Using existing event type: {event_type.name}")
    
    # Get or create a package
    package, created = Package.objects.get_or_create(
        name='Basic Package',
        defaults={
            'description': 'Basic event package with essential features',
            'price': 29.99,
            'max_guests': 100,
            'max_photos': 500,
            'max_videos': 50,
            'features': ['Photo sharing', 'Video sharing', 'Guest wishes', 'QR code access'],
            'is_active': True
        }
    )
    
    if created:
        print(f"✅ Created package: {package.name}")
    else:
        print(f"✅ Using existing package: {package.name}")
    
    # Create the public event
    event_date = timezone.now() + timedelta(days=30)  # Event in 30 days
    
    event, created = Event.objects.get_or_create(
        title='Sarah & John Wedding Celebration',
        defaults={
            'description': 'Join us in celebrating the beautiful union of Sarah and John. Share your memories, photos, and best wishes for this special couple on their big day!',
            'host': user,
            'package': package,
            'event_type': event_type,
            'event_date': event_date,
            'location': 'Grand Hotel Ballroom, Downtown',
            'allow_photos': True,
            'allow_videos': True,
            'allow_wishes': True,
            'auto_approve_posts': True,
            'status': 'active',
            'payment_status': 'paid',
            'is_public': True,  # This makes it a public event
            'published_at': timezone.now()
        }
    )
    
    if created:
        print(f"✅ Created public event: {event.title}")
        print(f"   Event ID: {event.id}")
        print(f"   Contributor Code: {event.contributor_code}")
        print(f"   Share Link: {event.share_link}")
        print(f"   Is Public: {event.is_public}")
        
        # Create event settings
        settings, created = EventSettings.objects.get_or_create(
            event=event,
            defaults={
                'max_photo_size': 10,  # 10MB
                'allowed_photo_formats': ['jpg', 'png', 'heic'],
                'max_video_size': 100,  # 100MB
                'max_video_duration': 60,  # 60 seconds
                'allowed_video_formats': ['mp4', 'mov'],
                'require_approval': False,
                'allow_anonymous': False,
                'max_posts_per_guest': 5,
                'max_media_per_post': 3,
                'public_gallery': True,
                'show_guest_names': True
            }
        )
        
        if created:
            print(f"✅ Created event settings for: {event.title}")
        else:
            print(f"✅ Using existing event settings for: {event.title}")
            
    else:
        print(f"✅ Event already exists: {event.title}")
        print(f"   Event ID: {event.id}")
        print(f"   Is Public: {event.is_public}")
    
    return event

def create_private_event():
    """Create a test private event for comparison"""
    
    user = User.objects.get(username='testuser')
    event_type = EventType.objects.get(name='Wedding')
    package = Package.objects.get(name='Basic Package')
    
    event_date = timezone.now() + timedelta(days=45)  # Event in 45 days
    
    event, created = Event.objects.get_or_create(
        title='Private Family Gathering',
        defaults={
            'description': 'A private family gathering for close friends and relatives only. Access requires the contributor code.',
            'host': user,
            'package': package,
            'event_type': event_type,
            'event_date': event_date,
            'location': 'Family Home, Suburbs',
            'allow_photos': True,
            'allow_videos': True,
            'allow_wishes': True,
            'auto_approve_posts': False,  # Requires approval
            'status': 'active',
            'payment_status': 'paid',
            'is_public': False,  # This makes it a private event
            'published_at': timezone.now()
        }
    )
    
    if created:
        print(f"✅ Created private event: {event.title}")
        print(f"   Event ID: {event.id}")
        print(f"   Contributor Code: {event.contributor_code}")
        print(f"   Is Public: {event.is_public}")
        
        # Create event settings
        settings, created = EventSettings.objects.get_or_create(
            event=event,
            defaults={
                'max_photo_size': 10,
                'allowed_photo_formats': ['jpg', 'png', 'heic'],
                'max_video_size': 100,
                'max_video_duration': 60,
                'allowed_video_formats': ['mp4', 'mov'],
                'require_approval': True,  # Requires approval for private events
                'allow_anonymous': False,
                'max_posts_per_guest': 3,
                'max_media_per_post': 2,
                'public_gallery': False,  # Private gallery
                'show_guest_names': True
            }
        )
        
        if created:
            print(f"✅ Created event settings for: {event.title}")
    else:
        print(f"✅ Private event already exists: {event.title}")
        print(f"   Event ID: {event.id}")
        print(f"   Is Public: {event.is_public}")
    
    return event

if __name__ == '__main__':
    print("🎉 Creating test events for guest contribution testing...")
    print("=" * 60)
    
    try:
        # Create public event
        public_event = create_public_event()
        print()
        
        # Create private event
        private_event = create_private_event()
        print()
        
        print("🎯 Test Events Summary:")
        print("=" * 60)
        print(f"Public Event: {public_event.title}")
        print(f"  - ID: {public_event.id}")
        print(f"  - Access: Code required ({public_event.contributor_code})")
        print(f"  - URL: {public_event.share_link}")
        print()
        print(f"Private Event: {private_event.title}")
        print(f"  - ID: {private_event.id}")
        print(f"  - Access: Code required ({private_event.contributor_code})")
        print(f"  - URL: {private_event.share_link}")
        print()
        print("✅ Test events created successfully!")
        print("💡 You can now test the guest contribution functionality:")
        print("   1. All events require the contributor code for access")
        print("   2. Use the contributor codes shown above to access events")
        print("   3. Use the frontend at: neberku-frontend/guest-contribution.html")
        
    except Exception as e:
        print(f"❌ Error creating test events: {e}")
        import traceback
        traceback.print_exc()
