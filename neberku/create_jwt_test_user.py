#!/usr/bin/env python3
"""
Create a test user for JWT authentication testing
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from django.contrib.auth.models import User

def create_test_user():
    """Create a test user for JWT authentication"""
    username = 'testuser'
    email = 'test@example.com'
    password = 'testpass123'
    
    # Check if user already exists
    if User.objects.filter(username=username).exists():
        print(f"✅ User '{username}' already exists!")
        user = User.objects.get(username=username)
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Active: {user.is_active}")
        return user
    
    # Create new user
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        print(f"✅ Test user created successfully!")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Active: {user.is_active}")
        return user
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def create_admin_user():
    """Create an admin user for testing"""
    username = 'admin'
    email = 'admin@example.com'
    password = 'admin123'
    
    # Check if admin user already exists
    if User.objects.filter(username=username).exists():
        print(f"✅ Admin user '{username}' already exists!")
        user = User.objects.get(username=username)
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Is Staff: {user.is_staff}")
        print(f"   Is Superuser: {user.is_superuser}")
        return user
    
    # Create new admin user
    try:
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f"✅ Admin user created successfully!")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Is Staff: {user.is_staff}")
        print(f"   Is Superuser: {user.is_superuser}")
        return user
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return None

if __name__ == '__main__':
    print("🚀 Creating test users for JWT authentication")
    print("=" * 50)
    
    # Create test user
    print("\n1. Creating test user...")
    test_user = create_test_user()
    
    # Create admin user
    print("\n2. Creating admin user...")
    admin_user = create_admin_user()
    
    print("\n" + "=" * 50)
    print("🏁 User creation completed!")
    print("\nYou can now test JWT authentication with:")
    print("  Username: testuser")
    print("  Password: testpass123")
    print("\nOr with admin user:")
    print("  Username: admin")
    print("  Password: admin123")
