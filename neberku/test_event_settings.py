#!/usr/bin/env python3
"""
Test script to verify EventSettings are working correctly
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from core.models import Package, Event, User, EventType, EventSettings
from django.contrib.auth import get_user_model

def test_event_settings():
    """Test that EventSettings are properly configured"""
    print("🔍 Testing EventSettings Configuration...")
    
    # Get all events with settings
    events = Event.objects.filter(status='active', payment_status='paid')
    
    if not events.exists():
        print("❌ No active events found. Please create events first.")
        return
    
    print(f"\n🎉 Found {events.count()} active event(s):")
    print("-" * 60)
    
    for event in events:
        print(f"Event: {event.title}")
        print(f"  Package: {event.package.name}")
        print(f"  Package Max Photos: {event.package.max_photos} (event total)")
        print(f"  Package Max Videos: {event.package.max_videos} (event total)")
        print(f"  Event Total Media Limit: {event.package.max_photos + event.package.max_videos}")
        
        # Check EventSettings
        try:
            settings = event.settings
            print(f"  ✅ EventSettings found:")
            print(f"    - Max Media Per Guest Post: {settings.max_media_per_post}")
            print(f"    - Max Posts Per Guest: {settings.max_posts_per_guest}")
            print(f"    - Max Photo Size: {settings.max_photo_size}MB")
            print(f"    - Max Video Size: {settings.max_video_size}MB")
            print(f"    - Max Video Duration: {settings.max_video_duration}s")
        except EventSettings.DoesNotExist:
            print(f"  ❌ No EventSettings found (will use defaults)")
            print(f"    - Default Max Media Per Guest Post: 3")
            print(f"    - Default Max Posts Per Guest: 5")
        
        print(f"  Contributor Code: {event.contributor_code}")
        print(f"  Public: {'✅' if event.is_public else '❌'}")
        print()

def create_test_event_settings():
    """Create test EventSettings for existing events"""
    print("🔧 Creating test EventSettings...")
    
    events = Event.objects.filter(status='active', payment_status='paid')
    
    if not events.exists():
        print("❌ No active events found. Please create events first.")
        return
    
    for event in events:
        # Check if EventSettings already exist
        if hasattr(event, 'settings'):
            print(f"✅ EventSettings already exist for '{event.title}'")
            continue
        
        # Create EventSettings with different configurations
        if event.package.name == "Basic Package":
            settings = EventSettings.objects.create(
                event=event,
                max_media_per_post=2,  # Basic: only 2 media files per guest
                max_posts_per_guest=3,  # Basic: only 3 posts per guest
                max_photo_size=5,       # Basic: 5MB max photo
                max_video_size=50,      # Basic: 50MB max video
                max_video_duration=30   # Basic: 30s max video
            )
        elif event.package.name == "Standard Package":
            settings = EventSettings.objects.create(
                event=event,
                max_media_per_post=5,  # Standard: 5 media files per guest
                max_posts_per_guest=5,  # Standard: 5 posts per guest
                max_photo_size=10,      # Standard: 10MB max photo
                max_video_size=100,     # Standard: 100MB max video
                max_video_duration=60   # Standard: 60s max video
            )
        elif event.package.name == "Premium Package":
            settings = EventSettings.objects.create(
                event=event,
                max_media_per_post=10, # Premium: 10 media files per guest
                max_posts_per_guest=10, # Premium: 10 posts per guest
                max_photo_size=20,      # Premium: 20MB max photo
                max_video_size=200,     # Premium: 200MB max video
                max_video_duration=120  # Premium: 120s max video
            )
        else:
            # Default settings
            settings = EventSettings.objects.create(
                event=event,
                max_media_per_post=3,  # Default: 3 media files per guest
                max_posts_per_guest=5,  # Default: 5 posts per guest
                max_photo_size=10,      # Default: 10MB max photo
                max_video_size=100,     # Default: 100MB max video
                max_video_duration=60   # Default: 60s max video
            )
        
        print(f"✅ Created EventSettings for '{event.title}': {settings.max_media_per_post} media per guest")

def main():
    """Main test function"""
    print("🚀 EventSettings Test Suite")
    print("=" * 60)
    
    # Check if EventSettings exist
    if EventSettings.objects.exists():
        test_event_settings()
    else:
        print("⚙️ No EventSettings found. Creating test settings...")
        create_test_event_settings()
        test_event_settings()
    
    print("\n🎯 Testing Complete!")
    print("\n💡 Understanding the System:")
    print("   📦 Package Limits: Total photos/videos allowed for the ENTIRE event")
    print("   👤 EventSettings: Per-guest limits (media per post, posts per guest)")
    print("   🔒 Validation: Frontend checks EventSettings, backend enforces both")
    print("\n💡 Next steps:")
    print("   1. Start Django server: python manage.py runserver")
    print("   2. Open guest contribution page")
    print("   3. Test with different guest limits")
    print("   4. Verify validation works correctly")

if __name__ == "__main__":
    main()
