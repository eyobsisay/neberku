#!/usr/bin/env python
"""
Test script to verify the EventSettings model changes work correctly.
This script tests the new separate media per post fields.
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

def test_event_settings():
    """Test the new EventSettings fields"""
    print("Testing EventSettings model with new separate media fields...")
    
    # Create a test EventSettings instance
    settings = EventSettings()
    
    # Test default values
    print(f"Default max_image_per_post: {settings.max_image_per_post}")
    print(f"Default max_video_per_post: {settings.max_video_per_post}")
    print(f"Default max_voice_per_post: {settings.max_voice_per_post}")
    
    # Test setting custom values
    settings.max_image_per_post = 5
    settings.max_video_per_post = 3
    settings.max_voice_per_post = 2
    
    print(f"Custom max_image_per_post: {settings.max_image_per_post}")
    print(f"Custom max_video_per_post: {settings.max_video_per_post}")
    print(f"Custom max_voice_per_post: {settings.max_voice_per_post}")
    
    print("✅ EventSettings model test passed!")

def test_serializer():
    """Test the updated serializer"""
    print("\nTesting EventGuestAccessSerializer...")
    
    from api.serializers import EventGuestAccessSerializer
    
    # Create test data
    user = User.objects.create_user(username='testuser', password='testpass')
    event_type = EventType.objects.create(name='Test Event Type')
    package = Package.objects.create(
        name='Test Package',
        price=100.00,
        max_photos=50,
        max_videos=50
    )
    
    event = Event.objects.create(
        title='Test Event',
        description='Test Description',
        host=user,
        package=package,
        event_type=event_type,
        event_date='2024-12-31 12:00:00'
    )
    
    # Create EventSettings with new fields
    settings = EventSettings.objects.create(
        event=event,
        max_image_per_post=4,
        max_video_per_post=2,
        max_voice_per_post=1
    )
    
    # Test serializer
    serializer = EventGuestAccessSerializer(event)
    data = serializer.data
    
    print(f"guest_max_image_per_post: {data.get('guest_max_image_per_post')}")
    print(f"guest_max_video_per_post: {data.get('guest_max_video_per_post')}")
    print(f"guest_max_voice_per_post: {data.get('guest_max_voice_per_post')}")
    
    # Clean up
    event.delete()
    package.delete()
    event_type.delete()
    user.delete()
    
    print("✅ Serializer test passed!")

def test_admin():
    """Test the updated admin configuration"""
    print("\nTesting EventSettingsAdmin...")
    
    from django.contrib.admin.sites import AdminSite
    from core.admin import EventSettingsAdmin
    
    # Create test data
    user = User.objects.create_user(username='testuser2', password='testpass')
    event_type = EventType.objects.create(name='Test Event Type 2')
    package = Package.objects.create(
        name='Test Package 2',
        price=150.00,
        max_photos=100,
        max_videos=100
    )
    
    event = Event.objects.create(
        title='Test Event 2',
        description='Test Description 2',
        host=user,
        package=package,
        event_type=event_type,
        event_date='2024-12-31 12:00:00'
    )
    
    # Create EventSettings with new fields
    settings = EventSettings.objects.create(
        event=event,
        max_image_per_post=5,
        max_video_per_post=3,
        max_voice_per_post=2
    )
    
    # Test admin
    admin_site = AdminSite()
    admin_instance = EventSettingsAdmin(EventSettings, admin_site)
    
    # Test list_display fields
    list_display = admin_instance.list_display
    print(f"Admin list_display fields: {list_display}")
    
    # Check if new fields are in list_display
    assert 'max_image_per_post' in list_display, "max_image_per_post not in list_display"
    assert 'max_video_per_post' in list_display, "max_video_per_post not in list_display"
    assert 'max_voice_per_post' in list_display, "max_voice_per_post not in list_display"
    
    # Test fieldsets
    fieldsets = admin_instance.fieldsets
    guest_fields = None
    for title, fieldset in fieldsets:
        if title == 'Guest Settings':
            guest_fields = fieldset['fields']
            break
    
    assert guest_fields is not None, "Guest Settings fieldset not found"
    assert 'max_image_per_post' in guest_fields, "max_image_per_post not in Guest Settings"
    assert 'max_video_per_post' in guest_fields, "max_video_per_post not in Guest Settings"
    assert 'max_voice_per_post' in guest_fields, "max_voice_per_post not in Guest Settings"
    
    print("✅ Admin configuration test passed!")
    
    # Clean up
    event.delete()
    package.delete()
    event_type.delete()
    user.delete()

if __name__ == '__main__':
    try:
        test_event_settings()
        test_serializer()
        test_admin()
        print("\n🎉 All tests passed! The changes are working correctly.")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
