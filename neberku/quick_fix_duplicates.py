#!/usr/bin/env python
"""
Quick fix for duplicate EventSettings records causing IntegrityError.
Run this script to clean up the database.
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

def quick_fix():
    """Quick fix for duplicate EventSettings"""
    print("🔧 Quick fix for duplicate EventSettings...")
    
    try:
        with transaction.atomic():
            # Find all events with multiple EventSettings
            events_with_duplicates = []
            
            for event in Event.objects.all():
                settings_count = EventSettings.objects.filter(event=event).count()
                if settings_count > 1:
                    events_with_duplicates.append(event)
                    print(f"   Event '{event.title}' has {settings_count} EventSettings")
            
            if events_with_duplicates:
                print(f"\n🛠️ Fixing {len(events_with_duplicates)} events with duplicates...")
                
                for event in events_with_duplicates:
                    # Get all EventSettings for this event, ordered by ID
                    settings_list = list(EventSettings.objects.filter(event=event).order_by('id'))
                    
                    if len(settings_list) > 1:
                        # Keep the first one (oldest)
                        keep_settings = settings_list[0]
                        print(f"   Keeping EventSettings ID {keep_settings.id} for event '{event.title}'")
                        
                        # Delete the rest
                        for settings in settings_list[1:]:
                            print(f"   Deleting EventSettings ID {settings.id}")
                            settings.delete()
                
                print("✅ Duplicates removed!")
            else:
                print("✅ No duplicates found!")
            
            # Ensure all events have EventSettings
            events_without_settings = []
            for event in Event.objects.all():
                if not EventSettings.objects.filter(event=event).exists():
                    events_without_settings.append(event)
            
            if events_without_settings:
                print(f"\n🛠️ Creating EventSettings for {len(events_without_settings)} events...")
                for event in events_without_settings:
                    EventSettings.objects.create(event=event)
                    print(f"   Created EventSettings for event '{event.title}'")
                print("✅ Missing EventSettings created!")
            else:
                print("✅ All events have EventSettings!")
            
            # Final check
            total_events = Event.objects.count()
            total_settings = EventSettings.objects.count()
            print(f"\n📊 Final status:")
            print(f"   Events: {total_events}")
            print(f"   EventSettings: {total_settings}")
            
            if total_events == total_settings:
                print("✅ Perfect! Every event has exactly one EventSettings.")
            else:
                print("❌ Still have a mismatch!")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    quick_fix()
