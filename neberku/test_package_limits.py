#!/usr/bin/env python3
"""
Test script to verify package limits are working correctly
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from core.models import Package, Event, User, EventType
from django.contrib.auth import get_user_model

def test_package_limits():
    """Test that package limits are properly configured"""
    print("🔍 Testing Package Limits Configuration...")
    
    # Get all packages
    packages = Package.objects.all()
    
    if not packages.exists():
        print("❌ No packages found. Please create packages first.")
        return
    
    print(f"\n📦 Found {packages.count()} package(s):")
    print("-" * 50)
    
    for package in packages:
        print(f"Package: {package.name}")
        print(f"  Price: ${package.price}")
        print(f"  Max Photos: {package.max_photos}")
        print(f"  Max Videos: {package.max_videos}")
        print(f"  Max Total Media: {package.max_photos + package.max_videos}")
        print(f"  Active: {'✅' if package.is_active else '❌'}")
        print()
    
    # Test event with package
    events = Event.objects.filter(status='active', payment_status='paid')
    
    if not events.exists():
        print("❌ No active events found. Please create events first.")
        return
    
    print(f"\n🎉 Found {events.count()} active event(s):")
    print("-" * 50)
    
    for event in events:
        print(f"Event: {event.title}")
        print(f"  Package: {event.package.name}")
        print(f"  Package Max Photos: {event.package.max_photos}")
        print(f"  Package Max Videos: {event.package.max_videos}")
        print(f"  Total Media Limit: {event.package.max_photos + event.package.max_videos}")
        print(f"  Contributor Code: {event.contributor_code}")
        print(f"  Public: {'✅' if event.is_public else '❌'}")
        print()

def create_test_packages():
    """Create test packages with different limits"""
    print("🔧 Creating test packages...")
    
    # Delete existing packages
    Package.objects.all().delete()
    
    # Create basic package
    basic_package = Package.objects.create(
        name="Basic Package",
        description="Basic event package with limited media",
        price=29.99,
        max_guests=50,
        max_photos=2,
        max_videos=1,
        features=["Basic event hosting", "Limited media uploads"],
        is_active=True
    )
    
    # Create standard package
    standard_package = Package.objects.create(
        name="Standard Package",
        description="Standard event package with moderate media",
        price=59.99,
        max_guests=100,
        max_photos=5,
        max_videos=3,
        features=["Standard event hosting", "Moderate media uploads", "QR codes"],
        is_active=True
    )
    
    # Create premium package
    premium_package = Package.objects.create(
        name="Premium Package",
        description="Premium event package with unlimited media",
        price=99.99,
        max_guests=200,
        max_photos=10,
        max_videos=5,
        features=["Premium event hosting", "High media uploads", "QR codes", "Analytics"],
        is_active=True
    )
    
    print("✅ Test packages created:")
    print(f"  - Basic: {basic_package.max_photos} photos + {basic_package.max_videos} videos")
    print(f"  - Standard: {standard_package.max_photos} photos + {standard_package.max_videos} videos")
    print(f"  - Premium: {premium_package.max_photos} photos + {premium_package.max_videos} videos")

def main():
    """Main test function"""
    print("🚀 Package Limits Test Suite")
    print("=" * 50)
    
    # Check if packages exist
    if Package.objects.exists():
        test_package_limits()
    else:
        print("📦 No packages found. Creating test packages...")
        create_test_packages()
        test_package_limits()
    
    print("\n🎯 Testing Complete!")
    print("\n💡 Next steps:")
    print("   1. Start Django server: python manage.py runserver")
    print("   2. Open guest contribution page")
    print("   3. Test with different package limits")
    print("   4. Verify validation works correctly")

if __name__ == "__main__":
    main()
