#!/usr/bin/env python3
"""
Test script to verify event creation endpoint is working correctly.
Run this script to test the event creation API without the frontend.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = 'http://localhost:8000'
LOGIN_URL = f'{BASE_URL}/api/login/'
EVENTS_URL = f'{BASE_URL}/api/events/'

def test_event_creation():
    """Test the event creation endpoint"""
    
    print("🧪 Testing Event Creation API")
    print("=" * 50)
    
    # Test data for event creation
    event_data = {
        "title": "Test Event - API Test",
        "description": "This is a test event created via API to verify the endpoint is working",
        "event_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "location": "Test Location",
        "package_id": 1,  # Basic Package
        "event_type_id": 1,  # Wedding
        "allow_photos": True,
        "allow_videos": True,
        "allow_wishes": True,
        "auto_approve_posts": False
    }
    
    print(f"📝 Event data to create:")
    print(json.dumps(event_data, indent=2))
    print()
    
    try:
        # First, try to create an event without authentication
        print("🔓 Testing without authentication...")
        response = requests.post(EVENTS_URL, json=event_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Correctly requires authentication")
        else:
            print(f"⚠️ Unexpected response: {response.text}")
        
        print()
        
        # Test with authentication (you'll need to create a user first)
        print("🔐 Testing with authentication...")
        print("Note: You need to create a user first via Django admin or registration")
        print("For now, this will likely fail with 401 Unauthorized")
        
        # You can uncomment and modify this section after creating a user
        # login_data = {
        #     "username": "your_username",
        #     "password": "your_password"
        # }
        # 
        # login_response = requests.post(LOGIN_URL, json=login_data)
        # if login_response.status_code == 200:
        #     session = requests.Session()
        #     session.cookies.update(login_response.cookies)
        #     
        #     event_response = session.post(EVENTS_URL, json=event_data)
        #     print(f"Event creation status: {event_response.status_code}")
        #     if event_response.status_code == 201:
        #         print("✅ Event created successfully!")
        #         print(json.dumps(event_response.json(), indent=2))
        #     else:
        #         print(f"❌ Failed to create event: {event_response.text}")
        # else:
        #     print(f"❌ Login failed: {login_response.text}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Make sure Django server is running on http://localhost:8000")
        print("Run: python manage.py runserver")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_endpoints():
    """Test if the API endpoints are accessible"""
    
    print("🔍 Testing API Endpoints")
    print("=" * 50)
    
    endpoints = [
        ("Event Types", f"{BASE_URL}/api/event-types/"),
        ("Packages", f"{BASE_URL}/api/packages/"),
        ("Events", f"{BASE_URL}/api/events/"),
        ("Swagger Docs", f"{BASE_URL}/swagger/"),
    ]
    
    for name, url in endpoints:
        try:
            response = requests.get(url)
            print(f"{name}: {response.status_code} - {'✅' if response.status_code < 400 else '❌'}")
        except requests.exceptions.ConnectionError:
            print(f"{name}: ❌ Connection failed")
        except Exception as e:
            print(f"{name}: ❌ Error - {e}")

if __name__ == "__main__":
    print("🚀 Neberku Event Creation API Test")
    print("=" * 50)
    print()
    
    test_endpoints()
    print()
    test_event_creation()
    
    print()
    print("📋 Next steps:")
    print("1. Make sure Django server is running: python manage.py runserver")
    print("2. Create a user via Django admin or registration")
    print("3. Update the test script with valid credentials")
    print("4. Run the test again to verify event creation")
