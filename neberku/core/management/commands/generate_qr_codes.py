from django.core.management.base import BaseCommand
from core.models import Event
from django.db import models

class Command(BaseCommand):
    help = 'Generate QR codes and share links for existing events that do not have them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration of existing QR codes and share links',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        if force:
            self.stdout.write('Forcing regeneration of all QR codes and share links...')
            events = Event.objects.all()
        else:
            self.stdout.write('Generating QR codes and share links for events that do not have them...')
            events = Event.objects.filter(
                models.Q(qr_code__isnull=True) | 
                models.Q(qr_code='') | 
                models.Q(share_link__isnull=True) | 
                models.Q(share_link='')
            )
        
        count = 0
        for event in events:
            try:
                if force or not event.qr_code:
                    event.regenerate_qr_code()
                    self.stdout.write(f'Generated QR code for event: {event.title}')
                
                if force or not event.share_link:
                    event.regenerate_share_link()
                    self.stdout.write(f'Generated share link for event: {event.title}')
                
                event.save()
                count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing event {event.title}: {str(e)}')
                )
        
        if force:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully processed {count} events with forced regeneration')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully generated QR codes and share links for {count} events')
            ) 