#!/usr/bin/env python3
"""
Check JWT setup and provide troubleshooting steps
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')

try:
    django.setup()
    print("✅ Django setup successful")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    sys.exit(1)

def check_jwt_package():
    """Check if JWT package is installed"""
    try:
        import rest_framework_simplejwt
        print("✅ JWT package is installed")
        print(f"   Version: {rest_framework_simplejwt.__version__}")
        return True
    except ImportError as e:
        print(f"❌ JWT package not installed: {e}")
        print("   Run: pip install djangorestframework-simplejwt==5.3.0")
        return False

def check_settings():
    """Check Django settings"""
    try:
        from django.conf import settings
        
        # Check INSTALLED_APPS
        if 'rest_framework_simplejwt' in settings.INSTALLED_APPS:
            print("✅ JWT app in INSTALLED_APPS")
        else:
            print("❌ JWT app missing from INSTALLED_APPS")
            return False
        
        # Check REST_FRAMEWORK settings
        auth_classes = settings.REST_FRAMEWORK.get('DEFAULT_AUTHENTICATION_CLASSES', [])
        if 'rest_framework_simplejwt.authentication.JWTAuthentication' in auth_classes:
            print("✅ JWT authentication configured")
        else:
            print("❌ JWT authentication not configured")
            return False
        
        # Check SIMPLE_JWT settings
        if hasattr(settings, 'SIMPLE_JWT'):
            print("✅ SIMPLE_JWT settings configured")
        else:
            print("❌ SIMPLE_JWT settings missing")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Settings check failed: {e}")
        return False

def check_urls():
    """Check if JWT URLs are configured"""
    try:
        from django.urls import reverse
        from django.core.exceptions import NoReverseMatch
        
        # Check if JWT token endpoint exists
        try:
            reverse('token_obtain_pair')
            print("✅ JWT token endpoint configured")
        except NoReverseMatch:
            print("❌ JWT token endpoint not found")
            return False
        
        return True
    except Exception as e:
        print(f"❌ URL check failed: {e}")
        return False

def check_api_views():
    """Check API views configuration"""
    try:
        from api.views import CustomTokenObtainPairView
        print("✅ Custom JWT view found")
        return True
    except ImportError as e:
        print(f"❌ Custom JWT view not found: {e}")
        return False

def main():
    print("🔍 Checking JWT Authentication Setup")
    print("=" * 50)
    
    checks = [
        ("JWT Package", check_jwt_package),
        ("Django Settings", check_settings),
        ("URL Configuration", check_urls),
        ("API Views", check_api_views),
    ]
    
    all_passed = True
    for name, check_func in checks:
        print(f"\n📋 {name}:")
        if not check_func():
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All checks passed! JWT authentication should be working.")
        print("\n📝 Next steps:")
        print("1. Restart Django server: python manage.py runserver")
        print("2. Test authentication: Open neberku-frontend/test-jwt-auth.html")
        print("3. Create test user: python create_jwt_test_user.py")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        print("\n🔧 Troubleshooting steps:")
        print("1. Install JWT package: pip install djangorestframework-simplejwt==5.3.0")
        print("2. Restart Django server")
        print("3. Check Django logs for errors")

if __name__ == '__main__':
    main()
