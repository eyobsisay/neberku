#!/usr/bin/env python3
"""
Test script for Neberku Bootstrap templates
This script helps verify that the templates are properly configured and accessible.
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
from django.urls import reverse
from django.contrib.auth.models import User

def test_templates():
    """Test that all templates are accessible"""
    client = Client()
    
    print("🧪 Testing Neberku Bootstrap Templates...")
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
    
    # Test guest contribution page
    try:
        response = client.get('/contribute/')
        if response.status_code == 200:
            print("✅ Guest contribution page: OK")
        else:
            print(f"❌ Guest contribution page: Failed (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Guest contribution page: Error - {e}")
    
    # Test event owner dashboard (should redirect to login)
    try:
        response = client.get('/dashboard/')
        if response.status_code == 302:  # Redirect to login
            print("✅ Event owner dashboard: OK (redirects to login as expected)")
        else:
            print(f"❌ Event owner dashboard: Unexpected status {response.status_code}")
    except Exception as e:
        print(f"❌ Event owner dashboard: Error - {e}")
    
    # Test contact form endpoint
    try:
        response = client.post('/contact/', {
            'name': 'Test User',
            'email': 'test@example.com',
            'subject': 'Test Message',
            'message': 'This is a test message'
        })
        if response.status_code == 200:
            print("✅ Contact form: OK")
        else:
            print(f"❌ Contact form: Failed (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Contact form: Error - {e}")
    
    # Test event gallery with sample event ID
    try:
        response = client.get('/event/1/')
        if response.status_code == 200:
            print("✅ Event gallery: OK")
        else:
            print(f"❌ Event gallery: Failed (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Event gallery: Error - {e}")
    
    print("=" * 50)
    print("🎉 Template testing completed!")

def check_template_files():
    """Check that all template files exist"""
    print("\n📁 Checking template files...")
    print("=" * 30)
    
    template_dir = project_dir / 'core' / 'templates' / 'core'
    required_templates = [
        'base.html',
        'landing.html',
        'event_owner_dashboard.html',
        'guest_contribution.html'
    ]
    
    for template in required_templates:
        template_path = template_dir / template
        if template_path.exists():
            print(f"✅ {template}: Found")
        else:
            print(f"❌ {template}: Missing")
    
    print("=" * 30)

def check_urls():
    """Check that all URLs are properly configured"""
    print("\n🔗 Checking URL configuration...")
    print("=" * 30)
    
    try:
        from core.urls import urlpatterns
        print(f"✅ Core URLs: {len(urlpatterns)} patterns found")
        
        for pattern in urlpatterns:
            print(f"   - {pattern.pattern}")
    except Exception as e:
        print(f"❌ Core URLs: Error - {e}")
    
    try:
        from api.urls import urlpatterns as api_patterns
        print(f"✅ API URLs: {len(api_patterns)} patterns found")
    except Exception as e:
        print(f"❌ API URLs: Error - {e}")
    
    print("=" * 30)

def main():
    """Main test function"""
    print("🚀 Neberku Template Test Suite")
    print("=" * 50)
    
    # Check template files
    check_template_files()
    
    # Check URL configuration
    check_urls()
    
    # Test template accessibility
    test_templates()
    
    print("\n📋 Summary:")
    print("- All template files should be present")
    print("- URLs should be properly configured")
    print("- Templates should be accessible via HTTP")
    print("- Event owner dashboard should require authentication")
    print("- Guest pages should be publicly accessible")

if __name__ == '__main__':
    main() 