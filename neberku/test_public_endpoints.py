#!/usr/bin/env python3
"""
Test public endpoints to verify they work without authentication
"""

import requests
import json

# Configuration
BASE_URL = 'http://localhost:8000'
API_BASE = f'{BASE_URL}/api'

def test_public_endpoints():
    """Test that public endpoints work without authentication"""
    print("🧪 Testing Public Endpoints (No Authentication Required)")
    print("=" * 60)
    
    endpoints = [
        ('/api/packages/', 'Packages'),
        ('/api/event-types/', 'Event Types'),
    ]
    
    for endpoint, name in endpoints:
        print(f"\n📋 Testing {name} endpoint...")
        try:
            response = requests.get(f'{BASE_URL}{endpoint}')
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else len(data.get('results', []))
                print(f"   ✅ Success! Found {count} items")
            else:
                print(f"   ❌ Failed: {response.status_code} {response.status_text}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                    
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connection error! Make sure Django server is running on {BASE_URL}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

def test_protected_endpoints():
    """Test that protected endpoints require authentication"""
    print("\n🔒 Testing Protected Endpoints (Authentication Required)")
    print("=" * 60)
    
    endpoints = [
        ('/api/events/', 'Events'),
        ('/api/debug-auth/', 'Debug Auth'),
    ]
    
    for endpoint, name in endpoints:
        print(f"\n📋 Testing {name} endpoint...")
        try:
            response = requests.get(f'{BASE_URL}{endpoint}')
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print(f"   ✅ Correctly requires authentication (401 Unauthorized)")
            elif response.status_code == 200:
                print(f"   ⚠️  Unexpected: Should require authentication but returned 200")
            else:
                print(f"   ❓ Unexpected status: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connection error! Make sure Django server is running on {BASE_URL}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

def test_jwt_endpoints():
    """Test JWT token endpoints"""
    print("\n🔑 Testing JWT Token Endpoints")
    print("=" * 60)
    
    # Test token endpoint
    print(f"\n📋 Testing JWT token endpoint...")
    try:
        response = requests.post(f'{BASE_URL}/api/token/', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'access' in data and 'refresh' in data:
                print(f"   ✅ JWT tokens generated successfully!")
                print(f"   Access token: {data['access'][:50]}...")
                return data['access']
            else:
                print(f"   ❌ No tokens in response: {data}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Error: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection error! Make sure Django server is running on {BASE_URL}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return None

def test_authenticated_request(token):
    """Test authenticated request with JWT token"""
    if not token:
        print("\n⚠️  Skipping authenticated test - no token available")
        return
        
    print(f"\n🔐 Testing Authenticated Request")
    print("=" * 60)
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f'{BASE_URL}/api/debug-auth/', headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Authenticated request successful!")
            print(f"   User: {data.get('user', 'Unknown')}")
            print(f"   Authenticated: {data.get('authenticated', False)}")
            print(f"   Has JWT token: {data.get('has_jwt_token', False)}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == '__main__':
    print("🚀 Testing Neberku API Endpoints")
    print("Make sure Django server is running on localhost:8000")
    
    # Test public endpoints
    test_public_endpoints()
    
    # Test protected endpoints
    test_protected_endpoints()
    
    # Test JWT endpoints
    token = test_jwt_endpoints()
    
    # Test authenticated request
    test_authenticated_request(token)
    
    print("\n" + "=" * 60)
    print("🏁 Tests completed!")
    print("\nExpected results:")
    print("✅ Public endpoints (packages, event-types) should return 200")
    print("✅ Protected endpoints (events, debug-auth) should return 401 without token")
    print("✅ JWT token endpoint should return tokens on successful login")
    print("✅ Authenticated requests should work with JWT tokens")
