#!/usr/bin/env python
"""
Script to test the contributor code functionality
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from core.models import Event

def test_contributor_codes():
    """Test the contributor code functionality"""
    print("Testing contributor code functionality...")
    print("=" * 50)
    
    # Get all events
    events = Event.objects.all()
    
    if not events.exists():
        print("❌ No events found. Please create some events first.")
        return
    
    print(f"Found {events.count()} events:")
    print("-" * 30)
    
    for event in events:
        print(f"Event: {event.title}")
        print(f"  ID: {event.id}")
        print(f"  Status: {event.status}")
        print(f"  Contributor Code: {event.contributor_code or 'Not generated'}")
        
        if not event.contributor_code:
            print("  Generating contributor code...")
            try:
                event.generate_contributor_code()
                event.save()
                print(f"  ✅ Generated code: {event.contributor_code}")
            except Exception as e:
                print(f"  ❌ Error generating code: {e}")
        else:
            print(f"  ✅ Code already exists: {event.contributor_code}")
        
        print()
    
    # Test finding event by contributor code
    print("Testing event lookup by contributor code...")
    print("-" * 40)
    
    for event in events:
        if event.contributor_code:
            try:
                found_event = Event.objects.get(contributor_code=event.contributor_code)
                print(f"✅ Found event '{found_event.title}' with code '{event.contributor_code}'")
            except Event.DoesNotExist:
                print(f"❌ Could not find event with code '{event.contributor_code}'")
            except Exception as e:
                print(f"❌ Error looking up event with code '{event.contributor_code}': {e}")
    
    print("\n" + "=" * 50)
    print("Contributor code test completed!")
    
    # Show how to use the codes
    print("\nTo test the contributor access:")
    print("1. Go to: http://localhost:8000/access/")
    print("2. Enter one of the contributor codes above")
    print("3. You should be redirected to the event page")

if __name__ == '__main__':
    test_contributor_codes()
