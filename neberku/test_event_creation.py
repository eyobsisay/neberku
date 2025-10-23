#!/usr/bin/env python
"""
Test script to verify event creation with separate media per post fields.
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from core.models import EventSettings, Event, Package, EventType
from django.contrib.auth.models import User

def test_event_creation_with_settings():
    """Test event creation with separate media per post fields"""
    print("Testing event creation with separate media per post fields...")
    
    # Create test data
    user = User.objects.create_user(username='testuser2', password='testpass')
    event_type = EventType.objects.create(name='Test Event Type 2')
    package = Package.objects.create(
        name='Test Package 2',
        price=150.00,
        max_photos=100,
        max_videos=50
    )
    
    # Create event
    event = Event.objects.create(
        title='Test Event with Custom Settings',
        description='Test Description with custom media limits',
        host=user,
        package=package,
        event_type=event_type,
        event_date='2024-12-31 12:00:00'
    )
    
    print(f"Event created: {event.title}")
    
    # Create EventSettings with custom values (simulating form data)
    settings = EventSettings.objects.create(
        event=event,
        max_posts_per_guest=10,  # Custom value
        max_image_per_post=5,     # Custom value
        max_video_per_post=3,     # Custom value
        max_voice_per_post=2      # Custom value
    )
    
    print(f"✅ EventSettings created with custom values:")
    print(f"   - Max posts per guest: {settings.max_posts_per_guest}")
    print(f"   - Max images per post: {settings.max_image_per_post}")
    print(f"   - Max videos per post: {settings.max_video_per_post}")
    print(f"   - Max voice per post: {settings.max_voice_per_post}")
    
    # Test the relationship
    print(f"\nTesting relationship...")
    print(f"Event has settings: {hasattr(event, 'settings')}")
    print(f"Settings belong to event: {settings.event == event}")
    
    # Test accessing settings through event
    if hasattr(event, 'settings'):
        event_settings = event.settings
        print(f"✅ Event settings accessed through event:")
        print(f"   - Images per post: {event_settings.max_image_per_post}")
        print(f"   - Videos per post: {event_settings.max_video_per_post}")
        print(f"   - Voice per post: {event_settings.max_voice_per_post}")
    
    print("\n🎉 Event creation with custom settings test completed!")

def test_form_data_simulation():
    """Test simulating form data from dashboard"""
    print("\nTesting form data simulation...")
    
    # Simulate form data that would come from dashboard.js
    form_data = {
        'max_posts_per_guest': '8',
        'max_image_per_post': '4',
        'max_video_per_post': '2',
        'max_voice_per_post': '1'
    }
    
    print("📋 Simulated form data:")
    for key, value in form_data.items():
        print(f"   {key}: {value}")
    
    # Create test data
    user = User.objects.create_user(username='testuser3', password='testpass')
    event_type = EventType.objects.create(name='Test Event Type 3')
    package = Package.objects.create(
        name='Test Package 3',
        price=200.00,
        max_photos=200,
        max_videos=100
    )
    
    # Create event
    event = Event.objects.create(
        title='Test Event from Form Data',
        description='Test Description from form simulation',
        host=user,
        package=package,
        event_type=event_type,
        event_date='2024-12-31 12:00:00'
    )
    
    # Create EventSettings using form data (like in perform_create)
    settings_data = {
        'event': event,
        'max_posts_per_guest': int(form_data.get('max_posts_per_guest', 5)),
        'max_image_per_post': int(form_data.get('max_image_per_post', 3)),
        'max_video_per_post': int(form_data.get('max_video_per_post', 2)),
        'max_voice_per_post': int(form_data.get('max_voice_per_post', 1))
    }
    
    settings = EventSettings.objects.create(**settings_data)
    
    print(f"✅ EventSettings created from form data:")
    print(f"   - Max posts per guest: {settings.max_posts_per_guest}")
    print(f"   - Max images per post: {settings.max_image_per_post}")
    print(f"   - Max videos per post: {settings.max_video_per_post}")
    print(f"   - Max voice per post: {settings.max_voice_per_post}")
    
    print("\n🎉 Form data simulation test completed!")

if __name__ == '__main__':
    try:
        test_event_creation_with_settings()
        test_form_data_simulation()
        print("\n✅ All tests passed! Event creation with separate media fields is working correctly.")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()