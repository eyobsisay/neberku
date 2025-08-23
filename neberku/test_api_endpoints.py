#!/usr/bin/env python3
"""
Test script for Neberku API endpoints
"""
import requests
import json

# Base URL for the Django backend
BASE_URL = 'http://localhost:8000'

def test_api_endpoints():
    """Test the API endpoints"""
    print("🧪 Testing Neberku API Endpoints")
    print("=" * 50)
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/")
        print(f"✅ Server Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start Django with: python manage.py runserver")
        return False
    
    # Test 2: Test registration endpoint
    print("\n📝 Testing Registration Endpoint")
    test_user = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'TestPass123',
        'password2': 'TestPass123'
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/register/", json=test_user)
        print(f"Registration Status: {response.status_code}")
        if response.status_code == 201:
            print("✅ Registration successful")
            user_data = response.json()
            print(f"User created: {user_data['user']['username']}")
        else:
            print(f"❌ Registration failed: {response.text}")
    except Exception as e:
        print(f"❌ Registration error: {e}")
    
    # Test 3: Test login endpoint
    print("\n🔐 Testing Login Endpoint")
    login_data = {
        'username': 'testuser',
        'password': 'TestPass123'
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/login/", json=login_data)
        print(f"Login Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Login successful")
            login_response = response.json()
            print(f"User logged in: {login_response['user']['username']}")
        else:
            print(f"❌ Login failed: {response.text}")
    except Exception as e:
        print(f"❌ Login error: {e}")
    
    # Test 4: Test events endpoint
    print("\n📅 Testing Events Endpoint")
    try:
        response = requests.get(f"{BASE_URL}/api/events/")
        print(f"Events Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Events endpoint accessible")
            events = response.json()
            print(f"Found {len(events)} events")
        else:
            print(f"❌ Events endpoint failed: {response.text}")
    except Exception as e:
        print(f"❌ Events error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 API Testing Complete!")
    return True

if __name__ == "__main__":
    test_api_endpoints() 