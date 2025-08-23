from django.core.management.base import BaseCommand
from core.models import EventType

class Command(BaseCommand):
    help = 'Create sample event types for testing'

    def handle(self, *args, **options):
        event_types_data = [
            {
                'name': 'Wedding',
                'description': 'Celebrate your special day with family and friends',
                'icon': 'fas fa-heart',
                'color': '#FF69B4',
                'sort_order': 1
            },
            {
                'name': 'Birthday',
                'description': 'Make birthdays memorable with shared photos and wishes',
                'icon': 'fas fa-birthday-cake',
                'color': '#FFD700',
                'sort_order': 2
            },
            {
                'name': 'Anniversary',
                'description': 'Celebrate years of love and commitment',
                'icon': 'fas fa-rings-wedding',
                'color': '#9370DB',
                'sort_order': 3
            },
            {
                'name': 'Corporate Event',
                'description': 'Professional gatherings, conferences, and business meetings',
                'icon': 'fas fa-building',
                'color': '#4169E1',
                'sort_order': 4
            },
            {
                'name': 'Party',
                'description': 'Fun celebrations and social gatherings',
                'icon': 'fas fa-glass-cheers',
                'color': '#FF4500',
                'sort_order': 5
            },
            {
                'name': 'Graduation',
                'description': 'Celebrate academic achievements and milestones',
                'icon': 'fas fa-graduation-cap',
                'color': '#32CD32',
                'sort_order': 6
            },
            {
                'name': 'Baby Shower',
                'description': 'Welcome the newest family member',
                'icon': 'fas fa-baby',
                'color': '#FFB6C1',
                'sort_order': 7
            },
            {
                'name': 'Vacation',
                'description': 'Capture memories from your travels and adventures',
                'icon': 'fas fa-plane',
                'color': '#00CED1',
                'sort_order': 8
            },
            {
                'name': 'Holiday',
                'description': 'Seasonal celebrations and festive gatherings',
                'icon': 'fas fa-holly-berry',
                'color': '#DC143C',
                'sort_order': 9
            },
            {
                'name': 'Other',
                'description': 'Custom events and special occasions',
                'icon': 'fas fa-star',
                'color': '#808080',
                'sort_order': 10
            }
        ]

        created_count = 0
        for event_type_data in event_types_data:
            event_type, created = EventType.objects.get_or_create(
                name=event_type_data['name'],
                defaults=event_type_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created event type: {event_type.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Event type already exists: {event_type.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} event types')
        ) 