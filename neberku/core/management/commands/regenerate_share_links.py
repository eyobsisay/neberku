from django.core.management.base import BaseCommand
from core.models import Event
from django.conf import settings
from django.db import models

class Command(BaseCommand):
    help = 'Regenerate share links and QR codes for existing events to use frontend URLs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Regenerate for all events (not just those without share links)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be regenerated without actually doing it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        regenerate_all = options['all']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get events to process
        if regenerate_all:
            events = Event.objects.all()
            self.stdout.write(f'Found {events.count()} total events')
        else:
            events = Event.objects.filter(
                models.Q(share_link__isnull=True) | 
                models.Q(share_link='') |
                models.Q(qr_code__isnull=True)
            )
            self.stdout.write(f'Found {events.count()} events without share links or QR codes')
        
        if not events.exists():
            self.stdout.write(self.style.SUCCESS('No events need regeneration'))
            return
        
        # Process each event
        for event in events:
            self.stdout.write(f'Processing event: {event.title} (ID: {event.id})')
            
            if not dry_run:
                # Regenerate share link and QR code
                event.regenerate_share_link()
                event.regenerate_qr_code()
                event.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Regenerated for {event.title}: '
                        f'Share link: {event.share_link}, '
                        f'QR code: {"Generated" if event.qr_code else "Failed"}'
                    )
                )
            else:
                # Show what would be generated
                new_share_link = f"{settings.FRONTEND_URL}/guest-contribution.html?event={event.id}"
                self.stdout.write(
                    f'  Would generate share link: {new_share_link}'
                )
                self.stdout.write(
                    f'  Would generate QR code pointing to: {new_share_link}'
                )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\nDRY RUN COMPLETE - Would regenerate {events.count()} events'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Successfully regenerated {events.count()} events'
                )
            )
