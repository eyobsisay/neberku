from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import EventSettings, Event

class Command(BaseCommand):
    help = 'Fix duplicate EventSettings records causing IntegrityError'

    def handle(self, *args, **options):
        self.stdout.write('🔧 Fixing duplicate EventSettings...')
        
        try:
            with transaction.atomic():
                # Find events with multiple EventSettings
                events_with_duplicates = []
                
                for event in Event.objects.all():
                    settings_count = EventSettings.objects.filter(event=event).count()
                    if settings_count > 1:
                        events_with_duplicates.append(event)
                        self.stdout.write(f'   Event "{event.title}" has {settings_count} EventSettings')
                
                if events_with_duplicates:
                    self.stdout.write(f'\n🛠️ Fixing {len(events_with_duplicates)} events with duplicates...')
                    
                    for event in events_with_duplicates:
                        # Get all EventSettings for this event, ordered by ID
                        settings_list = list(EventSettings.objects.filter(event=event).order_by('id'))
                        
                        if len(settings_list) > 1:
                            # Keep the first one (oldest)
                            keep_settings = settings_list[0]
                            self.stdout.write(f'   Keeping EventSettings ID {keep_settings.id} for event "{event.title}"')
                            
                            # Delete the rest
                            for settings in settings_list[1:]:
                                self.stdout.write(f'   Deleting EventSettings ID {settings.id}')
                                settings.delete()
                    
                    self.stdout.write(self.style.SUCCESS('✅ Duplicates removed!'))
                else:
                    self.stdout.write('✅ No duplicates found!')
                
                # Ensure all events have EventSettings
                events_without_settings = []
                for event in Event.objects.all():
                    if not EventSettings.objects.filter(event=event).exists():
                        events_without_settings.append(event)
                
                if events_without_settings:
                    self.stdout.write(f'\n🛠️ Creating EventSettings for {len(events_without_settings)} events...')
                    for event in events_without_settings:
                        EventSettings.objects.create(event=event)
                        self.stdout.write(f'   Created EventSettings for event "{event.title}"')
                    self.stdout.write(self.style.SUCCESS('✅ Missing EventSettings created!'))
                else:
                    self.stdout.write('✅ All events have EventSettings!')
                
                # Final check
                total_events = Event.objects.count()
                total_settings = EventSettings.objects.count()
                self.stdout.write(f'\n📊 Final status:')
                self.stdout.write(f'   Events: {total_events}')
                self.stdout.write(f'   EventSettings: {total_settings}')
                
                if total_events == total_settings:
                    self.stdout.write(self.style.SUCCESS('✅ Perfect! Every event has exactly one EventSettings.'))
                else:
                    self.stdout.write(self.style.ERROR('❌ Still have a mismatch!'))
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
            raise
