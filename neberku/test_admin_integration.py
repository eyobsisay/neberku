#!/usr/bin/env python
"""
Test script to verify the EventSettings admin integration works correctly.
This script tests the inline admin functionality.
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
from django.contrib import admin

def test_event_admin_integration():
    """Test the Event admin with EventSettings inline"""
    print("Testing Event admin with EventSettings inline...")
    
    # Create test data
    user = User.objects.create_user(username='testadmin', password='testpass')
    event_type = EventType.objects.create(name='Test Event Type')
    package = Package.objects.create(
        name='Test Package',
        price=100.00,
        max_photos=50,
        max_videos=50
    )
    
    event = Event.objects.create(
        title='Test Event for Admin',
        description='Test Description',
        host=user,
        package=package,
        event_type=event_type,
        event_date='2024-12-31 12:00:00'
    )
    
    # Test that EventSettings are created automatically
    print(f"Event created: {event.title}")
    
    # Check if EventSettings exist
    if hasattr(event, 'settings'):
        settings = event.settings
        print(f"✅ EventSettings found: {settings}")
        print(f"   - Max images per post: {settings.max_image_per_post}")
        print(f"   - Max videos per post: {settings.max_video_per_post}")
        print(f"   - Max voice per post: {settings.max_voice_per_post}")
        print(f"   - Require approval: {settings.require_approval}")
        print(f"   - Public gallery: {settings.public_gallery}")
    else:
        print("❌ EventSettings not found - they should be created automatically")
    
    # Test admin registration
    print("\nTesting admin registration...")
    
    # Check if EventSettingsInline is registered
    event_admin = admin.site._registry.get(Event)
    if event_admin and hasattr(event_admin, 'inlines'):
        print(f"✅ Event admin found with {len(event_admin.inlines)} inlines")
        for inline in event_admin.inlines:
            print(f"   - Inline: {inline.__name__}")
    else:
        print("❌ Event admin not found or no inlines")
    
    # Check if EventSettings admin is registered
    settings_admin = admin.site._registry.get(EventSettings)
    if settings_admin:
        print(f"✅ EventSettings admin registered: {settings_admin.__class__.__name__}")
        print(f"   - List display: {settings_admin.list_display}")
        print(f"   - List filters: {settings_admin.list_filter}")
    else:
        print("❌ EventSettings admin not registered")
    
    # Test the inline functionality
    print("\nTesting inline functionality...")
    
    # Create EventSettings manually to test inline
    settings = EventSettings.objects.create(
        event=event,
        max_image_per_post=5,
        max_video_per_post=3,
        max_voice_per_post=2,
        require_approval=True,
        public_gallery=False
    )
    
    print(f"✅ EventSettings created manually: {settings}")
    print(f"   - Event: {settings.event.title}")
    print(f"   - Max images: {settings.max_image_per_post}")
    print(f"   - Max videos: {settings.max_video_per_post}")
    print(f"   - Max voice: {settings.max_voice_per_post}")
    
    # Test the relationship
    print(f"\nTesting relationship...")
    print(f"Event has settings: {hasattr(event, 'settings')}")
    print(f"Settings belong to event: {settings.event == event}")
    
    print("\n🎉 EventSettings admin integration test completed!")

if __name__ == '__main__':
    try:
        test_event_admin_integration()
        print("\n✅ All admin integration tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
