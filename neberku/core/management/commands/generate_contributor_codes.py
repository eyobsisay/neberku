from django.core.management.base import BaseCommand
from core.models import Event


class Command(BaseCommand):
    help = 'Generate contributor codes for events that do not have them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration of all contributor codes',
        )
        parser.add_argument(
            '--event-id',
            type=str,
            help='Generate contributor code for a specific event ID',
        )

    def handle(self, *args, **options):
        force = options['force']
        event_id = options['event_id']
        
        if event_id:
            # Generate for specific event
            try:
                event = Event.objects.get(id=event_id)
                self.generate_code_for_event(event, force)
            except Event.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Event with ID {event_id} not found')
                )
        else:
            # Generate for all events
            events = Event.objects.all()
            if not force:
                events = events.filter(contributor_code__isnull=True)
            
            self.stdout.write(
                self.style.SUCCESS(f'Found {events.count()} events to process')
            )
            
            for event in events:
                self.generate_code_for_event(event, force)
    
    def generate_code_for_event(self, event, force):
        """Generate contributor code for a specific event"""
        if event.contributor_code and not force:
            self.stdout.write(
                f'Event "{event.title}" already has contributor code: {event.contributor_code}'
            )
            return
        
        try:
            if force:
                event.contributor_code = None
            
            event.generate_contributor_code()
            event.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Generated contributor code "{event.contributor_code}" for event "{event.title}"'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Failed to generate contributor code for event "{event.title}": {e}'
                )
            )
