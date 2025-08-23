from django.core.management.base import BaseCommand
from core.models import Package

class Command(BaseCommand):
    help = 'Create sample packages for testing'

    def handle(self, *args, **options):
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
                self.stdout.write(
                    self.style.SUCCESS(f'Created package: {package.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Package already exists: {package.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} packages')
        ) 