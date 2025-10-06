#!/usr/bin/env python3
"""
Script to create packages in the database if they don't exist.
Run this script from the neberku directory: python create_packages_script.py
"""

import os
import sys
import django

# Add the neberku directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from core.models import Package

def create_packages():
    """Create packages if they don't exist"""
    packages_data = [
        {
            'name': 'Basic',
            'description': 'Perfect for small events and gatherings',
            'price': 9.99,
            'max_guests': 50,
            'max_photos': 200,
            'max_videos': 20,
            'features': ['QR Code', 'Basic Analytics', 'Email Support']
        },
        {
            'name': 'Standard',
            'description': 'Great for medium-sized events like birthdays and anniversaries',
            'price': 19.99,
            'max_guests': 100,
            'max_photos': 500,
            'max_videos': 50,
            'features': ['QR Code', 'Custom Branding', 'Advanced Analytics', 'Priority Support', 'Photo Moderation']
        },
        {
            'name': 'Premium',
            'description': 'Perfect for weddings and large corporate events',
            'price': 39.99,
            'max_guests': 200,
            'max_photos': 1000,
            'max_videos': 100,
            'features': ['QR Code', 'Custom Branding', 'Advanced Analytics', 'Priority Support', 'Photo Moderation', 'Custom Domain', 'API Access']
        },
        {
            'name': 'Enterprise',
            'description': 'For very large events and businesses',
            'price': 79.99,
            'max_guests': 500,
            'max_photos': 2500,
            'max_videos': 250,
            'features': ['QR Code', 'Custom Branding', 'Advanced Analytics', 'Priority Support', 'Photo Moderation', 'Custom Domain', 'API Access', 'White Label', 'Dedicated Support']
        }
    ]

    created_count = 0
    for package_data in packages_data:
        package, created = Package.objects.get_or_create(
            name=package_data['name'],
            defaults=package_data
        )
        if created:
            created_count += 1
            print(f'✅ Created package: {package.name}')
        else:
            print(f'⚠️ Package already exists: {package.name}')

    print(f'\n📦 Successfully created {created_count} packages')
    
    # Show all packages
    print('\n📋 All packages in database:')
    packages = Package.objects.all()
    for pkg in packages:
        print(f'- {pkg.name}: ${pkg.price} (active: {pkg.is_active})')

if __name__ == '__main__':
    create_packages()
