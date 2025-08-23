#!/usr/bin/env python
"""
Create a test user for Neberku authentication testing
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from django.contrib.auth.models import User

def create_test_user():
    """Create a test user if it doesn't exist"""
    username = 'testuser'
    email = 'test@example.com'
    password = 'testpass123'
    
    # Check if user already exists
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        print(f"✅ User '{username}' already exists (ID: {user.id})")
        
        # Update password in case it changed
        user.set_password(password)
        user.save()
        print(f"🔑 Password updated for user '{username}'")
        
        return user
    else:
        # Create new user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Test',
            last_name='User'
        )
        print(f"✅ Created new user '{username}' (ID: {user.id})")
        print(f"📧 Email: {email}")
        print(f"🔑 Password: {password}")
        
        return user

def main():
    print("🚀 Creating test user for Neberku...")
    print("=" * 50)
    
    try:
        user = create_test_user()
        print("=" * 50)
        print("✅ Test user ready!")
        print(f"👤 Username: {user.username}")
        print(f"🔑 Password: {user.password if hasattr(user, 'password') else 'testpass123'}")
        print(f"📧 Email: {user.email}")
        print("=" * 50)
        print("💡 You can now use these credentials to test the frontend login!")
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 