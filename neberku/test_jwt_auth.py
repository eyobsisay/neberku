#!/usr/bin/env python3
"""
Test script for JWT authentication
"""

import requests
import json

# Configuration
BASE_URL = 'http://localhost:8000'
API_BASE = f'{BASE_URL}/api'

def test_jwt_authentication():
    """Test JWT authentication flow"""
    print("🧪 Testing JWT Authentication Flow")
    print("=" * 50)
    
    # Test 1: Get JWT tokens
    print("\n1. Testing JWT token obtain...")
    login_data = {
        'username': 'testuser',  # Replace with actual test user
        'password': 'testpass'   # Replace with actual test password
    }
    
    try:
        response = requests.post(f'{API_BASE}/token/', json=login_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            print("✅ JWT tokens obtained successfully!")
            print(f"Access token: {token_data.get('access', 'N/A')[:50]}...")
            print(f"Refresh token: {token_data.get('refresh', 'N/A')[:50]}...")
            
            access_token = token_data.get('access')
            refresh_token = token_data.get('refresh')
            
            # Test 2: Use access token for authenticated request
            print("\n2. Testing authenticated request...")
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Test with debug auth endpoint
            auth_response = requests.get(f'{API_BASE}/debug-auth/', headers=headers)
            print(f"Status: {auth_response.status_code}")
            
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                print("✅ Authenticated request successful!")
                print(f"User: {auth_data.get('user', 'N/A')}")
                print(f"Authenticated: {auth_data.get('authenticated', False)}")
                print(f"Has JWT token: {auth_data.get('has_jwt_token', False)}")
            else:
                print("❌ Authenticated request failed!")
                print(f"Response: {auth_response.text}")
            
            # Test 3: Test token refresh
            print("\n3. Testing token refresh...")
            refresh_data = {'refresh': refresh_token}
            refresh_response = requests.post(f'{API_BASE}/token/refresh/', json=refresh_data)
            print(f"Status: {refresh_response.status_code}")
            
            if refresh_response.status_code == 200:
                new_token_data = refresh_response.json()
                print("✅ Token refresh successful!")
                print(f"New access token: {new_token_data.get('access', 'N/A')[:50]}...")
            else:
                print("❌ Token refresh failed!")
                print(f"Response: {refresh_response.text}")
            
            # Test 4: Test token verification
            print("\n4. Testing token verification...")
            verify_data = {'token': access_token}
            verify_response = requests.post(f'{API_BASE}/token/verify/', json=verify_data)
            print(f"Status: {verify_response.status_code}")
            
            if verify_response.status_code == 200:
                print("✅ Token verification successful!")
            else:
                print("❌ Token verification failed!")
                print(f"Response: {verify_response.text}")
                
        else:
            print("❌ JWT token obtain failed!")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error! Make sure Django server is running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_custom_login():
    """Test custom login endpoint"""
    print("\n" + "=" * 50)
    print("🧪 Testing Custom Login Endpoint")
    print("=" * 50)
    
    login_data = {
        'username': 'testuser',  # Replace with actual test user
        'password': 'testpass'   # Replace with actual test password
    }
    
    try:
        response = requests.post(f'{API_BASE}/login/', json=login_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            login_response = response.json()
            print("✅ Custom login successful!")
            print(f"Success: {login_response.get('success', False)}")
            print(f"Access token: {login_response.get('access', 'N/A')[:50]}...")
            print(f"User: {login_response.get('user', {}).get('username', 'N/A')}")
        else:
            print("❌ Custom login failed!")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    print("🚀 Starting JWT Authentication Tests")
    print("Make sure Django server is running on localhost:8000")
    print("Make sure you have a test user created")
    
    test_jwt_authentication()
    test_custom_login()
    
    print("\n" + "=" * 50)
    print("🏁 Tests completed!")
