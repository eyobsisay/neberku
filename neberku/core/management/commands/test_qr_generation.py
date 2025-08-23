from django.core.management.base import BaseCommand
from core.models import Event
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Test QR code generation for events'

    def handle(self, *args, **options):
        self.stdout.write('Testing QR code generation...')
        
        # Get the first event
        try:
            event = Event.objects.first()
            if event:
                self.stdout.write(f'Testing with event: {event.title}')
                self.stdout.write(f'Event ID: {event.id}')
                self.stdout.write(f'Current QR code: {event.qr_code}')
                self.stdout.write(f'Current share link: {event.share_link}')
                
                # Regenerate QR code and share link
                event.regenerate_qr_code()
                event.regenerate_share_link()
                event.save()
                
                self.stdout.write(f'After regeneration:')
                self.stdout.write(f'QR code: {event.qr_code}')
                self.stdout.write(f'Share link: {event.share_link}')
                
                if event.qr_code:
                    self.stdout.write(self.style.SUCCESS('✓ QR code generated successfully!'))
                else:
                    self.stdout.write(self.style.ERROR('✗ QR code generation failed!'))
                    
                if event.share_link:
                    self.stdout.write(self.style.SUCCESS('✓ Share link generated successfully!'))
                else:
                    self.stdout.write(self.style.ERROR('✗ Share link generation failed!'))
                    
            else:
                self.stdout.write(self.style.WARNING('No events found in database'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))
