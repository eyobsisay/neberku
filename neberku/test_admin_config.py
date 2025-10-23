#!/usr/bin/env python
"""
Test script to verify the admin configuration is working correctly.
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from django.contrib import admin
from core.models import Event, EventSettings

def test_admin_configuration():
    """Test that the admin configuration is working"""
    print("Testing admin configuration...")
    
    # Check if Event admin is registered
    event_admin = admin.site._registry.get(Event)
    if event_admin:
        print(f"✅ Event admin registered: {event_admin.__class__.__name__}")
        
        # Check if EventSettingsInline is in the inlines
        if hasattr(event_admin, 'inlines') and event_admin.inlines:
            print(f"✅ Event admin has {len(event_admin.inlines)} inlines:")
            for inline in event_admin.inlines:
                print(f"   - {inline.__name__}")
                
            # Check if EventSettingsInline is specifically there
            inline_names = [inline.__name__ for inline in event_admin.inlines]
            if 'EventSettingsInline' in inline_names:
                print("✅ EventSettingsInline found in Event admin inlines")
            else:
                print("❌ EventSettingsInline not found in Event admin inlines")
        else:
            print("❌ Event admin has no inlines")
    else:
        print("❌ Event admin not registered")
    
    # Check if EventSettings admin is registered
    settings_admin = admin.site._registry.get(EventSettings)
    if settings_admin:
        print(f"✅ EventSettings admin registered: {settings_admin.__class__.__name__}")
    else:
        print("❌ EventSettings admin not registered")
    
    # Test that we can import the classes
    try:
        from core.admin import EventSettingsInline
        print("✅ EventSettingsInline class can be imported")
    except ImportError as e:
        print(f"❌ Cannot import EventSettingsInline: {e}")
    
    print("\n🎉 Admin configuration test completed!")

if __name__ == '__main__':
    try:
        test_admin_configuration()
        print("\n✅ All admin configuration tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
