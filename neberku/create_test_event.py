#!/usr/bin/env python
"""
Script to create a test event for testing the guest post API
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import EventType, Package, Event, EventSettings
from decimal import Decimal
from django.utils import timezone

def create_test_event():
    """Create a test event for API testing"""
    print("Creating test event for guest post API testing...")
    
    # Create or get test user
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
        print(f"✅ Created test user: {user.username}")
    else:
        print(f"✅ Using existing test user: {user.username}")
    
    # Create or get event type
    event_type, created = EventType.objects.get_or_create(
        name="Test Event Type",
        defaults={
            'description': "A test event type for API testing",
            'icon': "fas fa-star",
            'color': "#FF5733"
        }
    )
    if created:
        print(f"✅ Created event type: {event_type.name}")
    else:
        print(f"✅ Using existing event type: {event_type.name}")
    
    # Create or get package
    package, created = Package.objects.get_or_create(
        name="Test Package",
        defaults={
            'description': "A test package for API testing",
            'price': Decimal('19.99'),
            'max_guests': 100,
            'max_photos': 500,
            'max_videos': 50,
            'features': ['QR Code', 'Basic Analytics']
        }
    )
    if created:
        print(f"✅ Created package: {package.name}")
    else:
        print(f"✅ Using existing package: {package.name}")
    
    # Create test event
    event, created = Event.objects.get_or_create(
        title="Test Event for Guest Posts",
        defaults={
            'description': "A test event for testing guest post creation with media files",
            'host': user,
            'package': package,
            'event_type': event_type,
            'event_date': timezone.now() + timezone.timedelta(days=7),
            'location': 'Test Location',
            'allow_photos': True,
            'allow_videos': True,
            'allow_wishes': True,
            'status': 'active',
            'payment_status': 'paid'
        }
    )
    
    if created:
        print(f"✅ Created test event: {event.title}")
        print(f"   Event ID: {event.id}")
        print(f"   Status: {event.status}")
        print(f"   Payment Status: {event.payment_status}")
        print(f"   Allows Photos: {event.allow_photos}")
        print(f"   Allows Videos: {event.allow_videos}")
        print(f"   Allows Wishes: {event.allow_wishes}")
    else:
        print(f"✅ Using existing test event: {event.title}")
        print(f"   Event ID: {event.id}")
        print(f"   Status: {event.status}")
        print(f"   Payment Status: {event.payment_status}")
    
    # Create event settings
    settings, created = EventSettings.objects.get_or_create(
        event=event,
        defaults={
            'max_media_per_post': 5,
            'max_posts_per_guest': 3,
            'require_approval': False,
            'public_gallery': True
        }
    )
    
    if created:
        print(f"✅ Created event settings:")
        print(f"   Max media per post: {settings.max_media_per_post}")
        print(f"   Max posts per guest: {settings.max_posts_per_guest}")
    else:
        print(f"✅ Using existing event settings:")
        print(f"   Max media per post: {settings.max_media_per_post}")
        print(f"   Max posts per guest: {settings.max_posts_per_guest}")
    
    print("\n" + "="*60)
    print("🎉 TEST EVENT READY FOR API TESTING!")
    print("="*60)
    print(f"📋 Event ID: {event.id}")
    print(f"📋 Event Title: {event.title}")
    print(f"📋 Event Status: {event.status}")
    print(f"📋 Payment Status: {event.payment_status}")
    print(f"📋 Allows Media: Photos={event.allow_photos}, Videos={event.allow_videos}")
    print(f"📋 Allows Wishes: {event.allow_wishes}")
    print(f"📋 Media Limit: {settings.max_media_per_post} files per post")
    print("\n💡 Use this Event ID in your guest post API tests!")
    print("💡 Example: Replace 'YOUR_EVENT_UUID_HERE' with the Event ID above")
    
    return event

if __name__ == '__main__':
    try:
        event = create_test_event()
        print(f"\n✅ Test event created successfully!")
        print(f"   You can now use Event ID: {event.id} for testing")
    except Exception as e:
        print(f"\n❌ Error creating test event: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 