#!/usr/bin/env python3
"""
Test script for Neberku Authentication System
This script helps verify that the authentication views are working correctly.
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User

def test_authentication():
    """Test the authentication system"""
    client = Client()
    
    print("🔐 Testing Neberku Authentication System...")
    print("=" * 50)
    
    # Test landing page
    try:
        response = client.get('/')
        if response.status_code == 200:
            print("✅ Landing page: OK")
        else:
            print(f"❌ Landing page: Failed (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Landing page: Error - {e}")
    
    # Test login page
    try:
        response = client.get('/login/')
        if response.status_code == 200:
            print("✅ Login page: OK")
        else:
            print(f"❌ Login page: Failed (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Login page: Error - {e}")
    
    # Test register page
    try:
        response = client.get('/register/')
        if response.status_code == 200:
            print("✅ Register page: OK")
        else:
            print(f"❌ Register page: Failed (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Register page: Error - {e}")
    
    # Test dashboard access without authentication (should redirect)
    try:
        response = client.get('/dashboard/')
        if response.status_code == 302:  # Redirect to login
            print("✅ Dashboard protection: OK (redirects to login)")
        else:
            print(f"❌ Dashboard protection: Failed (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Dashboard protection: Error - {e}")
    
    # Test user registration
    try:
        # Create a test user
        test_user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        print("✅ User creation: OK")
        
        # Test login with created user
        login_success = client.login(username='testuser', password='testpass123')
        if login_success:
            print("✅ User login: OK")
            
            # Test dashboard access with authentication
            response = client.get('/dashboard/')
            if response.status_code == 200:
                print("✅ Authenticated dashboard access: OK")
            else:
                print(f"❌ Authenticated dashboard access: Failed (Status: {response.status_code})")
        else:
            print("❌ User login: Failed")
        
        # Clean up test user
        test_user.delete()
        print("✅ Test user cleanup: OK")
        
    except Exception as e:
        print(f"❌ User authentication test: Error - {e}")
    
    print("=" * 50)
    print("🎉 Authentication testing completed!")

def check_url_patterns():
    """Check that all authentication URLs are properly configured"""
    print("\n🔗 Checking URL patterns...")
    print("=" * 30)
    
    try:
        from core.urls import urlpatterns
        print(f"✅ Core URLs: {len(urlpatterns)} patterns found")
        
        auth_patterns = ['login/', 'register/', 'logout/', 'dashboard/']
        for pattern in auth_patterns:
            if any(pattern in str(url) for url in urlpatterns):
                print(f"   ✅ {pattern}: Found")
            else:
                print(f"   ❌ {pattern}: Missing")
                
    except Exception as e:
        print(f"❌ Core URLs: Error - {e}")
    
    print("=" * 30)

def main():
    """Main test function"""
    print("🚀 Neberku Authentication Test Suite")
    print("=" * 50)
    
    # Check URL configuration
    check_url_patterns()
    
    # Test authentication functionality
    test_authentication()
    
    print("\n📋 Summary:")
    print("- All authentication URLs should be properly configured")
    print("- Login and register pages should be accessible")
    print("- Dashboard should require authentication")
    print("- User creation and login should work")
    print("- Session-based authentication should function correctly")

if __name__ == '__main__':
    main() 