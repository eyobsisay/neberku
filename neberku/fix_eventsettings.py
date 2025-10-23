#!/usr/bin/env python
"""
Script to fix duplicate EventSettings records and ensure data integrity.
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from core.models import EventSettings, Event
from django.db import transaction

def fix_duplicate_eventsettings():
    """Fix duplicate EventSettings records"""
    print("🔍 Checking for duplicate EventSettings records...")
    
    # Find events with multiple EventSettings
    events_with_multiple_settings = []
    
    for event in Event.objects.all():
        settings_count = EventSettings.objects.filter(event=event).count()
        if settings_count > 1:
            events_with_multiple_settings.append((event, settings_count))
    
    if events_with_multiple_settings:
        print(f"❌ Found {len(events_with_multiple_settings)} events with multiple EventSettings:")
        for event, count in events_with_multiple_settings:
            print(f"   - Event '{event.title}' (ID: {event.id}) has {count} EventSettings")
        
        print("\n🛠️ Fixing duplicate EventSettings...")
        
        with transaction.atomic():
            for event, count in events_with_multiple_settings:
                print(f"   Fixing Event '{event.title}'...")
                
                # Get all EventSettings for this event
                settings_list = EventSettings.objects.filter(event=event).order_by('id')
                
                # Keep the first one (oldest)
                keep_settings = settings_list.first()
                print(f"     Keeping EventSettings ID: {keep_settings.id}")
                
                # Delete the rest
                delete_settings = settings_list.exclude(id=keep_settings.id)
                deleted_count = delete_settings.count()
                delete_settings.delete()
                
                print(f"     Deleted {deleted_count} duplicate EventSettings")
        
        print("✅ Duplicate EventSettings fixed!")
    else:
        print("✅ No duplicate EventSettings found!")
    
    # Check for events without EventSettings
    print("\n🔍 Checking for events without EventSettings...")
    
    events_without_settings = []
    for event in Event.objects.all():
        if not hasattr(event, 'eventsettings'):
            events_without_settings.append(event)
    
    if events_without_settings:
        print(f"❌ Found {len(events_without_settings)} events without EventSettings:")
        for event in events_without_settings:
            print(f"   - Event '{event.title}' (ID: {event.id})")
        
        print("\n🛠️ Creating missing EventSettings...")
        
        with transaction.atomic():
            for event in events_without_settings:
                print(f"   Creating EventSettings for Event '{event.title}'...")
                EventSettings.objects.create(event=event)
        
        print("✅ Missing EventSettings created!")
    else:
        print("✅ All events have EventSettings!")
    
    # Final verification
    print("\n🔍 Final verification...")
    
    total_events = Event.objects.count()
    total_settings = EventSettings.objects.count()
    
    print(f"   Total Events: {total_events}")
    print(f"   Total EventSettings: {total_settings}")
    
    if total_events == total_settings:
        print("✅ Perfect! Every event has exactly one EventSettings record.")
    else:
        print(f"❌ Mismatch! Events: {total_events}, EventSettings: {total_settings}")
    
    # Check for any remaining duplicates
    duplicate_count = 0
    for event in Event.objects.all():
        settings_count = EventSettings.objects.filter(event=event).count()
        if settings_count > 1:
            duplicate_count += 1
    
    if duplicate_count == 0:
        print("✅ No duplicate EventSettings remaining!")
    else:
        print(f"❌ Still have {duplicate_count} events with duplicate EventSettings!")

if __name__ == '__main__':
    try:
        fix_duplicate_eventsettings()
        print("\n🎉 EventSettings cleanup completed successfully!")
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
