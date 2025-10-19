# Generated migration for voice recording support
# Run this command to create the migration:
# python manage.py makemigrations core --name add_voice_recording_support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_alter_package_features_alter_package_max_guests_and_more'),
    ]

    operations = [
        # Add voice recording support to MediaFile model
        migrations.AlterField(
            model_name='mediafile',
            name='media_type',
            field=models.CharField(
                choices=[
                    ('photo', 'Photo'),
                    ('video', 'Video'),
                    ('voice', 'Voice Recording'),
                ],
                max_length=10
            ),
        ),
        
        # Add allow_voice field to Event model
        migrations.AddField(
            model_name='event',
            name='allow_voice',
            field=models.BooleanField(default=True),
        ),
        
        # Add voice recording settings to EventSettings model
        migrations.AddField(
            model_name='eventsettings',
            name='max_voice_size',
            field=models.PositiveIntegerField(default=10, help_text='Maximum voice file size in MB'),
        ),
        migrations.AddField(
            model_name='eventsettings',
            name='max_voice_duration',
            field=models.PositiveIntegerField(default=300, help_text='Maximum voice recording duration in seconds (5 minutes)'),
        ),
        migrations.AddField(
            model_name='eventsettings',
            name='allowed_voice_formats',
            field=models.JSONField(default=['mp3', 'wav', 'm4a', 'aac'], help_text='Allowed voice file formats'),
        ),
    ]
